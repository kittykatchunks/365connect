// ============================================
// Call Info Display - Shows active call information
// ============================================

import { useEffect, useState } from 'react';
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
  const [callDuration, setCallDuration] = useState(0);
  
  const verboseLogging = isVerboseLoggingEnabled();
  
  // Extract call information from session
  const callerNumber = session.remoteNumber || session.target || t('call.unknown_number', 'Unknown');
  const callerName = session.displayName || session.remoteIdentity || '';
  
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
  
  // Timer effect - handles both ringing and established call timers
  // For incoming ringing calls: counts up from startTime until answered or disconnected
  // For established calls: counts up from answerTime, continues regardless of hold/mute state
  useEffect(() => {
    // Determine which time reference to use
    let referenceTime: Date | null = null;
    let timerType: 'ring' | 'talk' | 'none' = 'none';
    
    // Incoming call ringing - show ring duration
    if (session.direction === 'incoming' && session.state === 'ringing' && session.startTime) {
      referenceTime = session.startTime;
      timerType = 'ring';
    } 
    // Established call (any direction) - show talk duration from answer time
    else if ((session.state === 'established' || session.state === 'active') && session.answerTime) {
      referenceTime = session.answerTime;
      timerType = 'talk';
    }
    
    // No timer needed for other states (outgoing dialing, etc.)
    if (!referenceTime || timerType === 'none') {
      setCallDuration(0);
      return;
    }
    
    const referenceTimeMs = referenceTime instanceof Date 
      ? referenceTime.getTime() 
      : new Date(referenceTime).getTime();
    
    // Validate reference time
    if (isNaN(referenceTimeMs) || referenceTimeMs <= 0) {
      console.error('[CallInfoDisplay] Invalid reference time:', referenceTime);
      setCallDuration(0);
      return;
    }
    
    if (verboseLogging) {
      console.log('[CallInfoDisplay] ⏱️ Starting timer:', {
        sessionId: session.id,
        type: timerType,
        direction: session.direction,
        state: session.state,
        referenceTime: new Date(referenceTimeMs).toISOString()
      });
    }
    
    // Update duration immediately
    const updateDuration = () => {
      const elapsed = Math.floor((Date.now() - referenceTimeMs) / 1000);
      // Ensure elapsed time is valid and positive
      if (elapsed >= 0 && elapsed < 86400) { // Sanity check: less than 24 hours
        setCallDuration(elapsed);
      }
    };
    
    updateDuration(); // Initial update
    
    // Update every second
    const intervalId = setInterval(updateDuration, 1000);
    
    // Cleanup interval on unmount or when session state changes
    return () => {
      if (verboseLogging) {
        console.log('[CallInfoDisplay] ⏱️ Stopping timer - sessionId:', session.id, 'type:', timerType);
      }
      clearInterval(intervalId);
    };
  }, [session.id, session.direction, session.state, session.startTime, session.answerTime, verboseLogging]);
  
  // Log when component mounts/updates (excluding duration changes to avoid spam)
  useEffect(() => {
    if (verboseLogging) {
      console.log('[CallInfoDisplay] 📊 Rendering call info:', {
        sessionId: session.id,
        state: session.state,
        onHold: session.onHold,
        callerNumber,
        callerName,
        callState
      });
    }
  }, [session.id, session.state, session.onHold, callerNumber, callerName, callState, verboseLogging]);
  
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
          {/* Show timer for ringing incoming calls or established calls */}
          {((session.direction === 'incoming' && session.state === 'ringing') || 
            session.state === 'established' || 
            session.state === 'active') 
            ? formatCallTimer(callDuration) 
            : '00:00'}
        </span>
      </div>
    </div>
  );
}
