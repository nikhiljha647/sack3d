import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Public Pages
import Home from './pages/Home';
import Explore from './pages/Explore';
import Industries from './pages/Industries';
import HowItWorks from './pages/HowItWorks';
import Pricing from './pages/Pricing';
import About from './pages/About';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Register from './pages/Register';
import ModelDetail from './pages/ModelDetail';
import PublicGallery from './pages/PublicGallery';

// Dashboard Pages
import DashboardLayout from './pages/dashboard/DashboardLayout';
import Overview from './pages/dashboard/Overview';
import MyModels from './pages/dashboard/MyModels';
import UploadModel from './pages/dashboard/UploadModel';
import Galleries from './pages/dashboard/Galleries';
import ARModels from './pages/dashboard/ARModels';
import QRCodes from './pages/dashboard/QRCodes';
import CADRevisions from './pages/dashboard/CADRevisions';
import Wallet from './pages/dashboard/Wallet';
import Transactions from './pages/dashboard/Transactions';
import Analytics from './pages/dashboard/Analytics';
import Subscription from './pages/dashboard/Subscription';
import Team from './pages/dashboard/Team';
import Storage from './pages/dashboard/Storage';
import Settings from './pages/dashboard/Settings';

// Admin Portal
import AdminPortal from './pages/admin/AdminPortal';

