// ============================================
// Settings Store - User Preferences (Persisted)
// ============================================

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { AppSettings } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import { saveServerSettingsToLocalStorage } from '@/utils/serverConfig';

interface SettingsState {
  settings: AppSettings;
  
  // Computed getters
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
        
        // Computed getter for SIP config
        get sipConfig() {
          const { connection } = get().settings;
          
          const hasPhantomId = !!(connection.phantomId && connection.phantomId.trim());
          const hasUsername = !!(connection.username && connection.username.trim());
          const hasPassword = !!(connection.password && connection.password.trim());
          
          console.log('[SettingsStore] SIP config check:', { 
            hasPhantomId, 
            hasUsername, 
            hasPassword,
            phantomId: connection.phantomId,
            username: connection.username,
            passwordSet: hasPassword
          });
          
          if (!hasPhantomId || !hasUsername || !hasPassword) {
            console.log('[SettingsStore] SIP config incomplete - connect button will be disabled');
            return null;
          }
          
          console.log('[SettingsStore] SIP config available - connect button should be enabled');
          return {
            phantomId: connection.phantomId,
            username: connection.username,
            password: connection.password
          };
        },
        
        // Connection actions
        setPhantomID: (id) => set((state) => {
          const newState = {
            settings: { ...state.settings, connection: { ...state.settings.connection, phantomId: id } }
          };
          
          // Generate and save server settings to localStorage (PWA compatibility)
          if (id && id.trim()) {
            const username = state.settings.connection.username;
            saveServerSettingsToLocalStorage(id.trim(), username || undefined);
          }
          
          return newState;
        }),
        setSIPCredentials: (username, password) => set((state) => {
          const newState = {
            settings: { ...state.settings, connection: { ...state.settings.connection, username, password } }
          };
          
          // Update display name in localStorage if we have PhantomID
          if (username && state.settings.connection.phantomId) {
            saveServerSettingsToLocalStorage(state.settings.connection.phantomId, username);
          }
          
          return newState;
        }),
        setVMAccess: (code) => set((state) => ({
          settings: { ...state.settings, connection: { ...state.settings.connection, vmAccess: code } }
        })),
        
        // Interface actions
        setLanguage: (language) => set((state) => ({
          settings: { ...state.settings, interface: { ...state.settings.interface, language } }
        })),
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
        })
      }
    ),
    { name: 'settings-store' }
  )
);
