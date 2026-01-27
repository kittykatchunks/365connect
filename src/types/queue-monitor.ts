// ============================================
// Queue Monitor Types
// ============================================

/**
 * SLA threshold configuration for a single metric
 * The dual-handle range slider sets warn and breach thresholds
 */
export interface SLAThreshold {
  /** Warning threshold (first handle) */
  warn: number;
  /** Breach threshold (second handle) - must be >= warn */
  breach: number;
}

/**
 * Queue configuration with SLA settings
 */
export interface QueueConfig {
  /** Queue number (e.g., 600, 612) */
  queueNumber: string;
  /** Optional queue name if available from API */
  queueName?: string;
  /** Abandoned/missed call percentage thresholds (0-100%) */
  abandonedThreshold: SLAThreshold;
  /** Average wait time thresholds (0-100 seconds) */
  avgWaitTimeThreshold: SLAThreshold;
}

/**
 * Real-time queue statistics
 */
export interface QueueStats {
  /** Queue number */
  queueNumber: string;
  /** Queue name if available */
  queueName?: string;
  /** Total agents logged into the queue */
  agentsTotal: number;
  /** Agents currently available/free */
  agentsFree: number;
  /** Agents currently on a call */
  agentsBusy: number;
  /** Agents currently paused */
  agentsPaused: number;
  /** Calls currently waiting in queue */
  waitingCalls: number;
  /** Percentage of total calls answered */
  answeredPercent: number;
  /** Percentage of total calls missed/abandoned */
  abandonedPercent: number;
  /** Average waiting time in seconds */
  avgWaitTime: number;
  /** Total calls delivered to queue since last reset */
  totalCalls: number;
  /** Current alert state for this queue */
  alertState: QueueAlertState;
}

/**
 * Alert state for a queue based on SLA thresholds
 */
export type QueueAlertState = 'normal' | 'warn' | 'breach';

/**
 * Per-queue SLA alert status (persisted in localStorage)
 */
export interface QueueAlertStatus {
  /** Queue number */
  queueNumber: string;
  /** Alert state for abandoned calls SLA */
  abandonedAlert: QueueAlertState;
  /** Alert state for average wait time SLA */
  avgWaitTimeAlert: QueueAlertState;
  /** Overall alert state (highest of the two) */
  overallAlert: QueueAlertState;
}

/**
 * Available queue from API for dropdown selection
 */
export interface AvailableQueue {
  /** Queue number */
  queueNumber: string;
  /** Queue name if available */
  queueName: string;
  /** Raw API data for reference (optional) */
  rawData?: Record<string, unknown>;
}
