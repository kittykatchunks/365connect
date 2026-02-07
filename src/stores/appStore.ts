// ============================================
// App Store - Global Application State
// ============================================

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { ViewType } from '@/types';
import { isVerboseLoggingEnabled } from '@/utils';

// Agent state types
type AgentState = 'logged-out' | 'available' | 'paused' | 'on-call';
type QueueState = 'none' | 'in-queue' | 'paused';

// Logged in queue membership type
export interface LoggedInQueue {
  /** Queue number/extension */
  queue: string;
  /** Queue display name/label */
  queuelabel: string;
}

// Company number type
interface CompanyNumber {
  id: string;
  number: string;
  name: string;
  isDefault?: boolean;
}

interface AppState {
  // Initialization
  initialized: boolean;
  loading: boolean;
  loadingMessage: string;
  
  // Navigation
  currentView: ViewType;
  openSettingsWithConnection: boolean; // Flag to open connection settings when navigating to settings
  pendingDialNumber: string | null; // Number to pre-populate in dial input when switching to dial tab
  
  // Agent state
  agentState: AgentState;
  queueState: QueueState;
  agentNumber: string;
  agentName: string | null;
  loggedInQueues: LoggedInQueue[]; // Queues the agent is currently logged into
  
  // Company numbers / CLI
  companyNumbers: CompanyNumber[];
  selectedCLI: string | null;
  
  // Actions
  setInitialized: (value: boolean) => void;
  setLoading: (loading: boolean, message?: string) => void;
  setCurrentView: (view: ViewType) => void;
  setOpenSettingsWithConnection: (value: boolean) => void;
  setPendingDialNumber: (number: string | null) => void;
  switchToDialWithNumber: (number: string) => void;
  
  // Agent actions
  setAgentState: (state: AgentState) => void;
  setQueueState: (state: QueueState) => void;
  setAgentNumber: (number: string) => void;
  setAgentName: (name: string | null) => void;
  setLoggedInQueues: (queues: LoggedInQueue[]) => void;
  agentLogin: (agentNumber: string, agentName?: string | null) => void;
  agentLogout: () => void;
  
  // Company number actions
  setCompanyNumbers: (numbers: CompanyNumber[]) => void;
  setSelectedCLI: (id: string | null) => void;
  fetchCompanyNumbers: () => Promise<void>;
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        initialized: false,
        loading: true,
        loadingMessage: 'Loading Autocab365 Connect',
        currentView: 'dial',
        openSettingsWithConnection: false,
        pendingDialNumber: null,
        
        // Agent initial state
        agentState: 'logged-out',
        queueState: 'none',
        agentNumber: '',
        agentName: null,
        loggedInQueues: [],
        
        // Company numbers initial state
        companyNumbers: [],
        selectedCLI: null,
        
        // Actions
        setInitialized: (value) => set({ initialized: value }),
        
        setLoading: (loading, message) => set({ 
          loading, 
          loadingMessage: message || 'Loading...' 
        }),
        
        setCurrentView: (view) => set({ currentView: view }),
        
        setOpenSettingsWithConnection: (value) => set({ openSettingsWithConnection: value }),
        
        setPendingDialNumber: (number) => set({ pendingDialNumber: number }),
        
        switchToDialWithNumber: (number) => {
          set({ 
            currentView: 'dial', 
            pendingDialNumber: number 
          });
        },
        
        // Agent actions
        setAgentState: (agentState) => set({ agentState }),
        setQueueState: (queueState) => {
          const verboseLogging = typeof window !== 'undefined' && localStorage.getItem('verboseLogging') === 'true';
          if (verboseLogging) {
            console.log('[AppStore] 🔄 setQueueState called:', queueState, '| Stack:', new Error().stack?.split('\n')[2]);
          }
          set({ queueState });
        },
        setAgentNumber: (agentNumber) => set({ agentNumber }),
        setAgentName: (agentName) => set({ agentName }),
        setLoggedInQueues: (loggedInQueues) => set({ loggedInQueues }),
        
        agentLogin: (agentNumber, agentName = null) => set({ 
          agentState: 'available', 
          agentNumber,
          agentName
        }),
        
        agentLogout: () => {
          const verboseLogging = isVerboseLoggingEnabled();
          if (verboseLogging) {
            console.log('[appStore] 🚪 Agent logout - clearing all agent state');
          }
          set({ 
            agentState: 'logged-out', 
            queueState: 'none', 
            agentNumber: '',
            agentName: null,
            loggedInQueues: []
          });
          if (verboseLogging) {
            console.log('[appStore] 📊 Queue membership updated (logout):', { queues: [], queueCount: 0, queueState: 'none' });
          }
        },
        
        // Company number actions
        setCompanyNumbers: (companyNumbers) => set({ companyNumbers }),
        
        setSelectedCLI: (selectedCLI) => set({ selectedCLI }),
        
        fetchCompanyNumbers: async () => {
          // This would call the Phantom API to get company numbers
          // For now, just a placeholder
          // const response = await fetch('/api/company-numbers');
          // const data = await response.json();
          // set({ companyNumbers: data });
          console.log('fetchCompanyNumbers called - implement with API');
        }
      }),
      {
        name: 'app-store',
        partialize: (state) => ({
          agentNumber: state.agentNumber,
          // queueState should NOT be persisted - it must be fetched fresh on reconnection
          // to ensure accurate queue membership status from the PBX
          selectedCLI: state.selectedCLI
        })
      }
    ),
    { name: 'app-store' }
  )
);
