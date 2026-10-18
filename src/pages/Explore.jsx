import React, { useState, useEffect, useRef } from 'react';
import { Search, Smartphone, QrCode, Eye, ChevronDown, Check, X } from 'lucide-react';
import { api } from '../services/api';
import ARModal from '../components/ARModal';
import QRCodeModal from '../components/QRCodeModal';

export default function Explore({ setCurrentView, setSelectedModelId }) {
  const [models, setModels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedIndustry, setSelectedIndustry] = useState('all');
  const [sort, setSort] = useState('popular');
  const [loading, setLoading] = useState(true);

  const [activeModelForAR, setActiveModelForAR] = useState(null);
  const [activeModelForQR, setActiveModelForQR] = useState(null);

  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsMoreOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMoreOpen(false);
      }
    };
    if (isMoreOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMoreOpen]);

  const industries = [
    'Industrial & Manufacturing',
    'Machinery & Equipment',
    'Food & Restaurant',
    'Commercial Kitchens',
    'Furniture & Interior',
    'Hospitality & Hotels',
    'Architecture & Construction',
    'Commercial Spaces',
    'Automotive'
  ];

  const fetchModels = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedIndustry !== 'all') params.append('industry', selectedIndustry);
      if (sort) params.append('sort', sort);

      const data = await api.getPublicModels(`?${params.toString()}`);
      setModels(data);
    } catch (err) {
      console.warn('[Explore Fetch Models Error]:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.getCategories().then(setCategories).catch(console.warn);
  }, []);

  useEffect(() => {
    fetchModels();
  }, [search, selectedCategory, selectedIndustry, sort]);

  const handleLaunchAR = (m) => {
    setActiveModelForAR(m);
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
    const isAndroid = /Android/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const rawUrl = m.web_ready_file_url || m.file_url || '';
    if (rawUrl) {
      const absoluteUrl = rawUrl.startsWith('http')
        ? rawUrl
        : `${window.location.origin}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
      const clean = absoluteUrl.split('?')[0].toLowerCase();
      const isGlb = clean.endsWith('.glb') || clean.endsWith('.gltf') || clean.includes('/uploads/models/');
      if (isAndroid && isGlb) {
        const sceneViewerUrl = `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(absoluteUrl)}&mode=ar_preferred&title=${encodeURIComponent(m.title || '3D Model')}&resizable=true#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;end;`;
        try {
          window.location.href = sceneViewerUrl;
        } catch (e) {
          console.warn('[Explore Direct AR Error]:', e);
        }
      } else if (isIOS) {
        const usdzUrl = m.usdz_file_url || absoluteUrl.replace(/\.glb$/i, '.usdz');
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
      }
    }
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const arParam = searchParams.get('ar') === 'true';
    const modelParam = searchParams.get('model');
    if (arParam && modelParam && models.length > 0) {
      const found = models.find(m => m.id === modelParam || m.slug === modelParam);
      if (found) {
        handleLaunchAR(found);
      }
    }
  }, [models]);

  const MAX_VISIBLE = 5;
  const visibleCategories = categories.slice(0, MAX_VISIBLE);
  const moreCategories = categories.slice(MAX_VISIBLE);
  const activeMoreCategory = moreCategories.find((c) => c.slug === selectedCategory);

  return (
    <div className="section-spacer">
      <div className="container">
        {/* Header */}
        <div className="section-header">
          <div className="section-badge">Public Discovery</div>
          <h1 className="section-title">Explore 3D Models & WebAR Assets</h1>
          <p className="section-subtitle">
            Discover verified commercial equipment, industrial CAD models, and architectural fixtures shared publicly by businesses.
          </p>
        </div>

        {/* Filter Controls Bar */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '20px 24px',
          boxShadow: 'var(--shadow-card)',
          marginBottom: '36px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {/* Search and Sort row in a single line */}
          <div
            className="explore-search-bar"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%'
            }}
          >
            {/* Search Input Box */}
            <div style={{
              flex: 1,
              minWidth: '220px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              padding: '0 14px',
              height: '42px',
              boxSizing: 'border-box'
            }}>
              <Search size={18} color="#64748b" style={{ flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search models by title, keyword, or company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  width: '100%',
                  outline: 'none',
                  fontSize: '0.9rem',
                  color: '#0f172a'
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    color: '#94a3b8'
                  }}
                  title="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Industry Filter Dropdown */}
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="form-select"
              style={{
                width: 'auto',
                minWidth: '180px',
                height: '42px',
                padding: '0 12px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                fontSize: '0.9rem',
                color: '#0f172a',
                cursor: 'pointer',
                boxSizing: 'border-box',
                flexShrink: 0
              }}
            >
              <option value="all">All Industries</option>
              {industries.map((ind) => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>

            {/* Sort Dropdown */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="form-select"
              style={{
                width: 'auto',
                minWidth: '150px',
                height: '42px',
                padding: '0 12px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                fontSize: '0.9rem',
                color: '#0f172a',
                cursor: 'pointer',
                boxSizing: 'border-box',
                flexShrink: 0
              }}
            >
              <option value="popular">Most Popular</option>
              <option value="views">Most Views</option>
              <option value="ar">Most AR Launches</option>
              <option value="newest">Recently Added</option>
            </select>
          </div>

          {/* Category Filter Bar with Responsive Overflow & "More" Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
            <div
              className="no-scrollbar"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                overflowX: 'auto',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                flex: 1,
                minWidth: 0,
                paddingBottom: '2px'
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '30px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  background: selectedCategory === 'all' ? '#8b5cf6' : '#f1f5f9',
                  color: selectedCategory === 'all' ? '#ffffff' : '#475569',
                  boxShadow: selectedCategory === 'all' ? '0 2px 8px rgba(139, 92, 246, 0.28)' : 'none',
                  transition: 'all 0.15s ease',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                All Categories
              </button>
              {visibleCategories.map((c) => {
                const isSelected = selectedCategory === c.slug;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCategory(c.slug)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '30px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      background: isSelected ? '#8b5cf6' : '#f1f5f9',
                      color: isSelected ? '#ffffff' : '#475569',
                      boxShadow: isSelected ? '0 2px 8px rgba(139, 92, 246, 0.28)' : 'none',
                      transition: 'all 0.15s ease',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>

            {/* "More Categories" Dropdown */}
            {moreCategories.length > 0 && (
              <div ref={dropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => setIsMoreOpen((prev) => !prev)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: '30px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    background: activeMoreCategory ? '#8b5cf6' : isMoreOpen ? '#e2e8f0' : '#f1f5f9',
                    color: activeMoreCategory ? '#ffffff' : '#475569',
                    boxShadow: activeMoreCategory ? '0 2px 8px rgba(139, 92, 246, 0.28)' : 'none',
                    border: activeMoreCategory ? 'none' : '1px solid #e2e8f0',
                    transition: 'all 0.15s ease',
                    cursor: 'pointer'
                  }}
                  title={activeMoreCategory ? `Active: ${activeMoreCategory.name}` : 'More categories'}
                >
                  <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {activeMoreCategory ? activeMoreCategory.name : `More (${moreCategories.length})`}
                  </span>
                  {activeMoreCategory && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCategory('all');
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '15px',
                        height: '15px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.3)',
                        cursor: 'pointer',
                        marginLeft: '2px'
                      }}
                      title="Clear category filter"
                    >
                      <X size={10} color="#ffffff" />
                    </span>
                  )}
                  <ChevronDown
                    size={14}
                    style={{
                      transition: 'transform 0.2s ease',
                      transform: isMoreOpen ? 'rotate(180deg)' : 'none'
                    }}
                  />
                </button>

                {/* Dropdown Menu */}
                {isMoreOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      minWidth: '220px',
                      maxWidth: '300px',
                      background: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 12px 28px -4px rgba(15, 23, 42, 0.15), 0 4px 12px rgba(15, 23, 42, 0.08)',
                      zIndex: 60,
                      padding: '6px'
                    }}
                  >
                    <div style={{
                      padding: '6px 10px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: '#94a3b8',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <span>More Categories</span>
                      {activeMoreCategory && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCategory('all');
                            setIsMoreOpen(false);
                          }}
                          style={{
                            fontSize: '0.72rem',
                            color: '#8b5cf6',
                            cursor: 'pointer',
                            textTransform: 'none',
                            fontWeight: 600
                          }}
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    <div style={{ maxHeight: '240px', overflowY: 'auto' }} className="no-scrollbar">
                      {moreCategories.map((c) => {
                        const isSelected = selectedCategory === c.slug;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSelectedCategory(c.slug);
                              setIsMoreOpen(false);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              width: '100%',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              fontSize: '0.82rem',
                              fontWeight: isSelected ? 600 : 500,
                              color: isSelected ? '#8b5cf6' : '#334155',
                              background: isSelected ? '#f5f3ff' : 'transparent',
                              textAlign: 'left',
                              cursor: 'pointer',
                              transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) e.currentTarget.style.background = '#f8fafc';
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <span>{c.name}</span>
                            {isSelected && <Check size={14} color="#8b5cf6" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Models Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
            Loading public models...
          </div>
        ) : models.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0'
          }}>
            <p style={{ fontSize: '1.1rem', color: '#64748b', marginBottom: '16px' }}>No models found matching your current filter criteria.</p>
            <button onClick={() => { setSearch(''); setSelectedCategory('all'); setSelectedIndustry('all'); }} className="btn btn-secondary">
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="models-grid">
            {models.map((m) => (
              <div key={m.id} className="card">
                <div style={{ height: '210px', overflow: 'hidden', position: 'relative' }}>
                  <img
                    src={m.thumbnail_url}
                    alt={m.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '6px' }}>
                    <span className="badge badge-primary">3D Model</span>
                    {m.ar_enabled && <span className="badge badge-success">WebAR</span>}
                  </div>
                  <div style={{
                    position: 'absolute',
                    bottom: '12px',
                    right: '12px',
                    background: 'rgba(15, 23, 42, 0.75)',
                    color: '#ffffff',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    backdropFilter: 'blur(6px)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Eye size={13} />
                    <span>{m.views_count} views</span>
                  </div>
                </div>

                <div className="card-body">
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#8b5cf6', textTransform: 'uppercase', marginBottom: '4px' }}>
                    {m.category_name || m.business_industry}
                  </div>
                  <h4 style={{ fontSize: '1.05rem', marginBottom: '6px' }}>{m.title}</h4>
                  <p style={{ fontSize: '0.84rem', color: '#64748b', marginBottom: '16px' }}>
                    {m.business_name}
                  </p>

                  <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                    <button
                      onClick={() => {
                        setSelectedModelId(m.id);
                        setCurrentView('model-detail');
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1 }}
                    >
                      3D View
                    </button>
                    <button
                      onClick={() => handleLaunchAR(m)}
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1 }}
                    >
                      <Smartphone size={15} />
                      <span>AR</span>
                    </button>
                    <button
                      onClick={() => setActiveModelForQR(m)}
                      className="btn btn-ghost btn-sm"
                      title="View QR Code"
                    >
                      <QrCode size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {activeModelForAR && (
        <ARModal model={activeModelForAR} onClose={() => setActiveModelForAR(null)} />
      )}
      {activeModelForQR && (
        <QRCodeModal model={activeModelForQR} onClose={() => setActiveModelForQR(null)} />
      )}
    </div>
  );
}
