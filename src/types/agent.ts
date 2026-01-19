// ============================================
// Agent Types
// ============================================

export type AgentLoginState = 'logged-out' | 'logging-in' | 'logged-in' | 'logging-out';
export type AgentPauseState = 'unpaused' | 'pausing' | 'paused' | 'unpausing';
export type AgentQueueState = 'idle' | 'processing';

export interface AgentState {
  loginState: AgentLoginState;
  pauseState: AgentPauseState;
  queueState: AgentQueueState;
  agentNumber: string | null;
  agentName: string | null;
}

export interface AgentLoginCredentials {
  agentNumber: string;
  passcode: string;
}

// Asterisk feature codes for agent operations
export const AGENT_CODES = {
  login: '*61',
  logout: '*61',
  queue: '*62',
  pause: '*63',
  unpause: '*63'
} as const;

export function getAgentStatusText(state: AgentState, t: (key: string, fallback?: string) => string): string {
  if (state.loginState === 'logged-out') {
    return t('agent_status_logged_out', 'Logged Out');
  }
  
  if (state.loginState === 'logging-in') {
    return t('agent_status_logging_in', 'Logging In...');
  }
  
  if (state.loginState === 'logging-out') {
    return t('agent_status_logging_out', 'Logging Out...');
  }
  
  if (state.pauseState === 'paused') {
    return t('agent_status_paused', 'Paused');
  }
  
  if (state.pauseState === 'pausing') {
    return t('agent_status_pausing', 'Pausing...');
  }
  
  if (state.pauseState === 'unpausing') {
    return t('agent_status_resuming', 'Resuming...');
  }
  
  return state.agentName || state.agentNumber || t('agent_status_logged_in', 'Logged In');
}

export function formatAgentLoginDial(credentials: AgentLoginCredentials): string {
  // Format: *61<agent_number>*<passcode>*
  return `${AGENT_CODES.login}${credentials.agentNumber}*${credentials.passcode}*`;
}

export function getAgentStatusColor(state: AgentState): string {
  if (state.loginState === 'logged-out') {
    return 'var(--agent-logged-out-color)';
  }
  
  if (state.pauseState === 'paused') {
    return 'var(--agent-paused-color)';
  }
  
  return 'var(--agent-logged-in-color)';
}

// ============================================
// API Response Types
// ============================================

export interface AgentStatusResponse {
  agent: AgentData;
}

export interface AgentData {
  num: string | null;
  name: string | null;
  pause: boolean | string | number;
  clip?: string; // CLIP (Calling Line Identity Presentation) - display name
  cid?: string;  // CID (Caller ID) - actual phone number used for outgoing calls
}

export interface PauseReason {
  code: number;
  label: string;
}

export interface PauseReasonsResponse {
  pausereasons: Record<string, string>;
}

export interface AgentPauseResponse {
  success: boolean;
  error?: string;
}
