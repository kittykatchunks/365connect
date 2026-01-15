// ============================================
// Company Numbers Store - Outbound CLI Management
// ============================================

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { CompanyNumber, CompanyNumberFormData } from '@/types/companyNumber';
import { sortCompanyNumbers, validateCompanyNumber } from '@/types/companyNumber';

interface CompanyNumbersState {
  // Data
  numbers: CompanyNumber[];
  
  // UI state
  searchQuery: string;
  selectedNumberId: number | null;
  isLoading: boolean;
  error: string | null;
  
  // Computed
  filteredNumbers: CompanyNumber[];
  
  // Actions
  setSearchQuery: (query: string) => void;
  setSelectedNumber: (id: number | null) => void;
  
  // CRUD
  addNumber: (data: CompanyNumberFormData) => string | null;
  updateNumber: (company_id: number, data: Partial<CompanyNumberFormData>) => string | null;
  deleteNumber: (company_id: number) => void;
  deleteAllNumbers: () => void;
  
  // API Integration
  fetchFromAPI: (phantomId: string) => Promise<void>;
  setNumbers: (numbers: CompanyNumber[]) => void;
  
  // Helpers
  getNextAvailableId: () => number;
  isIdAvailable: (id: number) => boolean;
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
        searchQuery: '',
        selectedNumberId: null,
        isLoading: false,
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
        
        // Add company number
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
        
        // Fetch from Phantom API
        fetchFromAPI: async (phantomId) => {
          set({ isLoading: true, error: null });
          
          try {
            // Build API URL
            const apiUrl = `https://api-${phantomId}.phantomapi.net/company`;
            
            const response = await fetch(apiUrl, {
              method: 'GET',
              headers: {
                'Accept': 'application/json'
              }
            });
            
            if (!response.ok) {
              throw new Error(`API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            // API returns array of { company_id, name, cid }
            const numbers: CompanyNumber[] = Array.isArray(data) ? data : [];
            
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
            set({ isLoading: false, error: message });
          }
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
          numbers: state.numbers
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
