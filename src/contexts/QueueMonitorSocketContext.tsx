// ============================================
// Queue Monitor Socket Context
// ============================================

import { 
  createContext, 
  useContext, 
  useEffect, 
  useState, 
  useCallback,
  type PropsWithChildren 
} from 'react';
import { queueMonitorSocket } from '@/services/queueMonitorSocket';
import { isVerboseLoggingEnabled } from '@/utils';
import type {
  QueueMonitorSocketState,
  SocketQueueStatus,
  SocketAgentStatus,
  SocketCounters,
  SocketLiveStatus,
  SocketChannels,
  SocketTrunkStatus,
  SocketBlockSettings,
  SocketConnectionState
} from '@/types/socketio';

interface QueueMonitorSocketContextValue extends QueueMonitorSocketState {
  // Additional methods can be added here in the future
}

const QueueMonitorSocketContext = createContext<QueueMonitorSocketContextValue | null>(null);

interface QueueMonitorSocketProviderProps extends PropsWithChildren {
  enabled: boolean; // Controlled by showQueueMonitorTab setting
}

/**
 * Provides real-time Socket.IO data for Queue Monitor
 * Only connects when enabled prop is true (tied to interface settings)
 */
export function QueueMonitorSocketProvider({ 
  children, 
  enabled 
}: QueueMonitorSocketProviderProps) {
  const verboseLogging = isVerboseLoggingEnabled();
  
  // State
  const [state, setState] = useState<QueueMonitorSocketState>({
    connectionState: 'disconnected',
    version: null,
    queues: null,
    agents: [],
    counters: null,
    live: null,
    channels: null,
    trunks: null,
    blocks: null,
    lastUpdate: null,
    error: null
  });

  // Update enabled state in service
  useEffect(() => {
    queueMonitorSocket.setEnabled(enabled);
  }, [enabled]);

  // Fetch JWT and connect
  const fetchJWTAndConnect = useCallback(async () => {
    if (!enabled) {
      if (verboseLogging) {
        console.log('[QueueMonitorSocketContext] ⚠️ Not connecting - Queue Monitor disabled');
      }
      return;
    }

    // Get PhantomID from settings store
    const settingsStore = localStorage.getItem('settings-store');
    let phantomId = '';
    
    if (settingsStore) {
      try {
        const parsed = JSON.parse(settingsStore);
        phantomId = parsed?.state?.settings?.connection?.phantomId || '';
      } catch (error) {
        console.error('[QueueMonitorSocketContext] ❌ Error parsing settings:', error);
      }
    }
    
    if (!phantomId) {
      console.error('[QueueMonitorSocketContext] ❌ No PhantomID found');
      setState(prev => ({ ...prev, connectionState: 'error', error: 'No PhantomID configured' }));
      return;
    }

    if (verboseLogging) {
      console.log('[QueueMonitorSocketContext] 🔑 Fetching JWT for PhantomID:', phantomId);
    }

    try {
      // Fetch JWT token
      const jwtUrl = `https://connect365.servehttp.com/api/phantom/JWTWebToken?phantomId=${phantomId}`;
      const response = await fetch(jwtUrl);
      
      if (!response.ok) {
        throw new Error(`JWT fetch failed: ${response.status}`);
      }

      const data = await response.json();
      const token = data.WBtoken || data.webtoken || data.token || data.jwt;

      if (!token) {
        throw new Error('No token in JWT response');
      }

      if (verboseLogging) {
        console.log('[QueueMonitorSocketContext] ✅ JWT received, connecting...');
      }

      // Connect to Socket.IO server
      const socketUrl = `https://server1-${phantomId}.phantomapi.net:3000`;
      await queueMonitorSocket.connect(socketUrl, token);

    } catch (error) {
      console.error('[QueueMonitorSocketContext] ❌ Error connecting:', error);
      setState(prev => ({ 
        ...prev, 
        connectionState: 'error', 
        error: error instanceof Error ? error.message : 'Connection failed'
      }));
    }
  }, [enabled, verboseLogging]);

  // Connect on mount if enabled
  useEffect(() => {
    if (enabled) {
      fetchJWTAndConnect();
    } else {
      queueMonitorSocket.disconnect();
    }

    return () => {
      queueMonitorSocket.disconnect();
    };
  }, [enabled, fetchJWTAndConnect]);

  // Subscribe to connection state changes
  useEffect(() => {
    const unsubscribe = queueMonitorSocket.on('connectionStateChange', (connectionState: SocketConnectionState) => {
      setState(prev => ({ ...prev, connectionState, error: null }));
    });

    return unsubscribe;
  }, []);

  // Subscribe to version event
  useEffect(() => {
    const unsubscribe = queueMonitorSocket.on('version', (version: number) => {
      setState(prev => ({ ...prev, version, lastUpdate: new Date() }));
    });

    return unsubscribe;
  }, []);

  // Subscribe to queue status events
  useEffect(() => {
    const unsubscribe = queueMonitorSocket.on('queueStatus', (queues: SocketQueueStatus) => {
      setState(prev => ({ ...prev, queues, lastUpdate: new Date() }));
    });

    return unsubscribe;
  }, []);

  // Subscribe to agent status events
  useEffect(() => {
    const unsubscribe = queueMonitorSocket.on('agentStatus', (agent: SocketAgentStatus) => {
      setState(prev => {
        // Update or add agent to array
        const existingIndex = prev.agents.findIndex(a => a.extension === agent.extension);
        const newAgents = [...prev.agents];
        
        if (existingIndex >= 0) {
          newAgents[existingIndex] = agent;
        } else {
          newAgents.push(agent);
        }

        return { ...prev, agents: newAgents, lastUpdate: new Date() };
      });
    });

    return unsubscribe;
  }, []);

  // Subscribe to counters event
  useEffect(() => {
    const unsubscribe = queueMonitorSocket.on('counters', (counters: SocketCounters) => {
      setState(prev => ({ ...prev, counters, lastUpdate: new Date() }));
    });

    return unsubscribe;
  }, []);

  // Subscribe to live event
  useEffect(() => {
    const unsubscribe = queueMonitorSocket.on('live', (live: SocketLiveStatus) => {
      setState(prev => ({ ...prev, live, lastUpdate: new Date() }));
    });

    return unsubscribe;
  }, []);

  // Subscribe to channels event
  useEffect(() => {
    const unsubscribe = queueMonitorSocket.on('channels', (channels: SocketChannels) => {
      setState(prev => ({ ...prev, channels, lastUpdate: new Date() }));
    });

    return unsubscribe;
  }, []);

  // Subscribe to trunk status event
  useEffect(() => {
    const unsubscribe = queueMonitorSocket.on('trunkStatus', (trunks: SocketTrunkStatus) => {
      setState(prev => ({ ...prev, trunks, lastUpdate: new Date() }));
    });

    return unsubscribe;
  }, []);

  // Subscribe to block event
  useEffect(() => {
    const unsubscribe = queueMonitorSocket.on('block', (blocks: SocketBlockSettings) => {
      setState(prev => ({ ...prev, blocks, lastUpdate: new Date() }));
    });

    return unsubscribe;
  }, []);

  return (
    <QueueMonitorSocketContext.Provider value={state}>
      {children}
    </QueueMonitorSocketContext.Provider>
  );
}

/**
 * Hook to access Queue Monitor Socket.IO data
 * @returns Socket.IO state including connection status and real-time data
 */
export function useQueueMonitorSocket(): QueueMonitorSocketContextValue {
  const context = useContext(QueueMonitorSocketContext);
  
  if (!context) {
    throw new Error('useQueueMonitorSocket must be used within QueueMonitorSocketProvider');
  }
  
  return context;
}
