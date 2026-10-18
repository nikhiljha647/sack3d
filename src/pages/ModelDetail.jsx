import React, { useState, useEffect } from 'react';
import {
  Smartphone, QrCode, Share2, Box, Calendar, FileText,
  ShieldCheck, Lock, ArrowLeft, Download, Check, AlertCircle, RefreshCw,
  Globe, Copy
} from 'lucide-react';
import confetti from 'canvas-confetti';
import Viewer3D from '../components/Viewer3D';
import ARModal from '../components/ARModal';
import QRCodeModal from '../components/QRCodeModal';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function ModelDetail({ modelId, setCurrentView, setSelectedModelId }) {
  const { user, business } = useAuth();
  const { success, error } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [arOpen, setArOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedPrivate, setCopiedPrivate] = useState(false);
  const [updatingVisibility, setUpdatingVisibility] = useState(false);
  const [currentVisibility, setCurrentVisibility] = useState('public');

  useEffect(() => {
    if (!modelId) return;
    setLoading(true);
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get('token');
    const autoLaunchAR = searchParams.get('ar') === 'true' || searchParams.get('mode') === 'ar' || window.location.hash === '#ar';

    api.getModel(modelId, token)
      .then((res) => {
        setData(res);
        if (res?.model?.visibility) {
          setCurrentVisibility(res.model.visibility);
        }
        if (autoLaunchAR && res?.model) {
          setArOpen(true);
          // Directly open native AR (Google SceneViewer on Android / QuickLook on iOS) to place model on floor
          const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
          const isAndroid = /Android/i.test(ua);
          const isIOS = /iPhone|iPad|iPod/i.test(ua);
          const rawUrl = res.model.web_ready_file_url || res.model.file_url || (res.versions && res.versions[0]?.file_path) || '';
          
          if (rawUrl) {
            const absoluteUrl = rawUrl.startsWith('http')
              ? rawUrl
              : `${window.location.origin}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
            const clean = absoluteUrl.split('?')[0].toLowerCase();
            const isGlb = clean.endsWith('.glb') || clean.endsWith('.gltf') || clean.includes('/uploads/models/');

            if (isAndroid && isGlb) {
              const sceneViewerUrl = `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(absoluteUrl)}&mode=ar_preferred&title=${encodeURIComponent(res.model.title || '3D Model')}&resizable=true#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;end;`;
              setTimeout(() => {
                try {
                  window.location.href = sceneViewerUrl;
                } catch (e) {
                  console.warn('[Direct SceneViewer Launch Error]:', e);
                }
              }, 200);
            } else if (isIOS) {
              const usdzUrl = res.model.usdz_file_url || absoluteUrl.replace(/\.glb$/i, '.usdz');
              setTimeout(() => {
                try {
                  const a = document.createElement('a');
                  a.rel = 'ar';
                  a.href = usdzUrl;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                } catch (e) {
                  console.warn('[iOS QuickLook Launch Error]:', e);
                }
              }, 300);
            }
          }
        }
      })
      .catch((err) => {
        error(err.message || 'Failed to load model details');
      })
      .finally(() => setLoading(false));
  }, [modelId]);

  if (loading) {
    const isARLaunch = typeof window !== 'undefined' && (new URLSearchParams(window.location.search).get('ar') === 'true' || window.location.hash === '#ar');
    return (
      <div className="section-spacer" style={{ textAlign: 'center', padding: '90px 20px' }}>
        <div style={{
          width: '52px',
          height: '52px',
          border: '3px solid #e2e8f0',
          borderTopColor: '#8b5cf6',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 20px auto'
        }} />
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
          {isARLaunch ? 'Opening in Augmented Reality...' : 'Loading 3D Model...'}
        </h3>
        <p style={{ color: '#64748b', fontSize: '0.92rem', maxWidth: '420px', margin: '0 auto' }}>
          {isARLaunch ? 'Calibrating camera and floor tracking to place the 3D model directly in your space.' : 'Loading model specifications and interactive 3D assets...'}
        </p>
      </div>
    );
  }

  if (!data?.model) {
    return (
      <div className="section-spacer container text-center">
        <h2>Model Not Found</h2>
        <p style={{ margin: '16px 0 24px 0' }}>This model may be private or has been removed.</p>
        <button onClick={() => setCurrentView('explore')} className="btn btn-secondary">
          Back to Explore
        </button>
      </div>
    );
  }

  const { model, versions, relatedModels, accessRole } = data;

  const isOwnerOrEditor = accessRole === 'owner' || 
                          accessRole === 'admin' || 
                          accessRole === 'editor' || 
                          user?.role === 'admin' || 
                          (business && model?.business_id === business?.id);

  const getShareUrl = (includeTokenIfPrivate = true, forAR = false) => {
    const origin = window.location.origin;
    const path = `/model/${model.slug || model.id}`;
    const token = model.share_token;
    const params = new URLSearchParams();
    if (includeTokenIfPrivate && currentVisibility === 'private' && token) {
      params.append('token', token);
    }
    if (forAR) {
      params.append('ar', 'true');
    }
    const qs = params.toString();
    return `${origin}${path}${qs ? `?${qs}` : ''}`;
  };

  const handleShare = () => {
    const url = getShareUrl(true);
    navigator.clipboard.writeText(url);
    setCopied(true);
    success(currentVisibility === 'private' ? 'Private access link copied with token!' : 'Model public URL copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyPrivateUrl = () => {
    const url = getShareUrl(true);
    navigator.clipboard.writeText(url);
    setCopiedPrivate(true);
    success('Secret access token link copied to clipboard!');
    setTimeout(() => setCopiedPrivate(false), 2200);
  };

  const handleCloseAR = () => {
    setArOpen(false);
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has('ar') || url.searchParams.has('mode') || window.location.hash === '#ar') {
        url.searchParams.delete('ar');
        url.searchParams.delete('mode');
        const cleanHash = window.location.hash === '#ar' ? '' : window.location.hash;
        const newUrl = url.pathname + (url.search ? url.search : '') + cleanHash;
        window.history.replaceState(null, '', newUrl);
      }
    } catch (e) {
      // safe fallback
    }
  };

  const handleVisibilityChange = async (newVisibility) => {
    if (newVisibility === currentVisibility || updatingVisibility) return;

    if (!user) {
      error('Please sign in to change visibility settings.');
      return;
    }

    setUpdatingVisibility(true);
    try {
      const res = await api.updateModel(model.id, { visibility: newVisibility });
      const updatedModel = res.model || { ...model, visibility: newVisibility };
      setCurrentVisibility(newVisibility);
      setData(prev => ({
        ...prev,
        model: {
          ...prev.model,
          ...updatedModel,
          visibility: newVisibility
        }
      }));

      if (newVisibility === 'public') {
        success('Visibility updated: Model is now Publicly Discoverable on Explore!');
      } else {
        success('Visibility updated: Model is now Private with a Secret Share Token.');
      }

      try {
        confetti({ particleCount: 30, spread: 60, origin: { y: 0.7 } });
      } catch (e) {
        // confetti optional
      }
    } catch (err) {
      console.error('Failed to change visibility:', err);
      error(err.message || 'Failed to update visibility settings');
    } finally {
      setUpdatingVisibility(false);
    }
  };

  return (
    <div className="section-spacer" style={{ paddingTop: '40px' }}>
      <div className="container">
        {/* Back Link */}
        <button
          onClick={() => setCurrentView('explore')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: '#64748b',
            fontSize: '0.9rem',
            fontWeight: 600,
            marginBottom: '24px',
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Models</span>
        </button>

        {/* Top Header Row */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '20px',
          marginBottom: '28px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="badge badge-primary">{model.category_name || model.business_industry}</span>
              {currentVisibility === 'private' ? (
                <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '4px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600 }}>
                  <Lock size={12} />
                  <span>Private Access</span>
                </span>
              ) : (
                <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', padding: '4px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600 }}>
                  <Globe size={12} />
                  <span>Public Discovery</span>
                </span>
              )}
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Revision v{model.current_version}
              </span>
            </div>
            <h1 style={{ fontSize: '2.2rem', marginBottom: '6px' }}>{model.title}</h1>
            <p style={{ fontSize: '0.95rem', color: '#475569' }}>
              Published by <strong>{model.business_name}</strong> • {model.views_count} Views • {model.ar_views_count} AR Launches
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setArOpen(true)} className="btn btn-primary">
              <Smartphone size={18} />
              <span>Launch WebAR</span>
            </button>
            <button onClick={() => setQrOpen(true)} className="btn btn-secondary">
              <QrCode size={18} />
              <span>Generate QR</span>
            </button>
            <button onClick={handleShare} className="btn btn-secondary">
              {copied ? <Check size={18} color="#10b981" /> : <Share2 size={18} />}
              <span>{copied ? 'Copied!' : 'Share'}</span>
            </button>
          </div>
        </div>

        {/* Main 3D Viewer & Technical Metadata Grid */}
        <div className="detail-grid" style={{ marginBottom: '56px' }}>
          {/* Left: 3D Interactive Canvas */}
          <div>
            <Viewer3D
              category={model.category_name || model.business_industry}
              title={model.title}
              modelUrl={model.web_ready_file_url}
              height="540px"
              onLaunchAR={() => setArOpen(true)}
            />
          </div>

          {/* Right: Technical Specs, Visibility Toggle & Quick QR */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Description Card */}
            <div className="card">
              <div className="card-body">
                <h3 style={{ fontSize: '1.15rem', marginBottom: '12px' }}>Asset Overview</h3>
                <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.6, marginBottom: '20px' }}>
                  {model.description || 'No detailed engineering description provided for this model.'}
                </p>

                {/* Spec List */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '14px',
                  background: '#f8fafc',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.86rem'
                }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem' }}>Original Format</span>
                    <strong>.{model.original_file_format ? model.original_file_format.toUpperCase() : 'GLB'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem' }}>Original CAD Size</span>
                    <strong>{model.original_file_size ? (model.original_file_size / (1024 * 1024)).toFixed(1) : '0.0'} MB</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem' }}>Web-Ready GLB</span>
                    <strong>{model.web_ready_file_size ? (model.web_ready_file_size / (1024 * 1024)).toFixed(1) : '0.0'} MB (Optimized)</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem' }}>WebAR Support</span>
                    <strong style={{ color: '#10b981' }}>Universal (QuickLook & SceneViewer)</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Visibility Access Settings Card */}
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Visibility Access</span>
                    {updatingVisibility && (
                      <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite', color: '#8b5cf6' }} />
                    )}
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '3px 0 0 0' }}>
                    Configure public discovery or private token link
                  </p>
                </div>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: currentVisibility === 'public' ? '#ecfdf5' : '#fffbeb',
                  color: currentVisibility === 'public' ? '#059669' : '#b45309',
                  border: `1px solid ${currentVisibility === 'public' ? '#a7f3d0' : '#fde68a'}`
                }}>
                  {currentVisibility === 'public' ? 'Public Discovery' : 'Private Link'}
                </span>
              </div>

              {/* Toggle Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div
                  id="btn-vis-public"
                  onClick={() => handleVisibilityChange('public')}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: `1.5px solid ${currentVisibility === 'public' ? '#8b5cf6' : '#e2e8f0'}`,
                    background: currentVisibility === 'public' ? '#f5f3ff' : '#ffffff',
                    cursor: updatingVisibility ? 'wait' : 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: currentVisibility === 'public' ? '0 2px 8px rgba(139, 92, 246, 0.12)' : 'none'
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: currentVisibility === 'public' ? '#6d28d9' : '#1e293b', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <Globe size={15} color={currentVisibility === 'public' ? '#8b5cf6' : '#64748b'} />
                    <span>Public Discovery</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.35 }}>
                    Appears on public explore & shareable everywhere.
                  </div>
                </div>

                <div
                  id="btn-vis-private"
                  onClick={() => handleVisibilityChange('private')}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: `1.5px solid ${currentVisibility === 'private' ? '#8b5cf6' : '#e2e8f0'}`,
                    background: currentVisibility === 'private' ? '#f5f3ff' : '#ffffff',
                    cursor: updatingVisibility ? 'wait' : 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: currentVisibility === 'private' ? '0 2px 8px rgba(139, 92, 246, 0.12)' : 'none'
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: currentVisibility === 'private' ? '#6d28d9' : '#1e293b', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <Lock size={15} color={currentVisibility === 'private' ? '#8b5cf6' : '#64748b'} />
                    <span>Private Link</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.35 }}>
                    Accessible only by team or users with secret share token.
                  </div>
                </div>
              </div>

              {/* Private Token Access Box */}
              {currentVisibility === 'private' && (
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  marginTop: '14px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ShieldCheck size={14} color="#8b5cf6" />
                      <span>Secret Access Token Link</span>
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Authorized Direct Access</span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      readOnly
                      value={getShareUrl(true)}
                      style={{
                        flex: 1,
                        padding: '7px 10px',
                        fontSize: '0.78rem',
                        fontFamily: 'monospace',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#334155'
                      }}
                      onClick={(e) => e.target.select()}
                    />
                    <button
                      id="btn-copy-private-token"
                      onClick={handleCopyPrivateUrl}
                      className="btn btn-primary btn-sm"
                      style={{
                        padding: '7px 12px',
                        fontSize: '0.78rem',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {copiedPrivate ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                      <span>{copiedPrivate ? 'Copied!' : 'Copy Link'}</span>
                    </button>
                  </div>

                  <p style={{ fontSize: '0.74rem', color: '#64748b', margin: '8px 0 0 0', lineHeight: 1.35 }}>
                    🔒 Hidden from public explore. Anyone with this unique token URL can view this 3D model and launch WebAR.
                  </p>
                </div>
              )}
            </div>

            {/* Quick QR Preview Box */}
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <img
                  src={model.qr_code_url || `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(getShareUrl(true, true))}`}
                  alt="QR Code"
                  style={{ width: '80px', height: '80px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <div>
                  <h4 style={{ fontSize: '0.95rem', marginBottom: '4px' }}>Scan for Instant AR</h4>
                  <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '8px' }}>
                    Point phone camera to launch WebAR immediately on your table or floor.
                  </p>
                  <button onClick={() => setQrOpen(true)} className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', fontSize: '0.78rem' }}>
                    Print Asset Sheet
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CAD Version History (If versions exist) */}
        {versions && versions.length > 0 && (
          <div style={{ marginBottom: '56px' }}>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '16px' }}>CAD Version History & Revisions</h3>
            <div className="card">
              <div className="table-wrapper">
                <div style={{ minWidth: '600px' }}>
                  <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 600, fontSize: '0.85rem', color: '#475569', display: 'grid', gridTemplateColumns: '100px 1fr 180px 140px' }}>
                    <span>Version</span>
                    <span>Engineering Notes</span>
                    <span>Author</span>
                    <span>Date</span>
                  </div>
                  {versions.map((v) => (
                    <div key={v.id} style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'grid', gridTemplateColumns: '100px 1fr 180px 140px', alignItems: 'center', fontSize: '0.88rem' }}>
                      <span style={{ fontWeight: 700, color: '#8b5cf6' }}>v{v.version_number}</span>
                      <span style={{ color: '#334155' }}>{v.notes || 'Engineering CAD update'}</span>
                      <span style={{ color: '#64748b' }}>{v.author_name}</span>
                      <span style={{ color: '#64748b' }}>{new Date(v.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Related Models */}
        {relatedModels && relatedModels.length > 0 && (
          <div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '20px' }}>Related Models</h3>
            <div className="models-grid">
              {relatedModels.map((rm) => (
                <div key={rm.id} className="card" style={{ cursor: 'pointer' }} onClick={() => setSelectedModelId(rm.id)}>
                  <div style={{ height: '150px', overflow: 'hidden' }}>
                    <img src={rm.thumbnail_url} alt={rm.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ padding: '14px' }}>
                    <h4 style={{ fontSize: '0.92rem', marginBottom: '4px' }}>{rm.title}</h4>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{rm.views_count} views</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {arOpen && <ARModal model={{ ...model, visibility: currentVisibility }} onClose={handleCloseAR} />}
      {qrOpen && <QRCodeModal model={{ ...model, visibility: currentVisibility }} onClose={() => setQrOpen(false)} />}
    </div>
  );
}
