// ============================================
// App Component - Main Application Shell
// ============================================

import { useEffect, Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore, useUIStore, initializeThemeWatcher } from '@/stores';
import { SIPProvider } from '@/contexts';
import { 
  LoadingScreen, 
  LoadingSpinner,
  ToastContainer,
  MainContainer,
  LeftPanel,
  LeftPanelHeader,
  LeftPanelContent,
  NavigationTabs,
  SIPStatusDisplay
} from '@/components';
// ErrorBoundary can be used to wrap views if needed
// import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DialView } from '@/components/dial';
import '@/styles/globals.css';

// Lazy load non-critical views for better initial load time
const ContactsView = lazy(() => 
  import('@/components/contacts/ContactsView').then(m => ({ default: m.ContactsView }))
);
const ActivityView = lazy(() => 
  import('@/components/activity/ActivityView').then(m => ({ default: m.ActivityView }))
);
const CompanyNumbersView = lazy(() => 
  import('@/components/company-numbers/CompanyNumbersView').then(m => ({ default: m.CompanyNumbersView }))
);
const QueueMonitorView = lazy(() => 
  import('@/components/queue-monitor/QueueMonitorView').then(m => ({ default: m.QueueMonitorView }))
);
const SettingsView = lazy(() => 
  import('@/components/settings/SettingsView').then(m => ({ default: m.SettingsView }))
);

// Fallback loading component for lazy views
function ViewLoadingFallback() {
  return (
    <div className="view-loading">
      <LoadingSpinner size="md" />
    </div>
  );
}

// View router component
function ViewRouter() {
  const currentView = useAppStore((state) => state.currentView);
  
  switch (currentView) {
    case 'dial':
      return <DialView />;
    case 'contacts':
      return (
        <Suspense fallback={<ViewLoadingFallback />}>
          <ContactsView />
        </Suspense>
      );
    case 'activity':
      return (
        <Suspense fallback={<ViewLoadingFallback />}>
          <ActivityView />
        </Suspense>
      );
    case 'companyNumbers':
      return (
        <Suspense fallback={<ViewLoadingFallback />}>
          <CompanyNumbersView />
        </Suspense>
      );
    case 'queueMonitor':
      return (
        <Suspense fallback={<ViewLoadingFallback />}>
          <QueueMonitorView />
        </Suspense>
      );
    case 'settings':
      return (
        <Suspense fallback={<ViewLoadingFallback />}>
          <SettingsView />
        </Suspense>
      );
    default:
      return <DialView />;
  }
}

// Main layout with all panels
function MainLayout() {
  const notifications = useUIStore((state) => state.notifications);
  const removeNotification = useUIStore((state) => state.removeNotification);
  
  return (
    <MainContainer>
      {/* Left Panel - Navigation and Content */}
      <LeftPanel>
        <LeftPanelHeader>
          <div className="app-brand">
            <img src="/icons/icon-48x48.png" alt="" className="brand-logo" />
            <span className="brand-name">Autocab365 Connect</span>
          </div>
          <SIPStatusDisplay />
        </LeftPanelHeader>
        
        <NavigationTabs />
        
        <LeftPanelContent>
          <ViewRouter />
        </LeftPanelContent>
      </LeftPanel>
      
      {/* Toast Notifications */}
      <ToastContainer 
        toasts={notifications.map(n => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          duration: n.duration,
          persistent: n.persistent,
          onDismiss: removeNotification
        }))}
        onDismiss={removeNotification}
        position="top-right"
      />
    </MainContainer>
  );
}

function App() {
  const { i18n } = useTranslation();
  const initialized = useAppStore((state) => state.initialized);
  const loading = useAppStore((state) => state.loading);
  const loadingMessage = useAppStore((state) => state.loadingMessage);
  const setInitialized = useAppStore((state) => state.setInitialized);
  const setLoading = useAppStore((state) => state.setLoading);
  const effectiveTheme = useUIStore((state) => state.effectiveTheme);
  
  // Initialize theme watcher
  useEffect(() => {
    const cleanup = initializeThemeWatcher();
    return cleanup;
  }, []);
  
  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', effectiveTheme);
    document.documentElement.classList.toggle('dark', effectiveTheme === 'dark');
  }, [effectiveTheme]);
  
  // Initialize application
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Simulate initialization (will be replaced with actual init logic)
        await new Promise((resolve) => setTimeout(resolve, 800));
        
        // Load saved language preference
        const savedLang = localStorage.getItem('language');
        if (savedLang) {
          i18n.changeLanguage(savedLang);
        }
        
        setInitialized(true);
        setLoading(false);
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setLoading(false);
      }
    };
    
    initializeApp();
  }, [i18n, setInitialized, setLoading]);
  
  // Show loading screen while initializing
  if (loading || !initialized) {
    return <LoadingScreen message={loadingMessage} />;
  }
  
  return (
    <SIPProvider>
      <MainLayout />
    </SIPProvider>
  );
}

export default App;
