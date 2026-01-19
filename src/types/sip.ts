// ============================================
// SIP Types for React App
// Based on sip-session-manager.js
// ============================================

// ==================== State Types ====================

export type RegistrationState = 'unregistered' | 'registering' | 'registered' | 'failed';
export type TransportState = 'disconnected' | 'connecting' | 'connected';
export type SessionState = 'initiating' | 'ringing' | 'dialing' | 'connecting' | 'active' | 'established' | 'hold' | 'terminated' | 'failed';
export type CallDirection = 'incoming' | 'outgoing';
export type LineNumber = 1 | 2 | 3;
export type LineStateType = 'idle' | 'ringing' | 'active' | 'hold' | 'dialing';
export type TransferType = 'blind' | 'attended';

// ==================== Configuration ====================

export interface SIPConfig {
  // Core SIP settings
  server: string;
  username: string;
  password: string;
  domain?: string;
  displayName?: string;
  
  // Connection settings
  connectionTimeout?: number;
  reconnectionAttempts?: number;
  reconnectionTimeout?: number;
  
  // WebRTC settings
  bundlePolicy?: 'balanced' | 'max-bundle' | 'max-compat';
  iceGatheringTimeout?: number;
  iceStopWaitingOnServerReflexive?: boolean;
  iceServers?: RTCIceServer[];
  
  // Registration settings
  registerExpires?: number;
  registerExtraHeaders?: Record<string, string>;
  registerExtraContactParams?: Record<string, string>;
  
  // Transport settings
  traceSip?: boolean;
  wssInTransport?: boolean;
  hackIpInContact?: boolean;
  contactName?: string;
  contactParams?: Record<string, string>;
  
  // Call settings
  autoAnswer?: boolean;
  recordCalls?: boolean;
  noAnswerTimeout?: number;
  
  // Feature settings
  enableBLF?: boolean;
  busylightEnabled?: boolean;
  
  // User agent string
  userAgentString?: string;
}

export interface PhantomConfig {
  phantomId: string;
  username: string;
  password: string;
}

// ==================== Session Types ====================

export interface SessionData {
  id: string;
  lineNumber: LineNumber;
  direction: CallDirection;
  state: SessionState;
  
  // Remote party info
  remoteNumber: string;
  remoteIdentity: string;
  displayName?: string;
  callerID?: string;
  target?: string;
  
  // Call state
  onHold: boolean;
  muted: boolean;
  recording?: boolean;
  
  // Timing
  startTime: Date | null;
  answerTime?: Date | null;
  duration: number;
  
  // Transfer tracking
  isConsultationCall?: boolean;
  originalSessionId?: string;
  transferSession?: unknown;
  
  // Internal reference (not serializable)
  // session?: SIP.Session;
}

export interface SessionCreateOptions {
  video?: boolean;
  extraHeaders?: string[];
}

export interface SessionAnswerOptions {
  video?: boolean;
}

// ==================== Line Management ====================

export interface LineState {
  lineNumber: LineNumber;
  sessionId: string | null;
  state: LineStateType;
  startTime: Date | null;
  callerInfo: CallerInfo | null;
}

export interface CallerInfo {
  number: string;
  name?: string;
  direction: CallDirection;
  remoteNumber?: string;
  remoteIdentity?: string;
  displayName?: string;
}

export interface LineStates {
  1: LineStateType;
  2: LineStateType;
  3: LineStateType;
}

// ==================== BLF (Busy Lamp Field) ====================

export type BLFPresenceState = 
  | 'available' 
  | 'busy' 
  | 'ringing' 
  | 'hold' 
  | 'inactive' 
  | 'offline'
  | 'unknown'
  | 'terminated'    // Dialog state from server
  | 'early'         // Dialog state (ringing)
  | 'confirmed';    // Dialog state (active call)

export interface BLFSubscription {
  extension: string;
  buddy?: string;
  state: BLFPresenceState;
  displayName?: string;
  remoteTarget?: string | null;
  subscriptionAccepted?: boolean;
  subscriptionRejected?: boolean;
  rejectionCode?: number;
}

