/**
 * useNetworkStatus Hook
 * Monitors browser online/offline status and shows toast notifications
 * Disconnects SIP service when network is lost and prepares for reconnection when restored
 */

import { useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores';
import { sipService } from '@/services/SIPService';
import { isVerboseLoggingEnabled } from '@/utils';

/**
 * Check if we have actual internet connectivity by attempting a fetch
 * This is more reliable than just checking navigator.onLine
 */
async function checkInternetConnectivity(): Promise<boolean> {
  try {
    // Use our own server's health check endpoint
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    await fetch('/api/health', {
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
  const wasOnlineRef = useRef(navigator.onLine);
  const checkIntervalRef = useRef<number | null>(null);
  
  // Disconnect SIP service when network is lost
  const handleNetworkLoss = useCallback(async () => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    // Only show notification if we were previously online
    if (!wasOnlineRef.current) {
      if (verboseLogging) {
        console.log('[useNetworkStatus] Already offline, skipping loss notification');
      }
      return;
    }
    
    if (verboseLogging) {
      console.log('[useNetworkStatus] 📵 Application is offline');
      console.log('[useNetworkStatus] Network/Internet connection lost');
    }
    
    // Unregister from SIP when offline - matching PWA behavior
    try {
      if (verboseLogging) {
        console.log('[useNetworkStatus] Unregistering from SIP due to network loss');
      }
      await sipService.unregister(true); // skipUnsubscribe = true for faster disconnect
    } catch (error) {
      if (verboseLogging) {
        console.warn('[useNetworkStatus] Failed to unregister on offline:', error);
      }
    }
    
    // Show persistent error notification - matches PWA implementation
    addNotification({
      type: 'error',
      title: t('notifications.network_lost', 'Check Network/Internet Connection'),
      message: t('notifications.network_lost_message', 'You appear to have lost network or internet connection.'),
      persistent: true
    });
    
    wasOnlineRef.current = false;
  }, [t, addNotification]);
  
  // Prepare for reconnection when network is restored
  const handleNetworkRestoration = useCallback(() => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    // Only show notification if we were previously offline
    if (wasOnlineRef.current) {
      if (verboseLogging) {
        console.log('[useNetworkStatus] Already online, skipping restoration notification');
      }
      return;
    }
    
    if (verboseLogging) {
      console.log('[useNetworkStatus] 📶 Application is back online');
      console.log('[useNetworkStatus] Network/Internet connection restored');
    }
    
    // Show persistent notification with reconnection instructions - matches PWA implementation
    addNotification({
      type: 'error', // PWA uses 'error' type for visibility even though it's a restoration message
      title: t('notifications.network_restored', 'Network/Internet Restored'),
      message: t('notifications.network_restored_message', 'Please ensure you select CONNECT to reconnect to Phantom. If Agent: Not Logged In shows, you just need to Login button as normal.'),
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
      const verboseLogging = isVerboseLoggingEnabled();
      
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
        // Only check if we've been offline for at least 5 seconds to avoid duplicate notifications
        // from the online event handler
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
