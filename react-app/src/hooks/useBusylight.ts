// ============================================
// useBusylight Hook - Hardware status light control
// ============================================

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSettingsStore } from '@/stores';

export type BusylightState = 
  | 'DISCONNECTED'
  | 'CONNECTED'
  | 'IDLE'
  | 'IDLENOTIFY'
  | 'BUSY'
  | 'RINGING'
  | 'RINGWAITING'
  | 'HOLD';

interface BusylightColor {
  red: number;
  green: number;
  blue: number;
}

interface BusylightStateConfig {
  color: BusylightColor | null;
  flash: boolean | 'slow';
  alert: boolean | 'silent';
}

const STATE_CONFIG: Record<BusylightState, BusylightStateConfig> = {
  'DISCONNECTED': { color: null, flash: false, alert: false },
  'CONNECTED': { color: { red: 100, green: 100, blue: 100 }, flash: false, alert: false },
  'IDLE': { color: { red: 0, green: 100, blue: 0 }, flash: false, alert: false },
  'IDLENOTIFY': { color: { red: 0, green: 100, blue: 0 }, flash: 'slow', alert: false },
  'BUSY': { color: { red: 100, green: 0, blue: 0 }, flash: false, alert: false },
  'RINGING': { color: { red: 100, green: 0, blue: 0 }, flash: false, alert: true },
  'RINGWAITING': { color: { red: 100, green: 0, blue: 0 }, flash: false, alert: 'silent' },
  'HOLD': { color: { red: 100, green: 100, blue: 0 }, flash: false, alert: false }
};

interface UseBusylightOptions {
  bridgeUrl?: string;
  monitoringInterval?: number;
  maxRetryAttempts?: number;
}

