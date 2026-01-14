// ============================================
// UI Store - Theme, Modals, Notifications
// ============================================

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'auto';
export type AccentColor = 'blue' | 'green' | 'purple' | 'orange' | 'red';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
}

export interface Modal {
  id: string;
  component: string;
  props?: Record<string, unknown>;
  closable?: boolean;
}

interface UIState {
  // Theme
  theme: Theme;
  accentColor: AccentColor;
  effectiveTheme: 'light' | 'dark';
  
  // Notifications
  notifications: Notification[];
  
  // Modals
  modals: Modal[];
  
  // Dialpad
  dialpadOpen: boolean;
  dialpadValue: string;
  
  // Sidebar
  sidebarCollapsed: boolean;
  
  // Actions - Theme
  setTheme: (theme: Theme) => void;
  setAccentColor: (color: AccentColor) => void;
  setEffectiveTheme: (theme: 'light' | 'dark') => void;
  
  // Actions - Notifications
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // Actions - Modals
  openModal: (modal: Omit<Modal, 'id'>) => string;
  closeModal: (id: string) => void;
  closeAllModals: () => void;
  
  // Actions - Dialpad
  toggleDialpad: () => void;
  setDialpadValue: (value: string) => void;
  appendDialpadValue: (digit: string) => void;
  clearDialpad: () => void;
  
  // Actions - Sidebar
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        theme: 'auto',
        accentColor: 'blue',
        effectiveTheme: 'light',
        notifications: [],
        modals: [],
        dialpadOpen: true,
        dialpadValue: '',
        sidebarCollapsed: false,
        
        // Theme actions
        setTheme: (theme) => set({ theme }),
        setAccentColor: (color) => set({ accentColor: color }),
        setEffectiveTheme: (effectiveTheme) => set({ effectiveTheme }),
        
        // Notification actions
        addNotification: (notification) => {
          const id = generateId();
          set((state) => ({
            notifications: [...state.notifications, { ...notification, id }]
          }));
          
          // Auto-remove non-persistent notifications
          if (!notification.persistent) {
            const duration = notification.duration ?? 5000;
            setTimeout(() => {
              get().removeNotification(id);
            }, duration);
          }
          
          return id;
        },
        
        removeNotification: (id) => set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id)
        })),
        
        clearNotifications: () => set({ notifications: [] }),
        
        // Modal actions
        openModal: (modal) => {
          const id = generateId();
          set((state) => ({
            modals: [...state.modals, { ...modal, id }]
          }));
          return id;
        },
        
        closeModal: (id) => set((state) => ({
          modals: state.modals.filter((m) => m.id !== id)
        })),
        
        closeAllModals: () => set({ modals: [] }),
        
        // Dialpad actions
        toggleDialpad: () => set((state) => ({ dialpadOpen: !state.dialpadOpen })),
        setDialpadValue: (value) => set({ dialpadValue: value }),
        appendDialpadValue: (digit) => set((state) => ({
          dialpadValue: state.dialpadValue + digit
        })),
        clearDialpad: () => set({ dialpadValue: '' }),
        
        // Sidebar actions
        toggleSidebar: () => set((state) => ({
          sidebarCollapsed: !state.sidebarCollapsed
        })),
        setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed })
      }),
      {
        name: 'ui-store',
        partialize: (state) => ({
          theme: state.theme,
          accentColor: state.accentColor,
          sidebarCollapsed: state.sidebarCollapsed
        })
      }
    ),
    { name: 'ui-store' }
  )
);

// ============================================
// Theme Watcher - Sync effective theme
// ============================================

export function initializeThemeWatcher() {
  const { theme, setEffectiveTheme } = useUIStore.getState();
  
  const updateEffectiveTheme = (currentTheme: Theme) => {
    if (currentTheme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setEffectiveTheme(prefersDark ? 'dark' : 'light');
    } else {
      setEffectiveTheme(currentTheme);
    }
  };
  
  // Initial set
  updateEffectiveTheme(theme);
  
  // Watch system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => {
    const currentTheme = useUIStore.getState().theme;
    if (currentTheme === 'auto') {
      updateEffectiveTheme('auto');
    }
  };
  
  mediaQuery.addEventListener('change', handler);
  
  // Subscribe to theme changes - use Zustand v4 API
  const unsubscribe = useUIStore.subscribe((state) => {
    updateEffectiveTheme(state.theme);
  });
  
  return () => {
    mediaQuery.removeEventListener('change', handler);
    unsubscribe();
  };
}
