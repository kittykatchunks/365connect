/**
 * useSIP Hook - High-level SIP functionality for components
 * Combines SIPContext actions with sipStore state
 */

import { useCallback, useMemo } from 'react';
import { useSIPContext } from '../contexts/SIPContext';
import { useSIPStore } from '../stores/sipStore';
import { isVerboseLoggingEnabled } from '../utils';
import type { SessionData, LineNumber } from '../types/sip';

export interface UseSIPReturn {
  // Connection state
  isConnected: boolean;
  isRegistered: boolean;
  isRegistering: boolean;
  registrationState: 'unregistered' | 'registering' | 'registered' | 'failed';
  transportState: 'disconnected' | 'connecting' | 'connected';
  
  // Sessions
  sessions: SessionData[];
  currentSession: SessionData | undefined;
  incomingSession: SessionData | undefined;
  hasActiveCalls: boolean;
  
  // Lines
  selectedLine: LineNumber;
  lineStates: Array<{
    lineNumber: LineNumber;
    sessionId: string | null;
    state: 'idle' | 'ringing' | 'active' | 'hold' | 'dialing';
  }>;
  
  // BLF
  blfStates: Map<string, string>;
  
  // Connection actions
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  register: () => Promise<void>;
  unregister: () => Promise<void>;
  
  // Call actions
  makeCall: (target: string) => Promise<SessionData>;
  answerCall: (sessionId?: string) => Promise<SessionData>;
  hangupCall: (sessionId?: string) => Promise<void>;
  rejectCall: (sessionId?: string) => Promise<void>;
  
  // Call control
  holdCall: (sessionId?: string) => Promise<void>;
  unholdCall: (sessionId?: string) => Promise<void>;
  toggleHold: (sessionId?: string) => Promise<void>;
  muteCall: (sessionId?: string) => Promise<void>;
  unmuteCall: (sessionId?: string) => Promise<void>;
  toggleMute: (sessionId?: string) => Promise<void>;
  
  // DTMF
  sendDTMF: (tone: string, sessionId?: string) => Promise<void>;
  sendDTMFSequence: (sequence: string, sessionId?: string) => Promise<void>;
  
  // Transfer
  blindTransfer: (target: string, sessionId?: string) => Promise<void>;
  startAttendedTransfer: (target: string, sessionId?: string) => Promise<unknown>;
  
  // BLF
  subscribeBLF: (extension: string, buddy?: string) => void;
  unsubscribeBLF: (extension: string) => void;
  
  // Line management
  selectLine: (lineNumber: LineNumber) => void;
  selectLineWithSession: (sessionId: string) => Promise<void>;
  getSessionByLine: (lineNumber: LineNumber) => SessionData | undefined;
}

