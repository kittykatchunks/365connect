// ============================================
// Call Info Display - Shows active call information
// ============================================

import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn, isVerboseLoggingEnabled } from '@/utils';
import type { SessionData } from '@/types';

interface CallInfoDisplayProps {
  session: SessionData;
  className?: string;
}

/**
 * Format call duration in MM:SS format
 */
function formatCallTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * CallInfoDisplay - Shows caller information and call status
 * Replaces dial input when a call is active or ringing
 */
export function CallInfoDisplay({ session, className }: CallInfoDisplayProps) {
  const { t } = useTranslation();
  const [currentTime, setCurrentTime] = useState(0);
  
  const verboseLogging = isVerboseLoggingEnabled();
  
  // Extract call information from session
  const callerNumber = session.remoteNumber || session.target || t('call.unknown_number', 'Unknown');
  const callerName = session.displayName || session.remoteIdentity || '';
  
  // Calculate call duration based on current time
  const callDuration = useMemo(() => {
    if ((session.state !== 'established' && session.state !== 'active') || !session.startTime) {
      return 0;
    }
    const startTimeMs = session.startTime instanceof Date ? session.startTime.getTime() : new Date(session.startTime).getTime();
    return Math.floor((currentTime - startTimeMs) / 1000);
  }, [session.state, session.startTime, currentTime]);
  
  // Determine call state for display
  let callState = '';
  let callStateClass = '';
  
  if (session.state === 'ringing') {
    callState = t('call.state_ringing', 'Ringing');
    callStateClass = 'call-ringing';
  } else if (session.state === 'established' || session.state === 'active') {
    if (session.onHold) {
      callState = t('call.state_on_hold', 'On-Hold');
      callStateClass = 'call-on-hold';
    } else {
      callState = t('call.state_connected', 'Connected');
      callStateClass = 'call-connected';
    }
  } else if (session.state === 'initiating' || session.state === 'dialing' || session.state === 'connecting') {
    callState = t('call.state_dialing', 'Dialing');
    callStateClass = 'call-dialing';
  }
  
  // Timer effect - update current time every second when call is active
  useEffect(() => {
    if (verboseLogging) {
      console.log('[CallInfoDisplay] Session state:', session.state, 'onHold:', session.onHold);
    }
    
    // Only run timer when call is established (connected)
    if ((session.state !== 'established' && session.state !== 'active') || !session.startTime) {
      if (verboseLogging) {
        console.log('[CallInfoDisplay] Timer not active - state:', session.state, 'startTime:', session.startTime);
      }
      return;
    }
    
    if (verboseLogging) {
      console.log('[CallInfoDisplay] ⏱️ Starting call timer - sessionId:', session.id, 'startTime:', session.startTime);
    }
    
    // Update current time every second
    const intervalId = setInterval(() => {
      setCurrentTime(Date.now());
      
      if (verboseLogging && callDuration % 10 === 0) {
        // Log every 10 seconds to avoid console spam
        console.log('[CallInfoDisplay] ⏱️ Call timer update:', formatCallTimer(callDuration), 'session:', session.id);
      }
    }, 1000);
    
    // Cleanup interval on unmount or when session changes
    return () => {
      if (verboseLogging) {
        console.log('[CallInfoDisplay] ⏱️ Stopping call timer - sessionId:', session.id);
      }
      clearInterval(intervalId);
    };
  }, [session.id, session.state, session.startTime, session.onHold, verboseLogging, callDuration]);
  
  // Log when component mounts/updates
  useEffect(() => {
    if (verboseLogging) {
      console.log('[CallInfoDisplay] 📊 Rendering call info:', {
        sessionId: session.id,
        state: session.state,
        onHold: session.onHold,
        callerNumber,
        callerName,
        callState,
        duration: callDuration
      });
    }
  }, [session.id, session.state, session.onHold, callerNumber, callerName, callState, callDuration, verboseLogging]);
  
  return (
    <div className={cn('call-info-display', callStateClass, className)}>
      {/* Main call info: Caller number and name */}
      <div className="call-main-info">
        <span className="caller-number">{callerNumber}</span>
        {callerName && callerName !== callerNumber && (
          <span className="caller-name">{callerName}</span>
        )}
      </div>
      
      {/* Secondary info: Call state and duration */}
      <div className="call-secondary-info">
        <span className="call-direction">{callState}</span>
        <span className="call-duration">
          {(session.state === 'established' || session.state === 'active') ? formatCallTimer(callDuration) : '00:00'}
        </span>
      </div>
    </div>
  );
}
