// ============================================
// App Component - Main Application Shell
// ============================================

import { useEffect, useState, useCallback, Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore, useUIStore, useSettingsStore, initializeThemeWatcher } from '@/stores';
import { SIPProvider, PhantomAPIProvider, BusylightProvider, QueueMonitorSocketProvider, usePhantomAPI } from '@/contexts';
import { phantomApiService, audioService } from '@/services';
import { initializeVersionTracking, setPhantomAPIKey, setPhantomAPIRefreshCallback, isVerboseLoggingEnabled, cn } from '@/utils';
import { useTopBarAlert } from '@/hooks';
import { 
  LoadingScreen, 
  LoadingSpinner,
  ToastContainer,
  MainContainer,
  MainPanel,
  MainPanelHeader,
  MainPanelContent,
  OverlayMenu,
  AgentStatusInfo,
  SIPStatusIcon,
  WelcomeOverlay,
  UpdatePrompt,
  ViewErrorBoundary
} from '@/components';
import { VersionUpdateModal } from '@/components/modals';
import { DialView } from '@/components/dial';
import { VoicemailIndicator } from '@/components/dial/VoicemailIndicator';
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
const AdvancedOptionsView = lazy(() =>
  import('@/components/advanced/AdvancedOptionsView').then(m => ({ default: m.AdvancedOptionsView }))
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
    case 'advanced':
      return (
        <ViewErrorBoundary
          viewName="Advanced Options"
          onRecover={() => handleViewRecover('Advanced Options')}
          onError={(error) => handleViewError('Advanced Options', error)}
        >
          <Suspense fallback={<ViewLoadingFallback />}>
            <AdvancedOptionsView />
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
  const [overlayMenuOpen, setOverlayMenuOpen] = useState(false);
  
  // Top bar alert management
  const { alertClass, hasAlert, handleClick: handleTopBarClick } = useTopBarAlert();
  
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
  
  // Handle logo click to toggle overlay menu
  const handleLogoClick = useCallback(() => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log('[MainLayout] 📱 Logo clicked, toggling overlay menu');
    }
    
    setOverlayMenuOpen((prev) => !prev);
  }, []);
  
  return (
    <MainContainer>
      {/* Overlay Menu */}
      <OverlayMenu 
        isOpen={overlayMenuOpen}
        onClose={() => setOverlayMenuOpen(false)}
      />
      
      {/* Main Panel - Navigation and Content */}
      <MainPanel>
        <MainPanelHeader 
          className={cn(alertClass, hasAlert && 'top-bar-alerting')}
          onClick={hasAlert ? handleTopBarClick : undefined}
          style={{ cursor: hasAlert ? 'pointer' : 'default' }}
        >
          <div className="header-left">
            <button 
              className="app-brand app-brand-clickable" 
              onClick={handleLogoClick}
              aria-label="Toggle menu"
            >
              <img src="/icons/pwa-192x192.png" alt="" className="brand-logo" />
            </button>
            <AgentStatusInfo />
          </div>
          <div className="header-right">
            <VoicemailIndicator />
            <SIPStatusIcon />
          </div>
        </MainPanelHeader>
        
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
  const setCurrentView = useAppStore((state) => state.setCurrentView);
  const setInitialized = useAppStore((state) => state.setInitialized);
  const setLoading = useAppStore((state) => state.setLoading);
  const effectiveTheme = useUIStore((state) => state.effectiveTheme);
  const settingsLanguage = useSettingsStore((state) => state.settings.interface.language);
  
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

  // Support direct URL access to advanced options page
  useEffect(() => {
    const verboseLogging = isVerboseLoggingEnabled();
    const normalizedPath = window.location.pathname.replace(/\/+$/, '') || '/';

    if (verboseLogging) {
      console.log('[App] 🧭 Evaluating pathname for initial view routing:', {
        pathname: window.location.pathname,
        normalizedPath
      });
    }

    if (normalizedPath === '/advanced') {
      if (verboseLogging) {
        console.log('[App] 🧭 Loading Advanced Options view from URL path');
      }
      setCurrentView('advanced');
    }
  }, [setCurrentView]);
  
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
        
        // Sync audio settings with AudioService
        const audioSettings = useSettingsStore.getState().settings.audio;
        if (verboseLogging) {
          console.log('[App] 🎵 Syncing audio settings with AudioService:', {
            ringtoneFile: audioSettings.ringtoneFile,
            internalRingtoneFile: audioSettings.internalRingtoneFile,
            ringerDevice: audioSettings.ringerDevice,
            hasCustom1: audioService.hasCustomRingtone('custom1'),
            hasCustom2: audioService.hasCustomRingtone('custom2'),
            hasCustom3: audioService.hasCustomRingtone('custom3')
          });
        }
        
        // Set external ringtone - validate custom ringtone exists before setting
        if (audioSettings.ringtoneFile && audioSettings.ringtoneFile.startsWith('custom')) {
          const slot = audioSettings.ringtoneFile as 'custom1' | 'custom2' | 'custom3';
          if (audioService.hasCustomRingtone(slot)) {
            audioService.setExternalRingtone(slot);
          } else {
            // Custom ringtone selected but data missing - reset to default
            if (verboseLogging) {
              console.log('[App] ⚠️ External custom ringtone selected but no data exists, using default');
            }
            audioService.setExternalRingtone('Ringtone_1.mp3');
            // Also update the store to avoid mismatch
            useSettingsStore.getState().setRingtoneFile('Ringtone_1.mp3');
          }
        } else if (audioSettings.ringtoneFile) {
          audioService.setExternalRingtone(audioSettings.ringtoneFile);
        }
        
        // Set internal ringtone - validate custom ringtone exists before setting
        // Handle undefined for users with old settings (before internalRingtoneFile was added)
        if (audioSettings.internalRingtoneFile && audioSettings.internalRingtoneFile.startsWith('custom')) {
          const slot = audioSettings.internalRingtoneFile as 'custom1' | 'custom2' | 'custom3';
          if (audioService.hasCustomRingtone(slot)) {
            audioService.setInternalRingtone(slot);
          } else {
            // Custom ringtone selected but data missing - reset to default
            if (verboseLogging) {
              console.log('[App] ⚠️ Internal custom ringtone selected but no data exists, using default');
            }
            audioService.setInternalRingtone('Internal_1.mp3');
            // Also update the store to avoid mismatch
            useSettingsStore.getState().setInternalRingtoneFile('Internal_1.mp3');
          }
        } else if (audioSettings.internalRingtoneFile) {
          audioService.setInternalRingtone(audioSettings.internalRingtoneFile);
        } else {
          // Default for users with old settings (no internalRingtoneFile field)
          audioService.setInternalRingtone('Internal_1.mp3');
          useSettingsStore.getState().setInternalRingtoneFile('Internal_1.mp3');
        }
        
        // Set ringer device
        if (audioSettings.ringerDevice) {
          audioService.setRingerDevice(audioSettings.ringerDevice);
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
