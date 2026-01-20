// ============================================
// useBusylight Hook - Hardware status light control
// ============================================

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSettingsStore } from '@/stores';
import { isVerboseLoggingEnabled } from '@/utils';

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
  const ringSound = useSettingsStore((state) => state.settings.busylight.ringSound);
  const ringVolume = useSettingsStore((state) => state.settings.busylight.ringVolume);
  const username = useSettingsStore((state) => state.settings.connection.username);
  
  const [isConnected, setIsConnected] = useState(false);
  const [currentState, setCurrentState] = useState<BusylightState>('DISCONNECTED');
  const [retryCount, setRetryCount] = useState(0);
  
  const monitoringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const slowFlashIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Build API URL with query parameters
  const buildApiUrl = useCallback((action: string, params?: Record<string, string | number>) => {
    // Use URLSearchParams to build query string
    const queryParams = new URLSearchParams();
    queryParams.set('action', action);
    
    // Add username as bridgeId for routing
    if (username) {
      queryParams.set('bridgeId', username);
    }
    
    // Add additional parameters
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          queryParams.set(key, value.toString());
        }
      });
    }
    
    const queryString = queryParams.toString();
    
    // In development, force port 443; in production, use relative URL
    if (import.meta.env.DEV) {
      // Development: use absolute URL with port 443
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      return `${protocol}//${hostname}:443${bridgeUrl}?${queryString}`;
    } else {
      // Production: use relative URL to avoid port number issues
      return `${bridgeUrl}?${queryString}`;
    }
  }, [bridgeUrl, username]);
  
  // Make API request to busylight bridge
  const apiRequest = useCallback(async (
    action: string, 
    params?: Record<string, string | number>
  ): Promise<boolean> => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (!enabled || !isConnected) return false;
    
    try {
      const url = buildApiUrl(action, params);
      
      if (verboseLogging) {
        console.log('[Busylight] 📤 API Request:', {
          url,
          action,
          params,
          username
        });
      }
      
      const headers: HeadersInit = {};
      if (username) {
        headers['x-connect365-username'] = username;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(2000)
      });
      
      if (verboseLogging) {
        console.log('[Busylight] 📥 API Response:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });
      }
      
      if (response.ok) {
        setRetryCount(0);
        return true;
      }
      
      return false;
    } catch (error) {
      if (verboseLogging) {
        console.error('[Busylight] ❌ API request failed:', {
          action,
          error: error instanceof Error ? error.message : String(error)
        });
      }
      return false;
    }
  }, [buildApiUrl, enabled, isConnected, username]);
  
  // Check connection to bridge
  const checkConnection = useCallback(async (): Promise<boolean> => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    try {
      const url = buildApiUrl('currentpresence');
      
      if (verboseLogging) {
        console.log('[Busylight] 🔍 Checking connection:', { url });
      }
      
      const headers: HeadersInit = {};
      if (username) {
        headers['x-connect365-username'] = username;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(3000)
      });
      
      if (verboseLogging) {
        console.log('[Busylight] 📥 Connection check result:', {
          status: response.status,
          ok: response.ok
        });
      }
      
      return response.ok;
    } catch (error) {
      if (verboseLogging) {
        console.error('[Busylight] ❌ Connection check failed:', error);
      }
      return false;
    }
  }, [buildApiUrl, username]);
  
  // Set light color
  const setLight = useCallback(async (color: BusylightColor): Promise<boolean> => {
    return apiRequest('light', { red: color.red, green: color.green, blue: color.blue });
  }, [apiRequest]);
  
  // Turn off light
  const turnOff = useCallback(async (): Promise<boolean> => {
    return apiRequest('off');
  }, [apiRequest]);
  
  // Start alert with color and sound
  const startAlert = useCallback(async (
    color: BusylightColor,
    sound?: number,
    volume?: number
  ): Promise<boolean> => {
    const alertSound = sound ?? parseInt(ringSound, 10) ?? 3;
    const alertVolume = volume ?? ringVolume ?? 50;
    
    return apiRequest('alert', {
      red: color.red,
      green: color.green,
      blue: color.blue,
      sound: alertSound,
      volume: alertVolume
    });
  }, [apiRequest, ringSound, ringVolume]);
  
  // Stop slow flash
  const stopSlowFlash = useCallback(() => {
    if (slowFlashIntervalRef.current) {
      clearInterval(slowFlashIntervalRef.current);
      slowFlashIntervalRef.current = null;
    }
  }, []);
  
  // Start slow flash for IDLENOTIFY (1000ms ON / 1000ms OFF)
  const startSlowFlash = useCallback((color: BusylightColor) => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (slowFlashIntervalRef.current) return;
    
    if (verboseLogging) {
      console.log('[Busylight] Starting slow flash (1000ms ON/OFF)');
    }
    
    let isOn = true;
    
    // Set initial ON state
    setLight(color);
    
    // Setup flashing interval
    slowFlashIntervalRef.current = setInterval(async () => {
      if (!enabled || !isConnected) {
        stopSlowFlash();
        return;
      }
      
      if (isOn) {
        await turnOff();
      } else {
        await setLight(color);
      }
      isOn = !isOn;
    }, 1000); // 1000ms interval
  }, [enabled, isConnected, setLight, turnOff, stopSlowFlash]);
  
  // Apply state to busylight
  const applyState = useCallback(async (state: BusylightState) => {
    const verboseLogging = isVerboseLoggingEnabled();
    const config = STATE_CONFIG[state];
    
    if (!config) {
      console.warn(`[Busylight] Unknown state: ${state}`);
      return;
    }
    
    if (verboseLogging) {
      console.log('[Busylight] Applying state:', state, config);
    }
    
    // Stop any slow flashing first
    stopSlowFlash();
    
    // DISCONNECTED - Turn off
    if (state === 'DISCONNECTED') {
      await turnOff();
      return;
    }
    
    // RINGING - Use alert with sound
    if (state === 'RINGING' && config.alert === true && config.color) {
      await startAlert(config.color);
      return;
    }
    
    // RINGWAITING - Use alert with SILENT (volume 0)
    if (state === 'RINGWAITING' && config.color) {
      await startAlert(config.color, undefined, 0);
      return;
    }
    
    // IDLENOTIFY - Slow flash (1000ms ON / 1000ms OFF)
    if (state === 'IDLENOTIFY' && config.flash === 'slow' && config.color) {
      startSlowFlash(config.color);
      return;
    }
    
    // All other states - Solid color
    if (config.color) {
      await setLight(config.color);
    }
  }, [stopSlowFlash, turnOff, startAlert, startSlowFlash, setLight]);
  
  // Update state
  const setState = useCallback(async (newState: BusylightState) => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (!enabled || !isConnected) {
      if (verboseLogging) {
        console.log('[Busylight] setState blocked - enabled:', enabled, 'isConnected:', isConnected);
      }
      return;
    }
    
    if (newState !== currentState) {
      if (verboseLogging) {
        console.log(`[Busylight] State change: ${currentState} → ${newState}`);
      }
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
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (!enabled) {
      if (verboseLogging) {
        console.log('[Busylight] Disabled in settings');
      }
      return false;
    }
    
    if (verboseLogging) {
      console.log('[Busylight] Initializing...', { username, bridgeUrl });
    }
    
    const connected = await checkConnection();
    setIsConnected(connected);
    
    if (connected) {
      console.log('[Busylight] Connected successfully');
      setRetryCount(0);
      
      // Run test sequence
      await testConnection();
      
      // Add delay after test sequence
      await new Promise(r => setTimeout(r, 500));
      
      // Update to current state
      await applyState(currentState);
      
      return true;
    }
    
    console.warn('[Busylight] Failed initial connection - will retry via monitoring');
    return false;
  }, [enabled, username, bridgeUrl, checkConnection, testConnection, applyState, currentState]);
  
  // Start monitoring connection
  const startMonitoring = useCallback(() => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (monitoringIntervalRef.current) return;
    
    if (verboseLogging) {
      console.log(`[Busylight] Starting monitoring (${monitoringInterval}ms)`);
    }
    
    monitoringIntervalRef.current = setInterval(async () => {
      if (!enabled) {
        stopMonitoring();
        return;
      }
      
      const wasConnected = isConnected;
      const connected = await checkConnection();
      
      if (!wasConnected && connected) {
        console.log('[Busylight] Bridge reconnected');
        setIsConnected(true);
        setRetryCount(0);
        await applyState(currentState);
      } else if (wasConnected && !connected) {
        console.warn('[Busylight] Bridge disconnected');
        setIsConnected(false);
        stopSlowFlash();
      }
    }, monitoringInterval);
  }, [enabled, checkConnection, isConnected, monitoringInterval, applyState, currentState, stopSlowFlash]);
  
  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
      monitoringIntervalRef.current = null;
    }
  }, []);
  
  // Disconnect and cleanup
  const disconnect = useCallback(async () => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log('[Busylight] Disconnecting...');
    }
    
    stopMonitoring();
    stopSlowFlash();
    
    if (isConnected) {
      await turnOff();
    }
    
    setIsConnected(false);
    setCurrentState('DISCONNECTED');
    setRetryCount(0);
  }, [stopMonitoring, stopSlowFlash, isConnected, turnOff]);
  
  // Initialize and start monitoring when enabled
  useEffect(() => {
    if (enabled) {
      initialize().then(() => {
        startMonitoring();
      });
    } else {
      disconnect();
    }
    
    return () => {
      stopMonitoring();
      stopSlowFlash();
    };
  }, [enabled, initialize, startMonitoring, disconnect, stopMonitoring, stopSlowFlash]);
  
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
    testConnection,
    initialize,
    disconnect
  };
}

export default useBusylight;
