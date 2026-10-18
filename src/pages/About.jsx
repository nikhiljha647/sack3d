import React from 'react';
import { Target, Zap, Sparkles, Lock, Rocket, CheckCircle2, Layers } from 'lucide-react';

export default function About({ setCurrentView }) {
  const values = [
    {
      icon: <Target size={24} />,
      title: 'B2B Focused',
      description: 'Purpose-built for industrial machinery, commercial equipment, and architectural products—not entertainment assets.',
      color: '#8b5cf6'
    },
    {
      icon: <Lock size={24} />,
      title: 'Enterprise Security',
      description: 'Private workspace isolation, signed URLs, role-based permissions, and audit trails for proprietary CAD protection.',
      color: '#7c3aed'
    },
    {
      icon: <Zap size={24} />,
      title: 'Zero-App WebAR',
      description: 'Native browser AR using Apple QuickLook (iOS) and Google SceneViewer (Android)—no app downloads required.',
      color: '#a78bfa'
    },
    {
      icon: <Rocket size={24} />,
      title: 'Lightning Fast',
      description: 'Automated mesh optimization, LOD generation, and CDN-ready WebGL assets for instant 3D loading worldwide.',
      color: '#c4b5fd'
    }
  ];

  const stats = [
    { value: '10,000+', label: '3D Models Hosted' },
    { value: '500+', label: 'B2B Companies' },
    { value: '98%', label: 'Uptime SLA' },
    { value: '<2s', label: 'Average Load Time' }
  ];

  const features = [
    'Automated CAD to WebGL/USDZ conversion pipeline',
    'Instant QR code generation for offline sharing',
    'Team collaboration with granular permissions',
    'Private model sharing with expiring links',
    'Usage analytics & viewer heatmaps'
  ];

  return (
    <div className="section-spacer">
      {/* Hero Section */}
      <div className="container" style={{ marginBottom: '80px' }}>
        <div className="section-header" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="section-badge">
            <Sparkles size={14} style={{ marginRight: '6px' }} />
            Our Mission
          </div>
          <h1 className="section-title" style={{ fontSize: '3.2rem', marginBottom: '20px' }}>
            Transforming CAD into 
            <span style={{ 
              background: 'linear-gradient(135deg, #8b5cf6 0%, #c084fc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}> Interactive AR</span>
          </h1>
          <p className="section-subtitle" style={{ fontSize: '1.15rem', maxWidth: '700px', margin: '0 auto' }}>
            We bridge the gap between technical 3D engineering and customer-facing augmented reality for modern B2B businesses.
          </p>
        </div>

        {/* Stats Bar */}
        <div className="kpi-grid-4" style={{
          marginTop: '60px',
          padding: '36px 24px',
          background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
          borderRadius: '24px',
          boxShadow: '0 20px 60px rgba(139, 92, 246, 0.3)'
        }}>
          {stats.map((stat, idx) => (
            <div key={idx} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#e9d5ff', fontWeight: 600 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Problem Statement */}
      <section style={{ marginBottom: '80px', background: '#faf5ff', padding: '60px 0' }}>
        <div className="container">
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <h2 style={{ 
              fontSize: '2.4rem', 
              fontWeight: 800, 
              textAlign: 'center',
              marginBottom: '48px',
              color: '#0f172a'
            }}>
              The Problem We <span style={{ color: '#8b5cf6' }}>Solve</span>
            </h2>
            
            <div className="responsive-split" style={{ alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '16px', color: '#1e293b' }}>
                  The Old Way
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    'Static 2D PDF spec sheets',
                    'Flat photo brochures',
                    'Cumbersome physical samples',
                    'Lengthy approval cycles',
                    'Expensive trade show booths'
                  ].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem', color: '#64748b' }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>✕</span>
                      </div>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '16px', color: '#1e293b' }}>
                  The ModelAR Way
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    'Interactive 3D web viewers',
                    'True-scale AR placement',
                    'Instant QR code sharing',
                    'Real-time collaboration',
                    'Global digital showroom'
                  ].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem', color: '#334155', fontWeight: 500 }}>
                      <CheckCircle2 size={20} color="#10b981" style={{ flexShrink: 0 }} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{
              marginTop: '48px',
              padding: '32px',
              background: '#ffffff',
              borderRadius: '16px',
              border: '2px solid #e9d5ff',
              boxShadow: '0 4px 20px rgba(139, 92, 246, 0.1)'
            }}>
              <p style={{ fontSize: '1.05rem', color: '#475569', lineHeight: 1.8, margin: 0 }}>
                <strong style={{ color: '#1e293b' }}>ModelAR was founded to eliminate this friction.</strong> We provide an enterprise cloud platform where companies can upload complex CAD files (STEP, STL, OBJ, GLB), convert them into lightweight WebGL and WebAR assets, generate QR codes, and let prospective buyers place true-scale equipment into real environments with a single phone camera scan.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section style={{ marginBottom: '80px' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2 style={{ fontSize: '2.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
              Core Platform <span style={{ color: '#8b5cf6' }}>Principles</span>
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#64748b', maxWidth: '600px', margin: '0 auto' }}>
              Built from the ground up for enterprise reliability, security, and performance
            </p>
          </div>

          <div className="responsive-split" style={{ maxWidth: '1100px', margin: '0 auto' }}>
            {values.map((value, idx) => (
              <div key={idx} style={{
                padding: '36px',
                background: '#ffffff',
                borderRadius: '20px',
                border: '1px solid #e9d5ff',
                boxShadow: '0 8px 24px rgba(139, 92, 246, 0.08)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 16px 40px rgba(139, 92, 246, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(139, 92, 246, 0.08)';
              }}
              >
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '14px',
                  background: `linear-gradient(135deg, ${value.color}15, ${value.color}08)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px',
                  color: value.color
                }}>
                  {value.icon}
                </div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
                  {value.title}
                </h3>
                <p style={{ fontSize: '0.95rem', color: '#64748b', lineHeight: 1.7, margin: 0 }}>
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Features */}
      <section style={{ marginBottom: '80px', background: '#ffffff', padding: '80px 0', borderTop: '1px solid #e9d5ff', borderBottom: '1px solid #e9d5ff' }}>
        <div className="container">
          <div className="responsive-split" style={{ alignItems: 'center', maxWidth: '1100px', margin: '0 auto' }}>
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: '#f5f3ff',
                borderRadius: '30px',
                marginBottom: '20px'
              }}>
                <Layers size={16} color="#8b5cf6" />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Enterprise Features
                </span>
              </div>
              <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '20px', lineHeight: 1.2 }}>
                Everything You Need to Scale 3D
              </h2>
              <p style={{ fontSize: '1.05rem', color: '#64748b', lineHeight: 1.7, marginBottom: '32px' }}>
                A complete platform designed for modern manufacturing, architecture, and commercial equipment teams.
              </p>
              <button onClick={() => setCurrentView('pricing')} className="btn btn-primary btn-lg">
                View Plans & Pricing
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {features.map((feature, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '16px 20px',
                  background: '#faf5ff',
                  borderRadius: '12px',
                  border: '1px solid #f3e8ff'
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <CheckCircle2 size={18} color="#ffffff" />
                  </div>
                  <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b' }}>
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ marginBottom: '40px' }}>
        <div className="container">
          <div style={{
            maxWidth: '900px',
            margin: '0 auto',
            padding: '40px 24px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)',
            borderRadius: '24px',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(139, 92, 246, 0.3)'
          }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#ffffff', marginBottom: '16px' }}>
              Ready to Transform Your 3D Workflow?
            </h2>
            <p style={{ fontSize: '1.1rem', color: '#e9d5ff', marginBottom: '36px', maxWidth: '600px', margin: '0 auto 36px auto' }}>
              Join hundreds of manufacturing and architecture teams using ModelAR to showcase products in augmented reality.
            </p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button 
                onClick={() => setCurrentView('register')} 
                style={{
                  padding: '14px 32px',
                  borderRadius: '12px',
                  background: '#ffffff',
                  color: '#8b5cf6',
                  fontSize: '1rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Start Free Trial
              </button>
              <button 
                onClick={() => setCurrentView('contact')} 
                style={{
                  padding: '14px 32px',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.15)',
                  color: '#ffffff',
                  fontSize: '1rem',
                  fontWeight: 700,
                  border: '2px solid rgba(255,255,255,0.3)',
                  cursor: 'pointer',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