export function useSIP(): UseSIPReturn {
  // Get context and store
  const sipContext = useSIPContext();
  const store = useSIPStore();
  
  // Derive state
  const isConnected = store.transportState === 'connected';
  const isRegistered = store.registrationState === 'registered';
  const isRegistering = store.registrationState === 'registering';
  
  const sessions = useMemo(() => 
    Array.from(store.sessions.values()),
    [store.sessions]
  );
  
  const currentSession = store.getCurrentSession();
  const incomingSession = store.getIncomingSession();
  const hasActiveCalls = store.hasActiveSessions();
  
  // Memoized line states
  const lineStates = useMemo(() => 
    store.lineStates.map(ls => ({
      lineNumber: ls.lineNumber as LineNumber,
      sessionId: ls.sessionId,
      state: ls.state
    })),
    [store.lineStates]
  );
  
  // Connection actions
  const connect = useCallback(async () => {
    await sipContext.connect();
  }, [sipContext]);
  
  const disconnect = useCallback(async () => {
    await sipContext.disconnect();
  }, [sipContext]);
  
  const register = useCallback(async () => {
    await sipContext.register();
  }, [sipContext]);
  
  const unregister = useCallback(async () => {
    await sipContext.unregister();
  }, [sipContext]);
  
  // Call actions
  const makeCall = useCallback(async (target: string) => {
    return await sipContext.makeCall(target);
  }, [sipContext]);
  
  const answerCall = useCallback(async (sessionId?: string) => {
    return await sipContext.answerCall(sessionId);
  }, [sipContext]);
  
  const hangupCall = useCallback(async (sessionId?: string) => {
    await sipContext.hangupCall(sessionId);
  }, [sipContext]);
  
  const rejectCall = useCallback(async (sessionId?: string) => {
    // Reject is the same as hangup for unanswered incoming calls
    await sipContext.hangupCall(sessionId);
  }, [sipContext]);
  
  // Call control
  const holdCall = useCallback(async (sessionId?: string) => {
    await sipContext.holdCall(sessionId);
  }, [sipContext]);
  
  const unholdCall = useCallback(async (sessionId?: string) => {
    await sipContext.unholdCall(sessionId);
  }, [sipContext]);
  
  const toggleHold = useCallback(async (sessionId?: string) => {
    await sipContext.toggleHold(sessionId);
  }, [sipContext]);
  
  const muteCall = useCallback(async (sessionId?: string) => {
    await sipContext.muteCall(sessionId);
  }, [sipContext]);
  
  const unmuteCall = useCallback(async (sessionId?: string) => {
    await sipContext.unmuteCall(sessionId);
  }, [sipContext]);
  
  const toggleMute = useCallback(async (sessionId?: string) => {
    await sipContext.toggleMute(sessionId);
  }, [sipContext]);
  
  // DTMF - use current session if no sessionId provided
  const sendDTMF = useCallback(async (tone: string, sessionId?: string) => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    const targetSessionId = sessionId || currentSession?.id;
    if (!targetSessionId) {
      throw new Error('No active session for DTMF');
    }
    
    if (verboseLogging) {
      console.log('[useSIP] sendDTMF called:', { tone, sessionId: targetSessionId, currentSessionState: currentSession?.state });
    }
    
    await sipContext.sendDTMF(targetSessionId, tone);
  }, [sipContext, currentSession]);
  
  const sendDTMFSequence = useCallback(async (sequence: string, sessionId?: string) => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    const targetSessionId = sessionId || currentSession?.id;
    if (!targetSessionId) {
      throw new Error('No active session for DTMF');
    }
    
    if (verboseLogging) {
      console.log('[useSIP] sendDTMFSequence called:', { sequence, sessionId: targetSessionId, currentSessionState: currentSession?.state });
    }
    
    await sipContext.sendDTMFSequence(targetSessionId, sequence);
  }, [sipContext, currentSession]);
  
  // Transfer
  const blindTransfer = useCallback(async (target: string, sessionId?: string) => {
    const targetSessionId = sessionId || currentSession?.id;
    if (!targetSessionId) {
      throw new Error('No active session for transfer');
    }
    await sipContext.blindTransfer(targetSessionId, target);
  }, [sipContext, currentSession]);
  
  const startAttendedTransfer = useCallback(async (target: string, sessionId?: string) => {
    const targetSessionId = sessionId || currentSession?.id;
    if (!targetSessionId) {
      throw new Error('No active session for transfer');
    }
    return await sipContext.attendedTransfer(targetSessionId, target);
  }, [sipContext, currentSession]);
  
  // BLF
  const subscribeBLF = useCallback((extension: string, buddy?: string) => {
    sipContext.subscribeBLF(extension, buddy);
  }, [sipContext]);
  
  const unsubscribeBLF = useCallback((extension: string) => {
    sipContext.unsubscribeBLF(extension);
  }, [sipContext]);
  
  // Line management
  const selectLine = useCallback((lineNumber: LineNumber) => {
    sipContext.selectLine(lineNumber);
  }, [sipContext]);
  
  const selectLineWithSession = useCallback(async (sessionId: string) => {
    // Find which line has this session and select it
    const lineState = lineStates.find(ls => ls.sessionId === sessionId);
    if (lineState) {
      sipContext.selectLine(lineState.lineNumber);
    }
    // If the session is on hold, take it off hold
    const session = store.sessions.get(sessionId);
    if (session?.onHold) {
      await sipContext.unholdCall(sessionId);
    }
  }, [sipContext, lineStates, store.sessions]);
  
  const getSessionByLine = useCallback((lineNumber: LineNumber) => {
    return store.getSessionByLine(lineNumber);
  }, [store]);
  
  return {
    // State
    isConnected,
    isRegistered,
    isRegistering,
    registrationState: store.registrationState,
    transportState: store.transportState,
    
    // Sessions
    sessions,
    currentSession,
    incomingSession,
    hasActiveCalls,
    
    // Lines
    selectedLine: store.selectedLine,
    lineStates,
    
    // BLF
    blfStates: store.blfStates,
    
    // Actions
    connect,
    disconnect,
    register,
    unregister,
    makeCall,
    answerCall,
    hangupCall,
    rejectCall,
    holdCall,
    unholdCall,
    toggleHold,
    muteCall,
    unmuteCall,
    toggleMute,
    sendDTMF,
    sendDTMFSequence,
    blindTransfer,
    startAttendedTransfer,
    subscribeBLF,
    unsubscribeBLF,
    selectLine,
    selectLineWithSession,
    getSessionByLine
  };
}

export default useSIP;
