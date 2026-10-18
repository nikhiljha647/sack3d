import React, { useState, useEffect, useRef } from 'react';
import {
  Folder, Plus, Edit2, Trash2, Box, HardDrive, Upload,
  Loader2, ArrowLeft, Eye, Smartphone, QrCode, Search,
  X, Check, UploadCloud, Share2, Lock
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ARModal from '../../components/ARModal';
import QRCodeModal from '../../components/QRCodeModal';
import ShareGalleryModal from '../../components/ShareGalleryModal';

export default function Galleries({ setCurrentTab, setSelectedModelId, setCurrentView }) {
  const { success, error } = useToast();
  const [galleries, setGalleries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State for Create / Edit Gallery
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGal, setEditingGal] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [isDraggingThumb, setIsDraggingThumb] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const fileInputRef = useRef(null);

  // Gallery Detail View State (when a gallery is opened)
  const [selectedGallery, setSelectedGallery] = useState(null);
  const [galleryModels, setGalleryModels] = useState([]);
  const [loadingGalleryModels, setLoadingGalleryModels] = useState(false);
  const [modelSearch, setModelSearch] = useState('');

  // Modals for AR & QR Code from within gallery view
  const [activeModelForAR, setActiveModelForAR] = useState(null);
  const [activeModelForQR, setActiveModelForQR] = useState(null);
  const [shareModalGallery, setShareModalGallery] = useState(null);

  // Add existing models to gallery modal
  const [addModelsModalOpen, setAddModelsModalOpen] = useState(false);
  const [allModels, setAllModels] = useState([]);
  const [loadingAllModels, setLoadingAllModels] = useState(false);

  const fetchGalleries = async () => {
    setLoading(true);
    try {
      const data = await api.getGalleries();
      setGalleries(data);
    } catch (err) {
      error(err.message || 'Failed to fetch galleries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGalleries();
  }, []);

  const handleOpenCreate = () => {
    setEditingGal(null);
    setName('');
    setDescription('');
    setThumbnailUrl('');
    setThumbnailFile(null);
    if (thumbnailPreview && thumbnailPreview.startsWith('blob:')) {
      URL.revokeObjectURL(thumbnailPreview);
    }
    setThumbnailPreview('');
    setIsPublic(true);
    setModalOpen(true);
  };

  const handleOpenEdit = (gal) => {
    setEditingGal(gal);
    setName(gal.name);
    setDescription(gal.description || '');
    setThumbnailUrl(gal.thumbnail_url || '');
    setThumbnailFile(null);
    if (thumbnailPreview && thumbnailPreview.startsWith('blob:')) {
      URL.revokeObjectURL(thumbnailPreview);
    }
    setThumbnailPreview(gal.thumbnail_url || '');
    setIsPublic(gal.is_public === 1 || gal.is_public === true);
    setModalOpen(true);
  };

  const handleThumbnailFileSelect = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      error('Please select an image file (PNG, JPG, WEBP, GIF)');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      error('Image file size must be under 20 MB');
      return;
    }
    if (thumbnailPreview && thumbnailPreview.startsWith('blob:')) {
      URL.revokeObjectURL(thumbnailPreview);
    }
    setThumbnailFile(file);
    const objectUrl = URL.createObjectURL(file);
    setThumbnailPreview(objectUrl);
  };

  const handleRemoveThumbnail = () => {
    if (thumbnailPreview && thumbnailPreview.startsWith('blob:')) {
      URL.revokeObjectURL(thumbnailPreview);
    }
    setThumbnailFile(null);
    setThumbnailPreview('');
    setThumbnailUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      let payload;
      if (thumbnailFile) {
        payload = new FormData();
        payload.append('name', name.trim());
        payload.append('description', description.trim());
        payload.append('thumbnail', thumbnailFile);
        payload.append('isPublic', isPublic ? '1' : '0');
      } else {
        payload = {
          name: name.trim(),
          description: description.trim(),
          thumbnailUrl: thumbnailUrl.trim() || undefined,
          isPublic
        };
      }

      if (editingGal) {
        await api.updateGallery(editingGal.id, payload);
        success('Gallery updated');
        if (selectedGallery && selectedGallery.id === editingGal.id) {
          refreshSelectedGallery(editingGal.id);
        }
      } else {
        await api.createGallery(payload);
        success('Gallery created successfully');
      }
      setModalOpen(false);
      fetchGalleries();
    } catch (err) {
      error(err.message || 'Failed to save gallery');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, galName) => {
    if (!window.confirm(`Archive gallery "${galName}"? Models will remain in workspace.`)) return;
    try {
      await api.deleteGallery(id);
      success('Gallery archived');
      if (selectedGallery && selectedGallery.id === id) {
        setSelectedGallery(null);
      }
      fetchGalleries();
    } catch (err) {
      error(err.message || 'Failed to archive gallery');
    }
  };

  // Open a gallery and load all models inside it
  const handleOpenGallery = async (gal) => {
    setSelectedGallery(gal);
    setLoadingGalleryModels(true);
    setModelSearch('');
    try {
      const data = await api.getGallery(gal.id);
      setSelectedGallery(data);
      setGalleryModels(data.models || []);
    } catch {
      try {
        const models = await api.getMyModels(`?galleryId=${gal.id}`);
        setGalleryModels(models);
      } catch (err) {
        error(err.message || 'Failed to load gallery models');
      }
    } finally {
      setLoadingGalleryModels(false);
    }
  };

  const refreshSelectedGallery = async (galId) => {
    try {
      const data = await api.getGallery(galId);
      setSelectedGallery(data);
      setGalleryModels(data.models || []);
    } catch {
      try {
        const models = await api.getMyModels(`?galleryId=${galId}`);
        setGalleryModels(models);
      } catch {
        // silent refresh fallback
      }
    }
  };

  // Navigate to 3D model detail inspection
  const handleViewModel = (modelId) => {
    if (setSelectedModelId && setCurrentView) {
      setSelectedModelId(modelId);
      setCurrentView('model-detail');
    }
  };

  // Remove a model from the currently viewed gallery
  const handleRemoveModelFromGallery = async (modelId, modelTitle) => {
    if (!window.confirm(`Remove "${modelTitle}" from this gallery? The model will remain safely in your workspace.`)) return;
    try {
      await api.updateModel(modelId, { galleryId: 'none' });
      success(`Model "${modelTitle}" unassigned from gallery`);
      if (selectedGallery) {
        refreshSelectedGallery(selectedGallery.id);
        fetchGalleries();
      }
    } catch (err) {
      error(err.message || 'Failed to remove model from gallery');
    }
  };

  // Open modal to assign existing models
  const handleOpenAddExistingModal = async () => {
    setAddModelsModalOpen(true);
    setLoadingAllModels(true);
    try {
      const models = await api.getMyModels();
      setAllModels(models);
    } catch (err) {
      error(err.message || 'Failed to load workspace models');
    } finally {
      setLoadingAllModels(false);
    }
  };

  // Assign an existing model to this gallery
  const handleAssignModel = async (modelId, modelTitle) => {
    if (!selectedGallery) return;
    try {
      await api.updateModel(modelId, { galleryId: selectedGallery.id });
      success(`"${modelTitle}" added to ${selectedGallery.name}`);
      refreshSelectedGallery(selectedGallery.id);
      fetchGalleries();
    } catch (err) {
      error(err.message || 'Failed to add model to gallery');
    }
  };

  const filteredGalleryModels = galleryModels.filter((m) => {
    if (!modelSearch.trim()) return true;
    const term = modelSearch.toLowerCase();
    return (
      (m.title && m.title.toLowerCase().includes(term)) ||
      (m.description && m.description.toLowerCase().includes(term)) ||
      (m.category_name && m.category_name.toLowerCase().includes(term))
    );
  });

  return (
    <div>
      {/* ============================================================ */}
      {/* 1. GALLERY DETAIL / OPENED GALLERY VIEW                      */}
      {/* ============================================================ */}
      {selectedGallery ? (
        <div>
          {/* Back Button & Top Action Controls */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            flexWrap: 'wrap',
            gap: '14px'
          }}>
            <button
              onClick={() => setSelectedGallery(null)}
              className="btn btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <ArrowLeft size={16} />
              <span>Back to Galleries</span>
            </button>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={handleOpenAddExistingModal}
                className="btn btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}
              >
                <Plus size={16} />
                <span>Assign Existing Models</span>
              </button>

              <button
                onClick={() => {
                  if (setCurrentTab) setCurrentTab('upload');
                }}
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}
              >
                <UploadCloud size={16} />
                <span>Upload New Model</span>
              </button>
            </div>
          </div>

          {/* Hero Gallery Showcase Banner */}
          <div
            className="card"
            style={{
              padding: '24px',
              marginBottom: '28px',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{
                width: '140px',
                height: '100px',
                borderRadius: '12px',
                overflow: 'hidden',
                background: '#e2e8f0',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
              }}>
                <img
                  src={selectedGallery.thumbnail_url || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80'}
                  alt={selectedGallery.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80';
                  }}
                />
              </div>

              <div style={{ flex: 1, minWidth: '240px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                    {selectedGallery.name}
                  </h2>
                  {selectedGallery.is_public ? (
                    <span className="badge badge-success">Public Collection</span>
                  ) : (
                    <span className="badge badge-warning">Private Workspace</span>
                  )}
                </div>

                <p style={{ color: '#64748b', fontSize: '0.92rem', marginBottom: '14px', lineHeight: 1.5 }}>
                  {selectedGallery.description || 'No description provided for this collection.'}
                </p>

                <div style={{ display: 'flex', gap: '18px', alignItems: 'center', fontSize: '0.85rem', color: '#475569', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Box size={16} color="#8b5cf6" />
                    <strong>{galleryModels.length} Model{galleryModels.length === 1 ? '' : 's'}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <HardDrive size={16} color="#7c3aed" />
                    <span>
                      {(
                        galleryModels.reduce((acc, m) => acc + (m.storage_total_bytes || m.original_file_size || 0), 0) /
                        (1024 * 1024)
                      ).toFixed(1)} MB Storage
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setShareModalGallery(selectedGallery)}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Share2 size={14} />
                  <span>Share Gallery</span>
                </button>
                <button
                  onClick={() => handleOpenEdit(selectedGallery)}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Edit2 size={14} />
                  <span>Edit Details</span>
                </button>
                <button
                  onClick={() => handleDelete(selectedGallery.id, selectedGallery.name)}
                  className="btn btn-ghost btn-sm"
                  style={{ color: '#ef4444' }}
                  title="Archive Gallery"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Search Bar & Counter */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            <div style={{ position: 'relative', width: '320px' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8'
                }}
              />
              <input
                type="text"
                placeholder="Search models in this gallery..."
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '36px', fontSize: '0.88rem' }}
              />
            </div>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Showing {filteredGalleryModels.length} of {galleryModels.length} models
            </div>
          </div>

          {/* Models Grid Inside Gallery */}
          {loadingGalleryModels ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748b' }}>
              <div style={{
                width: '36px',
                height: '36px',
                border: '3px solid #e2e8f0',
                borderTopColor: '#8b5cf6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 12px auto'
              }} />
              <div>Loading models in {selectedGallery.name}...</div>
            </div>
          ) : filteredGalleryModels.length === 0 ? (
            <div className="card" style={{ padding: '56px 24px', textAlign: 'center' }}>
              <Box size={48} color="#94a3b8" style={{ margin: '0 auto 16px auto' }} />
              <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>
                {modelSearch ? 'No models match your search' : 'No models in this gallery yet'}
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.92rem', marginBottom: '22px', maxWidth: '480px', margin: '0 auto 22px auto' }}>
                {modelSearch
                  ? 'Try searching with a different keyword or clear your filter.'
                  : 'Add 3D models to this gallery to showcase them to clients or organize by product line.'}
              </p>
              {!modelSearch && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleOpenAddExistingModal}
                    className="btn btn-secondary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Plus size={16} />
                    <span>Assign Existing Models</span>
                  </button>
                  <button
                    onClick={() => {
                      if (setCurrentTab) setCurrentTab('upload');
                    }}
                    className="btn btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    <UploadCloud size={16} />
                    <span>Upload New Model</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="models-grid" style={{ gap: '24px' }}>
              {filteredGalleryModels.map((m) => (
                <div
                  key={m.id}
                  className="card"
                  style={{
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    position: 'relative'
                  }}
                >
                  {/* Thumbnail / 3D Canvas Preview Trigger */}
                  <div
                    style={{ height: '180px', overflow: 'hidden', position: 'relative', cursor: 'pointer', background: '#0f172a' }}
                    onClick={() => handleViewModel(m.id)}
                    title="Click to inspect in 3D WebGL Viewer"
                  >
                    <img
                      src={m.thumbnail_url || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80'}
                      alt={m.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80';
                      }}
                    />
                    <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '6px' }}>
                      <span className="badge badge-primary" style={{ textTransform: 'uppercase', fontSize: '0.72rem' }}>
                        {m.original_file_format || 'GLB'}
                      </span>
                      {m.category_name && (
                        <span className="badge" style={{ background: 'rgba(15, 23, 42, 0.75)', color: '#fff', fontSize: '0.72rem' }}>
                          {m.category_name}
                        </span>
                      )}
                    </div>
                    <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                      <span className={`badge ${m.processing_status === 'ready' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.72rem' }}>
                        {m.processing_status === 'ready' ? 'Ready' : m.processing_status}
                      </span>
                    </div>
                  </div>

                  <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <h4
                        onClick={() => handleViewModel(m.id)}
                        style={{
                          fontSize: '1.05rem',
                          marginBottom: '6px',
                          cursor: 'pointer',
                          color: '#0f172a',
                          transition: 'color 0.15s'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#7c3aed')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#0f172a')}
                      >
                        {m.title}
                      </h4>
                      <p style={{
                        fontSize: '0.82rem',
                        color: '#64748b',
                        marginBottom: '14px',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.45
                      }}>
                        {m.description || 'No engineering description provided.'}
                      </p>
                    </div>

                    <div>
                      {/* Metric Stats */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        paddingTop: '10px',
                        borderTop: '1px solid #f1f5f9',
                        fontSize: '0.78rem',
                        color: '#64748b',
                        marginBottom: '12px'
                      }}>
                        <span>{m.views_count || 0} Views</span>
                        <span>{m.ar_views_count || 0} AR Views</span>
                        <span>{((m.storage_total_bytes || m.original_file_size || 0) / (1024 * 1024)).toFixed(1)} MB</span>
                      </div>

                      {/* Interactive Action Buttons */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr auto', gap: '6px' }}>
                        <button
                          onClick={() => handleViewModel(m.id)}
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: '0.78rem', padding: '6px 8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                        >
                          <Eye size={13} />
                          <span>View 3D</span>
                        </button>
                        <button
                          onClick={() => setActiveModelForAR(m)}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.78rem', padding: '6px 8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                          title="View in WebAR"
                        >
                          <Smartphone size={13} />
                          <span>AR</span>
                        </button>
                        <button
                          onClick={() => setActiveModelForQR(m)}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.78rem', padding: '6px 8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                          title="Generate QR Code"
                        >
                          <QrCode size={13} />
                          <span>QR</span>
                        </button>
                        <button
                          onClick={() => handleRemoveModelFromGallery(m.id, m.title)}
                          className="btn btn-ghost btn-sm"
                          style={{ color: '#ef4444', padding: '6px' }}
                          title="Remove from this gallery"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ============================================================ */
        /* 2. MAIN GALLERIES GRID LIST VIEW                             */
        /* ============================================================ */
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '28px',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <h1 style={{ fontSize: '1.9rem', marginBottom: '4px' }}>Model Galleries</h1>
              <p style={{ color: '#64748b', fontSize: '0.92rem' }}>
                Organize models into client-facing showroom collections, product lines, or engineering departments.
              </p>
            </div>
            <button onClick={handleOpenCreate} className="btn btn-primary">
              <Plus size={16} />
              <span>Create New Gallery</span>
            </button>
          </div>

          {loading ? (
            <div style={{ color: '#64748b', padding: '40px 0' }}>Loading galleries...</div>
          ) : galleries.length === 0 ? (
            <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
              <Folder size={48} color="#94a3b8" style={{ margin: '0 auto 16px auto' }} />
              <h3>No galleries created yet</h3>
              <p style={{ color: '#64748b', margin: '8px 0 20px 0' }}>
                Galleries let you group models for trade shows, catalogues, or client showrooms.
              </p>
              <button onClick={handleOpenCreate} className="btn btn-secondary">
                Create First Gallery
              </button>
            </div>
          ) : (
            <div className="models-grid" style={{ gap: '24px' }}>
              {galleries.map((gal) => (
                <div
                  key={gal.id}
                  className="card"
                  onClick={() => handleOpenGallery(gal)}
                  style={{
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '';
                  }}
                >
                  <div style={{ height: '170px', overflow: 'hidden', position: 'relative' }}>
                    <img
                      src={gal.thumbnail_url || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80'}
                      alt={gal.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80';
                      }}
                    />
                    <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
                      {gal.is_public ? (
                        <span className="badge badge-success">Public</span>
                      ) : (
                        <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Lock size={11} />
                          Private (Link-Only)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', marginBottom: '6px' }}>{gal.name}</h3>
                      <p style={{ fontSize: '0.84rem', color: '#64748b', marginBottom: '16px', lineHeight: 1.5 }}>
                        {gal.description || 'No description provided.'}
                      </p>
                    </div>

                    <div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        paddingTop: '12px',
                        borderTop: '1px solid #f1f5f9',
                        fontSize: '0.82rem',
                        color: '#475569',
                        marginBottom: '16px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Box size={14} color="#8b5cf6" />
                          <span>{gal.actual_model_count || gal.model_count || 0} Models</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <HardDrive size={14} color="#7c3aed" />
                          <span>{((gal.calculated_storage_bytes || gal.storage_used_bytes || 0) / (1024 * 1024)).toFixed(1)} MB</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenGallery(gal);
                          }}
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                          <Eye size={14} />
                          <span>View Models ({gal.actual_model_count || gal.model_count || 0})</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShareModalGallery(gal);
                          }}
                          className="btn btn-secondary btn-sm"
                          title="Share Gallery"
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Share2 size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(gal);
                          }}
                          className="btn btn-secondary btn-sm"
                          title="Edit Gallery"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(gal.id, gal.name);
                          }}
                          className="btn btn-ghost btn-sm"
                          style={{ color: '#ef4444' }}
                          title="Archive Gallery"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. MODAL: CREATE / EDIT GALLERY                              */}
      {/* ============================================================ */}
      {modalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '520px', padding: '28px' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>
              {editingGal ? 'Edit Gallery' : 'Create New Gallery'}
            </h3>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Gallery Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input"
                  placeholder="e.g. High-Pressure Pumps & Turbines"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="form-textarea"
                  placeholder="Collection purpose, target applications, or industry specs..."
                />
              </div>

              {/* Gallery Thumbnail Section with Upload Button & Preview */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" style={{ marginBottom: 0, fontWeight: 600 }}>
                    Gallery Thumbnail
                  </label>
                  {(thumbnailPreview || thumbnailUrl) && (
                    <button
                      type="button"
                      onClick={handleRemoveThumbnail}
                      className="btn btn-ghost btn-sm"
                      style={{ color: '#ef4444', padding: '2px 8px', fontSize: '0.78rem', height: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Trash2 size={13} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleThumbnailFileSelect(e.target.files[0]);
                    }
                  }}
                />

                {/* Active Image Preview Card */}
                {(thumbnailPreview || thumbnailUrl) ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '12px 14px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    marginBottom: '10px'
                  }}>
                    <div style={{
                      width: '84px',
                      height: '60px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      background: '#e2e8f0',
                      flexShrink: 0,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                    }}>
                      <img
                        src={thumbnailPreview || thumbnailUrl}
                        alt="Thumbnail preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80';
                        }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '0.86rem',
                        fontWeight: 600,
                        color: '#1e293b',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {thumbnailFile ? thumbnailFile.name : (editingGal ? 'Current Gallery Cover' : 'Selected Thumbnail')}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                        {thumbnailFile
                          ? `${(thumbnailFile.size / 1024).toFixed(1)} KB • Ready to upload`
                          : 'Custom preview image'}
                      </div>
                      <div style={{ marginTop: '6px' }}>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '3px 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        >
                          <Upload size={13} />
                          <span>Change Image</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Upload Button / Dropzone */
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingThumb(true); }}
                    onDragLeave={() => setIsDraggingThumb(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingThumb(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleThumbnailFileSelect(e.dataTransfer.files[0]);
                      }
                    }}
                    style={{
                      border: isDraggingThumb ? '2px dashed #8b5cf6' : '1px dashed #cbd5e1',
                      borderRadius: '12px',
                      padding: '20px 16px',
                      textAlign: 'center',
                      background: isDraggingThumb ? 'rgba(139, 92, 246, 0.05)' : '#f8fafc',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      marginBottom: '10px'
                    }}
                  >
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: '#ede9fe',
                      color: '#7c3aed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 10px auto'
                    }}>
                      <Upload size={20} />
                    </div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>
                      Click to upload image or drag & drop
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                      PNG, JPG, WEBP or GIF (Recommended 16:9 ratio, max 20MB)
                    </div>
                  </div>
                )}

                {/* Optional URL Fallback */}
                <div style={{ marginTop: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Or enter image URL:</span>
                  </div>
                  <input
                    type="url"
                    value={thumbnailUrl}
                    onChange={(e) => {
                      setThumbnailUrl(e.target.value);
                      if (!thumbnailFile) {
                        setThumbnailPreview(e.target.value);
                      }
                    }}
                    className="form-input"
                    style={{ fontSize: '0.85rem' }}
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Visibility</label>
                <select
                  value={isPublic ? '1' : '0'}
                  onChange={(e) => setIsPublic(e.target.value === '1')}
                  className="form-select"
                >
                  <option value="1">Public (Anyone can discover & view)</option>
                  <option value="0">Private / Link-Only (Only people with your shared link can view)</option>
                </select>
                <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '5px', lineHeight: 1.4 }}>
                  {isPublic
                    ? 'Public galleries are visible to anyone visiting your public showroom.'
                    : 'Hidden from public explore. Other users can ONLY view it if you share the secret link.'}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  {saving && <Loader2 size={16} className="spin" />}
                  <span>{editingGal ? (saving ? 'Saving...' : 'Save Changes') : (saving ? 'Creating...' : 'Create Gallery')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. MODAL: ASSIGN EXISTING MODELS TO THIS GALLERY             */}
      {/* ============================================================ */}
      {addModelsModalOpen && selectedGallery && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '640px', padding: '28px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>
                  Assign Models to &ldquo;{selectedGallery.name}&rdquo;
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
                  Select 3D models from your organization to add to this gallery showroom.
                </p>
              </div>
              <button
                onClick={() => setAddModelsModalOpen(false)}
                className="btn btn-ghost btn-sm"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', margin: '8px 0 16px 0' }}>
              {loadingAllModels ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  Loading organization models...
                </div>
              ) : allModels.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                  No models available in your organization.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {allModels.map((m) => {
                    const isAlreadyInGallery = galleryModels.some((gm) => gm.id === m.id);
                    return (
                      <div
                        key={m.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          border: '1px solid #e2e8f0',
                          borderRadius: '10px',
                          background: isAlreadyInGallery ? '#f8fafc' : '#ffffff'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                          <img
                            src={m.thumbnail_url || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=200&q=80'}
                            alt={m.title}
                            style={{ width: '48px', height: '40px', borderRadius: '6px', objectFit: 'cover', background: '#0f172a' }}
                            onError={(e) => {
                              e.target.src = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=200&q=80';
                            }}
                          />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {m.title}
                            </div>
                            <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                              {m.category_name || 'Uncategorized'} • {m.original_file_format || 'GLB'} • {((m.storage_total_bytes || m.original_file_size || 0) / (1024 * 1024)).toFixed(1)} MB
                            </div>
                          </div>
                        </div>

                        <div>
                          {isAlreadyInGallery ? (
                            <span className="badge badge-success" style={{ fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Check size={12} />
                              <span>In Gallery</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => handleAssignModel(m.id, m.title)}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.8rem', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Plus size={13} />
                              <span>Add to Gallery</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              <button
                onClick={() => setAddModelsModalOpen(false)}
                className="btn btn-primary"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. AR & QR CODE MODALS                                       */}
      {/* ============================================================ */}
      {activeModelForAR && (
        <ARModal
          model={activeModelForAR}
          onClose={() => setActiveModelForAR(null)}
        />
      )}

      {activeModelForQR && (
        <QRCodeModal
          model={activeModelForQR}
          onClose={() => setActiveModelForQR(null)}
        />
      )}

      {shareModalGallery && (
        <ShareGalleryModal
          gallery={shareModalGallery}
          onClose={() => setShareModalGallery(null)}
        />
      )}
    </div>
  );
}
