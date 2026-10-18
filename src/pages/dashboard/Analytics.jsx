import React, { useState, useEffect } from 'react';
import { BarChart3, Eye, Smartphone, QrCode, Monitor, Share2, TrendingUp } from 'lucide-react';
import { api } from '../../services/api';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboardAnalytics().then(setData).catch(console.warn).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: '#64748b' }}>Loading analytics metrics...</div>;

  const totals = data?.totals || {};
  const devices = data?.devices || [];
  const topModels = data?.topModels || [];

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.9rem', marginBottom: '4px' }}>Analytics & Engagement</h1>
        <p style={{ color: '#64748b', fontSize: '0.92rem' }}>
          Real-time metrics on 3D viewer interaction, camera WebAR launches, QR scans, and client device breakdowns.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid-4" style={{ marginBottom: '32px' }}>
        <div className="card" style={{ padding: '22px' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>Total 3D Views</span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>{totals.totalViews}</div>
          <span style={{ fontSize: '0.78rem', color: '#10b981' }}>+18% from last month</span>
        </div>

        <div className="card" style={{ padding: '22px' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>WebAR Launches</span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#8b5cf6', margin: '4px 0' }}>{totals.totalArLaunches}</div>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Real camera surface placements</span>
        </div>

        <div className="card" style={{ padding: '22px' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>QR Asset Scans</span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#7c3aed', margin: '4px 0' }}>{totals.totalQrScans}</div>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Brochure & machine labels</span>
        </div>

        <div className="card" style={{ padding: '22px' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>Total Coins Invested</span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>{totals.totalCoinsSpent}</div>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Uploads & CAD revisions</span>
        </div>
      </div>

      {/* Device Breakdown & Top Performing Models Grid */}
      <div className="dashboard-split-grid">
        {/* Device Breakdown */}
        <div className="card" style={{ padding: '28px' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '20px' }}>Visitor Device Breakdown</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {devices.length === 0 ? (
              <p style={{ color: '#64748b' }}>No device events recorded yet.</p>
            ) : (
              devices.map((d, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{d.device_type || 'Desktop'}</span>
                    <span style={{ color: '#64748b' }}>{d.count} sessions</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(100, (d.count / (totals.totalViews || 1)) * 100)}%`,
                      height: '100%',
                      background: i === 0 ? '#8b5cf6' : i === 1 ? '#7c3aed' : '#10b981'
                    }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Models */}
        <div className="card" style={{ padding: '28px' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '16px' }}>Top Engaging 3D Assets</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topModels.map((m) => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: '#f8fafc',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img src={m.thumbnail_url} alt={m.title} style={{ width: '42px', height: '42px', borderRadius: '8px', objectFit: 'cover' }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>{m.title}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{m.views_count} views • {m.ar_views_count} AR</div>
                  </div>
                </div>
                <span className="badge badge-primary">{m.qr_scans_count} scans</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
