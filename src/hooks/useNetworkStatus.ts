/**
 * useNetworkStatus Hook
 * Monitors browser online/offline status and shows toast notifications
 * Disconnects SIP service when network is lost and prepares for reconnection when restored
 */

import { useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores';
import { useSIPStore } from '@/stores/sipStore';
import { sipService } from '@/services/SIPService';
import { isVerboseLoggingEnabled } from '@/utils';

/**
 * Check if we have actual internet connectivity by attempting a fetch
 * This is more reliable than just checking navigator.onLine
 */
async function checkInternetConnectivity(): Promise<boolean> {
  try {
    // Use a small, fast endpoint - try to fetch a small resource
    // Using a CORS-friendly endpoint or our own server
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    await fetch('https://www.google.com/favicon.ico', {
      mode: 'no-cors',
      cache: 'no-cache',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return true;
  } catch {
    return false;
  }
}

export function useNetworkStatus() {
  const { t } = useTranslation();
  const addNotification = useUIStore((state) => state.addNotification);
  const registrationState = useSIPStore((state) => state.registrationState);
  const transportState = useSIPStore((state) => state.transportState);
  const wasOnlineRef = useRef(navigator.onLine);
  const checkIntervalRef = useRef<number | null>(null);
  
  // Disconnect SIP service when network is lost
  const handleNetworkLoss = useCallback(async () => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log('[useNetworkStatus] 📵 Network/Internet connection lost');
    }
    
    // Disconnect SIP service to clean up connections
    if (transportState === 'connected' || registrationState === 'registered') {
      try {
        if (verboseLogging) {
          console.log('[useNetworkStatus] Disconnecting SIP service due to network loss');
        }
        await sipService.stop();
      } catch (error) {
        console.error('[useNetworkStatus] Failed to disconnect SIP service:', error);
      }
    }
    
    // Show persistent error notification
    addNotification({
      type: 'error',
      title: t('notifications.network_lost', 'Check Network/Internet Connection'),
      message: t('notifications.network_lost_message', 'You appear to have lost network or internet connection.'),
      persistent: true
    });
    
    wasOnlineRef.current = false;
  }, [t, addNotification, registrationState, transportState]);
  
  // Prepare for reconnection when network is restored
  const handleNetworkRestoration = useCallback(() => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log('[useNetworkStatus] 📶 Network/Internet connection restored');
    }
    
    // Show success notification with reconnection instructions
    addNotification({
      type: 'success',
      title: t('notifications.network_restored', 'Network/Internet Restored'),
      message: t('notifications.network_restored_message', 'Please ensure you select REGISTER to reconnect to Phantom. If AGENT: Logged Out shows, you just need to login as normal.'),
      persistent: true
    });
    
    wasOnlineRef.current = true;
  }, [t, addNotification]);
  
  useEffect(() => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    // Handle when browser goes online
    const handleOnline = async () => {
      if (verboseLogging) {
        console.log('[useNetworkStatus] Browser online event detected, verifying internet connectivity...');
      }
      
      // Verify we actually have internet connectivity
      const hasInternet = await checkInternetConnectivity();
      
      if (hasInternet) {
        handleNetworkRestoration();
      } else {
        if (verboseLogging) {
          console.log('[useNetworkStatus] Browser reports online but internet connectivity check failed');
        }
      }
    };
    
    // Handle when browser goes offline
    const handleOffline = () => {
      if (verboseLogging) {
        console.log('[useNetworkStatus] Browser offline event detected');
      }
      handleNetworkLoss();
    };
    
    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Periodic connectivity check (every 30 seconds) when online
    // This catches cases where navigator.onLine is true but we have no actual internet
    checkIntervalRef.current = setInterval(async () => {
      if (navigator.onLine && wasOnlineRef.current) {
        const hasInternet = await checkInternetConnectivity();
        
        if (!hasInternet && wasOnlineRef.current) {
          if (verboseLogging) {
            console.log('[useNetworkStatus] Periodic check: Internet connectivity lost despite navigator.onLine being true');
          }
          handleNetworkLoss();
        }
      } else if (navigator.onLine && !wasOnlineRef.current) {
        // We thought we were offline but browser says we're online, verify
        const hasInternet = await checkInternetConnectivity();
        
        if (hasInternet) {
          if (verboseLogging) {
            console.log('[useNetworkStatus] Periodic check: Internet connectivity restored');
          }
          handleNetworkRestoration();
        }
      }
    }, 30000); // Check every 30 seconds
    
    // Check initial state
    if (!navigator.onLine && wasOnlineRef.current) {
      handleOffline();
    }
    
    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [handleNetworkLoss, handleNetworkRestoration]);
  
  return {
    isOnline: navigator.onLine
  };
}
