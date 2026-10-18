import { v4 as uuidv4 } from 'uuid';
import db, { queryOne, queryAll, execute, transaction } from '../config/db.js';
import { canCreateRevision, getBusinessContext, getPlatformSetting } from './businessRules.js';
import { deductCoins } from './walletService.js';
import { updateStorageUsage } from './storageService.js';

function toSqlDatetime(date = new Date()) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * CAD Revision & Version Control Service
 * Enforces cooldown, plan revision caps, coins deduction, model 3D updates, and rollback.
 */

export async function getCADRevisionStatus(businessId, modelId, userRole = null) {
  const check = await canCreateRevision(businessId, modelId, userRole);
  const revisions = await queryAll(`
    SELECT r.*, u.full_name as submitter_name
    FROM model_revisions r
    LEFT JOIN users u ON r.user_id = u.id
    WHERE r.model_id = ?
    ORDER BY r.revision_number DESC
  `, [modelId]);

  const lastRevision = revisions.length > 0 ? revisions[0] : null;
  let cooldownActive = false;
  let nextAvailableAt = null;
  let cooldownHoursRemaining = 0;

  const cooldownSetting = await getPlatformSetting('cad_cooldown_hours', '24');
  const cooldownHours = parseInt(cooldownSetting, 10) || 24;

  if (lastRevision && userRole !== 'admin') {
    const lastRevTime = new Date(lastRevision.created_at).getTime();
    const cooldownExpiry = lastRevTime + (cooldownHours * 60 * 60 * 1000);
    const now = Date.now();
    if (now < cooldownExpiry) {
      cooldownActive = true;
      nextAvailableAt = new Date(cooldownExpiry).toISOString();
      cooldownHoursRemaining = Math.ceil((cooldownExpiry - now) / (1000 * 60 * 60));
    }
  }

  const ctx = await getBusinessContext(businessId);
  const planSlug = ctx?.plan?.plan_slug || check.plan || 'free';
  const hasVersionHistory = !!(ctx?.plan?.has_version_history || planSlug === 'business');

  return {
    modelId,
    allowedToSubmit: check.allowed,
    reason: check.reason || null,
    cost: check.cost !== undefined ? check.cost : 0,
    currentRevisionsCount: revisions.length,
    maxAllowed: check.maxAllowed || ctx?.plan?.cad_revisions_max_per_model || 3,
    plan: planSlug,
    hasVersionHistory,
    cooldownActive,
    cooldownHoursRemaining,
    nextAvailableAt,
    revisions
  };
}

