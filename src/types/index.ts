// ============================================
// Type Exports Index
// ============================================

// SIP types (canonical source for CallDirection and BLFPresenceState)
export * from './sip';

// Contact types
export * from './contact';

// Call History types (excluding CallDirection - use from sip)
export type { 
  CallStatus, 
  CallRecord, 
  CallHistoryGroup 
} from './callHistory';
export { 
  createCallRecordId, 
  formatCallDuration, 
  groupCallHistory 
} from './callHistory';

// Company Number types
export * from './companyNumber';

// BLF types (excluding BLFPresenceState - use from sip)
export type { 
  BLFButtonType,
  BLFTransferMethod,
  BLFButton, 
  BLFButtonConfig 
} from './blf';
export { 
  BLF_BUTTON_COUNT, 
  createEmptyBLFButtons 
} from './blf';

// Agent types
export * from './agent';

// Settings types
export * from './settings';

// Queue Monitor types
export * from './queue-monitor';

// Socket.IO types
export * from './socketio';

// Common types
export type ViewType = 'dial' | 'contacts' | 'activity' | 'companyNumbers' | 'queueMonitor' | 'settings';
