import React from 'react';
import { UploadCloud, Sliders, QrCode, Smartphone, ArrowRight, ShieldCheck, Check } from 'lucide-react';

export default function HowItWorks({ setCurrentView }) {
  const steps = [
    {
      step: '01',
      title: 'Upload Your CAD or 3D File',
      desc: 'Drag & drop technical files in GLB, GLTF, OBJ, STL, or STEP format up to 50MB. Our cloud queue validates geometry, generates LODs (levels of detail), decimate meshes for mobile performance, and builds universal WebAR deliverables.',
      badge: '25 Coins Deduction (Strictly on Success)',
      details: ['Zero deduction if conversion fails', 'Automatic material and texture baking', 'High-compression Draco / meshopt optimization']
    },
    {
      step: '02',
      title: 'Add Specifications & Choose Visibility',
      desc: 'Organize models into custom business galleries (e.g., "Pumps & Turbines", "Showroom Displays"). Choose between Public Discovery for open marketing or Private Token Access for confidential NDA client presentations.',
      badge: 'Public or Private Mode',
      details: ['Custom industry categorization', 'Download original CAD vs Web-ready GLB', 'Restricted token sharing for confidential RFPs']
    },
    {
      step: '03',
      title: 'Generate & Deploy Custom QR Codes',
      desc: 'ModelAR automatically generates dynamic, high-resolution QR codes mapped directly to your model. Choose from preset templates tailored for physical machinery asset tags, product brochures, showroom standees, or restaurant menu tents.',
      badge: 'B2B Deployment Presets',
      details: ['Download print-ready high-res PNG & SVG', 'Printable asset tag sheets', 'Real-time scan counter and analytics tracking']
    },
    {
      step: '04',
      title: 'Experience in 1:1 True-Scale WebAR',
      desc: 'When clients scan the QR code with any modern iOS or Android device, the model opens instantly in browser-native WebAR. Customers place the model on their actual floor, rotate, inspect clearances, and verify fit without installing an app.',
      badge: 'Zero App Installation',
      details: ['Apple QuickLook (USDZ) for iOS Safari', 'Google SceneViewer & WebXR for Android Chrome', 'Desktop fallback with interactive WebGL studio viewer']
    }
  ];

  return (
    <div className="section-spacer">
      <div className="container">
        <div className="section-header">
          <div className="section-badge">Platform Architecture</div>
          <h1 className="section-title">How ModelAR Works</h1>
          <p className="section-subtitle">
            An end-to-end pipeline that transforms raw engineering files into instant client-facing 3D and WebAR experiences.
          </p>
        </div>

        {/* Steps Flow */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '36px', maxWidth: '920px', margin: '0 auto 60px auto' }}>
          {steps.map((s) => (
            <div
              key={s.step}
              className="card howitworks-card"
              style={{
                padding: '32px',
                display: 'grid',
                gridTemplateColumns: '80px 1fr',
                gap: '24px',
                alignItems: 'flex-start'
              }}
            >
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #f5f3ff, #e9d5ff)',
                color: '#8b5cf6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 800
              }}>
                {s.step}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '1.3rem' }}>{s.title}</h3>
                  <span className="badge badge-primary">{s.badge}</span>
                </div>
                <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: 1.6, marginBottom: '16px' }}>
                  {s.desc}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {s.details.map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.86rem', color: '#334155' }}>
                      <Check size={16} color="#10b981" />
                      <span>{d}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center' }}>
          <button onClick={() => setCurrentView('register')} className="btn btn-primary btn-lg" style={{ maxWidth: '100%' }}>
            <span>Get Started with 100 Free Bonus Coins</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .howitworks-card {
            grid-template-columns: 1fr !important;
            padding: 20px 18px !important;
            gap: 16px !important;
          }
        }
      `}</style>
    </div>
  );
}
