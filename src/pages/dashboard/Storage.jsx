import React, { useState, useEffect } from 'react';
import { HardDrive, FileText, Layers, GitBranch, AlertCircle, ArrowUpRight } from 'lucide-react';
import { api } from '../../services/api';

export default function Storage({ setCurrentTab }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboardAnalytics().then(setAnalytics).catch(console.warn).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: '#64748b' }}>Loading storage statistics...</div>;

  const storage = analytics?.storage || {};
  const breakdown = storage?.breakdown || {};

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.9rem', marginBottom: '4px' }}>Cloud Storage Quota</h1>
        <p style={{ color: '#64748b', fontSize: '0.92rem' }}>
          Monitor your cloud storage usage across raw CAD models, optimized WebGL meshes, and revision archives.
        </p>
      </div>

      {/* Main Storage Gauge Card */}
      <div className="card" style={{ padding: '36px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
              Storage Usage
            </div>
            <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#0f172a' }}>
              {storage.totalUsedGB} GB <span style={{ fontSize: '1.1rem', fontWeight: 500, color: '#64748b' }}>/ {storage.totalLimitGB} GB Limit</span>
            </div>
          </div>
          <span className="badge badge-primary" style={{ fontSize: '0.9rem', padding: '6px 14px' }}>
            {storage.percentage}% Utilized
          </span>
        </div>

        <div style={{ width: '100%', height: '14px', background: '#e2e8f0', borderRadius: '7px', overflow: 'hidden', marginBottom: '12px' }}>
          <div style={{
            width: `${storage.percentage}%`,
            height: '100%',
            background: storage.percentage > 85 ? '#ef4444' : 'linear-gradient(90deg, #8b5cf6, #7c3aed)'
          }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b' }}>
          <span>Available Free Space: <strong>{storage.availableGB} GB</strong></span>
          <span>Plan: <strong>{storage.planName}</strong></span>
        </div>
      </div>

      {/* Storage Breakdown by Asset Type */}
      <div className="packages-grid-3" style={{ gap: '24px', marginBottom: '36px' }}>
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <FileText size={20} color="#8b5cf6" />
            <h4 style={{ fontSize: '1rem' }}>Original CAD Files</h4>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
            {breakdown.originalFilesGB || 0} GB
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Raw STEP, OBJ, and source geometry archives.
          </p>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <Layers size={20} color="#10b981" />
            <h4 style={{ fontSize: '1rem' }}>Web-Ready Assets</h4>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
            {breakdown.webReadyFilesGB || 0} GB
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Compressed Draco/GLB and WebAR-optimized meshes.
          </p>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <GitBranch size={20} color="#7c3aed" />
            <h4 style={{ fontSize: '1rem' }}>CAD Revisions & Versions</h4>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
            {((breakdown.cadRevisionsBytes || 0) / (1024 * 1024 * 1024)).toFixed(2)} GB
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Historical rollback checkpoints and CAD revisions.
          </p>
        </div>
      </div>

      {/* Upgrade Callout */}
      <div style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: 'clamp(18px, 4vw, 24px) clamp(16px, 4vw, 28px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h4 style={{ fontSize: '1.05rem', marginBottom: '4px' }}>Need More Cloud Storage?</h4>
          <p style={{ fontSize: '0.86rem', color: '#64748b' }}>
            Upgrade to the Business plan for 50 GB high-speed shared storage pool across all team members.
          </p>
        </div>
        <button onClick={() => setCurrentTab('subscription')} className="btn btn-primary">
          <span>Upgrade Plan</span>
          <ArrowUpRight size={16} />
        </button>
      </div>
    </div>
  );
}
