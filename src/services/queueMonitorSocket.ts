// ============================================
// Queue Monitor Socket.IO Service
// ============================================

import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { isVerboseLoggingEnabled } from '@/utils';
import type {
  SocketQueueStatus,
  SocketAgentStatus,
  SocketCounters,
  SocketLiveStatus,
  SocketChannels,
  SocketTrunkStatus,
  SocketBlockSettings,
  SocketConnectionState
} from '@/types/socketio';

type EventCallback = (data: unknown) => void;

/**
 * Service to manage Socket.IO connection for Queue Monitor real-time data
 * Only connects when Queue Monitor is enabled in interface settings
 */
class QueueMonitorSocketService {
  private socket: Socket | null = null;
  private isEnabled: boolean = false;
  private connectionState: SocketConnectionState = 'disconnected';
  private eventCallbacks = new Map<string, Set<EventCallback>>();

  /**
   * Set whether Queue Monitor Socket.IO should be enabled
   * Automatically connects/disconnects based on this state
   */
  setEnabled(enabled: boolean): void {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log('[QueueMonitorSocket] 🔧 setEnabled:', enabled);
    }

    this.isEnabled = enabled;

    if (!enabled && this.socket?.connected) {
      if (verboseLogging) {
        console.log('[QueueMonitorSocket] ⚠️ Disabled - disconnecting socket');
      }
      this.disconnect();
    }
  }

  /**
   * Connect to Socket.IO server
   * Only connects if Queue Monitor is enabled
   */
  async connect(url: string, token: string): Promise<void> {
    const verboseLogging = isVerboseLoggingEnabled();

    if (!this.isEnabled) {
      if (verboseLogging) {
        console.log('[QueueMonitorSocket] ⚠️ Not connecting - Queue Monitor disabled in settings');
      }
      return;
    }

    if (this.socket?.connected) {
      if (verboseLogging) {
        console.log('[QueueMonitorSocket] ⚠️ Already connected');
      }
      return;
    }

    if (verboseLogging) {
      console.log('[QueueMonitorSocket] 🔌 Connecting to:', url);
    }

    this.connectionState = 'connecting';
    this.notifyStateChange();

    try {
      // Create Socket.IO connection
      this.socket = io(url, {
        transports: ['websocket'],
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000
      });

      // Setup event listeners
      this.setupSocketListeners();

      // Emit auth event after connection
      this.socket.on('connect', () => {
        if (verboseLogging) {
          console.log('[QueueMonitorSocket] 🔗 Connected, sending auth...');
        }
        this.socket?.emit('auth', token);
      });

    } catch (error) {
      console.error('[QueueMonitorSocket] ❌ Connection error:', error);
      this.connectionState = 'error';
      this.notifyStateChange();
    }
  }

  /**
   * Disconnect from Socket.IO server
   */
  disconnect(): void {
    const verboseLogging = isVerboseLoggingEnabled();

    if (this.socket) {
      if (verboseLogging) {
        console.log('[QueueMonitorSocket] 🔌 Disconnecting...');
      }

      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.connectionState = 'disconnected';
      this.notifyStateChange();
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState(): SocketConnectionState {
    return this.connectionState;
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Subscribe to a specific Socket.IO event
   */
  on(event: string, callback: EventCallback): () => void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, new Set());
    }
    
    this.eventCallbacks.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.eventCallbacks.get(event);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.eventCallbacks.delete(event);
        }
      }
    };
  }

  /**
   * Notify all listeners of an event
   */
  private notifyListeners(event: string, data: unknown): void {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[QueueMonitorSocket] Error in ${event} callback:`, error);
        }
      });
    }
  }

  /**
   * Notify state change listeners
   */
  private notifyStateChange(): void {
    this.notifyListeners('connectionStateChange', this.connectionState);
  }

  /**
   * Setup Socket.IO event listeners
   */
  private setupSocketListeners(): void {
    const verboseLogging = isVerboseLoggingEnabled();

    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      if (verboseLogging) {
        console.log('[QueueMonitorSocket] ✅ Connected, ID:', this.socket?.id);
      }
      this.connectionState = 'connected';
      this.notifyStateChange();
    });

    this.socket.on('disconnect', (reason: string) => {
      if (verboseLogging) {
        console.log('[QueueMonitorSocket] 🔌 Disconnected:', reason);
      }
      this.connectionState = 'disconnected';
      this.notifyStateChange();
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('[QueueMonitorSocket] ❌ Connection error:', error);
      this.connectionState = 'error';
      this.notifyStateChange();
    });

    // Data events - forward to subscribers
    this.socket.on('version', (data: number) => {
      if (verboseLogging) {
        console.log('[QueueMonitorSocket] 📦 version:', data);
      }
      this.notifyListeners('version', data);
    });

    this.socket.on('queue status', (data: SocketQueueStatus) => {
      if (verboseLogging) {
        console.log('[QueueMonitorSocket] 📦 queue status:', data);
      }
      
      // Validate queue status data
      if (!data || typeof data !== 'object') {
        console.warn('[QueueMonitorSocket] ⚠️ Invalid queue status received:', data);
        return;
      }
      
      this.notifyListeners('queueStatus', data);
    });

    this.socket.on('agent status', (data: SocketAgentStatus) => {
      if (verboseLogging) {
        console.log('[QueueMonitorSocket] 📦 agent status:', data);
      }
      
      // Validate agent data before notifying listeners
      if (!data || typeof data !== 'object') {
        console.warn('[QueueMonitorSocket] ⚠️ Invalid agent status received (not an object):', data);
        return;
      }
      
      if (!data.extension) {
        console.warn('[QueueMonitorSocket] ⚠️ Invalid agent status received (missing extension):', data);
        return;
      }
      
      this.notifyListeners('agentStatus', data);
    });

    this.socket.on('counters', (data: SocketCounters) => {
      if (verboseLogging) {
        console.log('[QueueMonitorSocket] 📦 counters:', data);
      }
      this.notifyListeners('counters', data);
    });

    this.socket.on('live', (data: SocketLiveStatus) => {
      if (verboseLogging) {
        console.log('[QueueMonitorSocket] 📦 live:', data);
      }
      this.notifyListeners('live', data);
    });

    this.socket.on('channels', (data: SocketChannels) => {
      if (verboseLogging) {
        console.log('[QueueMonitorSocket] 📦 channels:', data);
      }
      this.notifyListeners('channels', data);
    });

    this.socket.on('trunkStatus', (data: SocketTrunkStatus) => {
      if (verboseLogging) {
        console.log('[QueueMonitorSocket] 📦 trunkStatus:', data);
      }
      this.notifyListeners('trunkStatus', data);
    });

    this.socket.on('block', (data: SocketBlockSettings) => {
      if (verboseLogging) {
        console.log('[QueueMonitorSocket] 📦 block:', data);
      }
      this.notifyListeners('block', data);
    });

    // Catch-all for debugging
    if (verboseLogging) {
      this.socket.onAny((event: string, ...args: unknown[]) => {
        console.log(`[QueueMonitorSocket] 📨 Event "${event}":`, args);
      });
    }
  }
}

// Export singleton instance
export const queueMonitorSocket = new QueueMonitorSocketService();
