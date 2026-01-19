// ============================================
// SIP Store - SIP/Call State
// ============================================

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { isVerboseLoggingEnabled } from '@/utils';
import type { 
  RegistrationState, 
  TransportState, 
  SessionData, 
  LineState,
  LineStateType,
  BLFPresenceState 
} from '@/types';

interface SIPState {
  // Connection state
  registrationState: RegistrationState;
  transportState: TransportState;
  
  // Sessions
  sessions: Map<string, SessionData>;
  
  // Lines
  selectedLine: 1 | 2 | 3;
  lineStates: LineState[];
  
  // BLF
  blfStates: Map<string, BLFPresenceState>;
  
  // Voicemail
  voicemailCount: number;
  hasNewVoicemail: boolean;
  
  // Actions
  setRegistrationState: (state: RegistrationState) => void;
  setTransportState: (state: TransportState) => void;
  
  // Session actions
  addSession: (session: SessionData) => void;
  updateSession: (sessionId: string, updates: Partial<SessionData>) => void;
  removeSession: (sessionId: string) => void;
  
  // Line actions
  selectLine: (line: 1 | 2 | 3) => void;
  updateLineState: (lineNumber: number, updates: Partial<LineState>) => void;
  
  // BLF actions
  setBLFState: (extension: string, state: BLFPresenceState) => void;
  updateBLFState: (extension: string, state: BLFPresenceState) => void;
  clearBLFState: (extension: string) => void;
  clearAllBLFStates: () => void;
  
  // Voicemail actions
  updateVoicemailMWI: (count: number, hasMessages: boolean) => void;
  clearVoicemailMWI: () => void;
  
  // Line actions (with aliases)
  setSelectedLine: (line: 1 | 2 | 3 | null) => void;
  
  // Computed
  getCurrentSession: () => SessionData | undefined;
  getSessionByLine: (lineNumber: number) => SessionData | undefined;
  hasActiveSessions: () => boolean;
  getIncomingSession: () => SessionData | undefined;
}

const initialLineStates: LineState[] = [
  { lineNumber: 1, sessionId: null, state: 'idle', startTime: null, callerInfo: null },
  { lineNumber: 2, sessionId: null, state: 'idle', startTime: null, callerInfo: null },
  { lineNumber: 3, sessionId: null, state: 'idle', startTime: null, callerInfo: null }
];

