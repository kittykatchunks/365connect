// ============================================
// App Component - Main Application Shell
// ============================================

import { useEffect, useState, useCallback, Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore, useUIStore, useSettingsStore, initializeThemeWatcher } from '@/stores';
import { SIPProvider, PhantomAPIProvider, BusylightProvider, QueueMonitorSocketProvider, usePhantomAPI } from '@/contexts';
import { phantomApiService } from '@/services';
import { initializeVersionTracking, setPhantomAPIKey, setPhantomAPIRefreshCallback, isVerboseLoggingEnabled } from '@/utils';
import { useNetworkStatus } from '@/hooks';
import { 
  LoadingScreen, 
  LoadingSpinner,
  ToastContainer,
  MainContainer,
  MainPanel,
  MainPanelHeader,
  MainPanelContent,
  NavigationTabs,
  SIPStatusDisplay,
  WelcomeOverlay,
  UpdatePrompt,
  ViewErrorBoundary
} from '@/components';
import { VersionUpdateModal } from '@/components/modals';
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

// View router component with error boundaries
function ViewRouter() {
  const currentView = useAppStore((state) => state.currentView);
  const setCurrentView = useAppStore((state) => state.setCurrentView);
  const addNotification = useUIStore((state) => state.addNotification);
  const { t } = useTranslation();
  
  // Handle view recovery
  const handleViewRecover = useCallback((viewName: string) => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log(`[ViewRouter] 🔄 View "${viewName}" recovered from error`);
    }
    
    // Show success notification
    addNotification({
      type: 'success',
      title: t('notifications.view_recovered_title', 'View Recovered'),
      message: t('notifications.view_recovered_message', `${viewName} has been successfully recovered.`),
      duration: 3000
    });
  }, [addNotification, t]);
  
  // Handle view error
  const handleViewError = useCallback((viewName: string, error: Error) => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.error(`[ViewRouter] ❌ View "${viewName}" encountered error:`, error);
    }
    
    // Show error notification
    addNotification({
      type: 'error',
      title: t('notifications.view_error_title', 'View Error'),
      message: t('notifications.view_error_message', `${viewName} encountered an error. Attempting auto-recovery...`),
      duration: 5000
    });
  }, [addNotification, t]);
  
  // Listen for navigation events from error boundaries
  useEffect(() => {
    const handleNavigate = (event: CustomEvent<{ view: string }>) => {
      const verboseLogging = isVerboseLoggingEnabled();
      
      if (verboseLogging) {
        console.log('[ViewRouter] 🧭 Navigation event received:', event.detail.view);
      }
      
      setCurrentView(event.detail.view as any);
    };
    
    window.addEventListener('navigateToView', handleNavigate as EventListener);
    return () => window.removeEventListener('navigateToView', handleNavigate as EventListener);
  }, [setCurrentView]);
  
  switch (currentView) {
    case 'dial':
      return (
        <ViewErrorBoundary 
          viewName="Dial"
          onRecover={() => handleViewRecover('Dial')}
          onError={(error) => handleViewError('Dial', error)}
        >
          <DialView />
        </ViewErrorBoundary>
      );
    case 'contacts':
      return (
        <ViewErrorBoundary 
          viewName="Contacts"
          onRecover={() => handleViewRecover('Contacts')}
          onError={(error) => handleViewError('Contacts', error)}
        >
          <Suspense fallback={<ViewLoadingFallback />}>
            <ContactsView />
          </Suspense>
        </ViewErrorBoundary>
      );
    case 'activity':
      return (
        <ViewErrorBoundary 
          viewName="Activity"
          onRecover={() => handleViewRecover('Activity')}
          onError={(error) => handleViewError('Activity', error)}
        >
          <Suspense fallback={<ViewLoadingFallback />}>
            <ActivityView />
          </Suspense>
        </ViewErrorBoundary>
      );
    case 'companyNumbers':
      return (
        <ViewErrorBoundary 
          viewName="Company Numbers"
          onRecover={() => handleViewRecover('Company Numbers')}
          onError={(error) => handleViewError('Company Numbers', error)}
        >
          <Suspense fallback={<ViewLoadingFallback />}>
            <CompanyNumbersView />
          </Suspense>
        </ViewErrorBoundary>
      );
    case 'queueMonitor':
      return (
        <ViewErrorBoundary 
          viewName="Queue Monitor"
          onRecover={() => handleViewRecover('Queue Monitor')}
          onError={(error) => handleViewError('Queue Monitor', error)}
        >
          <Suspense fallback={<ViewLoadingFallback />}>
            <QueueMonitorView />
          </Suspense>
        </ViewErrorBoundary>
      );
    case 'settings':
      return (
        <ViewErrorBoundary 
          viewName="Settings"
          onRecover={() => handleViewRecover('Settings')}
          onError={(error) => handleViewError('Settings', error)}
        >
          <Suspense fallback={<ViewLoadingFallback />}>
            <SettingsView />
          </Suspense>
        </ViewErrorBoundary>
      );
    default:
      return (
        <ViewErrorBoundary 
          viewName="Dial"
          onRecover={() => handleViewRecover('Dial')}
          onError={(error) => handleViewError('Dial', error)}
        >
          <DialView />
        </ViewErrorBoundary>
      );
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
      {/* Main Panel - Navigation and Content */}
      <MainPanel>
        <MainPanelHeader>
          <div className="app-brand">
            <img src="/icons/pwa-192x192.png" alt="" className="brand-logo" />
            <span className="brand-name">Connect365</span>
          </div>
          <SIPStatusDisplay />
        </MainPanelHeader>
        
        <NavigationTabs />
        
        <MainPanelContent>
          <ViewRouter />
        </MainPanelContent>
      </MainPanel>
      
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
  const setCurrentView = useAppStore((state) => state.setCurrentView);
  const setAutoDialNumber = useAppStore((state) => state.setAutoDialNumber);
  const autoDialNumber = useAppStore((state) => state.autoDialNumber);
  const addNotification = useUIStore((state) => state.addNotification);
  const effectiveTheme = useUIStore((state) => state.effectiveTheme);
  const settingsLanguage = useSettingsStore((state) => state.settings.interface.language);
  const { t } = useTranslation();
  
  // Initialize network monitoring with automatic SIP disconnection
  useNetworkStatus();
  
  // Version update modal state
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [versionInfo, setVersionInfo] = useState<{
    lastVersion: string | null;
    currentVersion: string;
    changeType: 'upgrade' | 'downgrade' | 'unchanged';
  } | null>(null);
  
  // Handle click-to-dial from tel: URLs
  useEffect(() => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    console.log('[App] 🚀 Click-to-dial monitoring useEffect initialized (verbose:', verboseLogging + ')');
    console.log('[App] 📍 Current URL at startup:', window.location.href);
    console.log('[App] 📍 URL search params:', window.location.search);
    
    const urlParams = new URLSearchParams(window.location.search);
    const allParams: Record<string, string> = {};
    urlParams.forEach((value, key) => {
      allParams[key] = value;
    });
    console.log('[App] 📍 All URL params:', allParams);
    
    // Check if PWA and protocol handlers are supported
    if ('serviceWorker' in navigator && 'getInstalledRelatedApps' in navigator) {
      console.log('[App] ✅ PWA features supported');
    } else {
      console.log('[App] ⚠️ PWA features may not be fully supported');
    }
    
    let lastProcessedTel = ''; // Track last processed tel to prevent duplicates
    
    // Function to check for tel: parameter in current URL
    const checkForTelParameter = () => {
      const urlParams = new URLSearchParams(window.location.search);
      let telNumber = urlParams.get('tel');
      
      if (telNumber) {
        // Prevent duplicate processing
        if (telNumber === lastProcessedTel) {
          if (verboseLogging) {
            console.log('[App] 🔄 Tel parameter already processed, skipping:', telNumber);
          }
          return false;
        }
        
        lastProcessedTel = telNumber;
        
        if (verboseLogging) {
          console.log('[App] 📞 Detected tel: URL parameter in running app:', telNumber);
          console.log('[App] 📞 Full URL:', window.location.href);
        }
        
        // Strip "tel:" prefix if present
        if (telNumber.toLowerCase().startsWith('tel:')) {
          telNumber = telNumber.substring(4);
        }
        
        // URL decode the number
        telNumber = decodeURIComponent(telNumber);
        
        if (verboseLogging) {
          console.log('[App] 📞 Cleaned tel number:', telNumber);
        }
        
        // Check if click-to-dial is enabled
        const clickToDialEnabled = useSettingsStore.getState().settings.call.clickToDialEnabled;
        
        if (verboseLogging) {
          console.log('[App] Click-to-dial enabled:', clickToDialEnabled);
        }
        
        if (clickToDialEnabled) {
          // Set the number in app store
          setAutoDialNumber(telNumber);
          
          // Switch to dial view
          setCurrentView('dial');
          
          if (verboseLogging) {
            console.log('[App] ✅ Set autoDialNumber and switched to dial view');
          }
        } else {
          // Show disabled notification
          addNotification({
            type: 'warning',
            title: t('notifications.click_to_dial_disabled', 'Click-to-Dial is disabled'),
            message: t('notifications.click_to_dial_disabled_desc', 'Enable it in Settings → Call Settings to use this feature'),
            duration: 5000
          });
          
          if (verboseLogging) {
            console.log('[App] ⚠️ Click-to-dial disabled, showed notification');
          }
        }
        
        // Clean the URL without reload
        const cleanUrl = window.location.pathname + window.location.hash;
        window.history.replaceState(null, '', cleanUrl);
        
        if (verboseLogging) {
          console.log('[App] 🧹 Cleaned URL parameter');
        }
        
        return true; // Found tel parameter
      }
      
      return false; // No tel parameter
    };
    
    // Check immediately on mount
    const foundTel = checkForTelParameter();
    
    if (!foundTel) {
      // Check for autoDialNumber from sessionStorage (set by main.tsx on initial load)
      const storedNumber = sessionStorage.getItem('autoDialNumber');
      const timestamp = sessionStorage.getItem('autoDialTimestamp');
      
      if (storedNumber && timestamp) {
        // Only process if less than 5 seconds old (prevent stale data)
        const age = Date.now() - parseInt(timestamp, 10);
        if (age < 5000) {
          if (verboseLogging) {
            console.log('[App] 📞 Processing click-to-dial number from sessionStorage:', storedNumber);
          }
          
          // Set the number in app store
          setAutoDialNumber(storedNumber);
          
          // Switch to dial view
          setCurrentView('dial');
          
          if (verboseLogging) {
            console.log('[App] 🔄 Switched to Dial tab for click-to-dial');
          }
        } else if (verboseLogging) {
          console.log('[App] ⏰ Click-to-dial data too old, ignoring');
        }
        
        // Clear sessionStorage after processing
        sessionStorage.removeItem('autoDialNumber');
        sessionStorage.removeItem('autoDialTimestamp');
      }
      
      // Check if we should show disabled notification
      const showDisabledNotify = sessionStorage.getItem('clickToDialDisabledNotify');
      if (showDisabledNotify === 'true') {
        if (verboseLogging) {
          console.log('[App] ⚠️ Click-to-dial disabled, showing notification');
        }
        
        addNotification({
          type: 'warning',
          title: t('notifications.click_to_dial_disabled', 'Click-to-Dial is disabled'),
          message: t('notifications.click_to_dial_disabled_desc', 'Enable it in Settings → Call Settings to use this feature'),
          duration: 5000
        });
        
        sessionStorage.removeItem('clickToDialDisabledNotify');
      }
    }
    
    // Listen for window focus (when PWA window is focused from tel: link)
    const handleWindowFocus = () => {
      const verboseLogging = isVerboseLoggingEnabled();
      if (verboseLogging) {
        console.log('[App] 👁️ Window focus event detected, checking for tel: parameter');
      }
      checkForTelParameter();
    };
    
    // Listen for visibility change (when tab/window becomes visible)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const verboseLogging = isVerboseLoggingEnabled();
        if (verboseLogging) {
          console.log('[App] 👁️ Visibility change event (visible), checking for tel: parameter');
        }
        checkForTelParameter();
      }
    };
    
    // Listen for popstate events (browser navigation)
    const handlePopState = () => {
      const verboseLogging = isVerboseLoggingEnabled();
      if (verboseLogging) {
        console.log('[App] 🔄 Popstate event detected, checking for tel: parameter');
      }
      checkForTelParameter();
    };
    
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('popstate', handlePopState);
    
    if (verboseLogging) {
      console.log('[App] 🔍 Tel: URL monitoring started - listening for storage, focus, visibility, and popstate events');
      console.log('[App] 🔍 Polling for URL changes every 1 second when window is focused');
    }
    
    // Also poll URL every second when window is focused (fallback)
    let pollCount = 0;
    const pollInterval = setInterval(() => {
      if (!document.hidden) {
        pollCount++;
        if (verboseLogging && pollCount % 10 === 0) {
          // Log every 10 seconds to avoid spam
          console.log('[App] 🔍 Polling for tel: parameter... (check #' + pollCount + ')');
        }
        checkForTelParameter();
      }
    }, 1000);
    
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('popstate', handlePopState);
      clearInterval(pollInterval);
    };
  }, [setAutoDialNumber, setCurrentView, addNotification, t]);
  
  // Auto-switch to Dial tab when autoDialNumber is set
  useEffect(() => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (autoDialNumber) {
      if (verboseLogging) {
        console.log('[App] 📞 autoDialNumber detected, ensuring Dial tab is active');
      }
      
      // Ensure we're on the dial tab
      setCurrentView('dial');
    }
  }, [autoDialNumber, setCurrentView]);
  
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
  
  // Get queue monitor setting from store (must be called before any returns to maintain hook order)
  const showQueueMonitorTab = useSettingsStore((state) => state.settings.interface.showQueueMonitorTab);
  
  // Show loading screen while initializing
  if (loading || !initialized) {
    return <LoadingScreen message={loadingMessage} />;
  }
  
  return (
    <PhantomAPIProvider pollInterval={5}>
      <PhantomAPIInitializer>
        <SIPProvider>
          <BusylightProvider>
            {/* Queue Monitor Socket.IO - Only connects when enabled in settings */}
            <QueueMonitorSocketProvider enabled={showQueueMonitorTab}>
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
            </QueueMonitorSocketProvider>
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
