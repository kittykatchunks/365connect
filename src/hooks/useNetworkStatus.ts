/**
 * useNetworkStatus Hook
 * Monitors browser online/offline status and shows toast notifications
 */

import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores';
import { useSIPStore } from '@/stores/sipStore';
import { isVerboseLoggingEnabled } from '@/utils';

export function useNetworkStatus() {
  const { t } = useTranslation();
  const addNotification = useUIStore((state) => state.addNotification);
  const registrationState = useSIPStore((state) => state.registrationState);
  const wasOnlineRef = useRef(navigator.onLine);
  
  useEffect(() => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    // Handle when browser goes online
    const handleOnline = () => {
      if (verboseLogging) {
        console.log('[useNetworkStatus] 📶 Application is back online');
      }
      
      addNotification({
        type: 'success',
        title: t('notifications.network_restored', 'Network/Internet Restored'),
        message: t('notifications.network_restored_message', 'Please ensure you select REGISTER to reconnect to Phantom. If AGENT: Logged Out shows, you just need to login as normal.'),
        persistent: true
      });
      
      wasOnlineRef.current = true;
    };
    
    // Handle when browser goes offline
    const handleOffline = () => {
      if (verboseLogging) {
        console.log('[useNetworkStatus] 📵 Application is offline');
      }
      
      addNotification({
        type: 'error',
        title: t('notifications.network_lost', 'Check Network/Internet Connection'),
        message: t('notifications.network_lost_message', 'You appear to have lost network or internet connection.'),
        persistent: true
      });
      
      wasOnlineRef.current = false;
    };
    
    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Check initial state
    if (!navigator.onLine && wasOnlineRef.current) {
      handleOffline();
    }
    
    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [t, addNotification, registrationState]);
  
  return {
    isOnline: navigator.onLine
  };
}
