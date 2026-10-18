import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { QrCode, Download, RefreshCw, X, Printer, Check, Copy } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function QRCodeModal({ model, onClose }) {
  const { success, error } = useToast();
  const [preset, setPreset] = useState('brochure');
  const [loading, setLoading] = useState(false);
  const [qrUrl, setQrUrl] = useState(model.qr_code_url || '');
  const [copied, setCopied] = useState(false);

  const presets = [
    { id: 'brochure', name: 'Sales Brochure & Catalog', desc: 'Optimized for high-resolution print marketing materials' },
    { id: 'machinery_label', name: 'Physical Machine Plate', desc: 'High-contrast QR for metal asset tags & equipment warning labels' },
    { id: 'showroom', name: 'Showroom Tag / Standee', desc: 'Standee card format for customer product displays & furniture tags' },
    { id: 'packaging', name: 'Product Box Packaging', desc: 'Compact footprint for commercial boxes & OEM packaging' },
    { id: 'menu', name: 'Restaurant Table Display', desc: 'Laminated table tent format for food & hospitality displays' }
  ];

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const tokenParam = (model.visibility === 'private' && model.share_token)
    ? `?token=${encodeURIComponent(model.share_token)}&ar=true`
    : '?ar=true';
  const targetArUrl = `${baseUrl}/model/${model.slug || model.id}${tokenParam}`;
  const displayQrUrl = qrUrl || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(targetArUrl)}&format=png`;

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      const res = await api.generateQR(model.id, preset);
      setQrUrl(res.qrDataUrl);
      success('AR QR Code regenerated successfully!');
    } catch (err) {
      error(err.message || 'Failed to regenerate QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(targetArUrl);
    setCopied(true);
    success('Direct WebAR link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(displayQrUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `ModelAR_AR_QR_${model.slug || model.id}_${preset}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      success('AR QR Code downloaded');
    } catch {
      const a = document.createElement('a');
      a.href = displayQrUrl;
      a.download = `ModelAR_AR_QR_${model.slug || model.id}_${preset}.png`;
      a.target = '_blank';
      a.click();
      success('Downloading AR QR Code image');
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>ModelAR Print Asset - ${model.title}</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 40px; }
            .card { border: 2px solid #0f172a; padding: 30px; border-radius: 16px; display: inline-block; max-width: 400px; }
            img { width: 280px; height: 280px; }
            h2 { margin: 16px 0 6px 0; font-size: 22px; color: #0f172a; }
            p { margin: 0 0 16px 0; color: #64748b; font-size: 14px; }
            .badge { display: inline-block; padding: 6px 14px; background: #f5f3ff; color: #8b5cf6; font-weight: bold; border-radius: 20px; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">Scan to View in 3D & WebAR</span>
            <h2>${model.title}</h2>
            <p>Preset: ${presets.find(p => p.id === preset)?.name}</p>
            <img src="${displayQrUrl}" />
            <p style="margin-top: 16px;">Powered by ModelAR — Interactive 3D Hosting</p>
          </div>
          <script>window.onload = function() { window.print(); }<\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
        zIndex: 99999
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-content" style={{ maxWidth: '640px' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 24px',
          borderBottom: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#f5f3ff',
              color: '#8b5cf6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <QrCode size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem' }}>Model QR Code Generator</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>{model.title}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ padding: '6px', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* QR Visual */}
            <div style={{
              background: '#ffffff',
              padding: '16px',
              border: '2px solid #e2e8f0',
              borderRadius: '16px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
              textAlign: 'center',
              margin: '0 auto'
            }}>
              <img
                src={displayQrUrl}
                alt="Model AR QR Code"
                style={{ width: '200px', height: '200px', display: 'block' }}
              />
              <div style={{ marginTop: '10px', fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
                Total Scans: <span style={{ color: '#8b5cf6' }}>{model.qr_scans_count || 0}</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ flex: 1, minWidth: '220px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <span className="badge badge-primary" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                  ⚡ Direct WebAR Launcher
                </span>
              </div>
              <h4 style={{ fontSize: '0.95rem', marginBottom: '8px' }}>Target Destination URL</h4>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '6px 10px',
                marginBottom: '16px'
              }}>
                <input
                  type="text"
                  readOnly
                  value={targetArUrl}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '0.8rem',
                    width: '100%',
                    color: '#334155'
                  }}
                />
                <button onClick={handleCopyLink} style={{ color: '#8b5cf6', padding: '4px' }} title="Copy URL">
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button onClick={handleDownload} className="btn btn-primary btn-sm" style={{ width: '100%' }}>
                  <Download size={16} />
                  <span>Download High-Res PNG</span>
                </button>
                <button onClick={handlePrint} className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
                  <Printer size={16} />
                  <span>Print Asset Sheet</span>
                </button>
                <button onClick={handleRegenerate} disabled={loading} className="btn btn-ghost btn-sm" style={{ width: '100%' }}>
                  <RefreshCw size={16} className={loading ? 'spin' : ''} />
                  <span>{loading ? 'Regenerating...' : 'Regenerate QR'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* B2B Application Presets */}
          <div style={{ marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
            <h4 style={{ fontSize: '0.92rem', marginBottom: '12px' }}>Select B2B Deployment Preset</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {presets.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setPreset(p.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: `1.5px solid ${preset === p.id ? '#8b5cf6' : '#e2e8f0'}`,
                    background: preset === p.id ? '#f5f3ff' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1e293b' }}>{p.name}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{p.desc}</div>
                  </div>
                  {preset === p.id && <Check size={18} color="#8b5cf6" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
