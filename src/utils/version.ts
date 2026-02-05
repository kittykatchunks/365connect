// ============================================
// Version Management Utilities
// ============================================

import { getItem, setItem } from './storage';

// Import isVerboseLoggingEnabled from index to avoid circular dependency
function isVerboseLoggingEnabled(): boolean {
  try {
    const value = localStorage.getItem('autocab365_VerboseLogging');
    return value === 'true';
  } catch {
    return false;
  }
}

// Import version from VERSION file (will be bundled)
// This should be updated in VERSION file for each release
const CURRENT_VERSION = '0.7.36'; // This should match VERSION file

// Storage key for last known version
const LAST_VERSION_KEY = 'LastKnownVersion';

/**
 * Get the current app version
 */
export function getCurrentVersion(): string {
  return CURRENT_VERSION;
}

/**
 * Get the last known version from storage
 */
export function getLastKnownVersion(): string | null {
  return getItem<string | null>(LAST_VERSION_KEY, null);
}

/**
 * Save the current version to storage
 */
export function saveCurrentVersion(): void {
  const verboseLogging = isVerboseLoggingEnabled();
  
  if (verboseLogging) {
    console.log('[Version] 💾 Saving current version to storage:', CURRENT_VERSION);
  }
  
  setItem(LAST_VERSION_KEY, CURRENT_VERSION);
}

/**
 * Check if the app version has changed since last run
 * Returns true if version has changed (upgrade or downgrade)
 */
export function hasVersionChanged(): boolean {
  const lastVersion = getLastKnownVersion();
  const currentVersion = getCurrentVersion();
  const verboseLogging = isVerboseLoggingEnabled();
  
  if (verboseLogging) {
    console.log('[Version] 🔍 Checking version change:', {
      lastVersion,
      currentVersion,
      hasChanged: lastVersion !== null && lastVersion !== currentVersion
    });
  }
  
  // First run - no last version stored
  if (lastVersion === null) {
    if (verboseLogging) {
      console.log('[Version] 🆕 First run detected - no previous version stored');
    }
    return false;
  }
  
  // Version has changed
  return lastVersion !== currentVersion;
}

/**
 * Check if this is the first run (no version stored)
 */
export function isFirstRun(): boolean {
  return getLastKnownVersion() === null;
}

/**
 * Compare two version strings
 * Returns: -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  const maxLength = Math.max(parts1.length, parts2.length);
  
  for (let i = 0; i < maxLength; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    
    if (num1 < num2) return -1;
    if (num1 > num2) return 1;
  }
  
  return 0;
}

/**
 * Check if current version is newer than last known version
 */
export function isUpgrade(): boolean {
  const lastVersion = getLastKnownVersion();
  const currentVersion = getCurrentVersion();
  
  if (lastVersion === null) {
    return false;
  }
  
  return compareVersions(currentVersion, lastVersion) > 0;
}

/**
 * Check if current version is older than last known version (downgrade)
 */
export function isDowngrade(): boolean {
  const lastVersion = getLastKnownVersion();
  const currentVersion = getCurrentVersion();
  
  if (lastVersion === null) {
    return false;
  }
  
  return compareVersions(currentVersion, lastVersion) < 0;
}

/**
 * Get version change type
 */
export function getVersionChangeType(): 'first-run' | 'upgrade' | 'downgrade' | 'unchanged' {
  if (isFirstRun()) {
    return 'first-run';
  }
  
  if (!hasVersionChanged()) {
    return 'unchanged';
  }
  
  if (isUpgrade()) {
    return 'upgrade';
  }
  
  if (isDowngrade()) {
    return 'downgrade';
  }
  
  return 'unchanged';
}

/**
 * Initialize version tracking
 * Should be called on app startup
 */
export function initializeVersionTracking(): {
  hasChanged: boolean;
  changeType: 'first-run' | 'upgrade' | 'downgrade' | 'unchanged';
  lastVersion: string | null;
  currentVersion: string;
} {
  const verboseLogging = isVerboseLoggingEnabled();
  
  const changeType = getVersionChangeType();
  const lastVersion = getLastKnownVersion();
  const currentVersion = getCurrentVersion();
  const hasChanged = hasVersionChanged();
  
  if (verboseLogging) {
    console.log('[Version] 🎯 Version tracking initialized:', {
      changeType,
      lastVersion,
      currentVersion,
      hasChanged
    });
  }
  
  // Save current version for next run
  saveCurrentVersion();
  
  return {
    hasChanged,
    changeType,
    lastVersion,
    currentVersion
  };
}
