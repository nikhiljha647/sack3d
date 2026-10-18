/**
 * Centralized API Client for ModelAR
 */

// Determine API Base URL:
// 1. In production, default to relative path '' (same-origin), so requests naturally hit the live domain (/api/...)
// 2. In development, if VITE_API_URL is set, use it; otherwise relative path works with the Vite dev proxy
// 3. If running a production build and VITE_API_URL still points to localhost, ignore it to prevent accidental dev leakage
const isProd = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.PROD;
const configuredApiUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL)
  ? import.meta.env.VITE_API_URL.trim()
  : '';

let rawApiUrl = configuredApiUrl;
if (isProd && (rawApiUrl.includes('localhost') || rawApiUrl.includes('127.0.0.1'))) {
  rawApiUrl = '';
}

const API_BASE_URL = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('modelar_token');
  const headers = {
    ...options.headers,
  };

  // Only set Content-Type to json if not sending FormData
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  const targetUrl = endpoint.startsWith('http://') || endpoint.startsWith('https://')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const response = await fetch(targetUrl, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || `Request failed with status ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.code = data.code;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  register: (body) => apiRequest('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => apiRequest('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => apiRequest('/api/auth/me'),

  // Public
  getPublicModels: (params = '') => apiRequest(`/api/public/models${params}`),
  getCategories: () => apiRequest('/api/public/categories'),
  getIndustries: () => apiRequest('/api/public/industries'),
  getFeatured: () => apiRequest('/api/public/featured'),
  getPublicGallery: (idOrSlug, token = null) => {
    const qs = token ? `?token=${encodeURIComponent(token)}` : '';
    return apiRequest(`/api/public/galleries/${idOrSlug}${qs}`);
  },

  // Models
  getMyModels: (params = '') => apiRequest(`/api/models${params}`),
  getModel: (id, token = null, track = true) => {
    const params = new URLSearchParams();
    if (token) params.append('token', token);
    if (track === false) params.append('track', 'false');
    const qs = params.toString();
    return apiRequest(`/api/models/${id}${qs ? `?${qs}` : ''}`);
  },
  uploadModel: (formData) => apiRequest('/api/models', { method: 'POST', body: formData }),
  createModel: (formData) => apiRequest('/api/models', { method: 'POST', body: formData }),
  updateModel: (id, data) => {
    const isFormData = data instanceof FormData;
    return apiRequest(`/api/models/${id}`, {
      method: 'PUT',
      body: isFormData ? data : JSON.stringify(data)
    });
  },
  deleteModel: (id) => apiRequest(`/api/models/${id}`, { method: 'DELETE' }),
  generateQR: (id, preset = 'brochure') => apiRequest(`/api/models/${id}/qr`, { method: 'POST', body: JSON.stringify({ preset }) }),
  launchAR: (id, meta = {}) => apiRequest(`/api/models/${id}/ar-launch`, { method: 'POST', body: JSON.stringify(meta) }),

  // CAD Revisions & Rollback
  getCADStatus: (id) => apiRequest(`/api/models/${id}/revisions`),
  submitCADRevision: (id, formData) => apiRequest(`/api/models/${id}/revisions`, { method: 'POST', body: formData }),
  rollbackVersion: (id, versionNumber) => apiRequest(`/api/models/${id}/rollback`, { method: 'POST', body: JSON.stringify({ versionNumber }) }),
  resetCADCooldown: (id) => apiRequest(`/api/models/${id}/revisions/reset-cooldown`, { method: 'POST' }),

  // Galleries
  getGalleries: () => apiRequest('/api/galleries'),
  getGallery: (id) => apiRequest(`/api/galleries/${id}`),
  createGallery: (data) => {
    const isFormData = data instanceof FormData;
    return apiRequest('/api/galleries', {
      method: 'POST',
      body: isFormData ? data : JSON.stringify(data)
    });
  },
  updateGallery: (id, data) => {
    const isFormData = data instanceof FormData;
    return apiRequest(`/api/galleries/${id}`, {
      method: 'PUT',
      body: isFormData ? data : JSON.stringify(data)
    });
  },
  uploadGalleryThumbnail: (formData) => apiRequest('/api/galleries/upload-thumbnail', {
    method: 'POST',
    body: formData
  }),
  deleteGallery: (id) => apiRequest(`/api/galleries/${id}`, { method: 'DELETE' }),

  // Wallet & Coins
  getWallet: () => apiRequest('/api/wallet'),
  getTransactions: (limit = 50, offset = 0) => apiRequest(`/api/wallet/transactions?limit=${limit}&offset=${offset}`),
  claimDailyBonus: () => apiRequest('/api/wallet/claim-daily-bonus', { method: 'POST' }),

  // Plans & Payments
  getPlans: () => apiRequest('/api/plans'),
  getCoinPackages: () => apiRequest('/api/plans/packages'),
  subscribePlan: (planSlug) => apiRequest('/api/plans/subscribe', { method: 'POST', body: JSON.stringify({ planSlug }) }),
  purchaseCoins: (packageId) => apiRequest('/api/plans/purchase-coins', { method: 'POST', body: JSON.stringify({ packageId }) }),
  createStripeCheckout: (planId) => apiRequest('/api/plans/create-checkout-session', { method: 'POST', body: JSON.stringify({ planId }) }),
  createCoinCheckout: (params) => apiRequest('/api/plans/create-coin-checkout', { method: 'POST', body: JSON.stringify(params) }),
  verifyStripeSession: (sessionId) => apiRequest('/api/plans/verify-session', { method: 'POST', body: JSON.stringify({ sessionId }) }),

  // Team
  getTeam: () => apiRequest('/api/team'),
  inviteTeamMember: (body) => apiRequest('/api/team/invite', { method: 'POST', body: JSON.stringify(body) }),
  updateTeamRole: (id, role) => apiRequest(`/api/team/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
  removeTeamMember: (id) => apiRequest(`/api/team/${id}`, { method: 'DELETE' }),

  // Analytics
  getDashboardAnalytics: () => apiRequest('/api/analytics/dashboard'),
  getModelAnalytics: (id) => apiRequest(`/api/analytics/models/${id}`),

  // Admin
  getAdminOverview: () => apiRequest('/api/admin/overview'),
  getAdminUsers: (search = '') => apiRequest(`/api/admin/users${search ? `?search=${search}` : ''}`),
  updateAdminUserStatus: (id, isActive) => apiRequest(`/api/admin/users/${id}/status`, { method: 'PUT', body: JSON.stringify({ isActive }) }),
  updateAdminUserPlan: (id, planSlug) => apiRequest(`/api/admin/users/${id}/plan`, { method: 'PUT', body: JSON.stringify({ planSlug }) }),
  setAdminUserCoins: (id, body) => apiRequest(`/api/admin/users/${id}/set-coins`, { method: 'PUT', body: JSON.stringify(body) }),
  updateAdminUser: (id, body) => apiRequest(`/api/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteAdminUser: (id) => apiRequest(`/api/admin/users/${id}`, { method: 'DELETE' }),
  grantAdminCoins: (id, amount, reason) => apiRequest(`/api/admin/users/${id}/grant-coins`, { method: 'POST', body: JSON.stringify({ amount, reason }) }),
  getAdminModels: () => apiRequest('/api/admin/models'),
  updateAdminModel: (id, body) => apiRequest(`/api/admin/models/${id}/moderation`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteAdminModel: (id) => apiRequest(`/api/admin/models/${id}`, { method: 'DELETE' }),
  getAdminPlans: () => apiRequest('/api/admin/plans'),
  updateAdminPlan: (id, body) => apiRequest(`/api/admin/plans/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  getAdminPackages: () => apiRequest('/api/admin/packages'),
  createAdminPackage: (body) => apiRequest('/api/admin/packages', { method: 'POST', body: JSON.stringify(body) }),
  updateAdminPackage: (id, body) => apiRequest(`/api/admin/packages/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteAdminPackage: (id) => apiRequest(`/api/admin/packages/${id}`, { method: 'DELETE' }),
  getAdminPayments: () => apiRequest('/api/admin/payments'),
  getAdminSettings: () => apiRequest('/api/admin/settings'),
  updateAdminSetting: (key, value) => apiRequest(`/api/admin/settings/${key}`, { method: 'PUT', body: JSON.stringify({ value }) }),
};
