import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db, { queryOne, queryAll, execute, transaction } from '../config/db.js';
import { authMiddleware, requireBusinessRole } from '../middleware/auth.js';
import { creditCoins, getOrCreateWallet } from '../services/walletService.js';
import { getBusinessContext } from '../services/businessRules.js';
import stripeService from '../services/stripeService.js';

const router = express.Router();

// List public plans
router.get('/', async (req, res) => {
  try {
    const plans = await queryAll('SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY price_inr ASC');
    res.json(plans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List active coin packages
router.get('/packages', async (req, res) => {
  try {
    const packages = await queryAll('SELECT * FROM coin_packages WHERE is_active = 1 ORDER BY sort_order ASC');
    res.json(packages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Subscribe / Upgrade Plan
router.post('/subscribe', authMiddleware, requireBusinessRole(['owner', 'admin']), async (req, res) => {
  try {
    const { planSlug, paymentMethod = 'stripe' } = req.body;
    const businessId = req.business.id;
    const userId = req.user.id;

    const plan = await queryOne('SELECT * FROM subscription_plans WHERE slug = ? AND is_active = 1', [planSlug]);
    if (!plan) {
      return res.status(404).json({ error: 'Subscription plan not found' });
    }

    const price = plan.price_inr;
    const gst = Math.round(price * 0.18);
    const totalAmount = price + gst;

    const result = await transaction(async () => {
      const paymentId = 'pay_sub_' + uuidv4().slice(0, 8);

      // Record payment
      await execute(`
        INSERT INTO payments (
          id, business_id, user_id, amount_inr, gst_inr, total_amount_inr,
          payment_type, item_id, status, payment_gateway, gateway_payment_id
        ) VALUES (?, ?, ?, ?, ?, ?, 'subscription', ?, 'completed', ?, ?)
      `, [
        paymentId,
        businessId,
        userId,
        price,
        gst,
        totalAmount,
        plan.id,
        paymentMethod,
        'sim_ch_' + uuidv4().slice(0, 10)
      ]);

      // Update or insert subscription
      const existingSub = await queryOne("SELECT id FROM subscriptions WHERE business_id = ? AND status = 'active'", [businessId]);
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
        `, [subId, businessId, plan.id]);
      }

      // Credit monthly coins to subscription balance
      if (plan.monthly_coins > 0) {
        await creditCoins(
          businessId,
          userId,
          plan.monthly_coins,
          'subscription',
          'subscription_credit',
          `${plan.name} Monthly Subscription Coin Allowance (+${plan.monthly_coins} coins)`,
          paymentId
        );
      }

      return { paymentId, totalAmount, planName: plan.name };
    });

    const context = await getBusinessContext(businessId);

    res.json({
      message: `Successfully subscribed to ${result.planName}!`,
      context,
      payment: {
        paymentId: result.paymentId,
        amount: price,
        gst,
        totalAmount
      }
    });
  } catch (err) {
    console.error('[Subscribe Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create Stripe checkout session for subscription
router.post('/create-checkout-session', authMiddleware, async (req, res) => {
  try {
    const { planId } = req.body;
    const userId = req.user.id;
    const userEmail = req.user.email;
    const businessId = req.business?.id;

    // Build success and cancel URLs
    const baseUrl = process.env.BASE_URL || process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://sack3d.com' : 'http://localhost:5173');
    const successUrl = `${baseUrl}/dashboard/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/pricing?canceled=true`;

    const session = await stripeService.createCheckoutSession({
      planId,
      userId,
      businessId,
      userEmail,
      successUrl,
      cancelUrl,
    });

    res.json({
      sessionId: session.sessionId,
      url: session.url,
    });
  } catch (err) {
    console.error('[Stripe Checkout Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create Stripe checkout session for coin purchase
router.post('/create-coin-checkout', authMiddleware, async (req, res) => {
  try {
    const { packageId, amount, coins } = req.body;
    const userId = req.user.id;
    const userEmail = req.user.email;
    const businessId = req.business?.id;

    let totalAmount = amount;
    let coinAmount = coins;

    if (packageId) {
      const pkg = await queryOne('SELECT * FROM coin_packages WHERE id = ? AND is_active = 1', [packageId]);
      if (pkg) {
        coinAmount = pkg.coin_amount;
        const gst = Math.round(pkg.price_inr * (pkg.gst_percentage / 100));
        totalAmount = pkg.price_inr + gst;
      }
    }

    if (!totalAmount || !coinAmount) {
      return res.status(400).json({ error: 'Invalid coin purchase amount or coin count' });
    }

    // Build success and cancel URLs
    const baseUrl = process.env.BASE_URL || process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://sack3d.com' : 'http://localhost:5173');
    const returnPath = (req.body.returnUrl || req.body.returnPath || '/dashboard/wallet').split('?')[0];
    const successUrl = `${baseUrl}${returnPath}?success=true&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}${returnPath}?canceled=true`;

    const session = await stripeService.createCoinPurchaseSession({
      amount: totalAmount,
      coins: coinAmount,
      packageId,
      userId,
      businessId,
      userEmail,
      successUrl,
      cancelUrl,
    });

    res.json({
      sessionId: session.sessionId,
      url: session.url,
    });
  } catch (err) {
    console.error('[Stripe Coin Checkout Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

// Verify Stripe checkout session (called upon redirect back from Stripe)
router.post('/verify-session', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    const result = await stripeService.fulfillCheckoutSession(sessionId);
    const context = await getBusinessContext(req.business?.id);

    res.json({
      success: true,
      result,
      context,
      message: result.type === 'coins'
        ? `Successfully credited ${result.coinsCredited} coins to your wallet!`
        : `Successfully activated ${result.planName || 'your'} subscription plan!`
    });
  } catch (err) {
    console.error('[Verify Session Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

// Purchase Coin Top-up Package
router.post('/purchase-coins', authMiddleware, requireBusinessRole(['owner', 'admin', 'editor']), async (req, res) => {
  try {
    const { packageId, paymentMethod = 'stripe' } = req.body;
    const businessId = req.business.id;
    const userId = req.user.id;

    const pkg = await queryOne('SELECT * FROM coin_packages WHERE id = ? AND is_active = 1', [packageId]);
    if (!pkg) {
      return res.status(404).json({ error: 'Coin package not found' });
    }

    const price = pkg.price_inr;
    const gst = Math.round(price * (pkg.gst_percentage / 100));
    const totalAmount = price + gst;

    const result = await transaction(async () => {
      const paymentId = 'pay_coin_' + uuidv4().slice(0, 8);

      // Record payment
      await execute(`
        INSERT INTO payments (
          id, business_id, user_id, amount_inr, gst_inr, total_amount_inr,
          payment_type, item_id, status, payment_gateway, gateway_payment_id
        ) VALUES (?, ?, ?, ?, ?, ?, 'coin_package', ?, 'completed', ?, ?)
      `, [
        paymentId,
        businessId,
        userId,
        price,
        gst,
        totalAmount,
        pkg.id,
        paymentMethod,
        'sim_ch_' + uuidv4().slice(0, 10)
      ]);

      // Credit coins directly into PURCHASED balance with ledger recording
      const creditResult = await creditCoins(
        businessId,
        userId,
        pkg.coin_amount,
        'purchased',
        'coin_purchase',
        `Purchased ${pkg.name} (+${pkg.coin_amount} coins)`,
        paymentId
      );

      return {
        paymentId,
        coinsCredited: pkg.coin_amount,
        newBalance: creditResult.newBalance
      };
    });

    res.json({
      message: `Successfully purchased ${pkg.coin_amount} coins!`,
      coinsAdded: pkg.coin_amount,
      newBalance: result.newBalance,
      invoice: {
        paymentId: result.paymentId,
        baseAmount: price,
        gst,
        totalAmount,
        currency: 'INR'
      }
    });
  } catch (err) {
    console.error('[Purchase Coins Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
