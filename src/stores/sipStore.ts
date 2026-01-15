// ============================================
// SIP Store - SIP/Call State
// ============================================

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { 
  RegistrationState, 
  TransportState, 
  SessionData, 
  LineState,
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
      sessions: new Map(),
      selectedLine: 1,
      lineStates: initialLineStates,
      blfStates: new Map(),
      
      // Connection actions
      setRegistrationState: (state) => set({ registrationState: state }),
      setTransportState: (state) => set({ transportState: state }),
      
      // Session actions
      addSession: (session) => set((state) => {
        const newSessions = new Map(state.sessions);
        newSessions.set(session.id, session);
        return { sessions: newSessions };
      }),
      
      updateSession: (sessionId, updates) => set((state) => {
        const session = state.sessions.get(sessionId);
        if (!session) return state;
        
        const newSessions = new Map(state.sessions);
        newSessions.set(sessionId, { ...session, ...updates });
        return { sessions: newSessions };
      }),
      
      removeSession: (sessionId) => set((state) => {
        const newSessions = new Map(state.sessions);
        newSessions.delete(sessionId);
        return { sessions: newSessions };
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
