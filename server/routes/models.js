import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db, { queryOne, queryAll, execute, transaction } from '../config/db.js';
import { authMiddleware, optionalAuthMiddleware, requireBusinessRole } from '../middleware/auth.js';
import { upload3D } from '../middleware/upload.js';
import { canUploadModel, canAccessModel } from '../services/businessRules.js';
import { queueModelProcessing } from '../services/modelProcessor.js';
import { generateAndSaveQRCode } from '../services/qrService.js';
import { getCADRevisionStatus, submitCADRevision, rollbackModelVersion, resetCADCooldown } from '../services/cadService.js';
import { updateStorageUsage } from '../services/storageService.js';

const router = express.Router();

// In-memory view deduplication cache: key = `${visitorKey}:${modelId}`, value = timestamp
const recentViewsCache = new Map();

// Periodic cleanup of cache entries older than 30 minutes
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [key, timestamp] of recentViewsCache.entries()) {
    if (timestamp < cutoff) {
      recentViewsCache.delete(key);
    }
  }
}, 15 * 60 * 1000).unref();

/**
 * 1. List models for the current business
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (!req.business) {
      return res.status(400).json({ error: 'No active business associated' });
    }

    const { galleryId, status, visibility, search, limit = 100 } = req.query;

    let sql = `
      SELECT m.*, g.name as gallery_name, c.name as category_name
      FROM models m
      LEFT JOIN galleries g ON m.gallery_id = g.id
      LEFT JOIN categories c ON m.category_id = c.id
      WHERE m.business_id = ? AND m.deleted_at IS NULL
    `;
    const params = [req.business.id];

    if (galleryId) {
      sql += ' AND m.gallery_id = ?';
      params.push(galleryId);
    }
    if (status) {
      sql += ' AND m.processing_status = ?';
      params.push(status);
    }
    if (visibility) {
      sql += ' AND m.visibility = ?';
      params.push(visibility);
    }
    if (search) {
      sql += ' AND (m.title LIKE ? OR m.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY m.created_at DESC LIMIT ?';
    params.push(parseInt(limit, 10));

    const models = await queryAll(sql, params);
    res.json(models);
  } catch (err) {
    console.error('[Get Models Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 2. Upload / Create new Model
 * Strictly checks canUploadModel (storage & 25 coins).
 * DOES NOT DEDUCT COINS IMMEDIATELY.
 * Queues processing. Coins are deducted ONLY on successful processing!
 */
