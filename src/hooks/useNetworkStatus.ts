/**
 * useNetworkStatus Hook
 * Network state observer only (no SIP side effects)
 */

import { useEffect, useState } from 'react';
import { isVerboseLoggingEnabled } from '@/utils';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const verboseLogging = isVerboseLoggingEnabled();

    const handleOnline = () => {
      setIsOnline(true);

      if (verboseLogging) {
        console.log('[useNetworkStatus] 🌐 Browser online event detected');
      }
    };

    const handleOffline = () => {
      setIsOnline(false);

      if (verboseLogging) {
        console.log('[useNetworkStatus] 📵 Browser offline event detected');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (verboseLogging) {
      console.log('[useNetworkStatus] 👀 Network observer enabled (no SIP reconnect logic)');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      if (verboseLogging) {
        console.log('[useNetworkStatus] 🧹 Network observer disabled');
      }
    };
  }, []);

  return { isOnline };
}
