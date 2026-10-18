# Stripe Payment Integration Guide

Complete guide for integrating Stripe payments with UPI support for ModelAR.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Stripe Account Setup](#stripe-account-setup)
3. [Installation](#installation)
4. [Environment Variables](#environment-variables)
5. [Backend Implementation](#backend-implementation)
6. [Frontend Implementation](#frontend-implementation)
7. [Testing](#testing)
8. [Webhook Configuration](#webhook-configuration)
9. [Production Deployment](#production-deployment)

---

## Prerequisites

- Node.js 16+ installed
- Stripe account (free to create)
- ModelAR application running locally

---

## Stripe Account Setup

### 1. Create Stripe Account

1. Go to [https://stripe.com](https://stripe.com)
2. Click "Start now" and complete registration
3. Verify your email address

### 2. Enable India and UPI

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Settings** → **Payment methods**
3. In the **Payment methods** section, enable:
   - ✅ **Cards** (enabled by default)
   - ✅ **UPI** (search for "UPI" and toggle on)
   - ✅ **Wallets** (optional: Google Pay, PhonePe, Paytm)
4. In **Settings** → **Business settings** → **Country**:
   - Set **India (IN)** as your business country
   - Set **INR** as your default currency

### 3. Get API Keys

1. Navigate to **Developers** → **API keys**
2. You'll see two keys:
   - **Publishable key** (starts with `pk_test_...`) - Safe to use in frontend
   - **Secret key** (starts with `sk_test_...`) - **KEEP SECRET**, use only in backend

⚠️ **Never commit secret keys to Git!**

---

## Installation

Install required npm packages:

```powershell
# Install Stripe dependencies
npm install stripe @stripe/stripe-js @stripe/react-stripe-js
```

---

## Environment Variables

### Backend (.env in root)

Add these to your existing `.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Frontend URL for redirects
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env in root)

Add Vite-specific environment variable:

```env
# Stripe Publishable Key (Frontend)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here

# API URL
VITE_API_URL=http://localhost:5000
```

---

## Backend Implementation

All backend files have been created:

### ✅ Files Created

1. **`server/services/stripeService.js`** - Stripe service with all payment methods
2. **`server/routes/webhooks.js`** - Webhook handler for Stripe events
3. **`server/routes/plans.js`** - Updated with checkout endpoints
4. **`server/server.js`** - Updated to register webhook route

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/plans/create-checkout-session` | POST | Create subscription checkout |
| `/api/plans/create-coin-checkout` | POST | Create coin purchase checkout |
| `/api/webhooks/stripe` | POST | Handle Stripe webhooks |

---

## Frontend Implementation

### ✅ Files Created

1. **`src/components/StripePayment.jsx`** - Payment modal component
2. **`src/pages/Pricing.jsx`** - Updated to integrate Stripe modal

### How It Works

1. User clicks "Subscribe" on Creator or Business plan
2. `StripePayment` modal opens
3. User clicks "Proceed to Payment"
4. Frontend creates checkout session via API
5. User redirects to Stripe Checkout page
6. User completes payment (card/UPI)
7. Stripe redirects back to success URL
8. Webhook updates database

---

## Testing

### Test Cards (India)

Use these test cards in **test mode**:

| Card Number | Description | Expected Result |
|-------------|-------------|-----------------|
| `4000 0035 6000 0008` | Visa (India) | ✅ Success |
| `4000 0000 0000 0077` | Generic card | ❌ Charge fails |
| `4000 0025 0000 3155` | 3D Secure required | 🔐 Requires auth |

**Expiry:** Any future date (e.g., `12/34`)  
**CVC:** Any 3 digits (e.g., `123`)  
**ZIP:** Any 5-6 digits (e.g., `110001`)

### Test UPI IDs

| UPI ID | Result |
|--------|--------|
| `success@stripeupi` | ✅ Payment succeeds |
| `failure@stripeupi` | ❌ Payment fails |

### Testing Subscriptions

```powershell
# 1. Start the backend
cd e:\react\sack3d
npm run dev

# 2. Start the frontend (in another terminal)
cd e:\react\sack3d
npm run dev

# 3. Open browser
http://localhost:5173

# 4. Navigate to Pricing page
# 5. Click "Subscribe" on Creator plan (₹299)
# 6. Use test card: 4000 0035 6000 0008
# 7. Complete payment
```

### Testing UPI

1. On Stripe Checkout page, select **UPI** payment method
2. Enter test UPI: `success@stripeupi`
3. Click "Pay"
4. Payment will succeed immediately

---

## Webhook Configuration

Webhooks allow Stripe to notify your backend when events occur (e.g., payment succeeded, subscription canceled).

### Local Development (Using Stripe CLI)

#### 1. Install Stripe CLI

**Windows (PowerShell):**

```powershell
# Download Stripe CLI
Invoke-WebRequest -Uri "https://github.com/stripe/stripe-cli/releases/download/v1.19.4/stripe_1.19.4_windows_x86_64.zip" -OutFile stripe.zip

# Extract
Expand-Archive stripe.zip -DestinationPath .

# Add to PATH or run directly
.\stripe.exe --version
```

Or use **Scoop** package manager:

```powershell
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe
```

#### 2. Login to Stripe CLI

```powershell
stripe login
```

This opens your browser to authorize the CLI.

#### 3. Forward Webhooks to Local Server

```powershell
# Start webhook forwarding
stripe listen --forward-to http://localhost:5000/api/webhooks/stripe

# Copy the webhook signing secret (starts with whsec_)
# Add it to your .env file as STRIPE_WEBHOOK_SECRET
```

Keep this terminal running while testing.

### Production Webhooks

#### 1. Deploy Your Application

Deploy backend to production (e.g., Heroku, Vercel, Railway, AWS).

#### 2. Create Webhook Endpoint

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. Enter endpoint URL: `https://your-domain.com/api/webhooks/stripe`
4. Select events to listen for:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_...`)
7. Add it to production environment variables

---

## Production Deployment

### 1. Switch to Live Mode

1. In [Stripe Dashboard](https://dashboard.stripe.com), toggle to **Live mode** (top right)
2. Get your **live API keys** from **Developers** → **API keys**
3. Update environment variables with live keys:

```env
# Production Keys
STRIPE_SECRET_KEY=sk_live_your_live_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_live_webhook_secret

FRONTEND_URL=https://your-production-domain.com
```

### 2. Complete Stripe Account Setup

Before going live:

1. **Activate your account**:
   - Go to **Settings** → **Business settings**
   - Complete business verification
   - Add bank account details for payouts

2. **Enable Indian payment methods**:
   - Verify UPI is enabled
   - Complete any required compliance steps

### 3. Test in Production

1. Make a real ₹1 transaction to test
2. Verify webhook events are received
3. Check database updates
4. Confirm email notifications (if configured)

### 4. Security Checklist

- ✅ Secret keys are in environment variables (not in code)
- ✅ Webhook signature verification is enabled
- ✅ HTTPS is enabled on production domain
- ✅ CORS is properly configured
- ✅ Rate limiting is enabled on payment endpoints
- ✅ Error logging is configured

---

## Payment Flow Diagram

```
User clicks "Subscribe" 
    ↓
Frontend: StripePayment modal opens
    ↓
User clicks "Proceed to Payment"
    ↓
Frontend: POST /api/plans/create-checkout-session
    ↓
Backend: stripeService.createCheckoutSession()
    ↓
Backend: Returns { sessionId, url }
    ↓
Frontend: Redirects to Stripe Checkout
    ↓
User completes payment on Stripe (card/UPI)
    ↓
Stripe: Sends webhook to /api/webhooks/stripe
    ↓
Backend: Verifies signature, updates database
    ↓
Stripe: Redirects user to success URL
    ↓
Frontend: Shows success message
```

---

## Supported Payment Methods

### Available in India

✅ **Credit/Debit Cards**: Visa, Mastercard, Amex, Rupay  
✅ **UPI**: Google Pay, PhonePe, PayTM, BHIM  
✅ **Wallets**: Paytm, Amazon Pay, Freecharge  
✅ **Net Banking**: All major Indian banks  

### Test Mode Payment Methods

In test mode, only **Cards** and **UPI** work with test credentials.

---

## Troubleshooting

### Issue: "No such plan: creator"

**Solution:** Ensure `planId` matches Stripe plan IDs. Currently, plans are created dynamically in `stripeService.js`.

### Issue: Webhook signature verification failed

**Solution:**
1. Check `STRIPE_WEBHOOK_SECRET` is correct
2. Ensure webhook route is BEFORE `express.json()` middleware
3. Use `express.raw({ type: 'application/json' })` for webhook route

### Issue: UPI not showing in checkout

**Solution:**
1. Enable UPI in Stripe Dashboard
2. Set business country to India
3. Use test UPI ID: `success@stripeupi`

### Issue: Redirect fails after payment

**Solution:**
1. Check `FRONTEND_URL` environment variable
2. Ensure success/cancel URLs are correct
3. Check browser console for errors

---

## Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe India Guide](https://stripe.com/docs/payments/india)
- [Stripe UPI Documentation](https://stripe.com/docs/payments/upi)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)

---

## Support

For issues:
1. Check Stripe Dashboard → **Logs** for payment errors
2. Check backend console for webhook events
3. Use Stripe CLI for local webhook testing
4. Contact Stripe support for payment issues

---

**Status:** ✅ Implementation Complete  
**Last Updated:** 2026-10-08  
**Version:** 1.0
