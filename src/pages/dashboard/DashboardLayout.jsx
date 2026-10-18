import React, { useState } from 'react';
import {
  LayoutDashboard, Box, Folder, UploadCloud, Smartphone, QrCode,
  GitBranch, Wallet, History, BarChart3, CreditCard, Users, HardDrive,
  Settings, ArrowLeft, Coins, ExternalLink, LogOut, Plus, Menu, X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import CoinTopUpModal from '../../components/CoinTopUpModal';

export default function DashboardLayout({ currentTab, setCurrentTab, setCurrentView, children }) {
  const { user, business, wallet, logout } = useAuth();
  const [topUpModalOpen, setTopUpModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} /> },
    { id: 'my-models', label: 'My Models', icon: <Box size={18} /> },
    { id: 'galleries', label: 'Galleries', icon: <Folder size={18} /> },
    { id: 'upload', label: 'Upload Model', icon: <UploadCloud size={18} /> },
    { id: 'ar-models', label: 'AR Models', icon: <Smartphone size={18} /> },
    { id: 'qr-codes', label: 'QR Codes', icon: <QrCode size={18} /> },
    { id: 'cad-revisions', label: 'CAD Revisions', icon: <GitBranch size={18} /> },
    { id: 'wallet', label: 'Wallet', icon: <Wallet size={18} /> },
    { id: 'transactions', label: 'Transactions', icon: <History size={18} /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
    { id: 'subscription', label: 'Subscription', icon: <CreditCard size={18} /> },
    { id: 'team', label: 'Team', icon: <Users size={18} /> },
    { id: 'storage', label: 'Storage', icon: <HardDrive size={18} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
  ];

  const currentItem = navItems.find(i => i.id === currentTab) || navItems[0];

  const handleTabClick = (tabId) => {
    setCurrentTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <div className="dashboard-container" style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 72px)', background: '#f8fafc' }}>
      {/* Mobile/Tablet Sub-Header Bar */}
      <div className="dashboard-mobile-bar" style={{
        display: 'none',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 18px',
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        position: 'sticky',
        top: '76px',
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="btn btn-secondary btn-sm"
            style={{ padding: '7px 10px', gap: '6px' }}
            title="Open Dashboard Menu"
          >
            <Menu size={18} />
            <span style={{ fontSize: '0.84rem' }}>Menu</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#0f172a', fontSize: '0.92rem' }}>
            <span style={{ color: '#8b5cf6' }}>{currentItem.icon}</span>
            <span>{currentItem.label}</span>
          </div>
        </div>

        {/* Quick Mobile Wallet Chip */}
        <button
          onClick={() => setTopUpModalOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: '#f5f3ff',
            border: '1px solid #e9d5ff',
            padding: '5px 12px',
            borderRadius: '20px',
            cursor: 'pointer'
          }}
          title="Top up coins"
        >
          <Coins size={14} color="#8b5cf6" />
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#7c3aed' }}>
            {wallet.totalBalance || 0}
          </span>
          <Plus size={13} color="#8b5cf6" />
        </button>
      </div>

      {/* Main Flex Wrapper (Sidebar + Content) */}
      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        {/* Mobile Backdrop Overlay */}
        {mobileMenuOpen && (
          <div
            className="dashboard-drawer-backdrop"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(4px)',
              zIndex: 9998
            }}
          />
        )}

        {/* Sidebar Navigation */}
        <aside
          className={`dashboard-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}
          style={{
            width: '260px',
            background: '#ffffff',
            borderRight: '1px solid #e2e8f0',
            padding: '24px 16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div>
            {/* Mobile Sidebar Close Button */}
            <div className="mobile-sidebar-header" style={{ display: 'none', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LayoutDashboard size={18} color="#8b5cf6" />
                <span>Dashboard Menu</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                style={{ padding: '6px', color: '#64748b' }}
                title="Close Drawer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Business Organization Badge */}
            <div style={{
              padding: '12px 14px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                Active Workspace
              </div>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {business?.name || 'My Organization'}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#8b5cf6', fontWeight: 600, textTransform: 'capitalize' }}>
                Role: {business?.teamRole || 'Owner'}
              </div>
            </div>

            {/* Navigation Links */}
            <nav style={{ maxHeight: 'calc(100vh - 360px)', overflowY: 'auto' }}>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {navItems.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => handleTabClick(item.id)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        fontSize: '0.88rem',
                        fontWeight: currentTab === item.id ? 700 : 500,
                        color: currentTab === item.id ? '#8b5cf6' : '#475569',
                        background: currentTab === item.id ? '#f5f3ff' : 'transparent',
                        transition: 'all 0.15s'
                      }}
                    >
                      <span style={{ color: currentTab === item.id ? '#8b5cf6' : '#64748b' }}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div>
            {/* Bottom Wallet Mini Card */}
            <div style={{
              padding: '16px',
              background: 'linear-gradient(135deg, #f5f3ff 0%, #f5f3ff 100%)',
              borderRadius: '12px',
              border: '1px solid #e9d5ff',
              marginTop: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#7c3aed' }}>Coin Balance</span>
                <Coins size={16} color="#8b5cf6" />
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#5b21b6', marginBottom: '8px' }}>
                {wallet.totalBalance || 0} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Coins</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  onClick={() => { setTopUpModalOpen(true); setMobileMenuOpen(false); }}
                  className="btn btn-primary btn-sm"
                  style={{
                    fontSize: '0.78rem',
                    padding: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <Plus size={14} />
                  <span>Top Up</span>
                </button>
                <button
                  onClick={() => handleTabClick('wallet')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.78rem', padding: '6px' }}
                >
                  Wallet
                </button>
              </div>
            </div>

            {/* Sidebar Sign Out */}
            <div style={{ marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
              <button
                onClick={() => {
                  logout();
                  setCurrentView('home');
                  if (window.location.pathname !== '/') {
                    window.history.pushState(null, '', '/');
                  }
                }}
                className="btn btn-ghost"
                style={{
                  width: '100%',
                  justifyContent: 'flex-start',
                  gap: '10px',
                  color: '#ef4444',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  padding: '8px 12px',
                  borderRadius: '8px'
                }}
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Tab Content Area */}
        <main
          className="dashboard-main-content"
          style={{
            flex: 1,
            padding: '36px 40px',
            overflowY: 'auto',
            minWidth: 0,
            width: '100%'
          }}
        >
          {children}
        </main>
      </div>

      {/* Global Top-up Modal */}
      <CoinTopUpModal
        isOpen={topUpModalOpen}
        onClose={() => setTopUpModalOpen(false)}
        requiredCoins={25}
        currentCoins={wallet?.totalBalance}
        actionTitle="Upload 3D Models"
      />

      <style>{`
        @media (max-width: 1024px) {
          .dashboard-mobile-bar {
            display: flex !important;
          }
          .dashboard-sidebar {
            position: fixed !important;
            top: 0 !important;
            bottom: 0 !important;
            left: 0 !important;
            z-index: 9999 !important;
            height: 100vh !important;
            width: 280px !important;
            transform: translateX(-100%);
            transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25) !important;
          }
          .dashboard-sidebar.mobile-open {
            transform: translateX(0) !important;
          }
          .mobile-sidebar-header {
            display: flex !important;
          }
          .dashboard-main-content {
            padding: 24px 20px !important;
          }
        }
        @media (max-width: 640px) {
          .dashboard-main-content {
            padding: 16px 14px !important;
          }
        }
      `}</style>
    </div>
  );
}
