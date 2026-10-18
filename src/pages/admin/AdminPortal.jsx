import React, { useState, useEffect } from 'react';
import {
  Shield, Users, Box, CreditCard, Coins, Settings,
  CheckCircle2, AlertCircle, Search, Edit2, Plus, ArrowLeft, RefreshCw,
  Trash2, ExternalLink, ShieldAlert, Sparkles, UserCheck, Key,
  Zap, X, LayoutDashboard, LogOut, Menu
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function AdminPortal({ setCurrentView }) {
  const { user: authUser, logout } = useAuth();
  const { success, error } = useToast();

  const [adminMobileMenuOpen, setAdminMobileMenuOpen] = useState(false);

  // Navigation tab in the Side Menu
  const [tab, setTab] = useState('overview'); // 'overview', 'users', 'models', 'plans', 'packages', 'payments', 'settings'
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [models, setModels] = useState([]);
  const [plans, setPlans] = useState([]);
  const [packages, setPackages] = useState([]);
  const [payments, setPayments] = useState([]);
  const [platformSettings, setPlatformSettings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search filters
  const [userSearch, setUserSearch] = useState('');
  const [modelSearch, setModelSearch] = useState('');

  // 1. Change Plan Modal State
  const [changePlanUser, setChangePlanUser] = useState(null);
  const [selectedPlanSlug, setSelectedPlanSlug] = useState('creator');

  // 2. Adjust Coins Modal State
  const [adjustCoinsUser, setAdjustCoinsUser] = useState(null);
  const [adjustMode, setAdjustMode] = useState('grant'); // 'grant' or 'set'
  const [adjustAmount, setAdjustAmount] = useState('50');
  const [adjustSubBal, setAdjustSubBal] = useState('0');
  const [adjustPurBal, setAdjustPurBal] = useState('0');
  const [adjustReason, setAdjustReason] = useState('Admin manual adjustment');

  // 3. Edit User Modal State
  const [editingUser, setEditingUser] = useState(null);

  // 4. Delete User Confirmation State
  const [deletingUser, setDeletingUser] = useState(null);

  // 5. Delete Model Confirmation State
  const [deletingModel, setDeletingModel] = useState(null);

  // 6. Edit Plan State
  const [editingPlan, setEditingPlan] = useState(null);

  // 7. Edit/Create Coin Package State
  const [editingPkg, setEditingPkg] = useState(null);
  const [isNewPkg, setIsNewPkg] = useState(false);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [ov, us, ms, pl, pk, py, st] = await Promise.all([
        api.getAdminOverview(),
        api.getAdminUsers(userSearch),
        api.getAdminModels(),
        api.getAdminPlans(),
        api.getAdminPackages(),
        api.getAdminPayments(),
        api.getAdminSettings()
      ]);
      setOverview(ov);
      setUsers(us);
      setModels(ms);
      setPlans(pl);
      setPackages(pk);
      setPayments(py);
      setPlatformSettings(st);
    } catch (err) {
      error(err.message || 'Failed to load master admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [userSearch]);

  // Handler: Toggle user active / suspended status
  const handleToggleUserStatus = async (user) => {
    const newStatus = !user.is_active;
    try {
      await api.updateAdminUserStatus(user.id, newStatus);
      success(`User ${user.email} ${newStatus ? 'activated' : 'suspended'}`);
      fetchAdminData();
    } catch (err) {
      error(err.message || 'Failed to update user status');
    }
  };

  // Handler: Assign User Plan
  const handleChangeUserPlan = async (e) => {
    e.preventDefault();
    if (!changePlanUser) return;
    try {
      await api.updateAdminUserPlan(changePlanUser.id, selectedPlanSlug);
      success(`Assigned ${changePlanUser.full_name} to ${selectedPlanSlug.toUpperCase()} Plan!`);
      setChangePlanUser(null);
      fetchAdminData();
    } catch (err) {
      error(err.message || 'Failed to change user plan');
    }
  };

  // Handler: Adjust or Set User Coins
  const handleAdjustCoinsSubmit = async (e) => {
    e.preventDefault();
    if (!adjustCoinsUser) return;
    try {
      if (adjustMode === 'grant') {
        const amt = parseInt(adjustAmount, 10);
        if (!amt || amt <= 0) return error('Please enter a positive coin amount');
        await api.grantAdminCoins(adjustCoinsUser.id, amt, adjustReason);
        success(`Granted ${amt} bonus coins to ${adjustCoinsUser.email}`);
      } else {
        await api.setAdminUserCoins(adjustCoinsUser.id, {
          subscriptionBalance: parseInt(adjustSubBal, 10) || 0,
          purchasedBalance: parseInt(adjustPurBal, 10) || 0,
          reason: adjustReason
        });
        success(`Updated coins for ${adjustCoinsUser.email}`);
      }
      setAdjustCoinsUser(null);
      fetchAdminData();
    } catch (err) {
      error(err.message || 'Failed to adjust coins');
    }
  };

  // Handler: Update User Profile & Role
  const handleSaveUserDetails = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await api.updateAdminUser(editingUser.id, {
        full_name: editingUser.full_name,
        email: editingUser.email,
        role: editingUser.role
      });
      success(`User ${editingUser.email} profile updated successfully`);
      setEditingUser(null);
      fetchAdminData();
    } catch (err) {
      error(err.message || 'Failed to update user profile');
    }
  };

  // Handler: Delete User
  const handleConfirmDeleteUser = async () => {
    if (!deletingUser) return;
    try {
      await api.deleteAdminUser(deletingUser.id);
      success(`User ${deletingUser.email} and all records permanently purged`);
      setDeletingUser(null);
      fetchAdminData();
    } catch (err) {
      error(err.message || 'Failed to delete user');
    }
  };

  // Handler: Delete Model
  const handleConfirmDeleteModel = async () => {
    if (!deletingModel) return;
    try {
      await api.deleteAdminModel(deletingModel.id);
      success(`Model "${deletingModel.title}" permanently removed from platform`);
      setDeletingModel(null);
      fetchAdminData();
    } catch (err) {
      error(err.message || 'Failed to delete model');
    }
  };

  // Handler: Save Plan Limits
  const handleSavePlan = async (e) => {
    e.preventDefault();
    if (!editingPlan) return;
    try {
      await api.updateAdminPlan(editingPlan.id, {
        price_inr: parseInt(editingPlan.price_inr, 10),
        monthly_coins: parseInt(editingPlan.monthly_coins, 10),
        storage_gb: parseFloat(editingPlan.storage_gb),
        cad_revisions_monthly: parseInt(editingPlan.cad_revisions_monthly, 10),
        cad_revisions_max_per_model: parseInt(editingPlan.cad_revisions_max_per_model, 10),
        active_ar_models_limit: parseInt(editingPlan.active_ar_models_limit, 10),
        max_team_members: parseInt(editingPlan.max_team_members, 10)
      });
      success(`Plan "${editingPlan.name}" updated in database`);
      setEditingPlan(null);
      fetchAdminData();
    } catch (err) {
      error(err.message || 'Failed to update plan');
    }
  };

  // Handler: Save or Create Coin Package
  const handleSavePackage = async (e) => {
    e.preventDefault();
    if (!editingPkg) return;
    try {
      if (isNewPkg) {
        await api.createAdminPackage({
          name: editingPkg.name,
          coin_amount: parseInt(editingPkg.coin_amount, 10),
          price_inr: parseInt(editingPkg.price_inr, 10),
          is_popular: editingPkg.is_popular ? 1 : 0
        });
        success('New coin package created');
      } else {
        await api.updateAdminPackage(editingPkg.id, {
          name: editingPkg.name,
          coin_amount: parseInt(editingPkg.coin_amount, 10),
          price_inr: parseInt(editingPkg.price_inr, 10),
          is_popular: editingPkg.is_popular ? 1 : 0,
          is_active: editingPkg.is_active ? 1 : 0
        });
        success('Coin package updated');
      }
      setEditingPkg(null);
      fetchAdminData();
    } catch (err) {
      error(err.message || 'Failed to save coin package');
    }
  };

  // Handler: Delete Coin Package
  const handleDeletePackage = async (pkg) => {
    if (!window.confirm(`Permanently delete coin package "${pkg.name}"?`)) return;
    try {
      await api.deleteAdminPackage(pkg.id);
      success(`Coin package "${pkg.name}" deleted`);
      fetchAdminData();
    } catch (err) {
      error(err.message || 'Failed to delete coin package');
    }
  };

  // Handler: Save Platform Setting
  const handleSaveSetting = async (key, val) => {
    try {
      await api.updateAdminSetting(key, val);
      success(`Platform setting "${key}" updated`);
      fetchAdminData();
    } catch (err) {
      error(err.message || 'Failed to update setting');
    }
  };

  const handleAdminSignOut = () => {
    logout();
    setCurrentView('login');
  };

  // Filter models
  const filteredModels = models.filter((m) => {
    if (!modelSearch) return true;
    const q = modelSearch.toLowerCase();
    return (
      (m.title && m.title.toLowerCase().includes(q)) ||
      (m.business_name && m.business_name.toLowerCase().includes(q)) ||
      (m.id && m.id.toLowerCase().includes(q))
    );
  });

  // Side Menu Navigation Items
  const sideNavItems = [
    { id: 'overview', label: 'Platform KPIs', icon: <LayoutDashboard size={18} /> },
    { id: 'users', label: 'User Accounts & Controls', icon: <Users size={18} />, badge: users.length },
    { id: 'models', label: 'All 3D Models & Moderation', icon: <Box size={18} />, badge: models.length },
    { id: 'plans', label: 'Plan Config (Live DB)', icon: <Zap size={18} />, badge: plans.length },
    { id: 'packages', label: 'Coin Top-up Packages', icon: <Coins size={18} />, badge: packages.length },
    { id: 'payments', label: 'Payments & Audit Log', icon: <CreditCard size={18} />, badge: payments.length },
    { id: 'settings', label: 'Global Platform Settings', icon: <Settings size={18} /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 65px)', background: '#f8fafc' }}>
      {/* Mobile/Tablet Sub-Header Bar */}
      <div className="admin-mobile-bar" style={{
        display: 'none',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 18px',
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        position: 'sticky',
        top: '65px',
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setAdminMobileMenuOpen(true)}
            className="btn btn-secondary btn-sm"
            style={{ padding: '6px 12px', gap: '6px' }}
            title="Open Admin Menu"
          >
            <Menu size={18} />
            <span style={{ fontSize: '0.84rem' }}>Menu</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: '#0f172a', fontSize: '0.92rem' }}>
            <span style={{ color: '#7c3aed' }}>👑 Admin</span>
            <span>• {sideNavItems.find(i => i.id === tab)?.label || 'Console'}</span>
          </div>
        </div>

        <span style={{
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          color: '#065f46',
          fontSize: '0.72rem',
          fontWeight: 700,
          padding: '4px 10px',
          borderRadius: '20px'
        }}>
          Live
        </span>
      </div>

      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        {/* Mobile Backdrop Overlay */}
        {adminMobileMenuOpen && (
          <div
            onClick={() => setAdminMobileMenuOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(4px)',
              zIndex: 9998
            }}
          />
        )}

        {/* ========================================================= */}
        {/* LEFT SIDE MENU / SIDEBAR */}
        {/* ========================================================= */}
        <aside
          className={`admin-sidebar ${adminMobileMenuOpen ? 'mobile-open' : ''}`}
          style={{
            width: '280px',
            background: '#ffffff',
            borderRight: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            position: 'sticky',
            top: '65px',
            height: 'calc(100vh - 65px)',
            flexShrink: 0,
            zIndex: 30
          }}
        >
          {/* Mobile Close Button in Drawer Header */}
          <div className="admin-mobile-drawer-header" style={{ display: 'none', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} color="#7c3aed" />
              <span>Admin Console</span>
            </div>
            <button
              onClick={() => setAdminMobileMenuOpen(false)}
              style={{ padding: '6px', color: '#64748b' }}
              title="Close Drawer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Sidebar Header Badge */}
          <div style={{ padding: '22px 20px 16px 20px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(124, 58, 237, 0.28)'
              }}>
                <Shield size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                  Admin Console
                </div>
                <span style={{ fontSize: '0.72rem', color: '#7c3aed', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  👑 Super Admin
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Category Label */}
          <div style={{
            padding: '16px 20px 8px 20px',
            fontSize: '0.72rem',
            fontWeight: 700,
            color: '#94a3b8',
            textTransform: 'uppercase',
            letterSpacing: '0.06em'
          }}>
            Platform Management
          </div>

          {/* Side Menu Links */}
          <nav style={{ flex: 1, overflowY: 'auto', padding: '0 8px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {sideNavItems.map((item) => {
              const isActive = tab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setTab(item.id);
                    setAdminMobileMenuOpen(false);
                  }}
                  style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  fontSize: '0.88rem',
                  fontWeight: isActive ? 700 : 500,
                  background: isActive ? '#f5f3ff' : 'transparent',
                  color: isActive ? '#7c3aed' : '#475569',
                  border: isActive ? '1px solid #e9d5ff' : '1px solid transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: isActive ? '#7c3aed' : '#64748b' }}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span style={{
                    background: isActive ? '#7c3aed' : '#f1f5f9',
                    color: isActive ? '#ffffff' : '#64748b',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px'
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer: Super Admin Profile & Actions */}
        <div style={{ padding: '16px', borderTop: '1px solid #f1f5f9', background: '#ffffff' }}>
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '10px 12px',
            marginBottom: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#1e293b' }}>Super Admin Online</span>
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {authUser?.email || 'admin@modelar.io'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={fetchAdminData}
              className="btn btn-secondary btn-sm"
              style={{ flex: 1, fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
              title="Refresh live data from server"
            >
              <RefreshCw size={13} className={loading ? 'spinning' : ''} />
              <span>Sync</span>
            </button>
            <button
              onClick={handleAdminSignOut}
              className="btn btn-ghost btn-sm"
              style={{ color: '#ef4444', padding: '6px 10px', fontSize: '0.78rem' }}
              title="Sign Out of Admin Console"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* RIGHT MAIN CONTENT AREA */}
      {/* ========================================================= */}
      <main style={{ flex: 1, minWidth: 0, padding: '32px 36px', overflowY: 'auto' }}>
        {/* Dynamic Section Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
              {tab === 'overview' && 'Platform Performance & KPIs'}
              {tab === 'users' && 'User Accounts & Master Governance'}
              {tab === 'models' && 'Platform 3D Models Moderation'}
              {tab === 'plans' && 'Dynamic Subscription Plans (Live DB)'}
              {tab === 'packages' && 'Coin Top-up Packages'}
              {tab === 'payments' && 'Payments Audit & Transaction Log'}
              {tab === 'settings' && 'Global Business & System Settings'}
            </h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>
              {tab === 'overview' && 'Real-time overview of users, active models, WebAR views, and platform revenue.'}
              {tab === 'users' && 'Directly assign plans, adjust coins, edit user roles, or delete user accounts.'}
              {tab === 'models' && 'Inspect 3D assets in WebAR viewer, toggle visibility, and moderate content.'}
              {tab === 'plans' && 'Dynamic relational database limits for Free, Creator, and Business tiers.'}
              {tab === 'packages' && 'Configure coin package pricing and coin bonuses available for checkout.'}
              {tab === 'payments' && 'Complete audit history of payments and invoices across the entire platform.'}
              {tab === 'settings' && 'Configure system-wide parameters, maintenance toggles, and conversion rates.'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '6px 12px',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
              Live MySQL Connected
            </span>
          </div>
        </div>

        {/* 1. OVERVIEW TAB */}
        {tab === 'overview' && overview && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '18px', marginBottom: '32px' }}>
              <div className="card" style={{ padding: '22px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Total Registered Users</span>
                <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>{overview.totalUsers}</div>
                <span style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: 600 }}>Active platform accounts</span>
              </div>
              <div className="card" style={{ padding: '22px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Total Businesses</span>
                <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>{overview.totalBusinesses}</div>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Workspaces created</span>
              </div>
              <div className="card" style={{ padding: '22px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Active 3D Models</span>
                <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#8b5cf6', margin: '4px 0' }}>{overview.totalModels}</div>
                <span style={{ fontSize: '0.74rem', color: '#8b5cf6' }}>Uploaded across platform</span>
              </div>
              <div className="card" style={{ padding: '22px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>AR Launches & Scans</span>
                <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#10b981', margin: '4px 0' }}>{overview.totalARLaunches}</div>
                <span style={{ fontSize: '0.74rem', color: '#10b981' }}>WebAR customer sessions</span>
              </div>
              <div className="card" style={{ padding: '22px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Total Revenue</span>
                <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#7c3aed', margin: '4px 0' }}>₹{overview.totalRevenueINR}</div>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Subscriptions + coin topups</span>
              </div>
            </div>

            <div className="card">
              <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Recent Platform Transactions</span>
                <button onClick={() => setTab('payments')} className="btn btn-ghost btn-sm" style={{ fontSize: '0.8rem', color: '#7c3aed' }}>
                  View All Orders →
                </button>
              </div>
              <div style={{ padding: '8px 0' }}>
                {overview.recentPayments?.map((p) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 24px', borderBottom: '1px solid #f1f5f9', fontSize: '0.88rem' }}>
                    <div>
                      <strong style={{ color: '#0f172a' }}>{p.business_name}</strong> ({p.user_name}) • {p.payment_type.replace(/_/g, ' ')}
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{new Date(p.created_at).toLocaleString()} • Gateway: {p.payment_gateway}</div>
                    </div>
                    <div style={{ textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
                      ₹{p.total_amount_inr}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. USERS MANAGEMENT TAB (MASTER CONTROL) */}
        {tab === 'users' && (
          <div className="card">
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a' }}>
                  User Accounts & Master Controls ({users.length})
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Directly change plans, adjust or set coin balances, edit credentials, or suspend/delete users.
                </div>
              </div>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="form-input"
                style={{ maxWidth: '300px', padding: '8px 14px', fontSize: '0.86rem' }}
              />
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '14px 20px' }}>User & Email</th>
                    <th style={{ padding: '14px 16px' }}>Business</th>
                    <th style={{ padding: '14px 16px' }}>Role</th>
                    <th style={{ padding: '14px 16px' }}>Plan</th>
                    <th style={{ padding: '14px 16px' }}>Coins (Sub / Pur)</th>
                    <th style={{ padding: '14px 16px' }}>Status</th>
                    <th style={{ padding: '14px 20px', textAlign: 'right' }}>Master Controls</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 20px' }}>
                        <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>{u.full_name}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{u.email}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>{u.business_name || '—'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className={`badge ${u.role === 'admin' ? 'badge-primary' : 'badge-secondary'}`} style={{
                          background: u.role === 'admin' ? '#7c3aed' : '#f1f5f9',
                          color: u.role === 'admin' ? '#fff' : '#475569',
                          fontWeight: 700,
                          fontSize: '0.72rem'
                        }}>
                          {u.role === 'admin' ? '👑 Admin' : 'User'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className="badge badge-primary" style={{ textTransform: 'capitalize' }}>
                          {u.plan_name || 'Free'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <strong style={{ color: '#0f172a' }}>
                          {(u.subscription_balance || 0) + (u.purchased_balance || 0)}
                        </strong>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {u.subscription_balance || 0} Sub / {u.purchased_balance || 0} Pur
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                          {u.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', flexWrap: 'wrap' }}>
                          {/* Change Plan Button */}
                          <button
                            onClick={() => {
                              setChangePlanUser(u);
                              setSelectedPlanSlug(u.plan_slug || 'free');
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.74rem', padding: '5px 10px', fontWeight: 600 }}
                            title="Directly assign Free, Creator, or Business Plan"
                          >
                            Plan
                          </button>

                          {/* Coins Button */}
                          <button
                            onClick={() => {
                              setAdjustCoinsUser(u);
                              setAdjustMode('grant');
                              setAdjustAmount('50');
                              setAdjustSubBal(String(u.subscription_balance || 0));
                              setAdjustPurBal(String(u.purchased_balance || 0));
                              setAdjustReason('Admin balance adjustment');
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.74rem', padding: '5px 10px', fontWeight: 600 }}
                            title="Credit bonus coins or set balance"
                          >
                            Coins
                          </button>

                          {/* Edit User Details */}
                          <button
                            onClick={() => setEditingUser({ ...u })}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.74rem', padding: '5px 8px' }}
                            title="Edit User Details & Role"
                          >
                            <Edit2 size={13} />
                          </button>

                          {/* Suspend / Activate Toggle */}
                          <button
                            onClick={() => handleToggleUserStatus(u)}
                            className="btn btn-ghost btn-sm"
                            style={{
                              fontSize: '0.74rem',
                              padding: '5px 8px',
                              color: u.is_active ? '#d97706' : '#10b981',
                              fontWeight: 600
                            }}
                            title={u.is_active ? 'Suspend account' : 'Activate account'}
                          >
                            {u.is_active ? 'Suspend' : 'Activate'}
                          </button>

                          {/* Delete User */}
                          <button
                            onClick={() => setDeletingUser(u)}
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: '0.74rem', padding: '5px 8px', color: '#ef4444' }}
                            title="Permanently Delete User"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. MODELS MODERATION & GOVERNANCE TAB */}
        {tab === 'models' && (
          <div className="card">
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a' }}>
                  Platform 3D Models Moderation ({filteredModels.length})
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Inspect models in 3D viewer, toggle public/private visibility, or remove any model.
                </div>
              </div>
              <input
                type="text"
                placeholder="Search models..."
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
                className="form-input"
                style={{ maxWidth: '280px', padding: '8px 14px', fontSize: '0.86rem' }}
              />
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '14px 20px' }}>Model</th>
                    <th style={{ padding: '14px 16px' }}>Business</th>
                    <th style={{ padding: '14px 16px' }}>Format</th>
                    <th style={{ padding: '14px 16px' }}>Visibility</th>
                    <th style={{ padding: '14px 16px' }}>Status</th>
                    <th style={{ padding: '14px 16px' }}>AR Launches</th>
                    <th style={{ padding: '14px 20px', textAlign: 'right' }}>Master Controls</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredModels.map((m) => (
                    <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 20px' }}>
                        <strong style={{ color: '#0f172a' }}>{m.title}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>ID: {m.id}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>{m.business_name}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className="badge badge-secondary">.{m.original_file_format.toUpperCase()}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className={`badge ${m.visibility === 'public' ? 'badge-success' : 'badge-warning'}`}>
                          {m.visibility}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: '0.8rem', color: '#334155', fontWeight: 600 }}>{m.processing_status}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <strong>{m.ar_views_count || 0}</strong>
                      </td>
                      <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          {/* 3D Preview Link */}
                          <a
                            href={`/model/${m.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Inspect in 3D WebAR Viewer"
                          >
                            <ExternalLink size={12} />
                            <span>Preview</span>
                          </a>

                          {/* Toggle Visibility */}
                          <button
                            onClick={async () => {
                              const newVis = m.visibility === 'public' ? 'private' : 'public';
                              await api.updateAdminModel(m.id, { visibility: newVis });
                              success(`Model visibility changed to ${newVis}`);
                              fetchAdminData();
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.75rem' }}
                          >
                            {m.visibility === 'public' ? 'Make Private' : 'Make Public'}
                          </button>

                          {/* Delete Model */}
                          <button
                            onClick={() => setDeletingModel(m)}
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: '0.75rem', color: '#ef4444' }}
                            title="Permanently Delete Model"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. PLANS CONFIGURATION (LIVE DATABASE LIMITS) */}
        {tab === 'plans' && (
          <div>
            <div style={{
              background: '#f5f3ff',
              border: '1px solid #e9d5ff',
              padding: '14px 20px',
              borderRadius: '12px',
              fontSize: '0.88rem',
              color: '#5b21b6',
              marginBottom: '24px'
            }}>
              💡 <strong>Relational Dynamic Rules:</strong> All plan prices, monthly coin allowances, daily bonuses, storage limits, and AR/CAD limits are dynamically pulled from MySQL. Changes made here take effect platform-wide immediately.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
              {plans.map((p) => (
                <div key={p.id} className="card" style={{ padding: '28px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h3 style={{ fontSize: '1.25rem', margin: 0 }}>{p.name} Plan</h3>
                    <span className="badge badge-primary">{p.slug}</span>
                  </div>

                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>
                    ₹{p.price_inr} <span style={{ fontSize: '0.85rem', color: '#64748b' }}>/ month</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.86rem', color: '#334155', marginBottom: '24px' }}>
                    <div>• Monthly Coins: <strong>{p.monthly_coins}</strong></div>
                    <div>• Daily Bonus: <strong>+{p.daily_bonus_coins || 0} coins/day</strong></div>
                    <div>• Daily Monthly Cap: <strong>{p.daily_bonus_monthly_cap || 0} coins</strong></div>
                    <div>• Cloud Storage: <strong>{(p.storage_bytes / (1024 * 1024 * 1024)).toFixed(0)} GB</strong></div>
                    <div>• Active AR Models: <strong>{p.active_ar_models_limit}</strong></div>
                    <div>• Max Team Logins: <strong>{p.max_team_members}</strong></div>
                    <div>• Monthly CAD Rev Pool: <strong>{p.cad_revisions_monthly}</strong></div>
                    <div>• Max Rev per Model: <strong>{p.cad_revisions_max_per_model}</strong></div>
                  </div>

                  <button
                    onClick={() => setEditingPlan({
                      ...p,
                      storage_gb: (p.storage_bytes / (1024 * 1024 * 1024)).toFixed(0)
                    })}
                    className="btn btn-secondary btn-sm"
                    style={{ width: '100%', gap: '6px' }}
                  >
                    <Edit2 size={14} />
                    <span>Edit Plan Limits & Pricing</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. COIN PACKAGES TAB */}
        {tab === 'packages' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Configured Coin Top-Up Packages</div>
              <button
                onClick={() => {
                  setEditingPkg({ name: '', coin_amount: 100, price_inr: 99, is_popular: 0 });
                  setIsNewPkg(true);
                }}
                className="btn btn-primary btn-sm"
              >
                <Plus size={16} />
                <span>Add Coin Package</span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
              {packages.map((pkg) => (
                <div key={pkg.id} className="card" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '1.15rem', margin: 0 }}>{pkg.name}</h3>
                    {pkg.is_popular ? <span className="badge badge-primary">Popular</span> : null}
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#7c3aed', marginBottom: '8px' }}>
                    {pkg.coin_amount} Coins
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>
                    ₹{pkg.price_inr} <span style={{ fontSize: '0.75rem', color: '#64748b' }}>+ 18% GST</span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        setEditingPkg(pkg);
                        setIsNewPkg(false);
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1 }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeletePackage(pkg)}
                      className="btn btn-ghost btn-sm"
                      style={{ color: '#ef4444', padding: '6px 10px' }}
                      title="Delete Coin Package"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. PAYMENTS AUDIT TAB */}
        {tab === 'payments' && (
          <div className="card">
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', fontWeight: 700 }}>
              All Platform Invoices & Orders ({payments.length})
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 20px' }}>Order ID</th>
                    <th style={{ padding: '12px 16px' }}>Business</th>
                    <th style={{ padding: '12px 16px' }}>Type</th>
                    <th style={{ padding: '12px 16px' }}>Amount (INR)</th>
                    <th style={{ padding: '12px 16px' }}>18% GST</th>
                    <th style={{ padding: '12px 16px' }}>Total</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 20px', fontFamily: 'monospace' }}>{p.id}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <strong>{p.business_name}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.user_email}</div>
                      </td>
                      <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>
                        {p.payment_type.replace(/_/g, ' ')}
                      </td>
                      <td style={{ padding: '12px 16px' }}>₹{p.amount_inr}</td>
                      <td style={{ padding: '12px 16px' }}>₹{p.gst_inr}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#10b981' }}>₹{p.total_amount_inr}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className="badge badge-success">{p.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 7. PLATFORM SETTINGS TAB */}
        {tab === 'settings' && (
          <div className="card" style={{ padding: '32px', maxWidth: '780px' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '20px' }}>Global Business Logic Settings</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {platformSettings.map((s) => (
                <div key={s.setting_key} style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <strong style={{ color: '#0f172a' }}>{s.setting_key}</strong>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Last updated: {new Date(s.updated_at).toLocaleDateString()}</span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '10px' }}>{s.description}</p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      defaultValue={s.setting_value}
                      id={`set_${s.setting_key}`}
                      className="form-input"
                      style={{ maxWidth: '320px', padding: '6px 10px', fontSize: '0.88rem' }}
                    />
                    <button
                      onClick={() => {
                        const val = document.getElementById(`set_${s.setting_key}`).value;
                        handleSaveSetting(s.setting_key, val);
                      }}
                      className="btn btn-secondary btn-sm"
                    >
                      Update Setting
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      </div>

      {/* ========================================================= */}
      {/* MODALS */}
      {/* ========================================================= */}

      {/* MODAL 1: CHANGE USER PLAN */}
      {changePlanUser && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '480px', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={20} color="#7c3aed" />
                <h3 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700 }}>Assign User Plan</h3>
              </div>
              <button onClick={() => setChangePlanUser(null)} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '20px' }}>
              Select a tier for <strong>{changePlanUser.full_name}</strong> ({changePlanUser.email}). The user's account and limits will update immediately.
            </p>
            <form onSubmit={handleChangeUserPlan}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                {[
                  { slug: 'free', name: 'Free Plan', desc: '₹0/mo • 30 coins/mo • 1 GB storage' },
                  { slug: 'creator', name: 'Creator Plan', desc: '₹299/mo • 300 coins/mo • +20 daily coins (cap 60) • 10 GB' },
                  { slug: 'business', name: 'Business Plan', desc: '₹799/mo • 1,000 coins/mo • +20 daily coins (cap 200) • 50 GB • Team logins' }
                ].map((tier) => (
                  <label
                    key={tier.slug}
                    onClick={() => setSelectedPlanSlug(tier.slug)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '14px 16px',
                      borderRadius: '10px',
                      border: selectedPlanSlug === tier.slug ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                      background: selectedPlanSlug === tier.slug ? '#f5f3ff' : '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="radio"
                      name="planChoice"
                      value={tier.slug}
                      checked={selectedPlanSlug === tier.slug}
                      onChange={() => setSelectedPlanSlug(tier.slug)}
                      style={{ marginTop: '3px' }}
                    />
                    <div>
                      <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>{tier.name}</strong>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>{tier.desc}</div>
                    </div>
                  </label>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setChangePlanUser(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: '#7c3aed', borderColor: '#7c3aed' }}>
                  Assign Plan Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADJUST OR SET USER COINS */}
      {adjustCoinsUser && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '480px', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Coins size={20} color="#7c3aed" />
                <h3 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700 }}>Adjust User Coins</h3>
              </div>
              <button onClick={() => setAdjustCoinsUser(null)} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: '0.86rem', color: '#64748b', marginBottom: '18px' }}>
              User: <strong>{adjustCoinsUser.full_name}</strong> ({adjustCoinsUser.email})
            </p>

            {/* Toggle Mode */}
            <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '4px', borderRadius: '8px', marginBottom: '20px' }}>
              <button
                type="button"
                onClick={() => setAdjustMode('grant')}
                style={{
                  flex: 1,
                  padding: '7px 0',
                  borderRadius: '6px',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: adjustMode === 'grant' ? '#ffffff' : 'transparent',
                  color: adjustMode === 'grant' ? '#7c3aed' : '#64748b',
                  boxShadow: adjustMode === 'grant' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                + Add Bonus Coins
              </button>
              <button
                type="button"
                onClick={() => setAdjustMode('set')}
                style={{
                  flex: 1,
                  padding: '7px 0',
                  borderRadius: '6px',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: adjustMode === 'set' ? '#ffffff' : 'transparent',
                  color: adjustMode === 'set' ? '#7c3aed' : '#64748b',
                  boxShadow: adjustMode === 'set' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                Set Exact Balance
              </button>
            </div>

            <form onSubmit={handleAdjustCoinsSubmit}>
              {adjustMode === 'grant' ? (
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Coins to Credit</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    className="form-input"
                  />
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Subscription Coins</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={adjustSubBal}
                      onChange={(e) => setAdjustSubBal(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Purchased Coins</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={adjustPurBal}
                      onChange={(e) => setAdjustPurBal(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Audit / Reason Note</label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setAdjustCoinsUser(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: '#7c3aed', borderColor: '#7c3aed' }}>
                  Update Balance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT USER PROFILE & ROLE */}
      {editingUser && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '460px', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCheck size={20} color="#7c3aed" />
                <h3 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700 }}>Edit User Profile</h3>
              </div>
              <button onClick={() => setEditingUser(null)} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveUserDetails}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  required
                  value={editingUser.full_name}
                  onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  required
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Account Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="form-input"
                >
                  <option value="user">Regular User</option>
                  <option value="admin">Platform Super Admin</option>
                </select>
                <p style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '4px' }}>
                  Setting role to "Platform Super Admin" grants full administrative control over all platform entities.
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setEditingUser(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: '#7c3aed', borderColor: '#7c3aed' }}>
                  Save User Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: DELETE USER CONFIRMATION */}
      {deletingUser && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '440px', padding: '28px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#fef2f2',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <ShieldAlert size={26} />
            </div>
            <h3 style={{ fontSize: '1.25rem', textAlign: 'center', marginBottom: '8px', color: '#0f172a' }}>
              Permanently Delete User?
            </h3>
            <p style={{ fontSize: '0.86rem', color: '#64748b', textAlign: 'center', marginBottom: '24px' }}>
              Are you sure you want to delete <strong>{deletingUser.full_name}</strong> ({deletingUser.email})? This action is irreversible and will permanently delete all associated 3D models, files, workspaces, wallets, and subscriptions.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                className="btn btn-danger"
                style={{ flex: 1 }}
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: DELETE MODEL CONFIRMATION */}
      {deletingModel && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '440px', padding: '28px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#fef2f2',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <Trash2 size={26} />
            </div>
            <h3 style={{ fontSize: '1.25rem', textAlign: 'center', marginBottom: '8px', color: '#0f172a' }}>
              Delete 3D Model?
            </h3>
            <p style={{ fontSize: '0.86rem', color: '#64748b', textAlign: 'center', marginBottom: '24px' }}>
              Permanently delete <strong>"{deletingModel.title}"</strong> (ID: {deletingModel.id}) from the platform? All uploaded GLB/USDZ assets and revisions will be removed.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setDeletingModel(null)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteModel}
                className="btn btn-danger"
                style={{ flex: 1 }}
              >
                Delete Model
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: EDIT PLAN LIMITS */}
      {editingPlan && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '520px', padding: '28px' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Configure {editingPlan.name} Plan Limits</h3>
            <form onSubmit={handleSavePlan}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Price (INR)</label>
                  <input
                    type="number"
                    value={editingPlan.price_inr}
                    onChange={(e) => setEditingPlan({ ...editingPlan, price_inr: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Monthly Coins</label>
                  <input
                    type="number"
                    value={editingPlan.monthly_coins}
                    onChange={(e) => setEditingPlan({ ...editingPlan, monthly_coins: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Storage (GB)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editingPlan.storage_gb}
                    onChange={(e) => setEditingPlan({ ...editingPlan, storage_gb: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Active AR Limit</label>
                  <input
                    type="number"
                    value={editingPlan.active_ar_models_limit}
                    onChange={(e) => setEditingPlan({ ...editingPlan, active_ar_models_limit: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Max Team Seats</label>
                  <input
                    type="number"
                    value={editingPlan.max_team_members}
                    onChange={(e) => setEditingPlan({ ...editingPlan, max_team_members: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Monthly CAD Rev Pool</label>
                  <input
                    type="number"
                    value={editingPlan.cad_revisions_monthly}
                    onChange={(e) => setEditingPlan({ ...editingPlan, cad_revisions_monthly: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" onClick={() => setEditingPlan(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Plan Limits to Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: EDIT / CREATE COIN PACKAGE */}
      {editingPkg && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '440px', padding: '24px' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>
              {isNewPkg ? 'Create Coin Top-Up Package' : 'Edit Coin Package'}
            </h3>
            <form onSubmit={handleSavePackage}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Package Name</label>
                <input
                  type="text"
                  required
                  value={editingPkg.name}
                  onChange={(e) => setEditingPkg({ ...editingPkg, name: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Coin Amount</label>
                <input
                  type="number"
                  required
                  value={editingPkg.coin_amount}
                  onChange={(e) => setEditingPkg({ ...editingPkg, coin_amount: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Price in INR (excluding GST)</label>
                <input
                  type="number"
                  required
                  value={editingPkg.price_inr}
                  onChange={(e) => setEditingPkg({ ...editingPkg, price_inr: e.target.value })}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setEditingPkg(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Package
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 1024px) {
          .admin-mobile-bar {
            display: flex !important;
          }
          .admin-sidebar {
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
          .admin-sidebar.mobile-open {
            transform: translateX(0) !important;
          }
          .admin-mobile-drawer-header {
            display: flex !important;
          }
          main {
            padding: 24px 20px !important;
          }
        }
        @media (max-width: 640px) {
          main {
            padding: 16px 14px !important;
          }
        }
      `}</style>
    </div>
  );
}
