/**
 * Theme Configuration - React Native
 * Color schemes and styling utilities
 */
import { useColorScheme } from 'react-native';

export const lightTheme = {
  // Primary colors
  primary: '#3182ce',
  primaryHover: '#2563eb',
  primaryLight: '#60a5fa',
  primaryDark: '#1e40af',
  
  // Background colors
  background: '#ffffff',
  surface: '#f3f4f6',
  surfaceHover: '#e5e7eb',
  
  // Text colors
  text: '#111827',
  textSecondary: '#6b7280',
  textTertiary: '#9ca3af',
  textInverse: '#ffffff',
  
  // Border colors
  border: '#e5e7eb',
  borderHover: '#d1d5db',
  
  // Status colors
  success: '#10b981',
  successLight: '#34d399',
  warning: '#f59e0b',
  warningLight: '#fbbf24',
  error: '#ef4444',
  errorLight: '#f87171',
  info: '#3b82f6',
  infoLight: '#60a5fa',
  
  // Call status colors
  calling: '#3b82f6',
  answered: '#10b981',
  busy: '#ef4444',
  missed: '#f59e0b',
  
  // Shadows
  shadow: 'rgba(0, 0, 0, 0.1)',
  shadowDark: 'rgba(0, 0, 0, 0.2)',
};

export const darkTheme = {
  // Primary colors
  primary: '#60a5fa',
  primaryHover: '#3b82f6',
  primaryLight: '#93c5fd',
  primaryDark: '#2563eb',
  
  // Background colors
  background: '#111827',
  surface: '#1f2937',
  surfaceHover: '#374151',
  
  // Text colors
  text: '#f9fafb',
  textSecondary: '#9ca3af',
  textTertiary: '#6b7280',
  textInverse: '#111827',
  
  // Border colors
  border: '#374151',
  borderHover: '#4b5563',
  
  // Status colors
  success: '#34d399',
  successLight: '#6ee7b7',
  warning: '#fbbf24',
  warningLight: '#fcd34d',
  error: '#f87171',
  errorLight: '#fca5a5',
  info: '#60a5fa',
  infoLight: '#93c5fd',
  
  // Call status colors
  calling: '#60a5fa',
  answered: '#34d399',
  busy: '#f87171',
  missed: '#fbbf24',
  
  // Shadows
  shadow: 'rgba(0, 0, 0, 0.3)',
  shadowDark: 'rgba(0, 0, 0, 0.5)',
};

export type Theme = typeof lightTheme;
export type ThemeMode = 'light' | 'dark' | 'auto';

/**
 * Hook to get current theme based on system preference or user selection
 */
export function useTheme(mode: ThemeMode = 'auto'): Theme {
  const systemColorScheme = useColorScheme();
  
  if (mode === 'auto') {
    return systemColorScheme === 'dark' ? darkTheme : lightTheme;
  }
  
  return mode === 'dark' ? darkTheme : lightTheme;
}

/**
 * Common spacing values
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

/**
 * Common border radius values
 */
export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

/**
 * Typography sizes
 */
export const typography = {
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};
