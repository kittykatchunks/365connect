// ============================================
// BLF Store - BLF Button Configuration (Persisted)
// ============================================

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { BLFButton, BLFButtonConfig, BLFPresenceState } from '@/types';
import { createEmptyBLFButtons, BLF_BUTTON_COUNT, BLF_LEFT_COUNT } from '@/types';

interface BLFState {
  // Button configurations
  buttons: BLFButton[];
  
  // Actions
  setButton: (index: number, config: BLFButtonConfig) => void;
  clearButton: (index: number) => void;
  updateButtonState: (extension: string, state: BLFPresenceState) => void;
  resetAllButtons: () => void;
  importButtons: (buttons: BLFButton[]) => void;
  
  // Computed
  getLeftButtons: () => BLFButton[];
  getRightButtons: () => BLFButton[];
  getConfiguredExtensions: () => string[];
  isButtonConfigured: (index: number) => boolean;
}

export const useBLFStore = create<BLFState>()(
  devtools(
    persist(
      (set, get) => ({
        buttons: createEmptyBLFButtons(),
        
        setButton: (index, config) => set((state) => {
          if (index < 1 || index > BLF_BUTTON_COUNT) return state;
          
          const newButtons: BLFButton[] = state.buttons.map((button) =>
            button.index === index
              ? { ...button, ...config, state: 'inactive' as const }
              : button
          );
          return { buttons: newButtons };
        }),
        
        clearButton: (index) => set((state) => {
          if (index < 1 || index > BLF_BUTTON_COUNT) return state;
          
          const newButtons: BLFButton[] = state.buttons.map((button) =>
            button.index === index
              ? { index, type: 'blf' as const, extension: '', displayName: '', state: 'inactive' as const }
              : button
          );
          return { buttons: newButtons };
        }),
        
        updateButtonState: (extension, newState) => set((state) => {
          if (!extension) return state;
          
          const newButtons: BLFButton[] = state.buttons.map((button) =>
            button.extension === extension
              ? { ...button, state: newState }
              : button
          );
          return { buttons: newButtons };
        }),
        
        resetAllButtons: () => set({ buttons: createEmptyBLFButtons() }),
        
        importButtons: (buttons) => set({ 
          buttons: buttons.length === BLF_BUTTON_COUNT 
            ? buttons 
            : createEmptyBLFButtons() 
        }),
        
        // Computed
        getLeftButtons: () => {
          return get().buttons.filter(b => b.index <= BLF_LEFT_COUNT);
        },
        
        getRightButtons: () => {
          return get().buttons.filter(b => b.index > BLF_LEFT_COUNT);
        },
        
        getConfiguredExtensions: () => {
          return get().buttons
            .filter(b => b.extension && b.type === 'blf')
            .map(b => b.extension);
        },
        
        isButtonConfigured: (index) => {
          const button = get().buttons.find(b => b.index === index);
          return !!button?.extension;
        }
      }),
      {
        name: 'blf-store',
        partialize: (state) => ({
          buttons: state.buttons.map(({ index, type, extension, displayName }) => ({
            index,
            type,
            extension,
            displayName,
            state: 'inactive' as BLFPresenceState
          }))
        })
      }
    ),
    { name: 'blf-store' }
  )
);
