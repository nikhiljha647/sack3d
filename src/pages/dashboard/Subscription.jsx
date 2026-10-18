import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import StripePayment from '../../components/StripePayment';

const PLAN_DATA = [
  {
    slug: 'free',
    name: 'Free',
    tagline: 'Try out 3d and AR sharing solo',
    price_inr: 0,
    coins_mo: '30',
    storage: '1 GB',
    cad_revisions: '1 free, 3 max',
    features: [
      '100 bonus coins on signup',
      '30 coins/month allowance',
      '1 free CAD revision per model, then 10 coins',
      'Public sharing and QR links',
      'Community support'
    ]
  },
  {
    slug: 'creator',
    name: 'Creator',
    tagline: 'Solo freelancers and photographers',
    price_inr: 299,
    is_popular: true,
    coins_mo: '300',
    storage: '10 GB',
    cad_revisions: '5/mo, 10 max',
    features: [
      '1 workspace, 1 login (solo)',
      '25 active AR models',
      '+20 coins/day (capped at 60/mo)',
      'Private and public sharing',
      'Coin top-ups, email support'
    ]
  },
  {
    slug: 'business',
    name: 'Business',
    tagline: 'Teams of 3+ logins, shared workspace',
    price_inr: 799,
    coins_mo: '1,000',
    storage: '50 GB',
    cad_revisions: '30/mo, 15 max',
    features: [
      '1 workspace, up to 10 invited logins',
      'Shared coin pool and storage',
      '100 active AR models',
      '+20 coins/day (capped at 200/mo)',
      'Free CAD revisions (30/month included)',
      'Priority processing and support'
    ]
  }
];

