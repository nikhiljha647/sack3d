import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Share2, Copy, Check, Download, QrCode, ExternalLink,
  Code, X, Sparkles, Send, Globe, MessageSquare, Mail, Lock
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function ShareGalleryModal({ gallery, onClose }) {
  const { success } = useToast();
  const [activeTab, setActiveTab] = useState('link'); // 'link' | 'qr' | 'embed'
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  if (!gallery) return null;

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const shareIdentifier = gallery.slug || gallery.id;
  const isPrivate = !gallery.is_public || gallery.is_public === 0 || gallery.is_public === '0';
  const tokenParam = (isPrivate && gallery.share_token) ? `?token=${encodeURIComponent(gallery.share_token)}` : '';
  const shareUrl = `${baseUrl}/gallery/${shareIdentifier}${tokenParam}`;
  const qrTargetUrl = `${shareUrl}${shareUrl.includes('?') ? '&ar=true' : '?ar=true'}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(qrTargetUrl)}&format=png`;

  const embedCode = `<iframe src="${shareUrl}" width="100%" height="650" style="border:0; border-radius:16px; box-shadow:0 10px 30px rgba(0,0,0,0.12); width:100%; min-height:550px;" allow="camera; xr-spatial-tracking; fullscreen" allowfullscreen loading="lazy"></iframe>`;

  const handleCopyLink = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      success('Gallery link copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 2200);
    }
  };

  const handleCopyEmbed = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(embedCode);
      setCopiedEmbed(true);
      success('Embed snippet copied to clipboard!');
      setTimeout(() => setCopiedEmbed(false), 2200);
    }
  };

  const handleDownloadQR = async () => {
    try {
      const response = await fetch(qrImageUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Gallery_${gallery.slug || gallery.name || 'showroom'}_QR.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      success('Gallery QR Code downloaded');
    } catch {
      // Fallback direct link download
      const a = document.createElement('a');
      a.href = qrImageUrl;
      a.download = `Gallery_QR_${gallery.id}.png`;
      a.target = '_blank';
      a.click();
      success('Downloading QR Code image');
    }
  };

  // Social sharing links
  const shareText = `Explore the 3D Gallery: ${gallery.name}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  const mailUrl = `mailto:?subject=${encodeURIComponent(`3D Gallery: ${gallery.name}`)}&body=${encodeURIComponent(`Hi,\n\nCheck out this 3D Interactive Gallery showroom with WebAR models:\n\n${shareUrl}\n\nEnjoy!`)}`;

  return createPortal(
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-content"
        style={{
          maxWidth: '580px',
          width: '100%',
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(226, 232, 240, 0.8)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#7c3aed'
              }}
            >
              <Share2 size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.18rem', fontWeight: 700, color: '#0f172a' }}>
                  Share Gallery Showroom
                </h3>
                {isPrivate ? (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Lock size={11} />
                    Private Link
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      backgroundColor: '#dcfce7',
                      color: '#166534',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Globe size={11} />
                    Public Showroom
                  </span>
                )}
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                {gallery.name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            style={{ borderRadius: '50%', width: '36px', height: '36px', padding: 0 }}
            title="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            padding: '12px 24px 0',
            borderBottom: '1px solid #f1f5f9',
            gap: '8px'
          }}
        >
          <button
            onClick={() => setActiveTab('link')}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '0.88rem',
              fontWeight: 600,
              color: activeTab === 'link' ? '#7c3aed' : '#64748b',
              borderBottom: activeTab === 'link' ? '2px solid #7c3aed' : '2px solid transparent',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <Globe size={15} />
            <span>Share Link</span>
          </button>

          <button
            onClick={() => setActiveTab('qr')}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '0.88rem',
              fontWeight: 600,
              color: activeTab === 'qr' ? '#7c3aed' : '#64748b',
              borderBottom: activeTab === 'qr' ? '2px solid #7c3aed' : '2px solid transparent',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <QrCode size={15} />
            <span>AR QR Code</span>
          </button>

          <button
            onClick={() => setActiveTab('embed')}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '0.88rem',
              fontWeight: 600,
              color: activeTab === 'embed' ? '#7c3aed' : '#64748b',
              borderBottom: activeTab === 'embed' ? '2px solid #7c3aed' : '2px solid transparent',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <Code size={15} />
            <span>Embed Widget</span>
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* TAB 1: Link & Social */}
          {activeTab === 'link' && (
            <div>
              {/* Privacy explainer box */}
              {isPrivate ? (
                <div style={{
                  padding: '10px 14px',
                  background: '#fefce8',
                  border: '1px solid #fef08a',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  color: '#854d0e',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Lock size={15} color="#ca8a04" style={{ flexShrink: 0 }} />
                  <span>
                    This gallery is <strong>Private</strong>. Only individuals with this exact link and access token can view your 3D models.
                  </span>
                </div>
              ) : (
                <div style={{
                  padding: '10px 14px',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  color: '#166534',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Globe size={15} color="#16a34a" style={{ flexShrink: 0 }} />
                  <span>
                    This gallery is <strong>Public</strong>. It is discoverable and anyone with or without an account can view it.
                  </span>
                </div>
              )}

              <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                {isPrivate ? 'Private Share Link (Token Included)' : 'Public Showroom URL'}
              </label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="form-input"
                  style={{
                    flex: 1,
                    backgroundColor: '#f8fafc',
                    fontFamily: 'monospace',
                    fontSize: '0.86rem',
                    color: '#1e293b'
                  }}
                  onFocus={(e) => e.target.select()}
                />
                <button
                  onClick={handleCopyLink}
                  className="btn btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    minWidth: '105px',
                    justifyContent: 'center'
                  }}
                >
                  {copiedLink ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div style={{ marginBottom: '24px' }}>
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    justifyContent: 'center',
                    textDecoration: 'none'
                  }}
                >
                  <ExternalLink size={15} />
                  <span>Preview Public Showroom</span>
                </a>
              </div>

              {/* Social Channels */}
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#475569', marginBottom: '10px' }}>
                  Quick Share to Clients & Social Channels
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#f0fdf4',
                      color: '#15803d',
                      textDecoration: 'none',
                      fontSize: '0.86rem',
                      fontWeight: 600,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <MessageSquare size={17} color="#16a34a" />
                    <span>WhatsApp</span>
                  </a>

                  <a
                    href={mailUrl}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#f8fafc',
                      color: '#334155',
                      textDecoration: 'none',
                      fontSize: '0.86rem',
                      fontWeight: 600,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Mail size={17} color="#64748b" />
                    <span>Email Invite</span>
                  </a>

                  <a
                    href={linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#eff6ff',
                      color: '#1d4ed8',
                      textDecoration: 'none',
                      fontSize: '0.86rem',
                      fontWeight: 600,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Globe size={17} color="#2563eb" />
                    <span>LinkedIn</span>
                  </a>

                  <a
                    href={twitterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#f8fafc',
                      color: '#0f172a',
                      textDecoration: 'none',
                      fontSize: '0.86rem',
                      fontWeight: 600,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Send size={17} color="#0f172a" />
                    <span>X (Twitter)</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: QR Code */}
          {activeTab === 'qr' && (
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  display: 'inline-block',
                  padding: '16px',
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                  marginBottom: '16px'
                }}
              >
                <img
                  src={qrImageUrl}
                  alt={`QR Code for ${gallery.name}`}
                  style={{
                    width: '210px',
                    height: '210px',
                    display: 'block',
                    borderRadius: '8px'
                  }}
                />
              </div>

              <h4 style={{ margin: '0 0 6px', fontSize: '1rem', color: '#0f172a', fontWeight: 600 }}>
                Scan to Explore Gallery in WebAR
              </h4>
              <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: '#64748b', maxWidth: '380px', marginLeft: 'auto', marginRight: 'auto' }}>
                Open your smartphone camera to launch the complete 3D interactive showroom with instant AR preview.
              </p>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  onClick={handleDownloadQR}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <Download size={16} />
                  <span>Download High-Res QR</span>
                </button>
                <button
                  onClick={handleCopyLink}
                  className="btn btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  {copiedLink ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Embed Widget */}
          {activeTab === 'embed' && (
            <div>
              <p style={{ fontSize: '0.86rem', color: '#475569', marginBottom: '14px', lineHeight: 1.5 }}>
                Embed this interactive 3D showroom into your website, Shopify store, WordPress, or client portal.
              </p>

              <div style={{ position: 'relative', marginBottom: '16px' }}>
                <textarea
                  readOnly
                  rows={4}
                  value={embedCode}
                  className="form-input"
                  style={{
                    width: '100%',
                    fontFamily: 'monospace',
                    fontSize: '0.82rem',
                    backgroundColor: '#0f172a',
                    color: '#e2e8f0',
                    padding: '12px',
                    borderRadius: '10px',
                    resize: 'none'
                  }}
                  onFocus={(e) => e.target.select()}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#64748b' }}>
                  <Sparkles size={14} color="#8b5cf6" />
                  <span>Responsive WebGL & AR ready</span>
                </div>
                <button
                  onClick={handleCopyEmbed}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  {copiedEmbed ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copiedEmbed ? 'Embed Code Copied!' : 'Copy Embed Code'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #f1f5f9',
            backgroundColor: '#f8fafc',
            display: 'flex',
            justifyContent: 'flex-end'
          }}
        >
          <button onClick={onClose} className="btn btn-secondary btn-sm">
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
