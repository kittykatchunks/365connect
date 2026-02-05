/**
 * Version and Logging Utilities - React Native
 * Ported from PWA version
 */
import { getStorageItem } from './storage';

/**
 * Check if verbose logging is enabled
 */
export function isVerboseLoggingEnabled(): boolean {
  // Check cached value for synchronous access
  // Must be initialized on app start
  if (typeof global.__VERBOSE_LOGGING__ !== 'undefined') {
    return global.__VERBOSE_LOGGING__;
  }
  return false;
}

/**
 * Initialize verbose logging setting (call on app start)
 */
export async function initializeVerboseLogging(): Promise<void> {
  const value = await getStorageItem('VerboseLogging', false);
  global.__VERBOSE_LOGGING__ = value;
}

/**
 * Set verbose logging state
 */
export async function setVerboseLogging(enabled: boolean): Promise<void> {
  global.__VERBOSE_LOGGING__ = enabled;
  const { setStorageItem } = await import('./storage');
  await setStorageItem('VerboseLogging', enabled);
}

/**
 * App version information
 */
export const APP_VERSION = '2.0.0-mobile-alpha.1';
export const APP_NAME = 'Autocab Connect365';

// Extend global type for verbose logging flag
declare global {
  var __VERBOSE_LOGGING__: boolean;
}