export async function submitCADRevision(businessId, userId, modelId, fileData, notes, userRole = null, bypassCooldown = false, extraMeta = {}) {
  const check = await canCreateRevision(businessId, modelId, userRole, bypassCooldown);
  if (!check.allowed) {
    throw new Error(check.reason);
  }

  return await transaction(async () => {
    const model = await queryOne('SELECT * FROM models WHERE id = ?', [modelId]);
    if (!model) throw new Error('Model not found');

    const nextRevNum = (model.current_version || 1) + 1;
    const revId = 'rev_' + uuidv4().slice(0, 8);
    const cooldownSetting = await getPlatformSetting('cad_cooldown_hours', '24');
    const cooldownHours = parseInt(cooldownSetting, 10) || 24;
    const cooldownDate = toSqlDatetime(new Date(Date.now() + cooldownHours * 60 * 60 * 1000));

    // Deduct coins if revision requires coins
    let coinsCharged = check.cost || 0;
    if (coinsCharged > 0) {
      await deductCoins(
        businessId,
        userId,
        coinsCharged,
        'cad_revision',
        `CAD Revision #${nextRevNum} for model: ${model.title}`,
        modelId,
        revId
      );
    }

    // Ensure version 1 exists in model_versions if it wasn't saved yet
    const existingV1 = await queryOne('SELECT id FROM model_versions WHERE model_id = ? AND version_number = 1', [modelId]);
    if (!existingV1) {
      const v1Id = 'ver_' + uuidv4().slice(0, 8);
      await execute(`
        INSERT INTO model_versions (
          id, model_id, version_number, created_by_user_id, notes, file_path, file_size
        ) VALUES (?, ?, 1, ?, 'Initial Model Version (v1)', ?, ?)
      `, [
        v1Id,
        modelId,
        userId,
        model.web_ready_file_url || `/models/sample_pump.glb`,
        model.original_file_size || 15000000
      ]);
    }

    const cleanNotes = notes && notes.trim() ? notes.trim() : `Engineering CAD revision #${nextRevNum}`;
    const cleanFileName = fileData.originalName || `revision_${nextRevNum}.glb`;
    const cleanFilePath = fileData.path || model.web_ready_file_url;
    const cleanFileSize = fileData.size || model.original_file_size || 15000000;
    const ext = cleanFileName.split('.').pop().toLowerCase();

    // Optional metadata updates (title, description, thumbnail, gallery, category, visibility, ar_enabled, ar_active)
    const updateTitle = extraMeta.title && extraMeta.title.trim() ? extraMeta.title.trim() : null;
    const updateDesc = extraMeta.description !== undefined && extraMeta.description !== null ? extraMeta.description : null;
    const updateThumb = extraMeta.thumbnail_url || null;
    let newSlug = model.slug;
    if (updateTitle && updateTitle !== model.title) {
      newSlug = updateTitle.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + modelId.slice(-4);
    }

    const newGalleryId = extraMeta.gallery_id === 'none' || extraMeta.gallery_id === '' ? null : (extraMeta.gallery_id !== undefined ? extraMeta.gallery_id : model.gallery_id);
    if (extraMeta.gallery_id !== undefined && newGalleryId !== model.gallery_id) {
      if (model.gallery_id) {
        await execute('UPDATE galleries SET model_count = CASE WHEN model_count > 0 THEN model_count - 1 ELSE 0 END WHERE id = ?', [model.gallery_id]);
      }
      if (newGalleryId) {
        await execute('UPDATE galleries SET model_count = model_count + 1 WHERE id = ?', [newGalleryId]);
      }
    }

    const newCategoryId = extraMeta.category_id === 'none' || extraMeta.category_id === '' ? null : (extraMeta.category_id !== undefined ? extraMeta.category_id : model.category_id);
    const updateVisibility = extraMeta.visibility !== undefined && extraMeta.visibility ? extraMeta.visibility : null;
    const updateArEnabled = extraMeta.ar_enabled !== undefined ? (extraMeta.ar_enabled === 'true' || extraMeta.ar_enabled === true || extraMeta.ar_enabled === 1 ? 1 : 0) : null;
    const updateArActive = extraMeta.ar_active !== undefined ? (extraMeta.ar_active === 'true' || extraMeta.ar_active === true || extraMeta.ar_active === 1 ? 1 : 0) : null;

    // Insert revision row
    await execute(`
      INSERT INTO model_revisions (
        id, model_id, business_id, user_id, revision_number,
        original_file_name, file_path, file_size, notes, status,
        coins_charged, cooldown_until, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, CURRENT_TIMESTAMP)
    `, [
      revId,
      modelId,
      businessId,
      userId,
      nextRevNum,
      cleanFileName,
      cleanFilePath,
      cleanFileSize,
      cleanNotes,
      coinsCharged,
      cooldownDate
    ]);

    // Save as snapshot in model_versions (Version history)
    const verId = 'ver_' + uuidv4().slice(0, 8);
    await execute(`
      INSERT INTO model_versions (
        id, model_id, version_number, created_by_user_id, notes, file_path, file_size
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      verId,
      modelId,
      nextRevNum,
      userId,
      cleanNotes,
      cleanFilePath,
      cleanFileSize
    ]);

    // Update models table with new version, active web-ready file URL, and any metadata updates!
    await execute(`
      UPDATE models
      SET current_version = ?,
          web_ready_file_url = ?,
          original_file_name = ?,
          original_file_format = ?,
          original_file_size = ?,
          web_ready_file_size = ?,
          storage_total_bytes = ? + ?,
          title = COALESCE(?, title),
          slug = ?,
          description = COALESCE(?, description),
          thumbnail_url = COALESCE(?, thumbnail_url),
          gallery_id = ?,
          category_id = COALESCE(?, category_id),
          visibility = COALESCE(?, visibility),
          ar_enabled = COALESCE(?, ar_enabled),
          ar_active = COALESCE(?, ar_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      nextRevNum,
      cleanFilePath,
      cleanFileName,
      ext,
      cleanFileSize,
      cleanFileSize,
      model.storage_total_bytes || 0,
      cleanFileSize,
      updateTitle,
      newSlug,
      updateDesc,
      updateThumb,
      newGalleryId,
      newCategoryId,
      updateVisibility,
      updateArEnabled,
      updateArActive,
      modelId
    ]);

    await updateStorageUsage(businessId);

    // Create notification
    const notifId = 'notif_' + uuidv4().slice(0, 8);
    await execute(`
      INSERT INTO notifications (id, business_id, user_id, type, title, message, related_link)
      VALUES (?, ?, ?, 'cad_complete', 'CAD Revision Deployed', ?, ?)
    `, [
      notifId,
      businessId,
      userId,
      `Revision v${nextRevNum} for model "${model.title}" was successfully submitted and 3D geometry updated.`,
      `/model/${modelId}`
    ]);

    return {
      success: true,
      revisionId: revId,
      revisionNumber: nextRevNum,
      fileName: cleanFileName,
      filePath: cleanFilePath,
      coinsCharged,
      cooldownUntil: cooldownDate
    };
  });
}

/**
 * Rollback model to previous version (Business Plan feature)
 */
