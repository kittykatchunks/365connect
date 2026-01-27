/**
 * SIPContext - React Context for SIP service
 * Provides SIP functionality to React components and syncs with Zustand store
 */

import { createContext, useContext, useEffect, useRef, useMemo, type ReactNode } from 'react';
import { SIPService, sipService } from '../services/SIPService';
import { audioService } from '../services/AudioService';
import { useSIPStore } from '../stores/sipStore';
import { useBLFStore } from '../stores/blfStore';
import { useCallHistoryStore } from '../stores/callHistoryStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useContactsStore } from '../stores/contactsStore';
import { useUIStore } from '../stores/uiStore';
import { useAppStore } from '../stores/appStore';
import { useTabNotification } from '../hooks';
import { useNotifications } from '../hooks/useNotifications';
import { isVerboseLoggingEnabled, queryAgentStatus } from '../utils';
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
  const { addNotification } = useUIStore();
  const { resetAllButtonStates } = useBLFStore();
  const { agentLogout } = useAppStore();
  
  // Store active notification reference for cleanup
  const activeNotificationRef = useRef<Notification | null>(null);
  
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

  // Store connection state before page unload/refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      const verboseLogging = isVerboseLoggingEnabled();
      const isRegistered = serviceRef.current.isRegistered();
      const transportState = useSIPStore.getState().transportState;
      
      if (verboseLogging) {
        console.log('[SIPContext] 🔄 Page unload/refresh detected:', {
          isRegistered,
          transportState,
          willPersistState: isRegistered
        });
      }
      
      // Store connection state if registered to enable auto-reconnect
      if (isRegistered) {
        localStorage.setItem('sipWasConnectedBeforeRefresh', 'true');
        localStorage.setItem('sipConnectionTimestamp', Date.now().toString());
        
        if (verboseLogging) {
          console.log('[SIPContext] ✅ Connection state persisted to localStorage for auto-reconnect');
        }
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Auto-reconnect after page refresh if previously connected
  useEffect(() => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    // Check for page refresh auto-reconnect flag
    const wasConnected = localStorage.getItem('sipWasConnectedBeforeRefresh');
    const connectionTimestamp = localStorage.getItem('sipConnectionTimestamp');
    
    if (wasConnected === 'true') {
      // Verify timestamp is recent (within last 5 minutes to prevent stale reconnects)
      const timestamp = parseInt(connectionTimestamp || '0', 10);
      const ageMs = Date.now() - timestamp;
      const maxAgeMs = 5 * 60 * 1000; // 5 minutes
      
      if (verboseLogging) {
        console.log('[SIPContext] 🔄 Page refresh auto-reconnect check:', {
          wasConnected,
          connectionAge: `${Math.round(ageMs / 1000)}s`,
          maxAge: `${Math.round(maxAgeMs / 1000)}s`,
          isRecent: ageMs < maxAgeMs
        });
      }
      
      if (ageMs < maxAgeMs) {
        // Clear the flags immediately
        localStorage.removeItem('sipWasConnectedBeforeRefresh');
        localStorage.removeItem('sipConnectionTimestamp');
        
        // Check if we have valid config and are not already registered
        const hasConfig = sipConfig && 
                         settings.connection.phantomId && 
                         settings.connection.username && 
                         settings.connection.password;
        
        const isRegistered = serviceRef.current.isRegistered();
        
        if (hasConfig && !isRegistered) {
          if (verboseLogging) {
            console.log('[SIPContext] ✅ Valid config found, initiating auto-reconnect after page refresh');
          }
          
          // Connect after small delay to let React fully initialize
          const timer = setTimeout(async () => {
            try {
              const config = buildSIPConfig({
                phantomId: sipConfig.phantomId,
                username: sipConfig.username,
                password: sipConfig.password
              });
              
              if (verboseLogging) {
                console.log('[SIPContext] 📞 Creating UserAgent for auto-reconnect...');
              }
              
              await serviceRef.current.createUserAgent(config);
              
              if (verboseLogging) {
                console.log('[SIPContext] ✅ Auto-reconnect after page refresh successful');
              }
              
              // Check agent login status after successful reconnect
              if (verboseLogging) {
                console.log('[SIPContext] 🔍 Checking agent login status via Phantom API...');
              }
              
              // Wait a bit for registration to complete before checking agent status
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              try {
                const agentData = await queryAgentStatus(sipConfig.username);
                
                if (verboseLogging) {
                  console.log('[SIPContext] 📥 Agent status response:', agentData);
                }
                
                if (agentData) {
                  // AgentData has num field - if populated, agent is logged in
                  const isLoggedIn = agentData.num !== null && agentData.num !== '';
                  const isPaused = agentData.pause === true || agentData.pause === 1 || agentData.pause === '1';
                  
                  if (isLoggedIn) {
                    if (verboseLogging) {
                      console.log('[SIPContext] ✅ Agent is logged in:', {
                        agentNumber: agentData.num,
                        agentName: agentData.name,
                        paused: isPaused,
                        clip: agentData.clip,
                        cid: agentData.cid
                      });
                    }
                    
                    // Update agent state in appStore
                    const { setAgentState, setAgentNumber, setAgentName, setQueueState } = useAppStore.getState();
                    
                    // Set agent number and name
                    setAgentNumber(agentData.num || '');
                    setAgentName(agentData.name);
                    
                    // Set agent state based on pause status
                    setAgentState(isPaused ? 'paused' : 'available');
                    
                    // Set queue state (agent is in queue when logged in, regardless of pause)
                    setQueueState('in-queue');
                    
                    if (verboseLogging) {
                      console.log('[SIPContext] 📝 Updated appStore agent state:', {
                        agentNumber: agentData.num,
                        agentName: agentData.name,
                        agentState: isPaused ? 'paused' : 'available',
                        queueState: 'in-queue'
                      });
                    }
                    
                    // Show success notification
                    const agentIdentifier = agentData.num || sipConfig.username;
                    const pauseStatus = isPaused ? ' (Paused)' : '';
                    
                    addNotification({
                      type: 'success',
                      title: 'Auto-Reconnected',
                      message: `Successfully reconnected. Agent ${agentIdentifier} is logged in${pauseStatus}.`,
                      duration: 5000
                    });
                  } else {
                    if (verboseLogging) {
                      console.warn('[SIPContext] ⚠️ Agent not logged in:', {
                        num: agentData.num,
                        name: agentData.name
                      });
                    }
                    
                    // Show warning notification
                    addNotification({
                      type: 'warning',
                      title: 'Reconnected - Login Required',
                      message: 'SIP connection restored, but you are not logged into the queue. Please login to receive calls.',
                      duration: 8000
                    });
                  }
                } else {
                  // No agent data returned from API
                  if (verboseLogging) {
                    console.warn('[SIPContext] ⚠️ No agent data returned from API');
                  }
                  
                  // Show basic reconnection notification
                  addNotification({
                    type: 'info',
                    title: 'Reconnected',
                    message: 'SIP connection restored. Check your agent login status if needed.',
                    duration: 5000
                  });
                }
              } catch (agentCheckError) {
                // Agent status check failed, but SIP is connected
                console.error('[SIPContext] ⚠️ Agent status check failed:', agentCheckError);
                
                if (verboseLogging) {
                  console.log('[SIPContext] ℹ️ Showing basic reconnection notification (agent check unavailable)');
                }
                
                // Show basic reconnection notification
                addNotification({
                  type: 'info',
                  title: 'Reconnected',
                  message: 'SIP connection restored successfully.',
                  duration: 4000
                });
              }
            } catch (error) {
              console.error('[SIPContext] ❌ Auto-reconnect after page refresh failed:', error);
              
              // Show error notification
              addNotification({
                type: 'error',
                title: 'Auto-Reconnect Failed',
                message: 'Failed to reconnect automatically. Please use the Connect button.',
                duration: 6000
              });
            }
          }, 500);
          
          return () => clearTimeout(timer);
        } else if (verboseLogging) {
          console.log('[SIPContext] ⚠️ Skipping auto-reconnect:', { 
            hasConfig: !!hasConfig, 
            isRegistered,
            reason: !hasConfig ? 'No valid config' : 'Already registered'
          });
        }
      } else {
        // Stale connection state, clean it up
        if (verboseLogging) {
          console.log('[SIPContext] 🧹 Clearing stale connection state (too old)');
        }
        localStorage.removeItem('sipWasConnectedBeforeRefresh');
        localStorage.removeItem('sipConnectionTimestamp');
      }
    }
    
    // Also handle legacy click-to-dial auto-reconnect
    const clickToDialReconnect = sessionStorage.getItem('autoReconnectSIP');
    if (clickToDialReconnect === 'true') {
      if (verboseLogging) {
        console.log('[SIPContext] 🔄 Legacy click-to-dial reload detected - initiating fast auto-reconnect...');
      }
      
      sessionStorage.removeItem('autoReconnectSIP');
      
      const hasConfig = sipConfig && 
                       settings.connection.phantomId && 
                       settings.connection.username && 
                       settings.connection.password;
      
      const isRegistered = serviceRef.current.isRegistered();
      
      if (hasConfig && !isRegistered) {
        const timer = setTimeout(async () => {
          try {
            const config = buildSIPConfig({
              phantomId: sipConfig.phantomId,
              username: sipConfig.username,
              password: sipConfig.password
            });
            await serviceRef.current.createUserAgent(config);
            if (verboseLogging) {
              console.log('[SIPContext] ✅ Click-to-dial auto-reconnect successful');
            }
          } catch (error) {
            console.error('[SIPContext] ❌ Click-to-dial auto-reconnect failed:', error);
          }
        }, 100);
        
        return () => clearTimeout(timer);
      }
    }
  }, [settings.connection, sipConfig]);

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
        
        if (verboseLogging) {
          console.log('[SIPContext] 🎵 Ringtone selection:', {
            activeSessions: activeSessions.length,
            useAlertTone,
            note: useAlertTone ? 'Call waiting (Alert.mp3)' : 'Normal ringtone'
          });
        }
        
        audioService.startRinging(useAlertTone).catch(error => {
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
              
              // Focus window if auto-focus is enabled
              if (settings.call.autoFocusOnNotificationAnswer) {
                if (verboseLogging) {
                  console.log('[SIPContext] 📱 Auto-focus enabled - bringing window to front');
                }
                window.focus();
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
      
      // Stop ringtone when call is answered
      if (audioService.getIsRinging()) {
        if (verboseLogging) {
          console.log('[SIPContext] 🔕 Stopping ringtone - call answered');
        }
        audioService.stopRinging();
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
      
      // Stop ringtone if it's still playing
      if (audioService.getIsRinging()) {
        if (verboseLogging) {
          console.log('[SIPContext] 🔕 Stopping ringtone - call terminated');
        }
        audioService.stopRinging();
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
      if (!sipConfig) {
        throw new Error('SIP configuration not available');
      }
      const config = buildSIPConfig({
        phantomId: sipConfig.phantomId,
        username: sipConfig.username,
        password: sipConfig.password
      });
      await serviceRef.current.createUserAgent(config);
    },
    
    disconnect: async () => {
      const verboseLogging = isVerboseLoggingEnabled();
      
      if (verboseLogging) {
        console.log('[SIPContext] 🔌 Manual disconnect initiated - clearing auto-reconnect flags');
      }
      
      // Clear auto-reconnect flags on manual disconnect
      localStorage.removeItem('sipWasConnectedBeforeRefresh');
      localStorage.removeItem('sipConnectionTimestamp');
      
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
    
    unsubscribeBLF: (extension: string) => {
      serviceRef.current.unsubscribeBLF(extension);
    },
    
    // Line management
    selectLine: (lineNumber: 1 | 2 | 3) => {
      serviceRef.current.selectLine(lineNumber);
    }
  }), [sipConfig]); // Include sipConfig since connect method uses it

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
