// ============================================
// App Component - Main Application Shell
// ============================================

import { useEffect, useState, useCallback, Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore, useUIStore, useSettingsStore, initializeThemeWatcher } from '@/stores';
import { SIPProvider, PhantomAPIProvider, BusylightProvider, usePhantomAPI } from '@/contexts';
import { phantomApiService } from '@/services';
import { initializeVersionTracking, setPhantomAPIKey, setPhantomAPIRefreshCallback } from '@/utils';
import { useNetworkStatus } from '@/hooks';
import { 
  LoadingScreen, 
  LoadingSpinner,
  ToastContainer,
  MainContainer,
  LeftPanel,
  LeftPanelHeader,
  LeftPanelContent,
  NavigationTabs,
  SIPStatusDisplay,
  WelcomeOverlay,
  UpdatePrompt
} from '@/components';
import { VersionUpdateModal } from '@/components/modals';
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
  const sipConfig = useSettingsStore((state) => state.sipConfig);
  const setCurrentView = useAppStore((state) => state.setCurrentView);
  const setOpenSettingsWithConnection = useAppStore((state) => state.setOpenSettingsWithConnection);
  
  // Check if first time setup (no PhantomID or credentials)
  const [showWelcome, setShowWelcome] = useState(() => {
    // Check if we've shown welcome before
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    return !hasSeenWelcome && !sipConfig;
  });
  
  // Handle welcome close
  const handleWelcomeClose = useCallback(() => {
    localStorage.setItem('hasSeenWelcome', 'true');
    setShowWelcome(false);
  }, []);
  
  // Handle opening settings from welcome
  const handleWelcomeOpenSettings = useCallback(() => {
    setOpenSettingsWithConnection(true);
    setCurrentView('settings');
  }, [setCurrentView, setOpenSettingsWithConnection]);
  
  return (
    <MainContainer>
      {/* Left Panel - Navigation and Content */}
      <LeftPanel>
        <LeftPanelHeader>
          <div className="app-brand">
            <img src="/icons/pwa-192x192.png" alt="" className="brand-logo" />
            <span className="brand-name">Connect365</span>
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
      
      {/* Welcome Overlay - First Time Setup */}
      <WelcomeOverlay
        isOpen={showWelcome}
        onClose={handleWelcomeClose}
        onOpenSettings={handleWelcomeOpenSettings}
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
  const settingsLanguage = useSettingsStore((state) => state.settings.interface.language);
  
  // Initialize network monitoring with automatic SIP disconnection
  useNetworkStatus();
  
  // Version update modal state
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [versionInfo, setVersionInfo] = useState<{
    lastVersion: string | null;
    currentVersion: string;
    changeType: 'upgrade' | 'downgrade' | 'unchanged';
  } | null>(null);
  
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
  
  // Sync i18next with settings store language
  useEffect(() => {
    const verboseLogging = localStorage.getItem('autocab365_VerboseLogging') === 'true';
    
    // Only change if different from current i18n language
    if (settingsLanguage && i18n.language !== settingsLanguage) {
      if (verboseLogging) {
        console.log('[App] Syncing language from settings:', settingsLanguage);
      }
      i18n.changeLanguage(settingsLanguage);
    }
  }, [settingsLanguage, i18n]);
  
  // Initialize application
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const verboseLogging = localStorage.getItem('autocab365_VerboseLogging') === 'true';
        
        if (verboseLogging) {
          console.log('[App] 🚀 Initializing application...');
        }
        
        // Check version and show update modal if changed
        const versionCheck = initializeVersionTracking();
        
        if (verboseLogging) {
          console.log('[App] 📦 Version check complete:', versionCheck);
        }
        
        // Show version modal if version changed (upgrade or downgrade)
        if (versionCheck.hasChanged && versionCheck.changeType !== 'first-run') {
          setVersionInfo({
            lastVersion: versionCheck.lastVersion,
            currentVersion: versionCheck.currentVersion,
            changeType: versionCheck.changeType as 'upgrade' | 'downgrade' | 'unchanged'
          });
          setShowVersionModal(true);
        }
        
        // Initialize PhantomApiService if PhantomID is available
        const phantomId = useSettingsStore.getState().settings.connection.phantomId;
        if (phantomId) {
          if (verboseLogging) {
            console.log('[App] 📡 Initializing PhantomApiService with PhantomID:', phantomId);
          }
          await phantomApiService.initialize(phantomId);
        } else {
          if (verboseLogging) {
            console.log('[App] ⚠️ No PhantomID found, PhantomApiService not initialized');
          }
        }
        
        // Simulate additional initialization if needed
        await new Promise((resolve) => setTimeout(resolve, 500));
        
        setInitialized(true);
        setLoading(false);
        
        if (verboseLogging) {
          console.log('[App] ✅ Application initialized successfully');
        }
      } catch (error) {
        console.error('[App] ❌ Failed to initialize app:', error);
        setLoading(false);
      }
    };
    
    initializeApp();
  }, [setInitialized, setLoading]);
  
  // Show loading screen while initializing
  if (loading || !initialized) {
    return <LoadingScreen message={loadingMessage} />;
  }
  
  return (
    <PhantomAPIProvider pollInterval={5}>
      <PhantomAPIInitializer>
        <SIPProvider>
          <BusylightProvider>
            {/* PWA Update Banner - Shows when new version is available */}
            <UpdatePrompt />
            
            <MainLayout />
            
            {/* Version Update Modal */}
            {versionInfo && (
              <VersionUpdateModal
                isOpen={showVersionModal}
                onClose={() => setShowVersionModal(false)}
                lastVersion={versionInfo.lastVersion}
                currentVersion={versionInfo.currentVersion}
                changeType={versionInfo.changeType}
              />
            )}
          </BusylightProvider>
        </SIPProvider>
      </PhantomAPIInitializer>
    </PhantomAPIProvider>
  );
}

// Component to initialize Phantom API client with context values
function PhantomAPIInitializer({ children }: { children: React.ReactNode }) {
  const { apiKey, refreshAPIKey } = usePhantomAPI();
  const verboseLogging = localStorage.getItem('autocab365_VerboseLogging') === 'true';

  useEffect(() => {
    if (apiKey) {
      if (verboseLogging) {
        console.log('[App] 🔑 Setting Phantom API key in client');
      }
      setPhantomAPIKey(apiKey);
      setPhantomAPIRefreshCallback(refreshAPIKey);
    }
  }, [apiKey, refreshAPIKey, verboseLogging]);

  return <>{children}</>;
}

export default App;
