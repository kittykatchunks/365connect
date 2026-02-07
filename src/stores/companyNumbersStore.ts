// ============================================
// Company Numbers Store - Outbound CLI Management
// ============================================

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { CompanyNumber, CompanyNumberFormData } from '@/types/companyNumber';
import { sortCompanyNumbers, validateCompanyNumber, findCompanyByNumber } from '@/types/companyNumber';
import { phantomApiService } from '@/services';
import { isVerboseLoggingEnabled } from '@/utils';

interface CompanyNumbersState {
  // Data
  numbers: CompanyNumber[];
  
  // CLI State
  currentCompany: CompanyNumber | null; // Active CLI on PBX
  pendingCompany: CompanyNumber | null; // Selected but not confirmed
  
  // UI state
  searchQuery: string;
  selectedNumberId: number | null;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  
  // Computed
  filteredNumbers: CompanyNumber[];
  
  // Actions
  setSearchQuery: (query: string) => void;
  setSelectedNumber: (id: number | null) => void;
  
  // CLI Actions
  setPendingCompany: (company: CompanyNumber | null) => void;
  setCurrentCompany: (company: CompanyNumber | null) => void;
  confirmCliChange: (makeCallFn: (target: string) => Promise<any>) => Promise<boolean>;
  syncCurrentCliFromAgentData: (agentData: { cid?: string }) => void;
  
  // CRUD
  addNumber: (data: CompanyNumberFormData) => string | null;
  updateNumber: (company_id: number, data: Partial<CompanyNumberFormData>) => string | null;
  deleteNumber: (company_id: number) => void;
  deleteAllNumbers: () => void;
  
  // API Integration
  fetchFromAPI: () => Promise<void>;
  syncWithConfirmation: (phantomId: string, onConfirm?: (apiData: CompanyNumber[], localData: CompanyNumber[]) => Promise<boolean>) => Promise<{ needsConfirmation: boolean; identical: boolean; apiData?: CompanyNumber[] }>;
  compareWithApi: (apiData: CompanyNumber[], localData: CompanyNumber[]) => boolean;
  replaceWithApiData: (apiData: CompanyNumber[]) => void;
  setNumbers: (numbers: CompanyNumber[]) => void;
  
  // Helpers
  getNextAvailableId: () => number;
  isIdAvailable: (id: number) => boolean;
  getCompanyById: (id: number) => CompanyNumber | undefined;
}

function filterNumbers(numbers: CompanyNumber[], query: string): CompanyNumber[] {
  if (!query.trim()) return numbers;
  
  const lowerQuery = query.toLowerCase();
  return numbers.filter((num) =>
    num.name.toLowerCase().includes(lowerQuery) ||
    num.cid.includes(query) ||
    num.company_id.toString() === query
  );
}

