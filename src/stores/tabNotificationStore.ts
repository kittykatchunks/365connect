// ============================================
// Tab Notification Store - Manage navigation tab alert states
// ============================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ViewType } from '@/types';
import { isVerboseLoggingEnabled } from '@/utils';

export type TabAlertState = 'default' | 'warning' | 'error';

interface TabAlertConfig {
  state: TabAlertState;
  timestamp: number;
}

// Priority mapping for tab alerts (higher number = higher priority)
// Dial/ringing calls always take priority over queue monitor
const TAB_ALERT_PRIORITY: Record<ViewType, number> = {
  dial: 100,              // Highest - incoming/active calls
  contacts: 50,
  activity: 50,
  companyNumbers: 50,
  queueMonitor: 10,       // Lower - queue alerts
  settings: 0
};

export interface TopBarAlertInfo {
  state: TabAlertState;
  tabId: ViewType;
  priority: number;
}

interface TabNotificationState {
  alerts: Map<ViewType, TabAlertConfig>;
  setTabAlert: (tabId: ViewType, state: TabAlertState) => void;
  clearTabAlert: (tabId: ViewType) => void;
  clearAllAlerts: () => void;
  getTabState: (tabId: ViewType) => TabAlertState;
  getTopBarAlert: () => TopBarAlertInfo | null;
}

export const useTabNotificationStore = create<TabNotificationState>()(
  persist(
    (set, get) => ({
      alerts: new Map(),

      setTabAlert: (tabId: ViewType, state: TabAlertState) => {
        const verboseLogging = isVerboseLoggingEnabled();
        
        if (verboseLogging) {
          console.log('[TabNotificationStore] 🔔 Setting tab alert:', {
            tabId,
            state,
            timestamp: new Date().toISOString()
          });
        }

        set((prev) => {
          const newAlerts = new Map(prev.alerts);
          
          if (state === 'default') {
            // Remove alert if setting to default
            newAlerts.delete(tabId);
            if (verboseLogging) {
              console.log('[TabNotificationStore] ✅ Cleared alert for tab:', tabId);
            }
          } else {
            newAlerts.set(tabId, {
              state,
              timestamp: Date.now()
            });
            if (verboseLogging) {
              console.log('[TabNotificationStore] ✅ Alert set for tab:', tabId);
            }
          }
          
          return { alerts: newAlerts };
        });
      },

      clearTabAlert: (tabId: ViewType) => {
        const verboseLogging = isVerboseLoggingEnabled();
        
        if (verboseLogging) {
          console.log('[TabNotificationStore] 🔕 Clearing tab alert:', tabId);
        }

        set((prev) => {
          const newAlerts = new Map(prev.alerts);
          newAlerts.delete(tabId);
          
          if (verboseLogging) {
            console.log('[TabNotificationStore] ✅ Alert cleared for tab:', tabId);
          }
          
          return { alerts: newAlerts };
        });
      },

      clearAllAlerts: () => {
        const verboseLogging = isVerboseLoggingEnabled();
        
        if (verboseLogging) {
          console.log('[TabNotificationStore] 🔕 Clearing all tab alerts');
        }

        set({ alerts: new Map() });
        
        if (verboseLogging) {
          console.log('[TabNotificationStore] ✅ All alerts cleared');
        }
      },

      getTabState: (tabId: ViewType): TabAlertState => {
        const alert = get().alerts.get(tabId);
        return alert ? alert.state : 'default';
      },

      getTopBarAlert: (): TopBarAlertInfo | null => {
        const verboseLogging = isVerboseLoggingEnabled();
        const alerts = get().alerts;
        
        if (alerts.size === 0) {
          if (verboseLogging) {
            console.log('[TabNotificationStore] 📊 No active alerts for top bar');
          }
          return null;
        }

        // Find the highest priority alert
        let highestPriority = -1;
        let highestPriorityTab: ViewType | null = null;
        let highestPriorityState: TabAlertState = 'default';

        alerts.forEach((config, tabId) => {
          const priority = TAB_ALERT_PRIORITY[tabId];
          
          // Error state takes priority over warning at same priority level
          const effectivePriority = config.state === 'error' 
            ? priority + 0.5 
            : priority;

          if (effectivePriority > highestPriority) {
            highestPriority = effectivePriority;
            highestPriorityTab = tabId;
            highestPriorityState = config.state;
          }
        });

        if (highestPriorityTab) {
          if (verboseLogging) {
            console.log('[TabNotificationStore] 📊 Top bar alert:', {
              tabId: highestPriorityTab,
              state: highestPriorityState,
              priority: highestPriority
            });
          }

          return {
            state: highestPriorityState,
            tabId: highestPriorityTab,
            priority: highestPriority
          };
        }

        return null;
      }
    }),
    {
      name: 'tab-notification-storage',
      // Custom storage to handle Map serialization
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          
          const { state } = JSON.parse(str);
          // Convert stored alerts array back to Map
          const alerts = new Map(state.alerts || []);
          
          return {
            state: {
              ...state,
              alerts
            }
          };
        },
        setItem: (name, value) => {
          // Convert Map to array for storage
          const alerts = Array.from(value.state.alerts.entries());
          localStorage.setItem(name, JSON.stringify({
            state: {
              ...value.state,
              alerts
            }
          }));
        },
        removeItem: (name) => localStorage.removeItem(name)
      }
    }
  )
);
