import React from 'react';
import {
  Factory, Cog, Flame, Utensils, Armchair, Bed,
  Building, Store, Car, ArrowRight, Smartphone
} from 'lucide-react';

export default function Industries({ setCurrentView }) {
  const industries = [
    {
      id: 'ind-mfg',
      name: 'Industrial & Manufacturing',
      icon: <Factory size={28} color="#8b5cf6" />,
      image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
      description: 'Host heavy machinery components, robotic weld fixtures, stamping dies, and automated assembly cells. Plant managers can inspect true scale and pipe connection clearances on-site.',
      useCases: ['Robotic tool end-effectors', 'Automated packaging cells', 'Custom CNC tooling fixtures', 'Safety guards and perimeter barriers']
    },
    {
      id: 'mach-eq',
      name: 'Machinery & Equipment',
      icon: <Cog size={28} color="#8b5cf6" />,
      image: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80',
      description: 'Showcase centrifugal slurry pumps, hydraulic power units, air compressors, and turbine rotors directly to procurement leads without hauling multi-ton physical demo units.',
      useCases: ['Centrifugal and positive displacement pumps', 'Screw air compressor skids', 'Hydraulic valve manifolds', 'Industrial heat exchangers']
    },
    {
      id: 'comm-kit',
      name: 'Commercial Kitchens',
      icon: <Flame size={28} color="#8b5cf6" />,
      image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
      description: 'Restaurant franchisees and kitchen consultants can test combi ovens, custom stainless fabrication, and ventilation hood clearances directly inside real physical kitchens via WebAR.',
      useCases: ['10-pan and 20-pan combi steamers', 'Heavy-duty 6-burner gas ranges', 'Walk-in refrigeration units', 'Underbar stainless sink assemblies']
    },
    {
      id: 'food-rest',
      name: 'Food & Restaurant',
      icon: <Utensils size={28} color="#8b5cf6" />,
      image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80',
      description: 'Present high-end espresso machine setups, bakery display warmers, and dining layouts with QR codes printed directly on sales collateral and table tents.',
      useCases: ['Commercial 3-group espresso machines', 'Heated curved-glass bakery showcases', 'Beverage dispensing towers', 'Booth & banquet seating layouts']
    },
    {
      id: 'furn-int',
      name: 'Furniture & Interior',
      icon: <Armchair size={28} color="#8b5cf6" />,
      image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80',
      description: 'Contract furniture manufacturers let corporate interior designers place ergonomic task chairs, acoustic work pods, and boardroom tables directly into office floor plans.',
      useCases: ['LEED-certified task chairs', 'Height-adjustable executive desks', 'Modular acoustic privacy phone booths', 'Collaborative lounge breakout units']
    },
    {
      id: 'hosp-hot',
      name: 'Hospitality & Hotels',
      icon: <Bed size={28} color="#8b5cf6" />,
      image: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80',
      description: 'Architects and hotel operators visualize prefabricated guestroom pods, headboard millwork, and luxury bathroom fixtures inside renovation shells before manufacturing starts.',
      useCases: ['Prefab modular hotel guestrooms', 'Architectural lobby chandeliers', 'Bespoke hotel vanity millwork', 'Resort outdoor cabana suites']
    },
    {
      id: 'arch-con',
      name: 'Architecture & Construction',
      icon: <Building size={28} color="#8b5cf6" />,
      image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
      description: 'Share BIM-derived structural connectors, prefabricated facade panels, and complex HVAC duct runs with site supervisors and general contractors through QR scanning.',
      useCases: ['Prefabricated curtain wall panels', 'Seismic structural steel nodes', 'HVAC duct distribution manifolds', 'Modular bathroom pods']
    },
    {
      id: 'comm-spc',
      name: 'Commercial Spaces',
      icon: <Store size={28} color="#8b5cf6" />,
      image: 'https://images.unsplash.com/photo-1567449303078-57ad995bd301?auto=format&fit=crop&w=800&q=80',
      description: 'Retail fixture fabricators and exhibition designers can simulate pop-up store booths, POS checkout kiosks, and showroom displays right in convention center halls.',
      useCases: ['Exhibition trade show booths', 'Retail interactive merchandising fixtures', 'Self-service touchscreen checkout kiosks', 'Perimeter retail shelving bays']
    },
    {
      id: 'auto-eng',
      name: 'Automotive',
      icon: <Car size={28} color="#8b5cf6" />,
      image: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80',
      description: 'Automotive tier-1 suppliers present complete powertrain assemblies, turbocharger manifolds, and EV skateboard battery modules to OEM engineering evaluators.',
      useCases: ['Twin-turbo V6 internal combustion engines', 'High-voltage EV battery pack assemblies', 'Independent double-wishbone suspension corners', 'Lightweight cast aluminum steering knuckles']
    }
  ];

  return (
    <div className="section-spacer">
      <div className="container">
        <div className="section-header">
          <div className="section-badge">B2B Verticals</div>
          <h1 className="section-title">Industry-Specific 3D & WebAR Applications</h1>
          <p className="section-subtitle">
            ModelAR is engineered specifically for physical products, complex CAD engineering, and built environments.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
          {industries.map((ind, idx) => (
            <div
              key={ind.id}
              className="card industry-vertical-card"
              style={{
                display: 'grid',
                gridTemplateColumns: idx % 2 === 0 ? '1.2fr 1fr' : '1fr 1.2fr',
                gap: '36px',
                overflow: 'hidden'
              }}
            >
              <div
                className="card-media-col"
                style={{
                  order: idx % 2 === 0 ? 1 : 2,
                  height: '340px',
                  overflow: 'hidden'
                }}
              >
                <img
                  src={ind.image}
                  alt={ind.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              <div
                className="card-content-col"
                style={{
                  order: idx % 2 === 0 ? 2 : 1,
                  padding: '36px 32px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ padding: '8px', background: '#f5f3ff', borderRadius: '10px' }}>
                    {ind.icon}
                  </div>
                  <h3 style={{ fontSize: '1.4rem' }}>{ind.name}</h3>
                </div>
                <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: 1.6, marginBottom: '20px' }}>
                  {ind.description}
                </p>
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Common B2B Deployments:
                  </div>
                  <ul className="form-grid-2" style={{ listStyle: 'none', gap: '8px' }}>
                    {ind.useCases.map((uc, i) => (
                      <li key={i} style={{ fontSize: '0.86rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#8b5cf6' }}>•</span> {uc}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <button onClick={() => setCurrentView('explore')} className="btn btn-secondary btn-sm">
                    <span>View {ind.name} Models</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .industry-vertical-card {
            grid-template-columns: 1fr !important;
            gap: 0 !important;
          }
          .card-media-col {
            order: 1 !important;
            height: 220px !important;
          }
          .card-content-col {
            order: 2 !important;
            padding: 24px 20px !important;
          }
        }
      `}</style>
    </div>
  );
}
