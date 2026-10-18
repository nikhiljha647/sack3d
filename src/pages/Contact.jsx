import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function Contact() {
  const { success, error } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    industry: 'Industrial & Manufacturing',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      error('Please fill in your name, email, and message.');
      return;
    }
    setLoading(true);
    try {
      await api.sendContact(formData);
      setSubmitted(true);
      success('Thank you! Your message has been sent to our sales engineering team.');
    } catch (err) {
      error(err.message || 'Failed to submit form');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section-spacer">
      <div className="container">
        <div className="section-header">
          <div className="section-badge">Get in Touch</div>
          <h1 className="section-title">Contact ModelAR Sales & Support</h1>
          <p className="section-subtitle">
            Have questions regarding CAD format support, team workspaces, or custom deployment? Connect with our technical specialists.
          </p>
        </div>

        <div className="responsive-split-wide" style={{
          maxWidth: '1040px',
          margin: '0 auto'
        }}>
          {/* Form */}
          <div className="card" style={{ padding: 'clamp(20px, 4vw, 36px)' }}>
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto 16px auto' }} />
                <h3 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Message Received</h3>
                <p style={{ color: '#64748b', marginBottom: '24px' }}>
                  Our enterprise CAD specialist will review your inquiry and connect via email within 24 hours.
                </p>
                <button
                  onClick={() => { setSubmitted(false); setFormData({ name: '', email: '', company: '', industry: 'Industrial & Manufacturing', message: '' }); }}
                  className="btn btn-secondary"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="form-input"
                    placeholder="e.g. Vikram Mehta"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Work Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="form-input"
                    placeholder="e.g. vikram@apexmanufacturing.com"
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Company Name</label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="form-input"
                      placeholder="e.g. Apex Engineering"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Industry</label>
                    <select
                      value={formData.industry}
                      onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                      className="form-select"
                    >
                      <option value="Industrial & Manufacturing">Industrial & Manufacturing</option>
                      <option value="Machinery & Equipment">Machinery & Equipment</option>
                      <option value="Commercial Kitchens">Commercial Kitchens</option>
                      <option value="Food & Restaurant">Food & Restaurant</option>
                      <option value="Furniture & Interior">Furniture & Interior</option>
                      <option value="Hospitality & Hotels">Hospitality & Hotels</option>
                      <option value="Architecture & Construction">Architecture & Construction</option>
                      <option value="Automotive">Automotive</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">How can we help? *</label>
                  <textarea
                    rows={4}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="form-textarea"
                    placeholder="Tell us about your 3D CAD models, target QR deployment, or team requirements..."
                  />
                </div>

                <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
                  <Send size={16} />
                  <span>{loading ? 'Submitting...' : 'Send Message'}</span>
                </button>
              </form>
            )}
          </div>

          {/* Contact Details & Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', justifyContent: 'center' }}>
            <div className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
                <div style={{ padding: '10px', background: '#f5f3ff', borderRadius: '10px', color: '#8b5cf6' }}>
                  <Mail size={20} />
                </div>
                <div>
                  <h4 style={{ fontSize: '1rem' }}>Email Us</h4>
                  <a href="mailto:support@modelar.io" style={{ color: '#8b5cf6', fontSize: '0.88rem' }}>support@modelar.io</a>
                </div>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#64748b' }}>We typically respond within 2-4 hours on business days.</p>
            </div>

            <div className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
                <div style={{ padding: '10px', background: '#f5f3ff', borderRadius: '10px', color: '#7c3aed' }}>
                  <Phone size={20} />
                </div>
                <div>
                  <h4 style={{ fontSize: '1rem' }}>B2B Enterprise Hotline</h4>
                  <span style={{ color: '#334155', fontSize: '0.88rem', fontWeight: 600 }}>+91 (080) 4122-8900</span>
                </div>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#64748b' }}>Monday to Friday • 9:00 AM – 6:00 PM IST</p>
            </div>

            <div className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
                <div style={{ padding: '10px', background: '#ecfdf5', borderRadius: '10px', color: '#10b981' }}>
                  <MapPin size={20} />
                </div>
                <div>
                  <h4 style={{ fontSize: '1rem' }}>Engineering HQ</h4>
                  <span style={{ color: '#334155', fontSize: '0.88rem' }}>Indiranagar Tech Enclave, Bengaluru, India</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
