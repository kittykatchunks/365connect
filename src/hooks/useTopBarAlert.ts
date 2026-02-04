// ============================================
// useTopBarAlert Hook - Top bar alert management
// Handles visual alerts on the main panel header and navigation on click
// ============================================

import { useCallback, useMemo } from 'react';
import { useTabNotificationStore, type TopBarAlertInfo } from '@/stores';
import { useAppStore } from '@/stores';
import { isVerboseLoggingEnabled } from '@/utils';

export interface UseTopBarAlertReturn {
  /**
   * Current top bar alert information (highest priority)
   * null if no alerts active
   */
  alertInfo: TopBarAlertInfo | null;
  
  /**
   * CSS class name for top bar alert animation
   * undefined if no alert active
   */
  alertClass: string | undefined;
  
  /**
   * Whether top bar has an active alert
   */
  hasAlert: boolean;
  
  /**
   * Click handler - navigates to the alerting tab
   */
  handleClick: () => void;
}

/**
 * Hook for managing top bar alert display and interaction
 * 
 * Monitors all tab alerts and displays the highest priority alert on the top bar.
 * Priority order: dial (incoming calls) > other tabs > queue monitor
 * 
 * When top bar is clicked during an alert, navigates to the alerting tab.
 * 
 * @example
 * ```tsx
 * const { alertClass, hasAlert, handleClick } = useTopBarAlert();
 * 
 * return (
 *   <div 
 *     className={cn('main-panel-header', alertClass)}
 *     onClick={hasAlert ? handleClick : undefined}
 *     style={{ cursor: hasAlert ? 'pointer' : 'default' }}
 *   >
 *     {children}
 *   </div>
 * );
 * ```
 */
export function useTopBarAlert(): UseTopBarAlertReturn {
  const verboseLogging = isVerboseLoggingEnabled();
  const getTopBarAlert = useTabNotificationStore((state) => state.getTopBarAlert);
  const setCurrentView = useAppStore((state) => state.setCurrentView);
  
  // Get the highest priority alert
  const alertInfo = useMemo(() => {
    const alert = getTopBarAlert();
    
    if (verboseLogging && alert) {
      console.log('[useTopBarAlert] 🔔 Active top bar alert:', alert);
    }
    
    return alert;
  }, [getTopBarAlert, verboseLogging]);
  
  // Determine CSS class based on alert state
  const alertClass = useMemo(() => {
    if (!alertInfo) return undefined;
    
    if (alertInfo.state === 'warning') {
      return 'top-bar-alert-warning';
    }
    
    if (alertInfo.state === 'error') {
      return 'top-bar-alert-error';
    }
    
    return undefined;
  }, [alertInfo]);
  
  // Handle click - navigate to alerting tab
  const handleClick = useCallback(() => {
    if (!alertInfo) {
      if (verboseLogging) {
        console.log('[useTopBarAlert] ⚠️ Click ignored - no active alert');
      }
      return;
    }
    
    if (verboseLogging) {
      console.log('[useTopBarAlert] 🖱️ Top bar clicked, navigating to:', alertInfo.tabId);
    }
    
    setCurrentView(alertInfo.tabId);
  }, [alertInfo, setCurrentView, verboseLogging]);
  
  const hasAlert = alertInfo !== null;
  
  return {
    alertInfo,
    alertClass,
    hasAlert,
    handleClick
  };
}

export default useTopBarAlert;
