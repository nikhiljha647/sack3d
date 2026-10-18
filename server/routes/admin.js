import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db, { queryOne, queryAll, execute, transaction } from '../config/db.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';
import { creditCoins } from '../services/walletService.js';

const router = express.Router();

// Admin guard for all routes
router.use(authMiddleware, requireAdmin);

/**
 * 1. Admin System Overview Metrics
 */
router.get('/overview', async (req, res) => {
  try {
    const totalUsers = (await queryOne('SELECT COUNT(*) as count FROM users')) || { count: 0 };
    const totalBusinesses = (await queryOne('SELECT COUNT(*) as count FROM businesses')) || { count: 0 };
    const totalModels = (await queryOne('SELECT COUNT(*) as count FROM models WHERE deleted_at IS NULL')) || { count: 0 };
    const totalARLaunches = (await queryOne('SELECT COALESCE(SUM(ar_views_count), 0) as count FROM models')) || { count: 0 };
    const totalRevenue = (await queryOne('SELECT COALESCE(SUM(total_amount_inr), 0) as total FROM payments WHERE status = "completed"')) || { total: 0 };

    const recentPayments = await queryAll(`
      SELECT p.*, b.name as business_name, u.full_name as user_name
      FROM payments p
      JOIN businesses b ON p.business_id = b.id
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC LIMIT 6
    `);

    res.json({
      totalUsers: totalUsers.count,
      totalBusinesses: totalBusinesses.count,
      totalModels: totalModels.count,
      totalARLaunches: totalARLaunches.count,
      totalRevenueINR: totalRevenue.total,
      recentPayments
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 2. User Management
 */
router.get('/users', async (req, res) => {
  try {
    const { search } = req.query;
    let sql = `
      SELECT u.id, u.email, u.full_name, u.role, u.is_active, u.created_at,
             b.id as business_id, b.name as business_name, b.storage_used_bytes,
             w.subscription_balance, w.purchased_balance,
             p.name as plan_name, p.slug as plan_slug
      FROM users u
      LEFT JOIN businesses b ON b.owner_id = u.id
      LEFT JOIN wallets w ON w.business_id = b.id
      LEFT JOIN subscriptions s ON s.business_id = b.id AND s.status = 'active'
      LEFT JOIN subscription_plans p ON s.plan_id = p.id
    `;
    const params = [];
    if (search) {
      sql += ' WHERE u.email LIKE ? OR u.full_name LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    }
    sql += ' ORDER BY u.created_at DESC';

    const users = await queryAll(sql, params);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    await execute('UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [isActive ? 1 : 0, id]);
    res.json({ message: `User status updated to ${isActive ? 'active' : 'suspended'}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id/plan', async (req, res) => {
  try {
    const { id } = req.params;
    const { planSlug } = req.body;

    const plan = await queryOne('SELECT * FROM subscription_plans WHERE slug = ?', [planSlug]);
    if (!plan) return res.status(404).json({ error: `Plan '${planSlug}' not found` });

    const user = await queryOne('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let business = await queryOne('SELECT id FROM businesses WHERE owner_id = ?', [id]);
    if (!business) {
      const bizId = 'biz_' + uuidv4().slice(0, 8);
      const bizSlug = (user.full_name || 'biz').toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + uuidv4().slice(0, 4);
      await execute(`
        INSERT INTO businesses (id, owner_id, name, slug)
        VALUES (?, ?, ?, ?)
      `, [bizId, id, `${user.full_name}'s Workspace`, bizSlug]);
      business = { id: bizId };
    }

    // Update or insert active subscription
    const existingSub = await queryOne("SELECT id FROM subscriptions WHERE business_id = ? AND status = 'active'", [business.id]);
    if (existingSub) {
      await execute(`
        UPDATE subscriptions
        SET plan_id = ?, current_period_start = CURRENT_TIMESTAMP,
            current_period_end = DATE_ADD(NOW(), INTERVAL 30 DAY), updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [plan.id, existingSub.id]);
    } else {
      const subId = 'sub_' + uuidv4().slice(0, 8);
      await execute(`
        INSERT INTO subscriptions (id, business_id, plan_id, status, current_period_end)
        VALUES (?, ?, ?, 'active', DATE_ADD(NOW(), INTERVAL 30 DAY))
      `, [subId, business.id, plan.id]);
    }

    // If upgrading to a paid tier with monthly coins, credit the monthly allowance
    if (plan.monthly_coins > 0) {
      await creditCoins(
        business.id,
        id,
        plan.monthly_coins,
        'subscription',
        'subscription_credit',
        `Admin assigned ${plan.name} Plan monthly allowance (+${plan.monthly_coins} coins)`
      );
    }

    res.json({ message: `Successfully assigned ${user.full_name} (${user.email}) to ${plan.name} Plan!`, plan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id/set-coins', async (req, res) => {
  try {
    const { id } = req.params;
    const { subscriptionBalance, purchasedBalance, reason = 'Admin manual balance adjustment' } = req.body;

    const subBal = parseInt(subscriptionBalance, 10);
    const purBal = parseInt(purchasedBalance, 10);

    const business = await queryOne('SELECT id FROM businesses WHERE owner_id = ?', [id]);
    if (!business) return res.status(404).json({ error: 'Business organization not found for this user' });

    let wallet = await queryOne('SELECT * FROM wallets WHERE business_id = ?', [business.id]);
    if (!wallet) {
      const walId = 'wal_' + uuidv4().slice(0, 8);
      await execute(`
        INSERT INTO wallets (id, business_id, subscription_balance, purchased_balance)
        VALUES (?, ?, ?, ?)
      `, [walId, business.id, isNaN(subBal) ? 0 : Math.max(0, subBal), isNaN(purBal) ? 0 : Math.max(0, purBal)]);
      wallet = await queryOne('SELECT * FROM wallets WHERE id = ?', [walId]);
    } else {
      const newSub = isNaN(subBal) ? wallet.subscription_balance : Math.max(0, subBal);
      const newPur = isNaN(purBal) ? wallet.purchased_balance : Math.max(0, purBal);
      await execute(`
        UPDATE wallets
        SET subscription_balance = ?, purchased_balance = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [newSub, newPur, wallet.id]);
    }

    // Ledger record
    const txId = 'tx_' + uuidv4().slice(0, 8);
    const updatedSub = isNaN(subBal) ? wallet.subscription_balance : Math.max(0, subBal);
    const updatedPur = isNaN(purBal) ? wallet.purchased_balance : Math.max(0, purBal);
    await execute(`
      INSERT INTO coin_transactions (
        id, wallet_id, user_id, business_id, amount, coin_source,
        transaction_type, description, balance_after
      ) VALUES (?, ?, ?, ?, ?, 'mixed', 'admin_adjustment', ?, ?)
    `, [txId, wallet.id, id, business.id, (updatedSub + updatedPur) - (wallet.subscription_balance + wallet.purchased_balance), reason, updatedSub + updatedPur]);

    res.json({ message: 'User coin balance updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, role } = req.body;

    const user = await queryOne('SELECT id FROM users WHERE id = ?', [id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (email) {
      const existing = await queryOne('SELECT id FROM users WHERE email = ? AND id != ?', [email, id]);
      if (existing) return res.status(400).json({ error: 'Email is already taken by another user' });
    }

    const validRole = ['user', 'admin'].includes(role) ? role : undefined;

    await execute(`
      UPDATE users
      SET full_name = COALESCE(?, full_name),
          email = COALESCE(?, email),
          role = COALESCE(?, role),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [full_name, email, validRole, id]);

    res.json({ message: 'User profile updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.id === id) {
      return res.status(400).json({ error: 'You cannot delete your own active Super Admin account' });
    }

    const user = await queryOne('SELECT id, email, full_name FROM users WHERE id = ?', [id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await transaction(async () => {
      const businesses = await queryAll('SELECT id FROM businesses WHERE owner_id = ?', [id]);
      for (const biz of businesses) {
        const models = await queryAll('SELECT id FROM models WHERE business_id = ?', [biz.id]);
        for (const m of models) {
          await execute('DELETE FROM model_files WHERE model_id = ?', [m.id]);
          await execute('DELETE FROM model_versions WHERE model_id = ?', [m.id]);
          await execute('DELETE FROM model_revisions WHERE model_id = ?', [m.id]);
          await execute('DELETE FROM model_analytics WHERE model_id = ?', [m.id]);
          await execute('DELETE FROM models WHERE id = ?', [m.id]);
        }
        await execute('DELETE FROM coin_transactions WHERE business_id = ?', [biz.id]);
        await execute('DELETE FROM wallets WHERE business_id = ?', [biz.id]);
        await execute('DELETE FROM subscriptions WHERE business_id = ?', [biz.id]);
        await execute('DELETE FROM payments WHERE business_id = ?', [biz.id]);
        await execute('DELETE FROM team_members WHERE business_id = ?', [biz.id]);
        await execute('DELETE FROM workspaces WHERE business_id = ?', [biz.id]);
        await execute('DELETE FROM galleries WHERE business_id = ?', [biz.id]);
        await execute('DELETE FROM businesses WHERE id = ?', [biz.id]);
      }

      await execute('DELETE FROM coin_transactions WHERE user_id = ?', [id]);
      await execute('DELETE FROM payments WHERE user_id = ?', [id]);
      await execute('DELETE FROM team_members WHERE user_id = ?', [id]);
      await execute('DELETE FROM model_revisions WHERE user_id = ?', [id]);
      await execute('DELETE FROM model_versions WHERE created_by_user_id = ?', [id]);
      await execute('DELETE FROM users WHERE id = ?', [id]);
    });

    res.json({ message: `User ${user.email} (${user.full_name}) and all associated records permanently purged` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/users/:id/grant-coins', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, reason = 'Admin adjustment grant' } = req.body;
    const coins = parseInt(amount, 10);
    if (!coins || coins <= 0) return res.status(400).json({ error: 'Valid coin amount is required' });

    const business = await queryOne('SELECT id FROM businesses WHERE owner_id = ?', [id]);
    if (!business) return res.status(404).json({ error: 'Business organization not found for this user' });

    const result = await creditCoins(business.id, id, coins, 'subscription', 'admin_adjustment', reason);
    res.json({ message: `Granted ${coins} coins successfully`, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 3. Models Moderation & Master Control
 */
router.get('/models', async (req, res) => {
  try {
    const models = await queryAll(`
      SELECT m.*, b.name as business_name, c.name as category_name
      FROM models m
      JOIN businesses b ON m.business_id = b.id
      LEFT JOIN categories c ON m.category_id = c.id
      WHERE m.deleted_at IS NULL
      ORDER BY m.created_at DESC
    `);
    res.json(models);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/models/:id/moderation', async (req, res) => {
  try {
    const { id } = req.params;
    const { visibility, processingStatus } = req.body;
    await execute(`
      UPDATE models
      SET visibility = COALESCE(?, visibility),
          processing_status = COALESCE(?, processing_status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [visibility, processingStatus, id]);

    res.json({ message: 'Model moderation updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/models/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const model = await queryOne('SELECT id, title FROM models WHERE id = ?', [id]);
    if (!model) return res.status(404).json({ error: 'Model not found' });

    await transaction(async () => {
      await execute('DELETE FROM model_files WHERE model_id = ?', [id]);
      await execute('DELETE FROM model_versions WHERE model_id = ?', [id]);
      await execute('DELETE FROM model_revisions WHERE model_id = ?', [id]);
      await execute('DELETE FROM model_analytics WHERE model_id = ?', [id]);
      await execute('DELETE FROM models WHERE id = ?', [id]);
    });

    res.json({ message: `Model "${model.title}" successfully deleted by admin` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 4. Plans Configuration (NO HARD-CODED LIMITS)
 */
router.get('/plans', async (req, res) => {
  try {
    const plans = await queryAll('SELECT * FROM subscription_plans ORDER BY price_inr ASC');
    res.json(plans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/plans/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      price_inr, monthly_coins, storage_gb, cad_revisions_monthly,
      cad_revisions_max_per_model, active_ar_models_limit, max_team_members
    } = req.body;

    const storageBytes = storage_gb ? storage_gb * 1073741824 : undefined;

    await execute(`
      UPDATE subscription_plans
      SET price_inr = COALESCE(?, price_inr),
          monthly_coins = COALESCE(?, monthly_coins),
          storage_bytes = COALESCE(?, storage_bytes),
          cad_revisions_monthly = COALESCE(?, cad_revisions_monthly),
          cad_revisions_max_per_model = COALESCE(?, cad_revisions_max_per_model),
          active_ar_models_limit = COALESCE(?, active_ar_models_limit),
          max_team_members = COALESCE(?, max_team_members),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      price_inr, monthly_coins, storageBytes,
      cad_revisions_monthly, cad_revisions_max_per_model,
      active_ar_models_limit, max_team_members, id
    ]);

    const updated = await queryOne('SELECT * FROM subscription_plans WHERE id = ?', [id]);
    res.json({ message: 'Plan limits and pricing updated', plan: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 5. Coin Top-up Packages Management
 */
router.get('/packages', async (req, res) => {
  try {
    const packages = await queryAll('SELECT * FROM coin_packages ORDER BY sort_order ASC');
    res.json(packages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/packages', async (req, res) => {
  try {
    const { name, coin_amount, price_inr, is_popular = 0 } = req.body;
    const id = 'pkg_' + uuidv4().slice(0, 8);
    await execute(`
      INSERT INTO coin_packages (id, name, coin_amount, price_inr, is_popular, is_active, sort_order)
      VALUES (?, ?, ?, ?, ?, 1, 99)
    `, [id, name, coin_amount, price_inr, is_popular ? 1 : 0]);
    res.status(201).json({ message: 'Coin package created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/packages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, coin_amount, price_inr, is_popular, is_active } = req.body;
    await execute(`
      UPDATE coin_packages
      SET name = COALESCE(?, name),
          coin_amount = COALESCE(?, coin_amount),
          price_inr = COALESCE(?, price_inr),
          is_popular = COALESCE(?, is_popular),
          is_active = COALESCE(?, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [name, coin_amount, price_inr, is_popular, is_active, id]);
    res.json({ message: 'Coin package updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/packages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await execute('DELETE FROM coin_packages WHERE id = ?', [id]);
    res.json({ message: 'Coin package deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 6. Payments Audit
 */
router.get('/payments', async (req, res) => {
  try {
    const payments = await queryAll(`
      SELECT p.*, b.name as business_name, u.email as user_email
      FROM payments p
      JOIN businesses b ON p.business_id = b.id
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `);
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 7. Platform Settings
 */
router.get('/settings', async (req, res) => {
  try {
    const settings = await queryAll('SELECT * FROM platform_settings');
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/settings/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    await execute(`
      UPDATE platform_settings
      SET setting_value = ?, updated_at = CURRENT_TIMESTAMP
      WHERE setting_key = ?
    `, [String(value), key]);
    res.json({ message: `Setting "${key}" updated successfully` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
