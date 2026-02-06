// ============================================
// useBLFSubscription Hook
// ============================================
// Manages BLF subscription lifecycle based on:
// 1. Immediate subscription when BLF button is saved
// 2. Batch subscription when BLF modal is opened
// 3. Health monitoring handles subscription freshness (no polling needed)
// ============================================

import { useEffect, useRef } from 'react';
import { useSIP } from './useSIP';
import { useSettingsStore } from '@/stores';
import { isVerboseLoggingEnabled } from '@/utils';

interface UseBLFSubscriptionOptions {
  extensions: string[];
  isModalOpen: boolean;
  isRegistered: boolean;
  blfEnabled: boolean;
}

/**
 * Hook to manage BLF subscriptions based on modal visibility and registration state
 * Improvements:
 * - Uses batch subscription for better performance
 * - Subscribes when BLF modal opens (not on dial tab access)
 * - Health monitoring handles subscription freshness (no polling needed)
 * - Keeps subscriptions alive when modal closes
 */
export function useBLFSubscription({
  extensions,
  isModalOpen,
  isRegistered,
  blfEnabled
}: UseBLFSubscriptionOptions) {
  const { batchSubscribeBLF } = useSIP();
  const hasSubscribedRef = useRef<boolean>(false);
  const verboseLogging = isVerboseLoggingEnabled();

  // Function to batch subscribe to all configured BLF extensions
  const subscribeToAll = async (extensionsList: string[]) => {
    if (extensionsList.length === 0) return;
    
    if (verboseLogging) {
      console.log('[useBLFSubscription] 📞 Batch subscribing to BLF extensions:', {
        totalExtensions: extensionsList.length,
        extensions: extensionsList,
        isModalOpen,
        isRegistered,
        blfEnabled
      });
    }

    // Use batch subscription with default batch size of 5
    await batchSubscribeBLF(extensionsList, 5);
  };

  // Effect: Subscribe when modal opens
  useEffect(() => {
    // Early return if not enabled or no extensions
    if (!blfEnabled || extensions.length === 0) {
      hasSubscribedRef.current = false;
      
      if (verboseLogging && extensions.length > 0) {
        console.log('[useBLFSubscription] 📴 BLF disabled or no extensions configured');
      }
      
      return;
    }

    // Need to be registered to subscribe
    if (!isRegistered) {
      hasSubscribedRef.current = false;
      
      if (verboseLogging) {
        console.log('[useBLFSubscription] 📴 Not registered - subscriptions will start when registered');
      }
      
      return;
    }

    // If modal is open, subscribe to all extensions
    if (isModalOpen) {
      if (verboseLogging) {
        console.log('[useBLFSubscription] 📱 BLF modal opened - subscribing to all extensions');
      }

      // Subscribe every time the modal opens to ensure fresh state
      subscribeToAll(extensions);
      hasSubscribedRef.current = true;
    } else {
      // Modal closed - KEEP subscriptions alive
      // Health monitoring will handle subscription freshness
      if (verboseLogging && hasSubscribedRef.current) {
        console.log('[useBLFSubscription] 💤 BLF modal closed - keeping subscriptions alive (health monitoring active)');
      }
    }
    
    // No cleanup needed - subscriptions persist and health monitoring handles staleness
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen, isRegistered, blfEnabled, extensions.length]);

  // Effect: Re-subscribe when extensions list changes while modal is open
  useEffect(() => {
    if (!isRegistered || !blfEnabled || !isModalOpen) {
      return;
    }

    // When extensions list changes and modal is open, resubscribe
    if (extensions.length > 0 && hasSubscribedRef.current) {
      if (verboseLogging) {
        console.log('[useBLFSubscription] 🔄 Extensions list changed - resubscribing');
      }
      subscribeToAll(extensions);
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

    // Allow button configuration offline, but only subscribe if registered
    if (!isRegistered) {
      if (verboseLogging) {
        console.log('[useImmediateBLFSubscription] ℹ️ Not registered - button configured but not subscribing yet');
      }
      return; // Button is saved, but won't subscribe until registered
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
