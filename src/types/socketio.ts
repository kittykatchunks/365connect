// ============================================
// Socket.IO Types for Queue Monitor
// ============================================

/**
 * Queue status data received from Socket.IO 'queue status' event
 */
export interface SocketQueueStatus {
  [queueId: string]: {
    agents: number;
    waiting: number;
    oncall: number;
    paused: number;
    label: string;
  };
}

/**
 * Agent status data received from Socket.IO 'agent status' event
 */
export interface SocketAgentStatus {
  status: number;
  extension: string;
  name: string;
  device: string;
  answered: number;
  bounced: number;
  queues: string;
  connectedNum: string;
  connectedName: string;
  connectedID: string;
  stateTime: number;
  pauseTime: number;
  paused: number;
  pausereason: string;
  penalty: Record<string, string>;
  away: string;
  autoanswer: number;
}

/**
 * Call counters data received from Socket.IO 'counters' event
 */
export interface SocketCounters {
  opp: number;
  sivr: number;
  sabop: number;
  missed: number;
  abandoned: number;
  outbound: number;
  waiting: number;
  operator: number;
  abop: number;
  avgrng: number;
  avglen: number;
  maxrng: number;
  maxlen: number;
  svo: number;
  // Per-queue counters (dynamic keys like "operator-600", "abandoned-601", etc.)
  [key: string]: number | undefined;
}

/**
 * Live system status data received from Socket.IO 'live' event
 */
export interface SocketLiveStatus {
  [queueId: string]: {
    ivr: number;
    abop: number;
    queue: number;
    opp: number;
    vo: number;
  };
}

/**
 * Channel status data received from Socket.IO 'channels' event
 */
export interface SocketChannels {
  active: number;
  total: number;
}

/**
 * Trunk status data received from Socket.IO 'trunkStatus' event
 */
export type SocketTrunkStatus = Record<string, 'Reachable' | 'Unreachable'>;

/**
 * Block settings data received from Socket.IO 'block' event
 */
export interface SocketBlockSettings {
  vo: string;
  abop: string;
  ivr: string;
}

/**
 * Connection state for Socket.IO
 */
export type SocketConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Complete state from Queue Monitor Socket
 */
export interface QueueMonitorSocketState {
  connectionState: SocketConnectionState;
  version: number | null;
  queues: SocketQueueStatus | null;
  agents: SocketAgentStatus[];
  counters: SocketCounters | null;
  live: SocketLiveStatus | null;
  channels: SocketChannels | null;
  trunks: SocketTrunkStatus | null;
  blocks: SocketBlockSettings | null;
  lastUpdate: Date | null;
  error: string | null;
}