export default function Subscription() {
  const { user, business, context, refreshContext } = useAuth();
  const { success, error, info } = useToast();
  const [plans, setPlans] = useState([]);
  const [subscribing, setSubscribing] = useState(false);
  const [verifyingStripe, setVerifyingStripe] = useState(false);
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [stripePaymentData, setStripePaymentData] = useState(null);

  useEffect(() => {
    api.getPlans().then(setPlans).catch(console.warn);

    // Check for return from Stripe checkout
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const isSuccess = params.get('success');
    const isCanceled = params.get('canceled');

    if (isCanceled) {
      if (info) info('Payment was canceled.');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (sessionId && isSuccess === 'true') {
      const verify = async () => {
        setVerifyingStripe(true);
        try {
          const res = await api.verifyStripeSession(sessionId);
          confetti({ particleCount: 100, spread: 70 });
          success(res.message || 'Subscription successfully activated via Stripe!');
          await refreshContext();
        } catch (err) {
          console.error('[Stripe Verify Error]:', err);
          error(err.message || 'Failed to verify Stripe checkout session');
        } finally {
          setVerifyingStripe(false);
          window.history.replaceState({}, '', window.location.pathname);
        }
      };
      verify();
    }
  }, []);

  const handleUpgrade = async (planSlug) => {
    // If not free, open Stripe checkout modal
    if (planSlug !== 'free') {
      const planData = {
        creator: { id: 'creator', name: 'Creator Plan', price: 299 },
        business: { id: 'business', name: 'Business Plan', price: 799 }
      };

      if (planData[planSlug]) {
        setStripePaymentData(planData[planSlug]);
        setShowStripeModal(true);
        return;
      }
    }

    setSubscribing(true);
    try {
      const res = await api.subscribePlan(planSlug);
      confetti({ particleCount: 90, spread: 70 });
      success(res.message || `Switched to ${planSlug}!`);
      await refreshContext();
    } catch (err) {
      error(err.message || 'Subscription change failed');
    } finally {
      setSubscribing(false);
    }
  };

  const currentSlug = context?.plan?.plan_slug || 'free';

  const displayPlans = PLAN_DATA.map((def) => {
    const apiPlan = plans.find((p) => p.slug === def.slug);
    if (!apiPlan) return def;
    let parsedFeatures = def.features;
    if (apiPlan.features) {
      try {
        const f = typeof apiPlan.features === 'string' ? JSON.parse(apiPlan.features) : apiPlan.features;
        if (Array.isArray(f) && f.length > 0) parsedFeatures = f;
      } catch (e) {
        // fallback to def.features
      }
    }
    return {
      ...def,
      ...apiPlan,
      name: apiPlan.name || def.name,
      tagline: apiPlan.tagline || def.tagline,
      price_inr: apiPlan.price_inr !== undefined ? apiPlan.price_inr : def.price_inr,
      coins_mo: apiPlan.monthly_coins ? (apiPlan.monthly_coins >= 1000 ? apiPlan.monthly_coins.toLocaleString() : String(apiPlan.monthly_coins)) : def.coins_mo,
      storage: apiPlan.storage_text || def.storage,
      cad_revisions: apiPlan.cad_revisions_text || def.cad_revisions,
      features: parsedFeatures
    };
  });

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.9rem', marginBottom: '4px' }}>Workspace Subscription</h1>
        <p style={{ color: '#64748b', fontSize: '0.92rem' }}>
          Manage your organization plan tier, monthly coin credits, storage quotas, and team seats.
        </p>
      </div>

      {/* Current Active Plan Card */}
      <div className="card" style={{ padding: '28px', marginBottom: '36px', background: 'linear-gradient(135deg, #f5f3ff 0%, #ffffff 100%)', border: '2px solid #e9d5ff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', marginBottom: '4px' }}>
              Current Active Plan
            </div>
            <h2 style={{ fontSize: '1.8rem', color: '#0f172a', marginBottom: '4px' }}>
              {context?.plan?.plan_name || 'Free'} Plan
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#475569' }}>
              Includes {context?.plan?.monthly_coins || 60} coins/month, {((context?.plan?.plan_storage_limit || 1073741824) / (1024 * 1024 * 1024)).toFixed(0)} GB storage, and {context?.plan?.active_ar_models_limit || 10} active AR models.
            </p>
          </div>
          <span className="badge badge-success" style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
            Active Subscription
          </span>
        </div>
      </div>

      {/* Plans Comparison Grid (Free, Creator, Business) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
        gap: '24px',
        alignItems: 'stretch'
      }}>
        {displayPlans.map((p) => {
          const isCurrent = p.slug === currentSlug;
          const isCreator = p.slug === 'creator';

          return (
            <div
              key={p.slug}
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                border: isCurrent
                  ? '2px solid #8b5cf6'
                  : (isCreator ? '2px solid #8b5cf6' : '1px solid #e2e8f0'),
                padding: '36px 28px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                boxShadow: isCurrent
                  ? '0 8px 24px rgba(37, 99, 235, 0.12)'
                  : (isCreator ? '0 10px 30px rgba(234, 88, 12, 0.1)' : '0 4px 16px rgba(0, 0, 0, 0.03)'),
                transform: isCreator ? 'scale(1.02)' : 'none',
                zIndex: isCreator ? 1 : 0
              }}
            >
              {/* Creator: Most popular badge */}
              {isCreator && (
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
                  boxShadow: '0 2px 6px rgba(234, 88, 12, 0.3)',
                  whiteSpace: 'nowrap'
                }}>
                  Most popular
                </div>
              )}

              {/* Card Header */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    {p.name}
                  </h3>
                  {isCurrent && (
                    <span style={{
                      background: '#f5f3ff',
                      color: '#8b5cf6',
                      border: '1px solid #e9d5ff',
                      padding: '3px 12px',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}>
                      Current
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '18px' }}>
                  {p.tagline}
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                  <span style={{ fontSize: '2.8rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>₹{p.price_inr}</span>
                  <span style={{ fontSize: '0.95rem', color: '#64748b', fontWeight: 500 }}>/mo</span>
                </div>
              </div>

              {/* Metric Badges */}
              <div style={{ marginBottom: '28px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{
                    background: isCreator ? '#faf5ff' : '#f8fafc',
                    padding: '12px 14px',
                    borderRadius: '12px'
                  }}>
                    <div style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: isCreator ? '#8b5cf6' : '#94a3b8',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}>
                      COINS/MO
                    </div>
                    <div style={{
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: isCreator ? '#8b5cf6' : '#0f172a',
                      marginTop: '2px'
                    }}>
                      {p.coins_mo}
                    </div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      STORAGE
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                      {p.storage}
                    </div>
                  </div>
                </div>
                <div style={{
                  background: isCreator ? '#faf5ff' : '#f8fafc',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: isCreator ? '#8b5cf6' : '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}>
                    CAD REVISIONS
                  </span>
                  <span style={{
                    fontSize: '0.92rem',
                    fontWeight: 600,
                    color: isCreator ? '#8b5cf6' : '#0f172a'
                  }}>
                    {p.cad_revisions}
                  </span>
                </div>
              </div>

              {/* Feature Checklist */}
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                {p.features.map((feat, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.92rem', color: '#334155' }}>
                    <span style={{
                      width: '13px',
                      height: '13px',
                      border: `1.5px solid ${isCreator ? '#c4b5fd' : '#cbd5e1'}`,
                      borderRadius: '3px',
                      flexShrink: 0,
                      marginTop: '3px'
                    }} />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              {/* Action Button */}
              {isCurrent ? (
                <button
                  disabled
                  style={{
                    width: '100%',
                    padding: '13px 20px',
                    borderRadius: '12px',
                    background: '#f8fafc',
                    border: '1.5px solid #cbd5e1',
                    color: '#64748b',
                    fontSize: '0.96rem',
                    fontWeight: 600,
                    cursor: 'not-allowed'
                  }}
                >
                  Current Plan
                </button>
              ) : isCreator ? (
                <button
                  onClick={() => handleUpgrade('creator')}
                  disabled={subscribing}
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
                    boxShadow: '0 4px 12px rgba(234, 88, 12, 0.3)',
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
                  {subscribing ? 'Switching...' : 'Switch to Creator'}
                </button>
              ) : (
                <button
                  onClick={() => handleUpgrade(p.slug)}
                  disabled={subscribing}
                  style={{
                    width: '100%',
                    padding: '13px 20px',
                    borderRadius: '12px',
                    background: '#4f46e5',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.96rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#4338ca';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#4f46e5';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {subscribing ? 'Switching...' : `Switch to ${p.name}`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {verifyingStripe && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          background: '#8b5cf6',
          color: '#ffffff',
          padding: '14px 20px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(139, 92, 246, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 10000,
          fontWeight: 600
        }}>
          <div style={{
            width: '16px',
            height: '16px',
            border: '2px solid #ffffff',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          Confirming Stripe Payment & Activating Plan...
        </div>
      )}

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
