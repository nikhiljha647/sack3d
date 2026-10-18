import React, { useState, useEffect } from 'react';
import {
  Coins, HardDrive, Smartphone, Box, ArrowUpRight, ArrowDownLeft,
  Calendar, Eye, QrCode, Plus, CheckCircle2, ChevronRight
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function Overview({ setCurrentTab, setSelectedModelId, setCurrentView }) {
  const { user, business, wallet } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [recentModels, setRecentModels] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getDashboardAnalytics(),
      api.getMyModels('?limit=4'),
      api.getTransactions(5)
    ]).then(([ana, mods, txs]) => {
      setAnalytics(ana);
      setRecentModels(mods);
      setTransactions(txs);
    }).catch(console.warn).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ color: '#64748b' }}>Loading workspace dashboard metrics...</div>;
  }

  const storage = analytics?.storage || {};
  const totals = analytics?.totals || {};

  return (
    <div>
      {/* Top Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ fontSize: '1.9rem', marginBottom: '4px' }}>
            Welcome back, {user?.full_name?.split(' ')[0] || 'User'} 👋
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.92rem' }}>
            {business?.name} • Plan: <strong style={{ color: '#8b5cf6' }}>{analytics?.subscription?.planName || 'Free'}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setCurrentTab('upload')} className="btn btn-primary">
            <Plus size={16} />
            <span>Upload New 3D Model</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid-4" style={{ marginBottom: '32px' }}>
        {/* 1. Coin Balance Card */}
        <div className="card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>Available Coins</span>
            <div style={{ padding: '6px', background: '#f5f3ff', borderRadius: '8px', color: '#8b5cf6' }}>
              <Coins size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
            {wallet.totalBalance || 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
            {wallet.subscriptionBalance || 0} sub / {wallet.purchasedBalance || 0} purchased
          </div>
        </div>

        {/* 2. Storage Gauge */}
        <div className="card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>Storage Used</span>
            <div style={{ padding: '6px', background: '#f5f3ff', borderRadius: '8px', color: '#7c3aed' }}>
              <HardDrive size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
            {storage.totalUsedGB || '0'} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#64748b' }}>/ {storage.totalLimitGB} GB</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginTop: '6px' }}>
            <div style={{
              width: `${storage.percentage || 0}%`,
              height: '100%',
              background: (storage.percentage || 0) > 85 ? '#ef4444' : '#8b5cf6'
            }} />
          </div>
        </div>

        {/* 3. Active AR Models */}
        <div className="card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>Active AR Models</span>
            <div style={{ padding: '6px', background: '#ecfdf5', borderRadius: '8px', color: '#10b981' }}>
              <Smartphone size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
            {totals.activeArModels || 0} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#64748b' }}>/ {analytics?.subscription?.arLimit || 10}</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>
            {totals.totalArLaunches || 0} Total AR Launches
          </div>
        </div>

        {/* 4. Total QR Scans */}
        <div className="card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>Total QR Scans</span>
            <div style={{ padding: '6px', background: '#fffbeb', borderRadius: '8px', color: '#d97706' }}>
              <QrCode size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
            {totals.totalQrScans || 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
            {totals.totalViews || 0} WebGL 3D views
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Models + Recent Ledger */}
      <div className="dashboard-split-grid">
        {/* Recent Models */}
        <div className="card">
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0'
          }}>
            <h3 style={{ fontSize: '1.1rem' }}>Recent 3D Models</h3>
            <button onClick={() => setCurrentTab('my-models')} style={{ color: '#8b5cf6', fontSize: '0.85rem', fontWeight: 600 }}>
              View All ({totals.totalModels || 0})
            </button>
          </div>

          <div style={{ padding: '8px 0' }}>
            {recentModels.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                No models uploaded yet. Click "Upload New 3D Model" to get started!
              </div>
            ) : (
              recentModels.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 24px',
                    borderBottom: '1px solid #f1f5f9'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <img
                      src={m.thumbnail_url}
                      alt={m.title}
                      style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.92rem', color: '#0f172a' }}>{m.title}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        {m.gallery_name || 'Unassigned'} • v{m.current_version} • {m.views_count} views
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`badge ${m.processing_status === 'ready' ? 'badge-success' : 'badge-warning'}`}>
                      {m.processing_status}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedModelId(m.id);
                        setCurrentView('model-detail');
                      }}
                      className="btn btn-ghost btn-sm"
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Transactions Ledger */}
        <div className="card">
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0'
          }}>
            <h3 style={{ fontSize: '1.1rem' }}>Recent Coin Ledger</h3>
            <button onClick={() => setCurrentTab('transactions')} style={{ color: '#8b5cf6', fontSize: '0.85rem', fontWeight: 600 }}>
              Full Ledger
            </button>
          </div>

          <div style={{ padding: '8px 0' }}>
            {transactions.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                No coin activity recorded yet.
              </div>
            ) : (
              transactions.map((tx) => (
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      padding: '8px',
                      borderRadius: '8px',
                      background: tx.amount > 0 ? '#ecfdf5' : '#fef2f2',
                      color: tx.amount > 0 ? '#10b981' : '#ef4444'
                    }}>
                      {tx.amount > 0 ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.86rem', color: '#1e293b' }}>
                        {tx.description}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {new Date(tx.created_at).toLocaleDateString()} • {tx.coin_source} balance
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontWeight: 700,
                      fontSize: '0.92rem',
                      color: tx.amount > 0 ? '#10b981' : '#ef4444'
                    }}>
                      {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      Bal: {tx.balance_after}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
