import React, { useState, useEffect } from 'react';
import { Box, Lock, Mail, User, Building, ArrowRight, Sparkles, CheckCircle2, ShieldCheck, Eye, EyeOff, Check, X, LogOut } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Register({ setCurrentView }) {
  const { user, register, logout } = useAuth();
  const { success, error } = useToast();
  const [formData, setFormData] = useState({
    fullName: '',
    email: sessionStorage.getItem('prefill_email') || '',
    password: '',
    companyName: '',
    industry: 'Industrial & Manufacturing'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const prefill = sessionStorage.getItem('prefill_email');
    if (prefill) {
      setFormData(prev => ({ ...prev, email: prefill }));
    }
  }, []);

  // If user is already authenticated, show session status card with switch account option
  if (user) {
    return (
      <div className="section-spacer" style={{ paddingTop: '60px' }}>
        <div className="container-narrow" style={{ maxWidth: '440px' }}>
          <div className="card" style={{ padding: 'clamp(20px, 5vw, 36px)', textAlign: 'center', boxShadow: '0 8px 30px rgba(15, 23, 42, 0.08)' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#f5f3ff',
              color: '#8b5cf6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px auto'
            }}>
              <User size={28} />
            </div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', color: '#0f172a', fontWeight: 800 }}>
              Already Signed In
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.92rem', marginBottom: '8px' }}>
              You are currently authenticated as:
            </p>
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '10px 16px',
              fontWeight: 700,
              color: '#1e293b',
              fontSize: '0.95rem',
              marginBottom: '24px',
              wordBreak: 'break-all'
            }}>
              {user.email}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => {
                  setCurrentView('home');
                  if (window.location.pathname !== '/') {
                    window.history.pushState(null, '', '/');
                  }
                }}
                className="btn btn-primary"
                style={{ width: '100%', height: '44px', fontWeight: 600 }}
              >
                Go to Home Page
              </button>
              <button
                onClick={() => {
                  setCurrentView('dashboard');
                  if (window.location.pathname !== '/dashboard') {
                    window.history.pushState(null, '', '/dashboard');
                  }
                }}
                className="btn btn-secondary"
                style={{ width: '100%', height: '44px', fontWeight: 600 }}
              >
                Go to Workspace Dashboard
              </button>
              <button
                onClick={() => {
                  logout();
                }}
                className="btn btn-ghost"
                style={{
                  width: '100%',
                  height: '40px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  color: '#ef4444'
                }}
              >
                <LogOut size={16} />
                <span>Sign Out to Register New Account</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Live password validation
  const hasMinLength = formData.password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(formData.password);
  const hasNumber = /[0-9]/.test(formData.password);
  const isPasswordValid = hasMinLength && hasLetter && hasNumber && formData.password.length <= 128;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanName = formData.fullName.trim();
    const cleanEmail = formData.email.trim().toLowerCase();

    if (!cleanName || !cleanEmail || !formData.password) {
      error('Please fill in all required fields.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      error('Please enter a valid email address.');
      return;
    }

    if (!isPasswordValid) {
      error('Password must be at least 8 characters and contain both letters and numbers.');
      return;
    }

    setLoading(true);
    try {
      await register({
        fullName: cleanName,
        email: cleanEmail,
        password: formData.password,
        companyName: formData.companyName.trim(),
        industry: formData.industry
      });
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 }
      });
      success('Welcome to ModelAR! 100 bonus coins credited to your wallet.');
      setCurrentView('dashboard');
    } catch (err) {
      error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section-spacer" style={{ paddingTop: '50px' }}>
      <div className="container-narrow" style={{ maxWidth: '480px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1 style={{ fontSize: '1.9rem', marginBottom: '8px', color: '#0f172a', fontWeight: 800 }}>
            Create Your ModelAR Account
          </h1>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 14px',
            borderRadius: '20px',
            background: 'rgba(139, 92, 246, 0.08)',
            color: '#8b5cf6',
            fontSize: '0.82rem',
            fontWeight: 700
          }}>
            <Sparkles size={14} />
            <span>Instant 100 Welcome Bonus Coins Included</span>
          </div>
        </div>

        <div className="card" style={{ padding: 'clamp(20px, 5vw, 36px)', boxShadow: '0 8px 30px rgba(15, 23, 42, 0.08)' }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                Full Name *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  required
                  autoComplete="name"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="form-input"
                  placeholder="e.g. Vikram Mehta"
                  style={{ paddingLeft: '38px', height: '44px' }}
                />
                <User size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                Work Email *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="form-input"
                  placeholder="name@company.com"
                  style={{ paddingLeft: '38px', height: '44px' }}
                />
                <Mail size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                Password *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="form-input"
                  placeholder="Min. 8 characters"
                  style={{ paddingLeft: '38px', paddingRight: '40px', height: '44px' }}
                />
                <Lock size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    padding: '2px'
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Live Password Strength Requirements */}
              {formData.password.length > 0 && (
                <div style={{ marginTop: '8px', display: 'flex', gap: '14px', fontSize: '0.75rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: hasMinLength ? '#10b981' : '#94a3b8' }}>
                    {hasMinLength ? <Check size={13} /> : <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#94a3b8' }} />}
                    8+ chars
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: hasLetter ? '#10b981' : '#94a3b8' }}>
                    {hasLetter ? <Check size={13} /> : <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#94a3b8' }} />}
                    Letters
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: hasNumber ? '#10b981' : '#94a3b8' }}>
                    {hasNumber ? <Check size={13} /> : <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#94a3b8' }} />}
                    Numbers
                  </span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                Company / Organization
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="form-input"
                  placeholder="e.g. Apex Heavy Engineering Ltd."
                  style={{ paddingLeft: '38px', height: '44px' }}
                />
                <Building size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                Primary Industry
              </label>
              <select
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="form-select"
                style={{ height: '44px' }}
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

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: '100%',
                height: '46px',
                fontSize: '0.95rem',
                fontWeight: 700,
                gap: '8px',
                borderRadius: '10px',
                marginBottom: '14px'
              }}
            >
              <span>{loading ? 'Setting up workspace...' : 'Create Account & Claim 100 Coins'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            paddingTop: '16px',
            borderTop: '1px solid #f1f5f9',
            fontSize: '0.78rem',
            color: '#64748b'
          }}>
            <ShieldCheck size={16} color="#10b981" />
            <span>Encrypted Data Storage & Free Plan Included</span>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: '#64748b' }}>
          Already have an account?{' '}
          <button
            onClick={() => {
              setCurrentView('login');
              if (window.location.pathname !== '/login') {
                window.history.pushState(null, '', '/login');
              }
            }}
            style={{ color: '#5b4ff5', fontWeight: 700, cursor: 'pointer' }}
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