export async function rollbackModelVersion(businessId, userId, modelId, targetVersionNumber, userRole = null) {
  const ctx = await getBusinessContext(businessId);
  const hasVersionHistory = !!(ctx?.plan?.has_version_history || ctx?.plan?.plan_slug === 'business' || userRole === 'admin');
  const rollbackCost = hasVersionHistory ? 0 : 10;
  const totalCoins = ((ctx?.wallet?.subscription_balance || 0) + (ctx?.wallet?.purchased_balance || 0));

  if (!hasVersionHistory && totalCoins < rollbackCost) {
    throw new Error(`Insufficient coins for version rollback. Rollback costs ${rollbackCost} coins on the ${(ctx?.plan?.name || 'Free')} plan (or upgrade to Business for unlimited rollbacks). Current balance: ${totalCoins} coins.`);
  }

  return await transaction(async () => {
    const model = await queryOne('SELECT * FROM models WHERE id = ?', [modelId]);
    if (!model) throw new Error('Model not found');

    if (rollbackCost > 0) {
      await deductCoins(
        businessId,
        userId,
        rollbackCost,
        'cad_revision',
        `Rollback model "${model.title}" to Version #${targetVersionNumber}`,
        modelId
      );
    }

    let targetVersion = await queryOne(`
      SELECT * FROM model_versions
      WHERE model_id = ? AND version_number = ?
    `, [modelId, targetVersionNumber]);

    if (!targetVersion && targetVersionNumber === 1) {
      const v1Id = 'ver_' + uuidv4().slice(0, 8);
      await execute(`
        INSERT INTO model_versions (
          id, model_id, version_number, created_by_user_id, notes, file_path, file_size
        ) VALUES (?, ?, 1, ?, 'Initial Model Version (v1)', ?, ?)
      `, [
        v1Id,
        modelId,
        userId,
        model.web_ready_file_url || `/models/sample_pump.glb`,
        model.original_file_size || 15000000
      ]);
      targetVersion = await queryOne(`SELECT * FROM model_versions WHERE id = ?`, [v1Id]);
    }

    if (!targetVersion) {
      throw new Error(`Version #${targetVersionNumber} not found for this model.`);
    }

    const targetRev = await queryOne('SELECT original_file_name FROM model_revisions WHERE model_id = ? AND revision_number = ? ORDER BY created_at ASC LIMIT 1', [modelId, targetVersionNumber]);
    const restoredName = targetRev ? targetRev.original_file_name : (targetVersion.file_path ? targetVersion.file_path.split('/').pop() : model.original_file_name);
    const ext = restoredName ? restoredName.split('.').pop().toLowerCase() : model.original_file_format;

    // Set model current version and restore web_ready_file_url
    await execute(`
      UPDATE models
      SET current_version = ?,
          web_ready_file_url = ?,
          original_file_name = ?,
          original_file_format = ?,
          original_file_size = ?,
          web_ready_file_size = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [targetVersion.version_number, targetVersion.file_path, restoredName, ext, targetVersion.file_size, targetVersion.file_size, modelId]);

    // Record rollback event in model_revisions
    const revId = 'rev_' + uuidv4().slice(0, 8);
    const cooldownSetting = await getPlatformSetting('cad_cooldown_hours', '24');
    const cooldownHours = parseInt(cooldownSetting, 10) || 24;
    const cooldownDate = toSqlDatetime(new Date(Date.now() + cooldownHours * 60 * 60 * 1000));

    await execute(`
      INSERT INTO model_revisions (
        id, model_id, business_id, user_id, revision_number,
        original_file_name, file_path, file_size, notes, status,
        coins_charged, cooldown_until, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', 0, ?, CURRENT_TIMESTAMP)
    `, [
      revId,
      modelId,
      businessId,
      userId,
      targetVersion.version_number,
      `Restored to v${targetVersion.version_number}`,
      targetVersion.file_path,
      targetVersion.file_size || 0,
      `Rollback restore to Version #${targetVersion.version_number}`,
      cooldownDate
    ]);

    await updateStorageUsage(businessId);

    // Add notification
    const notifId = 'notif_' + uuidv4().slice(0, 8);
    await execute(`
      INSERT INTO notifications (id, business_id, user_id, type, title, message, related_link)
      VALUES (?, ?, ?, 'version_rollback', 'Model Rolled Back', ?, ?)
    `, [
      notifId,
      businessId,
      userId,
      `Model "${model.title}" was successfully rolled back to Version #${targetVersionNumber}.`,
      `/model/${modelId}`
    ]);

    return {
      success: true,
      modelId,
      restoredVersion: targetVersionNumber,
      filePath: targetVersion.file_path
    };
  });
}

/**
 * Reset cooldown for a model (Owner or Admin utility)
 */
export async function resetCADCooldown(businessId, modelId) {
  return await execute(`
    UPDATE model_revisions
    SET cooldown_until = DATE_SUB(NOW(), INTERVAL 1 HOUR),
        created_at = DATE_SUB(NOW(), INTERVAL 25 HOUR)
    WHERE model_id = ?
  `, [modelId]);
}
