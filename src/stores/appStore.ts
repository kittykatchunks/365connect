// ============================================
// App Store - Global Application State
// ============================================

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { ViewType } from '@/types';

// Agent state types
type AgentState = 'logged-out' | 'available' | 'paused' | 'on-call';
type QueueState = 'none' | 'in-queue' | 'paused';

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
  
  // Agent state
  agentState: AgentState;
  queueState: QueueState;
  agentNumber: string;
  agentName: string | null;
  
  // Company numbers / CLI
  companyNumbers: CompanyNumber[];
  selectedCLI: string | null;
  
  // Actions
  setInitialized: (value: boolean) => void;
  setLoading: (loading: boolean, message?: string) => void;
  setCurrentView: (view: ViewType) => void;
  setOpenSettingsWithConnection: (value: boolean) => void;
  
  // Agent actions
  setAgentState: (state: AgentState) => void;
  setQueueState: (state: QueueState) => void;
  setAgentNumber: (number: string) => void;
  setAgentName: (name: string | null) => void;
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
        
        // Agent initial state
        agentState: 'logged-out',
        queueState: 'none',
        agentNumber: '',
        agentName: null,
        
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
        
        // Agent actions
        setAgentState: (agentState) => set({ agentState }),
        setQueueState: (queueState) => set({ queueState }),
        setAgentNumber: (agentNumber) => set({ agentNumber }),
        setAgentName: (agentName) => set({ agentName }),
        
        agentLogin: (agentNumber, agentName = null) => set({ 
          agentState: 'available', 
          agentNumber,
          agentName
        }),
        
        agentLogout: () => set({ 
          agentState: 'logged-out', 
          queueState: 'none', 
          agentNumber: '',
          agentName: null
        }),
        
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
          selectedCLI: state.selectedCLI
        })
      }
    ),
    { name: 'app-store' }
  )
);
