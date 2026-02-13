// ============================================
// Settings Store - User Preferences (Persisted)
// ============================================

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { AppSettings } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import { saveServerSettingsToLocalStorage } from '@/utils/serverConfig';
import { isVerboseLoggingEnabled } from '@/utils';

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
  setAutoFocusOnNotificationAnswer: (enabled: boolean) => void;
  setPreferBlindTransfer: (enabled: boolean) => void;
  setConvertPlusTo00: (enabled: boolean) => void;
  
  // Actions - Audio
  setSpeakerDevice: (deviceId: string) => void;
  setMicrophoneDevice: (deviceId: string) => void;
  setRingerDevice: (deviceId: string) => void;
  setRingtoneFile: (file: string) => void;
  setInternalRingtoneFile: (file: string) => void;
  
  // Actions - Advanced
  setSipMessagesEnabled: (enabled: boolean) => void;
  setVerboseLogging: (enabled: boolean) => void;
  setIceGatheringTimeout: (milliseconds: number) => void;
  setKeepAliveInterval: (seconds: number) => void;
  setKeepAliveMaxSequentialFailures: (count: number) => void;
  setNoAnswerTimeout: (seconds: number) => void;
  setConnectivityHealthyIntervalMs: (milliseconds: number) => void;
  setConnectivityDegradedIntervalMs: (milliseconds: number) => void;
  setConnectivityInternetProbeTimeoutMs: (milliseconds: number) => void;
  setConnectivitySipProbeTimeoutMs: (milliseconds: number) => void;
  setConnectivityImageProbeUrls: (urls: string[]) => void;
  setConnectivityNoCorsProbeUrls: (urls: string[]) => void;
  
  // Actions - Busylight
  setBusylightEnabled: (enabled: boolean) => void;
  setBusylightRingSound: (sound: string) => void;
  setBusylightRingVolume: (volume: number) => void;
  setBusylightVoicemailNotify: (enabled: boolean) => void;
  
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
          const verboseLogging = isVerboseLoggingEnabled();
          if (verboseLogging) {
            console.log('[SettingsStore] Setting language:', language);
          }
          
          // Update i18next (dynamic import to avoid circular dependency)
          import('@/i18n').then(({ changeLanguage }) => {
            changeLanguage(language).catch((err) => {
              console.error('[SettingsStore] Failed to change language:', err);
            });
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
        setAutoFocusOnNotificationAnswer: (enabled) => set((state) => ({
          settings: { ...state.settings, call: { ...state.settings.call, autoFocusOnNotificationAnswer: enabled } }
        })),
        setPreferBlindTransfer: (preferBlindTransfer) => set((state) => ({
          settings: { ...state.settings, call: { ...state.settings.call, preferBlindTransfer } }
        })),
        setConvertPlusTo00: (convertPlusTo00) => set((state) => ({
          settings: { ...state.settings, call: { ...state.settings.call, convertPlusTo00 } }
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
        setInternalRingtoneFile: (internalRingtoneFile) => set((state) => ({
          settings: { ...state.settings, audio: { ...state.settings.audio, internalRingtoneFile } }
        })),
        
        // Advanced actions
        setSipMessagesEnabled: (sipMessagesEnabled) => {
          const verboseLogging = isVerboseLoggingEnabled();
          if (verboseLogging) {
            console.log('[SettingsStore] Setting SIP messages enabled:', sipMessagesEnabled);
          }
          
          // Sync to PWA-compatible localStorage key
          try {
            localStorage.setItem('SipMessagesEnabled', sipMessagesEnabled ? 'true' : 'false');
          } catch (e) {
            console.error('[SettingsStore] Failed to sync SipMessagesEnabled to localStorage:', e);
          }
          
          set((state) => ({
            settings: { ...state.settings, advanced: { ...state.settings.advanced, sipMessagesEnabled } }
          }));
        },
        setVerboseLogging: (verboseLogging) => set((state) => ({
          settings: { ...state.settings, advanced: { ...state.settings.advanced, verboseLogging } }
        })),
        setIceGatheringTimeout: (milliseconds) => {
          const verboseLogging = isVerboseLoggingEnabled();
          const normalizedTimeout = Math.max(100, Math.floor(milliseconds || 5000));

          if (verboseLogging) {
            console.log('[SettingsStore] Setting ICE gathering timeout (ms):', {
              input: milliseconds,
              normalized: normalizedTimeout
            });
          }

          set((state) => ({
            settings: {
              ...state.settings,
              advanced: {
                ...state.settings.advanced,
                iceGatheringTimeout: normalizedTimeout
              }
            }
          }));
        },
        setKeepAliveInterval: (seconds) => {
          const verboseLogging = isVerboseLoggingEnabled();
          const normalizedSeconds = Math.max(1, Math.floor(seconds || 1));

          if (verboseLogging) {
            console.log('[SettingsStore] Setting keep-alive interval (seconds):', {
              input: seconds,
              normalized: normalizedSeconds
            });
          }

          set((state) => ({
            settings: {
              ...state.settings,
              advanced: {
                ...state.settings.advanced,
                keepAliveInterval: normalizedSeconds
              }
            }
          }));
        },
        setKeepAliveMaxSequentialFailures: (count) => {
          const verboseLogging = isVerboseLoggingEnabled();
          const normalizedCount = Math.max(1, Math.floor(count || 1));

          if (verboseLogging) {
            console.log('[SettingsStore] Setting keep-alive max sequential failures:', {
              input: count,
              normalized: normalizedCount
            });
          }

          set((state) => ({
            settings: {
              ...state.settings,
              advanced: {
                ...state.settings.advanced,
                keepAliveMaxSequentialFailures: normalizedCount
              }
            }
          }));
        },
        setNoAnswerTimeout: (seconds) => {
          const verboseLogging = isVerboseLoggingEnabled();
          const normalizedSeconds = Math.max(1, Math.floor(seconds || 120));

          if (verboseLogging) {
            console.log('[SettingsStore] Setting no-answer timeout (seconds):', {
              input: seconds,
              normalized: normalizedSeconds
            });
          }

          set((state) => ({
            settings: {
              ...state.settings,
              advanced: {
                ...state.settings.advanced,
                noAnswerTimeout: normalizedSeconds
              }
            }
          }));
        },
        setConnectivityHealthyIntervalMs: (milliseconds) => {
          const verboseLogging = isVerboseLoggingEnabled();
          const normalizedValue = Math.max(1000, Math.floor(milliseconds || 15000));

          if (verboseLogging) {
            console.log('[SettingsStore] Setting connectivity healthy interval (ms):', {
              input: milliseconds,
              normalized: normalizedValue
            });
          }

          set((state) => ({
            settings: {
              ...state.settings,
              advanced: {
                ...state.settings.advanced,
                connectivityHealthyIntervalMs: normalizedValue
              }
            }
          }));
        },
        setConnectivityDegradedIntervalMs: (milliseconds) => {
          const verboseLogging = isVerboseLoggingEnabled();
          const normalizedValue = Math.max(1000, Math.floor(milliseconds || 4000));

          if (verboseLogging) {
            console.log('[SettingsStore] Setting connectivity degraded interval (ms):', {
              input: milliseconds,
              normalized: normalizedValue
            });
          }

          set((state) => ({
            settings: {
              ...state.settings,
              advanced: {
                ...state.settings.advanced,
                connectivityDegradedIntervalMs: normalizedValue
              }
            }
          }));
        },
        setConnectivityInternetProbeTimeoutMs: (milliseconds) => {
          const verboseLogging = isVerboseLoggingEnabled();
          const normalizedValue = Math.max(1000, Math.floor(milliseconds || 4000));

          if (verboseLogging) {
            console.log('[SettingsStore] Setting connectivity internet probe timeout (ms):', {
              input: milliseconds,
              normalized: normalizedValue
            });
          }

          set((state) => ({
            settings: {
              ...state.settings,
              advanced: {
                ...state.settings.advanced,
                connectivityInternetProbeTimeoutMs: normalizedValue
              }
            }
          }));
        },
        setConnectivitySipProbeTimeoutMs: (milliseconds) => {
          const verboseLogging = isVerboseLoggingEnabled();
          const normalizedValue = Math.max(1000, Math.floor(milliseconds || 4500));

          if (verboseLogging) {
            console.log('[SettingsStore] Setting connectivity SIP probe timeout (ms):', {
              input: milliseconds,
              normalized: normalizedValue
            });
          }

          set((state) => ({
            settings: {
              ...state.settings,
              advanced: {
                ...state.settings.advanced,
                connectivitySipProbeTimeoutMs: normalizedValue
              }
            }
          }));
        },
        setConnectivityImageProbeUrls: (urls) => {
          const verboseLogging = isVerboseLoggingEnabled();
          const normalizedUrls = urls
            .map((url) => url.trim())
            .filter((url) => !!url);

          if (verboseLogging) {
            console.log('[SettingsStore] Setting connectivity image probe URLs:', {
              inputCount: urls.length,
              normalizedCount: normalizedUrls.length,
              normalizedUrls
            });
          }

          set((state) => ({
            settings: {
              ...state.settings,
              advanced: {
                ...state.settings.advanced,
                connectivityImageProbeUrls: normalizedUrls
              }
            }
          }));
        },
        setConnectivityNoCorsProbeUrls: (urls) => {
          const verboseLogging = isVerboseLoggingEnabled();
          const normalizedUrls = urls
            .map((url) => url.trim())
            .filter((url) => !!url);

          if (verboseLogging) {
            console.log('[SettingsStore] Setting connectivity no-cors probe URLs:', {
              inputCount: urls.length,
              normalizedCount: normalizedUrls.length,
              normalizedUrls
            });
          }

          set((state) => ({
            settings: {
              ...state.settings,
              advanced: {
                ...state.settings.advanced,
                connectivityNoCorsProbeUrls: normalizedUrls
              }
            }
          }));
        },
        
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
        setBusylightVoicemailNotify: (voicemailNotify) => set((state) => ({
          settings: { ...state.settings, busylight: { ...state.settings.busylight, voicemailNotify } }
        })),
        
        // Bulk actions
        updateSettings: (newSettings) => set((state) => ({
          settings: { ...state.settings, ...newSettings }
        })),
        resetSettings: () => {
          const verboseLogging = isVerboseLoggingEnabled();
          
          if (verboseLogging) {
            console.log('[SettingsStore] 🔄 Resetting all settings to defaults...');
          }
          
          try {
            // Clear ALL localStorage to return to initial state
            // This includes all Zustand stores and direct localStorage keys
            localStorage.clear();
            
            if (verboseLogging) {
              console.log('[SettingsStore] ✅ All localStorage cleared');
            }
            
            // Reset this store to defaults (will be persisted)
            set({ settings: DEFAULT_SETTINGS, sipConfig: null });
            
            if (verboseLogging) {
              console.log('[SettingsStore] ✅ Settings reset to defaults');
            }
            
            // Reload the page to ensure all components re-initialize with clean state
            window.location.reload();
            
          } catch (error) {
            console.error('[SettingsStore] ❌ Failed to reset settings:', error);
            throw error;
          }
        },
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
            
            // Sync SipMessagesEnabled to PWA-compatible localStorage key
            try {
              const sipMessagesEnabled = state.settings.advanced.sipMessagesEnabled;
              localStorage.setItem('SipMessagesEnabled', sipMessagesEnabled ? 'true' : 'false');
            } catch (e) {
              console.error('[SettingsStore] Failed to sync SipMessagesEnabled on rehydration:', e);
            }
            
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
