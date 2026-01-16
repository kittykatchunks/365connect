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

interface TabNotificationState {
  alerts: Map<ViewType, TabAlertConfig>;
  setTabAlert: (tabId: ViewType, state: TabAlertState) => void;
  clearTabAlert: (tabId: ViewType) => void;
  clearAllAlerts: () => void;
  getTabState: (tabId: ViewType) => TabAlertState;
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
