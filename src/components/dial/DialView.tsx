// ============================================
// Dial View - Main dialing interface
// ============================================

import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PanelHeader } from '@/components/layout';
import { DialInput } from './DialInput';
import { Dialpad } from './Dialpad';
import { LineKeys } from './LineKeys';
import { CallControls } from './CallControls';
import { BLFButtonGrid } from './BLFButtonGrid';
import { CLISelector } from './CLISelector';
import { AgentKeys } from './AgentKeys';
import { CallInfoDisplay } from './CallInfoDisplay';
import { TransferModal } from '@/components/modals';
import { useSIP } from '@/hooks';
import { useUIStore, useSettingsStore, useSIPStore, useAppStore } from '@/stores';
import { formatDuration, isVerboseLoggingEnabled } from '@/utils';

export function DialView() {
  const { t } = useTranslation();
  const [dialValue, setDialValue] = useState('');
  const [showInCallDialpad, setShowInCallDialpad] = useState(false);
  const [isDialing, setIsDialing] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  
  // Agent state for status display
  const agentState = useAppStore((state) => state.agentState);
  const agentNumber = useAppStore((state) => state.agentNumber);
  const agentName = useAppStore((state) => state.agentName);
  
  const addNotification = useUIStore((state) => state.addNotification);
  const blfEnabled = useSettingsStore((state) => state.settings.interface.blfEnabled);
  
  // Get selected line and line states from store
  const selectedLine = useSIPStore((state) => state.selectedLine);
  const lineStates = useSIPStore((state) => state.lineStates);
  const selectLine = useSIPStore((state) => state.selectLine);
  const getSessionByLine = useSIPStore((state) => state.getSessionByLine);
  const getIncomingSession = useSIPStore((state) => state.getIncomingSession);
  
  // SIP hook
  const {
    isRegistered,
    currentSession,
    incomingSession,
    makeCall,
    answerCall,
    hangupCall,
    toggleMute,
    toggleHold,
    sendDTMF
  } = useSIP();
  
  const verboseLogging = isVerboseLoggingEnabled();
  
  // Get session for selected line
  const selectedLineSession = getSessionByLine(selectedLine);
  
  // Determine if we should show call info display or dial input
  const showCallInfo = selectedLineSession && selectedLineSession.state !== 'terminated';
  
  const isInCall = currentSession && currentSession.state !== 'terminated';
  const hasIncoming = incomingSession && incomingSession.state === 'ringing';
  
  // Get call display info
  const callDisplayNumber = currentSession?.remoteNumber || currentSession?.target || '';
  const callDisplayName = currentSession?.displayName || currentSession?.remoteIdentity || '';
  const callDuration = currentSession?.duration || 0;
  const isMuted = currentSession?.muted || false;
  const isOnHold = currentSession?.onHold || false;
  
  // Automatic line switching for incoming calls - ONLY when app is idle
  useEffect(() => {
    const incomingSessionData = getIncomingSession();
    
    if (!incomingSessionData) {
      return;
    }
    
    // Check if app is idle (no other active calls)
    const hasOtherActiveCalls = lineStates.some(
      (line) => line.state !== 'idle' && line.sessionId !== incomingSessionData.id
    );
    
    // Only auto-switch if app is completely idle (no other calls)
    if (hasOtherActiveCalls) {
      if (verboseLogging) {
        console.log('[DialView] 📞 Incoming call but other calls active - NOT auto-switching. User must manually select line.');
      }
      return;
    }
    
    // Find which line has the incoming call
    const incomingLine = lineStates.find(
      (line) => line.sessionId === incomingSessionData.id
    );
    
    if (!incomingLine) {
      if (verboseLogging) {
        console.log('[DialView] ⚠️ Incoming call but no line assigned:', incomingSessionData.id);
      }
      return;
    }
    
    // App is idle and we have an incoming call - auto-switch to it
    if (selectedLine !== incomingLine.lineNumber) {
      if (verboseLogging) {
        console.log('[DialView] 📞 App idle - Auto-switching to first ringing line:', incomingLine.lineNumber, 'from:', selectedLine);
      }
      selectLine(incomingLine.lineNumber as 1 | 2 | 3);
    }
  }, [lineStates, selectedLine, selectLine, getIncomingSession, verboseLogging]);
  
  // Log line state changes
  useEffect(() => {
    if (verboseLogging) {
      console.log('[DialView] 📊 Selected line changed:', selectedLine, 'sessionOnLine:', selectedLineSession?.id || 'none');
    }
  }, [selectedLine, selectedLineSession?.id, verboseLogging]);
  
  // Handle digit press
  const handleDigit = useCallback(async (digit: string) => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log('[DialView] Digit pressed:', digit, 'isInCall:', isInCall);
    }
    
    // Check if we have an established session to send DTMF
    if (currentSession && currentSession.state === 'established') {
      // Send DTMF to established session
      try {
        if (verboseLogging) {
          console.log('[DialView] Attempting to send DTMF:', digit, 'sessionId:', currentSession.id, 'state:', currentSession.state);
        }
        await sendDTMF(digit, currentSession.id);
        if (verboseLogging) {
          console.log('[DialView] ✅ DTMF sent successfully:', digit);
        }
      } catch (error) {
        console.error('[DialView] DTMF error:', error);
      }
    } else {
      // No established session, update dial input
      setDialValue((prev) => prev + digit);
    }
  }, [currentSession, sendDTMF]);
  
  // Handle long press (e.g., 0 for +)
  const handleLongPress = useCallback((digit: string) => {
    if (!isInCall) {
      setDialValue((prev) => prev + digit);
    }
  }, [isInCall]);
  
  // Clear dial value
  const handleClear = useCallback(() => {
    setDialValue('');
  }, []);
  
  // Backspace
  const handleBackspace = useCallback(() => {
    setDialValue((prev) => prev.slice(0, -1));
  }, []);
  
  // Make or end call
  const handleCall = useCallback(async () => {
    if (isInCall) {
      // End call
      try {
        await hangupCall();
        setDialValue('');
      } catch (error) {
        console.error('Hangup error:', error);
        addNotification({
          type: 'error',
          title: t('call.error', 'Call Error'),
          message: error instanceof Error ? error.message : 'Failed to end call'
        });
      }
    } else if (dialValue.trim()) {
      // Make call
      setIsDialing(true);
      try {
        await makeCall(dialValue.trim());
        setDialValue('');
      } catch (error) {
        console.error('Call error:', error);
        addNotification({
          type: 'error',
          title: t('call.error', 'Call Error'),
          message: error instanceof Error ? error.message : 'Failed to make call'
        });
      } finally {
        setIsDialing(false);
      }
    }
  }, [isInCall, dialValue, hangupCall, makeCall, addNotification, t]);
  
  // Answer incoming call
  const handleAnswer = useCallback(async () => {
    try {
      await answerCall();
    } catch (error) {
      console.error('Answer error:', error);
      addNotification({
        type: 'error',
        title: t('call.error', 'Call Error'),
        message: error instanceof Error ? error.message : 'Failed to answer call'
      });
    }
  }, [answerCall, addNotification, t]);
  
  // Reject incoming call
  const handleReject = useCallback(async () => {
    try {
      await hangupCall(incomingSession?.id);
    } catch (error) {
      console.error('Reject error:', error);
    }
  }, [hangupCall, incomingSession?.id]);
  
  // In-call controls
  const handleMuteToggle = useCallback(async () => {
    try {
      await toggleMute();
    } catch (error) {
      console.error('Mute toggle error:', error);
    }
  }, [toggleMute]);
  
  const handleHoldToggle = useCallback(async () => {
    try {
      await toggleHold();
    } catch (error) {
      console.error('Hold toggle error:', error);
    }
  }, [toggleHold]);
  
  const handleTransfer = useCallback(() => {
    setShowTransferModal(true);
  }, []);
  
  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Dialpad keys
      if (/^[0-9*#]$/.test(e.key)) {
        e.preventDefault();
        handleDigit(e.key);
      }
      
      // Backspace
      if (e.key === 'Backspace' && !isInCall) {
        handleBackspace();
      }
      
      // Enter to call
      if (e.key === 'Enter' && !isInCall && dialValue) {
        handleCall();
      }
      
      // Escape to end call
      if (e.key === 'Escape' && isInCall) {
        handleCall();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDigit, handleBackspace, handleCall, isInCall, dialValue]);
  
  // Get subtitle based on registration and agent state
  const getStatusSubtitle = (): string | React.ReactNode => {
    if (!isRegistered) {
      return t('dial.not_connected', 'Not connected to Phantom - Not registered');
    }
    
    if (agentState === 'logged-out') {
      return (
        <>
          <span className="agent-prefix">Agent: </span>
          <span className="status-not-logged-in">Not Logged In</span>
        </>
      );
    }
    
    const agentDisplay = agentName ? `${agentNumber} - ${agentName}` : agentNumber;
    
    if (agentState === 'paused') {
      return (
        <>
          <span className="agent-prefix">Agent: </span>
          <span className="status-paused">[PAUSED] {agentDisplay}</span>
        </>
      );
    }
    
    return (
      <>
        <span className="agent-prefix">Agent: </span>
        <span className="status-connected">{agentDisplay}</span>
      </>
    );
  };
  
  return (
    <div className="dial-view">
      <PanelHeader 
        title={t('dial.title', 'Phone')}
        subtitle={getStatusSubtitle()}
      />
      
      <div className="dial-view-layout">
        {/* Left BLF Panel */}
        {blfEnabled && (
          <BLFButtonGrid side="left" className="dial-blf-left" />
        )}
        
        <div className="dial-view-content">
          {/* Incoming Call Banner */}
          {hasIncoming && (
            <div className="incoming-call-banner">
              <div className="incoming-call-info">
                <span className="incoming-call-label">{t('call.incoming', 'Incoming Call')}</span>
                <span className="incoming-call-number">{incomingSession?.remoteNumber}</span>
                {incomingSession?.displayName && (
                  <span className="incoming-call-name">{incomingSession.displayName}</span>
                )}
              </div>
              <div className="incoming-call-actions">
                <button className="btn-answer" onClick={handleAnswer}>
                  {t('call.answer', 'Answer')}
                </button>
                <button className="btn-reject" onClick={handleReject}>
                  {t('call.reject', 'Reject')}
                </button>
              </div>
            </div>
          )}
          
          {/* Active Call Display */}
          {isInCall && (
            <div className="active-call-display">
              <div className="call-info">
                <span className="call-status">
                  {currentSession?.state === 'established' ? t('call.in_call', 'In Call') : t('call.connecting', 'Connecting...')}
                </span>
                <span className="call-number">{callDisplayNumber}</span>
                {callDisplayName && callDisplayName !== callDisplayNumber && (
                  <span className="call-name">{callDisplayName}</span>
                )}
              </div>
              <div className="call-timer">{formatDuration(callDuration)}</div>
            </div>
          )}
          
          {/* Agent Keys */}
          <AgentKeys />
          
          {/* CLI Selector */}
          <CLISelector />
          
          {/* Call Info Display OR Dial Input - based on selected line state */}
          {showCallInfo ? (
            <CallInfoDisplay session={selectedLineSession} />
          ) : (
            <DialInput
              value={dialValue}
              onChange={(e) => setDialValue(e.target.value)}
              onCall={handleCall}
              onClear={handleClear}
              onBackspace={handleBackspace}
              isCallActive={false}
              disabled={!isRegistered || isDialing}
            />
          )}
          
          {/* Call Controls (shown during call) */}
          {isInCall && (
            <CallControls
              isMuted={isMuted}
              isOnHold={isOnHold}
              showDialpad={showInCallDialpad}
              onMuteToggle={handleMuteToggle}
              onHoldToggle={handleHoldToggle}
              onTransfer={handleTransfer}
              onDialpadToggle={() => setShowInCallDialpad((prev) => !prev)}
              onEndCall={handleCall}
            />
          )}
          
          {/* Dialpad */}
          {(!isInCall || showInCallDialpad) && (
            <Dialpad
              onDigit={handleDigit}
              onLongPress={handleLongPress}
              disabled={!isRegistered && !isInCall}
            />
          )}
          
          {/* Call Button (pre-call) */}
          {!isInCall && (
            <div className="dial-call-button-container">
              <button
                className="dial-call-button"
                onClick={handleCall}
                disabled={!isRegistered || !dialValue.trim() || isDialing}
              >
                {isDialing ? t('call.dialing', 'Dialing...') : t('call.call', 'Call')}
              </button>
            </div>
          )}
          
          {/* Line Keys */}
          <LineKeys />
        </div>
        
        {/* Right BLF Panel */}
        {blfEnabled && (
          <BLFButtonGrid side="right" className="dial-blf-right" />
        )}
      </div>
      
      {/* Transfer Modal */}
      <TransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        sessionId={currentSession?.id}
      />
    </div>
  );
}
