// ============================================
// App Constants
// ============================================

export const APP_NAME = 'Autocab365Connect';
export const APP_SHORT_NAME = '365Connect';
export const APP_VERSION = '1.0.0';

// Line configuration
export const MAX_LINES = 3;
export const DEFAULT_LINE = 1;

// BLF configuration
export const BLF_BUTTON_COUNT = 20;
export const BLF_LEFT_COUNT = 10;
export const BLF_RIGHT_COUNT = 10;

// Timeouts
export const REGISTRATION_TIMEOUT = 30000; // 30 seconds
export const CALL_SETUP_TIMEOUT = 60000; // 60 seconds
export const ICE_GATHERING_TIMEOUT_DEFAULT = 5000; // 5 seconds
export const RECONNECT_DELAY = 5000; // 5 seconds

// Notification durations
export const TOAST_DURATION_SHORT = 3000;
export const TOAST_DURATION_NORMAL = 5000;
export const TOAST_DURATION_LONG = 8000;

// Audio
export const DTMF_DURATION = 100; // milliseconds
export const DTMF_INTER_TONE_GAP = 50; // milliseconds

// SIP ports
export const WSS_PORT = 8089;
export const WSS_PATH = '/ws';

// Local storage prefix
export const STORAGE_PREFIX = 'autocab365_';

// API endpoints
export const PHANTOM_API_BASE = 'phantomapi.net';

// Dialpad keys
export const DIALPAD_KEYS = [
  { digit: '1', letters: '' },
  { digit: '2', letters: 'ABC' },
  { digit: '3', letters: 'DEF' },
  { digit: '4', letters: 'GHI' },
  { digit: '5', letters: 'JKL' },
  { digit: '6', letters: 'MNO' },
  { digit: '7', letters: 'PQRS' },
  { digit: '8', letters: 'TUV' },
  { digit: '9', letters: 'WXYZ' },
  { digit: '*', letters: '' },
  { digit: '0', letters: '+' },
  { digit: '#', letters: '' }
] as const;

// Call state display text
export const CALL_STATE_TEXT = {
  idle: 'Idle',
  ringing: 'Ringing',
  dialing: 'Dialling',
  connecting: 'Connecting',
  active: 'Connected',
  established: 'Connected',
  hold: 'On Hold',
  terminated: 'Ended'
} as const;

// Registration state display text
export const REGISTRATION_STATE_TEXT = {
  unregistered: 'Disconnected',
  registering: 'Connecting...',
  registered: 'Connected',
  failed: 'Connection Failed'
} as const;

// Theme values
export const THEMES = {
  AUTO: 'auto',
  LIGHT: 'light',
  DARK: 'dark'
} as const;

// Navigation views
export const VIEWS = {
  DIAL: 'dial',
  CONTACTS: 'contacts',
  ACTIVITY: 'activity',
  COMPANY_NUMBERS: 'companyNumbers',
  QUEUE_MONITOR: 'queueMonitor',
  SETTINGS: 'settings'
} as const;
