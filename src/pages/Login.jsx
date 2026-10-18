import React, { useState } from 'react';
import { Box, Lock, Mail, ArrowRight, ShieldCheck, Eye, EyeOff, User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Login({ setCurrentView }) {
  const { user, login, logout } = useAuth();
  const { success, error } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // If user is already authenticated, show friendly session state card with switch account option
  if (user) {
    const isAdmin = user.role === 'admin';
    return (
      <div className="section-spacer" style={{ paddingTop: '60px' }}>
        <div className="container-narrow" style={{ maxWidth: '440px' }}>
          <div className="card" style={{ padding: 'clamp(20px, 5vw, 36px)', textAlign: 'center', boxShadow: '0 8px 30px rgba(15, 23, 42, 0.08)' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: isAdmin ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' : '#f5f3ff',
              color: isAdmin ? '#ffffff' : '#8b5cf6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px auto',
              boxShadow: isAdmin ? '0 4px 14px rgba(124, 58, 237, 0.35)' : 'none'
            }}>
              {isAdmin ? <ShieldCheck size={28} /> : <User size={28} />}
            </div>
            {isAdmin && (
              <div style={{ marginBottom: '12px' }}>
                <span className="badge badge-primary" style={{ background: '#7c3aed', color: '#fff', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  👑 Platform Super Admin
                </span>
              </div>
            )}
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
              {isAdmin ? (
                <button
                  onClick={() => {
                    setCurrentView('admin');
                    if (window.location.pathname !== '/admin') {
                      window.history.pushState(null, '', '/admin');
                    }
                  }}
                  className="btn btn-primary"
                  style={{ width: '100%', height: '44px', fontWeight: 600, background: '#7c3aed', borderColor: '#7c3aed' }}
                >
                  Open Master Admin Portal
                </button>
              ) : (
                <>
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
                </>
              )}
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
                <span>Sign Out to Switch Account</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      error('Please enter both your email address and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await login(email.trim(), password);
      if (res?.user?.role === 'admin') {
        success('Welcome Super Admin! Opening Master Control Center...');
        setCurrentView('admin');
        if (window.location.pathname !== '/admin') {
          window.history.pushState(null, '', '/admin');
        }
      } else {
        success('Logged in successfully!');
        setCurrentView('dashboard');
        if (window.location.pathname !== '/dashboard') {
          window.history.pushState(null, '', '/dashboard');
        }
      }
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('invalid')) {
        error('Invalid email or password. If you do not have an account yet, please click "Create an account" below.');
      } else {
        error(err.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section-spacer" style={{ paddingTop: '60px' }}>
      <div className="container-narrow" style={{ maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>

          <h1 style={{ fontSize: '1.9rem', marginBottom: '8px', color: '#0f172a', fontWeight: 800 }}>
            Sign in to ModelAR
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.92rem' }}>
            Secure access to your 3D models, WebAR galleries, and coin wallet.
          </p>
        </div>

        <div className="card" style={{ padding: 'clamp(20px, 5vw, 36px)', boxShadow: '0 8px 30px rgba(15, 23, 42, 0.08)' }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  placeholder="name@company.com"
                  style={{ paddingLeft: '38px', height: '44px' }}
                />
                <Mail size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ marginBottom: 0, fontWeight: 600, fontSize: '0.88rem' }}>
                  Password
                </label>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Password reset instructions will be sent to your verified email address.');
                  }}
                  style={{ fontSize: '0.8rem', color: '#8b5cf6', fontWeight: 600 }}
                >
                  Forgot password?
                </a>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  placeholder="••••••••"
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
                borderRadius: '10px'
              }}
            >
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Security Assurance Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '24px',
            paddingTop: '18px',
            borderTop: '1px solid #f1f5f9',
            fontSize: '0.78rem',
            color: '#64748b'
          }}>
            <ShieldCheck size={16} color="#10b981" />
            <span>Encrypted Authentication & Session Security</span>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: '#64748b' }}>
          Don't have an account yet?{' '}
          <button
            onClick={() => {
              if (email) {
                sessionStorage.setItem('prefill_email', email.trim());
              }
              setCurrentView('register');
              if (window.location.pathname !== '/register') {
                window.history.pushState(null, '', '/register');
              }
            }}
            style={{ color: '#8b5cf6', fontWeight: 700, cursor: 'pointer', background: 'none', border: 'none' }}
          >
            Create an account
          </button>
        </div>
      </div>
    </div>
  );
}
