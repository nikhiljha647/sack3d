import { v4 as uuidv4 } from 'uuid';
import db, { queryOne, execute, transaction } from '../config/db.js';
import { deductCoins } from './walletService.js';
import { calculateUploadCost } from './businessRules.js';
import { updateStorageUsage } from './storageService.js';
import { generateAndSaveQRCode } from './qrService.js';

/**
 * Model Processor & Conversion Queue
 * Simulates real 3D mesh optimization, LOD generation, and format conversion
 * STRICT RULE: Only deducts 25 coins AFTER processing completes successfully.
 */

// Memory queue of active processing tasks
const processingQueue = new Map();

export async function queueModelProcessing(modelId, userId, businessId, failSimulate = false) {
  const uploadCost = await calculateUploadCost();

  // Set model to 'processing'
  await execute(`
    UPDATE models
    SET processing_status = 'processing', processing_progress = 15, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [modelId]);

  // Asynchronous conversion process
  setTimeout(async () => {
    try {
      if (failSimulate) {
        // Simulated failure scenario
        await execute(`
          UPDATE models
          SET processing_status = 'processing_failed',
              processing_progress = 40,
              processing_error = 'Conversion failed: Non-manifold geometry detected in original CAD wireframe.',
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [modelId]);

        // Insert failure notification
        const notifId = 'notif_' + uuidv4().slice(0, 8);
        await execute(`
          INSERT INTO notifications (id, business_id, user_id, type, title, message, related_link)
          VALUES (?, ?, ?, 'processing_failed', 'Model Processing Failed',
            'Processing failed for your model. No coins have been charged from your wallet.', '/dashboard/my-models')
        `, [notifId, businessId, userId]);

        return;
      }

      // Step 2: Mesh decimation & LOD generation
      await execute(`UPDATE models SET processing_progress = 65 WHERE id = ?`, [modelId]);

      // Step 3: Web-ready GLB compression & materials packaging (Complete)
      const model = await queryOne(`SELECT * FROM models WHERE id = ?`, [modelId]);
      if (!model) return;

      // Deduct coins ONLY upon successful completion
      const coinResult = await deductCoins(
        businessId,
        userId,
        uploadCost,
        'model_upload',
        `3D Model upload and WebAR processing: ${model.title}`,
        modelId
      );

      // Generate QR Code automatically
      const baseUrl = process.env.BASE_URL || process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://sack3d.com' : 'http://localhost:5173');
      const targetUrl = model.visibility === 'private'
        ? `${baseUrl}/model/${model.id}?token=${model.share_token}&ar=true`
        : `${baseUrl}/model/${model.id}?ar=true`;
      
      const qrImageUrl = await generateAndSaveQRCode(model.id, targetUrl);

      // Update model to 'ready'
      await execute(`
        UPDATE models
        SET processing_status = 'ready',
            processing_progress = 100,
            qr_code_url = ?,
            web_ready_file_size = CASE WHEN web_ready_file_size = 0 THEN ROUND(original_file_size * 0.72) ELSE web_ready_file_size END,
            storage_total_bytes = original_file_size + CASE WHEN web_ready_file_size = 0 THEN ROUND(original_file_size * 0.72) ELSE web_ready_file_size END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [qrImageUrl, modelId]);

      // Recalculate business storage
      await updateStorageUsage(businessId);

      // Send success notification
      const notifId = 'notif_' + uuidv4().slice(0, 8);
      await execute(`
        INSERT INTO notifications (id, business_id, user_id, type, title, message, related_link)
        VALUES (?, ?, ?, 'processing_complete', 'Model Ready for 3D & WebAR',
          ?, ?)
      `, [
        notifId,
        businessId,
        userId,
        `Your model "${model.title}" has been converted and is ready for WebAR. ${uploadCost} coins were deducted.`,
        `/model/${model.id}`
      ]);

      console.log(`[ModelProcessor] Successfully processed model ${modelId}. Deducted ${uploadCost} coins.`);
    } catch (err) {
      console.error(`[ModelProcessor] Error during processing of ${modelId}:`, err);
      await execute(`
        UPDATE models
        SET processing_status = 'processing_failed',
            processing_progress = 0,
            processing_error = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [err.message, modelId]).catch(() => {});
    }
  }, 1200); // 1.2s realistic async conversion
}