export interface BLFStateChangeData {
  extension: string;
  buddy?: string;
  state: BLFPresenceState;
  remoteTarget?: string | null;
  statusCode?: number;
  reasonPhrase?: string;
}

// ==================== Transfer ====================

export interface TransferRecord {
  type: TransferType;
  to: string;
  transferTime: string;
  disposition: string;
  dispositionTime: string;
  accept: {
    complete: boolean | null;
    eventTime: string | null;
    disposition: string;
  };
}

export interface TransferInitiatedEvent {
  sessionId: string;
  target: string;
  type: TransferType;
}

export interface TransferCompletedEvent {
  sessionId: string;
  target: string;
  type: TransferType;
  success: boolean;
  reason?: string;
}

export interface AttendedTransferProgressEvent {
  originalSessionId: string;
  transferSessionId: string;
  status: 'trying' | 'ringing' | 'answered' | 'rejected' | 'terminated';
}

// ==================== Subscriptions ====================

export interface SubscriptionData {
  id: string;
  target: string;
  event: string;
  state: 'subscribing' | 'active' | 'terminated';
}

// ==================== Messages ====================

export interface IncomingMessage {
  from: string;
  to: string;
  body: string;
  contentType?: string;
}

export interface VoicemailSummary {
  messagesWaiting: boolean;
  newVoiceMessages: number;
  oldVoiceMessages: number;
  totalVoiceMessages: number;
}

export interface NotifyData {
  from: string | null;
  to: string | null;
  body: string;
  contentType?: string;
  event?: string;
  voicemailData?: VoicemailSummary | null;
}

// ==================== Statistics ====================

export interface CallStats {
  totalCalls: number;
  incomingCalls: number;
  outgoingCalls: number;
  missedCalls: number;
  totalDuration: number;
}

// ==================== Event System ====================

export type SIPEventType = 
  // Transport events
  | 'transportConnected'
  | 'transportDisconnected'
  | 'transportError'
  | 'transportStateChanged'
  | 'reconnectionAttempting'
  | 'reconnectionSuccess'
  // Registration events
  | 'registered'
  | 'unregistered'
  | 'registrationFailed'
  | 'registrationStateChanged'
  // Session events
  | 'sessionCreated'
  | 'sessionAnswered'
  | 'sessionTerminated'
  | 'sessionModified'
  | 'sessionStateChanged'
  | 'sessionMuted'
  | 'sessionError'
  | 'incomingCall'
  | 'incomingCallRejected'
  | 'callWaitingTone'
  // DTMF events
  | 'dtmfReceived'
  | 'dtmfSent'
  // Transfer events
  | 'transferInitiated'
  | 'transferCompleted'
  | 'attendedTransferInitiated'
  | 'attendedTransferProgress'
  | 'attendedTransferAnswered'
  | 'attendedTransferRejected'
  | 'attendedTransferTerminated'
  | 'attendedTransferCompleted'
  | 'attendedTransferCancelled'
  // BLF events
  | 'blfStateChanged'
  | 'blfSubscribed'
  | 'blfUnsubscribed'
  | 'blfSubscriptionFailed'
  // Message events
  | 'messageReceived'
  | 'notifyReceived'
  // Subscription events
  | 'subscriptionCreated'
  | 'subscriptionTerminated'
  | 'subscriptionError'
  // Line events
  | 'lineSelected'
  | 'lineReleased'
  // Config events
  | 'configChanged'
  | 'userAgentCreated'
  | 'userAgentError';

export type SIPEventCallback<T = unknown> = (data: T) => void;

