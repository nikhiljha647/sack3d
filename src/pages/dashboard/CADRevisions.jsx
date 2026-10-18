import React, { useState, useEffect, useRef } from 'react';
import {
  GitBranch, Clock, CheckCircle2, RotateCcw,
  Coins, UploadCloud, ArrowRight,
  Eye, Zap, X, Download, Layers, Edit3, Save, Image as ImageIcon,
  Folder, Tag, Lock, Globe, RefreshCw, Check, ImagePlus
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Viewer3D from '../../components/Viewer3D';
import CoinTopUpModal from '../../components/CoinTopUpModal';

export default function CADRevisions({ selectedModelId }) {
  const { user, wallet, refreshContext } = useAuth();
  const { success, error } = useToast();

  const [models, setModels] = useState([]);
  const [activeModelId, setActiveModelId] = useState(selectedModelId || '');
  const [categories, setCategories] = useState([]);
  const [galleries, setGalleries] = useState([]);
  const [revisionStatus, setRevisionStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  // Active view tab: 'revisions' | 'metadata'
  const [activeTab, setActiveTab] = useState('revisions');

  // Coin top-up modal state
  const [topUpModalOpen, setTopUpModalOpen] = useState(false);

  // Form states for CAD Revision submission
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [resettingCooldown, setResettingCooldown] = useState(false);
  const [previewModalUrl, setPreviewModalUrl] = useState(null);
  const [previewModalTitle, setPreviewModalTitle] = useState('');

  const [isDraggingModel, setIsDraggingModel] = useState(false);
  const [isDraggingThumb, setIsDraggingThumb] = useState(false);

  // Model Details / Metadata Edit States
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editThumbnailUrl, setEditThumbnailUrl] = useState('');
  const [editThumbnailFile, setEditThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editGallery, setEditGallery] = useState('');
  const [editVisibility, setEditVisibility] = useState('public');
  const [editArEnabled, setEditArEnabled] = useState(true);
  const [editArActive, setEditArActive] = useState(true);
  const [savingDetails, setSavingDetails] = useState(false);

  const fileInputRef = useRef(null);
  const thumbnailInputRef = useRef(null);

  // Load models, categories, galleries
  const loadModels = async (selectId = null) => {
    try {
      const data = await api.getMyModels();
      setModels(data || []);
      if (data && data.length > 0) {
        if (selectId) {
          setActiveModelId(selectId);
        } else if (!activeModelId) {
          setActiveModelId(selectedModelId || data[0].id);
        }
      }
    } catch (err) {
      console.warn('Failed to load models:', err);
    }
  };

  useEffect(() => {
    loadModels(selectedModelId);
    api.getCategories().then(setCategories).catch(console.warn);
    api.getGalleries().then(setGalleries).catch(console.warn);
  }, []);

  // Sync when selectedModelId prop changes
  useEffect(() => {
    if (selectedModelId) {
      setActiveModelId(selectedModelId);
    }
  }, [selectedModelId]);

  const selectedModel = models.find((m) => m.id === activeModelId);

  // Sync edit form fields whenever selectedModel changes
  useEffect(() => {
    if (selectedModel) {
      setEditTitle(selectedModel.title || '');
      setEditDescription(selectedModel.description || '');
      setEditThumbnailUrl(selectedModel.thumbnail_url || '');
      setThumbnailPreview(selectedModel.thumbnail_url || '');
      setEditThumbnailFile(null);
      setEditCategory(selectedModel.category_id || '');
      setEditGallery(selectedModel.gallery_id || '');
      setEditVisibility(selectedModel.visibility || 'public');
      setEditArEnabled(selectedModel.ar_enabled === 1 || selectedModel.ar_enabled === true);
      setEditArActive(selectedModel.ar_active === 1 || selectedModel.ar_active === true);
    }
  }, [selectedModel]);

  // Fetch revision status when activeModelId changes
  const loadStatus = async () => {
    if (!activeModelId) return;
    setLoading(true);
    try {
      const status = await api.getCADStatus(activeModelId);
      setRevisionStatus(status);
    } catch (err) {
      error(err.message || 'Failed to fetch revision status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, [activeModelId]);

  // Process Thumbnail File
  const processThumbnailFile = (f) => {
    if (!f.type.startsWith('image/')) {
      error('Please select a valid image file (.png, .jpg, .jpeg, .webp)');
      return;
    }
    if (f.size > 15 * 1024 * 1024) {
      error('Thumbnail file size should be under 15 MB');
      return;
    }
    if (thumbnailPreview && thumbnailPreview.startsWith('blob:')) {
      URL.revokeObjectURL(thumbnailPreview);
    }
    setEditThumbnailFile(f);
    setThumbnailPreview(URL.createObjectURL(f));
  };

  const handleThumbnailChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processThumbnailFile(e.target.files[0]);
    }
  };

  const handleRemoveThumbnail = (e) => {
    if (e) e.stopPropagation();
    if (thumbnailPreview && thumbnailPreview.startsWith('blob:')) {
      URL.revokeObjectURL(thumbnailPreview);
    }
    setEditThumbnailFile(null);
    setEditThumbnailUrl('');
    setThumbnailPreview('');
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      if (revisionStatus && revisionStatus.cost > 0 && wallet && typeof wallet.totalBalance === 'number' && wallet.totalBalance < revisionStatus.cost) {
        setTopUpModalOpen(true);
      }
    }
  };

  const handleRemoveFile = (e) => {
    if (e) e.stopPropagation();
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Save Model Details (Title, Description, Thumbnail, Category, Gallery, Visibility, AR)
  const handleSaveModelDetails = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!activeModelId) {
      error('Please select a model first');
      return;
    }
    if (!editTitle || !editTitle.trim()) {
      error('Model title cannot be empty');
      return;
    }

    setSavingDetails(true);
    try {
      let payload;
      if (editThumbnailFile) {
        payload = new FormData();
        payload.append('title', editTitle.trim());
        payload.append('description', editDescription ? editDescription.trim() : '');
        payload.append('thumbnail', editThumbnailFile);
        payload.append('categoryId', editCategory || '');
        payload.append('galleryId', editGallery || '');
        payload.append('visibility', editVisibility);
        payload.append('arEnabled', editArEnabled);
        payload.append('arActive', editArActive);
      } else {
        payload = {
          title: editTitle.trim(),
          description: editDescription ? editDescription.trim() : '',
          thumbnailUrl: editThumbnailUrl ? editThumbnailUrl.trim() : '',
          categoryId: editCategory || null,
          galleryId: editGallery || null,
          visibility: editVisibility,
          arEnabled: editArEnabled,
          arActive: editArActive
        };
      }

      const res = await api.updateModel(activeModelId, payload);
      confetti({ particleCount: 60, spread: 55 });
      success(res.message || 'Model details updated successfully!');
      setEditThumbnailFile(null);
      if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';

      await refreshContext();
      await loadModels(activeModelId);
    } catch (err) {
      error(err.message || 'Failed to update model details');
    } finally {
      setSavingDetails(false);
    }
  };

  // Submit CAD Revision or Update Model Information
  const handleSubmitRevision = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!activeModelId) {
      error('Please select a model first');
      return;
    }
    if (!editTitle || !editTitle.trim()) {
      error('Please enter a model title');
      return;
    }

    // CASE 1: 3D CAD File is selected -> publish CAD revision + bump version + update all metadata
    if (file) {
      if (revisionStatus && revisionStatus.cost > 0 && (wallet?.totalBalance || 0) < revisionStatus.cost) {
        setTopUpModalOpen(true);
        error(`Insufficient coins. This revision requires ${revisionStatus.cost} coins. (Balance: ${wallet?.totalBalance || 0})`);
        return;
      }

      setSubmitting(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const nextVer = (selectedModel?.current_version || 1) + 1;
        formData.append('notes', notes.trim() || `CAD Revision update v${nextVer}`);
        formData.append('title', editTitle.trim());
        formData.append('description', editDescription ? editDescription.trim() : '');
        if (editThumbnailFile) {
          formData.append('thumbnail', editThumbnailFile);
        } else if (editThumbnailUrl && editThumbnailUrl.trim()) {
          formData.append('thumbnailUrl', editThumbnailUrl.trim());
        }
        formData.append('categoryId', editCategory || '');
        formData.append('galleryId', editGallery || '');
        formData.append('visibility', editVisibility);
        formData.append('arEnabled', editArEnabled);
        formData.append('arActive', editArActive);

        const res = await api.submitCADRevision(activeModelId, formData);
        confetti({ particleCount: 80, spread: 70 });
        success(res.message || `CAD revision v${nextVer} submitted and model information updated successfully!`);
        setNotes('');
        setFile(null);
        setEditThumbnailFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';

        await refreshContext();
        await loadModels(activeModelId);
        await loadStatus();
      } catch (err) {
        error(err.message || 'Revision submission failed');
      } finally {
        setSubmitting(false);
      }
    } else {
      // CASE 2: No new CAD file selected -> Update model information, category, gallery, thumbnail, visibility
      setSubmitting(true);
      try {
        await handleSaveModelDetails();
      } finally {
        setSubmitting(false);
      }
    }
  };

  // Rollback Version
  const handleRollback = async (versionNumber) => {
    if (!window.confirm(`Rollback this model to Version #${versionNumber}? Active 3D geometry and file data will be restored.`)) return;
    try {
      const res = await api.rollbackVersion(activeModelId, versionNumber);
      success(res.message || `Model restored to Version #${versionNumber}`);
      await refreshContext();
      await loadModels(activeModelId);
      await loadStatus();
    } catch (err) {
      error(err.message || 'Rollback failed');
    }
  };

  // Clear Cooldown
  const handleResetCooldown = async () => {
    setResettingCooldown(true);
    try {
      await api.resetCADCooldown(activeModelId);
      success('Engineering cooldown cleared. You can now submit revisions immediately.');
      await loadStatus();
    } catch (err) {
      error(err.message || 'Failed to reset cooldown');
    } finally {
      setResettingCooldown(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.9rem', marginBottom: '4px' }}>CAD Revisions & Asset Management</h1>
        <p style={{ color: '#64748b', fontSize: '0.92rem' }}>
          Inspect revision cycles, update model metadata (title, description, thumbnail), manage 24h engineering cooldowns, and restore prior CAD versions.
        </p>
      </div>

      {/* Model Selector Bar */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '16px 20px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', flex: 1 }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap' }}>
            Selected Model:
          </label>
          <select
            value={activeModelId}
            onChange={(e) => setActiveModelId(e.target.value)}
            className="form-select"
            style={{ minWidth: '320px', maxWidth: '480px', fontSize: '0.92rem', fontWeight: 600, color: '#0f172a' }}
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title} (v{m.current_version || 1}) — .{(m.original_file_format || 'glb').toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {selectedModel && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => {
                setPreviewModalUrl(selectedModel.web_ready_file_url);
                setPreviewModalTitle(`${selectedModel.title} (Current v${selectedModel.current_version})`);
              }}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
            >
              <Eye size={15} />
              <span>Preview 3D</span>
            </button>
            <a
              href={`/model/${selectedModel.id}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '0.82rem', color: '#64748b' }}
            >
              <Globe size={14} />
              <span>Public Page</span>
            </a>
          </div>
        )}
      </div>

      {/* Selected Model Quick Summary Card */}
      {selectedModel && (
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '18px 22px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '18px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '10px',
              overflow: 'hidden',
              border: '2px solid #e2e8f0',
              background: '#f1f5f9',
              flexShrink: 0
            }}>
              <img
                src={selectedModel.thumbnail_url || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=200&q=80'}
                alt={selectedModel.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=200&q=80';
                }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {selectedModel.title}
                </h2>
                <span className="badge badge-primary" style={{ fontWeight: 700 }}>
                  v{selectedModel.current_version || 1}
                </span>
                <span className={`badge ${selectedModel.visibility === 'public' ? 'badge-success' : 'badge-warning'}`}>
                  {selectedModel.visibility === 'public' ? 'Public Discovery' : 'Private Access'}
                </span>
              </div>
              <p style={{ fontSize: '0.84rem', color: '#64748b', margin: 0, maxWidth: '600px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedModel.description || 'No engineering description set yet.'}
              </p>
              <div style={{ display: 'flex', gap: '12px', fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>
                <span>File: <strong>{selectedModel.original_file_name || 'model.glb'}</strong></span>
                <span>• Format: <strong>.{(selectedModel.original_file_format || 'glb').toUpperCase()}</strong></span>
                <span>• Size: <strong>{((selectedModel.original_file_size || 0) / (1024 * 1024)).toFixed(1)} MB</strong></span>
              </div>
            </div>
          </div>

          {/* Tab Switcher Buttons */}
          <div style={{
            display: 'flex',
            background: '#f1f5f9',
            padding: '4px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0'
          }}>
            <button
              onClick={() => setActiveTab('revisions')}
              className="btn btn-sm"
              style={{
                background: activeTab === 'revisions' ? '#ffffff' : 'transparent',
                color: activeTab === 'revisions' ? '#8b5cf6' : '#64748b',
                fontWeight: activeTab === 'revisions' ? 700 : 500,
                boxShadow: activeTab === 'revisions' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <GitBranch size={15} />
              <span>CAD Revisions & Versioning</span>
            </button>
            <button
              onClick={() => setActiveTab('metadata')}
              className="btn btn-sm"
              style={{
                background: activeTab === 'metadata' ? '#ffffff' : 'transparent',
                color: activeTab === 'metadata' ? '#8b5cf6' : '#64748b',
                fontWeight: activeTab === 'metadata' ? 700 : 500,
                boxShadow: activeTab === 'metadata' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Edit3 size={15} />
              <span>Edit Model Details & Thumbnail</span>
            </button>
          </div>
        </div>
      )}

      {/* VIEW 1: EDIT MODEL DETAILS & METADATA */}
      {activeTab === 'metadata' && selectedModel && (
        <div className="card" style={{ padding: '32px', marginBottom: '28px', maxWidth: '980px', margin: '0 auto 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                Edit Model Information & Presentation
              </h2>
              <p style={{ fontSize: '0.86rem', color: '#64748b', margin: 0 }}>
                Update the asset title, engineering description, thumbnail showcase image, category taxonomy, and visibility.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('revisions')}
              className="btn btn-ghost btn-sm"
              style={{ color: '#64748b' }}
            >
              <span>Back to CAD Revisions</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <form onSubmit={handleSaveModelDetails}>
            <div className="responsive-split" style={{ gap: '32px' }}>
              {/* Left Column: Title, Description, Categorization */}
              <div>
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label" style={{ fontWeight: 700, color: '#1e293b' }}>
                    Model Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="form-input"
                    placeholder="e.g. Industrial Hydraulic Pump Assembly v4"
                    style={{ fontSize: '0.95rem' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label" style={{ fontWeight: 700, color: '#1e293b' }}>
                    Engineering Description & Overview
                  </label>
                  <textarea
                    rows={5}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="form-textarea"
                    placeholder="Provide engineering specifications, mechanical tolerances, materials, or intended applications..."
                    style={{ fontSize: '0.9rem', lineHeight: 1.5 }}
                  />
                </div>

                <div className="form-grid-2" style={{ marginBottom: '20px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Tag size={14} color="#8b5cf6" />
                      <span>Category</span>
                    </label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="form-select"
                      style={{ fontSize: '0.88rem' }}
                    >
                      <option value="">-- Select Category --</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Folder size={14} color="#8b5cf6" />
                      <span>Showcase Gallery</span>
                    </label>
                    <select
                      value={editGallery}
                      onChange={(e) => setEditGallery(e.target.value)}
                      className="form-select"
                      style={{ fontSize: '0.88rem' }}
                    >
                      <option value="">-- No Gallery (Unassigned) --</option>
                      {galleries.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-grid-2" style={{ marginBottom: '20px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, color: '#334155' }}>
                      Access Visibility
                    </label>
                    <select
                      value={editVisibility}
                      onChange={(e) => setEditVisibility(e.target.value)}
                      className="form-select"
                      style={{ fontSize: '0.88rem' }}
                    >
                      <option value="public">Public (Discoverable & Shared)</option>
                      <option value="private">Private (Restricted Access Token)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, color: '#334155' }}>
                      WebAR Controls
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '6px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={editArEnabled}
                          onChange={(e) => setEditArEnabled(e.target.checked)}
                        />
                        <span>Enable Mobile WebAR QuickLook</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={editArActive}
                          onChange={(e) => setEditArActive(e.target.checked)}
                        />
                        <span>Active in AR Showroom</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Thumbnail Showcase Manager */}
              <div>
                <label className="form-label" style={{ fontWeight: 700, color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ImageIcon size={16} color="#8b5cf6" />
                  <span>Model Showcase Thumbnail</span>
                </label>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '12px' }}>
                  Featured image shown in galleries, card previews, QR sheets, and social embeds.
                </p>

                {/* Thumbnail Preview Box */}
                <div style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: '12px',
                  padding: '16px',
                  background: '#f8fafc',
                  textAlign: 'center',
                  marginBottom: '18px'
                }}>
                  <div style={{
                    width: '100%',
                    height: '210px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    background: '#e2e8f0',
                    marginBottom: '12px',
                    position: 'relative'
                  }}>
                    <img
                      src={thumbnailPreview || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80'}
                      alt="Thumbnail Preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80';
                      }}
                    />
                    {editThumbnailFile && (
                      <span className="badge badge-success" style={{ position: 'absolute', top: '10px', right: '10px' }}>
                        New Image Ready
                      </span>
                    )}
                  </div>

                  {/* Thumbnail File Upload */}
                  <input
                    ref={thumbnailInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    onChange={handleThumbnailFileSelect}
                    style={{ display: 'none' }}
                    id="thumbnail-upload-input"
                  />
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <label
                      htmlFor="thumbnail-upload-input"
                      className="btn btn-secondary btn-sm"
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <UploadCloud size={14} />
                      <span>Upload New Image</span>
                    </label>
                    {editThumbnailFile && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditThumbnailFile(null);
                          setThumbnailPreview(selectedModel.thumbnail_url || '');
                          if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
                        }}
                        className="btn btn-ghost btn-sm"
                        style={{ color: '#ef4444' }}
                      >
                        <X size={14} />
                        <span>Cancel New Image</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Or enter image URL */}
                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="form-label" style={{ fontSize: '0.82rem', color: '#475569' }}>
                    Or Enter Image URL:
                  </label>
                  <input
                    type="url"
                    value={editThumbnailUrl}
                    onChange={(e) => {
                      setEditThumbnailUrl(e.target.value);
                      if (!editThumbnailFile) {
                        setThumbnailPreview(e.target.value);
                      }
                    }}
                    placeholder="https://images.unsplash.com/..."
                    className="form-input"
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>

                {/* Preset Suggestions */}
                <div style={{ background: '#f1f5f9', padding: '12px', borderRadius: '8px', fontSize: '0.78rem', color: '#64748b' }}>
                  <span style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Quick Unsplash Presets:</span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => {
                        const url = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80';
                        setEditThumbnailUrl(url);
                        setThumbnailPreview(url);
                        setEditThumbnailFile(null);
                      }}
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '2px 8px', fontSize: '0.74rem', background: '#ffffff' }}
                    >
                      Industrial CAD
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const url = 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80';
                        setEditThumbnailUrl(url);
                        setThumbnailPreview(url);
                        setEditThumbnailFile(null);
                      }}
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '2px 8px', fontSize: '0.74rem', background: '#ffffff' }}
                    >
                      Machinery
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const url = 'https://images.unsplash.com/photo-1517420704952-d9f39e95b43e?auto=format&fit=crop&w=800&q=80';
                        setEditThumbnailUrl(url);
                        setThumbnailPreview(url);
                        setEditThumbnailFile(null);
                      }}
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '2px 8px', fontSize: '0.74rem', background: '#ffffff' }}
                    >
                      Electronics & Tech
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Buttons Bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '28px',
              borderTop: '1px solid #f1f5f9',
              paddingTop: '20px'
            }}>
              <button
                type="button"
                onClick={() => setActiveTab('revisions')}
                className="btn btn-secondary"
                disabled={savingDetails}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingDetails}
                className="btn btn-primary"
                style={{ minWidth: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {savingDetails ? (
                  <>
                    <RefreshCw size={16} className="spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Save Model Details</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW 2: CAD REVISIONS & VERSION CONTROL */}
      {activeTab === 'revisions' && (
        <div>
          {loading ? (
            <div style={{ color: '#64748b', padding: '40px 0', textAlign: 'center' }}>
              Loading CAD revision status...
            </div>
          ) : revisionStatus && (
            <div className="dashboard-split-grid" style={{ gap: '28px', alignItems: 'start' }}>
              {/* Left Column: Revision Ledger & History */}
              <div>
                {/* Status Summary Card */}
                <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Revision Status</h3>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span className="badge badge-primary">
                        Plan: {(revisionStatus.plan || 'Free').toUpperCase()}
                      </span>
                      <button
                        onClick={() => setActiveTab('metadata')}
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '0.78rem', padding: '2px 8px', color: '#8b5cf6' }}
                        title="Edit title, description, or thumbnail"
                      >
                        <Edit3 size={13} style={{ marginRight: '4px' }} />
                        <span>Edit Info</span>
                      </button>
                    </div>
                  </div>

                  <div className="packages-grid-3" style={{ gap: '14px', textAlign: 'center' }}>
                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{revisionStatus.currentRevisionsCount}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Total Revisions</div>
                    </div>
                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#8b5cf6' }}>{revisionStatus.maxAllowed}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Max Allowed</div>
                    </div>
                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: revisionStatus.cost > 0 ? '#d97706' : '#10b981' }}>
                        {revisionStatus.cost} Coins
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Next Revision Cost</div>
                    </div>
                  </div>
                </div>

                {/* Cooldown Alert Banner */}
                {revisionStatus.cooldownActive ? (
                  <div style={{
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '14px',
                    marginBottom: '24px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Clock size={24} color="#d97706" style={{ flexShrink: 0 }} />
                      <div>
                        <h4 style={{ fontSize: '0.95rem', color: '#92400e', marginBottom: '2px' }}>
                          24-Hour Engineering Cooldown Active
                        </h4>
                        <p style={{ fontSize: '0.82rem', color: '#b45309', margin: 0 }}>
                          Next revision unlocked in {revisionStatus.cooldownHoursRemaining} hour(s) (available at {new Date(revisionStatus.nextAvailableAt).toLocaleTimeString()}).
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleResetCooldown}
                      disabled={resettingCooldown}
                      className="btn btn-secondary btn-sm"
                      title="Fast-track cooldown for testing"
                      style={{
                        flexShrink: 0,
                        background: '#ffffff',
                        border: '1px solid #f59e0b',
                        color: '#b45309',
                        fontSize: '0.78rem'
                      }}
                    >
                      <Zap size={14} />
                      <span>{resettingCooldown ? 'Resetting...' : 'Clear Cooldown'}</span>
                    </button>
                  </div>
                ) : (
                  <div style={{
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '24px'
                  }}>
                    <CheckCircle2 size={20} color="#10b981" />
                    <span style={{ fontSize: '0.88rem', color: '#065f46', fontWeight: 600 }}>
                      Ready for CAD Revision. No active cooldown lock on this model.
                    </span>
                  </div>
                )}

                {/* Past Revisions List */}
                <div className="card">
                  <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Revision History Log</h3>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {revisionStatus.revisions?.length || 0} revision record(s)
                    </span>
                  </div>
                  <div style={{ padding: '8px 0' }}>
                    {(!revisionStatus.revisions || revisionStatus.revisions.length === 0) ? (
                      <div style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                        <Layers size={32} color="#cbd5e1" style={{ margin: '0 auto 10px', display: 'block' }} />
                        <p style={{ fontWeight: 600, marginBottom: '4px' }}>No prior CAD revisions recorded yet.</p>
                        <p style={{ fontSize: '0.82rem' }}>Upload an updated CAD file using the form to publish Version #{(selectedModel?.current_version || 1) + 1}.</p>
                      </div>
                    ) : (
                      revisionStatus.revisions.map((rev) => (
                        <div
                          key={rev.id}
                          style={{
                            padding: '16px 24px',
                            borderBottom: '1px solid #f1f5f9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '16px'
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <span style={{ fontWeight: 700, color: '#8b5cf6', fontSize: '0.95rem' }}>
                                Rev #{rev.revision_number}
                              </span>
                              <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 500 }}>
                                ({rev.original_file_name})
                              </span>
                              <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
                                {rev.status}
                              </span>
                              {rev.revision_number === selectedModel?.current_version && (
                                <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                                  Active Model
                                </span>
                              )}
                            </div>

                            <div style={{ fontSize: '0.85rem', color: '#334155', marginBottom: '4px' }}>
                              {rev.notes}
                            </div>

                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                              <span>By {rev.submitter_name || 'Engineer'}</span>
                              <span>• {new Date(rev.created_at).toLocaleString()}</span>
                              <span>• {((rev.file_size || 0) / (1024 * 1024)).toFixed(2)} MB</span>
                              {rev.coins_charged > 0 && <span>• {rev.coins_charged} coins charged</span>}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {/* Preview 3D revision button */}
                            {rev.file_path && rev.file_path.endsWith('.glb') && (
                              <button
                                onClick={() => {
                                  setPreviewModalUrl(rev.file_path);
                                  setPreviewModalTitle(`Revision #${rev.revision_number} — ${rev.original_file_name}`);
                                }}
                                className="btn btn-ghost btn-sm"
                                title="Preview 3D geometry of this revision"
                                style={{ fontSize: '0.78rem' }}
                              >
                                <Eye size={14} />
                              </button>
                            )}

                            {/* Download button */}
                            {rev.file_path && (
                              <a
                                href={rev.file_path}
                                download={rev.original_file_name}
                                className="btn btn-ghost btn-sm"
                                title="Download revision CAD file"
                                style={{ fontSize: '0.78rem' }}
                              >
                                <Download size={14} />
                              </a>
                            )}

                            {/* Rollback button */}
                            {rev.revision_number !== selectedModel?.current_version && (
                              <button
                                onClick={() => handleRollback(rev.revision_number)}
                                className="btn btn-secondary btn-sm"
                                title={revisionStatus.hasVersionHistory ? "Restore this version" : "Restore this version (10 Coins)"}
                                style={{ fontSize: '0.78rem' }}
                              >
                                <RotateCcw size={14} />
                                <span>{revisionStatus.hasVersionHistory ? 'Rollback' : 'Rollback (10 Coins)'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Submit New CAD Revision & Update Model Form */}
              <div className="card" style={{ padding: '28px', height: 'fit-content' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.22rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      Submit CAD Revision & Update Model
                    </h3>
                    <p style={{ fontSize: '0.84rem', color: '#64748b', marginTop: '4px', marginBottom: 0, lineHeight: 1.5 }}>
                      Upload an updated CAD file to publish <strong>v{(selectedModel?.current_version || 1) + 1}</strong>, or update all model metadata, thumbnail, and showcase settings.
                    </p>
                  </div>
                  <span className="badge badge-primary" style={{ flexShrink: 0, fontWeight: 700 }}>
                    Active v{selectedModel?.current_version || 1}
                  </span>
                </div>

                <form onSubmit={handleSubmitRevision} style={{ marginTop: '18px' }}>
                  {/* 1. Updated CAD / 3D Geometry File Dropzone */}
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label className="form-label" style={{ fontWeight: 700, color: '#1e293b', marginBottom: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <UploadCloud size={16} color="#8b5cf6" />
                        <span>Updated CAD / 3D File</span>
                        <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 400 }}>(Optional if updating info only)</span>
                      </label>
                      <span style={{ fontSize: '0.74rem', color: '#64748b' }}>.glb, .gltf, .step, .stp, .obj, .stl (up to 50 MB)</span>
                    </div>

                    <div
                      style={{
                        border: `2px dashed ${isDraggingModel ? '#8b5cf6' : file ? '#86efac' : '#cbd5e1'}`,
                        borderRadius: '14px',
                        padding: '22px 16px',
                        textAlign: 'center',
                        background: isDraggingModel ? '#f5f3ff' : file ? '#f0fdf4' : '#f8fafc',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onClick={() => fileInputRef.current && fileInputRef.current.click()}
                      onDragOver={(e) => { e.preventDefault(); setIsDraggingModel(true); }}
                      onDragLeave={() => setIsDraggingModel(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingModel(false);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          setFile(e.dataTransfer.files[0]);
                          if (revisionStatus && revisionStatus.cost > 0 && wallet && typeof wallet.totalBalance === 'number' && wallet.totalBalance < revisionStatus.cost) {
                            setTopUpModalOpen(true);
                          }
                        }
                      }}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".glb,.gltf,.step,.stp,.obj,.stl,.zip"
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                      />
                      <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '12px',
                        background: file ? '#dcfce7' : '#f5f3ff',
                        color: file ? '#10b981' : '#8b5cf6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 8px auto'
                      }}>
                        <UploadCloud size={22} />
                      </div>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.92rem', marginBottom: '2px' }}>
                        {file ? file.name : 'Click to select or drag and drop updated 3D CAD file'}
                      </div>
                      <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                        {file ? `Ready to bump model to v${(selectedModel?.current_version || 1) + 1}` : 'Leave empty if you only wish to update model title, thumbnail, or metadata'}
                      </p>
                      {file && (
                        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '0.82rem', color: '#16a34a', fontWeight: 600 }}>
                            ✓ {(file.size / (1024 * 1024)).toFixed(2)} MB ready
                          </span>
                          <button
                            type="button"
                            onClick={handleRemoveFile}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#dc2626',
                              fontSize: '0.78rem',
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
                  </div>

                  {/* 2. Engineering Change Notes */}
                  <div className="form-group" style={{ marginBottom: '18px' }}>
                    <label className="form-label" style={{ fontWeight: 700, color: '#1e293b' }}>
                      Engineering Change Notes <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Optional)</span>
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="form-textarea"
                      placeholder={`Detail mechanical or geometric updates for v${(selectedModel?.current_version || 1) + 1} (e.g., increased wall thickness to 3.5mm, updated suction flange bolt circle)...`}
                      style={{ fontSize: '0.88rem' }}
                    />
                  </div>

                  {/* 3. Model Title */}
                  <div className="form-group" style={{ marginBottom: '18px' }}>
                    <label className="form-label" style={{ fontWeight: 700, color: '#1e293b' }}>
                      Model Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="form-input"
                      placeholder="e.g. Apex CP-400 Industrial Centrifugal Pump"
                      style={{ fontSize: '0.92rem' }}
                    />
                  </div>

                  {/* 4. Engineering / Asset Description */}
                  <div className="form-group" style={{ marginBottom: '18px' }}>
                    <label className="form-label" style={{ fontWeight: 700, color: '#1e293b' }}>
                      Engineering / Asset Description
                    </label>
                    <textarea
                      rows={3}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="form-textarea"
                      placeholder="Key technical specifications, materials, pressure ratings, dimensions, or installation instructions..."
                      style={{ fontSize: '0.88rem' }}
                    />
                  </div>

                  {/* 5. Model Thumbnail / Cover Image */}
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <label className="form-label" style={{ marginBottom: 0, fontWeight: 700, color: '#1e293b', display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                        <ImageIcon size={16} color="#8b5cf6" />
                        <span>Model Thumbnail / Cover Image</span>
                      </label>
                      <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                        Image preview for dashboard, AR QR cards & showcase
                      </span>
                    </div>

                    <input
                      ref={thumbnailInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      style={{ display: 'none' }}
                      onChange={handleThumbnailChange}
                    />

                    {thumbnailPreview ? (
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
                              onError={(e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80';
                              }}
                            />
                          </div>
                          <div style={{ minWidth: 0, textAlign: 'left' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {editThumbnailFile?.name || 'Active Thumbnail Image'}
                            </div>
                            <div style={{ fontSize: '0.76rem', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                              <Check size={13} />
                              <span>{editThumbnailFile ? `New image ready • ${(editThumbnailFile.size / 1024).toFixed(1)} KB` : 'Currently active image'}</span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={() => thumbnailInputRef.current && thumbnailInputRef.current.click()}
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
                    ) : (
                      <div
                        onClick={() => thumbnailInputRef.current && thumbnailInputRef.current.click()}
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
                              Click or drag & drop to upload thumbnail
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                              Supports PNG, JPG, JPEG, WEBP (max 15 MB)
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
                    )}

                    {/* Quick Preset Buttons or URL */}
                    <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Presets:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const url = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80';
                          setEditThumbnailUrl(url);
                          setThumbnailPreview(url);
                          setEditThumbnailFile(null);
                        }}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '2px 8px', fontSize: '0.73rem', background: '#f8fafc', border: '1px solid #e2e8f0' }}
                      >
                        Industrial CAD
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const url = 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80';
                          setEditThumbnailUrl(url);
                          setThumbnailPreview(url);
                          setEditThumbnailFile(null);
                        }}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '2px 8px', fontSize: '0.73rem', background: '#f8fafc', border: '1px solid #e2e8f0' }}
                      >
                        Machinery
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const url = 'https://images.unsplash.com/photo-1517420704952-d9f39e95b43e?auto=format&fit=crop&w=800&q=80';
                          setEditThumbnailUrl(url);
                          setThumbnailPreview(url);
                          setEditThumbnailFile(null);
                        }}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '2px 8px', fontSize: '0.73rem', background: '#f8fafc', border: '1px solid #e2e8f0' }}
                      >
                        Electronics
                      </button>
                    </div>
                  </div>

                  {/* 6. Gallery / Folder & Category / Industry */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Folder size={15} color="#8b5cf6" />
                        <span>Gallery / Folder</span>
                      </label>
                      <select
                        value={editGallery}
                        onChange={(e) => setEditGallery(e.target.value)}
                        className="form-select"
                        style={{ fontSize: '0.88rem' }}
                      >
                        <option value="">No Gallery (General)</option>
                        {galleries.map((g) => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Tag size={15} color="#8b5cf6" />
                        <span>Category / Industry</span>
                      </label>
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="form-select"
                        style={{ fontSize: '0.88rem' }}
                      >
                        <option value="">Select Category</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 7. Visibility Access */}
                  <div className="form-group" style={{ marginBottom: '18px' }}>
                    <label className="form-label" style={{ fontWeight: 700, color: '#1e293b' }}>
                      Visibility Access
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div
                        onClick={() => setEditVisibility('public')}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '10px',
                          border: `1.5px solid ${editVisibility === 'public' ? '#8b5cf6' : '#e2e8f0'}`,
                          background: editVisibility === 'public' ? '#f5f3ff' : '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: editVisibility === 'public' ? '#6d28d9' : '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Globe size={15} />
                          <span>Public Discovery</span>
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>
                          Appears on public explore & shareable everywhere.
                        </div>
                      </div>

                      <div
                        onClick={() => setEditVisibility('private')}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '10px',
                          border: `1.5px solid ${editVisibility === 'private' ? '#8b5cf6' : '#e2e8f0'}`,
                          background: editVisibility === 'private' ? '#f5f3ff' : '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: editVisibility === 'private' ? '#6d28d9' : '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Lock size={15} />
                          <span>Private Link</span>
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>
                          Accessible only via direct link or team.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 8. WebAR & Showroom Controls */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    marginBottom: '20px',
                    background: '#f8fafc',
                    padding: '14px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={editArEnabled}
                        onChange={(e) => setEditArEnabled(e.target.checked)}
                        style={{ width: '16px', height: '16px', marginTop: '2px', accentColor: '#8b5cf6' }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#1e293b' }}>
                          Enable Mobile WebAR
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                          Instant AR QuickLook on iOS & Android
                        </div>
                      </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={editArActive}
                        onChange={(e) => setEditArActive(e.target.checked)}
                        style={{ width: '16px', height: '16px', marginTop: '2px', accentColor: '#8b5cf6' }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#1e293b' }}>
                          Active in AR Showroom
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                          Include in business showroom catalog
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* 9. Cost & Balance Indicator */}
                  <div style={{
                    background: (file && revisionStatus?.cost > 0 && (wallet?.totalBalance || 0) < revisionStatus?.cost) ? '#fff1f2' : '#f8fafc',
                    border: `1px solid ${(file && revisionStatus?.cost > 0 && (wallet?.totalBalance || 0) < revisionStatus?.cost) ? '#fecdd3' : '#e2e8f0'}`,
                    padding: '12px 16px',
                    borderRadius: '10px',
                    fontSize: '0.84rem',
                    color: '#475569',
                    marginBottom: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}>
                    <div>
                      <span>{file ? 'Cost for CAD revision: ' : 'Model info update: '}</span>
                      <strong style={{ color: '#0f172a' }}>{file ? `${revisionStatus?.cost || 0} Coins` : '0 Coins'}</strong>
                      {file && revisionStatus?.cost === 0 ? (
                        <span style={{ color: '#10b981', marginLeft: '6px', fontWeight: 600 }}>
                          (Included in Plan)
                        </span>
                      ) : file && (wallet?.totalBalance || 0) < revisionStatus?.cost ? (
                        <span style={{ color: '#e11d48', marginLeft: '6px', fontWeight: 600 }}>
                          (Insufficient Balance)
                        </span>
                      ) : null}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Wallet: <strong>{wallet?.totalBalance || 0} Coins</strong>
                      </div>
                      {file && revisionStatus?.cost > 0 && (
                        <button
                          type="button"
                          onClick={() => setTopUpModalOpen(true)}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.75rem', padding: '3px 8px', color: '#7c3aed', borderColor: '#c4b5fd' }}
                        >
                          <Coins size={13} />
                          <span>Top Up</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 10. Submit Button */}
                  {file && revisionStatus?.cost > 0 && (wallet?.totalBalance || 0) < revisionStatus?.cost ? (
                    <button
                      type="button"
                      onClick={() => setTopUpModalOpen(true)}
                      className="btn btn-primary"
                      style={{
                        width: '100%',
                        padding: '13px',
                        fontSize: '0.95rem',
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #7c3aed, #9333ea)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      <Coins size={18} color="#fbbf24" />
                      <span>Top Up Coins for Revision ({revisionStatus.cost} Coins Required)</span>
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={submitting || (file && revisionStatus?.cooldownActive && user?.role !== 'admin') || (file && !revisionStatus?.allowedToSubmit)}
                      className="btn btn-primary"
                      style={{
                        width: '100%',
                        padding: '13px',
                        fontSize: '0.95rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        background: file ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : 'linear-gradient(135deg, #3b82f6, #2563eb)'
                      }}
                    >
                      {submitting ? (
                        <>
                          <RefreshCw size={16} className="spin" />
                          <span>{file ? 'Submitting CAD Revision...' : 'Updating Model Details...'}</span>
                        </>
                      ) : file ? (
                        <>
                          <GitBranch size={16} />
                          <span>Submit Revision & Update Model (Publish v{(selectedModel?.current_version || 1) + 1})</span>
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          <span>Save & Update Model Details</span>
                        </>
                      )}
                    </button>
                  )}

                  {file && revisionStatus?.cooldownActive && user?.role !== 'admin' && (
                    <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#b45309', textAlign: 'center' }}>
                      Revision upload disabled during active cooldown period. Use "Clear Cooldown" above to fast-track.
                    </div>
                  )}
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3D Geometry Preview Modal */}
      {previewModalUrl && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '850px',
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>
                {previewModalTitle || '3D Model Preview'}
              </h3>
              <button
                onClick={() => setPreviewModalUrl(null)}
                className="btn btn-ghost btn-sm"
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ height: '480px' }}>
              <Viewer3D
                modelUrl={previewModalUrl}
                title={previewModalTitle}
                height="480px"
              />
            </div>
          </div>
        </div>
      )}

      {/* Coin Top-up Modal */}
      <CoinTopUpModal
        isOpen={topUpModalOpen}
        onClose={() => setTopUpModalOpen(false)}
        requiredCoins={revisionStatus?.cost || 25}
        currentCoins={wallet?.totalBalance}
        actionTitle="Submit CAD Revision"
        onSuccess={() => {
          loadStatus();
        }}
      />
    </div>
  );
}
