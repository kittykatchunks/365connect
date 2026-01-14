// ============================================
// Call History Store - Call Record Management
// ============================================

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { CallRecord, CallDirection, CallStatus, CallHistoryGroup } from '@/types/callHistory';
import { createCallRecordId, groupCallHistory } from '@/types/callHistory';

type FilterType = 'all' | 'incoming' | 'outgoing' | 'missed';

interface CallHistoryState {
  // Data
  records: CallRecord[];
  
  // UI state
  filter: FilterType;
  
  // Computed
  filteredRecords: CallRecord[];
  groupedRecords: CallHistoryGroup[];
  
  // Stats
  totalCalls: number;
  missedCalls: number;
  
  // Actions
  setFilter: (filter: FilterType) => void;
  
  // CRUD
  addRecord: (record: Omit<CallRecord, 'id'>) => CallRecord;
  deleteRecord: (id: string) => void;
  clearHistory: () => void;
  
  // Helper to add from session data
  addCallFromSession: (
    number: string,
    name: string | null,
    direction: CallDirection,
    duration: number,
    status: CallStatus
  ) => void;
  
  // Mark missed calls as seen
  markMissedAsSeen: () => void;
}

function applyFilter(records: CallRecord[], filter: FilterType): CallRecord[] {
  if (filter === 'all') return records;
  
  return records.filter((record) => {
    switch (filter) {
      case 'incoming':
        return record.direction === 'incoming' && record.status !== 'missed';
      case 'outgoing':
        return record.direction === 'outgoing';
      case 'missed':
        return record.status === 'missed';
      default:
        return true;
    }
  });
}

const MAX_RECORDS = 500; // Limit stored records

export const useCallHistoryStore = create<CallHistoryState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        records: [],
        filter: 'all',
        filteredRecords: [],
        groupedRecords: [],
        totalCalls: 0,
        missedCalls: 0,
        
        // Set filter
        setFilter: (filter) => {
          const records = get().records;
          const filteredRecords = applyFilter(records, filter);
          const groupedRecords = groupCallHistory(filteredRecords);
          set({ filter, filteredRecords, groupedRecords });
        },
        
        // Add record
        addRecord: (recordData) => {
          const newRecord: CallRecord = {
            id: createCallRecordId(),
            ...recordData
          };
          
          set((state) => {
            // Add to beginning and limit total
            let records = [newRecord, ...state.records];
            if (records.length > MAX_RECORDS) {
              records = records.slice(0, MAX_RECORDS);
            }
            
            const filteredRecords = applyFilter(records, state.filter);
            const groupedRecords = groupCallHistory(filteredRecords);
            const missedCalls = records.filter((r) => r.status === 'missed').length;
            
            return {
              records,
              filteredRecords,
              groupedRecords,
              totalCalls: records.length,
              missedCalls
            };
          });
          
          return newRecord;
        },
        
        // Delete single record
        deleteRecord: (id) => {
          set((state) => {
            const records = state.records.filter((r) => r.id !== id);
            const filteredRecords = applyFilter(records, state.filter);
            const groupedRecords = groupCallHistory(filteredRecords);
            const missedCalls = records.filter((r) => r.status === 'missed').length;
            
            return {
              records,
              filteredRecords,
              groupedRecords,
              totalCalls: records.length,
              missedCalls
            };
          });
        },
        
        // Clear all history
        clearHistory: () => {
          set({
            records: [],
            filteredRecords: [],
            groupedRecords: [],
            totalCalls: 0,
            missedCalls: 0
          });
        },
        
        // Helper to add from session data
        addCallFromSession: (number, name, direction, duration, status) => {
          get().addRecord({
            number,
            name,
            direction,
            duration,
            status,
            timestamp: Date.now()
          });
        },
        
        // Mark missed as seen (for badge clearing)
        markMissedAsSeen: () => {
          // Could be used to clear a "new missed calls" counter
          // For now just a placeholder
        }
      }),
      {
        name: 'call-history-store',
        partialize: (state) => ({
          records: state.records
        }),
        onRehydrateStorage: () => (state) => {
          // Re-compute filtered/grouped records after rehydration
          if (state) {
            state.filteredRecords = applyFilter(state.records, state.filter);
            state.groupedRecords = groupCallHistory(state.filteredRecords);
            state.totalCalls = state.records.length;
            state.missedCalls = state.records.filter((r) => r.status === 'missed').length;
          }
        }
      }
    ),
    { name: 'call-history-store' }
  )
);
