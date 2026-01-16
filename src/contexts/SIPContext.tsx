/**
 * SIPContext - React Context for SIP service
 * Provides SIP functionality to React components and syncs with Zustand store
 */

import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { SIPService, sipService } from '../services/SIPService';
import { audioService } from '../services/AudioService';
import { useSIPStore } from '../stores/sipStore';
import { useSettingsStore } from '../stores/settingsStore';
import { isVerboseLoggingEnabled } from '../utils';
import type { 
  SessionData, 
  RegistrationState, 
  TransportState,
  BLFStateChangeData 
} from '../types/sip';
import { buildSIPConfig } from '../types/sip';

// ==================== Context ====================

interface SIPContextValue {
  sipService: SIPService;
  
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
    updateBLFState
  } = useSIPStore();
  
  const { sipConfig } = useSettingsStore();

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
        
        // Check if there are other active sessions to determine alert tone
        const activeSessions = service.getActiveSessions();
        const useAlertTone = activeSessions.length > 1;
        
        audioService.startRinging(useAlertTone).catch(error => {
          console.error('[SIPContext] ❌ Failed to start ringtone:', error);
        });
      }
      
      if (verboseLogging) {
        console.log('[SIPContext] ✅ Session added to store');
      }
    });
    
    const unsubSessionAnswered = service.on('sessionAnswered', (session: SessionData) => {
      if (verboseLogging) {
        console.log('[SIPContext] 📞 sessionAnswered event received:', session.id);
      }
      
      // Stop ringtone when call is answered
      if (audioService.getIsRinging()) {
        if (verboseLogging) {
          console.log('[SIPContext] 🔕 Stopping ringtone - call answered');
        }
        audioService.stopRinging();
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
      
      removeSession(session.id);
    });
    
    const unsubSessionStateChanged = service.on('sessionStateChanged', ({ sessionId, state }) => {
      if (verboseLogging) {
        console.log('[SIPContext] 🔄 sessionStateChanged event received:', { sessionId, state });
      }
      updateSession(sessionId, { state: state as SessionData['state'] });
    });
    
    const unsubSessionDuration = service.on('sessionDurationChanged', ({ sessionId, duration }) => {
      updateSession(sessionId, { duration });
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
    
    // Cleanup
    return () => {
      unsubTransportState();
      unsubRegState();
      unsubSessionCreated();
      unsubSessionAnswered();
      unsubSessionTerminated();
      unsubSessionStateChanged();
      unsubSessionDuration();
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
    };
  }, [
    setRegistrationState,
    setTransportState,
    addSession,
    updateSession,
    removeSession,
    setSelectedLine,
    updateBLFState
  ]);

  // Context value with wrapped methods
  // Note: Accessing serviceRef.current here is intentional - we're not using it for rendering,
  // only to provide a stable reference to the service instance for method calls
  const value: SIPContextValue = {
    sipService: serviceRef.current,
    
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
      await serviceRef.current.stop();
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
  };

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
