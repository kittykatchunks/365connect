/**
 * SIPContext - React Context for SIP service
 * Provides SIP functionality to React components and syncs with Zustand store
 */

import { createContext, useContext, useEffect, useRef, useMemo, type ReactNode } from 'react';
import { SIPService, sipService } from '../services/SIPService';
import {
  connectivityMonitorService,
  type ConnectivitySnapshot,
  type ConnectivityStateChangedEvent
} from '../services/ConnectivityMonitorService';
import { audioService } from '../services/AudioService';
import { callProgressToneService } from '../services/CallProgressToneService';
import { useSIPStore } from '../stores/sipStore';
import { useBLFStore } from '../stores/blfStore';
import { useCallHistoryStore } from '../stores/callHistoryStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useContactsStore } from '../stores/contactsStore';
import { useAppStore } from '../stores/appStore';
import { useTabNotification } from '../hooks';
import { useNotifications } from '../hooks/useNotifications';
import { isVerboseLoggingEnabled } from '../utils';
import type { 
  SessionData, 
  RegistrationState, 
  TransportState,
  BLFStateChangeData,
  NotifyData
} from '../types/sip';
import type { CallStatus } from '../types/callHistory';
import { buildSIPConfig } from '../types/sip';

// ==================== Context ====================

interface SIPContextValue {
  // Connection
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  
  // Registration
  register: () => Promise<void>;
  unregister: () => Promise<void>;
  
  // Calls
  makeCall: (target: string) => Promise<SessionData>;
  answerCall: (sessionId?: string) => Promise<SessionData>;
  hangupCall: (sessionId?: string) => Promise<void>;
  
  // Call control
  holdCall: (sessionId?: string) => Promise<void>;
  unholdCall: (sessionId?: string) => Promise<void>;
  toggleHold: (sessionId?: string) => Promise<void>;
  muteCall: (sessionId?: string) => Promise<void>;
  unmuteCall: (sessionId?: string) => Promise<void>;
  toggleMute: (sessionId?: string) => Promise<void>;
  
  // DTMF
  sendDTMF: (sessionId: string, tone: string) => Promise<void>;
  sendDTMFSequence: (sessionId: string, sequence: string) => Promise<void>;
  
  // Transfer
  blindTransfer: (sessionId: string, target: string) => Promise<void>;
  attendedTransfer: (sessionId: string, target: string) => Promise<unknown>;
  completeAttendedTransfer: (sessionId: string, transferSessionId: string) => Promise<void>;
  cancelAttendedTransfer: (sessionId: string) => Promise<void>;
  
  // BLF
  subscribeBLF: (extension: string, buddy?: string) => void;
  batchSubscribeBLF: (extensions: string[], batchSize?: number) => Promise<void>;
  unsubscribeBLF: (extension: string) => void;
  
  // Line management
  selectLine: (lineNumber: 1 | 2 | 3) => void;
}

const SIPContext = createContext<SIPContextValue | null>(null);

// ==================== Provider ====================

interface SIPProviderProps {
  children: ReactNode;
}

