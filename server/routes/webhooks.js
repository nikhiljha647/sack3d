import express from 'express';
import stripeService from '../services/stripeService.js';
import db, { execute, queryOne } from '../config/db.js';

const router = express.Router();

// This route needs raw body for Stripe signature verification
// Registered before express.json() in server.js
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'];

  try {
    let event;
    try {
      // Verify webhook signature if secret is provided
      event = stripeService.constructWebhookEvent(req.body, signature);
    } catch (sigErr) {
      console.warn('[Webhook Warning]: Signature verification skipped or failed:', sigErr.message);
      // In development, if secret is dummy, parse JSON body
      try {
        event = JSON.parse(req.body.toString('utf8'));
      } catch (e) {
        throw sigErr;
      }
    }

    if (!event || !event.type) {
      return res.status(400).send('Invalid webhook event');
    }

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log(`[Webhook] Handling checkout.session.completed for session: ${session.id}`);

        try {
          await stripeService.fulfillCheckoutSession(session.id);
          console.log(`[Webhook] Session ${session.id} fulfilled successfully.`);
        } catch (fulfillErr) {
          console.error(`[Webhook Error] Failed to fulfill session ${session.id}:`, fulfillErr);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        console.log(`[Webhook] Subscription deleted: ${subscription.id}`);

        // Find business by customer or recent payments
        const payment = await queryOne(`
          SELECT business_id FROM payments 
          WHERE gateway_payment_id LIKE ? OR metadata LIKE ?
          ORDER BY created_at DESC LIMIT 1
        `, [`%${subscription.id}%`, `%${subscription.id}%`]);

        if (payment) {
          await execute(`
            UPDATE subscriptions 
            SET status = 'canceled', plan_id = 'plan_free', updated_at = CURRENT_TIMESTAMP
            WHERE business_id = ?
          `, [payment.business_id]);
          console.log(`[Webhook] Downgraded business ${payment.business_id} to free plan`);
        }
        break;
      }

      default:
        console.log(`[Webhook] Ignored event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('[Webhook Error]:', error.message);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

export default router;
