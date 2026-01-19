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
  completeAttendedTransfer: (sessionId?: string) => Promise<void>;
  cancelAttendedTransfer: (sessionId?: string) => Promise<void>;
  
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
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log('[useSIP] 📞 makeCall called:', {
        target,
        isRegistered,
        transportState: store.transportState,
        selectedLine: store.selectedLine,
        activeSessions: sessions.length
      });
    }
    
    const result = await sipContext.makeCall(target);
    
    if (verboseLogging) {
      console.log('[useSIP] ✅ makeCall successful, session created:', {
        sessionId: result.id,
        target: result.target,
        direction: result.direction,
        state: result.state,
        lineNumber: result.lineNumber
      });
    }
    
    return result;
  }, [sipContext, isRegistered, store.transportState, store.selectedLine, sessions.length]);
  
  const answerCall = useCallback(async (sessionId?: string) => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    const targetSessionId = sessionId || incomingSession?.id || currentSession?.id;
    
    if (verboseLogging) {
      console.log('[useSIP] 📞 answerCall called:', {
        requestedSessionId: sessionId,
        incomingSessionId: incomingSession?.id,
        currentSessionId: currentSession?.id,
        targetSessionId,
        selectedLine: store.selectedLine
      });
    }
    
    if (!targetSessionId) {
      console.error('[useSIP] ❌ answerCall failed: No session to answer');
      throw new Error('No session to answer');
    }
    
    const result = await sipContext.answerCall(targetSessionId);
    
    if (verboseLogging) {
      console.log('[useSIP] ✅ answerCall successful:', {
        sessionId: result.id,
        state: result.state
      });
    }
    
    return result;
  }, [sipContext, incomingSession, currentSession, store.selectedLine]);
  
  const hangupCall = useCallback(async (sessionId?: string) => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    const targetSessionId = sessionId || currentSession?.id;
    
    if (verboseLogging) {
      console.log('[useSIP] 📴 hangupCall called:', {
        requestedSessionId: sessionId,
        currentSessionId: currentSession?.id,
        targetSessionId,
        selectedLine: store.selectedLine,
        activeSessions: sessions.length
      });
    }
    
    if (!targetSessionId) {
      console.error('[useSIP] ❌ hangupCall failed: No session to hangup');
      throw new Error('No session to hang up');
    }
    
    await sipContext.hangupCall(targetSessionId);
    
    if (verboseLogging) {
      console.log('[useSIP] ✅ hangupCall successful, sessionId:', targetSessionId);
    }
  }, [sipContext, currentSession, store.selectedLine, sessions.length]);
  
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
  
  const completeAttendedTransfer = useCallback(async (sessionId?: string) => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    const targetSessionId = sessionId || currentSession?.id;
    if (!targetSessionId) {
      if (verboseLogging) {
        console.error('[useSIP] ❌ completeAttendedTransfer: No session ID provided');
      }
      throw new Error('No active session for transfer completion');
    }
    
    if (verboseLogging) {
      console.log('[useSIP] 📞 completeAttendedTransfer called for session:', targetSessionId);
    }
    
    await sipContext.completeAttendedTransfer(targetSessionId, targetSessionId);
  }, [sipContext, currentSession]);
  
  const cancelAttendedTransfer = useCallback(async (sessionId?: string) => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    const targetSessionId = sessionId || currentSession?.id;
    if (!targetSessionId) {
      if (verboseLogging) {
        console.error('[useSIP] ❌ cancelAttendedTransfer: No session ID provided');
      }
      throw new Error('No active session for transfer cancellation');
    }
    
    if (verboseLogging) {
      console.log('[useSIP] 🚫 cancelAttendedTransfer called for session:', targetSessionId);
    }
    
    await sipContext.cancelAttendedTransfer(targetSessionId);
  }, [sipContext, currentSession]);
  
  // BLF
  const subscribeBLF = useCallback((extension: string, buddy?: string) => {
    sipContext.subscribeBLF(extension, buddy);
  }, [sipContext]);
  
  const unsubscribeBLF = useCallback((extension: string) => {
    sipContext.unsubscribeBLF(extension);
  }, [sipContext]);
  
  // Line management
  const selectLine = useCallback(async (lineNumber: LineNumber) => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    // Get the current line's session before switching
    const currentLineState = lineStates.find(ls => ls.lineNumber === store.selectedLine);
    const currentSession = currentLineState?.sessionId ? store.sessions.get(currentLineState.sessionId) : undefined;
    
    if (verboseLogging) {
      console.log('[useSIP] 📞 selectLine called:', {
        from: store.selectedLine,
        to: lineNumber,
        currentSession: currentSession ? {
          id: currentSession.id,
          state: currentSession.state,
          onHold: currentSession.onHold
        } : 'none'
      });
    }
    
    // If switching away from a line with an active (not on hold) call, auto-hold it
    if (currentSession && 
        (currentSession.state === 'established' || currentSession.state === 'active') && 
        !currentSession.onHold &&
        store.selectedLine !== lineNumber) {
      
      if (verboseLogging) {
        console.log('[useSIP] 🔄 Auto-holding current call before line switch:', {
          sessionId: currentSession.id,
          fromLine: store.selectedLine,
          toLine: lineNumber
        });
      }
      
      try {
        await sipContext.holdCall(currentSession.id);
        
        if (verboseLogging) {
          console.log('[useSIP] ✅ Current call auto-held successfully');
        }
      } catch (error) {
        console.error('[useSIP] ❌ Failed to auto-hold current call:', error);
        // Continue with line switch even if hold fails
      }
    }
    
    // Switch to the new line
    sipContext.selectLine(lineNumber);
    
    if (verboseLogging) {
      console.log('[useSIP] ✅ Line switched to:', lineNumber);
    }
  }, [sipContext, lineStates, store.selectedLine, store.sessions]);
  
  const selectLineWithSession = useCallback(async (sessionId: string) => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    // Find which line has this session and select it
    const lineState = lineStates.find(ls => ls.sessionId === sessionId);
    if (!lineState) {
      if (verboseLogging) {
        console.warn('[useSIP] ⚠️ selectLineWithSession: Session not found on any line:', sessionId);
      }
      return;
    }
    
    if (verboseLogging) {
      const session = store.sessions.get(sessionId);
      console.log('[useSIP] 📞 selectLineWithSession called:', {
        sessionId,
        lineNumber: lineState.lineNumber,
        sessionState: session?.state,
        onHold: session?.onHold
      });
    }
    
    // Use the selectLine callback which will auto-hold the current call
    await selectLine(lineState.lineNumber);
    
    // NOTE: We do NOT auto-unhold the session when selecting it
    // The agent must manually unhold using the hold button
    
    if (verboseLogging) {
      console.log('[useSIP] ✅ Line selected for session (manual unhold required if on hold):', sessionId);
    }
  }, [lineStates, store.sessions, selectLine]);
  
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
    completeAttendedTransfer,
    cancelAttendedTransfer,
    subscribeBLF,
    unsubscribeBLF,
    selectLine,
    selectLineWithSession,
    getSessionByLine
  };
}

export default useSIP;
