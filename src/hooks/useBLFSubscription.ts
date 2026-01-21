// ============================================
// useBLFSubscription Hook
// ============================================
// Manages BLF subscription lifecycle based on:
// 1. Immediate subscription when BLF button is saved
// 2. Resubscription when switching to dial tab
// 3. 3-minute interval resubscription while on dial tab
// 4. Exclusion of extensions starting with 7 from polling
// ============================================

import { useEffect, useRef } from 'react';
import { useSIP } from './useSIP';
import { useSettingsStore } from '@/stores';
import { isVerboseLoggingEnabled } from '@/utils';

interface UseBLFSubscriptionOptions {
  extensions: string[];
  isDialTabActive: boolean;
  isRegistered: boolean;
  blfEnabled: boolean;
}

const BLF_SUBSCRIPTION_INTERVAL = 3 * 60 * 1000; // 3 minutes in milliseconds
const SUBSCRIPTION_STAGGER_DELAY = 100; // 100ms delay between individual subscriptions

/**
 * Check if an extension should be excluded from periodic polling
 * Extensions starting with 7 (701-799 range) are excluded from polling
 */
function shouldExcludeFromPolling(extension: string): boolean {
  if (!extension) return true;
  
  // Check if extension starts with 7
  const firstChar = extension.charAt(0);
  return firstChar === '7';
}

/**
 * Filter extensions that should be included in periodic polling
 */
function getExtensionsForPolling(extensions: string[]): string[] {
  return extensions.filter(ext => !shouldExcludeFromPolling(ext));
}

/**
 * Hook to manage BLF subscriptions based on dial tab visibility and registration state
 */
export function useBLFSubscription({
  extensions,
  isDialTabActive,
  isRegistered,
  blfEnabled
}: UseBLFSubscriptionOptions) {
  const { subscribeBLF } = useSIP();
  const intervalIdRef = useRef<number | null>(null);
  const hasInitialSubscriptionRef = useRef<boolean>(false);
  const verboseLogging = isVerboseLoggingEnabled();

  // Function to subscribe to all configured BLF extensions
  const subscribeToAll = (extensionsList: string[], isPolling: boolean = false) => {
    if (verboseLogging) {
      console.log('[useBLFSubscription] 📞 Subscribing to all BLF extensions:', {
        totalExtensions: extensionsList.length,
        extensions: extensionsList,
        isPolling,
        isDialTabActive,
        isRegistered,
        blfEnabled
      });
    }

    extensionsList.forEach((extension, index) => {
      // Stagger subscriptions to avoid overwhelming the server
      setTimeout(() => {
        if (verboseLogging) {
          console.log(`[useBLFSubscription] 📞 Subscribing to BLF extension: ${extension}`);
        }
        subscribeBLF(extension);
      }, index * SUBSCRIPTION_STAGGER_DELAY);
    });
  };

  // Function to start the 3-minute polling interval
  const startPollingInterval = () => {
    // Clear any existing interval
    if (intervalIdRef.current) {
      window.clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }

    // Get extensions that should be polled (exclude those starting with 7)
    const pollableExtensions = getExtensionsForPolling(extensions);

    if (pollableExtensions.length === 0) {
      if (verboseLogging) {
        console.log('[useBLFSubscription] ⏰ No extensions to poll (all excluded or none configured)');
      }
      return;
    }

    if (verboseLogging) {
      console.log('[useBLFSubscription] ⏰ Starting BLF polling interval:', {
        intervalMs: BLF_SUBSCRIPTION_INTERVAL,
        intervalSeconds: BLF_SUBSCRIPTION_INTERVAL / 1000,
        pollableExtensionsCount: pollableExtensions.length,
        pollableExtensions,
        excludedExtensions: extensions.filter(ext => shouldExcludeFromPolling(ext))
      });
    }

    intervalIdRef.current = window.setInterval(() => {
      if (verboseLogging) {
        console.log('[useBLFSubscription] ⏰ Polling BLF subscriptions (3-minute interval)');
      }
      subscribeToAll(pollableExtensions, true);
    }, BLF_SUBSCRIPTION_INTERVAL);
  };

  // Function to stop the polling interval
  const stopPollingInterval = () => {
    if (intervalIdRef.current) {
      if (verboseLogging) {
        console.log('[useBLFSubscription] ⏰ Stopping BLF polling interval');
      }
      window.clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
  };

  // Effect: Handle subscription lifecycle based on conditions
  useEffect(() => {
    // Early return if conditions not met
    if (!isRegistered || !blfEnabled || extensions.length === 0) {
      stopPollingInterval();
      hasInitialSubscriptionRef.current = false;
      
      if (verboseLogging && extensions.length > 0) {
        console.log('[useBLFSubscription] 📴 Conditions not met for BLF subscriptions:', {
          isRegistered,
          blfEnabled,
          extensionsCount: extensions.length
        });
      }
      
      return;
    }

    // If dial tab is active
    if (isDialTabActive) {
      if (verboseLogging) {
        console.log('[useBLFSubscription] 📱 Dial tab is active - managing BLF subscriptions');
      }

      // Subscribe to all extensions when switching to dial tab
      subscribeToAll(extensions, false);
      hasInitialSubscriptionRef.current = true;

      // Start the 3-minute polling interval (only for non-7xx extensions)
      startPollingInterval();

    } else {
      // Dial tab is not active - stop polling
      if (verboseLogging) {
        console.log('[useBLFSubscription] 📴 Dial tab is not active - stopping BLF polling');
      }
      stopPollingInterval();
    }

    // Cleanup on unmount or dependency change
    return () => {
      stopPollingInterval();
    };
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDialTabActive, isRegistered, blfEnabled, extensions.length]);

  // Effect: Re-subscribe when extensions list changes (e.g., new extension added)
  useEffect(() => {
    if (!isRegistered || !blfEnabled || !isDialTabActive) {
      return;
    }

    // When extensions list changes and we're on dial tab, resubscribe
    if (extensions.length > 0 && hasInitialSubscriptionRef.current) {
      if (verboseLogging) {
        console.log('[useBLFSubscription] 🔄 Extensions list changed - resubscribing');
      }
      subscribeToAll(extensions, false);
      
      // Restart the polling interval with the updated extensions list
      startPollingInterval();
    }
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extensions]);
}

/**
 * Hook to trigger immediate subscription for a single extension
 * Used when saving a new BLF button configuration
 */
export function useImmediateBLFSubscription() {
  const { subscribeBLF, isRegistered } = useSIP();
  const blfEnabled = useSettingsStore((state) => state.settings.interface.blfEnabled);
  const verboseLogging = isVerboseLoggingEnabled();

  const subscribeImmediately = (extension: string) => {
    if (!extension) {
      if (verboseLogging) {
        console.warn('[useImmediateBLFSubscription] ⚠️ No extension provided');
      }
      return;
    }

    if (!isRegistered) {
      if (verboseLogging) {
        console.warn('[useImmediateBLFSubscription] ⚠️ Cannot subscribe - not registered');
      }
      return;
    }

    if (!blfEnabled) {
      if (verboseLogging) {
        console.warn('[useImmediateBLFSubscription] ⚠️ BLF not enabled in settings');
      }
      return;
    }

    if (verboseLogging) {
      console.log(`[useImmediateBLFSubscription] 📞 Immediately subscribing to BLF extension: ${extension}`);
    }

    subscribeBLF(extension);
  };

  return { subscribeImmediately };
}
