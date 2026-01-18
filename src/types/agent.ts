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

export function getAgentStatusText(state: AgentState): string {
  if (state.loginState === 'logged-out') {
    return 'Logged Out';
  }
  
  if (state.loginState === 'logging-in') {
    return 'Logging In...';
  }
  
  if (state.loginState === 'logging-out') {
    return 'Logging Out...';
  }
  
  if (state.pauseState === 'paused') {
    return 'Paused';
  }
  
  if (state.pauseState === 'pausing') {
    return 'Pausing...';
  }
  
  if (state.pauseState === 'unpausing') {
    return 'Resuming...';
  }
  
  return state.agentName || state.agentNumber || 'Logged In';
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
