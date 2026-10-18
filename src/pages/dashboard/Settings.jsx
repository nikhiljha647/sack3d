import React, { useState } from 'react';
import { Building, User, Mail, Globe, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function Settings() {
  const { user, business } = useAuth();
  const { success } = useToast();

  const [companyName, setCompanyName] = useState(business?.name || '');
  const [industry, setIndustry] = useState('Industrial & Manufacturing');
  const [website, setWebsite] = useState('https://company.example.com');

  const handleSave = (e) => {
    e.preventDefault();
    success('Settings updated successfully');
  };

  return (
    <div style={{ maxWidth: '680px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.9rem', marginBottom: '4px' }}>Workspace Settings</h1>
        <p style={{ color: '#64748b', fontSize: '0.92rem' }}>
          Manage company profile information, primary industry classification, and preferences.
        </p>
      </div>

      <div className="card" style={{ padding: 'clamp(20px, 4vw, 36px)' }}>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Company / Organization Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Primary Industry</label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="form-select"
            >
              <option value="Industrial & Manufacturing">Industrial & Manufacturing</option>
              <option value="Machinery & Equipment">Machinery & Equipment</option>
              <option value="Commercial Kitchens">Commercial Kitchens</option>
              <option value="Food & Restaurant">Food & Restaurant</option>
              <option value="Furniture & Interior">Furniture & Interior</option>
              <option value="Hospitality & Hotels">Hospitality & Hotels</option>
              <option value="Architecture & Construction">Architecture & Construction</option>
              <option value="Commercial Spaces">Commercial Spaces</option>
              <option value="Automotive">Automotive</option>
              <option value="Engineering">Engineering / Other</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Corporate Website</label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Primary Contact Email</label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="form-input"
              style={{ background: '#f8fafc', color: '#64748b' }}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>
            <Save size={16} />
            <span>Save Settings</span>
          </button>
        </form>
      </div>
    </div>
  );
}
