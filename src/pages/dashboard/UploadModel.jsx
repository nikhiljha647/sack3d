import React, { useState, useEffect } from 'react';
import { UploadCloud, CheckCircle2, Coins, Check, Eye, Image as ImageIcon, ImagePlus, X, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import CoinTopUpModal from '../../components/CoinTopUpModal';

export default function UploadModel({ setCurrentTab, setSelectedModelId, setCurrentView }) {
  const { wallet, refreshContext, loading: authLoading } = useAuth();
  const { success, error } = useToast();

  const [galleries, setGalleries] = useState([]);
  const [categories, setCategories] = useState([]);

  const [file, setFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [galleryId, setGalleryId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [simulateFail, setSimulateFail] = useState(false);
  const [isDraggingModel, setIsDraggingModel] = useState(false);
  const [isDraggingThumb, setIsDraggingThumb] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processStatus, setProcessStatus] = useState(''); // 'uploading', 'processing', 'completed', 'failed'
  const [uploadedModel, setUploadedModel] = useState(null);

  // Coin top-up modal state
  const [topUpModalOpen, setTopUpModalOpen] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);

  // Automatically open coin top-ups ONLY when auth has finished loading AND balance is strictly less than 25
  useEffect(() => {
    if (authLoading) return;

    if (wallet && typeof wallet.totalBalance === 'number') {
      if (wallet.totalBalance < 25 && !hasAutoOpened) {
        const timer = setTimeout(() => {
          setTopUpModalOpen(true);
          setHasAutoOpened(true);
        }, 0);
        return () => clearTimeout(timer);
      } else if (wallet.totalBalance >= 25) {
        setTopUpModalOpen(false);
      }
    }
  }, [authLoading, wallet, hasAutoOpened]);

  useEffect(() => {
    api.getGalleries().then(setGalleries).catch(console.warn);
    api.getCategories().then(setCategories).catch(console.warn);
  }, []);

  // Handle return from Stripe coin purchase redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const isSuccess = params.get('success');
    const isCanceled = params.get('canceled');

    if (isCanceled) {
      error('Coin purchase checkout was canceled.');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (sessionId && isSuccess === 'true') {
      const verify = async () => {
        try {
          const res = await api.verifyStripeSession(sessionId);
          confetti({ particleCount: 120, spread: 80 });
          success(res.message || 'Payment successful! Coins credited to your wallet.');
          await refreshContext();
        } catch (err) {
          console.error('[Stripe Verify Error]:', err);
          error(err.message || 'Failed to verify checkout session');
        } finally {
          window.history.replaceState({}, '', window.location.pathname);
        }
      };
      verify();
    }
  }, [error, success, refreshContext]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      if (wallet && typeof wallet.totalBalance === 'number' && wallet.totalBalance < 25) {
        setTopUpModalOpen(true);
      }
    }
  };

  const handleRemoveFile = (e) => {
    if (e) e.stopPropagation();
    setFile(null);
    const fileInput = document.getElementById('model-file-input');
    if (fileInput) fileInput.value = '';
  };

  const processThumbnailFile = (f) => {
    if (!f.type.startsWith('image/')) {
      error('Please select a valid image file (.png, .jpg, .jpeg, .webp)');
      return;
    }
    if (f.size > 15 * 1024 * 1024) {
      error('Thumbnail file size should be under 15 MB');
      return;
    }
    if (thumbnailPreview) {
      URL.revokeObjectURL(thumbnailPreview);
    }
    setThumbnailFile(f);
    setThumbnailPreview(URL.createObjectURL(f));
  };

  const handleThumbnailChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processThumbnailFile(e.target.files[0]);
    }
  };

  const handleRemoveThumbnail = (e) => {
    if (e) e.stopPropagation();
    if (thumbnailPreview) {
      URL.revokeObjectURL(thumbnailPreview);
    }
    setThumbnailFile(null);
    setThumbnailPreview(null);
    const thumbInput = document.getElementById('thumbnail-file-input');
    if (thumbInput) thumbInput.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      error('Please enter a model title');
      return;
    }

    if (wallet.totalBalance < 25) {
      setTopUpModalOpen(true);
      error('Insufficient coins. You need 25 coins to upload and process this model. Choose a top-up package to proceed.');
      return;
    }

    setUploading(true);
    setProgress(20);
    setProcessStatus('Uploading 3D asset...');

    try {
      const formData = new FormData();
      if (file) formData.append('file', file);
      if (thumbnailFile) formData.append('thumbnail', thumbnailFile);
      formData.append('title', title.trim());
      formData.append('description', description);
      if (galleryId) formData.append('galleryId', galleryId);
      if (categoryId) formData.append('categoryId', categoryId);
      formData.append('visibility', visibility);
      formData.append('simulateFail', simulateFail ? 'true' : 'false');

      const res = await api.uploadModel(formData);
      setProgress(60);
      setProcessStatus('Converting CAD mesh and optimizing for WebAR...');

      // Poll or wait for the 1.2s async processing completion
      setTimeout(async () => {
        try {
          const updated = await api.getModel(res.model.id, null, false);
          if (updated.model.processing_status === 'processing_failed') {
            setProcessStatus('failed');
            setUploading(false);
            error(`Processing failed: ${updated.model.processing_error || 'Geometry error'}. Your coins were NOT deducted.`);
          } else {
            setProcessStatus('completed');
            setProgress(100);
            setUploadedModel(updated.model);
            confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
            success('Model uploaded & WebAR optimized! 25 coins deducted from wallet.');
            await refreshContext();
          }
        } catch (pollErr) {
          console.warn(pollErr);
        } finally {
          setUploading(false);
        }
      }, 1500);

    } catch (err) {
      setUploading(false);
      setProcessStatus('failed');
      error(err.message || 'Upload failed');
    }
  };

  const handleReset = () => {
    setFile(null);
    if (thumbnailPreview) {
      URL.revokeObjectURL(thumbnailPreview);
    }
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setTitle('');
    setDescription('');
    setGalleryId('');
    setCategoryId('');
    setVisibility('public');
    setProcessStatus('');
    setProgress(0);
    setUploadedModel(null);
    const fileInput = document.getElementById('model-file-input');
    if (fileInput) fileInput.value = '';
    const thumbInput = document.getElementById('thumbnail-file-input');
    if (thumbInput) thumbInput.value = '';
  };

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.9rem', marginBottom: '6px' }}>Upload 3D / CAD Model</h1>
        <p style={{ color: '#64748b', fontSize: '0.92rem' }}>
          Upload high-resolution CAD or 3D files. Processed automatically into high-performance WebGL and WebAR assets.
        </p>
      </div>

      {/* Coin Balance & Top-up Notice */}
      {wallet.totalBalance < 25 ? (
        <div style={{
          background: '#fff1f2',
          border: '1px solid #fecdd3',
          borderRadius: '14px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '28px',
          boxShadow: '0 2px 10px rgba(225, 29, 72, 0.08)',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: '#ffe4e6',
              color: '#e11d48',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <AlertCircle size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#9f1239', fontSize: '0.94rem' }}>
                Insufficient Coins for Model Upload (25 Coins Required)
              </div>
              <div style={{ fontSize: '0.83rem', color: '#be123c', marginTop: '2px' }}>
                Uploading requires <strong>25 Coins</strong>. You currently have <strong>{wallet.totalBalance || 0} Coins</strong> ({25 - (wallet.totalBalance || 0)} more coins needed).
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTopUpModalOpen(true)}
            className="btn btn-primary"
            style={{
              background: 'linear-gradient(135deg, #e11d48, #be123c)',
              borderColor: '#be123c',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(225, 29, 72, 0.25)'
            }}
          >
            <Coins size={16} />
            <span>Top Up Coins Now</span>
          </button>
        </div>
      ) : (
        <div style={{
          background: '#f5f3ff',
          border: '1px solid #e9d5ff',
          borderRadius: '14px',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Coins size={20} color="#8b5cf6" />
            <div style={{ fontSize: '0.88rem', color: '#5b21b6' }}>
              Model upload cost: <strong>25 Coins</strong>. Coins are strictly deducted <strong>only after</strong> successful processing.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#6d28d9', background: '#ede9fe', padding: '6px 14px', borderRadius: '8px' }}>
              Available Balance: {wallet.totalBalance || 0} Coins
            </div>
          </div>
        </div>
      )}

      {/* Upload Completed View */}
      {processStatus === 'completed' && uploadedModel ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#ecfdf5',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px auto'
          }}>
            <CheckCircle2 size={36} />
          </div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '8px' }}>Model Successfully Processed!</h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: '520px', margin: '0 auto 24px auto' }}>
            "{uploadedModel.title}" is now ready for WebGL 3D inspection and instant WebAR placement. Exactly 25 coins were deducted from your wallet ledger.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '32px' }}>
            <button
              onClick={() => {
                setSelectedModelId(uploadedModel.id);
                if (setCurrentView) setCurrentView('model-detail');
                else setCurrentTab('my-models');
              }}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Eye size={18} />
              <span>Inspect in 3D Viewer</span>
            </button>
            <button
              onClick={() => {
                setSelectedModelId(uploadedModel.id);
                setCurrentTab('my-models');
              }}
              className="btn btn-secondary"
            >
              View in My Models
            </button>
            <button
              onClick={handleReset}
              className="btn btn-secondary"
            >
              Upload Another Model
            </button>
          </div>
        </div>
      ) : (
        /* Upload Form */
        <div className="card" style={{ padding: '36px' }}>
          <form onSubmit={handleSubmit}>
            {/* Drag & Drop Zone for 3D File */}
            <div
              style={{
                border: `2px dashed ${isDraggingModel ? '#8b5cf6' : file ? '#86efac' : '#cbd5e1'}`,
                borderRadius: '16px',
                padding: '34px 20px',
                textAlign: 'center',
                background: isDraggingModel ? '#f5f3ff' : file ? '#f0fdf4' : '#f8fafc',
                cursor: 'pointer',
                marginBottom: '24px',
                transition: 'all 0.2s ease'
              }}
              onClick={() => document.getElementById('model-file-input').click()}
              onDragOver={(e) => { e.preventDefault(); setIsDraggingModel(true); }}
              onDragLeave={() => setIsDraggingModel(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingModel(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  setFile(e.dataTransfer.files[0]);
                  if (wallet && typeof wallet.totalBalance === 'number' && wallet.totalBalance < 25) {
                    setTopUpModalOpen(true);
                  }
                }
              }}
            >
              <input
                id="model-file-input"
                type="file"
                accept=".glb,.gltf,.obj,.stl,.step,.stp,.zip"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '14px',
                background: file ? '#dcfce7' : '#f5f3ff',
                color: file ? '#10b981' : '#8b5cf6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px auto'
              }}>
                <UploadCloud size={26} />
              </div>
              <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '1rem', marginBottom: '4px' }}>
                {file ? file.name : 'Click to select or drag and drop your 3D CAD file'}
              </div>
              <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Supports GLB, GLTF, OBJ, STL, and STEP assemblies (up to 50 MB)
              </p>
              {file && (
                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
                  <span style={{ fontSize: '0.84rem', color: '#16a34a', fontWeight: 600 }}>
                    ✓ {(file.size / (1024 * 1024)).toFixed(2)} MB ready for conversion
                  </span>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dc2626',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      padding: 0
                    }}
                  >
                    Remove file
                  </button>
                </div>
              )}
            </div>

            {/* Thumbnail Upload Input */}
            <div className="form-group" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label className="form-label" style={{ marginBottom: 0, display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                  <ImageIcon size={16} color="#8b5cf6" />
                  <span>Model Thumbnail / Cover Image</span>
                </label>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Optional • Image preview for dashboard & QR cards
                </span>
              </div>

              <input
                id="thumbnail-file-input"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                style={{ display: 'none' }}
                onChange={handleThumbnailChange}
              />

              {!thumbnailPreview ? (
                <div
                  onClick={() => document.getElementById('thumbnail-file-input').click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingThumb(true); }}
                  onDragLeave={() => setIsDraggingThumb(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingThumb(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      processThumbnailFile(e.dataTransfer.files[0]);
                    }
                  }}
                  style={{
                    border: `1.5px dashed ${isDraggingThumb ? '#8b5cf6' : '#cbd5e1'}`,
                    borderRadius: '12px',
                    padding: '16px 20px',
                    background: isDraggingThumb ? '#f5f3ff' : '#f8fafc',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isDraggingThumb) {
                      e.currentTarget.style.borderColor = '#8b5cf6';
                      e.currentTarget.style.background = '#faf5ff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isDraggingThumb) {
                      e.currentTarget.style.borderColor = '#cbd5e1';
                      e.currentTarget.style.background = '#f8fafc';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      background: '#f3e8ff',
                      color: '#8b5cf6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <ImagePlus size={20} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem', marginBottom: '2px' }}>
                        Click or drag & drop to upload a thumbnail image
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        Supports PNG, JPG, JPEG, WEBP (recommended 16:9 or 4:3, max 15 MB)
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '6px 14px', pointerEvents: 'none', flexShrink: 0 }}
                  >
                    Select Image
                  </button>
                </div>
              ) : (
                /* Selected Thumbnail Preview Card */
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#ffffff',
                  border: '1.5px solid #a855f7',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  boxShadow: '0 2px 8px rgba(168, 85, 247, 0.08)',
                  gap: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                    <div style={{
                      width: '74px',
                      height: '52px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      background: '#f1f5f9',
                      flexShrink: 0,
                      border: '1px solid #e2e8f0',
                      position: 'relative'
                    }}>
                      <img
                        src={thumbnailPreview}
                        alt="Thumbnail preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <div style={{ minWidth: 0, textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {thumbnailFile?.name || 'Selected Thumbnail'}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                        <Check size={13} />
                        <span>Ready • {thumbnailFile ? (thumbnailFile.size / 1024).toFixed(1) + ' KB' : ''}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => document.getElementById('thumbnail-file-input').click()}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveThumbnail}
                      className="btn"
                      style={{
                        fontSize: '0.78rem',
                        padding: '6px 10px',
                        background: '#fee2e2',
                        color: '#dc2626',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}
                      title="Remove thumbnail"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Form Fields */}
            <div className="form-group">
              <label className="form-label">Model Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="form-input"
                placeholder="e.g. Apex CP-400 Industrial Centrifugal Pump"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Engineering / Asset Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="form-textarea"
                placeholder="Key technical specifications, materials, pressure ratings, dimensions, or installation instructions..."
              />
            </div>

            <div className="form-grid-2" style={{ marginBottom: '20px' }}>
              <div className="form-group">
                <label className="form-label">Gallery / Folder</label>
                <select
                  value={galleryId}
                  onChange={(e) => setGalleryId(e.target.value)}
                  className="form-select"
                >
                  <option value="">No Gallery (General)</option>
                  {galleries.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="form-select"
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Visibility Access</label>
              <div className="form-grid-2" style={{ gap: '14px' }}>
                <div
                  onClick={() => setVisibility('public')}
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    border: `1.5px solid ${visibility === 'public' ? '#8b5cf6' : '#e2e8f0'}`,
                    background: visibility === 'public' ? '#f5f3ff' : '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>Public Discovery</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Appears on public explore & shareable everywhere.</div>
                </div>

                <div
                  onClick={() => setVisibility('private')}
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    border: `1.5px solid ${visibility === 'private' ? '#8b5cf6' : '#e2e8f0'}`,
                    background: visibility === 'private' ? '#f5f3ff' : '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>Private Link</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Accessible only by team or users with secret share token.</div>
                </div>
              </div>
            </div>

            {/* Simulated Failure Toggle (to demonstrate Requirement 2: 0 coins deducted on fail) */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                  Simulate Geometry Processing Failure
                </div>
                <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                  Test platform guarantee: If conversion fails, 0 coins are charged.
                </div>
              </div>
              <input
                type="checkbox"
                checked={simulateFail}
                onChange={(e) => setSimulateFail(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </div>

            {/* Progress Bar during conversion */}
            {uploading && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 600, color: '#8b5cf6' }}>{processStatus}</span>
                  <span style={{ color: '#64748b' }}>{progress}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #8b5cf6, #7c3aed)', transition: 'width 0.4s' }} />
                </div>
              </div>
            )}

            {wallet.totalBalance < 25 ? (
              <button
                type="button"
                onClick={() => setTopUpModalOpen(true)}
                className="btn btn-primary btn-lg"
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #7c3aed, #9333ea)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)',
                  cursor: 'pointer'
                }}
              >
                <Coins size={20} color="#fbbf24" />
                <span>Top Up Coins to Upload (25 Coins Required • Balance: {wallet.totalBalance || 0})</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={uploading}
                className="btn btn-primary btn-lg"
                style={{ width: '100%' }}
              >
                <span>{uploading ? 'Processing 3D Asset...' : 'Upload & Process Model (25 Coins)'}</span>
              </button>
            )}
          </form>
        </div>
      )}

      {/* Coin Top-up Modal (Only rendered when user has insufficient coins) */}
      {wallet?.totalBalance < 25 && (
        <CoinTopUpModal
          isOpen={topUpModalOpen}
          onClose={() => setTopUpModalOpen(false)}
          requiredCoins={25}
          currentCoins={wallet?.totalBalance}
          actionTitle="Upload 3D Model"
          onSuccess={() => {
            // Wallet is automatically refreshed via AuthContext
          }}
        />
      )}
    </div>
  );
}
