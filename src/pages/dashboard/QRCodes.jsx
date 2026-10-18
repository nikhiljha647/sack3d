import React, { useState, useEffect } from 'react';
import { Download, ExternalLink } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function QRCodes() {
  const { success } = useToast();
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMyModels().then(setModels).catch(console.warn).finally(() => setLoading(false));
  }, []);

  const handleDownload = (qrUrl, title) => {
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = `ModelAR_QR_${title.replace(/[^a-z0-9]/gi, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    success('QR Code downloaded successfully');
  };

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.9rem', marginBottom: '4px' }}>QR Code Fleet Management</h1>
        <p style={{ color: '#64748b', fontSize: '0.92rem' }}>
          Generate, download, and track scans for packaging, brochures, and physical machinery asset plates.
        </p>
      </div>

      {loading ? (
        <div style={{ color: '#64748b', padding: '40px 0' }}>Loading QR codes...</div>
      ) : (
        <div className="models-grid">
          {models.map((m) => {
            const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
            const tokenParam = (m.visibility === 'private' && m.share_token)
              ? `?token=${encodeURIComponent(m.share_token)}&ar=true`
              : '?ar=true';
            const targetArUrl = `${baseUrl}/model/${m.slug || m.id}${tokenParam}`;
            const qrImage = m.qr_code_url || `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(targetArUrl)}&format=png`;

            return (
              <div key={m.id} className="card" style={{ padding: '24px' }}>
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                  marginBottom: '16px'
                }}>
                  <img
                    src={qrImage}
                    alt={m.title}
                    style={{ width: '160px', height: '160px', margin: '0 auto', display: 'block' }}
                  />
                  <div style={{ marginTop: '8px', fontSize: '0.74rem', color: '#8b5cf6', fontWeight: 600 }}>
                    ⚡ Scans directly into WebAR
                  </div>
                </div>

                <h4 style={{ fontSize: '1.05rem', marginBottom: '4px' }}>{m.title}</h4>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.8rem',
                  color: '#64748b',
                  marginBottom: '16px'
                }}>
                  <span>Total Scans: <strong style={{ color: '#8b5cf6' }}>{m.qr_scans_count || 0}</strong></span>
                  <span>{m.visibility === 'public' ? 'Public AR' : 'Private Token AR'}</span>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleDownload(qrImage, m.title)}
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                  >
                    <Download size={14} />
                    <span>Download AR QR</span>
                  </button>
                  <a
                    href={targetArUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-ghost btn-sm"
                    title="Open live AR view"
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
