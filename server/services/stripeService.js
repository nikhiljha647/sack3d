import Stripe from 'stripe';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { queryOne, execute, transaction } from '../config/db.js';
import { creditCoins } from './walletService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is loaded regardless of process working directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

let stripeInstance = null;

export function getStripe() {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey || secretKey.includes('your_secret_key')) {
      throw new Error('STRIPE_SECRET_KEY is not configured or invalid in .env');
    }
    stripeInstance = new Stripe(secretKey);
  }
  return stripeInstance;
}

class StripeService {
  /**
   * Create a checkout session for subscription
   */
  async createCheckoutSession({ planId, userId, businessId, userEmail, successUrl, cancelUrl }) {
    try {
      const stripe = getStripe();

      // Normalize plan slug and id
      const normalizedSlug = planId ? planId.replace('plan_', '') : 'creator';

      // Plan price mapping (in paise for INR)
      const planPrices = {
        creator: 29900, // ₹299
        business: 79900  // ₹799
      };

      const planNames = {
        creator: 'Creator Plan',
        business: 'Business Plan'
      };

      if (normalizedSlug === 'free') {
        throw new Error('Free plan does not require payment');
      }

      if (!planPrices[normalizedSlug]) {
        throw new Error(`Invalid plan ID: ${planId}`);
      }

      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: 'inr',
              product_data: {
                name: planNames[normalizedSlug],
                description: `ModelAR ${planNames[normalizedSlug]} - Monthly Subscription`,
              },
              unit_amount: planPrices[normalizedSlug],
              recurring: {
                interval: 'month',
              },
            },
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: userEmail,
        metadata: {
          userId: userId ? userId.toString() : '',
          businessId: businessId ? businessId.toString() : '',
          planSlug: normalizedSlug,
          planId: `plan_${normalizedSlug}`,
          type: 'subscription',
        },
        billing_address_collection: 'required',
      });

      return {
        sessionId: session.id,
        url: session.url,
      };
    } catch (error) {
      console.error('[Stripe] Checkout session error:', error);
      throw error;
    }
  }

  /**
   * Create a one-time payment session for coin purchase
   */
  async createCoinPurchaseSession({ amount, coins, packageId, userId, businessId, userEmail, successUrl, cancelUrl }) {
    try {
      const stripe = getStripe();

      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: 'inr',
              product_data: {
                name: `${coins} ModelAR Coins`,
                description: `Purchase ${coins} coins for your ModelAR wallet`,
              },
              unit_amount: Math.round(amount * 100), // Convert to paise
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: userEmail,
        metadata: {
          userId: userId ? userId.toString() : '',
          businessId: businessId ? businessId.toString() : '',
          packageId: packageId || '',
          coins: coins ? coins.toString() : '0',
          type: 'coin_purchase',
        },
      });

      return {
        sessionId: session.id,
        url: session.url,
      };
    } catch (error) {
      console.error('[Stripe] Coin purchase session error:', error);
      throw error;
    }
  }

  /**
   * Retrieve checkout session details
   */
  async getCheckoutSession(sessionId) {
    const stripe = getStripe();
    return await stripe.checkout.sessions.retrieve(sessionId);
  }

  /**
   * Fulfill a completed checkout session (idempotent for webhook & direct redirect)
   */
  async fulfillCheckoutSession(sessionId) {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Verify session has been completed / paid
    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      throw new Error(`Checkout session is not paid (status: ${session.payment_status}, state: ${session.status})`);
    }

    const metadata = session.metadata || {};
    const { userId, businessId, planSlug, planId, coins, type, packageId } = metadata;

    // 1. Idempotency Check: Already processed?
    const existingPayment = await queryOne(
      'SELECT id, item_id, total_amount_inr FROM payments WHERE gateway_payment_id = ?',
      [session.id]
    );

    if (existingPayment) {
      console.log(`[Stripe] Session ${session.id} already fulfilled as payment ${existingPayment.id}`);
      return {
        success: true,
        alreadyProcessed: true,
        paymentId: existingPayment.id,
        type: type || 'subscription'
      };
    }

    // 2. Resolve business context
    let resolvedBizId = businessId;
    if (!resolvedBizId && userId) {
      // Find business where user is owner or member
      const biz = await queryOne(`
        SELECT b.id FROM businesses b
        WHERE b.owner_id = ?
        ORDER BY b.created_at ASC LIMIT 1
      `, [userId]);

      if (biz) {
        resolvedBizId = biz.id;
      } else {
        const teamMember = await queryOne(`
          SELECT business_id FROM team_members WHERE user_id = ? LIMIT 1
        `, [userId]);
        if (teamMember) resolvedBizId = teamMember.business_id;
      }
    }

    if (!resolvedBizId) {
      throw new Error(`Cannot fulfill payment: No business found for user ${userId}`);
    }

    // 3. Process according to type
    if (type === 'coin_purchase' || (coins && parseInt(coins) > 0)) {
      const coinCount = parseInt(coins);
      const totalInr = Math.round((session.amount_total || 0) / 100);
      const paymentId = 'pay_coin_' + uuidv4().slice(0, 8);

      await transaction(async () => {
        // Record payment
        await execute(`
          INSERT INTO payments (
            id, business_id, user_id, amount_inr, gst_inr, total_amount_inr,
            currency, payment_type, item_id, status, payment_gateway, gateway_payment_id
          ) VALUES (?, ?, ?, ?, ?, ?, 'INR', 'coin_package', ?, 'completed', 'stripe', ?)
        `, [
          paymentId,
          resolvedBizId,
          userId || null,
          totalInr,
          0,
          totalInr,
          packageId || 'custom_coins',
          session.id
        ]);

        // Credit coins into PURCHASED balance with ledger recording
        await creditCoins(
          resolvedBizId,
          userId || 'system',
          coinCount,
          'purchased',
          'coin_purchase',
          `Stripe Coin Purchase (+${coinCount} coins)`,
          paymentId
        );
      });

      console.log(`[Stripe] Fulfilled ${coinCount} coins for business ${resolvedBizId}`);
      return {
        success: true,
        type: 'coins',
        coinsCredited: coinCount,
        paymentId
      };
    } else {
      // Subscription fulfillment
      const slug = planSlug || (planId ? planId.replace('plan_', '') : 'creator');
      const plan = await queryOne(
        'SELECT * FROM subscription_plans WHERE slug = ? OR id = ? LIMIT 1',
        [slug, `plan_${slug}`]
      );

      if (!plan) {
        throw new Error(`Subscription plan not found: ${slug}`);
      }

      const paymentId = 'pay_sub_' + uuidv4().slice(0, 8);
      const price = plan.price_inr;
      const gst = Math.round(price * 0.18);
      const totalAmount = Math.round((session.amount_total || 0) / 100) || (price + gst);

      await transaction(async () => {
        // Record payment
        await execute(`
          INSERT INTO payments (
            id, business_id, user_id, amount_inr, gst_inr, total_amount_inr,
            currency, payment_type, item_id, status, payment_gateway, gateway_payment_id
          ) VALUES (?, ?, ?, ?, ?, ?, 'INR', 'subscription', ?, 'completed', 'stripe', ?)
        `, [
          paymentId,
          resolvedBizId,
          userId || null,
          price,
          gst,
          totalAmount,
          plan.id,
          session.id
        ]);

        // Update or insert subscription
        const existingSub = await queryOne(
          'SELECT id FROM subscriptions WHERE business_id = ?',
          [resolvedBizId]
        );

        if (existingSub) {
          await execute(`
            UPDATE subscriptions
            SET plan_id = ?, status = 'active',
                current_period_start = CURRENT_TIMESTAMP,
                current_period_end = DATE_ADD(NOW(), INTERVAL 30 DAY),
                payment_method = 'stripe',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [plan.id, existingSub.id]);
        } else {
          const subId = 'sub_' + uuidv4().slice(0, 8);
          await execute(`
            INSERT INTO subscriptions (id, business_id, plan_id, status, current_period_end, payment_method)
            VALUES (?, ?, ?, 'active', DATE_ADD(NOW(), INTERVAL 30 DAY), 'stripe')
          `, [subId, resolvedBizId, plan.id]);
        }

        // Credit monthly allowance coins to subscription balance
        if (plan.monthly_coins > 0) {
          await creditCoins(
            resolvedBizId,
            userId || 'system',
            plan.monthly_coins,
            'subscription',
            'subscription_credit',
            `${plan.name} Monthly Subscription Allowance (+${plan.monthly_coins} coins)`,
            paymentId
          );
        }
      });

      console.log(`[Stripe] Fulfilled subscription to ${plan.name} for business ${resolvedBizId}`);
      return {
        success: true,
        type: 'subscription',
        planName: plan.name,
        planSlug: plan.slug,
        paymentId
      };
    }
  }

  /**
   * Verify webhook signature
   */
  constructWebhookEvent(payload, signature) {
    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured in .env');
    }
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId) {
    const stripe = getStripe();
    return await stripe.subscriptions.retrieve(subscriptionId);
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId) {
    const stripe = getStripe();
    return await stripe.subscriptions.cancel(subscriptionId);
  }

  /**
   * Get customer portal URL for managing subscriptions
   */
  async createCustomerPortalSession(customerId, returnUrl) {
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return session.url;
  }
}

export default new StripeService();