export const useCompanyNumbersStore = create<CompanyNumbersState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        numbers: [],
        currentCompany: null,
        pendingCompany: null,
        searchQuery: '',
        selectedNumberId: null,
        isLoading: false,
        isSyncing: false,
        error: null,
        filteredNumbers: [],
        
        // Search
        setSearchQuery: (searchQuery) => {
          const numbers = get().numbers;
          const sorted = sortCompanyNumbers(numbers);
          const filteredNumbers = filterNumbers(sorted, searchQuery);
          set({ searchQuery, filteredNumbers });
        },
        
        setSelectedNumber: (selectedNumberId) => set({ selectedNumberId }),
        
        // ==================== CLI Actions ====================
        
        setPendingCompany: (pendingCompany) => {
          const verboseLogging = isVerboseLoggingEnabled();
          if (verboseLogging) {
            console.log('[CompanyNumbersStore] Setting pending company:', pendingCompany);
          }
          set({ pendingCompany });
        },
        
        setCurrentCompany: (currentCompany) => {
          const verboseLogging = isVerboseLoggingEnabled();
          if (verboseLogging) {
            console.log('[CompanyNumbersStore] Setting current company:', currentCompany);
          }
          set({ currentCompany, pendingCompany: null });
        },
        
        confirmCliChange: async (makeCallFn: (target: string) => Promise<any>) => {
          const verboseLogging = isVerboseLoggingEnabled();
          const { pendingCompany } = get();
          
          if (!pendingCompany) {
            if (verboseLogging) {
              console.warn('[CompanyNumbersStore] No pending company to confirm');
            }
            return false;
          }
          
          try {
            // Dial the CLI change code: *82*{company_id}
            const cliCode = `*82*${pendingCompany.company_id}`;
            
            if (verboseLogging) {
              console.log('[CompanyNumbersStore] 📞 Changing CLI to company:', pendingCompany);
              console.log('[CompanyNumbersStore] 📞 Dialing CLI code:', cliCode);
            }
            
            await makeCallFn(cliCode);
            
            // Set as current company
            set({ currentCompany: pendingCompany, pendingCompany: null });
            
            if (verboseLogging) {
              console.log('[CompanyNumbersStore] ✅ CLI changed successfully to:', pendingCompany.name);
            }
            
            return true;
          } catch (error) {
            if (verboseLogging) {
              console.error('[CompanyNumbersStore] ❌ CLI change failed:', error);
            }
            set({ error: error instanceof Error ? error.message : 'Failed to change CLI' });
            return false;
          }
        },
        
        syncCurrentCliFromAgentData: (agentData: { cid?: string }) => {
          const verboseLogging = isVerboseLoggingEnabled();
          const { numbers } = get();
          
          if (!agentData.cid) {
            if (verboseLogging) {
              console.log('[CompanyNumbersStore] No cid in agent data');
            }
            return;
          }
          
          if (verboseLogging) {
            console.log('[CompanyNumbersStore] Syncing current CLI from agent data, cid:', agentData.cid);
          }
          
          // Try to find matching company by telephone number
          const matchingCompany = findCompanyByNumber(numbers, agentData.cid);
          
          if (matchingCompany) {
            if (verboseLogging) {
              console.log('[CompanyNumbersStore] ✅ Found matching company for cid:', matchingCompany);
            }
            set({ currentCompany: matchingCompany, pendingCompany: null });
          } else {
            if (verboseLogging) {
              console.log('[CompanyNumbersStore] No matching company found for cid:', agentData.cid);
            }
            // Clear current selection if cid doesn't match any stored company
            set({ currentCompany: null });
          }
        },
        
        // ==================== CRUD Operations ====================

        addNumber: (data) => {
          const validationError = validateCompanyNumber(data);
          if (validationError) return validationError;
          
          // Check if ID already exists
          const exists = get().numbers.some((n) => n.company_id === data.company_id);
          if (exists) return `Company ID ${data.company_id} already exists`;
          
          const newNumber: CompanyNumber = {
            company_id: data.company_id,
            name: data.name.trim(),
            cid: data.cid.trim()
          };
          
          set((state) => {
            const numbers = [...state.numbers, newNumber];
            const sorted = sortCompanyNumbers(numbers);
            const filteredNumbers = filterNumbers(sorted, state.searchQuery);
            return { numbers, filteredNumbers, error: null };
          });
          
          return null;
        },
        
        // Update company number
        updateNumber: (company_id, data) => {
          // Validate if data provided
          if (data.company_id !== undefined || data.name !== undefined || data.cid !== undefined) {
            const current = get().numbers.find((n) => n.company_id === company_id);
            if (current) {
              const merged = { ...current, ...data };
              const validationError = validateCompanyNumber(merged);
              if (validationError) return validationError;
            }
          }
          
          set((state) => {
            const numbers = state.numbers.map((num) =>
              num.company_id === company_id
                ? { 
                    ...num, 
                    ...(data.name !== undefined && { name: data.name.trim() }),
                    ...(data.cid !== undefined && { cid: data.cid.trim() })
                  }
                : num
            );
            const sorted = sortCompanyNumbers(numbers);
            const filteredNumbers = filterNumbers(sorted, state.searchQuery);
            return { numbers, filteredNumbers, error: null };
          });
          
          return null;
        },
        
        // Delete company number
        deleteNumber: (company_id) => {
          set((state) => {
            const numbers = state.numbers.filter((n) => n.company_id !== company_id);
            const sorted = sortCompanyNumbers(numbers);
            const filteredNumbers = filterNumbers(sorted, state.searchQuery);
            return {
              numbers,
              filteredNumbers,
              selectedNumberId: state.selectedNumberId === company_id ? null : state.selectedNumberId
            };
          });
        },
        
        // Delete all numbers
        deleteAllNumbers: () => {
          set({
            numbers: [],
            filteredNumbers: [],
            selectedNumberId: null,
            searchQuery: ''
          });
        },
        
        // Set numbers (e.g., from API)
        setNumbers: (numbers) => {
          const sorted = sortCompanyNumbers(numbers);
          const filteredNumbers = filterNumbers(sorted, get().searchQuery);
          set({ numbers, filteredNumbers, error: null });
        },
        
        // ==================== API Sync Methods ====================
        
        // Compare API data with local data
        compareWithApi: (apiData: CompanyNumber[], localData: CompanyNumber[]) => {
          const verboseLogging = isVerboseLoggingEnabled();
          
          // Quick check: compare counts first
          if (apiData.length !== localData.length) {
            if (verboseLogging) {
              console.log('[CompanyNumbersStore] Different counts - API:', apiData.length, 'Local:', localData.length);
            }
            return false;
          }
          
          // If both empty, they're identical
          if (apiData.length === 0) {
            return true;
          }
          
          // Deep comparison: check each entry exists in both arrays
          for (const apiEntry of apiData) {
            const match = localData.find(localEntry =>
              localEntry.company_id === apiEntry.company_id &&
              localEntry.cid === apiEntry.cid &&
              localEntry.name === apiEntry.name
            );
            
            if (!match) {
              if (verboseLogging) {
                console.log('[CompanyNumbersStore] Entry not found in local storage:', apiEntry);
              }
              return false;
            }
          }
          
          if (verboseLogging) {
            console.log('[CompanyNumbersStore] ✅ All entries match between API and local storage');
          }
          return true;
        },
        
        // Replace local data with API data
        replaceWithApiData: (apiData: CompanyNumber[]) => {
          const verboseLogging = isVerboseLoggingEnabled();
          
          if (verboseLogging) {
            console.log('[CompanyNumbersStore] 📥 Replacing company numbers with API data:', apiData.length, 'entries');
          }
          
          const sorted = sortCompanyNumbers(apiData);
          const filteredNumbers = filterNumbers(sorted, get().searchQuery);
          
          set({ 
            numbers: apiData, 
            filteredNumbers, 
            error: null 
          });
          
          if (verboseLogging) {
            console.log('[CompanyNumbersStore] ✅ Successfully replaced company numbers with API data');
          }
        },
        
        // Sync with confirmation - returns status for UI to show confirmation modal
        syncWithConfirmation: async (
          phantomId: string,
          onConfirm?: (apiData: CompanyNumber[], localData: CompanyNumber[]) => Promise<boolean>
        ) => {
          const verboseLogging = isVerboseLoggingEnabled();
          
          set({ isSyncing: true, error: null });
          
          try {
            if (verboseLogging) {
              console.log('[CompanyNumbersStore] 📡 Starting API sync for PhantomID:', phantomId);
            }
            
            // Fetch from authenticated API endpoint (Basic Auth)
            const result = await phantomApiService.get<{ company_numbers?: CompanyNumber[] }>('companyNumbers');
            
            if (!result.success || !result.data?.company_numbers) {
              const errorMsg = result.error || 'Unable to retrieve company numbers from server';
              if (verboseLogging) {
                console.warn('[CompanyNumbersStore] No company numbers returned from API:', errorMsg);
              }
              set({ isSyncing: false, error: errorMsg });
              return { needsConfirmation: false, identical: false };
            }
            
            const apiData = result.data.company_numbers;
            const localData = get().numbers;
            
            if (verboseLogging) {
              console.log('[CompanyNumbersStore] 📦 Received', apiData.length, 'company numbers from API');
            }
            
            // Compare with local storage
            const isIdentical = get().compareWithApi(apiData, localData);
            
            if (isIdentical) {
              if (verboseLogging) {
                console.log('[CompanyNumbersStore] ✅ Company numbers are up to date');
              }
              set({ isSyncing: false });
              return { needsConfirmation: false, identical: true };
            }
            
            // Data is different
            if (verboseLogging) {
              console.log('[CompanyNumbersStore] ⚠️ Company numbers differ from API');
            }
            
            // If onConfirm provided, call it
            if (onConfirm) {
              const confirmed = await onConfirm(apiData, localData);
              
              if (confirmed) {
                get().replaceWithApiData(apiData);
                set({ isSyncing: false });
                return { needsConfirmation: false, identical: false, apiData };
              } else {
                if (verboseLogging) {
                  console.log('[CompanyNumbersStore] User cancelled sync');
                }
                set({ isSyncing: false });
                return { needsConfirmation: false, identical: false };
              }
            }
            
            // No onConfirm provided, return status for UI to handle
            set({ isSyncing: false });
            return { needsConfirmation: true, identical: false, apiData };
            
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to sync with API';
            if (verboseLogging) {
              console.error('[CompanyNumbersStore] ❌ API sync failed:', error);
            }
            set({ isSyncing: false, error: message });
            return { needsConfirmation: false, identical: false };
          }
        },
        
        // Fetch from API (simple version without comparison)
        fetchFromAPI: async () => {
          const verboseLogging = isVerboseLoggingEnabled();
          set({ isLoading: true, error: null });
          
          try {
            if (verboseLogging) {
              console.log('[CompanyNumbersStore] 📡 Fetching company numbers from API...');
            }
            
            // Use authenticated endpoint (Basic Auth, port 443)
            const result = await phantomApiService.get<{ company_numbers?: CompanyNumber[] }>('companyNumbers');
            
            if (!result.success) {
              throw new Error(result.error || 'Failed to fetch company numbers');
            }
            
            const numbers: CompanyNumber[] = result.data?.company_numbers || [];
            
            if (verboseLogging) {
              console.log('[CompanyNumbersStore] 📦 Received', numbers.length, 'company numbers from API');
            }
            
            const sorted = sortCompanyNumbers(numbers);
            const filteredNumbers = filterNumbers(sorted, get().searchQuery);
            
            set({ 
              numbers, 
              filteredNumbers,
              isLoading: false, 
              error: null 
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch company numbers';
            if (verboseLogging) {
              console.error('[CompanyNumbersStore] ❌ Fetch failed:', error);
            }
            set({ isLoading: false, error: message });
          }
        },
        
        // ==================== Helper Methods ====================
        
        getCompanyById: (id: number) => {
          return get().numbers.find((n) => n.company_id === id);
        },
        
        // Get next available ID
        getNextAvailableId: () => {
          const usedIds = new Set(get().numbers.map((n) => n.company_id));
          for (let i = 1; i <= 99; i++) {
            if (!usedIds.has(i)) return i;
          }
          return 99; // Max ID
        },
        
        // Check if ID is available
        isIdAvailable: (id) => {
          return !get().numbers.some((n) => n.company_id === id);
        }
      }),
      {
        name: 'company-numbers-store',
        partialize: (state) => ({
          numbers: state.numbers,
          currentCompany: state.currentCompany
        }),
        onRehydrateStorage: () => (state) => {
          if (state) {
            const sorted = sortCompanyNumbers(state.numbers);
            state.filteredNumbers = filterNumbers(sorted, state.searchQuery);
          }
        }
      }
    ),
    { name: 'company-numbers-store' }
  )
);