export const useSIPStore = create<SIPState>()(
  devtools(
    (set, get) => ({
      // Initial state
      registrationState: 'unregistered',
      transportState: 'disconnected',
      voicemailCount: 0,
      hasNewVoicemail: false,
      sessions: new Map(),
      selectedLine: 1,
      lineStates: initialLineStates,
      blfStates: new Map(),
      
      // Connection actions
      setRegistrationState: (state) => set({ registrationState: state }),
      setTransportState: (state) => set({ transportState: state }),
      
      // Session actions
      addSession: (session) => set((state) => {
        const verboseLogging = isVerboseLoggingEnabled();
        
        if (verboseLogging) {
          console.log('[sipStore] 📝 addSession called:', {
            sessionId: session.id,
            lineNumber: session.lineNumber,
            direction: session.direction,
            state: session.state,
            target: session.target
          });
        }
        
        const newSessions = new Map(state.sessions);
        newSessions.set(session.id, session);
        
        // Update the line state to link this session to its line
        const newLineStates = state.lineStates.map((lineState) =>
          lineState.lineNumber === session.lineNumber
            ? {
                ...lineState,
                sessionId: session.id,
                state: (session.state === 'ringing' ? 'ringing' : 
                       session.state === 'established' || session.state === 'active' ? 'active' :
                       session.onHold ? 'hold' : 'dialing') as LineStateType,
                startTime: session.startTime,
                callerInfo: {
                  number: session.remoteNumber || session.target || '',
                  name: session.displayName || session.remoteIdentity || '',
                  direction: session.direction
                }
              }
            : lineState
        );
        
        if (verboseLogging) {
          console.log('[sipStore] ✅ Session added:', {
            totalSessions: newSessions.size,
            lineStates: newLineStates.map(ls => ({
              line: ls.lineNumber,
              sessionId: ls.sessionId,
              state: ls.state
            }))
          });
        }
        
        return { sessions: newSessions, lineStates: newLineStates };
      }),
      
      updateSession: (sessionId, updates) => set((state) => {
        const session = state.sessions.get(sessionId);
        if (!session) return state;
        
        const updatedSession = { ...session, ...updates };
        const newSessions = new Map(state.sessions);
        newSessions.set(sessionId, updatedSession);
        
        // Update the line state to reflect session changes
        const newLineStates = state.lineStates.map((lineState) =>
          lineState.sessionId === sessionId
            ? {
                ...lineState,
                state: (updatedSession.state === 'ringing' ? 'ringing' : 
                       updatedSession.state === 'established' || updatedSession.state === 'active' ? 'active' :
                       updatedSession.onHold ? 'hold' : 
                       updatedSession.state === 'terminated' ? 'idle' : lineState.state) as LineStateType,
                callerInfo: {
                  number: updatedSession.remoteNumber || updatedSession.target || lineState.callerInfo?.number || '',
                  name: updatedSession.displayName || updatedSession.remoteIdentity || lineState.callerInfo?.name || '',
                  direction: updatedSession.direction || lineState.callerInfo?.direction || 'outgoing'
                }
              }
            : lineState
        );
        
        return { sessions: newSessions, lineStates: newLineStates };
      }),
      
      removeSession: (sessionId) => set((state) => {
        const session = state.sessions.get(sessionId);
        const newSessions = new Map(state.sessions);
        newSessions.delete(sessionId);
        
        // Clear the line state for the line that had this session
        const newLineStates = session 
          ? state.lineStates.map((lineState) =>
              lineState.lineNumber === session.lineNumber
                ? { lineNumber: lineState.lineNumber, sessionId: null, state: 'idle' as LineStateType, startTime: null, callerInfo: null }
                : lineState
            )
          : state.lineStates;
        
        return { sessions: newSessions, lineStates: newLineStates };
      }),
      
      // Line actions
      selectLine: (line) => set({ selectedLine: line }),
      
      updateLineState: (lineNumber, updates) => set((state) => {
        const newLineStates = state.lineStates.map((lineState) =>
          lineState.lineNumber === lineNumber
            ? { ...lineState, ...updates }
            : lineState
        );
        return { lineStates: newLineStates };
      }),
      
      // BLF actions
      setBLFState: (extension, state) => set((currentState) => {
        const newBLFStates = new Map(currentState.blfStates);
        newBLFStates.set(extension, state);
        return { blfStates: newBLFStates };
      }),
      
      // Alias for setBLFState used by SIPContext
      updateBLFState: (extension: string, state: BLFPresenceState) => set((currentState) => {
        const newBLFStates = new Map(currentState.blfStates);
        newBLFStates.set(extension, state);
        return { blfStates: newBLFStates };
      }),
      
      clearBLFState: (extension) => set((state) => {
        const newBLFStates = new Map(state.blfStates);
        newBLFStates.delete(extension);
        return { blfStates: newBLFStates };
      }),
      
      clearAllBLFStates: () => set(() => {
        const verboseLogging = isVerboseLoggingEnabled();
        
        if (verboseLogging) {
          console.log('[sipStore] 🔕 Clearing all BLF button states - setting all to inactive/unsubscribed');
        }
        
        // Clear all BLF states (this will cause buttons to show as inactive/unsubscribed)
        return { blfStates: new Map() };
      }),
      
      // Voicemail actions
      updateVoicemailMWI: (count: number, hasMessages: boolean) => {
        const verboseLogging = isVerboseLoggingEnabled();
        
        if (verboseLogging) {
          console.log('[sipStore] 📧 Updating voicemail MWI:', { count, hasMessages });
        }
        
        set({ voicemailCount: count, hasNewVoicemail: hasMessages });
      },
      
      clearVoicemailMWI: () => {
        const verboseLogging = isVerboseLoggingEnabled();
        
        if (verboseLogging) {
          console.log('[sipStore] 📧 Clearing voicemail MWI');
        }
        
        set({ voicemailCount: 0, hasNewVoicemail: false });
      },
      
      // 
      
      // Alias for selectLine used by SIPContext
      setSelectedLine: (line: 1 | 2 | 3 | null) => set({ selectedLine: line || 1 }),
      
      // Computed
      getCurrentSession: () => {
        const state = get();
        const lineState = state.lineStates.find(l => l.lineNumber === state.selectedLine);
        if (!lineState?.sessionId) return undefined;
        return state.sessions.get(lineState.sessionId);
      },
      
      getSessionByLine: (lineNumber) => {
        const state = get();
        const lineState = state.lineStates.find(l => l.lineNumber === lineNumber);
        if (!lineState?.sessionId) return undefined;
        return state.sessions.get(lineState.sessionId);
      },
      
      hasActiveSessions: () => {
        const state = get();
        return state.lineStates.some(l => l.state !== 'idle');
      },
      
      getIncomingSession: () => {
        const state = get();
        for (const session of state.sessions.values()) {
          if (session.direction === 'incoming' && session.state === 'ringing') {
            return session;
          }
        }
        return undefined;
      }
    }),
    { name: 'sip-store' }
  )
);
