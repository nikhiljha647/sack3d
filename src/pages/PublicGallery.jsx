import React, { useState, useEffect } from 'react';
import {
  Folder, Box, HardDrive, Eye, Smartphone, QrCode,
  Share2, ArrowLeft, Search, Check, Copy, ExternalLink,
  Layers, Sparkles, Building, Lock
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import ARModal from '../components/ARModal';
import QRCodeModal from '../components/QRCodeModal';
import ShareGalleryModal from '../components/ShareGalleryModal';

export default function PublicGallery({ galleryId, setCurrentView, setSelectedModelId }) {
  const { success, error } = useToast();
  const [gallery, setGallery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeModelForAR, setActiveModelForAR] = useState(null);
  const [activeModelForQR, setActiveModelForQR] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessError, setAccessError] = useState('');

  useEffect(() => {
    if (!galleryId) return;
    setLoading(true);
    setAccessDenied(false);
    setAccessError('');

    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const token = urlParams ? urlParams.get('token') : null;
    const isAr = urlParams ? (urlParams.get('ar') === 'true' || urlParams.get('mode') === 'ar' || window.location.hash.includes('ar')) : false;

    api.getPublicGallery(galleryId, token)
      .then((data) => {
        if (data.is_private && !data.models) {
          setAccessDenied(true);
          setAccessError(data.error || 'This gallery is private. Only users with the owner\'s shared link can view it.');
        } else {
          setGallery(data);
          // If scanned via QR code with direct AR request, open AR immediately
          if (isAr && data.models && data.models.length > 0) {
            setActiveModelForAR(data.models[0]);
          }
        }
      })
      .catch((err) => {
        if (err.status === 403 || err.message?.toLowerCase().includes('private')) {
          setAccessDenied(true);
          setAccessError(err.message || 'This gallery is private. You need the owner\'s shared link to view it.');
        } else {
          error(err.message || 'Failed to load gallery showroom');
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [galleryId]);

  const handleViewModel = (modelId) => {
    if (setSelectedModelId && setCurrentView) {
      setSelectedModelId(modelId);
      setCurrentView('model-detail');
    }
  };

  const handleCloseAR = () => {
    setActiveModelForAR(null);
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has('ar') || url.searchParams.has('mode') || window.location.hash.includes('ar')) {
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

  const models = gallery?.models || [];
  const filteredModels = models.filter((m) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      (m.title && m.title.toLowerCase().includes(term)) ||
      (m.description && m.description.toLowerCase().includes(term)) ||
      (m.category_name && m.category_name.toLowerCase().includes(term))
    );
  });

  if (accessDenied) {
    return (
      <div className="container" style={{ padding: '80px 24px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <div className="card" style={{ padding: '48px 32px', boxShadow: '0 20px 40px -15px rgba(0,0,0,0.08)' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto',
            color: '#b45309'
          }}>
            <Lock size={30} />
          </div>

          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
            Private 3D Showroom
          </h2>

          <p style={{ color: '#64748b', fontSize: '0.94rem', lineHeight: 1.6, marginBottom: '28px' }}>
            {accessError || 'This collection has been set to private by its creator. To access and inspect the 3D models, you must open the direct shared link provided by the owner.'}
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setCurrentView ? setCurrentView('home') : (window.location.href = '/')}
              className="btn btn-secondary"
            >
              Back to Home
            </button>
            <button
              onClick={() => setCurrentView ? setCurrentView('explore') : (window.location.href = '/models')}
              className="btn btn-primary"
            >
              Explore Public Models
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container" style={{ padding: '80px 24px', textAlign: 'center' }}>
        <div style={{
          width: '46px',
          height: '46px',
          border: '3px solid #e2e8f0',
          borderTopColor: '#8b5cf6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px auto'
        }} />
        <h3 style={{ color: '#0f172a', fontWeight: 600 }}>Loading 3D Showroom...</h3>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Calibrating interactive gallery collection</p>
      </div>
    );
  }

  if (!gallery) {
    return (
      <div className="container" style={{ padding: '80px 24px', textAlign: 'center' }}>
        <Folder size={56} color="#94a3b8" style={{ margin: '0 auto 16px auto' }} />
        <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Gallery Not Found</h2>
        <p style={{ color: '#64748b', marginBottom: '24px' }}>
          This 3D showroom link may have expired or been made private.
        </p>
        <button
          onClick={() => setCurrentView && setCurrentView('explore')}
          className="btn btn-primary"
        >
          Explore Public Models
        </button>
      </div>
    );
  }

  return (
    <div style={{ background: '#f8fafc', minHeight: 'calc(100vh - 72px)', paddingBottom: '60px' }}>
      {/* Top Banner Navigation */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '16px 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => setCurrentView && setCurrentView('explore')}
            className="btn btn-ghost btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#64748b' }}
          >
            <ArrowLeft size={16} />
            <span>Explore All Models</span>
          </button>

          <button
            onClick={() => setShareModalOpen(true)}
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Share2 size={15} />
            <span>Share Showroom</span>
          </button>
        </div>
      </div>

      <div className="container" style={{ paddingTop: '32px' }}>
        {/* Hero Gallery Card */}
        <div
          className="card"
          style={{
            padding: '32px',
            marginBottom: '36px',
            background: 'linear-gradient(135deg, #ffffff 0%, #fbfcfe 100%)',
            border: '1px solid #e2e8f0',
            boxShadow: '0 8px 30px rgba(0,0,0,0.04)'
          }}
        >
          <div style={{ display: 'flex', gap: '28px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{
              width: '180px',
              height: '130px',
              borderRadius: '16px',
              overflow: 'hidden',
              background: '#0f172a',
              flexShrink: 0,
              boxShadow: '0 6px 20px rgba(0,0,0,0.08)'
            }}>
              <img
                src={gallery.thumbnail_url || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80'}
                alt={gallery.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80';
                }}
              />
            </div>

            <div style={{ flex: 1, minWidth: '280px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Building size={12} />
                  <span>{gallery.business_name || 'Verified Showroom'}</span>
                </span>
                {gallery.business_industry && (
                  <span className="badge" style={{ background: '#f1f5f9', color: '#475569' }}>
                    {gallery.business_industry}
                  </span>
                )}
                {(!gallery.is_public || gallery.is_shared_access) && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '3px 10px',
                      borderRadius: '12px',
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <Lock size={11} />
                    Private Shared Collection
                  </span>
                )}
              </div>

              <h1 style={{ fontSize: '2.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                {gallery.name}
              </h1>

              <p style={{ color: '#475569', fontSize: '0.96rem', lineHeight: 1.6, maxWidth: '720px', marginBottom: '16px' }}>
                {gallery.description || 'Interactive 3D client showroom and engineering model collection.'}
              </p>

              <div style={{ display: 'flex', gap: '20px', alignItems: 'center', fontSize: '0.88rem', color: '#64748b' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Box size={16} color="#8b5cf6" />
                  <strong>{models.length} 3D Asset{models.length === 1 ? '' : 's'}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Smartphone size={16} color="#7c3aed" />
                  <span>WebAR Enabled</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <div style={{ position: 'relative', width: '340px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search 3D models in collection..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '36px', fontSize: '0.9rem' }}
            />
          </div>

          <div style={{ fontSize: '0.88rem', color: '#64748b' }}>
            Showing {filteredModels.length} of {models.length} model{models.length === 1 ? '' : 's'}
          </div>
        </div>

        {/* Model Grid */}
        {models.length === 0 ? (
          <div className="card" style={{ padding: '64px 24px', textAlign: 'center' }}>
            <Box size={52} color="#a78bfa" style={{ margin: '0 auto 16px auto' }} />
            <h3 style={{ fontSize: '1.25rem', marginBottom: '8px', color: '#0f172a' }}>
              No models in this gallery yet
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.92rem', maxWidth: '440px', margin: '0 auto' }}>
              This collection is currently empty. Check back soon or browse our model marketplace.
            </p>
          </div>
        ) : filteredModels.length === 0 ? (
          <div className="card" style={{ padding: '64px 24px', textAlign: 'center' }}>
            <Box size={52} color="#94a3b8" style={{ margin: '0 auto 16px auto' }} />
            <h3 style={{ fontSize: '1.25rem', marginBottom: '8px', color: '#0f172a' }}>
              No models match "{search}"
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.92rem', marginBottom: '18px' }}>
              Try searching with another keyword or clear your filter.
            </p>
            <button
              onClick={() => setSearch('')}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <span>Clear Filter</span>
            </button>
          </div>
        ) : (
          <div className="models-grid">
            {filteredModels.map((m) => (
              <div
                key={m.id}
                className="card"
                style={{
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 14px 34px rgba(0,0,0,0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                {/* 3D Canvas / Thumbnail Trigger */}
                <div
                  style={{
                    height: '200px',
                    overflow: 'hidden',
                    position: 'relative',
                    cursor: 'pointer',
                    background: '#0f172a'
                  }}
                  onClick={() => handleViewModel(m.id)}
                  title="Click to view interactive 3D model"
                >
                  <img
                    src={m.thumbnail_url || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80'}
                    alt={m.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80';
                    }}
                  />
                  <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '6px' }}>
                    <span className="badge badge-primary" style={{ textTransform: 'uppercase', fontSize: '0.72rem' }}>
                      {m.original_file_format || 'GLB'}
                    </span>
                    {m.category_name && (
                      <span className="badge" style={{ background: 'rgba(15, 23, 42, 0.75)', color: '#ffffff', fontSize: '0.72rem' }}>
                        {m.category_name}
                      </span>
                    )}
                  </div>
                  {m.ar_enabled ? (
                    <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                      <span className="badge badge-success" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Smartphone size={11} />
                        <span>WebAR</span>
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h3
                      onClick={() => handleViewModel(m.id)}
                      style={{
                        fontSize: '1.15rem',
                        fontWeight: 700,
                        color: '#0f172a',
                        marginBottom: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      {m.title}
                    </h3>
                    <p style={{
                      fontSize: '0.86rem',
                      color: '#64748b',
                      lineHeight: 1.5,
                      marginBottom: '16px',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {m.description || 'High-fidelity commercial 3D asset ready for spatial WebAR inspection.'}
                    </p>
                  </div>

                  <div>
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      paddingTop: '12px',
                      borderTop: '1px solid #f1f5f9'
                    }}>
                      <button
                        onClick={() => handleViewModel(m.id)}
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <Eye size={14} />
                        <span>View 3D</span>
                      </button>
                      <button
                        onClick={() => setActiveModelForAR(m)}
                        className="btn btn-secondary btn-sm"
                        title="View in WebAR"
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      >
                        <Smartphone size={14} />
                        <span>AR</span>
                      </button>
                      <button
                        onClick={() => setActiveModelForQR(m)}
                        className="btn btn-secondary btn-sm"
                        title="Generate QR code"
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      >
                        <QrCode size={14} />
                        <span>QR</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Share Modal */}
      {shareModalOpen && (
        <ShareGalleryModal
          gallery={gallery}
          onClose={() => setShareModalOpen(false)}
        />
      )}

      {/* AR Modal */}
      {activeModelForAR && (
        <ARModal
          model={activeModelForAR}
          onClose={handleCloseAR}
        />
      )}

      {/* QR Code Modal */}
      {activeModelForQR && (
        <QRCodeModal
          model={activeModelForQR}
          onClose={() => setActiveModelForQR(null)}
        />
      )}
    </div>
  );
}
