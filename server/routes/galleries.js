import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db, { queryOne, queryAll, execute } from '../config/db.js';
import { authMiddleware, requireBusinessRole } from '../middleware/auth.js';

import { upload3D } from '../middleware/upload.js';

const router = express.Router();

// List all galleries for the current business
router.get('/', authMiddleware, async (req, res) => {
  try {
    const galleries = await queryAll(`
      SELECT g.id, g.business_id, g.name, g.slug, g.description, g.thumbnail_url, g.is_public, g.share_token, g.is_archived, g.created_at, g.updated_at,
             COUNT(m.id) as actual_model_count,
             COALESCE(SUM(m.storage_total_bytes), 0) as calculated_storage_bytes
      FROM galleries g
      LEFT JOIN models m ON g.id = m.gallery_id AND m.deleted_at IS NULL
      WHERE g.business_id = ? AND g.is_archived = 0
      GROUP BY g.id, g.business_id, g.name, g.slug, g.description, g.thumbnail_url, g.is_public, g.share_token, g.is_archived, g.created_at, g.updated_at
      ORDER BY g.created_at DESC
    `, [req.business.id]);

    res.json(galleries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single gallery with all its models
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const gallery = await queryOne(`
      SELECT g.id, g.business_id, g.name, g.slug, g.description, g.thumbnail_url, g.is_public, g.share_token, g.is_archived, g.created_at, g.updated_at,
             COUNT(m.id) as actual_model_count,
             COALESCE(SUM(m.storage_total_bytes), 0) as calculated_storage_bytes
      FROM galleries g
      LEFT JOIN models m ON g.id = m.gallery_id AND m.deleted_at IS NULL
      WHERE g.id = ? AND g.business_id = ? AND g.is_archived = 0
      GROUP BY g.id, g.business_id, g.name, g.slug, g.description, g.thumbnail_url, g.is_public, g.share_token, g.is_archived, g.created_at, g.updated_at
    `, [id, req.business.id]);

    if (!gallery) {
      return res.status(404).json({ error: 'Gallery not found' });
    }

    const models = await queryAll(`
      SELECT m.*, c.name as category_name
      FROM models m
      LEFT JOIN categories c ON m.category_id = c.id
      WHERE m.gallery_id = ? AND m.business_id = ? AND m.deleted_at IS NULL
      ORDER BY m.created_at DESC
    `, [id, req.business.id]);

    res.json({ ...gallery, models });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dedicated thumbnail upload endpoint
router.post('/upload-thumbnail', authMiddleware, requireBusinessRole(['owner', 'admin', 'editor']), upload3D.any(), (req, res) => {
  try {
    const fileList = Array.isArray(req.files) ? req.files : [];
    const file = fileList.find(f => f.fieldname === 'thumbnail' || f.fieldname === 'image' || f.fieldname === 'file') || fileList.find(f => f.mimetype && f.mimetype.startsWith('image/')) || req.file;
    if (!file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }
    res.json({
      url: `/uploads/models/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create gallery (supports multipart/form-data or JSON)
router.post('/', authMiddleware, requireBusinessRole(['owner', 'admin', 'editor']), upload3D.any(), async (req, res) => {
  try {
    const { name, description, isPublic = true } = req.body;
    let thumbnailUrl = req.body.thumbnailUrl;

    const fileList = Array.isArray(req.files) ? req.files : [];
    const thumbnailFile = fileList.find(f => f.fieldname === 'thumbnail' || f.fieldname === 'image' || f.fieldname === 'file') || fileList.find(f => f.mimetype && f.mimetype.startsWith('image/')) || req.file;
    if (thumbnailFile) {
      thumbnailUrl = `/uploads/models/${thumbnailFile.filename}`;
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Gallery name is required' });
    }

    const id = 'gal_' + uuidv4().slice(0, 8);
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + id.slice(-4);
    const shareToken = 'shg_' + uuidv4().replace(/-/g, '').slice(0, 16);

    await execute(`
      INSERT INTO galleries (id, business_id, name, slug, description, thumbnail_url, is_public, share_token)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      req.business.id,
      name.trim(),
      slug,
      description || '',
      thumbnailUrl || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
      (isPublic === '1' || isPublic === 1 || isPublic === true || isPublic === 'true') ? 1 : 0,
      shareToken
    ]);

    const created = await queryOne('SELECT * FROM galleries WHERE id = ?', [id]);
    res.status(201).json({ message: 'Gallery created successfully', gallery: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload standalone gallery thumbnail
router.post('/upload-thumbnail', authMiddleware, requireBusinessRole(['owner', 'admin', 'editor']), upload3D.any(), async (req, res) => {
  try {
    const fileList = Array.isArray(req.files) ? req.files : [];
    const thumbnailFile = fileList.find(f => f.fieldname === 'thumbnail' || f.fieldname === 'image' || f.fieldname === 'file') || fileList.find(f => f.mimetype && f.mimetype.startsWith('image/')) || req.file;

    if (!thumbnailFile) {
      return res.status(400).json({ error: 'No thumbnail image file provided' });
    }

    const thumbnailUrl = `/uploads/models/${thumbnailFile.filename}`;
    res.json({
      message: 'Gallery thumbnail uploaded successfully',
      thumbnailUrl,
      fileName: thumbnailFile.filename
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update gallery (supports multipart/form-data or JSON)
router.put('/:id', authMiddleware, requireBusinessRole(['owner', 'admin', 'editor']), upload3D.any(), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isPublic } = req.body;
    let thumbnailUrl = req.body.thumbnailUrl;

    const fileList = Array.isArray(req.files) ? req.files : [];
    const thumbnailFile = fileList.find(f => f.fieldname === 'thumbnail' || f.fieldname === 'image' || f.fieldname === 'file') || fileList.find(f => f.mimetype && f.mimetype.startsWith('image/')) || req.file;
    if (thumbnailFile) {
      thumbnailUrl = `/uploads/models/${thumbnailFile.filename}`;
    }

    const existing = await queryOne('SELECT * FROM galleries WHERE id = ? AND business_id = ?', [id, req.business.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Gallery not found' });
    }

    const shareToken = existing.share_token || ('shg_' + uuidv4().replace(/-/g, '').slice(0, 16));

    await execute(`
      UPDATE galleries
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          thumbnail_url = COALESCE(?, thumbnail_url),
          is_public = COALESCE(?, is_public),
          share_token = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND business_id = ?
    `, [
      name ? name.trim() : null,
      description !== undefined ? description : null,
      thumbnailUrl !== undefined ? thumbnailUrl : null,
      isPublic !== undefined ? ((isPublic === '1' || isPublic === 1 || isPublic === true || isPublic === 'true') ? 1 : 0) : null,
      shareToken,
      id,
      req.business.id
    ]);

    const updated = await queryOne('SELECT * FROM galleries WHERE id = ?', [id]);
    res.json({ message: 'Gallery updated successfully', gallery: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Archive/Delete gallery
router.delete('/:id', authMiddleware, requireBusinessRole(['owner', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    await execute('UPDATE galleries SET is_archived = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND business_id = ?', [id, req.business.id]);
    // Detach models from archived gallery
    await execute('UPDATE models SET gallery_id = NULL WHERE gallery_id = ?', [id]);

    res.json({ message: 'Gallery archived successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
