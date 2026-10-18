import React, { useState } from 'react';
import { Box, Coins, User, LogOut, LayoutDashboard, Shield, Menu, X, ChevronDown, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ currentView, setCurrentView }) {
  const { user, business, wallet, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [walletDropdownOpen, setWalletDropdownOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About' },
    { id: 'explore', label: 'Models' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'contact', label: 'Contact' },
  ];

  const handleNavClick = (id) => {
    setCurrentView(id);
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    setCurrentView('home');
  };

  return (
    <header className="navbar">
      <div className="container">
        <div className="navbar-inner">
          {/* Brand Logo */}
          <div
            onClick={() => handleNavClick('home')}
            className="navbar-brand"
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <img
              src="/logo.png"
              alt="ModelAR Logo"
              className="navbar-logo"
            />
          </div>

          {/* Desktop Navigation Links */}
          <nav>
            <ul className="navbar-nav">
              {navItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => handleNavClick(item.id)}
                    className={`nav-link ${currentView === item.id ? 'active' : ''}`}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Right Action Area */}
          <div className="navbar-actions">
            {user ? (
              user.role === 'admin' ? (
                /* Master Admin Navbar Controls */
                <>
                  <div className="hide-on-mobile" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                    color: '#ffffff',
                    padding: '6px 14px',
                    borderRadius: '30px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    boxShadow: '0 2px 8px rgba(124, 58, 237, 0.28)'
                  }}>
                    <Shield size={14} />
                    <span>SUPER ADMIN</span>
                  </div>

                  {/* Primary Admin Portal Button */}
                  <button
                    onClick={() => handleNavClick('admin')}
                    className="btn btn-sm"
                    style={{
                      background: currentView === 'admin' ? '#7c3aed' : '#f5f3ff',
                      color: currentView === 'admin' ? '#ffffff' : '#7c3aed',
                      borderColor: '#7c3aed',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 14px'
                    }}
                  >
                    <LayoutDashboard size={15} />
                    <span className="hide-on-mobile">Admin Portal</span>
                    <span className="show-on-mobile" style={{ display: 'none' }}>Admin</span>
                  </button>

                  {/* Logout Button */}
                  <button
                    onClick={handleLogout}
                    className="btn btn-ghost btn-sm"
                    title="Sign out of Admin Session"
                    style={{ padding: '6px', color: '#ef4444' }}
                  >
                    <LogOut size={18} />
                  </button>
                </>
              ) : (
                /* Regular Normal User Navbar Controls */
                <>
                  {/* Coin Balance Chip with Tooltip / Breakdown */}
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setWalletDropdownOpen(!walletDropdownOpen)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#f5f3ff',
                        border: '1px solid #e9d5ff',
                        padding: '6px 10px',
                        borderRadius: '30px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      title="Click to view Coin Balance details"
                    >
                      <Coins size={15} color="#8b5cf6" />
                      <span style={{ fontWeight: 700, color: '#7c3aed', fontSize: '0.88rem' }}>
                        {wallet.totalBalance || 0}
                      </span>
                      <span className="hide-on-mobile" style={{ fontSize: '0.76rem', color: '#a78bfa', fontWeight: 600 }}>Coins</span>
                      <ChevronDown size={13} color="#a78bfa" />
                    </button>

                    {/* Wallet Breakdown Dropdown */}
                    {walletDropdownOpen && (
                      <div style={{
                        position: 'absolute',
                        top: '115%',
                        right: 0,
                        width: '260px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '14px',
                        boxShadow: '0 12px 30px rgba(0,0,0,0.12)',
                        padding: '16px',
                        zIndex: 1000
                      }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '10px' }}>
                          Wallet Ledger Breakdown
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.88rem' }}>
                          <span style={{ color: '#475569' }}>Subscription Coins:</span>
                          <strong style={{ color: '#1e293b' }}>{wallet.subscriptionBalance || 0}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.88rem' }}>
                          <span style={{ color: '#475569' }}>Purchased Coins:</span>
                          <strong style={{ color: '#1e293b' }}>{wallet.purchasedBalance || 0}</strong>
                        </div>
                        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', marginBottom: '14px', fontSize: '0.92rem' }}>
                          <span style={{ fontWeight: 600 }}>Total Available:</span>
                          <strong style={{ color: '#8b5cf6' }}>{wallet.totalBalance || 0} Coins</strong>
                        </div>
                        <button
                          onClick={() => { setWalletDropdownOpen(false); handleNavClick('dashboard/wallet'); }}
                          className="btn btn-primary btn-sm"
                          style={{ width: '100%', fontSize: '0.8rem' }}
                        >
                          Top-up / View Ledger
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Dashboard Button */}
                  <button
                    onClick={() => handleNavClick('dashboard')}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '6px 12px' }}
                  >
                    <LayoutDashboard size={16} />
                    <span className="hide-on-mobile">Dashboard</span>
                  </button>

                  {/* Logout Button */}
                  <button
                    onClick={handleLogout}
                    className="btn btn-ghost btn-sm"
                    title="Sign out"
                    style={{ padding: '6px' }}
                  >
                    <LogOut size={18} />
                  </button>
                </>
              )
            ) : (
              <>
                <button
                  onClick={() => handleNavClick('login')}
                  className="btn btn-ghost btn-sm"
                  style={{ fontWeight: 600, color: '#475569' }}
                >
                  Sign In
                </button>
                <button
                  onClick={() => handleNavClick('register')}
                  className="btn btn-primary btn-sm"
                  style={{ padding: '8px 16px', fontSize: '0.88rem', gap: '6px' }}
                >
                  <span>Start Free</span>
                  <ArrowRight size={14} />
                </button>
              </>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{ display: 'none', padding: '6px', color: '#0f172a' }}
              className="mobile-toggle"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              style={{
                textAlign: 'left',
                padding: '8px 0',
                fontSize: '1rem',
                fontWeight: 600,
                color: currentView === item.id ? '#8b5cf6' : '#334155'
              }}
            >
              {item.label}
            </button>
          ))}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {!user ? (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => handleNavClick('login')} className="btn btn-secondary" style={{ flex: 1 }}>Sign In</button>
                <button onClick={() => handleNavClick('register')} className="btn btn-primary" style={{ flex: 1 }}>Start Free</button>
              </div>
            ) : user.role === 'admin' ? (
              <>
                <button onClick={() => handleNavClick('admin')} className="btn btn-primary" style={{ width: '100%', background: '#7c3aed', borderColor: '#7c3aed' }}>
                  Open Super Admin Portal
                </button>
                <button onClick={handleLogout} className="btn btn-ghost" style={{ width: '100%', color: '#ef4444' }}>
                  Sign Out of Admin
                </button>
              </>
            ) : (
              <>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  background: '#f8fafc',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  marginBottom: '4px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Coins size={16} color="#8b5cf6" />
                    <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155' }}>Wallet Balance</span>
                  </div>
                  <strong style={{ color: '#7c3aed' }}>{wallet.totalBalance || 0} Coins</strong>
                </div>
                <button onClick={() => handleNavClick('dashboard')} className="btn btn-primary" style={{ width: '100%' }}>
                  Go to Dashboard
                </button>
                <button onClick={() => handleNavClick('dashboard/wallet')} className="btn btn-secondary" style={{ width: '100%' }}>
                  Top-up Wallet Coins
                </button>
                <button onClick={handleLogout} className="btn btn-ghost" style={{ width: '100%', color: '#ef4444' }}>
                  Sign Out
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        .navbar-logo {
          height: 48px;
          width: auto;
          display: block;
          transition: height 0.2s ease;
        }
        @media (max-width: 860px) {
          .navbar-nav { display: none !important; }
          .mobile-toggle { display: block !important; }
        }
        @media (max-width: 768px) {
          .navbar-inner { height: 60px !important; }
          .navbar-logo { height: 32px !important; }
        }
        @media (max-width: 440px) {
          .navbar-inner { height: 54px !important; }
          
        }
      `}</style>
    </header>
  );
}
