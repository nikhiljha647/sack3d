import express from 'express';
import db, { queryOne, queryAll } from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { calculateBusinessStorage } from '../services/storageService.js';
import { getOrCreateWallet } from '../services/walletService.js';
import { getBusinessContext } from '../services/businessRules.js';

const router = express.Router();

// Business overall analytics KPI dashboard
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const businessId = req.business.id;

    // Aggregate model counts and counters
    const totals = (await queryOne(`
      SELECT
        COUNT(*) as total_models,
        COALESCE(SUM(views_count), 0) as total_views,
        COALESCE(SUM(unique_views_count), 0) as total_unique_views,
        COALESCE(SUM(ar_views_count), 0) as total_ar_launches,
        COALESCE(SUM(qr_scans_count), 0) as total_qr_scans,
        COALESCE(SUM(shares_count), 0) as total_shares,
        SUM(CASE WHEN ar_active = 1 THEN 1 ELSE 0 END) as active_ar_models
      FROM models
      WHERE business_id = ? AND deleted_at IS NULL
    `, [businessId])) || {};

    // Coins spent in total
    const coinsSpentRow = (await queryOne(`
      SELECT COALESCE(SUM(ABS(amount)), 0) as total_coins_spent
      FROM coin_transactions
      WHERE business_id = ? AND amount < 0
    `, [businessId])) || {};

    const storageStats = await calculateBusinessStorage(businessId);
    const wallet = await getOrCreateWallet(businessId);
    const ctx = await getBusinessContext(businessId);

    // Device breakdown across all business models
    const devices = await queryAll(`
      SELECT device_type, COUNT(*) as count
      FROM model_analytics a
      JOIN models m ON a.model_id = m.id
      WHERE m.business_id = ?
      GROUP BY device_type
    `, [businessId]);

    // Event type breakdown
    const eventBreakdown = await queryAll(`
      SELECT event_type, COUNT(*) as count
      FROM model_analytics a
      JOIN models m ON a.model_id = m.id
      WHERE m.business_id = ?
      GROUP BY event_type
    `, [businessId]);

    // Top performing models
    const topModels = await queryAll(`
      SELECT id, title, slug, thumbnail_url, views_count, ar_views_count, qr_scans_count
      FROM models
      WHERE business_id = ? AND deleted_at IS NULL
      ORDER BY (views_count + ar_views_count * 2 + qr_scans_count) DESC
      LIMIT 5
    `, [businessId]);

    res.json({
      totals: {
        totalModels: Number(totals.total_models || 0),
        totalViews: Number(totals.total_views || 0),
        totalArLaunches: Number(totals.total_ar_launches || 0),
        totalQrScans: Number(totals.total_qr_scans || 0),
        totalShares: Number(totals.total_shares || 0),
        activeArModels: Number(totals.active_ar_models || 0),
        totalCoinsSpent: Number(coinsSpentRow.total_coins_spent || 0)
      },
      storage: storageStats,
      wallet,
      subscription: {
        planName: ctx.plan.plan_name,
        planSlug: ctx.plan.plan_slug,
        arLimit: ctx.plan.active_ar_models_limit,
        status: ctx.subscription ? ctx.subscription.status : 'active'
      },
      devices,
      eventBreakdown,
      topModels
    });
  } catch (err) {
    console.error('[Analytics Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

// Granular model analytics
router.get('/models/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const model = await queryOne('SELECT * FROM models WHERE id = ? AND business_id = ?', [id, req.business.id]);
    if (!model) return res.status(404).json({ error: 'Model not found' });

    const events = await queryAll(`
      SELECT event_type, device_type, browser, os, created_at
      FROM model_analytics
      WHERE model_id = ?
      ORDER BY created_at DESC
      LIMIT 100
    `, [id]);

    const deviceStats = await queryAll(`
      SELECT device_type, COUNT(*) as count
      FROM model_analytics WHERE model_id = ? GROUP BY device_type
    `, [id]);

    const browserStats = await queryAll(`
      SELECT browser, COUNT(*) as count
      FROM model_analytics WHERE model_id = ? GROUP BY browser
    `, [id]);

    res.json({
      model: {
        id: model.id,
        title: model.title,
        viewsCount: model.views_count,
        arViewsCount: model.ar_views_count,
        qrScansCount: model.qr_scans_count,
        sharesCount: model.shares_count
      },
      deviceStats,
      browserStats,
      recentEvents: events
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