export interface SIPEventMap {
  transportConnected: undefined;
  transportDisconnected: Error | null;
  transportError: Error;
  transportStateChanged: TransportState;
  reconnectionAttempting: undefined;
  reconnectionSuccess: undefined;
  registered: unknown;
  unregistered: undefined;
  registrationFailed: { response?: unknown; statusCode?: number; error?: Error };
  registrationStateChanged: RegistrationState;
  sessionCreated: SessionData;
  sessionAnswered: SessionData;
  sessionTerminated: SessionData & { reason?: string };
  sessionModified: { sessionId: string; action: 'mute' | 'unmute' | 'hold' | 'unhold' };
  sessionStateChanged: { sessionId: string; state: SessionState | string };
  sessionMuted: { sessionId: string; muted: boolean };
  sessionError: { sessionId?: string; target?: string; error: Error };
  incomingCall: SessionData;
  incomingCallRejected: { reason: string; caller: string };
  callWaitingTone: { lineNumber: LineNumber; sessionData: SessionData };
  dtmfReceived: { sessionId: string; tone: string };
  dtmfSent: { sessionId: string; tone: string };
  transferInitiated: TransferInitiatedEvent;
  transferCompleted: TransferCompletedEvent;
  attendedTransferInitiated: AttendedTransferProgressEvent & { target: string; transferSession: unknown };
  attendedTransferProgress: AttendedTransferProgressEvent;
  attendedTransferAnswered: AttendedTransferProgressEvent & { transferSession: unknown };
  attendedTransferRejected: AttendedTransferProgressEvent & { reason: string };
  attendedTransferTerminated: AttendedTransferProgressEvent & { reason: string };
  attendedTransferCompleted: { originalSessionId: string; transferSessionId: string; success: boolean; reason?: string };
  attendedTransferCancelled: { originalSessionId: string };
  blfStateChanged: BLFStateChangeData;
  blfSubscribed: { extension: string; buddy?: string };
  blfUnsubscribed: { extension: string; buddy?: string };
  blfSubscriptionFailed: { extension: string; buddy?: string; statusCode?: number; error?: Error };
  messageReceived: IncomingMessage;
  notifyReceived: NotifyData;
  subscriptionCreated: SubscriptionData;
  subscriptionTerminated: SubscriptionData;
  subscriptionError: { target: string; error: Error };
  lineSelected: { lineNumber: LineNumber; sessionId: string | null };
  lineReleased: { lineNumber: LineNumber; sessionId: string };
  configChanged: SIPConfig;
  userAgentCreated: unknown;
  userAgentError: Error;
}

// ==================== Helper Functions ====================

/**
 * Generate server settings from PhantomID
 */
export function generateServerSettings(phantomId: string): { 
  server: string; 
  domain: string; 
  wssServerUrl: string;
} {
  const domain = `server1-${phantomId}.phantomapi.net`;
  return {
    server: domain,
    domain: domain,
    wssServerUrl: `wss://${domain}:8089/ws`
  };
}

/**
 * Build full SIP config from PhantomID and credentials
 */
export function buildSIPConfig(phantom: PhantomConfig): SIPConfig {
  const serverSettings = generateServerSettings(phantom.phantomId);
  return {
    server: serverSettings.wssServerUrl,
    domain: serverSettings.domain,
    username: phantom.username,
    password: phantom.password,
    displayName: `${phantom.username}-365Connect`,
    // Default settings
    connectionTimeout: 20,
    reconnectionAttempts: 5,
    reconnectionTimeout: 10,
    registerExpires: 300,
    iceGatheringTimeout: 500,
    iceStopWaitingOnServerReflexive: true,
    hackIpInContact: true,
    userAgentString: 'Autocab365Connect React v1.0.0',
    autoAnswer: false,
    noAnswerTimeout: 60,
    enableBLF: true
  };
}

/**
 * Map dialog state to BLF presence state
 */
export function mapDialogStateToBLF(dialogState: string): BLFPresenceState {
  switch (dialogState.toLowerCase()) {
    case 'terminated':
      return 'available';
    case 'early':
      return 'ringing';
    case 'confirmed':
      return 'busy';
    case 'trying':
      return 'ringing';
    default:
      return 'unknown';
  }
}

/**
 * Valid DTMF tones
 */
export const VALID_DTMF_TONES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '#'] as const;
export type DTMFTone = typeof VALID_DTMF_TONES[number];

/**
 * Check if a string is a valid DTMF tone
 */
export function isValidDTMFTone(tone: string): tone is DTMFTone {
  return VALID_DTMF_TONES.includes(tone as DTMFTone);
}

/**
 * Check if a phone number is valid
 */
export function isValidPhoneNumber(number: string): boolean {
  if (!number || typeof number !== 'string') return false;
  const cleaned = number.replace(/[\s\-()]/g, '');
  return /^\+?\d{3,15}$/.test(cleaned);
}
