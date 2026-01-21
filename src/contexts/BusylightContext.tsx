/**
 * BusylightContext - Integrates busylight with SIP state
 * Automatically updates busylight state based on registration, calls, and voicemail
 */

import { createContext, useContext, useEffect, useCallback, type ReactNode } from 'react';
import { useBusylight, type BusylightState, type BusylightDeviceInfo } from '@/hooks/useBusylight';
import { useSIPStore } from '@/stores/sipStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAppStore } from '@/stores/appStore';
import { isVerboseLoggingEnabled } from '@/utils';

// ==================== Context ====================

interface BusylightContextValue {
  enabled: boolean;
  isConnected: boolean;
  currentState: BusylightState;
  deviceInfo: BusylightDeviceInfo | null;
  testConnection: () => Promise<boolean>;
  fetchDeviceInfo: () => Promise<BusylightDeviceInfo | null>;
}

const BusylightContext = createContext<BusylightContextValue | null>(null);

// ==================== Provider ====================

interface BusylightProviderProps {
  children: ReactNode;
}

export function BusylightProvider({ children }: BusylightProviderProps) {
  const busylight = useBusylight();
  
  // Get SIP state
  const registrationState = useSIPStore((state) => state.registrationState);
  const sessions = useSIPStore((state) => state.sessions);
  const selectedLine = useSIPStore((state) => state.selectedLine);
  const hasNewVoicemail = useSIPStore((state) => state.hasNewVoicemail);
  const voicemailCount = useSIPStore((state) => state.voicemailCount);
  
  // Get agent state
  const agentState = useAppStore((state) => state.agentState);
  
  // Get settings
  const voicemailNotifyEnabled = useSettingsStore((state) => state.settings.busylight.voicemailNotify);
  
  // Evaluate busylight state based on SIP state
  const evaluateState = useCallback((): BusylightState => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    // 1. Not registered to SIP server
    if (registrationState !== 'registered') {
      if (verboseLogging) {
        console.log('[Busylight] State evaluation: DISCONNECTED (not registered)');
      }
      return 'DISCONNECTED';
    }
    
    // 2. Registered but no agent logged in
    const isAgentLoggedIn = agentState !== 'logged-out';
    if (!isAgentLoggedIn) {
      if (verboseLogging) {
        console.log('[Busylight] State evaluation: CONNECTED (registered but no agent logged in)');
      }
      return 'CONNECTED';
    }
    
    // 3. Get all sessions
    const allSessions = Array.from(sessions.values());
    const ringingSession = allSessions.filter(s => s.state === 'ringing');
    const activeSessions = allSessions.filter(s => s.state === 'established' || s.state === 'active');
    const heldSessions = allSessions.filter(s => s.onHold);
    
    if (verboseLogging) {
      console.log('[Busylight] State evaluation:', {
        registrationState,
        agentState,
        isAgentLoggedIn,
        totalSessions: allSessions.length,
        ringingCount: ringingSession.length,
        activeCount: activeSessions.length,
        heldCount: heldSessions.length,
        selectedLine,
        hasVoicemail: hasNewVoicemail,
        voicemailCount,
        voicemailNotifyEnabled
      });
    }
    
    // 4. Has active call(s) and incoming call
    if (activeSessions.length > 0 && ringingSession.length > 0) {
      if (verboseLogging) {
        console.log('[Busylight] State: RINGWAITING (active + ringing)');
      }
      return 'RINGWAITING';
    }
    
    // 5. Incoming call ringing
    if (ringingSession.length > 0) {
      if (verboseLogging) {
        console.log('[Busylight] State: RINGING');
      }
      return 'RINGING';
    }
    
    // 6. Active call
    if (activeSessions.length > 0) {
      // Check if selected line session is on hold
      const selectedSession = allSessions.find(s => s.lineNumber === selectedLine);
      if (selectedSession?.onHold) {
        if (verboseLogging) {
          console.log('[Busylight] State: HOLD (selected line)');
        }
        return 'HOLD';
      }
      
      if (verboseLogging) {
        console.log('[Busylight] State: BUSY (active call)');
      }
      return 'BUSY';
    }
    
    // 7. On hold (no active calls)
    if (heldSessions.length > 0) {
      if (verboseLogging) {
        console.log('[Busylight] State: HOLD');
      }
      return 'HOLD';
    }
    
    // 8. Idle with voicemail notification
    if (voicemailNotifyEnabled && hasNewVoicemail) {
      if (verboseLogging) {
        console.log('[Busylight] State: IDLENOTIFY (voicemail)');
      }
      return 'IDLENOTIFY';
    }
    
    // 9. Idle
    if (verboseLogging) {
      console.log('[Busylight] State: IDLE');
    }
    return 'IDLE';
  }, [
    registrationState,
    agentState,
    sessions,
    selectedLine,
    hasNewVoicemail,
    voicemailCount,
    voicemailNotifyEnabled
  ]);
  
  // Update busylight state when SIP state changes
  useEffect(() => {
    if (!busylight.enabled || !busylight.isConnected) return;
    
    const newState = evaluateState();
    
    // When not registered, turn off the light (don't use setState which has guards)
    if (newState === 'DISCONNECTED') {
      const verboseLogging = isVerboseLoggingEnabled();
      if (verboseLogging) {
        console.log('[Busylight] Not registered - turning off light');
      }
      // Directly call turnOff via setState to ensure light turns off
      busylight.setState(newState);
    } else {
      busylight.setState(newState);
    }
  }, [
    busylight,
    registrationState,
    agentState,
    sessions,
    selectedLine,
    hasNewVoicemail,
    voicemailCount,
    voicemailNotifyEnabled,
    evaluateState
  ]);
  
  // Context value
  const value: BusylightContextValue = {
    enabled: busylight.enabled,
    isConnected: busylight.isConnected,
    currentState: busylight.currentState,
    deviceInfo: busylight.deviceInfo,
    testConnection: busylight.testConnection,
    fetchDeviceInfo: busylight.fetchDeviceInfo
  };
  
  return (
    <BusylightContext.Provider value={value}>
      {children}
    </BusylightContext.Provider>
  );
}

// ==================== Hook ====================

export function useBusylightContext(): BusylightContextValue {
  const context = useContext(BusylightContext);
  
  if (!context) {
    throw new Error('useBusylightContext must be used within a BusylightProvider');
  }
  
  return context;
}
