import React, { useState, useEffect } from 'react';
import { CheckCircle2, Coins, Shield, Sparkles, ArrowRight, Zap, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import StripePayment from '../components/StripePayment';

export default function Pricing({ setCurrentView }) {
  const { user, business, refreshContext } = useAuth();
  const { success, error, info } = useToast();
  const [plans, setPlans] = useState([]);
  const [packages, setPackages] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [stripePaymentData, setStripePaymentData] = useState(null);

  useEffect(() => {
    api.getPlans().then(setPlans).catch(console.warn);
    api.getCoinPackages().then(setPackages).catch(console.warn);

    const params = new URLSearchParams(window.location.search);
    if (params.get('canceled') === 'true') {
      if (info) info('Payment was canceled.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const triggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const handleSubscribe = async (planSlug) => {
    console.log('[handleSubscribe] Called with planSlug:', planSlug);
    console.log('[handleSubscribe] User:', user);
    
    if (!user) {
      setCurrentView('login');
      return;
    }

    // Open Stripe payment modal for Creator and Business plans
    if (planSlug !== 'free') {
      const planData = {
        creator: { id: 'creator', name: 'Creator Plan', price: 299 },
        business: { id: 'business', name: 'Business Plan', price: 799 }
      };

      console.log('[handleSubscribe] Opening Stripe modal with:', planData[planSlug]);
      setStripePaymentData(planData[planSlug]);
      setShowStripeModal(true);
      return;
    }

    // Handle free plan subscription (no payment needed)
    setProcessing(true);
    try {
      const res = await api.subscribePlan(planSlug);
      triggerConfetti();
      success(res.message || `Subscribed to ${planSlug}!`);
      await refreshContext();
      setSelectedPlan(null);
    } catch (err) {
      error(err.message || 'Subscription failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleBuyCoins = async (packageId) => {
    if (!user) {
      setCurrentView('login');
      return;
    }
    setProcessing(true);
    try {
      const res = await api.purchaseCoins(packageId);
      triggerConfetti();
      success(res.message || 'Coins credited to wallet!');
      await refreshContext();
      setSelectedPackage(null);
    } catch (err) {
      error(err.message || 'Coin purchase failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="section-spacer">
      <div className="container">
        {/* Header */}
        <div className="section-header">
          <div className="section-badge">Pricing & Coin Packages</div>
          <h1 className="section-title">Transparent Plans for Every Business</h1>
          <p className="section-subtitle">
            Strictly three straightforward plans. Flat 25 coins per 3D model upload and WebAR conversion. No hidden enterprise gating.
          </p>
        </div>

        {/* 1. Subscription Plans (Free ₹0, Creator ₹299 [Most Popular], Business ₹799) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
          gap: '24px',
          maxWidth: '1120px',
          margin: '0 auto 72px auto',
          alignItems: 'stretch'
        }}>
          {/* FREE */}
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            padding: 'clamp(22px, 4vw, 36px) clamp(16px, 3vw, 28px)',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)'
          }}>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                Free
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '18px' }}>
                Try out 3d and AR sharing solo
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                <span style={{ fontSize: '2.8rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>₹0</span>
                <span style={{ fontSize: '0.95rem', color: '#64748b', fontWeight: 500 }}>/mo</span>
              </div>
            </div>

            {/* Metric Badges */}
            <div style={{ marginBottom: '28px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>COINS/MO</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>30</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>STORAGE</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>1 GB</div>
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>FILE UPDATES</span>
                <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0f172a' }}>1 free, then 10 coins</span>
              </div>
            </div>

            {/* Feature Checklist */}
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
              {[
                '100 bonus coins on signup',
                '30 coins/month allowance',
                '1 free file update, then 10 coins each',
                'Public sharing and QR links',
                'Community support'
              ].map((feat, idx) => (
                <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.92rem', color: '#334155' }}>
                  <span style={{ width: '13px', height: '13px', border: '1.5px solid #cbd5e1', borderRadius: '3px', flexShrink: 0, marginTop: '3px' }} />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => setCurrentView('register')}
              style={{
                width: '100%',
                padding: '13px 20px',
                borderRadius: '12px',
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                color: '#1e293b',
                fontSize: '0.96rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#94a3b8';
                e.currentTarget.style.background = '#f8fafc';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.background = '#ffffff';
              }}
            >
              Start free
            </button>
          </div>

          {/* CREATOR (MOST POPULAR) */}
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '2px solid #8b5cf6',
            padding: 'clamp(22px, 4vw, 36px) clamp(16px, 3vw, 28px)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            boxShadow: '0 10px 30px rgba(139, 92, 246, 0.1)',
            transform: 'scale(1.02)',
            zIndex: 1
          }}>
            {/* Most popular badge */}
            <div style={{
              position: 'absolute',
              top: '-13px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#8b5cf6',
              color: '#ffffff',
              padding: '3px 16px',
              borderRadius: '9999px',
              fontSize: '0.78rem',
              fontWeight: 700,
              boxShadow: '0 2px 6px rgba(139, 92, 246, 0.3)'
            }}>
              Most popular
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                Creator
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '18px' }}>
                Solo freelancers and photographers
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                <span style={{ fontSize: '2.8rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>₹299</span>
                <span style={{ fontSize: '0.95rem', color: '#64748b', fontWeight: 500 }}>/mo</span>
              </div>
            </div>

            {/* Metric Badges (Tinted light purple) */}
            <div style={{ marginBottom: '28px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ background: '#faf5ff', padding: '12px 14px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.04em' }}>COINS/MO</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#8b5cf6', marginTop: '2px' }}>300</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>STORAGE</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>10 GB</div>
                </div>
              </div>
              <div style={{ background: '#faf5ff', padding: '10px 14px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.04em' }}>FILE UPDATES</span>
                <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#8b5cf6' }}>5 free/month</span>
              </div>
            </div>

            {/* Feature Checklist */}
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
              {[
                '1 workspace, 1 login (solo)',
                '25 active AR models',
                '+20 coins/day (capped at 60/mo)',
                'Private and public sharing',
                'Coin top-ups, email support'
              ].map((feat, idx) => (
                <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.92rem', color: '#334155' }}>
                  <span style={{ width: '13px', height: '13px', border: '1.5px solid #c4b5fd', borderRadius: '3px', flexShrink: 0, marginTop: '3px' }} />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSubscribe('creator')}
              disabled={processing}
              style={{
                width: '100%',
                padding: '13px 20px',
                borderRadius: '12px',
                background: '#8b5cf6',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.96rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#7c3aed';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#8b5cf6';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Subscribe to Creator
            </button>
          </div>

          {/* BUSINESS */}
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            padding: 'clamp(22px, 4vw, 36px) clamp(16px, 3vw, 28px)',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)'
          }}>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                Business
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '18px' }}>
                Teams of 3+ logins, shared workspace
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                <span style={{ fontSize: '2.8rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>₹799</span>
                <span style={{ fontSize: '0.95rem', color: '#64748b', fontWeight: 500 }}>/mo</span>
              </div>
            </div>

            {/* Metric Badges */}
            <div style={{ marginBottom: '28px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>COINS/MO</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>1,000</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>STORAGE</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>50 GB</div>
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>FILE UPDATES</span>
                <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0f172a' }}>30 free/month</span>
              </div>
            </div>

            {/* Feature Checklist */}
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
              {[
                '1 workspace, up to 10 invited logins',
                'Shared coin pool and storage',
                '100 active AR models',
                '+20 coins/day (capped at 200/mo)',
                'Unlimited file updates included',
                'Priority processing and support'
              ].map((feat, idx) => (
                <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.92rem', color: '#334155' }}>
                  <span style={{ width: '13px', height: '13px', border: '1.5px solid #cbd5e1', borderRadius: '3px', flexShrink: 0, marginTop: '3px' }} />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSubscribe('business')}
              disabled={processing}
              style={{
                width: '100%',
                padding: '13px 20px',
                borderRadius: '12px',
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                color: '#1e293b',
                fontSize: '0.96rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#94a3b8';
                e.currentTarget.style.background = '#f8fafc';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.background = '#ffffff';
              }}
            >
              Subscribe to Business
            </button>
          </div>
        </div>

        {/* 2. COIN TOP-UP PACKAGES (SECTION 11) */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '20px',
          padding: 'clamp(20px, 4vw, 40px)',
          boxShadow: 'var(--shadow-card)',
          marginBottom: '56px'
        }}>
          <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 36px auto' }}>
            <div className="section-badge">Coin Top-Ups</div>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Need Extra Upload Coins?</h2>
            <p style={{ fontSize: '0.95rem', color: '#64748b' }}>
              Purchased coins never expire and can be used anytime for extra model uploads (25 coins each) or CAD revisions.
            </p>
          </div>

          <div className="packages-grid-3">
            {packages.map((pkg) => {
              const basePrice = pkg.price_inr;
              const gst = Math.round(basePrice * (pkg.gst_percentage / 100));
              const total = basePrice + gst;
              return (
                <div
                  key={pkg.id}
                  style={{
                    border: pkg.is_popular ? '2px solid #8b5cf6' : '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '28px',
                    background: pkg.is_popular ? '#f5f3ff' : '#f8fafc',
                    textAlign: 'center',
                    position: 'relative'
                  }}
                >
                  {pkg.is_popular ? (
                    <div style={{
                      position: 'absolute',
                      top: '-12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: '#8b5cf6',
                      color: '#fff',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '3px 12px',
                      borderRadius: '20px'
                    }}>
                      Popular Value
                    </div>
                  ) : null}

                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '2rem', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>
                    <Coins size={28} color="#8b5cf6" />
                    <span>{pkg.coin_amount}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#8b5cf6', marginBottom: '14px' }}>{pkg.name}</div>

                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginBottom: '2px' }}>
                    ₹{basePrice}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '20px' }}>
                    + 18% GST (₹{gst}) = ₹{total}
                  </div>

                  <div style={{ fontSize: '0.82rem', color: '#475569', marginBottom: '16px' }}>
                    Good for <strong>{Math.floor(pkg.coin_amount / 25)} model uploads</strong>
                  </div>

                  <button
                    onClick={() => handleBuyCoins(pkg.id)}
                    disabled={processing}
                    className={`btn ${pkg.is_popular ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                    style={{ width: '100%' }}
                  >
                    Buy {pkg.coin_amount} Coins
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. COIN LEDGER ARCHITECTURE EXPLANATION */}
        <div className="responsive-split-wide" style={{
          background: 'linear-gradient(135deg, rgba(37,99,235,0.04), rgba(124,58,237,0.04))',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: 'clamp(20px, 4vw, 32px)',
          alignItems: 'center'
        }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '10px' }}>Strict Ledger-Based Coin Accounting</h3>
            <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.6, marginBottom: '16px' }}>
              Unlike simplistic platforms that store a plain number, ModelAR maintains an audit-grade double-entry transaction ledger.
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.88rem', color: '#334155' }}>
              <li>• Separate accounts for <strong>Subscription Coins</strong> vs <strong>Purchased Coins</strong></li>
              <li>• Upload coins are deducted <strong>ONLY after conversion completes</strong></li>
              <li>• Zero charges if 3D geometry processing fails</li>
            </ul>
          </div>
          <div style={{
            background: '#ffffff',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid #cbd5e1',
            fontFamily: 'monospace',
            fontSize: '0.82rem'
          }}>
            <div style={{ color: '#10b981', marginBottom: '6px' }}>+100 Signup Bonus (Subscription)</div>
            <div style={{ color: '#10b981', marginBottom: '6px' }}>+300 Monthly Plan Allowance</div>
            <div style={{ color: '#ef4444', marginBottom: '6px' }}>-25 Model Upload (CP-400 Slurry Pump)</div>
            <div style={{ color: '#10b981', marginBottom: '6px' }}>+300 Purchased Pack (Never expires)</div>
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '6px', fontWeight: 'bold' }}>
              Balance: 675 Coins (375 Sub / 300 Pur)
            </div>
          </div>
        </div>
      </div>

      {/* Stripe Payment Modal */}
      {showStripeModal && stripePaymentData && (
        <StripePayment
          planId={stripePaymentData.id}
          planName={stripePaymentData.name}
          price={stripePaymentData.price}
          onClose={() => {
            setShowStripeModal(false);
            setStripePaymentData(null);
          }}
        />
      )}
    </div>
  );
}
