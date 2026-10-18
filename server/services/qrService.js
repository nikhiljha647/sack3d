import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import db, { queryOne, execute, transaction } from '../config/db.js';

/**
 * QR Code Generation & Scan Tracking Service
 * Supports B2B presets (Packaging, Machinery labels, Showroom tags, Brochures, Restaurant menus)
 */

export async function generateAndSaveQRCode(modelId, targetUrl, preset = 'brochure') {
  try {
    // Generate QR code Data URL (High quality, dark navy on clean white)
    const qrDataUrl = await QRCode.toDataURL(targetUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 2,
      width: 512,
      color: {
        dark: '#1e293b',
        light: '#ffffff'
      }
    });

    const existingQR = await queryOne('SELECT id FROM qr_codes WHERE model_id = ?', [modelId]);
    if (existingQR) {
      await execute(`
        UPDATE qr_codes
        SET target_url = ?, qr_image_url = ?, preset = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [targetUrl, qrDataUrl, preset, existingQR.id]);
      return qrDataUrl;
    } else {
      const qrId = 'qr_' + uuidv4().slice(0, 8);
      await execute(`
        INSERT INTO qr_codes (id, model_id, preset, target_url, qr_image_url)
        VALUES (?, ?, ?, ?, ?)
      `, [qrId, modelId, preset, targetUrl, qrDataUrl]);
      return qrDataUrl;
    }
  } catch (err) {
    console.error('[QRService] Failed to generate QR code:', err);
    throw err;
  }
}

export async function recordQRScan(modelId, meta = {}) {
  return await transaction(async () => {
    // Update model scans count
    await execute(`
      UPDATE models
      SET qr_scans_count = qr_scans_count + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [modelId]);

    // Update qr_codes table
    await execute(`
      UPDATE qr_codes
      SET scan_count = scan_count + 1, last_scanned_at = CURRENT_TIMESTAMP
      WHERE model_id = ?
    `, [modelId]);

    // Insert analytics event
    const eventId = 'ev_qr_' + uuidv4().slice(0, 8);
    await execute(`
      INSERT INTO model_analytics (
        id, model_id, event_type, visitor_id, device_type, browser, os
      ) VALUES (?, ?, 'qr_scan', ?, ?, ?, ?)
    `, [
      eventId,
      modelId,
      meta.visitorId || 'anon_' + uuidv4().slice(0, 6),
      meta.deviceType || 'Mobile',
      meta.browser || 'Web',
      meta.os || 'Unknown'
    ]);

    return { success: true };
  });
}
