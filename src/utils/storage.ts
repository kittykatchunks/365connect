// ============================================
// Local Storage Utilities
// ============================================

const STORAGE_PREFIX = 'autocab365_';

/**
 * Get a value from localStorage with type safety
 */
export function getItem<T>(key: string, defaultValue: T): T {
  try {
    const prefixedKey = STORAGE_PREFIX + key;
    const item = localStorage.getItem(prefixedKey);
    
    if (item === null) {
      return defaultValue;
    }
    
    // Try to parse as JSON
    try {
      return JSON.parse(item) as T;
    } catch {
      // If not valid JSON, return as string (cast to T)
      return item as unknown as T;
    }
  } catch (error) {
    console.error(`Error reading from localStorage: ${key}`, error);
    return defaultValue;
  }
}

/**
 * Set a value in localStorage
 */
export function setItem<T>(key: string, value: T): void {
  try {
    const prefixedKey = STORAGE_PREFIX + key;
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(prefixedKey, serialized);
  } catch (error) {
    console.error(`Error writing to localStorage: ${key}`, error);
  }
}

/**
 * Remove a value from localStorage
 */
export function removeItem(key: string): void {
  try {
    const prefixedKey = STORAGE_PREFIX + key;
    localStorage.removeItem(prefixedKey);
  } catch (error) {
    console.error(`Error removing from localStorage: ${key}`, error);
  }
}

/**
 * Clear all app-related items from localStorage
 */
export function clearAll(): void {
  try {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('Error clearing localStorage', error);
  }
}

// Storage keys constants
export const STORAGE_KEYS = {
  // Connection
  PHANTOM_ID: 'PhantomID',
  SIP_USERNAME: 'SipUsername',
  SIP_PASSWORD: 'SipPassword',
  VM_ACCESS: 'VmAccess',
  
  // UI Settings
  THEME: 'selectedTheme',
  LANGUAGE: 'AppLanguage',
  BLF_ENABLED: 'BlfEnabled',
  SHOW_CONTACTS_TAB: 'ShowContactsTab',
  SHOW_ACTIVITY_TAB: 'ShowActivityTab',
  SHOW_COMPANY_NUMBERS_TAB: 'ShowCompanyNumbersTab',
  SHOW_QUEUE_MONITOR_TAB: 'ShowQueueMonitorTab',
  ONSCREEN_NOTIFICATIONS: 'OnscreenNotifications',
  
  // Call Settings
  AUTO_ANSWER: 'AutoAnswerEnabled',
  CALL_WAITING: 'CallWaitingEnabled',
  INCOMING_NOTIFICATIONS: 'IncomingCallNotifications',
  AUTO_FOCUS_NOTIFICATION: 'AutoFocusOnNotificationAnswer',
  PREFER_BLIND_TRANSFER: 'PreferBlindTransfer',
  
  // Audio Settings
  SPEAKER_DEVICE: 'audioSpeakerDevice',
  MICROPHONE_DEVICE: 'audioMicrophoneDevice',
  RINGER_DEVICE: 'audioRingerDevice',
  RINGTONE_FILE: 'audioRingtoneFile',
  
  // Advanced
  SIP_MESSAGES: 'SipMessagesEnabled',
  VERBOSE_LOGGING: 'VerboseLoggingEnabled',
  ICE_TIMEOUT: 'IceGatheringTimeout',
  
  // Data
  CONTACTS: 'contacts',
  CALL_HISTORY: 'CallHistory',
  COMPANY_NUMBERS: 'CompanyNumbers',
  BLF_BUTTONS: 'BlfButtons',
  
  // Agent
  AGENT_LOGGED_IN: 'agentLoggedIn',
  AGENT_PAUSED: 'agentPaused',
  AGENT_NUMBER: 'currentAgentNumber',
  AGENT_NAME: 'currentAgentName',
  
  // Misc
  LAST_DIALED: 'LastDialedNumber'
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
