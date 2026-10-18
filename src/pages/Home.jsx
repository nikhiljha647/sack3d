import React, { useState, useEffect } from 'react';
import {
  Box, ArrowRight, Play, Star, ChevronRight,
  Search, Download, Smartphone, Check, Sparkles, X, RotateCcw,
  Layers, Maximize2, Shield, Eye
} from 'lucide-react';
import ARModal from '../components/ARModal';
import QRCodeModal from '../components/QRCodeModal';
import StripePayment from '../components/StripePayment';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function Home({ setCurrentView, setSelectedModelId }) {
  const { user } = useAuth();
  const [activeModelForAR, setActiveModelForAR] = useState(null);
  const [activeModelForQR, setActiveModelForQR] = useState(null);
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [demoVideoUrl, setDemoVideoUrl] = useState('images/WhatsApp Video 2026-10-12 at 4.55.05 PM.mp4');
  const [hero3DMode, setHero3DMode] = useState(false); // toggle between high-res render and interactive Three.js
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [stripePaymentData, setStripePaymentData] = useState(null);

  const getEmbedUrl = (url) => {
    if (!url) return null;
    if (url.includes('youtube.com/watch?v=')) {
      const id = url.split('watch?v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${id}?autoplay=1`;
    }
    if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${id}?autoplay=1`;
    }
    if (url.includes('vimeo.com/')) {
      const id = url.split('vimeo.com/')[1]?.split('?')[0];
      return `https://player.vimeo.com/video/${id}?autoplay=1`;
    }
    return null;
  };

  const handleSubscribe = (planSlug) => {
    if (!user) {
      setCurrentView('login');
      return;
    }

    const planData = {
      creator: { id: 'creator', name: 'Creator Plan', price: 299 },
      business: { id: 'business', name: 'Business Plan', price: 799 }
    };

    if (planData[planSlug]) {
      setStripePaymentData(planData[planSlug]);
      setShowStripeModal(true);
    }
  };

  // Industry Categories from mockup
  const industries = [
    {
      id: 'ind-mfg',
      name: 'Industrial',
      count: '3D Models',
      image: '/images/industrial.jpg'
    },
    {
      id: 'food-rest',
      name: 'Food & Restaurant',
      count: '3D Models',
      image: '/images/burger.jpg'
    },
    {
      id: 'furn-int',
      name: 'Furniture',
      count: '3D Models',
      image: '/images/sofa.jpg'
    },
    {
      id: 'hosp-hot',
      name: 'Hospitality',
      count: '3D Models',
      image: '/images/bed.jpg'
    },
    {
      id: 'arch-con',
      name: 'Architecture',
      count: '3D Models',
      image: '/images/house.jpg'
    },
    {
      id: 'auto-eng',
      name: 'Automotive',
      count: '3D Models',
      image: '/images/car.jpg'
    }
  ];

  // Dynamic Popular / Featured Models from uploaded database models
  const [popularModels, setPopularModels] = useState([]);
  const [loadingPopular, setLoadingPopular] = useState(true);

  // Fallback real uploaded models
  const fallbackModels = [
    {
      id: 'mod_41434307',
      title: 'High Precision Hydraulic Pump',
      category_name: 'Industrial',
      original_file_format: 'glb',
      thumbnail_url: '/images/industrial.jpg'
    },
    {
      id: 'mod_68b4fcdb',
      title: 'robot',
      category_name: 'Engineering',
      original_file_format: 'glb',
      thumbnail_url: '/uploads/models/thumbnail-1791785659573-582817570.webp'
    },
    {
      id: 'mod_ba79c2fa',
      title: 'car',
      category_name: 'Automotive',
      original_file_format: 'glb',
      thumbnail_url: '/images/car.jpg'
    },
    {
      id: 'mod_73ca7d31',
      title: 'robot',
      category_name: 'Engineering',
      original_file_format: 'glb',
      thumbnail_url: '/uploads/models/thumbnail-1791785659573-582817570.webp'
    },
    {
      id: 'mod_f81c830b',
      title: 'car',
      category_name: 'Automotive',
      original_file_format: 'glb',
      thumbnail_url: '/images/car.jpg'
    },
    {
      id: 'mod_ed3de6c7',
      title: 'robot',
      category_name: 'Industrial',
      original_file_format: 'glb',
      thumbnail_url: '/uploads/models/thumbnail-1791785659573-582817570.webp'
    }
  ];

  useEffect(() => {
    let isMounted = true;
    api.getFeatured()
      .then((models) => {
        if (!isMounted) return;
        if (Array.isArray(models) && models.length > 0) {
          setPopularModels(models);
        } else {
          api.getPublicModels('?limit=8')
            .then((res) => {
              if (isMounted && Array.isArray(res) && res.length > 0) {
                setPopularModels(res);
              }
            })
            .catch(() => { });
        }
      })
      .catch((err) => {
        console.warn('Failed to load featured models:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingPopular(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const displayModels = popularModels.length > 0 ? popularModels : (loadingPopular ? [] : fallbackModels);

  // Testimonials from mockup
  const reviews = [
    {
      name: 'Sarah Khan',
      role: 'Interior Designer',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
      stars: 5,
      quote: 'ModelAR has made it so easy for me to find high-quality 3D models for my AR projects. Highly recommended!'
    },
    {
      name: 'James Miller',
      role: 'AR Developer',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      stars: 5,
      quote: 'The variety and quality of models are outstanding. It saves me so much time in development.'
    },
    {
      name: 'Priya Sharma',
      role: 'Architect',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      stars: 5,
      quote: "Excellent platform with realistic models and great support. It's my go-to resource for 3D assets."
    }
  ];

  const handleLaunchHeroAR = () => {
    setActiveModelForAR({
      id: 'mod_armchair_hero',
      title: 'Modern Ergonomic Armchair',
      thumbnail_url: '/images/hero-chair.jpg',
      qr_code_url: '/qr/mod_armchair_hero.png'
    });
  };

  const handleModelClick = (model) => {
    setSelectedModelId(model.id);
    setCurrentView('model-detail');
  };

  const handleLaunchAR = (item) => {
    setActiveModelForAR(item);
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
    const isAndroid = /Android/i.test(ua);
    const rawUrl = item.web_ready_file_url || item.file_url || '';
    if (isAndroid && rawUrl) {
      const absoluteUrl = rawUrl.startsWith('http')
        ? rawUrl
        : `${window.location.origin}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
      const clean = absoluteUrl.split('?')[0].toLowerCase();
      if (clean.endsWith('.glb') || clean.endsWith('.gltf') || clean.includes('/uploads/models/')) {
        const sceneViewerUrl = `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(absoluteUrl)}&mode=ar_preferred&title=${encodeURIComponent(item.title || '3D Model')}&resizable=true#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;end;`;
        try {
          window.location.href = sceneViewerUrl;
        } catch (e) {
          console.warn('[Home Direct AR Error]:', e);
        }
      }
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '100vh', overflowX: 'hidden' }}>
      {/* =========================================================
          1. HERO SECTION (Layout, Color & Font from Mockup)
          ========================================================= */}
      <section style={{
        paddingTop: '64px',
        paddingBottom: '80px',
        position: 'relative',

      }} className='home-banner'>
        <div className="container">
          <div className="hero-grid">
            {/* Left Hero Content */}
            <div>
              <div className="hero-eyebrow">
                3D MODELS FOR A SMARTER TOMORROW
              </div>
              <h1 className="hero-title">
                Premium 3D Models<br />
                for <span className="hero-highlight">AR Experiences</span>
              </h1>
              <p className="hero-subtitle">
                Explore high-quality, industry-ready 3D models and bring your ideas to life with augmented reality.
              </p>

              {/* Action Buttons */}
              <div className="hero-actions">
                <button
                  onClick={() => setCurrentView('explore')}
                  className="btn btn-primary btn-lg"
                  style={{ gap: '10px' }}
                >
                  <span>Browse Models</span>
                  <ArrowRight size={18} />
                </button>

                <button
                  onClick={() => setDemoModalOpen(true)}
                  className="btn btn-lavender btn-lg"
                  style={{ gap: '10px' }}
                >
                  <Play size={16} fill="#8b5cf6" />
                  <span>Watch Demo</span>
                </button>
              </div>

              {/* Stats Counters */}
              <div className="hero-stats-row">
                <div>
                  <div className="hero-stat-number">200+</div>
                  <div className="hero-stat-label">3D Models</div>
                </div>
                <div>
                  <div className="hero-stat-number">10+</div>
                  <div className="hero-stat-label">Industries</div>
                </div>
                <div>
                  <div className="hero-stat-number">50+</div>
                  <div className="hero-stat-label">Happy Creators</div>
                </div>
              </div>
            </div>
            <div className="hero-visual-stage">
              <div className="hero-ambient-glow" />
              <img
                src="/images/3D-chair-AR-visualization-scene.png"
                alt="3D Models for Augmented Reality"
                className="hero-mobile-banner-img"
              />

            </div>
          </div>
        </div>
      </section>



      {/* =========================================================
          3. ABOUT MODELAR SECTION
          ========================================================= */}
      <section className="section-spacer" style={{ position: 'relative' }}>
        <div className="container">
          <div className="responsive-split-wide" style={{ alignItems: 'center' }}>
            {/* Left Copy */}
            <div>
              <div className="hero-eyebrow">
                ABOUT MODELAR
              </div>
              <h2 style={{
                fontSize: '2.6rem',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                lineHeight: 1.2,
                color: '#0f172a',
                marginBottom: '20px'
              }}>
                Making 3D More<br />
                <span style={{ color: '#8b5cf6' }}>Accessible for Everyone</span>
              </h2>
              <p style={{
                fontSize: '1.05rem',
                color: '#64748b',
                lineHeight: 1.7,
                marginBottom: '32px',
                maxWidth: '500px'
              }}>
                ModelAR provides high-quality, ready-to-use 3D models for augmented reality. Our mission is to help businesses, creators, and innovators bring their ideas to life with realistic and optimized 3D assets.
              </p>
              <button
                onClick={() => setCurrentView('about')}
                className="btn btn-primary"
                style={{ padding: '12px 26px', gap: '8px' }}
              >
                <span>Learn More</span>
                <ArrowRight size={16} />
              </button>
            </div>

            {/* Right Layered Visual with Badges */}
            <div className="about-visual-box">
              {/* Floating Badge 1 (Top Left) */}
              <div className="about-floating-badge" style={{ top: '24px', left: '20px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: '#eef0ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#5b4ff5'
                }}>
                  <Box size={16} />
                </div>
                <span>AR Ready</span>
              </div>

              {/* 3D Product Image */}
              <img
                src="/images/Global-Industry-Network-Infographic.png"
                alt="3D AR Asset Representation"

              />

              {/* Floating Badge 2 (Bottom Right) */}
              <div
                className="about-floating-badge"
                style={{
                  bottom: '24px',
                  right: '20px',
                  animationDelay: '1.5s'
                }}
              >
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: '#eef0ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#5b4ff5'
                }}>
                  <Box size={16} />
                </div>
                <span>High Quality 3D Models</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          4. EXPLORE BY INDUSTRY (6 Categories Grid)
          ========================================================= */}
      <section className="section-spacer" style={{ background: '#fafbfe', borderTop: '1px solid #edf0f8', borderBottom: '1px solid #edf0f8' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 48px auto' }}>
            <div className="hero-eyebrow">
              EXPLORE BY INDUSTRY
            </div>
            <h2 style={{ fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a', marginBottom: '12px' }}>
              3D Models for <span style={{ color: '#5b4ff5' }}>Every Industry</span>
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#64748b' }}>
              Find the perfect 3D models tailored to your industry needs.
            </p>
          </div>

          {/* 6 Industry Cards */}
          <div className="industry-grid-6">
            {industries.map((ind) => (
              <div
                key={ind.id}
                className="industry-card-item"
                onClick={() => setCurrentView('explore')}
              >
                <div className="industry-card-thumb">
                  <img src={ind.image} alt={ind.name} />
                </div>
                <div className="industry-card-name">
                  {ind.name}
                </div>
                <div className="industry-card-link">
                  <span>{ind.count}</span>
                  <ArrowRight size={13} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          5. FEATURED / POPULAR 3D MODELS
          ========================================================= */}
      <section className="section-spacer" id="featured-models">
        <div className="container">
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: '44px',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <div className="hero-eyebrow">
                FEATURED MODELS
              </div>
              <h2 style={{ fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a', marginBottom: '8px' }}>
                Popular <span style={{ color: '#5b4ff5' }}>3D Models</span>
              </h2>
              <p style={{ fontSize: '1.02rem', color: '#64748b' }}>
                Experience interactive 3D and WebAR models hosted across various industries.
              </p>
            </div>

            <button
              onClick={() => setCurrentView('explore')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: '#8b5cf6',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer'
              }}
            >
              <span>View All Models</span>
              <ArrowRight size={16} />
            </button>
          </div>

          {/* Popular Product Cards (Dynamic from Uploaded Models) */}
          <div className="popular-models-grid">
            {displayModels.map((item) => {
              const thumbSrc = item.thumbnail_url || item.image || '/images/industrial.jpg';
              return (
                <div key={item.id} className="popular-card-item">
                  <div
                    className="popular-card-thumb"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleModelClick(item)}
                  >
                    <img
                      src={thumbSrc}
                      alt={item.title}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/images/industrial.jpg';
                      }}
                    />
                    <span className="card-format-pill">
                      {item.original_file_format ? `${item.original_file_format.toUpperCase()} • 3D` : '3D & AR'}
                    </span>
                  </div>

                  <div
                    className="popular-card-title"
                    title={item.title}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleModelClick(item)}
                  >
                    {item.title}
                  </div>

                  <div className="popular-card-footer">
                    <div className="popular-card-tag">
                      <span className="ar-dot" />
                      <span>AR Ready</span>
                    </div>
                    <button
                      className="purple-round-btn"
                      title="Experience in WebAR"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLaunchAR(item);
                      }}
                    >
                      <Box size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================
          6. HOW IT WORKS (3 Simple Steps)
          ========================================================= */}
      <section className="section-spacer" style={{ background: '#fafbfe', borderTop: '1px solid #edf0f8', borderBottom: '1px solid #edf0f8' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 56px auto' }}>
            <div className="hero-eyebrow">
              HOW IT WORKS
            </div>
            <h2 style={{ fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a', marginBottom: '12px' }}>
              Get 3D Models in <span style={{ color: '#5b4ff5' }}>3 Simple Steps</span>
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#64748b' }}>
              From search to augmented reality, it's fast and easy.
            </p>
          </div>

          {/* 3 Connected Steps */}
          <div className="steps-container">
            {/* Step 1 */}
            <div className="step-item">
              <div className="step-icon-circle">
                <Search size={28} />
              </div>
              <div className="step-title">1. Search</div>
              <div className="step-desc">
                Browse or search for the 3D models you need.
              </div>
            </div>

            {/* Arrow Divider */}
            <div className="step-arrow">
              <ChevronRight size={28} />
            </div>

            {/* Step 2 */}
            <div className="step-item">
              <div className="step-icon-circle">
                <Download size={28} />
              </div>
              <div className="step-title">2. Download</div>
              <div className="step-desc">
                Get high-quality, optimized 3D models.
              </div>
            </div>

            {/* Arrow Divider */}
            <div className="step-arrow">
              <ChevronRight size={28} />
            </div>

            {/* Step 3 */}
            <div className="step-item">
              <div className="step-icon-circle">
                <Box size={28} />
              </div>
              <div className="step-title">3. Use in AR</div>
              <div className="step-desc">
                Integrate and view in your AR experience.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          7. PRICING PLANS (Monthly / Yearly Switch + 3 Cards)
          ========================================================= */}
      <section className="section-spacer">
        <div className="container">
          <div style={{ marginBottom: '52px' }}>
            <div className="hero-eyebrow">
              PRICING PLANS
            </div>
            <h2 style={{ fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a', marginBottom: '8px' }}>
              Simple & <span style={{ color: '#5b4ff5' }}>Transparent Pricing</span>
            </h2>
            <p style={{ fontSize: '1.02rem', color: '#64748b' }}>
              Choose the plan that fits your needs.
            </p>
          </div>

          {/* 3 Pricing Cards (Free, Creator, Business) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
            gap: '24px',
            alignItems: 'stretch'
          }}>
            {/* Free Plan */}
            <div style={{
              background: '#ffffff',
              borderRadius: '20px',
              border: '1px solid #e2e8f0',
              padding: '36px 28px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)'
            }}>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                  Free
                </h3>
                <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '18px' }}>
                  Try out 3d and AR sharing solo
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                  <span style={{ fontSize: '2.8rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>₹0</span>
                  <span style={{ fontSize: '0.95rem', color: '#64748b', fontWeight: 500 }}>/mo</span>
                </div>
              </div>

              {/* Metric Badges */}
              <div style={{ marginBottom: '28px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>COINS/MO</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>30</div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>STORAGE</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>1 GB</div>
                  </div>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>FILE UPDATES</span>
                  <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0f172a' }}>1 free, then 10 coins</span>
                </div>
              </div>

              {/* Feature Checklist */}
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                {[
                  '100 bonus coins on signup',
                  '30 coins/month allowance',
                  '1 free file update, then 10 coins each',
                  'Public sharing and QR links',
                  'Community support'
                ].map((feat, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.92rem', color: '#334155' }}>
                    <span style={{ width: '13px', height: '13px', border: '1.5px solid #cbd5e1', borderRadius: '3px', flexShrink: 0, marginTop: '3px' }} />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => setCurrentView('register')}
                style={{
                  width: '100%',
                  padding: '13px 20px',
                  borderRadius: '12px',
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  color: '#1e293b',
                  fontSize: '0.96rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#94a3b8';
                  e.currentTarget.style.background = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.background = '#ffffff';
                }}
              >
                Start free
              </button>
            </div>

            {/* Creator Plan (Most Popular) */}
            <div style={{
              background: '#ffffff',
              borderRadius: '20px',
              border: '2px solid rgb(91, 79, 245)',
              padding: '36px 28px',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              boxShadow: '0 10px 30px rgba(234, 88, 12, 0.1)',
              transform: 'scale(1.02)',
              zIndex: 1
            }}>
              {/* Most popular badge */}
              <div style={{
                position: 'absolute',
                top: '-13px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgb(91, 79, 245)',
                color: '#ffffff',
                padding: '3px 16px',
                borderRadius: '9999px',
                fontSize: '0.78rem',
                fontWeight: 700,
                boxShadow: '0 2px 6px rgba(234, 88, 12, 0.3)'
              }}>
                Most popular
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                  Creator
                </h3>
                <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '18px' }}>
                  Solo freelancers and photographers
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                  <span style={{ fontSize: '2.8rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>₹299</span>
                  <span style={{ fontSize: '0.95rem', color: '#64748b', fontWeight: 500 }}>/mo</span>
                </div>
              </div>

              {/* Metric Badges (Tinted light purple) */}
              <div style={{ marginBottom: '28px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ background: '#faf5ff', padding: '12px 14px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.04em' }}>COINS/MO</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#8b5cf6', marginTop: '2px' }}>300</div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>STORAGE</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>10 GB</div>
                  </div>
                </div>
                <div style={{ background: '#faf5ff', padding: '10px 14px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.04em' }}>FILE UPDATES</span>
                  <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#8b5cf6' }}>5 free/month</span>
                </div>
              </div>

              {/* Feature Checklist */}
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                {[
                  '1 workspace, 1 login (solo)',
                  '25 active AR models',
                  '+20 coins/day (capped at 60/mo)',
                  'Private and public sharing',
                  'Coin top-ups, email support'
                ].map((feat, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.92rem', color: '#334155' }}>
                    <span style={{ width: '13px', height: '13px', border: '1.5px solid #c4b5fd', borderRadius: '3px', flexShrink: 0, marginTop: '3px' }} />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe('creator')}
                style={{
                  width: '100%',
                  padding: '13px 20px',
                  borderRadius: '12px',
                  background: '#8b5cf6',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.96rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#7c3aed';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#8b5cf6';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Subscribe to Creator
              </button>
            </div>

            {/* Business Plan */}
            <div style={{
              background: '#ffffff',
              borderRadius: '20px',
              border: '1px solid #e2e8f0',
              padding: '36px 28px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)'
            }}>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                  Business
                </h3>
                <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '18px' }}>
                  Teams of 3+ logins, shared workspace
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                  <span style={{ fontSize: '2.8rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>₹799</span>
                  <span style={{ fontSize: '0.95rem', color: '#64748b', fontWeight: 500 }}>/mo</span>
                </div>
              </div>

              {/* Metric Badges */}
              <div style={{ marginBottom: '28px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>COINS/MO</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>1,000</div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>STORAGE</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>50 GB</div>
                  </div>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>FILE UPDATES</span>
                  <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0f172a' }}>30 free/month</span>
                </div>
              </div>

              {/* Feature Checklist */}
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                {[
                  '1 workspace, up to 10 invited logins',
                  'Shared coin pool and storage',
                  '100 active AR models',
                  '+20 coins/day (capped at 200/mo)',
                  'Unlimited file updates included',
                  'Priority processing and support'
                ].map((feat, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.92rem', color: '#334155' }}>
                    <span style={{ width: '13px', height: '13px', border: '1.5px solid #cbd5e1', borderRadius: '3px', flexShrink: 0, marginTop: '3px' }} />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe('business')}
                style={{
                  width: '100%',
                  padding: '13px 20px',
                  borderRadius: '12px',
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  color: '#1e293b',
                  fontSize: '0.96rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#94a3b8';
                  e.currentTarget.style.background = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.background = '#ffffff';
                }}
              >
                Subscribe to Business
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          8. WHAT OUR USERS SAY (Testimonials)
          ========================================================= */}
      <section className="section-spacer" style={{ background: '#fafbfe', borderTop: '1px solid #edf0f8' }}>
        <div className="container">
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: '44px',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <div className="hero-eyebrow">
                WHAT OUR USERS SAY
              </div>
              <h2 style={{ fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a', marginBottom: '8px' }}>
                Trusted by <span style={{ color: '#5b4ff5' }}>Creators Worldwide</span>
              </h2>
            </div>

            <button
              onClick={() => setCurrentView('about')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: '#8b5cf6',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer'
              }}
            >
              <span>View All Reviews</span>
              <ArrowRight size={16} />
            </button>
          </div>

          {/* 3 Review Cards */}
          <div className="packages-grid-3">
            {reviews.map((rev, idx) => (
              <div key={idx} className="review-card-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <img
                    src={rev.avatar}
                    alt={rev.name}
                    style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#0f172a' }}>
                      {rev.name}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                      {rev.role}
                    </div>
                  </div>
                </div>

                {/* 5 Stars */}
                <div style={{ display: 'flex', gap: '3px', color: '#f59e0b', marginBottom: '14px' }}>
                  {[...Array(rev.stars)].map((_, i) => (
                    <Star key={i} size={15} fill="#f59e0b" color="#f59e0b" />
                  ))}
                </div>

                <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.6, flex: 1 }}>
                  "{rev.quote}"
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          9. CTA BANNER (Ready to bring your ideas to life?)
          ========================================================= */}
      <section style={{ padding: '60px 0 80px 0', background: '#ffffff' }}>
        <div className="container">
          <div className="cta-banner-container">
            <div>
              <div style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'rgba(255, 255, 255, 0.85)',
                marginBottom: '10px'
              }}>
                READY TO BRING YOUR IDEAS TO LIFE?
              </div>
              <h2 style={{
                fontSize: '2.5rem',
                fontWeight: 800,
                color: '#ffffff',
                marginBottom: '10px',
                letterSpacing: '-0.02em'
              }}>
                Start Using ModelAR Today
              </h2>
              <p style={{
                fontSize: '1.05rem',
                color: 'rgba(255, 255, 255, 0.9)',
                maxWidth: '560px'
              }}>
                Join thousands of creators and businesses using ModelAR for their AR experiences.
              </p>
            </div>

            <div>
              <button
                onClick={() => setCurrentView('register')}
                style={{
                  background: '#ffffff',
                  color: '#8b5cf6',
                  padding: '14px 32px',
                  borderRadius: '9999px',
                  fontWeight: 700,
                  fontSize: '1rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                  border: 'none',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; }}
              >
                <span>Get Started</span>
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          10. MODALS (AR View, QR Modal & Live Demo)
          ========================================================= */}
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

      {/* Demo Video Modal */}
      {demoModalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setDemoModalOpen(false)}
          style={{ zIndex: 99999 }}
        >
          <div
            className="modal-content"
            style={{
              maxWidth: '860px',
              padding: '24px',
              borderRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: '#ffffff',
              boxShadow: '0 25px 60px rgba(15, 23, 42, 0.35)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '18px',
              paddingBottom: '14px',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              </div>

              <button
                onClick={() => setDemoModalOpen(false)}
                aria-label="Close modal"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#f1f5f9',
                  border: 'none',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e2e8f0';
                  e.currentTarget.style.color = '#0f172a';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f1f5f9';
                  e.currentTarget.style.color = '#64748b';
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Video Player Frame */}
            <div style={{
              position: 'relative',
              width: '100%',
              borderRadius: '16px',
              overflow: 'hidden',
              background: '#0b0f19',
              aspectRatio: '16 / 9',
              boxShadow: '0 12px 32px rgba(15, 23, 42, 0.25)',
              border: '1px solid rgba(139, 92, 246, 0.15)'
            }}>
              {getEmbedUrl(demoVideoUrl) ? (
                <iframe
                  src={getEmbedUrl(demoVideoUrl)}
                  title="ModelAR Demo Video"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  controls
                  autoPlay
                  playsInline
                  poster="/images/banner-image.jpg"
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'block'
                  }}
                >
                  <source src={demoVideoUrl} type="video/mp4" />
                  Your browser does not support HTML5 video playback.
                </video>
              )}
            </div>

            {/* Footer / Call to action */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              marginTop: '18px',
              paddingTop: '14px',
              borderTop: '1px solid #f1f5f9'
            }}>


            </div>
          </div>
        </div>
      )}

      {/* Stripe Payment Modal */}
      {showStripeModal && stripePaymentData && (
        <StripePayment
          planId={stripePaymentData.id}
          planName={stripePaymentData.name}
          price={stripePaymentData.price}
          onClose={() => {
            setShowStripeModal(false);
            setStripePaymentData(null);
          }}
        />
      )}
    </div>
  );
}
