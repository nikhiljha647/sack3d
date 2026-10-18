import React, { useState, useEffect } from 'react';
import {
  Coins, ArrowDownLeft, ArrowUpRight, Gift, Sparkles,
  CreditCard, ShieldCheck, Clock, CheckCircle2, History
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function Wallet({ setCurrentTab }) {
  const { wallet, refreshContext } = useAuth();
  const { success, error, info } = useToast();

  const [walletDetails, setWalletDetails] = useState(null);
  const [packages, setPackages] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const fetchWalletData = async () => {
    try {
      const [wData, pkgs, txs] = await Promise.all([
        api.getWallet(),
        api.getCoinPackages(),
        api.getTransactions(10)
      ]);
      setWalletDetails(wData);
      setPackages(pkgs);
      setTransactions(txs);
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();

    // Check for return from Stripe coin purchase
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const isSuccess = params.get('success');
    const isCanceled = params.get('canceled');

    if (isCanceled) {
      if (info) info('Coin purchase was canceled.');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (sessionId && isSuccess === 'true') {
      const verify = async () => {
        try {
          const res = await api.verifyStripeSession(sessionId);
          confetti({ particleCount: 120, spread: 80 });
          success(res.message || 'Coins credited to wallet via Stripe!');
          await refreshContext();
          await fetchWalletData();
        } catch (err) {
          console.error('[Stripe Coin Verify Error]:', err);
          error(err.message || 'Failed to verify coin checkout');
        } finally {
          window.history.replaceState({}, '', window.location.pathname);
        }
      };
      verify();
    }
  }, []);

  const handleClaimDailyBonus = async () => {
    setClaiming(true);
    try {
      const res = await api.claimDailyBonus();
      confetti({ particleCount: 80, spread: 60 });
      success(res.message || 'Daily bonus claimed successfully!');
      await refreshContext();
      await fetchWalletData();
    } catch (err) {
      error(err.message || 'Could not claim daily bonus');
    } finally {
      setClaiming(false);
    }
  };

  const handleBuyPackage = async (pkgId) => {
    setBuying(true);
    try {
      // Create Stripe checkout session for coin package
      const checkout = await api.createCoinCheckout({ packageId: pkgId, returnUrl: '/dashboard/wallet' });
      if (checkout?.url) {
        window.location.href = checkout.url;
        return;
      }
      throw new Error('Unable to create payment session');
    } catch (err) {
      error(err.message || 'Payment initiation failed');
    } finally {
      setBuying(false);
    }
  };

  if (loading) {
    return <div style={{ color: '#64748b' }}>Loading wallet & coin ledger...</div>;
  }

  const daily = walletDetails?.dailyBonus;

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.9rem', marginBottom: '4px' }}>Coin Wallet & Accounting</h1>
        <p style={{ color: '#64748b', fontSize: '0.92rem' }}>
          Dual-account wallet separating monthly subscription allowance from purchased top-up coins.
        </p>
      </div>

      {/* Main Balances Grid */}
      <div className="packages-grid-3" style={{ marginBottom: '32px' }}>
        {/* Total Balance */}
        <div className="card" style={{ padding: '26px', background: 'linear-gradient(135deg, #5b21b6, #7c3aed)', color: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#c4b5fd', textTransform: 'uppercase' }}>
              Total Available Balance
            </span>
            <Coins size={22} color="#c4b5fd" />
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '4px' }}>
            {wallet.totalBalance || 0} <span style={{ fontSize: '1rem', fontWeight: 500 }}>Coins</span>
          </div>
          <div style={{ fontSize: '0.82rem', color: '#e9d5ff' }}>
            Good for <strong>{Math.floor((wallet.totalBalance || 0) / 25)} model uploads</strong> (25 coins each)
          </div>
        </div>

        {/* Subscription Balance */}
        <div className="card" style={{ padding: '26px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Subscription Coins
            </span>
            <div style={{ padding: '6px', background: '#f5f3ff', borderRadius: '8px', color: '#8b5cf6' }}>
              <Coins size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
            {wallet.subscriptionBalance || 0}
          </div>
          <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Granted via {walletDetails?.plan || 'Free'} monthly plan
          </div>
        </div>

        {/* Purchased Balance */}
        <div className="card" style={{ padding: '26px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Purchased Coins
            </span>
            <div style={{ padding: '6px', background: '#f5f3ff', borderRadius: '8px', color: '#7c3aed' }}>
              <Sparkles size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
            {wallet.purchasedBalance || 0}
          </div>
          <div style={{ fontSize: '0.82rem', color: '#10b981', fontWeight: 600 }}>
            Never expires • Carries over indefinitely
          </div>
        </div>
      </div>

      {/* Free Plan Daily Bonus Card (Section 10 Requirements: +20 coins/day capped at 60/mo) */}
      {daily?.isEligible && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '24px 28px',
          marginBottom: '32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#ecfdf5',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Gift size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '2px' }}>Daily Login Bonus</h3>
              <p style={{ fontSize: '0.84rem', color: '#64748b' }}>
                Claim +{daily.dailyAmount} coins daily. Claimed: {daily.claimedThisMonth} / {daily.monthlyCap} coins this month.
              </p>
            </div>
          </div>

          <div>
            {daily.canClaimNow ? (
              <button
                onClick={handleClaimDailyBonus}
                disabled={claiming}
                className="btn btn-primary"
              >
                <Sparkles size={16} />
                <span>{claiming ? 'Claiming...' : `Claim +${daily.dailyAmount} Coins`}</span>
              </button>
            ) : daily.claimedThisMonth >= daily.monthlyCap ? (
              <span className="badge badge-neutral">Monthly Cap Reached ({daily.monthlyCap} coins)</span>
            ) : (
              <span className="badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={14} />
                <span>Next bonus in {daily.nextAvailableInHours} hours</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Coin Top-up Packages Grid */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ fontSize: '1.3rem', marginBottom: '16px' }}>Top-up Coin Packages</h3>
        <div className="packages-grid-3">
          {packages.map((pkg) => {
            const basePrice = pkg.price_inr;
            const gst = Math.round(basePrice * (pkg.gst_percentage / 100));
            const total = basePrice + gst;
            return (
              <div key={pkg.id} className="card" style={{ padding: '24px', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                  <Coins size={24} color="#8b5cf6" />
                  <span>{pkg.coin_amount} Coins</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#8b5cf6', fontWeight: 600, marginBottom: '12px' }}>{pkg.name}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '2px' }}>₹{basePrice}</div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '18px' }}>
                  + 18% GST (₹{gst}) = ₹{total}
                </div>
                <button
                  onClick={() => handleBuyPackage(pkg.id)}
                  disabled={buying}
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%' }}
                >
                  Buy Package
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Ledger Snippet */}
      <div className="card">
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '18px 24px',
          borderBottom: '1px solid #e2e8f0'
        }}>
          <h3 style={{ fontSize: '1.15rem' }}>Recent Ledger Transactions</h3>
          <button onClick={() => setCurrentTab('transactions')} style={{ color: '#8b5cf6', fontSize: '0.85rem', fontWeight: 600 }}>
            View Full Ledger ({transactions.length})
          </button>
        </div>
        <div style={{ padding: '8px 0' }}>
          {transactions.map((tx) => (
            <div
              key={tx.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 24px',
                borderBottom: '1px solid #f1f5f9'
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>
                  {tx.description}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {new Date(tx.created_at).toLocaleString()} • Source: {tx.coin_source}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: tx.amount > 0 ? '#10b981' : '#ef4444' }}>
                  {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Balance: {tx.balance_after}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
