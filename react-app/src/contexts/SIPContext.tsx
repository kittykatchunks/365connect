/**
 * SIPContext - React Context for SIP service
 * Provides SIP functionality to React components and syncs with Zustand store
 */

import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { SIPService, sipService } from '../services/SIPService';
import { useSIPStore } from '../stores/sipStore';
import { useSettingsStore } from '../stores/settingsStore';
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
    
    // Transport events
    const unsubTransportState = service.on('transportStateChanged', (state: TransportState) => {
      setTransportState(state);
    });
    
    // Registration events
    const unsubRegState = service.on('registrationStateChanged', (state: RegistrationState) => {
      setRegistrationState(state);
    });
    
    // Session events
    const unsubSessionCreated = service.on('sessionCreated', (session: SessionData) => {
      addSession(session);
    });
    
    const unsubSessionAnswered = service.on('sessionAnswered', (session: SessionData) => {
      updateSession(session.id, { state: 'established', answerTime: new Date() });
    });
    
    const unsubSessionTerminated = service.on('sessionTerminated', (session: SessionData) => {
      removeSession(session.id);
    });
    
    const unsubSessionStateChanged = service.on('sessionStateChanged', ({ sessionId, state }) => {
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
      return await serviceRef.current.makeCall(target);
    },
    
    answerCall: async (sessionId?: string) => {
      return await serviceRef.current.answerCall(sessionId);
    },
    
    hangupCall: async (sessionId?: string) => {
      await serviceRef.current.hangupCall(sessionId);
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
