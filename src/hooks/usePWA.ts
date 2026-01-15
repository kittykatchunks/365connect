// ============================================
// usePWA Hook - PWA install and update management
// ============================================

import { useState, useCallback, useEffect } from 'react';
// @ts-expect-error - Virtual module from vite-plugin-pwa
import { useRegisterSW } from 'virtual:pwa-register/react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePWA() {
  // Service Worker registration
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker
  } = useRegisterSW({
    onRegisteredSW(swUrl: string, registration: ServiceWorkerRegistration | undefined) {
      console.log('[PWA] Service worker registered:', swUrl);
      
      // Check for updates periodically
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000); // Check every hour
      }
    },
    onRegisterError(error: Error) {
      console.error('[PWA] Service worker registration error:', error);
    }
  });
  
  // Install prompt state
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(() => {
    // Check if running as standalone (installed)
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  });
  const [isInstallable, setIsInstallable] = useState(false);
  
  // Listen for install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
      console.log('[PWA] Install prompt captured');
    };
    
    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setIsInstalled(true);
      setIsInstallable(false);
      console.log('[PWA] App installed');
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);
  
  // Trigger install prompt
  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!installPrompt) {
      console.warn('[PWA] No install prompt available');
      return false;
    }
    
    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      
      console.log('[PWA] Install prompt outcome:', outcome);
      
      if (outcome === 'accepted') {
        setInstallPrompt(null);
        setIsInstallable(false);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[PWA] Install prompt error:', error);
      return false;
    }
  }, [installPrompt]);
  
  // Apply update
  const applyUpdate = useCallback(async () => {
    await updateServiceWorker(true);
    setNeedRefresh(false);
  }, [updateServiceWorker, setNeedRefresh]);
  
  // Dismiss update
  const dismissUpdate = useCallback(() => {
    setNeedRefresh(false);
  }, [setNeedRefresh]);
  
  // Dismiss offline ready notification
  const dismissOfflineReady = useCallback(() => {
    setOfflineReady(false);
  }, [setOfflineReady]);
  
  return {
    // Update state
    needRefresh,
    offlineReady,
    applyUpdate,
    dismissUpdate,
    dismissOfflineReady,
    
    // Install state
    isInstalled,
    isInstallable,
    promptInstall
  };
}

export default usePWA;
