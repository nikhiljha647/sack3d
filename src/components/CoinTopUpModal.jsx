import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Coins,
  Sparkles,
  CheckCircle2,
  X,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Gift,
  Zap,
  Check,
  Loader2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function CoinTopUpModal({
  isOpen,
  onClose,
  requiredCoins = 25,
  currentCoins = null,
  actionTitle = 'Upload 3D Model',
  onSuccess
}) {
  const { wallet, refreshContext } = useAuth();
  const { success, error } = useToast();

  const [packages, setPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [purchasingPkgId, setPurchasingPkgId] = useState(null);
  const [dailyBonus, setDailyBonus] = useState(null);
  const [claimingBonus, setClaimingBonus] = useState(false);
  const [purchaseSuccessData, setPurchaseSuccessData] = useState(null);

  const activeCoins = currentCoins !== null ? currentCoins : (wallet?.totalBalance || 0);
  const coinsNeeded = Math.max(0, requiredCoins - activeCoins);
  const hasEnoughCoins = activeCoins >= requiredCoins;

  // Load packages and daily bonus info when modal is open
  useEffect(() => {
    if (!isOpen) {
      setPurchaseSuccessData(null);
      return;
    }

    const loadData = async () => {
      setLoadingPackages(true);
      try {
        const [pkgs, walletRes] = await Promise.all([
          api.getCoinPackages().catch(() => []),
          api.getWallet().catch(() => null)
        ]);
        if (pkgs && pkgs.length > 0) {
          // Sort packages by sort_order or coin_amount
          const sorted = [...pkgs].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.coin_amount - b.coin_amount);
          setPackages(sorted);
        }
        if (walletRes?.dailyBonus) {
          setDailyBonus(walletRes.dailyBonus);
        }
      } catch (err) {
        console.warn('Failed to load packages in TopUpModal:', err);
      } finally {
        setLoadingPackages(false);
      }
    };

    loadData();
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // When user already has enough coins and didn't just complete a purchase, automatically dismiss
  useEffect(() => {
    if (isOpen && hasEnoughCoins && !purchaseSuccessData) {
      onClose();
    }
  }, [isOpen, hasEnoughCoins, purchaseSuccessData, onClose]);

  if (!isOpen) return null;

  // Never render the top-up modal if the user already has enough coins
  if (hasEnoughCoins && !purchaseSuccessData) {
    return null;
  }

  // Claim Daily Login Bonus Shortcut
  const handleClaimDailyBonus = async () => {
    setClaimingBonus(true);
    try {
      const res = await api.claimDailyBonus();
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      success(res.message || 'Daily login bonus claimed!');
      await refreshContext();

      // Refresh local wallet info
      const updatedWallet = await api.getWallet().catch(() => null);
      if (updatedWallet?.dailyBonus) {
        setDailyBonus(updatedWallet.dailyBonus);
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      error(err.message || 'Could not claim daily bonus');
    } finally {
      setClaimingBonus(false);
    }
  };

  // Purchase Coin Top-up Package via Stripe Checkout
  const handleBuyPackage = async (pkg) => {
    setPurchasingPkgId(pkg.id);
    try {
      const returnPath = window.location.pathname || '/dashboard/wallet';
      const checkout = await api.createCoinCheckout({
        packageId: pkg.id,
        returnUrl: returnPath
      });

      if (checkout?.url) {
        // Redirect user directly to Stripe Checkout payment page
        window.location.href = checkout.url;
        return;
      }

      throw new Error('Unable to create checkout session');
    } catch (err) {
      console.error('[Coin Purchase Error]:', err);
      error(err.message || 'Payment initiation failed. Please try again.');
    } finally {
      setPurchasingPkgId(null);
    }
  };

  return createPortal(
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-content"
        style={{
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
          border: '1px solid #e2e8f0',
          position: 'relative',
          padding: 0
        }}
      >
        {/* Header Gradient */}
        <div
          style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 60%, #9333ea 100%)',
            padding: '28px 32px 24px 32px',
            color: '#ffffff',
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            position: 'relative'
          }}
        >
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)')}
          >
            <X size={20} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
              }}
            >
              <Coins size={26} color="#fbbf24" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                Top Up Coins
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#e0e7ff' }}>
                Instant coins to convert, optimize, and publish 3D CAD assets
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: 'clamp(16px, 4vw, 32px)' }}>
          {/* Success State View */}
          {purchaseSuccessData ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  background: '#ecfdf5',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                  border: '2px solid #a7f3d0'
                }}
              >
                <CheckCircle2 size={38} />
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                Coins Successfully Added!
              </h3>
              <p style={{ color: '#475569', fontSize: '0.95rem', maxWidth: '480px', margin: '0 auto 20px auto' }}>
                Added <strong>+{purchaseSuccessData.coinsAdded} Coins</strong> ({purchaseSuccessData.pkgName}) to your wallet ledger.
              </p>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '16px 24px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '20px',
                  marginBottom: '28px'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>New Total Balance</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#7c3aed' }}>
                    {purchaseSuccessData.newBalance} <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Coins</span>
                  </div>
                </div>
                <div style={{ width: '1px', height: '40px', background: '#cbd5e1' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Required for Action</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' }}>
                    {requiredCoins} <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Coins</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-primary"
                  style={{
                    padding: '12px 28px',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <span>Continue with {actionTitle}</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Balance Summary Card */}
              <div
                style={{
                  background: hasEnoughCoins ? '#f0fdf4' : '#fff1f2',
                  border: `1px solid ${hasEnoughCoins ? '#bbf7d0' : '#fecdd3'}`,
                  borderRadius: '14px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '24px',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: hasEnoughCoins ? '#dcfce7' : '#ffe4e6',
                      color: hasEnoughCoins ? '#16a34a' : '#e11d48',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    {hasEnoughCoins ? <Check size={22} /> : <AlertCircle size={22} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: hasEnoughCoins ? '#166534' : '#9f1239' }}>
                      {hasEnoughCoins
                        ? `You have enough coins for ${actionTitle.toLowerCase()}`
                        : `Insufficient Coins to ${actionTitle}`}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: hasEnoughCoins ? '#15803d' : '#be123c', marginTop: '2px' }}>
                      {hasEnoughCoins ? (
                        <>You currently have <strong>{activeCoins} Coins</strong> ({requiredCoins} coins needed).</>
                      ) : (
                        <>You have <strong>{activeCoins} Coins</strong>. You need <strong>{coinsNeeded} more coins</strong> ({requiredCoins} required).</>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    background: hasEnoughCoins ? '#dcfce7' : '#ffe4e6',
                    color: hasEnoughCoins ? '#166534' : '#9f1239',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Coins size={15} />
                  <span>Cost: {requiredCoins} Coins</span>
                </div>
              </div>

              {/* Free Daily Bonus Banner (If Available) */}
              {dailyBonus && dailyBonus.canClaimNow && (
                <div
                  style={{
                    background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
                    border: '1px solid #a7f3d0',
                    borderRadius: '14px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    marginBottom: '24px',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.08)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: '#d1fae5',
                        color: '#059669',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <Gift size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#065f46' }}>
                        Free Daily Login Bonus Available!
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#047857' }}>
                        Claim +{dailyBonus.dailyAmount} free coins right now without paying.
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleClaimDailyBonus}
                    disabled={claimingBonus}
                    className="btn btn-sm"
                    style={{
                      background: '#059669',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    {claimingBonus ? (
                      <>
                        <Loader2 size={15} className="spinner" />
                        <span>Claiming...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={15} />
                        <span>Claim +{dailyBonus.dailyAmount} Coins Free</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Coin Packages Section */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Select Top-up Package
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Coins never expire • Instant ledger credit
                  </span>
                </div>

                {loadingPackages ? (
                  <div style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                    <Loader2 size={28} className="spinner" style={{ margin: '0 auto 8px auto', color: '#8b5cf6' }} />
                    <p style={{ fontSize: '0.88rem' }}>Loading top-up packages...</p>
                  </div>
                ) : packages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    No packages currently available. Please contact support.
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '16px'
                    }}
                  >
                    {packages.map((pkg) => {
                      const basePrice = pkg.price_inr;
                      const gstPercent = pkg.gst_percentage || 18;
                      const gst = Math.round(basePrice * (gstPercent / 100));
                      const total = basePrice + gst;
                      const isPopular = pkg.is_popular === 1 || pkg.is_popular === true || pkg.coin_amount === 300;
                      const uploadsCovered = Math.floor(pkg.coin_amount / requiredCoins);
                      const isPurchasing = purchasingPkgId === pkg.id;

                      return (
                        <div
                          key={pkg.id}
                          style={{
                            background: isPopular ? 'linear-gradient(180deg, #fbfbfe 0%, #ffffff 100%)' : '#ffffff',
                            border: isPopular ? '2px solid #8b5cf6' : '1px solid #e2e8f0',
                            borderRadius: '16px',
                            padding: '20px',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                            transition: 'all 0.2s',
                            boxShadow: isPopular ? '0 10px 25px -5px rgba(139, 92, 246, 0.15)' : 'none'
                          }}
                        >
                          {/* Popular Tag */}
                          {isPopular && (
                            <div
                              style={{
                                position: 'absolute',
                                top: '-11px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: 'linear-gradient(135deg, #7c3aed, #9333ea)',
                                color: '#ffffff',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                                padding: '3px 12px',
                                borderRadius: '12px',
                                boxShadow: '0 2px 8px rgba(124, 58, 237, 0.4)'
                              }}
                            >
                              Most Popular
                            </div>
                          )}

                          {/* Coins Badge */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              marginBottom: '6px',
                              marginTop: isPopular ? '4px' : '0'
                            }}
                          >
                            <Coins size={22} color="#8b5cf6" />
                            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
                              {pkg.coin_amount}
                            </span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Coins</span>
                          </div>

                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#7c3aed', marginBottom: '10px' }}>
                            {pkg.name}
                          </div>

                          {/* Price */}
                          <div style={{ marginBottom: '4px' }}>
                            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                              ₹{basePrice}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '14px' }}>
                            + {gstPercent}% GST (₹{gst}) = <strong>₹{total}</strong>
                          </div>

                          {/* Value Tag */}
                          <div
                            style={{
                              fontSize: '0.74rem',
                              color: '#059669',
                              fontWeight: 600,
                              background: '#ecfdf5',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              marginBottom: '16px'
                            }}
                          >
                            {uploadsCovered > 0
                              ? `Supports ~${uploadsCovered} model upload${uploadsCovered > 1 ? 's' : ''}`
                              : `Supports ${pkg.coin_amount} coins`}
                          </div>

                          {/* Buy Button */}
                          <button
                            type="button"
                            onClick={() => handleBuyPackage(pkg)}
                            disabled={purchasingPkgId !== null}
                            className={`btn ${isPopular ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                            style={{
                              width: '100%',
                              marginTop: 'auto',
                              fontWeight: 700,
                              padding: '9px 12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            {isPurchasing ? (
                              <>
                                <Loader2 size={15} className="spinner" />
                                <span>Redirecting to Checkout...</span>
                              </>
                            ) : (
                              <>
                                <CreditCard size={15} />
                                <span>Purchase ₹{total}</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer Trust Notes & Dismiss */}
              <div
                style={{
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.78rem' }}>
                  <ShieldCheck size={16} color="#10b981" />
                  <span>Secure 256-bit encrypted checkout via Stripe & UPI • Tax invoice provided</span>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-ghost btn-sm"
                  style={{ color: '#64748b', fontSize: '0.82rem' }}
                >
                  Maybe Later
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
