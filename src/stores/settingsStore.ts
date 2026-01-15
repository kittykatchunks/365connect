// ============================================
// Settings Store - User Preferences (Persisted)
// ============================================

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { AppSettings } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import { saveServerSettingsToLocalStorage } from '@/utils/serverConfig';
import { changeLanguage } from '@/i18n';

interface SettingsState {
  settings: AppSettings;
  
  // Computed SIP config (updated on connection settings change)
  sipConfig: { phantomId: string; username: string; password: string } | null;
  
  // Actions - Connection
  setPhantomID: (id: string) => void;
  setSIPCredentials: (username: string, password: string) => void;
  setVMAccess: (code: string) => void;
  
  // Actions - Interface
  setLanguage: (lang: AppSettings['interface']['language']) => void;
  setTheme: (theme: AppSettings['interface']['theme']) => void;
  setBLFEnabled: (enabled: boolean) => void;
  setShowContactsTab: (show: boolean) => void;
  setShowActivityTab: (show: boolean) => void;
  setShowCompanyNumbersTab: (show: boolean) => void;
  setShowQueueMonitorTab: (show: boolean) => void;
  setOnscreenNotifications: (enabled: boolean) => void;
  
  // Actions - Call
  setAutoAnswer: (enabled: boolean) => void;
  setCallWaiting: (enabled: boolean) => void;
  setIncomingCallNotifications: (enabled: boolean) => void;
  setPreferBlindTransfer: (enabled: boolean) => void;
  
  // Actions - Audio
  setSpeakerDevice: (deviceId: string) => void;
  setMicrophoneDevice: (deviceId: string) => void;
  setRingerDevice: (deviceId: string) => void;
  setRingtoneFile: (file: string) => void;
  
  // Actions - Advanced
  setSipMessagesEnabled: (enabled: boolean) => void;
  setVerboseLogging: (enabled: boolean) => void;
  
  // Actions - Busylight
  setBusylightEnabled: (enabled: boolean) => void;
  setBusylightRingSound: (sound: string) => void;
  setBusylightRingVolume: (volume: number) => void;
  
  // Bulk Actions
  updateSettings: (settings: Partial<AppSettings>) => void;
  resetSettings: () => void;
  exportSettings: () => AppSettings;
}