export function useBusylight(options: UseBusylightOptions = {}) {
  const {
    bridgeUrl = '/api/busylight',
    monitoringInterval = 15000,
    maxRetryAttempts = 5
  } = options;
  
  const enabled = useSettingsStore((state) => state.settings.busylight.enabled);
  
  const [isConnected, setIsConnected] = useState(false);
  const [currentState, setCurrentState] = useState<BusylightState>('DISCONNECTED');
  const [retryCount, setRetryCount] = useState(0);
  
  const monitoringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const slowFlashIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Build API URL with optional SIP username header
  const buildApiUrl = useCallback((endpoint: string) => {
    return `${bridgeUrl}/${endpoint}`;
  }, [bridgeUrl]);
  
  // Make API request to busylight bridge
  const apiRequest = useCallback(async (
    endpoint: string, 
    data?: Record<string, unknown>
  ): Promise<boolean> => {
    try {
      const url = buildApiUrl(endpoint);
      const response = await fetch(url, {
        method: data ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        body: data ? JSON.stringify(data) : undefined,
        signal: AbortSignal.timeout(3000)
      });
      return response.ok;
    } catch (error) {
      console.error('[Busylight] API request failed:', error);
      return false;
    }
  }, [buildApiUrl]);
  
  // Check connection to bridge
  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      const url = buildApiUrl('currentpresence');
      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }, [buildApiUrl]);
  
  // Set light color
  const setLight = useCallback(async (color: BusylightColor): Promise<boolean> => {
    return apiRequest('light', { red: color.red, green: color.green, blue: color.blue });
  }, [apiRequest]);
  
  // Turn off light
  const turnOff = useCallback(async (): Promise<boolean> => {
    return apiRequest('off');
  }, [apiRequest]);
  
  // Start alert/ringtone
  const startAlert = useCallback(async (
    alertNumber: number = 3, 
    volume: number = 50
  ): Promise<boolean> => {
    return apiRequest('alert', { number: alertNumber, volume });
  }, [apiRequest]);
  
  // Stop alert
  const stopAlert = useCallback(async (): Promise<boolean> => {
    return apiRequest('stopalert');
  }, [apiRequest]);
  
  // Apply state to busylight
  const applyState = useCallback(async (state: BusylightState) => {
    const config = STATE_CONFIG[state];
    
    // Stop any ongoing slow flash
    if (slowFlashIntervalRef.current) {
      clearInterval(slowFlashIntervalRef.current);
      slowFlashIntervalRef.current = null;
    }
    
    // Stop any ongoing alert
    await stopAlert();
    
    if (!config.color) {
      // Turn off light
      await turnOff();
      return;
    }
    
    // Handle slow flash
    if (config.flash === 'slow') {
      let flashOn = true;
      slowFlashIntervalRef.current = setInterval(async () => {
        if (flashOn) {
          await setLight(config.color!);
        } else {
          await turnOff();
        }
        flashOn = !flashOn;
      }, 1500); // 1.5 second interval for slow flash
      return;
    }
    
    // Set solid color
    await setLight(config.color);
    
    // Handle alert
    if (config.alert === true) {
      await startAlert();
    }
  }, [setLight, turnOff, startAlert, stopAlert]);
  
  // Update state
  const setState = useCallback(async (newState: BusylightState) => {
    if (!enabled || !isConnected) return;
    
    if (newState !== currentState) {
      console.log(`[Busylight] State change: ${currentState} → ${newState}`);
      setCurrentState(newState);
      await applyState(newState);
    }
  }, [enabled, isConnected, currentState, applyState]);
  
  // Test connection with color sequence
  const testConnection = useCallback(async (): Promise<boolean> => {
    if (!isConnected) return false;
    
    try {
      console.log('[Busylight] Testing connection...');
      const colors: BusylightColor[] = [
        { red: 100, green: 0, blue: 0 },    // Red
        { red: 0, green: 100, blue: 0 },    // Green
        { red: 100, green: 100, blue: 100 } // White
      ];
      
      for (const color of colors) {
        await setLight(color);
        await new Promise(r => setTimeout(r, 300));
      }
      
      await turnOff();
      console.log('[Busylight] Test completed');
      return true;
    } catch (error) {
      console.error('[Busylight] Test failed:', error);
      return false;
    }
  }, [isConnected, setLight, turnOff]);
  
  // Initialize connection
  const initialize = useCallback(async () => {
    if (!enabled) {
      console.log('[Busylight] Disabled in settings');
      return false;
    }
    
    const connected = await checkConnection();
    setIsConnected(connected);
    
    if (connected) {
      console.log('[Busylight] Connected successfully');
      setRetryCount(0);
      await testConnection();
      return true;
    }
    
    console.warn('[Busylight] Failed initial connection');
    return false;
  }, [enabled, checkConnection, testConnection]);
  
  // Start monitoring connection
  const startMonitoring = useCallback(() => {
    if (monitoringIntervalRef.current) return;
    
    monitoringIntervalRef.current = setInterval(async () => {
      if (!enabled) return;
      
      const connected = await checkConnection();
      
      if (connected && !isConnected) {
        console.log('[Busylight] Reconnected');
        setIsConnected(true);
        setRetryCount(0);
      } else if (!connected && isConnected) {
        console.warn('[Busylight] Connection lost');
        setIsConnected(false);
        setRetryCount(prev => prev + 1);
      }
    }, monitoringInterval);
  }, [enabled, checkConnection, isConnected, monitoringInterval]);
  
  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
      monitoringIntervalRef.current = null;
    }
  }, []);
  
  // Initialize and start monitoring when enabled
  useEffect(() => {
    if (enabled) {
      initialize().then(() => {
        startMonitoring();
      });
    } else {
      setIsConnected(false);
      setCurrentState('DISCONNECTED');
      stopMonitoring();
    }
    
    return () => {
      stopMonitoring();
      if (slowFlashIntervalRef.current) {
        clearInterval(slowFlashIntervalRef.current);
      }
    };
  }, [enabled, initialize, startMonitoring, stopMonitoring]);
  
  return {
    enabled,
    isConnected,
    currentState,
    retryCount,
    isRetrying: retryCount > 0 && retryCount < maxRetryAttempts,
    setState,
    setLight,
    turnOff,
    startAlert,
    stopAlert,
    testConnection,
    initialize
  };
}

export default useBusylight;