router.post('/', authMiddleware, requireBusinessRole(['owner', 'admin', 'editor']), upload3D.any(), async (req, res) => {
  try {
    const businessId = req.business.id;
    const userId = req.user.id;
    const { title, description, galleryId, categoryId, visibility = 'public', simulateFail } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Model title is required' });
    }

    // Determine files safely from any multipart field names
    const fileList = Array.isArray(req.files) ? req.files : [];
    const file = fileList.find(f => f.fieldname === 'file') || fileList.find(f => !f.mimetype.startsWith('image/')) || req.file;
    const thumbnailFile = fileList.find(f => f.fieldname === 'thumbnail') || fileList.find(f => f !== file && f.mimetype.startsWith('image/'));

    const originalFileName = file ? file.originalname : (req.body.fileName || 'model_asset.glb');
    const originalFileSize = file ? file.size : parseInt(req.body.fileSize || 18500000, 10);
    const ext = originalFileName.split('.').pop().toLowerCase();

    // Check centralized business rules
    const check = await canUploadModel(businessId, originalFileSize);
    if (!check.allowed) {
      return res.status(400).json({
        error: check.reason,
        code: check.code,
        requiredCoins: check.requiredCoins,
        currentCoins: check.currentCoins
      });
    }

    const modelId = 'mod_' + uuidv4().slice(0, 8);
    const slug = title.trim().toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + modelId.slice(-4);
    const shareToken = 'shr_' + uuidv4().slice(0, 12);
    const webReadyUrl = file ? `/uploads/models/${file.filename}` : '/models/sample_pump.glb';

    let thumbUrl = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80';
    if (thumbnailFile) {
      thumbUrl = `/uploads/models/${thumbnailFile.filename}`;
    } else if (req.body.thumbnailUrl) {
      thumbUrl = req.body.thumbnailUrl;
    } else if (req.body.thumbnail && typeof req.body.thumbnail === 'string') {
      thumbUrl = req.body.thumbnail;
    }

    // Insert model with processing_status = 'uploading'
    await execute(`
      INSERT INTO models (
        id, business_id, gallery_id, category_id, title, slug, description,
        visibility, share_token, thumbnail_url, original_file_name, original_file_format,
        original_file_size, web_ready_file_url, web_ready_file_size, storage_total_bytes,
        processing_status, processing_progress, ar_enabled, ar_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'uploading', 10, 1, 1)
    `, [
      modelId,
      businessId,
      galleryId || null,
      categoryId || null,
      title.trim(),
      slug,
      description || '',
      visibility,
      shareToken,
      thumbUrl,
      originalFileName,
      ext,
      originalFileSize,
      webReadyUrl,
      Math.round(originalFileSize * 0.75),
      originalFileSize + Math.round(originalFileSize * 0.75)
    ]);

    // Update gallery model count if gallery specified
    if (galleryId) {
      await execute(`UPDATE galleries SET model_count = model_count + 1 WHERE id = ?`, [galleryId]);
    }

    // Queue asynchronous background processing
    const shouldFail = simulateFail === 'true' || simulateFail === true;
    queueModelProcessing(modelId, userId, businessId, shouldFail);

    const createdModel = await queryOne('SELECT * FROM models WHERE id = ?', [modelId]);

    res.status(201).json({
      message: 'Model uploaded successfully. Background processing started.',
      model: createdModel,
      note: 'Upload coins (25 coins) will be deducted only upon successful conversion completion.'
    });
  } catch (err) {
    console.error('[Upload Model Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 3. Get Model Details (Public or Private)
 */
router.get('/:id', optionalAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.query.token;

    const model = await queryOne(`
      SELECT m.*, b.name as business_name, b.slug as business_slug, b.industry as business_industry,
             g.name as gallery_name, c.name as category_name, c.icon as category_icon
      FROM models m
      JOIN businesses b ON m.business_id = b.id
      LEFT JOIN galleries g ON m.gallery_id = g.id
      LEFT JOIN categories c ON m.category_id = c.id
      WHERE m.id = ? OR m.slug = ?
    `, [id, id]);

    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    // Permission check
    const access = await canAccessModel(req.user, model, token);
    if (!access.allowed) {
      return res.status(403).json({
        error: access.reason,
        code: access.code,
        isPrivate: model.visibility === 'private'
      });
    }

    // View deduplication tracking (prevents duplicate counting from React StrictMode, rapid reloads, or polling)
    const { track } = req.query;
    const shouldTrack = track !== 'false';

    if (shouldTrack) {
      const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1').toString().split(',')[0].trim();
      const visitorKey = req.user ? `usr_${req.user.id}` : `anon_${clientIp}`;
      const cacheKey = `${visitorKey}:${model.id}`;
      const now = Date.now();
      const lastViewedAt = recentViewsCache.get(cacheKey);

      // Deduplicate: only increment if NOT viewed by this visitor in the last 15 minutes (900,000 ms)
      if (!lastViewedAt || (now - lastViewedAt > 15 * 60 * 1000)) {
        recentViewsCache.set(cacheKey, now);

        await execute('UPDATE models SET views_count = views_count + 1 WHERE id = ?', [model.id]);
        model.views_count = (model.views_count || 0) + 1;

        // Record view analytics event
        const eventId = 'ev_view_' + uuidv4().slice(0, 8);
        await execute(`
          INSERT INTO model_analytics (id, model_id, event_type, visitor_id, device_type, browser, os)
          VALUES (?, ?, 'view', ?, ?, ?, ?)
        `, [
          eventId,
          model.id,
          visitorKey,
          req.headers['sec-ch-ua-mobile'] === '?1' ? 'Mobile' : 'Desktop',
          req.headers['user-agent'] ? req.headers['user-agent'].slice(0, 60) : 'Browser',
          'Web'
        ]);
      }
    }

    // Fetch versions if available
    const versions = await queryAll(`
      SELECT v.*, u.full_name as author_name
      FROM model_versions v
      LEFT JOIN users u ON v.created_by_user_id = u.id
      WHERE v.model_id = ?
      ORDER BY v.version_number DESC
    `, [model.id]);

    // Fetch related models from same gallery/category
    const relatedModels = await queryAll(`
      SELECT id, title, slug, thumbnail_url, views_count, ar_enabled, visibility
      FROM models
      WHERE id != ? AND deleted_at IS NULL AND visibility = 'public'
        AND (category_id = ? OR business_id = ?)
      ORDER BY views_count DESC LIMIT 4
    `, [model.id, model.category_id, model.business_id]);

    res.json({
      model,
      versions,
      relatedModels,
      accessRole: access.role
    });
  } catch (err) {
    console.error('[Get Model Details Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 4. Update Model metadata & thumbnail
 */
router.put('/:id', authMiddleware, upload3D.any(), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, galleryId, categoryId, visibility, arEnabled, arActive, thumbnailUrl } = req.body;

    // Check if model exists first by id or slug
    const modelRecord = await queryOne(
      'SELECT * FROM models WHERE (id = ? OR slug = ?) AND deleted_at IS NULL',
      [id, id]
    );

    if (!modelRecord) {
      return res.status(404).json({ error: 'Model not found' });
    }

    const existing = modelRecord;

    // Determine thumbnail from file or URL
    const fileList = Array.isArray(req.files) ? req.files : [];
    const thumbnailFile = fileList.find(f => f.fieldname === 'thumbnail' || f.fieldname === 'thumbnailFile' || f.mimetype.startsWith('image/'));

    let finalThumbnailUrl = existing.thumbnail_url;
    if (thumbnailFile) {
      finalThumbnailUrl = `/uploads/models/${thumbnailFile.filename}`;
    } else if (thumbnailUrl !== undefined && thumbnailUrl !== null && thumbnailUrl.trim() !== '') {
      finalThumbnailUrl = thumbnailUrl.trim();
    } else if (req.body.thumbnail && typeof req.body.thumbnail === 'string' && req.body.thumbnail.trim() !== '') {
      finalThumbnailUrl = req.body.thumbnail.trim();
    }

    let finalSlug = existing.slug;
    if (title && title.trim() && title.trim() !== existing.title) {
      finalSlug = title.trim().toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + id.slice(-4);
    }

    let finalShareToken = existing.share_token;
    if (visibility === 'private' && !finalShareToken) {
      finalShareToken = 'shr_' + uuidv4().slice(0, 12);
    }

    // Handle gallery model count changes
    const newGalleryId = galleryId === 'none' || galleryId === '' ? null : (galleryId !== undefined ? galleryId : existing.gallery_id);
    if (galleryId !== undefined && newGalleryId !== existing.gallery_id) {
      if (existing.gallery_id) {
        await execute('UPDATE galleries SET model_count = CASE WHEN model_count > 0 THEN model_count - 1 ELSE 0 END WHERE id = ?', [existing.gallery_id]);
      }
      if (newGalleryId) {
        await execute('UPDATE galleries SET model_count = model_count + 1 WHERE id = ?', [newGalleryId]);
      }
    }

    const newCategoryId = categoryId === 'none' || categoryId === '' ? null : (categoryId !== undefined ? categoryId : existing.category_id);

    await execute(`
      UPDATE models
      SET title = COALESCE(?, title),
          slug = ?,
          description = COALESCE(?, description),
          thumbnail_url = ?,
          gallery_id = ?,
          category_id = ?,
          visibility = COALESCE(?, visibility),
          share_token = COALESCE(?, share_token),
          ar_enabled = COALESCE(?, ar_enabled),
          ar_active = COALESCE(?, ar_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      title ? title.trim() : null,
      finalSlug,
      description !== undefined ? description : null,
      finalThumbnailUrl,
      newGalleryId,
      newCategoryId,
      visibility !== undefined ? visibility : null,
      finalShareToken,
      arEnabled !== undefined ? (arEnabled === 'true' || arEnabled === true || arEnabled === 1 ? 1 : 0) : null,
      arActive !== undefined ? (arActive === 'true' || arActive === true || arActive === 1 ? 1 : 0) : null,
      id
    ]);

    const updated = await queryOne('SELECT * FROM models WHERE id = ?', [id]);
    res.json({ message: 'Model updated successfully', model: updated });
  } catch (err) {
    console.error('[Update Model Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 5. Soft Delete Model
 */
router.delete('/:id', authMiddleware, requireBusinessRole(['owner', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const model = await queryOne('SELECT * FROM models WHERE id = ? AND business_id = ?', [id, req.business.id]);
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    // Soft delete: keep record and files for audit / recovery
    await execute('UPDATE models SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);

    if (model.gallery_id) {
      await execute('UPDATE galleries SET model_count = CASE WHEN model_count > 0 THEN model_count - 1 ELSE 0 END WHERE id = ?', [model.gallery_id]);
    }

    await updateStorageUsage(req.business.id);

    res.json({ message: 'Model soft-deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 6. Generate or regenerate QR Code
 */
router.post('/:id/qr', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { preset = 'brochure' } = req.body;

    const model = await queryOne(
      'SELECT * FROM models WHERE (id = ? OR slug = ?) AND deleted_at IS NULL',
      [id, id]
    );
    if (!model) return res.status(404).json({ error: 'Model not found' });

    const baseUrl = process.env.BASE_URL || process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://sack3d.com' : 'http://localhost:5173');
    const targetUrl = model.visibility === 'private'
      ? `${baseUrl}/model/${model.slug || model.id}?token=${model.share_token}&ar=true`
      : `${baseUrl}/model/${model.slug || model.id}?ar=true`;

    const qrDataUrl = await generateAndSaveQRCode(model.id, targetUrl, preset);
    await execute('UPDATE models SET qr_code_url = ? WHERE id = ?', [qrDataUrl, model.id]);

    res.json({
      message: 'QR Code generated successfully',
      targetUrl,
      qrDataUrl,
      preset
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 7. Record AR launch event
 */
router.post('/:id/ar-launch', async (req, res) => {
  try {
    const { id } = req.params;
    await execute('UPDATE models SET ar_views_count = ar_views_count + 1 WHERE id = ?', [id]);

    const eventId = 'ev_ar_' + uuidv4().slice(0, 8);
    await execute(`
      INSERT INTO model_analytics (id, model_id, event_type, visitor_id, device_type, browser, os)
      VALUES (?, ?, 'ar_launch', ?, ?, ?, ?)
    `, [
      eventId,
      id,
      req.body.visitorId || 'anon_' + uuidv4().slice(0, 6),
      req.body.deviceType || 'Mobile',
      req.body.browser || 'WebAR',
      req.body.os || 'iOS/Android'
    ]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 8. CAD Revision Status & Cooldown
 */
router.get('/:id/revisions', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const status = await getCADRevisionStatus(req.business.id, id, req.user?.role);
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 9. Submit CAD Revision
 */
router.post('/:id/revisions', authMiddleware, requireBusinessRole(['owner', 'admin', 'editor']), upload3D.any(), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      notes,
      bypassCooldown,
      title,
      description,
      thumbnailUrl,
      categoryId,
      galleryId,
      visibility,
      arEnabled,
      arActive
    } = req.body;

    const fileList = Array.isArray(req.files) ? req.files : [];
    const file = fileList.find(f => f.fieldname === 'file') || fileList.find(f => !f.mimetype.startsWith('image/')) || req.file;
    const thumbnailFile = fileList.find(f => f.fieldname === 'thumbnail' || f.fieldname === 'thumbnailFile' || (f !== file && f.mimetype.startsWith('image/')));

    const fileData = {
      originalName: file ? file.originalname : `cad_rev_${Date.now()}.glb`,
      path: file ? `/uploads/models/${file.filename}` : `/models/sample_pump.glb`,
      size: file ? file.size : 16000000
    };

    let newThumbnail = null;
    if (thumbnailFile) {
      newThumbnail = `/uploads/models/${thumbnailFile.filename}`;
    } else if (thumbnailUrl && thumbnailUrl.trim()) {
      newThumbnail = thumbnailUrl.trim();
    }

    const isBypass = bypassCooldown === 'true' || bypassCooldown === true;
    const result = await submitCADRevision(
      req.business.id,
      req.user.id,
      id,
      fileData,
      notes,
      req.user?.role,
      isBypass,
      {
        title,
        description,
        thumbnail_url: newThumbnail,
        category_id: categoryId,
        gallery_id: galleryId,
        visibility,
        ar_enabled: arEnabled,
        ar_active: arActive
      }
    );
    res.status(201).json({
      message: 'CAD Revision submitted successfully.',
      ...result
    });
  } catch (err) {
    console.error('[Submit CAD Revision Error]:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * 10. Rollback to version (Business Plan feature)
 */
router.post('/:id/rollback', authMiddleware, requireBusinessRole(['owner', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { versionNumber } = req.body;

    if (!versionNumber) {
      return res.status(400).json({ error: 'versionNumber is required' });
    }

    const result = await rollbackModelVersion(req.business.id, req.user.id, id, parseInt(versionNumber, 10), req.user?.role);
    res.json({
      message: `Model successfully restored to version #${versionNumber}`,
      ...result
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * 11. Reset CAD Cooldown (Owner or Admin)
 */
router.post('/:id/revisions/reset-cooldown', authMiddleware, requireBusinessRole(['owner', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    await resetCADCooldown(req.business.id, id);
    res.json({ message: 'CAD cooldown reset successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