export const useSettingsStore = create<SettingsState>()(
  devtools(
    persist(
      (set, get) => ({
        settings: DEFAULT_SETTINGS,
        sipConfig: null,
        
        // Connection actions
        setPhantomID: (id) => {
          set((state) => {
            const newConnection = { ...state.settings.connection, phantomId: id };
            const newSettings = { ...state.settings, connection: newConnection };
            
            // Compute sipConfig
            const hasPhantomId = !!(newConnection.phantomId && newConnection.phantomId.trim());
            const hasUsername = !!(newConnection.username && newConnection.username.trim());
            const hasPassword = !!(newConnection.password && newConnection.password.trim());
            
            console.log('[SettingsStore] setPhantomID - checking config:', { 
              hasPhantomId, 
              hasUsername, 
              hasPassword,
              phantomId: newConnection.phantomId,
              username: newConnection.username
            });
            
            const sipConfig = (hasPhantomId && hasUsername && hasPassword) ? {
              phantomId: newConnection.phantomId,
              username: newConnection.username,
              password: newConnection.password
            } : null;
            
            if (sipConfig) {
              console.log('[SettingsStore] ✅ SIP config NOW COMPLETE - connect button should enable');
            } else {
              console.log('[SettingsStore] SIP config still incomplete');
            }
            
            // Generate and save server settings to localStorage (PWA compatibility)
            // Only do this for valid IDs to avoid spam
            if (id && id.trim() && /^\d{3,4}$/.test(id.trim())) {
              const username = newConnection.username;
              saveServerSettingsToLocalStorage(id.trim(), username || undefined);
            }
            
            return { settings: newSettings, sipConfig };
          });
        },
        setSIPCredentials: (username, password) => {
          set((state) => {
            const newConnection = { ...state.settings.connection, username, password };
            const newSettings = { ...state.settings, connection: newConnection };
            
            // Compute sipConfig
            const hasPhantomId = !!(newConnection.phantomId && newConnection.phantomId.trim());
            const hasUsername = !!(newConnection.username && newConnection.username.trim());
            const hasPassword = !!(newConnection.password && newConnection.password.trim());
            
            console.log('[SettingsStore] setSIPCredentials - checking config:', { 
              hasPhantomId, 
              hasUsername, 
              hasPassword,
              phantomId: newConnection.phantomId,
              username: newConnection.username
            });
            
            const sipConfig = (hasPhantomId && hasUsername && hasPassword) ? {
              phantomId: newConnection.phantomId,
              username: newConnection.username,
              password: newConnection.password
            } : null;
            
            if (sipConfig) {
              console.log('[SettingsStore] ✅ SIP config NOW COMPLETE - connect button should enable');
            } else {
              console.log('[SettingsStore] SIP config still incomplete');
            }
            
            // Update display name in localStorage if we have PhantomID
            const phantomId = newConnection.phantomId;
            if (username && phantomId && /^\d{3,4}$/.test(phantomId)) {
              saveServerSettingsToLocalStorage(phantomId, username);
            }
            
            return { settings: newSettings, sipConfig };
          });
        },
        setVMAccess: (code) => set((state) => ({
          settings: { ...state.settings, connection: { ...state.settings.connection, vmAccess: code } }
        })),
        
        // Interface actions
        setLanguage: (language) => {
          const verboseLogging = localStorage.getItem('autocab365_VerboseLogging') === 'true';
          if (verboseLogging) {
            console.log('[SettingsStore] Setting language:', language);
          }
          
          // Update i18next
          changeLanguage(language).catch((err) => {
            console.error('[SettingsStore] Failed to change language:', err);
          });
          
          // Update store (this will persist via Zustand)
          set((state) => ({
            settings: { ...state.settings, interface: { ...state.settings.interface, language } }
          }));
        },
        setTheme: (theme) => set((state) => ({
          settings: { ...state.settings, interface: { ...state.settings.interface, theme } }
        })),
        setBLFEnabled: (blfEnabled) => set((state) => ({
          settings: { ...state.settings, interface: { ...state.settings.interface, blfEnabled } }
        })),
        setShowContactsTab: (show) => set((state) => ({
          settings: { ...state.settings, interface: { ...state.settings.interface, showContactsTab: show } }
        })),
        setShowActivityTab: (show) => set((state) => ({
          settings: { ...state.settings, interface: { ...state.settings.interface, showActivityTab: show } }
        })),
        setShowCompanyNumbersTab: (show) => set((state) => ({
          settings: { ...state.settings, interface: { ...state.settings.interface, showCompanyNumbersTab: show } }
        })),
        setShowQueueMonitorTab: (show) => set((state) => ({
          settings: { ...state.settings, interface: { ...state.settings.interface, showQueueMonitorTab: show } }
        })),
        setOnscreenNotifications: (enabled) => set((state) => ({
          settings: { ...state.settings, interface: { ...state.settings.interface, onscreenNotifications: enabled } }
        })),
        
        // Call actions
        setAutoAnswer: (autoAnswer) => set((state) => ({
          settings: { ...state.settings, call: { ...state.settings.call, autoAnswer } }
        })),
        setCallWaiting: (callWaiting) => set((state) => ({
          settings: { ...state.settings, call: { ...state.settings.call, callWaiting } }
        })),
        setIncomingCallNotifications: (enabled) => set((state) => ({
          settings: { ...state.settings, call: { ...state.settings.call, incomingCallNotifications: enabled } }
        })),
        setPreferBlindTransfer: (preferBlindTransfer) => set((state) => ({
          settings: { ...state.settings, call: { ...state.settings.call, preferBlindTransfer } }
        })),
        
        // Audio actions
        setSpeakerDevice: (speakerDevice) => set((state) => ({
          settings: { ...state.settings, audio: { ...state.settings.audio, speakerDevice } }
        })),
        setMicrophoneDevice: (microphoneDevice) => set((state) => ({
          settings: { ...state.settings, audio: { ...state.settings.audio, microphoneDevice } }
        })),
        setRingerDevice: (ringerDevice) => set((state) => ({
          settings: { ...state.settings, audio: { ...state.settings.audio, ringerDevice } }
        })),
        setRingtoneFile: (ringtoneFile) => set((state) => ({
          settings: { ...state.settings, audio: { ...state.settings.audio, ringtoneFile } }
        })),
        
        // Advanced actions
        setSipMessagesEnabled: (sipMessagesEnabled) => set((state) => ({
          settings: { ...state.settings, advanced: { ...state.settings.advanced, sipMessagesEnabled } }
        })),
        setVerboseLogging: (verboseLogging) => set((state) => ({
          settings: { ...state.settings, advanced: { ...state.settings.advanced, verboseLogging } }
        })),
        
        // Busylight actions
        setBusylightEnabled: (enabled) => set((state) => ({
          settings: { ...state.settings, busylight: { ...state.settings.busylight, enabled } }
        })),
        setBusylightRingSound: (ringSound) => set((state) => ({
          settings: { ...state.settings, busylight: { ...state.settings.busylight, ringSound } }
        })),
        setBusylightRingVolume: (ringVolume) => set((state) => ({
          settings: { ...state.settings, busylight: { ...state.settings.busylight, ringVolume } }
        })),
        
        // Bulk actions
        updateSettings: (newSettings) => set((state) => ({
          settings: { ...state.settings, ...newSettings }
        })),
        resetSettings: () => set({ settings: DEFAULT_SETTINGS }),
        exportSettings: () => get().settings
      }),
      {
        name: 'settings-store',
        partialize: (state) => ({
          settings: state.settings
        }),
        onRehydrateStorage: () => (state) => {
          // After rehydration, compute sipConfig from loaded settings
          if (state) {
            const { connection } = state.settings;
            const hasPhantomId = !!(connection.phantomId && connection.phantomId.trim());
            const hasUsername = !!(connection.username && connection.username.trim());
            const hasPassword = !!(connection.password && connection.password.trim());
            
            state.sipConfig = (hasPhantomId && hasUsername && hasPassword) ? {
              phantomId: connection.phantomId,
              username: connection.username,
              password: connection.password
            } : null;
            
            console.log('[SettingsStore] Rehydrated from localStorage:', {
              hasConfig: !!state.sipConfig,
              phantomId: connection.phantomId,
              username: connection.username,
              language: state.settings.interface.language
            });
            
            // Sync language with i18next on rehydration
            const language = state.settings.interface.language;
            if (language) {
              import('@/i18n').then(({ changeLanguage }) => {
                changeLanguage(language).catch((err) => {
                  console.error('[SettingsStore] Failed to sync language on rehydration:', err);
                });
              });
            }
          }
        }
      }
    ),
    { name: 'settings-store' }
  )
);
