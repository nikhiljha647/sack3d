import { queryOne, execute } from '../config/db.js';

/**
 * Storage Calculation & Quota Management Service
 * Aggregates all model files, versions, and generated assets per business.
 */

export async function calculateBusinessStorage(businessId) {
  // Sum original files and web ready files from non-deleted models
  const modelStorageRow = await queryOne(`
    SELECT
      COALESCE(SUM(original_file_size), 0) as original_total,
      COALESCE(SUM(web_ready_file_size), 0) as web_ready_total,
      COALESCE(SUM(storage_total_bytes), 0) as grand_total,
      COUNT(*) as total_models
    FROM models
    WHERE business_id = ? AND deleted_at IS NULL
  `, [businessId]);

  // Sum versions from model_versions
  const versionStorageRow = await queryOne(`
    SELECT COALESCE(SUM(mv.file_size), 0) as version_total
    FROM model_versions mv
    JOIN models m ON mv.model_id = m.id
    WHERE m.business_id = ? AND m.deleted_at IS NULL
  `, [businessId]);

  // Sum CAD revision uploads
  const cadStorageRow = await queryOne(`
    SELECT COALESCE(SUM(file_size), 0) as cad_total
    FROM model_revisions
    WHERE business_id = ?
  `, [businessId]);

  const originalTotal = Number(modelStorageRow?.original_total || 0);
  const webReadyTotal = Number(modelStorageRow?.web_ready_total || 0);
  const versionTotal = Number(versionStorageRow?.version_total || 0);
  const cadTotal = Number(cadStorageRow?.cad_total || 0);

  const totalUsedBytes = originalTotal + webReadyTotal + versionTotal + cadTotal;

  // Fetch plan limit
  const planRow = (await queryOne(`
    SELECT p.storage_bytes, p.name as plan_name, p.slug as plan_slug
    FROM subscriptions s
    JOIN subscription_plans p ON s.plan_id = p.id
    WHERE s.business_id = ? AND s.status = 'active'
    ORDER BY s.created_at DESC LIMIT 1
  `, [businessId])) || { storage_bytes: 1073741824, plan_name: 'Free', plan_slug: 'free' };

  const limitBytes = Number(planRow.storage_bytes);
  const availableBytes = Math.max(0, limitBytes - totalUsedBytes);
  const percentage = Math.min(100, Math.round((totalUsedBytes / limitBytes) * 100));

  return {
    businessId,
    totalUsedBytes,
    totalUsedGB: (totalUsedBytes / 1073741824).toFixed(2),
    totalLimitBytes: limitBytes,
    totalLimitGB: (limitBytes / 1073741824).toFixed(0),
    availableBytes,
    availableGB: (availableBytes / 1073741824).toFixed(2),
    percentage,
    planName: planRow.plan_name,
    planSlug: planRow.plan_slug,
    breakdown: {
      originalFilesBytes: originalTotal,
      originalFilesGB: (originalTotal / 1073741824).toFixed(2),
      webReadyFilesBytes: webReadyTotal,
      webReadyFilesGB: (webReadyTotal / 1073741824).toFixed(2),
      versionFilesBytes: versionTotal,
      versionFilesGB: (versionTotal / 1073741824).toFixed(2),
      cadRevisionsBytes: cadTotal,
      cadRevisionsGB: (cadTotal / 1073741824).toFixed(2),
    }
  };
}

export async function updateStorageUsage(businessId) {
  const stats = await calculateBusinessStorage(businessId);
  await execute(`
    UPDATE businesses
    SET storage_used_bytes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [stats.totalUsedBytes, businessId]);
  return stats;
}