export function SIPProvider({ children }: SIPProviderProps) {
  const serviceRef = useRef<SIPService>(sipService);
  const connectivityMonitorRef = useRef(connectivityMonitorService);
  
  // Get store actions
  const {
    setRegistrationState,
    setTransportState,
    addSession,
    updateSession,
    removeSession,
    setSelectedLine,
    updateBLFState,
    clearAllBLFStates,
    updateVoicemailMWI,
    clearVoicemailMWI
  } = useSIPStore();
  
  const { sipConfig, settings } = useSettingsStore();
  const { setTabAlert, clearTabAlert } = useTabNotification();
  const { addCallFromSession } = useCallHistoryStore();
  const { showIncomingCallNotification, requestPermission } = useNotifications();
  const { contacts } = useContactsStore();
  const { resetAllButtonStates } = useBLFStore();
  const { agentLogout } = useAppStore();
  
  // Store active notification reference for cleanup
  const activeNotificationRef = useRef<Notification | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectInFlightRef = useRef(false);
  const autoReconnectEnabledRef = useRef(false);
  
  // Sync contacts with SIP service for caller ID lookup
  useEffect(() => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log('[SIPContext] 📇 Syncing contacts with SIP service:', {
        contactCount: contacts.length
      });
    }
    
    serviceRef.current.setContacts(contacts);
  }, [contacts]);

  // Keep SIP advanced runtime config in sync
  useEffect(() => {
    const verboseLogging = isVerboseLoggingEnabled();

    if (verboseLogging) {
      console.log('[SIPContext] ⚙️ Syncing SIP advanced config to service', {
        iceGatheringTimeout: settings.advanced.iceGatheringTimeout,
        keepAliveInterval: settings.advanced.keepAliveInterval,
        keepAliveMaxSequentialFailures: settings.advanced.keepAliveMaxSequentialFailures,
        noAnswerTimeout: settings.advanced.noAnswerTimeout
      });
    }

    serviceRef.current.configure({
      iceGatheringTimeout: settings.advanced.iceGatheringTimeout,
      keepAliveInterval: settings.advanced.keepAliveInterval,
      keepAliveMaxSequentialFailures: settings.advanced.keepAliveMaxSequentialFailures,
      noAnswerTimeout: settings.advanced.noAnswerTimeout
    });
  }, [
    settings.advanced.iceGatheringTimeout,
    settings.advanced.keepAliveInterval,
    settings.advanced.keepAliveMaxSequentialFailures,
    settings.advanced.noAnswerTimeout
  ]);

  // Browser-only network/internet/SIP connectivity monitoring and SIP auto-recovery
  useEffect(() => {
    const verboseLogging = isVerboseLoggingEnabled();

    const clearReconnectTimer = (reason: string): void => {
      if (reconnectTimerRef.current !== null) {
        if (verboseLogging) {
          console.log('[SIPContext] 🧹 Clearing scheduled SIP reconnect timer', { reason });
        }

        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const computeReconnectDelayMs = (attempt: number): number => {
      const baseMs = Math.min(30000, Math.max(1000, 1000 * Math.pow(2, Math.max(0, attempt - 1))));
      const jitterFactor = 0.8 + Math.random() * 0.4;
      const delayMs = Math.floor(baseMs * jitterFactor);

      if (verboseLogging) {
        console.log('[SIPContext] ⏱️ Computed reconnect delay with jitter', {
          attempt,
          baseMs,
          jitterFactor,
          delayMs
        });
      }

      return delayMs;
    };

    const buildReconnectConfig = () => {
      if (!sipConfig?.phantomId || !sipConfig?.username || !sipConfig?.password) {
        return null;
      }

      const nextConfig = buildSIPConfig({
        phantomId: sipConfig.phantomId,
        username: sipConfig.username,
        password: sipConfig.password
      });

      nextConfig.iceGatheringTimeout = settings.advanced.iceGatheringTimeout;
      nextConfig.keepAliveInterval = settings.advanced.keepAliveInterval;
      nextConfig.keepAliveMaxSequentialFailures = settings.advanced.keepAliveMaxSequentialFailures;
      nextConfig.noAnswerTimeout = settings.advanced.noAnswerTimeout;

      return nextConfig;
    };

    const canAttemptReconnect = (snapshot: ConnectivitySnapshot): boolean => {
      const transportState = serviceRef.current.getTransportState();
      const registrationState = serviceRef.current.getRegistrationState();

      const canAttempt =
        autoReconnectEnabledRef.current &&
        snapshot.browserOnline &&
        snapshot.internetStatus === 'up' &&
        snapshot.sipReachable === true &&
        !reconnectInFlightRef.current &&
        (transportState !== 'connected' || registrationState !== 'registered');

      if (verboseLogging) {
        console.log('[SIPContext] 🔍 canAttemptReconnect evaluation', {
          autoReconnectEnabled: autoReconnectEnabledRef.current,
          browserOnline: snapshot.browserOnline,
          internetStatus: snapshot.internetStatus,
          sipReachable: snapshot.sipReachable,
          reconnectInFlight: reconnectInFlightRef.current,
          transportState,
          registrationState,
          canAttempt
        });
      }

      return canAttempt;
    };

    const executeReconnect = async (trigger: string, snapshot: ConnectivitySnapshot): Promise<void> => {
      const reconnectConfig = buildReconnectConfig();

      if (!reconnectConfig) {
        if (verboseLogging) {
          console.log('[SIPContext] ℹ️ Reconnect skipped - missing SIP credentials/config', {
            trigger,
            hasSipConfig: !!sipConfig
          });
        }
        return;
      }

      reconnectInFlightRef.current = true;

      try {
        if (verboseLogging) {
          console.log('[SIPContext] 🔄 Starting controlled SIP recovery', {
            trigger,
            attempt: reconnectAttemptRef.current,
            snapshot
          });
        }

        if (serviceRef.current.hasUserAgent()) {
          if (verboseLogging) {
            console.log('[SIPContext] 🔌 Existing UserAgent found - performing full stop before recreate');
          }
          await serviceRef.current.stop();
        }

        await serviceRef.current.createUserAgent(reconnectConfig);
        await serviceRef.current.register();

        reconnectAttemptRef.current = 0;

        if (verboseLogging) {
          console.log('[SIPContext] ✅ Controlled SIP recovery succeeded', {
            trigger,
            transportState: serviceRef.current.getTransportState(),
            registrationState: serviceRef.current.getRegistrationState()
          });
        }
      } catch (error) {
        reconnectAttemptRef.current += 1;

        if (verboseLogging) {
          console.error('[SIPContext] ❌ Controlled SIP recovery failed', {
            trigger,
            attempt: reconnectAttemptRef.current,
            error: error instanceof Error ? error.message : String(error)
          });
        }

        const retryDelayMs = computeReconnectDelayMs(reconnectAttemptRef.current);

        clearReconnectTimer('retry-reschedule');
        reconnectTimerRef.current = window.setTimeout(() => {
          reconnectTimerRef.current = null;
          void scheduleReconnect('retry-timer-fired', snapshot);
        }, retryDelayMs);
      } finally {
        reconnectInFlightRef.current = false;
      }
    };

    const scheduleReconnect = async (trigger: string, snapshot: ConnectivitySnapshot): Promise<void> => {
      if (!canAttemptReconnect(snapshot)) {
        return;
      }

      clearReconnectTimer('new-reconnect-trigger');

      const attemptNumber = reconnectAttemptRef.current + 1;
      const delayMs = reconnectAttemptRef.current === 0 ? 250 : computeReconnectDelayMs(attemptNumber);

      if (verboseLogging) {
        console.log('[SIPContext] 🗓️ Scheduling controlled SIP recovery attempt', {
          trigger,
          delayMs,
          attemptNumber
        });
      }

      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;
        void executeReconnect(trigger, snapshot);
      }, delayMs);
    };

    const monitor = connectivityMonitorRef.current;

    const monitorConfig = buildReconnectConfig();
    if (!monitorConfig?.server) {
      if (verboseLogging) {
        console.log('[SIPContext] ℹ️ Connectivity monitor not started - SIP config/server unavailable');
      }

      return () => {
        clearReconnectTimer('effect-cleanup-no-config');
      };
    }

    if (verboseLogging) {
      console.log('[SIPContext] 🌐 Starting connectivity monitor with SIP server URL', {
        sipWebSocketUrl: monitorConfig.server
      });
    }

    monitor.start({
      sipWebSocketUrl: monitorConfig.server,
      healthyIntervalMs: settings.advanced.connectivityHealthyIntervalMs,
      degradedIntervalMs: settings.advanced.connectivityDegradedIntervalMs,
      internetProbeTimeoutMs: settings.advanced.connectivityInternetProbeTimeoutMs,
      sipProbeTimeoutMs: settings.advanced.connectivitySipProbeTimeoutMs,
      imageProbeUrls: settings.advanced.connectivityImageProbeUrls,
      noCorsProbeUrls: settings.advanced.connectivityNoCorsProbeUrls
    });

    const unsubscribeStateChanged = monitor.on('stateChanged', (eventData) => {
      const data = eventData as ConnectivityStateChangedEvent;

      if (verboseLogging) {
        console.log('[SIPContext] 🌐 Connectivity stateChanged event', {
          reason: data.reason,
          previous: data.previous,
          current: data.current
        });
      }

      if (data.current.internetStatus === 'down') {
        clearReconnectTimer('internet-down');
      }

      void scheduleReconnect(`connectivity-state:${data.reason}`, data.current);
    });

    const unsubscribePathChanged = monitor.on('networkPathChanged', (eventData) => {
      if (verboseLogging) {
        console.log('[SIPContext] 🔀 Connectivity network path changed', eventData);
      }

      reconnectAttemptRef.current = 0;
      void scheduleReconnect('network-path-changed', monitor.getSnapshot());
    });

    const unsubscribeInternetDown = monitor.on('internetDown', (eventData) => {
      if (verboseLogging) {
        console.warn('[SIPContext] 📵 Connectivity internetDown event received', eventData);
      }

      clearReconnectTimer('internet-down-event');
    });

    return () => {
      unsubscribeStateChanged();
      unsubscribePathChanged();
      unsubscribeInternetDown();
      monitor.stop();
      clearReconnectTimer('connectivity-monitor-cleanup');
    };
  }, [
    sipConfig,
    settings.advanced.iceGatheringTimeout,
    settings.advanced.keepAliveInterval,
    settings.advanced.keepAliveMaxSequentialFailures,
    settings.advanced.noAnswerTimeout,
    settings.advanced.connectivityHealthyIntervalMs,
    settings.advanced.connectivityDegradedIntervalMs,
    settings.advanced.connectivityInternetProbeTimeoutMs,
    settings.advanced.connectivitySipProbeTimeoutMs,
    settings.advanced.connectivityImageProbeUrls,
    settings.advanced.connectivityNoCorsProbeUrls
  ]);
  
  // Request notification permissions on mount if enabled
  useEffect(() => {
    const requestNotificationPerms = async () => {
      if (settings.call.incomingCallNotifications) {
        const verboseLogging = isVerboseLoggingEnabled();
        
        if (verboseLogging) {
          console.log('[SIPContext] 📱 Checking notification permissions...');
        }
        
        // Only request if not already decided
        if ('Notification' in window && Notification.permission === 'default') {
          if (verboseLogging) {
            console.log('[SIPContext] 📱 Requesting notification permission...');
          }
          
          const permission = await requestPermission();
          
          if (verboseLogging) {
            console.log('[SIPContext] 📱 Notification permission:', permission);
          }
        }
      }
    };
    
    requestNotificationPerms();
  }, [settings.call.incomingCallNotifications, requestPermission]);

  // Wire up SIP events to Zustand store
  useEffect(() => {
    const service = serviceRef.current;
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log('[SIPContext] 🔧 Setting up SIP event listeners');
    }
    
    // Transport events
    const unsubTransportState = service.on('transportStateChanged', (state: TransportState) => {
      if (verboseLogging) {
        console.log('[SIPContext] 📡 transportStateChanged event received:', state);
      }
      setTransportState(state);
    });
    
    // Registration events
    const unsubRegState = service.on('registrationStateChanged', (state: RegistrationState) => {
      if (verboseLogging) {
        console.log('[SIPContext] 📝 registrationStateChanged event received:', state);
      }
      setRegistrationState(state);
      
      // Clear voicemail indicator on unregistration
      if (state === 'unregistered') {
        if (verboseLogging) {
          console.log('[SIPContext] 📧 Clearing voicemail MWI on unregistration');
        }
        clearVoicemailMWI();
      }
    });
    
    // Listen for unregistered event to clear BLF states
    const unsubUnregistered = service.on('unregistered', () => {
      if (verboseLogging) {
        console.log('[SIPContext] 🔕 Unregistered event received - clearing all BLF button states and resetting agent state');
      }
      clearAllBLFStates();
      resetAllButtonStates();
      agentLogout();
    });
    
    // Listen for transport disconnection to clear BLF states
    const unsubTransportDisconnected = service.on('transportDisconnected', (error: Error | null) => {
      if (verboseLogging) {
        console.log('[SIPContext] 🔌 Transport disconnected event received - clearing all BLF button states and resetting agent state', error?.message);
      }
      clearAllBLFStates();
      resetAllButtonStates();
      agentLogout();
    });
    
    // Session events
    const unsubSessionCreated = service.on('sessionCreated', (session: SessionData) => {
      if (verboseLogging) {
        console.log('[SIPContext] ✅ sessionCreated event received:', {
          sessionId: session.id,
          lineNumber: session.lineNumber,
          direction: session.direction,
          state: session.state,
          target: session.target
        });
      }
      
      // Add session to store
      addSession(session);
      
      // Start ringtone for incoming calls
      if (session.direction === 'incoming' && session.state === 'ringing') {
        if (verboseLogging) {
          console.log('[SIPContext] 🔔 Starting ringtone for incoming call');
        }
        
        // Check if there are other active/established sessions to determine alert tone
        // Use alert tone (call waiting) if ANY other session exists that's not this one
        const activeSessions = service.getActiveSessions();
        const useAlertTone = activeSessions.length > 0; // Any active call means use alert tone
        
        // Determine call type from session data (default to internal if not specified)
        const callType = session.callType || 'internal';
        
        if (verboseLogging) {
          console.log('[SIPContext] 🎵 Ringtone selection:', {
            activeSessions: activeSessions.length,
            useAlertTone,
            callType,
            note: useAlertTone ? 'Call waiting (Alert.mp3)' : `${callType} ringtone`
          });
        }
        
        audioService.startRinging(useAlertTone, callType).catch(error => {
          console.error('[SIPContext] ❌ Failed to start ringtone:', error);
        });
        
        // Start flashing dial tab for incoming call
        if (verboseLogging) {
          console.log('[SIPContext] 🔔 Starting dial tab flash for incoming call');
        }
        setTabAlert('dial', 'error');
        
        // Show Windows notification ONLY if enabled AND no other active calls
        // When user is on an active call, don't show notification - they're using the app
        const shouldShowNotification = settings.call.incomingCallNotifications && !useAlertTone;
        
        if (verboseLogging) {
          console.log('[SIPContext] 📱 Notification decision:', {
            incomingCallNotificationsEnabled: settings.call.incomingCallNotifications,
            hasActiveCall: useAlertTone,
            shouldShowNotification,
            reason: useAlertTone ? 'User on active call - notification suppressed' : 'Showing notification'
          });
        }
        
        if (shouldShowNotification) {
          if (verboseLogging) {
            console.log('[SIPContext] 📱 Incoming call notifications enabled - showing notification');
          }
          
          // Extract caller information
          const callerNumber = session.remoteNumber || 'Unknown';
          const callerName = session.displayName || session.remoteIdentity || '';
          
          if (verboseLogging) {
            console.log('[SIPContext] 📞 Showing notification for incoming call:', {
              callerNumber,
              callerName,
              sessionId: session.id
            });
          }
          
          // Close any existing notification
          if (activeNotificationRef.current) {
            activeNotificationRef.current.close();
            activeNotificationRef.current = null;
          }
          
          // Show notification with answer handler
          const notification = showIncomingCallNotification(
            callerName,
            callerNumber,
            // onAnswer callback
            () => {
              if (verboseLogging) {
                console.log('[SIPContext] 📞 Notification clicked - answering call');
              }
              
              // Stop tab flashing
              clearTabAlert('dial');
              
              // Focus window and switch to dial tab if auto-focus is enabled
              if (settings.call.autoFocusOnNotificationAnswer) {
                if (verboseLogging) {
                  console.log('[SIPContext] 📱 Auto-focus enabled - bringing window to front and switching to dial tab');
                }
                window.focus();
                
                // Dispatch navigation event to switch to dial tab
                window.dispatchEvent(new CustomEvent('navigateToView', { detail: { view: 'dial' } }));
              } else if (verboseLogging) {
                console.log('[SIPContext] 📱 Auto-focus disabled - window will NOT be focused');
              }
              
              // Answer the call
              service.answerCall(session.id).catch(error => {
                console.error('[SIPContext] ❌ Failed to answer call from notification:', error);
              });
            },
            // onDismiss callback
            () => {
              if (verboseLogging) {
                console.log('[SIPContext] 🔕 Notification closed');
              }
              activeNotificationRef.current = null;
            }
          );
          
          // Store notification reference
          if (notification) {
            if (verboseLogging) {
              console.log('[SIPContext] ✅ Notification object created and stored');
            }
            activeNotificationRef.current = notification;
          } else {
            if (verboseLogging) {
              console.warn('[SIPContext] ⚠️ Notification was NOT created (returned null)');
              console.log('[SIPContext] 📊 Debug info:', {
                notificationApiSupported: 'Notification' in window,
                currentPermission: typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'N/A',
                settingsEnabled: settings.call.incomingCallNotifications
              });
            }
          }
        } else if (verboseLogging) {
          console.log('[SIPContext] 📱 Incoming call notifications disabled in settings');
        }
      }
      
      if (verboseLogging) {
        console.log('[SIPContext] ✅ Session added to store');
      }
    });
    
    const unsubSessionAnswered = service.on('sessionAnswered', (session: SessionData) => {
      if (verboseLogging) {
        console.log('[SIPContext] 📞 sessionAnswered event received:', session.id);
      }
      
      // Dispatch window event for components that need to listen
      window.dispatchEvent(new CustomEvent('sessionAnswered', { detail: session }));
      
      // Stop ringtone when call is answered (incoming calls)
      if (audioService.getIsRinging()) {
        if (verboseLogging) {
          console.log('[SIPContext] 🔕 Stopping ringtone - call answered');
        }
        audioService.stopRinging();
      }
      
      // Stop call progress tones when call is answered (outbound calls)
      if (callProgressToneService.getIsPlaying()) {
        if (verboseLogging) {
          console.log('[SIPContext] 🔇 Stopping call progress tone - call answered');
        }
        callProgressToneService.stopTone();
      }
      
      // Clear dial tab flash when call is answered
      if (verboseLogging) {
        console.log('[SIPContext] 🔕 Clearing dial tab flash - call answered');
      }
      clearTabAlert('dial');
      
      // Close incoming call notification if active
      if (activeNotificationRef.current) {
        if (verboseLogging) {
          console.log('[SIPContext] 🔕 Closing incoming call notification - call answered');
        }
        activeNotificationRef.current.close();
        activeNotificationRef.current = null;
      }
      
      updateSession(session.id, { state: 'established', answerTime: new Date() });
    });
    
    const unsubSessionTerminated = service.on('sessionTerminated', (session: SessionData) => {
      if (verboseLogging) {
        console.log('[SIPContext] 📴 sessionTerminated event received:', session.id);
      }
      
      // Stop ringtone if it's still playing (incoming calls)
      if (audioService.getIsRinging()) {
        if (verboseLogging) {
          console.log('[SIPContext] 🔕 Stopping ringtone - call terminated');
        }
        audioService.stopRinging();
      }
      
      // Handle call progress tones for outbound calls
      if (session.direction === 'outgoing') {
        // Stop ringback if playing
        if (callProgressToneService.getIsPlaying()) {
          if (verboseLogging) {
            console.log('[SIPContext] 🔇 Stopping ringback tone - call terminated');
          }
          callProgressToneService.stopTone();
        }
        
        // Play busy or error tone if call was not answered
        // Only play if call wasn't established (no answerTime means never connected)
        if (!session.answerTime && !session.locallyAnswered) {
          // Determine tone type based on termination state
          // Note: We could enhance this with actual SIP response codes from the session
          // For now, if the call terminated without being answered, assume busy/unavailable
          if (verboseLogging) {
            console.log('[SIPContext] 📞 Outbound call failed - playing busy tone');
          }
          callProgressToneService.playBusy(3000).catch(error => {
            console.error('[SIPContext] ❌ Failed to play busy tone:', error);
          });
        }
      }
      
      // Clear dial tab flash when call is terminated
      if (verboseLogging) {
        console.log('[SIPContext] 🔕 Clearing dial tab flash - call terminated');
      }
      clearTabAlert('dial');
      
      // Close incoming call notification if active
      if (activeNotificationRef.current) {
        if (verboseLogging) {
          console.log('[SIPContext] 🔕 Closing incoming call notification - call terminated');
        }
        activeNotificationRef.current.close();
        activeNotificationRef.current = null;
      }
      
      // ==================== ADD CALL TO HISTORY ====================
      // Extract call information
      let number: string;
      let name: string | null = null;
      
      if (session.direction === 'incoming') {
        // For incoming calls, use remoteNumber and displayName/remoteIdentity
        number = session.remoteNumber || 'Unknown';
        // Use displayName if available, otherwise use remoteIdentity (which might be a name or number)
        name = session.displayName || session.remoteIdentity || null;
        // If name is the same as number, set it to null
        if (name === number) {
          name = null;
        }
      } else {
        // For outgoing calls, use target
        number = session.target || 'Unknown';
        
        // Clean up the number if it has sip: prefix
        if (typeof number === 'string' && number.startsWith('sip:')) {
          number = number.replace('sip:', '').split('@')[0];
        }
      }
      
      // Determine call status based on locallyAnswered flag
      let status: CallStatus;
      if (session.locallyAnswered && session.duration > 0) {
        // Call was locally answered - this is a completed call
        status = 'completed';
      } else if (session.direction === 'incoming') {
        // Incoming call not locally answered = missed (duration shows ring time)
        status = 'missed';
      } else {
        // Outgoing call with no answer = cancelled
        status = 'cancelled';
      }
      
      const duration = session.duration || 0;
      
      if (verboseLogging) {
        console.log('[SIPContext] 📞 Adding call to history:', {
          number,
          name,
          direction: session.direction,
          duration,
          status,
          locallyAnswered: session.locallyAnswered || false
        });
      }
      
      // Add to call history store
      addCallFromSession(
        number,
        name,
        session.direction,
        duration,
        status
      );
      // ==================== END CALL HISTORY ====================
      
      
      removeSession(session.id);
    });
    
    const unsubSessionStateChanged = service.on('sessionStateChanged', ({ sessionId, state }) => {
      if (verboseLogging) {
        console.log('[SIPContext] 🔄 sessionStateChanged event received:', { sessionId, state });
      }
      updateSession(sessionId, { state: state as SessionData['state'] });
      
      // Handle call progress tones for outbound calls
      const session = service.getSession(sessionId);
      if (session && session.direction === 'outgoing') {
        if (state === 'connecting') {
          // Start ringback tone when outbound call is connecting (ringing at remote end)
          if (verboseLogging) {
            console.log('[SIPContext] 🎵 Starting ringback tone for outbound call:', sessionId);
          }
          callProgressToneService.playRingback().catch(error => {
            console.error('[SIPContext] ❌ Failed to start ringback tone:', error);
          });
        } else if (state === 'established') {
          // Stop ringback tone when call is answered
          if (verboseLogging) {
            console.log('[SIPContext] 🔇 Stopping ringback tone - call answered:', sessionId);
          }
          callProgressToneService.stopTone();
        }
      }
    });
    
    const unsubSessionMuted = service.on('sessionMuted', ({ sessionId, muted }) => {
      updateSession(sessionId, { muted });
    });
    
    const unsubSessionModified = service.on('sessionModified', ({ sessionId, action }) => {
      if (action === 'hold') {
        updateSession(sessionId, { onHold: true, state: 'hold' });
      } else if (action === 'unhold') {
        updateSession(sessionId, { onHold: false, state: 'established' });
      }
    });
    
    // Line events
    const unsubLineSelected = service.on('lineSelected', ({ lineNumber }) => {
      setSelectedLine(lineNumber);
    });
    
    // BLF events
    const unsubBLFState = service.on('blfStateChanged', (data: BLFStateChangeData) => {
      updateBLFState(data.extension, data.state);
    });
    
    // Transfer events
    const unsubTransferInitiated = service.on('transferInitiated', (data: { sessionId: string; target: string; type: string }) => {
      if (verboseLogging) {
        console.log('[SIPContext] 📞 transferInitiated event received:', data);
      }
    });

    const unsubTransferCompleted = service.on('transferCompleted', (data: { sessionId: string; target: string; type: string; success: boolean; reason?: string }) => {
      if (verboseLogging) {
        console.log('[SIPContext] ✅ transferCompleted event received:', data);
      }
      // Emit a custom event that the TransferModal can listen to
      window.dispatchEvent(new CustomEvent('transferCompleted', { detail: data }));
    });

    const unsubAttendedTransferInitiated = service.on('attendedTransferInitiated', (data: unknown) => {
      if (verboseLogging) {
        console.log('[SIPContext] 📞 attendedTransferInitiated event received:', data);
      }
    });

    const unsubAttendedTransferProgress = service.on('attendedTransferProgress', (data: { originalSessionId: string; transferSessionId: string; status: string }) => {
      if (verboseLogging) {
        console.log('[SIPContext] 📞 attendedTransferProgress event received:', data);
      }
    });

    const unsubAttendedTransferAnswered = service.on('attendedTransferAnswered', (data: { originalSessionId: string; transferSessionId: string; status: string }) => {
      if (verboseLogging) {
        console.log('[SIPContext] 📞 attendedTransferAnswered event received:', data);
      }
      // Emit a custom event that the TransferModal can listen to
      window.dispatchEvent(new CustomEvent('attendedTransferAnswered', { detail: data }));
    });

    const unsubAttendedTransferRejected = service.on('attendedTransferRejected', (data: { originalSessionId: string; transferSessionId: string; status: string; reason: string }) => {
      if (verboseLogging) {
        console.log('[SIPContext] ❌ attendedTransferRejected event received:', data);
      }
      // Emit a custom event that the TransferModal can listen to
      window.dispatchEvent(new CustomEvent('attendedTransferRejected', { detail: data }));
    });

    const unsubAttendedTransferTerminated = service.on('attendedTransferTerminated', (data: { originalSessionId: string; transferSessionId: string; status: string; reason: string }) => {
      if (verboseLogging) {
        console.log('[SIPContext] 📴 attendedTransferTerminated event received:', data);
      }
      // Emit a custom event that the TransferModal can listen to
      window.dispatchEvent(new CustomEvent('attendedTransferTerminated', { detail: data }));
    });

    const unsubAttendedTransferCompleted = service.on('attendedTransferCompleted', (data: { originalSessionId: string; transferSessionId: string; success: boolean; reason?: string }) => {
      if (verboseLogging) {
        console.log('[SIPContext] ✅ attendedTransferCompleted event received:', data);
      }
      // Emit a custom event that the TransferModal can listen to
      window.dispatchEvent(new CustomEvent('attendedTransferCompleted', { detail: data }));
    });

    const unsubAttendedTransferCancelled = service.on('attendedTransferCancelled', (data: { originalSessionId: string }) => {
      if (verboseLogging) {
        console.log('[SIPContext] 🚫 attendedTransferCancelled event received:', data);
      }
    });
    
    // Voicemail NOTIFY events
    const unsubNotifyReceived = service.on('notifyReceived', (data: NotifyData) => {
      if (verboseLogging) {
        console.log('[SIPContext] 📧 notifyReceived event received:', data);
      }
      
      // Check if this is a message-summary event (voicemail MWI)
      if (data.event && data.event.toLowerCase().includes('message-summary') && data.voicemailData) {
        const { voicemailData } = data;
        const newMessages = voicemailData.newVoiceMessages || 0;
        const hasMessages = newMessages > 0;
        
        if (verboseLogging) {
          console.log('[SIPContext] 📧 Voicemail MWI update:', {
            newMessages,
            messagesWaiting: voicemailData.messagesWaiting,
            hasMessages
          });
        }
        
        updateVoicemailMWI(newMessages, hasMessages);
      }
    });
    
    // Cleanup
    return () => {
      unsubTransportState();
      unsubRegState();
      unsubUnregistered();
      unsubTransportDisconnected();
      unsubSessionCreated();
      unsubSessionAnswered();
      unsubSessionTerminated();
      unsubSessionStateChanged();
      unsubSessionMuted();
      unsubSessionModified();
      unsubLineSelected();
      unsubBLFState();
      unsubTransferInitiated();
      unsubTransferCompleted();
      unsubAttendedTransferInitiated();
      unsubAttendedTransferProgress();
      unsubAttendedTransferAnswered();
      unsubAttendedTransferRejected();
      unsubAttendedTransferTerminated();
      unsubAttendedTransferCompleted();
      unsubAttendedTransferCancelled();
      unsubNotifyReceived();
    };
  }, [
    setRegistrationState,
    setTransportState,
    addSession,
    updateSession,
    removeSession,
    setSelectedLine,
    updateVoicemailMWI,
    clearVoicemailMWI,
    clearAllBLFStates,
    updateBLFState,
    addCallFromSession,
    clearTabAlert,
    setTabAlert,
    showIncomingCallNotification,
    settings.call.autoFocusOnNotificationAnswer,
    settings.call.incomingCallNotifications
  ]);

  // Context value with wrapped methods
  // Use useMemo to create value object to avoid accessing ref during render
  const value: SIPContextValue = useMemo(() => ({
    // Connection
    connect: async () => {
      const verboseLogging = isVerboseLoggingEnabled();

      if (!sipConfig) {
        throw new Error('SIP configuration not available');
      }

      if (verboseLogging) {
        console.log('[SIPContext] 🔌 Manual connect initiated');
      }

      const config = buildSIPConfig({
        phantomId: sipConfig.phantomId,
        username: sipConfig.username,
        password: sipConfig.password
      });
      config.iceGatheringTimeout = settings.advanced.iceGatheringTimeout;
      config.keepAliveInterval = settings.advanced.keepAliveInterval;
      config.keepAliveMaxSequentialFailures = settings.advanced.keepAliveMaxSequentialFailures;
      config.noAnswerTimeout = settings.advanced.noAnswerTimeout;

      if (verboseLogging) {
        console.log('[SIPContext] ⚙️ Applying advanced keep-alive configuration on connect', {
          iceGatheringTimeout: config.iceGatheringTimeout,
          keepAliveInterval: config.keepAliveInterval,
          keepAliveMaxSequentialFailures: config.keepAliveMaxSequentialFailures,
          noAnswerTimeout: config.noAnswerTimeout
        });
      }

      await serviceRef.current.createUserAgent(config);
      await serviceRef.current.register();

      autoReconnectEnabledRef.current = true;
      reconnectAttemptRef.current = 0;

      if (verboseLogging) {
        console.log('[SIPContext] ✅ Manual connect completed');
      }
    },
    
    disconnect: async () => {
      const verboseLogging = isVerboseLoggingEnabled();
      
      if (verboseLogging) {
        console.log('[SIPContext] 🔌 Manual disconnect initiated');
      }

      autoReconnectEnabledRef.current = false;
      reconnectAttemptRef.current = 0;

      if (reconnectTimerRef.current !== null) {
        if (verboseLogging) {
          console.log('[SIPContext] 🧹 Clearing pending reconnect timer due to manual disconnect');
        }
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      
      await serviceRef.current.stop();
      
      if (verboseLogging) {
        console.log('[SIPContext] ✅ Manual disconnect complete');
      }
    },
    
    // Registration
    register: async () => {
      await serviceRef.current.register();
    },
    
    unregister: async () => {
      await serviceRef.current.unregister();
    },
    
    // Calls
    makeCall: async (target: string) => {
      const verboseLogging = isVerboseLoggingEnabled();
      
      if (verboseLogging) {
        console.log('[SIPContext] 📞 makeCall called:', { target });
      }
      
      const result = await serviceRef.current.makeCall(target);
      
      if (verboseLogging) {
        console.log('[SIPContext] ✅ makeCall returned:', {
          sessionId: result.id,
          state: result.state,
          target: result.target
        });
      }
      
      return result;
    },
    
    answerCall: async (sessionId?: string) => {
      const verboseLogging = isVerboseLoggingEnabled();
      
      if (verboseLogging) {
        console.log('[SIPContext] 📞 answerCall called:', { sessionId });
      }
      
      const result = await serviceRef.current.answerCall(sessionId);
      
      if (verboseLogging) {
        console.log('[SIPContext] ✅ answerCall returned:', {
          sessionId: result.id,
          state: result.state
        });
      }
      
      return result;
    },
    
    hangupCall: async (sessionId?: string) => {
      const verboseLogging = isVerboseLoggingEnabled();
      
      if (verboseLogging) {
        console.log('[SIPContext] 📴 hangupCall called:', { sessionId });
      }
      
      await serviceRef.current.hangupCall(sessionId);
      
      if (verboseLogging) {
        console.log('[SIPContext] ✅ hangupCall completed');
      }
    },
    
    // Call control
    holdCall: async (sessionId?: string) => {
      await serviceRef.current.holdCall(sessionId);
    },
    
    unholdCall: async (sessionId?: string) => {
      await serviceRef.current.unholdCall(sessionId);
    },
    
    toggleHold: async (sessionId?: string) => {
      await serviceRef.current.toggleHold(sessionId);
    },
    
    muteCall: async (sessionId?: string) => {
      await serviceRef.current.muteCall(sessionId);
    },
    
    unmuteCall: async (sessionId?: string) => {
      await serviceRef.current.unmuteCall(sessionId);
    },
    
    toggleMute: async (sessionId?: string) => {
      await serviceRef.current.toggleMute(sessionId);
    },
    
    // DTMF
    sendDTMF: async (sessionId: string, tone: string) => {
      await serviceRef.current.sendDTMF(sessionId, tone);
    },
    
    sendDTMFSequence: async (sessionId: string, sequence: string) => {
      await serviceRef.current.sendDTMFSequence(sessionId, sequence);
    },
    
    // Transfer
    blindTransfer: async (sessionId: string, target: string) => {
      await serviceRef.current.blindTransfer(sessionId, target);
    },
    
    attendedTransfer: async (sessionId: string, target: string) => {
      return await serviceRef.current.attendedTransfer(sessionId, target);
    },
    
    completeAttendedTransfer: async (sessionId: string, transferSessionId: string) => {
      await serviceRef.current.completeAttendedTransfer(sessionId, transferSessionId);
    },
    
    cancelAttendedTransfer: async (sessionId: string) => {
      await serviceRef.current.cancelAttendedTransfer(sessionId);
    },
    
    // BLF
    subscribeBLF: (extension: string, buddy?: string) => {
      serviceRef.current.subscribeBLF(extension, buddy);
    },
    
    batchSubscribeBLF: async (extensions: string[], batchSize?: number) => {
      await serviceRef.current.batchSubscribeBLF(extensions, batchSize);
    },
    
    unsubscribeBLF: (extension: string) => {
      serviceRef.current.unsubscribeBLF(extension);
    },
    
    // Line management
    selectLine: (lineNumber: 1 | 2 | 3) => {
      serviceRef.current.selectLine(lineNumber);
    }
  }), [
    sipConfig,
    settings.advanced.iceGatheringTimeout,
    settings.advanced.keepAliveInterval,
    settings.advanced.keepAliveMaxSequentialFailures,
    settings.advanced.noAnswerTimeout
  ]); // Include advanced SIP settings since connect method uses them

  return (
    <SIPContext.Provider value={value}>
      {children}
    </SIPContext.Provider>
  );
}

// ==================== Hook ====================

export function useSIPContext(): SIPContextValue {
  const context = useContext(SIPContext);
  if (!context) {
    throw new Error('useSIPContext must be used within a SIPProvider');
  }
  return context;
}

export default SIPContext;
