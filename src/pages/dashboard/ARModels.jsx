import React, { useState, useEffect } from 'react';
import { Smartphone, CheckCircle2, AlertCircle, Eye, Power } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ARModal from '../../components/ARModal';

export default function ARModels() {
  const { success, error } = useToast();
  const [models, setModels] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [activeModelForAR, setActiveModelForAR] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchARData = async () => {
    try {
      const [mods, ana] = await Promise.all([
        api.getMyModels(),
        api.getDashboardAnalytics()
      ]);
      setModels(mods);
      setAnalytics(ana);
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchARData();
  }, []);

  const handleToggleAR = async (model) => {
    try {
      const newStatus = !model.ar_active;
      await api.updateModel(model.id, { arActive: newStatus });
      success(`WebAR ${newStatus ? 'enabled' : 'disabled'} for "${model.title}"`);
      fetchARData();
    } catch (err) {
      error(err.message || 'Failed to toggle AR status');
    }
  };

  if (loading) return <div style={{ color: '#64748b' }}>Loading AR model fleet...</div>;

  const arLimit = analytics?.subscription?.arLimit || 10;
  const activeCount = models.filter((m) => m.ar_active).length;

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.9rem', marginBottom: '4px' }}>Active WebAR Models</h1>
        <p style={{ color: '#64748b', fontSize: '0.92rem' }}>
          Monitor active augmented reality deployment quotas and test live camera projection.
        </p>
      </div>

      {/* Quota Gauge Card */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '24px 28px',
        marginBottom: '32px',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: '#ecfdf5',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Smartphone size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '2px' }}>
              {activeCount} of {arLimit} Active AR Slots Used
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Active models are immediately ready for iOS QuickLook and Android SceneViewer camera placement.
            </p>
          </div>
        </div>

        <div style={{
          width: '200px',
          height: '10px',
          background: '#e2e8f0',
          borderRadius: '5px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${Math.min(100, (activeCount / arLimit) * 100)}%`,
            height: '100%',
            background: activeCount >= arLimit ? '#ef4444' : '#10b981'
          }} />
        </div>
      </div>

      {/* Models Grid */}
      <div className="models-grid">
        {models.map((m) => (
          <div key={m.id} className="card">
            <div style={{ height: '180px', overflow: 'hidden', position: 'relative' }}>
              <img
                src={m.thumbnail_url}
                alt={m.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
                <span className={`badge ${m.ar_active ? 'badge-success' : 'badge-neutral'}`}>
                  {m.ar_active ? 'AR Active' : 'AR Paused'}
                </span>
              </div>
            </div>

            <div className="card-body">
              <h4 style={{ fontSize: '1.05rem', marginBottom: '6px' }}>{m.title}</h4>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '16px' }}>
                {m.ar_views_count} Real-world AR launches recorded
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setActiveModelForAR(m)}
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1 }}
                >
                  <Smartphone size={15} />
                  <span>Test AR</span>
                </button>
                <button
                  onClick={() => handleToggleAR(m)}
                  className="btn btn-secondary btn-sm"
                  title={m.ar_active ? 'Disable AR to free quota' : 'Enable AR'}
                >
                  <Power size={15} color={m.ar_active ? '#ef4444' : '#10b981'} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {activeModelForAR && (
        <ARModal model={activeModelForAR} onClose={() => setActiveModelForAR(null)} />
      )}
    </div>
  );
}
