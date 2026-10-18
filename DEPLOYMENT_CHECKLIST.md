# 🚀 ModelAR Deployment Checklist

Use this checklist to ensure smooth deployment to production.

## ✅ Pre-Deployment (Local)

### Code Preparation
- [ ] All features tested locally
- [ ] No console.logs in production code
- [ ] Error handling implemented
- [ ] Input validation added
- [ ] File upload size limits configured
- [ ] Database schema tested
- [ ] Seed data prepared

### Configuration Files
- [ ] `railway.json` created
- [ ] `package.json` scripts updated
- [ ] `.gitignore` configured
- [ ] `.env.production.example` reviewed
- [ ] Production CORS configured

### Security
- [ ] Strong JWT secret generated (64+ characters)
- [ ] All secrets removed from code
- [ ] HTTPS enforced
- [ ] Rate limiting configured (optional)
- [ ] File upload validation

---

## ✅ Railway Setup

### Account & Project
- [ ] Railway account created
- [ ] GitHub connected
- [ ] New project created
- [ ] Repository linked

### Database
- [ ] MySQL database added
- [ ] Connection details copied
- [ ] Schema imported
- [ ] Seed data inserted
- [ ] Database verified (tables created)

### Environment Variables
- [ ] `NODE_ENV=production`
- [ ] Database credentials (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME)
- [ ] JWT_SECRET (strong random string)
- [ ] Stripe live keys (STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY)
- [ ] FRONTEND_URL (Railway domain)
- [ ] VITE_STRIPE_PUBLISHABLE_KEY
- [ ] VITE_API_URL

### Deployment
- [ ] First deployment successful
- [ ] Build logs checked (no errors)
- [ ] Application running
- [ ] Health check endpoint working: `/api/health`

---

## ✅ Stripe Configuration

### Account Activation
- [ ] Stripe account activated
- [ ] Business verification completed
- [ ] Bank account added
- [ ] Tax information submitted

### Payment Methods
- [ ] Switched to LIVE mode
- [ ] Cards enabled (Visa, Mastercard, RuPay)
- [ ] UPI enabled
- [ ] Wallets enabled (optional)
- [ ] India set as country
- [ ] INR set as currency

### API Keys
- [ ] Live publishable key copied: `pk_live_...`
- [ ] Live secret key copied: `sk_live_...`
- [ ] Keys added to Railway environment variables

### Webhooks
- [ ] Webhook endpoint created: `https://your-app.up.railway.app/api/webhooks/stripe`
- [ ] Events selected:
  - [ ] `checkout.session.completed`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
  - [ ] `invoice.payment_succeeded`
  - [ ] `invoice.payment_failed`
- [ ] Webhook signing secret copied: `whsec_...`
- [ ] Signing secret added to Railway

---

## ✅ Testing on Production

### Basic Functionality
- [ ] Homepage loads
- [ ] Static assets load (images, fonts)
- [ ] CSS/styling correct
- [ ] Navigation works

### Authentication
- [ ] User registration works
- [ ] Email validation works
- [ ] Login works
- [ ] JWT token generated
- [ ] Protected routes accessible after login

### Core Features
- [ ] Model upload works
- [ ] 3D viewer renders correctly
- [ ] WebAR functionality works
- [ ] QR code generation works
- [ ] Gallery creation works
- [ ] Analytics dashboard shows data

### Payment Flow
- [ ] **IMPORTANT**: Test with small real transaction first!
- [ ] Pricing page loads
- [ ] "Subscribe" button works
- [ ] Stripe Checkout opens
- [ ] Payment with test card succeeds (then refund)
- [ ] UPI payment works (test with ₹1)
- [ ] Webhook receives event
- [ ] Database updates (user plan changes)
- [ ] Success redirect works

### Admin Features
- [ ] Admin login works
- [ ] User management accessible
- [ ] Analytics visible
- [ ] Settings modifiable

---

## ✅ Domain & SSL (Optional)

### Custom Domain
- [ ] Domain purchased
- [ ] Added to Railway
- [ ] DNS records configured (CNAME)
- [ ] DNS propagated (check with https://dnschecker.org)
- [ ] SSL certificate active
- [ ] HTTPS redirect works
- [ ] Environment variables updated with new domain

---

## ✅ Monitoring & Backups

### Monitoring
- [ ] Railway metrics dashboard checked
- [ ] UptimeRobot configured (https://uptimerobot.com)
- [ ] Error tracking setup (Sentry - optional)
- [ ] Google Analytics added (optional)

### Backups
- [ ] Database backup script created
- [ ] Automated backup scheduled
- [ ] Backup restoration tested
- [ ] File uploads backed up (S3/R2)

### Logging
- [ ] Application logs accessible in Railway
- [ ] Error logs monitored
- [ ] Payment logs reviewed

---

## ✅ Launch Preparation

### Legal & Compliance
- [ ] Privacy Policy page created
- [ ] Terms of Service page created
- [ ] Refund Policy page created
- [ ] Contact information added
- [ ] Company/business details visible

### Content
- [ ] About page complete
- [ ] FAQ section added
- [ ] Pricing clearly displayed
- [ ] Feature descriptions accurate
- [ ] Screenshots/demos added

### Communication
- [ ] Support email configured
- [ ] Contact form tested
- [ ] Social media links added
- [ ] Help documentation prepared

---

## ✅ Post-Launch

### Day 1
- [ ] Monitor Railway dashboard
- [ ] Check error logs
- [ ] Monitor Stripe dashboard
- [ ] Test all payment flows again
- [ ] Respond to support emails

### Week 1
- [ ] Monitor uptime (should be 99.9%+)
- [ ] Check database performance
- [ ] Review user feedback
- [ ] Fix critical bugs
- [ ] Update documentation

### Month 1
- [ ] Analyze metrics
- [ ] Review Stripe fees
- [ ] Optimize slow queries
- [ ] Plan next features
- [ ] Scale resources if needed

---

## 🆘 Emergency Contacts

- **Railway Support**: https://railway.app/help
- **Stripe Support**: https://support.stripe.com
- **Database Issues**: Check Railway MySQL logs
- **Payment Issues**: Check Stripe Dashboard → Logs

---

## 📊 Success Metrics

Track these after launch:

- [ ] Uptime: >99.9%
- [ ] Page load time: <3 seconds
- [ ] Payment success rate: >95%
- [ ] User registration working
- [ ] Zero critical errors
- [ ] Database performance good
- [ ] Stripe webhook delivery: 100%

---

## ✅ Final Sign-Off

- [ ] All items above completed
- [ ] Test transaction successful and refunded
- [ ] Team briefed on production access
- [ ] Rollback plan prepared
- [ ] On-call schedule defined

**Deployed By**: _________________
**Date**: _________________
**Production URL**: _________________

---

**🎉 Ready to launch!**

Remember: Start with test transactions, monitor closely, and scale gradually!