// Helper to convert URL pathname (+ hash) to app state
const parseRouteFromLocation = () => {
  const pathname = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
  const hash = window.location.hash;

  if (pathname === '' || pathname === '/') {
    if (hash && hash.startsWith('#model-')) {
      const id = hash.replace('#model-', '');
      return { view: 'model-detail', modelId: id };
    }
    return { view: 'home' };
  }
  if (pathname === '/pricing') return { view: 'pricing' };
  if (pathname === '/about') return { view: 'about' };
  if (pathname === '/explore' || pathname === '/models') return { view: 'explore' };
  if (pathname === '/industries') return { view: 'industries' };
  if (pathname === '/how-it-works') return { view: 'how-it-works' };
  if (pathname === '/contact') return { view: 'contact' };
  if (pathname === '/login') return { view: 'login' };
  if (pathname === '/register') return { view: 'register' };
  if (pathname === '/admin') return { view: 'admin' };
  if (pathname.startsWith('/model/')) {
    const id = window.location.pathname.replace(/^\/model\//i, '');
    return { view: 'model-detail', modelId: id || 'mod_pump_01' };
  }
  if (pathname.startsWith('/gallery/')) {
    const id = window.location.pathname.replace(/^\/gallery\//i, '');
    return { view: 'gallery-detail', galleryId: id };
  }
  if (pathname.startsWith('/dashboard')) {
    const rawTab = window.location.pathname.replace(/^\/dashboard\/?/i, '');
    return { view: 'dashboard', tab: rawTab || 'overview' };
  }

  return { view: 'home' };
};

// Helper to convert app state to URL path
const getRoutePath = (view, tab, modelId, galleryId) => {
  if (view === 'home') return '/';
  if (view === 'pricing') return '/pricing';
  if (view === 'about') return '/about';
  if (view === 'explore') return '/explore';
  if (view === 'industries') return '/industries';
  if (view === 'how-it-works') return '/how-it-works';
  if (view === 'contact') return '/contact';
  if (view === 'login') return '/login';
  if (view === 'register') return '/register';
  if (view === 'admin') return '/admin';
  if (view === 'model-detail') return `/model/${modelId || 'mod_pump_01'}`;
  if (view === 'gallery-detail') return `/gallery/${galleryId || ''}`;
  if (view === 'dashboard' || (typeof view === 'string' && view.startsWith('dashboard'))) {
    const activeTab = tab || (view.includes('/') ? view.split('/')[1] : 'overview');
    return activeTab && activeTab !== 'overview' ? `/dashboard/${activeTab}` : '/dashboard';
  }
  return '/';
};

function MainApp() {
  const { user, loading } = useAuth();
  const initialRoute = parseRouteFromLocation();
  const [currentView, setCurrentViewState] = useState(initialRoute.view);
  const [dashboardTab, setDashboardTabState] = useState(initialRoute.tab || 'overview');
  const [selectedModelId, setSelectedModelIdState] = useState(initialRoute.modelId || 'mod_pump_01');
  const [selectedGalleryId, setSelectedGalleryIdState] = useState(initialRoute.galleryId || '');

  const viewRef = useRef(initialRoute.view);
  const tabRef = useRef(initialRoute.tab || 'overview');
  const modelIdRef = useRef(initialRoute.modelId || 'mod_pump_01');
  const galleryIdRef = useRef(initialRoute.galleryId || '');

  // Keep refs in sync with current state
  viewRef.current = currentView;
  tabRef.current = dashboardTab;
  modelIdRef.current = selectedModelId;
  galleryIdRef.current = selectedGalleryId;

  const syncUrl = (view, tab, modelId, galleryId, replace = false) => {
    const targetPath = getRoutePath(view, tab, modelId, galleryId || galleryIdRef.current);
    if (window.location.pathname !== targetPath) {
      if (replace) {
        window.history.replaceState(null, '', targetPath);
      } else {
        window.history.pushState(null, '', targetPath);
      }
    }
  };

  const setCurrentView = (view) => {
    let targetView = typeof view === 'function' ? view(viewRef.current) : view;
    let targetTab = tabRef.current;

    if (typeof targetView === 'string' && targetView.startsWith('dashboard/')) {
      const tab = targetView.split('/')[1] || 'overview';
      targetView = 'dashboard';
      targetTab = tab;
      tabRef.current = tab;
      setDashboardTabState(tab);
    }

    viewRef.current = targetView;
    setCurrentViewState(targetView);
    syncUrl(targetView, targetTab, modelIdRef.current, galleryIdRef.current);
  };

  const setDashboardTab = (tab) => {
    const nextTab = typeof tab === 'function' ? tab(tabRef.current) : tab;
    tabRef.current = nextTab;
    setDashboardTabState(nextTab);
    if (viewRef.current === 'dashboard') {
      syncUrl('dashboard', nextTab, modelIdRef.current, galleryIdRef.current);
    }
  };

  const setSelectedModelId = (id) => {
    const nextId = typeof id === 'function' ? id(modelIdRef.current) : id;
    modelIdRef.current = nextId;
    setSelectedModelIdState(nextId);
    if (viewRef.current === 'model-detail') {
      syncUrl('model-detail', tabRef.current, nextId, galleryIdRef.current);
    }
  };

  const setSelectedGalleryId = (id) => {
    const nextId = typeof id === 'function' ? id(galleryIdRef.current) : id;
    galleryIdRef.current = nextId;
    setSelectedGalleryIdState(nextId);
    if (viewRef.current === 'gallery-detail') {
      syncUrl('gallery-detail', tabRef.current, modelIdRef.current, nextId);
    }
  };

  // Guard: handle authentication state routing
  useEffect(() => {
    if (!loading) {
      if (!user && (currentView.startsWith('dashboard') || currentView === 'admin')) {
        setCurrentViewState('home');
        viewRef.current = 'home';
        syncUrl('home', tabRef.current, modelIdRef.current, true);
      } else if (user && user.role !== 'admin' && currentView === 'admin') {
        // Non-admins cannot access admin portal
        setCurrentViewState('dashboard');
        viewRef.current = 'dashboard';
        syncUrl('dashboard', 'overview', modelIdRef.current, true);
      } else if (user && user.role === 'admin' && currentView.startsWith('dashboard')) {
        // Admin does not need user workspace - route to master admin portal
        setCurrentViewState('admin');
        viewRef.current = 'admin';
        syncUrl('admin', tabRef.current, modelIdRef.current, true);
      } else if (user && (currentView === 'login' || currentView === 'register')) {
        // If already logged in, route admin to admin portal, regular user to home
        const destination = user.role === 'admin' ? 'admin' : 'home';
        setCurrentViewState(destination);
        viewRef.current = destination;
        syncUrl(destination, tabRef.current, modelIdRef.current, true);
      }
    }
  }, [user, currentView, loading]);

  // Handle browser navigation (back/forward popstate)
  useEffect(() => {
    const handlePopState = () => {
      const route = parseRouteFromLocation();
      viewRef.current = route.view;
      setCurrentViewState(route.view);
      if (route.tab) {
        tabRef.current = route.tab;
        setDashboardTabState(route.tab);
      }
      if (route.modelId) {
        modelIdRef.current = route.modelId;
        setSelectedModelIdState(route.modelId);
      }
      if (route.galleryId) {
        galleryIdRef.current = route.galleryId;
        setSelectedGalleryIdState(route.galleryId);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Scroll to top on view change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentView, dashboardTab]);

  const isDashboard = currentView.startsWith('dashboard');
  const isAdmin = currentView === 'admin';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Top Navbar */}
      <Navbar currentView={currentView} setCurrentView={setCurrentView} />

      {/* Main Content Area */}
      <div style={{ flex: 1 }}>
        {/* Public Views */}
        {currentView === 'home' && (
          <Home
            setCurrentView={setCurrentView}
            setSelectedModelId={setSelectedModelId}
          />
        )}

        {currentView === 'explore' && (
          <Explore
            setCurrentView={setCurrentView}
            setSelectedModelId={setSelectedModelId}
          />
        )}

        {currentView === 'industries' && (
          <Industries setCurrentView={setCurrentView} />
        )}

        {currentView === 'how-it-works' && (
          <HowItWorks setCurrentView={setCurrentView} />
        )}

        {currentView === 'pricing' && (
          <Pricing setCurrentView={setCurrentView} />
        )}

        {currentView === 'about' && (
          <About setCurrentView={setCurrentView} />
        )}

        {currentView === 'contact' && (
          <Contact />
        )}

        {currentView === 'login' && (
          <Login setCurrentView={setCurrentView} />
        )}

        {currentView === 'register' && (
          <Register setCurrentView={setCurrentView} />
        )}

        {currentView === 'model-detail' && (
          <ModelDetail
            modelId={selectedModelId}
            setCurrentView={setCurrentView}
            setSelectedModelId={setSelectedModelId}
          />
        )}

        {currentView === 'gallery-detail' && (
          <PublicGallery
            galleryId={selectedGalleryId}
            setCurrentView={setCurrentView}
            setSelectedModelId={setSelectedModelId}
          />
        )}

        {/* Dashboard Area */}
        {isDashboard && (
          <DashboardLayout
            currentTab={dashboardTab}
            setCurrentTab={setDashboardTab}
            setCurrentView={setCurrentView}
          >
            {dashboardTab === 'overview' && (
              <Overview
                setCurrentTab={setDashboardTab}
                setSelectedModelId={setSelectedModelId}
                setCurrentView={setCurrentView}
              />
            )}
            {dashboardTab === 'my-models' && (
              <MyModels
                setCurrentTab={setDashboardTab}
                setSelectedModelId={setSelectedModelId}
                setCurrentView={setCurrentView}
              />
            )}
            {dashboardTab === 'upload' && (
              <UploadModel
                setCurrentTab={setDashboardTab}
                setSelectedModelId={setSelectedModelId}
                setCurrentView={setCurrentView}
              />
            )}
            {dashboardTab === 'galleries' && (
              <Galleries
                setCurrentTab={setDashboardTab}
                setSelectedModelId={setSelectedModelId}
                setCurrentView={setCurrentView}
                setSelectedGalleryId={setSelectedGalleryId}
              />
            )}
            {dashboardTab === 'ar-models' && (
              <ARModels />
            )}
            {dashboardTab === 'qr-codes' && (
              <QRCodes />
            )}
            {dashboardTab === 'cad-revisions' && (
              <CADRevisions selectedModelId={selectedModelId} />
            )}
            {dashboardTab === 'wallet' && (
              <Wallet setCurrentTab={setDashboardTab} />
            )}
            {dashboardTab === 'transactions' && (
              <Transactions />
            )}
            {dashboardTab === 'analytics' && (
              <Analytics />
            )}
            {dashboardTab === 'subscription' && (
              <Subscription />
            )}
            {dashboardTab === 'team' && (
              <Team setCurrentTab={setDashboardTab} />
            )}
            {dashboardTab === 'storage' && (
              <Storage setCurrentTab={setDashboardTab} />
            )}
            {dashboardTab === 'settings' && (
              <Settings />
            )}
          </DashboardLayout>
        )}

        {/* Master Admin Portal */}
        {isAdmin && (
          <AdminPortal setCurrentView={setCurrentView} />
        )}
      </div>

      {/* Footer on public pages */}
      {!isDashboard && !isAdmin && (
        <Footer setCurrentView={setCurrentView} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ToastProvider>
  );
}
