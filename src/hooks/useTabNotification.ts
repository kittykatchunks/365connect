// ============================================
// useTabNotification Hook - Navigation tab visual alerts
// Handles warning/error state flashing for navigation tabs
// ============================================

import { useCallback } from 'react';
import type { ViewType } from '@/types';
import { useTabNotificationStore, type TabAlertState } from '@/stores/tabNotificationStore';
import { isVerboseLoggingEnabled } from '@/utils';

export interface UseTabNotificationReturn {
  /**
   * Set alert state for a specific navigation tab
   * @param tabId - The tab to alert (e.g., 'dial', 'contacts', 'activity')
   * @param state - Alert state: 'default' (clear), 'warning' (slow yellow), or 'error' (fast red)
   */
  setTabAlert: (tabId: ViewType, state: TabAlertState) => void;
  
  /**
   * Clear alert for a specific navigation tab (sets to default state)
   * @param tabId - The tab to clear
   */
  clearTabAlert: (tabId: ViewType) => void;
  
  /**
   * Clear all navigation tab alerts
   */
  clearAllAlerts: () => void;
  
  /**
   * Get current alert state for a specific tab
   * @param tabId - The tab to check
   * @returns Current alert state
   */
  getTabState: (tabId: ViewType) => TabAlertState;
  
  /**
   * Get CSS class name for a tab's current alert state
   * @param tabId - The tab to get class for
   * @returns CSS class name or undefined
   */
  getTabAlertClass: (tabId: ViewType) => string | undefined;
}

/**
 * Hook for managing navigation tab visual alerts
 * 
 * Use this hook to display warning or error states on navigation tabs.
 * Alerts persist across page refreshes and must be explicitly cleared.
 * 
 * @example
 * ```tsx
 * const { setTabAlert, clearTabAlert } = useTabNotification();
 * 
 * // Set warning state (slow yellow flash)
 * setTabAlert('contacts', 'warning');
 * 
 * // Set error state (fast red flash)
 * setTabAlert('activity', 'error');
 * 
 * // Clear alert
 * clearTabAlert('contacts');
 * ```
 */
export function useTabNotification(): UseTabNotificationReturn {
  const verboseLogging = isVerboseLoggingEnabled();
  
  const {
    setTabAlert: storeSetTabAlert,
    clearTabAlert: storeClearTabAlert,
    clearAllAlerts: storeClearAllAlerts,
    getTabState: storeGetTabState
  } = useTabNotificationStore();

  const setTabAlert = useCallback((tabId: ViewType, state: TabAlertState) => {
    if (verboseLogging) {
      console.log('[useTabNotification] 📤 Setting tab alert:', { tabId, state });
    }
    storeSetTabAlert(tabId, state);
  }, [storeSetTabAlert, verboseLogging]);

  const clearTabAlert = useCallback((tabId: ViewType) => {
    if (verboseLogging) {
      console.log('[useTabNotification] 🗑️ Clearing tab alert:', tabId);
    }
    storeClearTabAlert(tabId);
  }, [storeClearTabAlert, verboseLogging]);

  const clearAllAlerts = useCallback(() => {
    if (verboseLogging) {
      console.log('[useTabNotification] 🗑️ Clearing all tab alerts');
    }
    storeClearAllAlerts();
  }, [storeClearAllAlerts, verboseLogging]);

  const getTabState = useCallback((tabId: ViewType): TabAlertState => {
    const state = storeGetTabState(tabId);
    if (verboseLogging) {
      console.log('[useTabNotification] 🔍 Getting tab state:', { tabId, state });
    }
    return state;
  }, [storeGetTabState, verboseLogging]);

  const getTabAlertClass = useCallback((tabId: ViewType): string | undefined => {
    const state = storeGetTabState(tabId);
    
    if (state === 'warning') {
      return 'tab-alert-warning';
    }
    if (state === 'error') {
      // Dial tab flashes fast (incoming calls), queue monitor flashes slow
      if (tabId === 'dial') {
        return 'tab-alert-error-fast';
      } else if (tabId === 'queueMonitor') {
        return 'tab-alert-error-slow';
      }
      // Other tabs use default fast flash
      return 'tab-alert-error-fast';
    }
    
    return undefined;
  }, [storeGetTabState]);

  return {
    setTabAlert,
    clearTabAlert,
    clearAllAlerts,
    getTabState,
    getTabAlertClass
  };
}

export default useTabNotification;
