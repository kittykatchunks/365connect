// ============================================
// Utility Exports Index
// ============================================

export * from './serverConfig';
export * from './storage';
export * from './phoneNumber';
export * from './constants';
export * from './webrtc';
export * from './agentApi';
export * from './contactLookup';
export * from './diagnostics';
export * from './version';
export * from './phantomApiClient';
export * from './queueStorage';
export * from './audioUtils';
export * from './systemCodes';

// Common utility functions
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format duration in seconds to HH:MM:SS or MM:SS format
 */
export function formatDuration(seconds: number): string {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
    return '00:00';
  }
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get verbose logging setting
 * Matches PWA pattern: window.localDB?.getItem('VerboseLogging', 'false') === 'true'
 * Checks localStorage directly to avoid circular dependencies
 */
export function isVerboseLoggingEnabled(): boolean {
  try {
    // Check Zustand persist storage first (where settings are stored)
    const settingsStore = localStorage.getItem('settings-store');
    if (settingsStore) {
      const parsed = JSON.parse(settingsStore);
      return parsed?.state?.settings?.advanced?.verboseLogging === true;
    }
    
    // Fallback to direct localStorage check (legacy)
    return localStorage.getItem('autocab365_VerboseLogging') === 'true';
  } catch {
    return false;
  }
}

/**
 * Get SIP message logging setting
 * Matches PWA pattern: window.localDB?.getItem('SipMessagesEnabled', 'false') === 'true'
 * Checks localStorage directly to avoid circular dependencies
 */
export function isSipMessagesEnabled(): boolean {
  try {
    // Check Zustand persist storage first (where settings are stored)
    const settingsStore = localStorage.getItem('settings-store');
    if (settingsStore) {
      const parsed = JSON.parse(settingsStore);
      return parsed?.state?.settings?.advanced?.sipMessagesEnabled === true;
    }
    
    // Fallback to direct localStorage check (legacy PWA compatibility)
    return localStorage.getItem('SipMessagesEnabled') === 'true';
  } catch {
    return false;
  }
}
