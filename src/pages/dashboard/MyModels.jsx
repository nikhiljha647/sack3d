import React, { useState, useEffect } from 'react';
import {
  Box, Smartphone, QrCode, Eye, Trash2, Edit3, Lock,
  Globe, Plus, Search, Filter, AlertCircle, RefreshCw, GitBranch
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ARModal from '../../components/ARModal';
import QRCodeModal from '../../components/QRCodeModal';

export default function MyModels({ setCurrentTab, setSelectedModelId, setCurrentView }) {
  const { success, error } = useToast();
  const [models, setModels] = useState([]);
  const [search, setSearch] = useState('');
  const [filterVisibility, setFilterVisibility] = useState('all');
  const [loading, setLoading] = useState(true);

  const [activeModelForAR, setActiveModelForAR] = useState(null);
  const [activeModelForQR, setActiveModelForQR] = useState(null);
  const [editingModel, setEditingModel] = useState(null);
  const [categories, setCategories] = useState([]);
  const [galleries, setGalleries] = useState([]);
  const [editThumbnailFile, setEditThumbnailFile] = useState(null);
  const [editThumbnailPreview, setEditThumbnailPreview] = useState('');

  const fetchModels = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterVisibility !== 'all') params.append('visibility', filterVisibility);
      const data = await api.getMyModels(`?${params.toString()}`);
      setModels(data);
    } catch (err) {
      error(err.message || 'Failed to fetch models');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
    api.getCategories().then(setCategories).catch(console.warn);
    api.getGalleries().then(setGalleries).catch(console.warn);
  }, [search, filterVisibility]);

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to archive/remove "${title}"? Storage will be reclaimed.`)) {
      return;
    }
    try {
      await api.deleteModel(id);
      success(`Model "${title}" soft-deleted successfully.`);
      fetchModels();
    } catch (err) {
      error(err.message || 'Failed to delete model');
    }
  };

  const openEditModal = (m) => {
    setEditingModel({ ...m });
    setEditThumbnailFile(null);
    setEditThumbnailPreview(m.thumbnail_url || '');
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      let payload;
      if (editThumbnailFile) {
        payload = new FormData();
        payload.append('title', editingModel.title.trim());
        payload.append('description', (editingModel.description || '').trim());
        payload.append('thumbnail', editThumbnailFile);
        payload.append('visibility', editingModel.visibility);
        payload.append('categoryId', editingModel.category_id || '');
        payload.append('galleryId', editingModel.gallery_id || '');
        payload.append('arActive', editingModel.ar_active !== undefined ? editingModel.ar_active : 1);
      } else {
        payload = {
          title: editingModel.title.trim(),
          description: (editingModel.description || '').trim(),
          thumbnailUrl: editingModel.thumbnail_url,
          visibility: editingModel.visibility,
          categoryId: editingModel.category_id || null,
          galleryId: editingModel.gallery_id || null,
          arActive: editingModel.ar_active
        };
      }
      await api.updateModel(editingModel.id, payload);
      success('Model updated successfully');
      setEditingModel(null);
      setEditThumbnailFile(null);
      fetchModels();
    } catch (err) {
      error(err.message || 'Failed to update model');
    }
  };

  return (
    <div>
      {/* Top Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '28px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ fontSize: '1.9rem', marginBottom: '4px' }}>My 3D Models</h1>
          <p style={{ color: '#64748b', fontSize: '0.92rem' }}>
            Manage, edit, generate QR codes, and monitor analytics for your workspace models.
          </p>
        </div>
        <button onClick={() => setCurrentTab('upload')} className="btn btn-primary">
          <Plus size={16} />
          <span>Upload 3D Model</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: '#f8fafc',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          padding: '6px 12px',
          flex: 1,
          minWidth: '240px'
        }}>
          <Search size={16} color="#64748b" />
          <input
            type="text"
            placeholder="Search by model title or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ background: 'transparent', border: 'none', width: '100%', outline: 'none', fontSize: '0.88rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <select
            value={filterVisibility}
            onChange={(e) => setFilterVisibility(e.target.value)}
            className="form-select"
            style={{ fontSize: '0.85rem', padding: '6px 12px' }}
          >
            <option value="all">All Visibility</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>

          <button onClick={fetchModels} className="btn btn-secondary btn-sm" title="Refresh list">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Models Table / List */}
      <div className="card">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            Loading models...
          </div>
        ) : models.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ color: '#64748b', marginBottom: '16px' }}>No models found.</p>
            <button onClick={() => setCurrentTab('upload')} className="btn btn-secondary">
              Upload Your First Model
            </button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table style={{ width: '100%', minWidth: '780px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '14px 20px' }}>Model</th>
                  <th style={{ padding: '14px 16px' }}>Gallery</th>
                  <th style={{ padding: '14px 16px' }}>Visibility</th>
                  <th style={{ padding: '14px 16px' }}>Status</th>
                  <th style={{ padding: '14px 16px' }}>Version</th>
                  <th style={{ padding: '14px 16px' }}>Views / AR</th>
                  <th style={{ padding: '14px 16px' }}>Storage</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {models.map((m) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    {/* Model Title & Thumb */}
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img
                          src={m.thumbnail_url}
                          alt={m.title}
                          style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{m.title}</div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                            .{m.original_file_format.toUpperCase()} • ID: {m.id}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Gallery */}
                    <td style={{ padding: '14px 16px', color: '#475569' }}>
                      {m.gallery_name || 'General'}
                    </td>

                    {/* Visibility */}
                    <td style={{ padding: '14px 16px' }}>
                      {m.visibility === 'public' ? (
                        <span className="badge badge-success">Public</span>
                      ) : (
                        <span className="badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Lock size={12} />
                          <span>Private</span>
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px 16px' }}>
                      <span className={`badge ${m.processing_status === 'ready' ? 'badge-primary' : m.processing_status === 'processing_failed' ? 'badge-danger' : 'badge-neutral'}`}>
                        {m.processing_status}
                      </span>
                    </td>

                    {/* Version & CAD Revisions button */}
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontWeight: 600, color: '#8b5cf6' }}>v{m.current_version}</span>
                    </td>

                    {/* Views & AR stats */}
                    <td style={{ padding: '14px 16px', color: '#475569' }}>
                      <div>{m.views_count} views</div>
                      <div style={{ fontSize: '0.75rem', color: '#10b981' }}>{m.ar_views_count} AR • {m.qr_scans_count} QR</div>
                    </td>

                    {/* Storage */}
                    <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '0.82rem' }}>
                      {((m.storage_total_bytes || m.original_file_size) / (1024 * 1024)).toFixed(1)} MB
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          onClick={() => {
                            setSelectedModelId(m.id);
                            setCurrentView('model-detail');
                          }}
                          className="btn btn-ghost btn-sm"
                          title="Open 3D Viewer"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => setActiveModelForAR(m)}
                          className="btn btn-ghost btn-sm"
                          title="Launch WebAR"
                        >
                          <Smartphone size={16} />
                        </button>
                        <button
                          onClick={() => setActiveModelForQR(m)}
                          className="btn btn-ghost btn-sm"
                          title="QR Code Management"
                        >
                          <QrCode size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedModelId(m.id);
                            setCurrentTab('cad-revisions');
                          }}
                          className="btn btn-ghost btn-sm"
                          title="CAD Revisions"
                        >
                          <GitBranch size={16} />
                        </button>
                        <button
                          onClick={() => openEditModal(m)}
                          className="btn btn-ghost btn-sm"
                          title="Edit Details & Thumbnail"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(m.id, m.title)}
                          className="btn btn-ghost btn-sm"
                          style={{ color: '#ef4444' }}
                          title="Soft Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Model Modal */}
      {editingModel && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '580px', padding: '26px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '6px' }}>Edit Model Details</h3>
            <p style={{ fontSize: '0.84rem', color: '#64748b', marginBottom: '18px' }}>
              Update model metadata, thumbnail image, taxonomy, and visibility settings.
            </p>
            <form onSubmit={handleUpdate}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Title *</label>
                <input
                  type="text"
                  required
                  value={editingModel.title}
                  onChange={(e) => setEditingModel({ ...editingModel, title: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Description</label>
                <textarea
                  rows={3}
                  value={editingModel.description || ''}
                  onChange={(e) => setEditingModel({ ...editingModel, description: e.target.value })}
                  className="form-textarea"
                  placeholder="Mechanical or engineering specifications..."
                />
              </div>

              {/* Thumbnail Section */}
              <div style={{ marginBottom: '16px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <label className="form-label" style={{ fontWeight: 600, marginBottom: '6px' }}>Showcase Thumbnail</label>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden', background: '#e2e8f0', flexShrink: 0 }}>
                    <img
                      src={editThumbnailPreview || editingModel.thumbnail_url || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=200&q=80'}
                      alt="Thumbnail"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=200&q=80';
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => {
                        const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
                        if (file) {
                          setEditThumbnailFile(file);
                          setEditThumbnailPreview(URL.createObjectURL(file));
                        }
                      }}
                      className="form-input"
                      style={{ fontSize: '0.82rem', padding: '6px' }}
                    />
                    <input
                      type="url"
                      placeholder="Or enter image URL..."
                      value={editingModel.thumbnail_url || ''}
                      onChange={(e) => {
                        setEditingModel({ ...editingModel, thumbnail_url: e.target.value });
                        if (!editThumbnailFile) {
                          setEditThumbnailPreview(e.target.value);
                        }
                      }}
                      className="form-input"
                      style={{ fontSize: '0.82rem', marginTop: '6px', padding: '6px 8px' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Category</label>
                  <select
                    value={editingModel.category_id || ''}
                    onChange={(e) => setEditingModel({ ...editingModel, category_id: e.target.value })}
                    className="form-select"
                  >
                    <option value="">-- No Category --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Gallery</label>
                  <select
                    value={editingModel.gallery_id || ''}
                    onChange={(e) => setEditingModel({ ...editingModel, gallery_id: e.target.value })}
                    className="form-select"
                  >
                    <option value="">-- Unassigned --</option>
                    {galleries.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Visibility</label>
                <select
                  value={editingModel.visibility}
                  onChange={(e) => setEditingModel({ ...editingModel, visibility: e.target.value })}
                  className="form-select"
                >
                  <option value="public">Public (Open discovery & WebAR)</option>
                  <option value="private">Private (Share Token required)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <button type="button" onClick={() => setEditingModel(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeModelForAR && (
        <ARModal model={activeModelForAR} onClose={() => setActiveModelForAR(null)} />
      )}
      {activeModelForQR && (
        <QRCodeModal model={activeModelForQR} onClose={() => setActiveModelForQR(null)} />
      )}
    </div>
  );
}
