// ============================================
// Dial View - Main dialing interface
// ============================================

import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PanelHeader } from '@/components/layout';
import { DialInput } from './DialInput';
import { Dialpad } from './Dialpad';
import { LineKeys } from './LineKeys';
import { CallActionButtons } from './CallActionButtons';
import { BLFButtonGrid } from './BLFButtonGrid';
import { CLISelector } from './CLISelector';
import { AgentKeys } from './AgentKeys';
import { CallInfoDisplay } from './CallInfoDisplay';
import { TransferModal } from '@/components/modals';
import { VoicemailIndicator } from './VoicemailIndicator';
import { useSIP } from '@/hooks';
import { useUIStore, useSettingsStore, useSIPStore, useAppStore } from '@/stores';
import { isVerboseLoggingEnabled } from '@/utils';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { SessionData } from '@/types';

export function DialView() {
  const { t } = useTranslation();
  const [dialValue, setDialValue] = useState('');
  // const [showInCallDialpad, setShowInCallDialpad] = useState(false);
  const [isDialing, setIsDialing] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTarget, setTransferTarget] = useState<string | undefined>(undefined);
  const [autoStartAttended, setAutoStartAttended] = useState(false);
  
  // Last dialed number for redial functionality (persisted)
  const [lastDialedNumber, setLastDialedNumber] = useLocalStorage('LastDialedNumber', '');
  
  // Agent state for status display
  const agentState = useAppStore((state) => state.agentState);
  const agentNumber = useAppStore((state) => state.agentNumber);
  const agentName = useAppStore((state) => state.agentName);
  const pendingDialNumber = useAppStore((state) => state.pendingDialNumber);
  const setPendingDialNumber = useAppStore((state) => state.setPendingDialNumber);
  const autoDialNumber = useAppStore((state) => state.autoDialNumber);
  const setAutoDialNumber = useAppStore((state) => state.setAutoDialNumber);
  
  const addNotification = useUIStore((state) => state.addNotification);
  const blfEnabled = useSettingsStore((state) => state.settings.interface.blfEnabled);
  const clickToDialBehavior = useSettingsStore((state) => state.settings.call.clickToDialBehavior);
  
  // Get selected line and line states from store
  const selectedLine = useSIPStore((state) => state.selectedLine);
  const lineStates = useSIPStore((state) => state.lineStates);
  const sessions = useSIPStore((state) => state.sessions);
  const getSessionByLine = useSIPStore((state) => state.getSessionByLine);
  const getIncomingSession = useSIPStore((state) => state.getIncomingSession);
  
  // SIP hook
  const {
    isRegistered,
    currentSession,
    makeCall,
    answerCall,
    hangupCall,
    toggleMute,
    toggleHold,
    sendDTMF,
    selectLine
  } = useSIP();
  
  const verboseLogging = isVerboseLoggingEnabled();
  
  // Get session for selected line
  const selectedLineSession = getSessionByLine(selectedLine);
  
  // Determine state based on SELECTED LINE (not current session)
  const isSelectedLineIdle = !selectedLineSession || selectedLineSession.state === 'terminated';
  const isSelectedLineRinging = selectedLineSession && selectedLineSession.state === 'ringing';
  // Include 'hold' state so call control buttons stay visible when call is on hold
  const isSelectedLineInCall = selectedLineSession && (
    selectedLineSession.state === 'active' || 
    selectedLineSession.state === 'established' || 
    selectedLineSession.state === 'hold' ||
    selectedLineSession.onHold
  );
  
  // Check if call is established (answered/connected) - for call button styling
  const isCallEstablished = selectedLineSession && (
    selectedLineSession.state === 'established' ||
    selectedLineSession.state === 'active' ||
    selectedLineSession.state === 'hold'
  );
  
  // Check if outbound call is in progress (dialing/connecting) - for call button styling
  const isOutboundDialing = selectedLineSession && 
    selectedLineSession.direction === 'outgoing' &&
    (selectedLineSession.state === 'initiating' || 
     selectedLineSession.state === 'connecting' ||
     selectedLineSession.state === 'dialing');
  
  // Determine if we should show call info display or dial input
  const showCallInfo = selectedLineSession && selectedLineSession.state !== 'terminated';
  
  // Check if selected line has incoming call
  const hasIncomingOnSelectedLine = selectedLineSession && 
    selectedLineSession.direction === 'incoming' && 
    selectedLineSession.state === 'ringing';
  
  // Log component state periodically for debugging
  useEffect(() => {
    const verboseLogging = isVerboseLoggingEnabled();
    if (verboseLogging) {
      console.log('[DialView] 🔍 Render state:', {
        selectedLine,
        selectedLineSession: selectedLineSession ? {
          id: selectedLineSession.id,
          state: selectedLineSession.state,
          direction: selectedLineSession.direction,
          target: selectedLineSession.target,
          onHold: selectedLineSession.onHold,
          muted: selectedLineSession.muted,
          startTime: selectedLineSession.startTime
        } : null,
        showCallInfo,
        isSelectedLineIdle,
        isSelectedLineInCall,
        isSelectedLineRinging,
        hasIncomingOnSelectedLine,
        isCallEstablished,
        isOutboundDialing,
        isDialing,
        isRegistered,
        dialValue: dialValue || '(empty)'
      });
    }
  });
  
  // Legacy current session tracking (for compatibility with other components)
  const isInCall = currentSession && currentSession.state !== 'terminated';
  
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
        console.log('[DialView] 📞 App idle (incoming) - Auto-switching to ringing line:', incomingLine.lineNumber, 'from:', selectedLine);
      }
      selectLine(incomingLine.lineNumber as 1 | 2 | 3);
    }
  }, [lineStates, selectedLine, selectLine, getIncomingSession, verboseLogging]);

  // Automatic line switching for outgoing calls - ONLY when app is idle and line 2/3 selected
  useEffect(() => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    // Find any outgoing/dialing session
    const outgoingSession = Array.from(sessions.values()).find(
      (session: SessionData) => session.direction === 'outgoing' && 
                   (session.state === 'initiating' || session.state === 'connecting' || session.state === 'dialing')
    );
    
    if (!outgoingSession) {
      return;
    }
    
    // Check if app was idle before this call (only one session exists - the new outgoing one)
    const allSessions = Array.from(sessions.values());
    const wasIdle = allSessions.length === 1 && allSessions[0].id === outgoingSession.id;
    
    if (!wasIdle) {
      if (verboseLogging) {
        console.log('[DialView] 📞 Outgoing call but other calls exist - NOT auto-switching');
      }
      return;
    }
    
    // Find which line has the outgoing call
    const outgoingLine = lineStates.find(
      (line) => line.sessionId === outgoingSession.id
    );
    
    if (!outgoingLine) {
      if (verboseLogging) {
        console.log('[DialView] ⚠️ Outgoing call but no line assigned:', outgoingSession.id);
      }
      return;
    }
    
    // App was idle and we initiated an outgoing call - auto-switch to the line it's on (usually Line 1)
    if (selectedLine !== outgoingLine.lineNumber) {
      if (verboseLogging) {
        console.log('[DialView] 📞 App idle (outgoing) - Auto-switching to dialing line:', outgoingLine.lineNumber, 'from:', selectedLine);
      }
      selectLine(outgoingLine.lineNumber as 1 | 2 | 3);
    }
  }, [sessions, lineStates, selectedLine, selectLine]);
  
  // Log line state changes
  useEffect(() => {
    if (verboseLogging) {
      console.log('[DialView] 📊 Selected line changed:', selectedLine, 'sessionOnLine:', selectedLineSession?.id || 'none');
    }
  }, [selectedLine, selectedLineSession?.id, verboseLogging]);
  
  // Log input and dialpad disabled state
  useEffect(() => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      const dialInputDisabled = !isRegistered || isDialing;
      const dialpadDisabled = !isRegistered;
      
      console.log('[DialView] 🔒 Input/Dialpad state:', {
        isRegistered,
        isDialing,
        dialInputDisabled,
        dialpadDisabled,
        reason: !isRegistered 
          ? 'Not registered to Phantom server' 
          : isDialing 
          ? 'Call in progress (dialing)' 
          : 'Enabled'
      });
    }
  }, [isRegistered, isDialing]);
  
  // Reset isDialing when call becomes established, terminates, or session is removed
  useEffect(() => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (isDialing) {
      // If session is removed (null/undefined), reset dialing state
      if (!selectedLineSession) {
        if (verboseLogging) {
          console.log('[DialView] 🔄 Resetting isDialing state - session removed (call ended/declined)');
        }
        setIsDialing(false);
        return;
      }
      
      const sessionState = selectedLineSession.state;
      
      // Reset dialing state when call is established/answered or terminated
      if (sessionState === 'established' || sessionState === 'active' || sessionState === 'terminated') {
        if (verboseLogging) {
          console.log('[DialView] 🔄 Resetting isDialing state due to session state:', sessionState);
        }
        setIsDialing(false);
      }
    }
  }, [isDialing, selectedLineSession, verboseLogging]);
  
  // Handle pending dial number from callback/contact actions
  useEffect(() => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (pendingDialNumber) {
      if (verboseLogging) {
        console.log('[DialView] 📞 Pending dial number detected:', pendingDialNumber);
      }
      
      // Only populate if not currently in a call on selected line
      if (isSelectedLineIdle) {
        setDialValue(pendingDialNumber);
        
        if (verboseLogging) {
          console.log('[DialView] ✅ Populated dial input with:', pendingDialNumber);
        }
        
        // Clear the pending number immediately after consuming it
        setPendingDialNumber(null);
        
        // Optional: Focus the dial input after a short delay
        setTimeout(() => {
          const dialInput = document.querySelector<HTMLInputElement>('.dial-input');
          if (dialInput) {
            dialInput.focus();
          }
        }, 100);
      } else {
        if (verboseLogging) {
          console.log('[DialView] ⚠️ Cannot populate dial input - call is active on selected line');
        }
        // Clear pending number anyway
        setPendingDialNumber(null);
      }
    }
  }, [pendingDialNumber, isSelectedLineIdle, setPendingDialNumber, verboseLogging]);
  
  // Handle auto-dial number from tel: URLs (click-to-dial)
  useEffect(() => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (autoDialNumber) {
      if (verboseLogging) {
        console.log('[DialView] 📞 Click-to-dial number detected:', autoDialNumber, 'Behavior:', clickToDialBehavior);
      }
      
      // Only populate if not currently in a call on selected line
      if (isSelectedLineIdle) {
        // Always populate the dial input
        setDialValue(autoDialNumber);
        
        if (verboseLogging) {
          console.log('[DialView] ✅ Populated dial input with click-to-dial number:', autoDialNumber);
        }
        
        // Check behavior setting
        if (clickToDialBehavior === 'auto-dial' && isRegistered) {
          // Auto-dial mode - initiate call automatically
          if (verboseLogging) {
            console.log('[DialView] 🚀 Auto-dialing from click-to-dial');
          }
          
          addNotification({
            type: 'info',
            title: t('notifications.click_to_dial_auto_dialing', 'Auto-dialing from web link'),
            message: autoDialNumber,
            duration: 3000
          });
          
          // Save as last dialed number before making call
          setLastDialedNumber(autoDialNumber);
          
          // Initiate call after a short delay to ensure UI updates
          setTimeout(() => {
            makeCall(autoDialNumber).catch((error) => {
              console.error('[DialView] Auto-dial failed:', error);
              addNotification({
                type: 'error',
                title: t('call.error', 'Call Error'),
                message: error instanceof Error ? error.message : 'Failed to place call',
                duration: 4000
              });
            });
          }, 200);
        } else {
          // Populate-only mode - just show notification and wait for user
          if (verboseLogging) {
            console.log('[DialView] ⏸️ Populate-only mode - waiting for user to press Call');
          }
          
          addNotification({
            type: 'info',
            title: t('notifications.click_to_dial_received', 'Number received from web link'),
            message: t('notifications.click_to_dial_press_call', 'Press Call to dial {{number}}', { number: autoDialNumber }),
            duration: 4000
          });
          
          // Focus the dial input
          setTimeout(() => {
            const dialInput = document.querySelector<HTMLInputElement>('.dial-input');
            if (dialInput) {
              dialInput.focus();
            }
          }, 100);
        }
        
        // Clear the auto-dial number after processing
        setAutoDialNumber(null);
      } else {
        if (verboseLogging) {
          console.log('[DialView] ⚠️ Cannot handle click-to-dial - call is active on selected line');
        }
        
        addNotification({
          type: 'warning',
          title: t('notifications.line_busy', 'Line Busy'),
          message: t('notifications.line_busy_desc', 'Complete or switch lines to dial {{number}}', { number: autoDialNumber }),
          duration: 4000
        });
        
        // Clear auto-dial number anyway
        setAutoDialNumber(null);
      }
    }
  }, [autoDialNumber, isSelectedLineIdle, clickToDialBehavior, isRegistered, setAutoDialNumber, setLastDialedNumber, makeCall, addNotification, t, verboseLogging]);
  
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
  
  // Handle backspace
  const handleBackspace = useCallback(() => {
    setDialValue((prev) => prev.slice(0, -1));
  }, []);
  
  // Handle clear
  const handleClear = useCallback(() => {
    setDialValue('');
  }, []);
  
  // Handle call with redial functionality (PWA pattern)
  const handleCall = useCallback(async () => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    // If there's a value in the input, dial it
    if (dialValue.trim()) {
      setIsDialing(true);
      try {
        if (verboseLogging) {
          console.log('[DialView] 📞 Making call to:', dialValue);
        }
        
        // Save as last dialed number before making call
        setLastDialedNumber(dialValue.trim());
        
        await makeCall(dialValue.trim());
        setDialValue('');
        
        // Don't reset isDialing here - let the session state effect handle it
        // isDialing will be reset when session becomes established/active/terminated
      } catch (error) {
        console.error('Call error:', error);
        addNotification({
          type: 'error',
          title: t('call.error', 'Call Error'),
          message: error instanceof Error ? error.message : 'Failed to make call'
        });
        // Only reset on error since call failed
        setIsDialing(false);
      }
    } else if (lastDialedNumber) {
      // Redial functionality: First press populates input, second press dials
      if (verboseLogging) {
        console.log('[DialView] 🔄 Redial: Populating input with last dialed number:', lastDialedNumber);
      }
      setDialValue(lastDialedNumber);
      
      addNotification({
        type: 'info',
        title: t('call.redial', 'Redial'),
        message: t('call.redial_message', 'Press Call again to dial')
      });
    }
  }, [dialValue, lastDialedNumber, isDialing, makeCall, addNotification, t, setLastDialedNumber]);
  
  // Handle Enter key in dial input to initiate call
  const handleDialInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (e.key === 'Enter') {
      e.preventDefault();
      
      if (verboseLogging) {
        console.log('[DialView] ⌨️ Enter key pressed in dial input, dialValue:', dialValue);
      }
      
      // Only make call if not in call and have a value
      if (!isInCall && dialValue) {
        if (verboseLogging) {
          console.log('[DialView] 📞 Initiating call from Enter key');
        }
        handleCall();
      }
    }
  }, [dialValue, isInCall, handleCall]);
  
  // Answer incoming call on selected line
  const handleAnswer = useCallback(async () => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    try {
      if (verboseLogging) {
        console.log('[DialView] 📞 Answering call on selected line:', selectedLine, 'sessionId:', selectedLineSession?.id);
      }
      
      if (selectedLineSession?.id) {
        await answerCall(selectedLineSession.id);
      } else {
        console.error('[DialView] No session to answer on selected line:', selectedLine);
      }
    } catch (error) {
      console.error('Answer error:', error);
      addNotification({
        type: 'error',
        title: t('call.error', 'Call Error'),
        message: error instanceof Error ? error.message : 'Failed to answer call'
      });
    }
  }, [selectedLine, selectedLineSession?.id, answerCall, addNotification, t]);
  
  // Reject incoming call on selected line
  const handleReject = useCallback(async () => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    try {
      if (verboseLogging) {
        console.log('[DialView] ❌ Rejecting call on selected line:', selectedLine, 'sessionId:', selectedLineSession?.id);
      }
      
      if (selectedLineSession?.id) {
        await hangupCall(selectedLineSession.id);
      } else {
        console.error('[DialView] No session to reject on selected line:', selectedLine);
      }
    } catch (error) {
      console.error('Reject error:', error);
    }
  }, [selectedLine, selectedLineSession?.id, hangupCall]);
  
  // Toggle mute on selected line
  const handleMuteToggle = useCallback(async () => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    try {
      if (verboseLogging) {
        console.log('[DialView] 🔇 Toggling mute on selected line:', selectedLine, 'sessionId:', selectedLineSession?.id);
      }
      
      if (selectedLineSession?.id) {
        await toggleMute(selectedLineSession.id);
      }
    } catch (error) {
      console.error('Mute toggle error:', error);
    }
  }, [selectedLine, selectedLineSession?.id, toggleMute]);
  
  const handleHoldToggle = useCallback(async () => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    try {
      if (verboseLogging) {
        console.log('[DialView] ⏸️ Toggling hold on selected line:', selectedLine, 'sessionId:', selectedLineSession?.id);
      }
      
      if (selectedLineSession?.id) {
        await toggleHold(selectedLineSession.id);
      }
    } catch (error) {
      console.error('Hold toggle error:', error);
    }
  }, [selectedLine, selectedLineSession?.id, toggleHold]);
  
  // End call on selected line
  const handleEndCall = useCallback(async () => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    try {
      if (verboseLogging) {
        console.log('[DialView] 📴 Ending call on selected line:', selectedLine, 'sessionId:', selectedLineSession?.id);
        console.log('[DialView] Current session state:', {
          state: selectedLineSession?.state,
          direction: selectedLineSession?.direction,
          target: selectedLineSession?.target,
          onHold: selectedLineSession?.onHold
        });
      }
      
      if (selectedLineSession?.id) {
        if (verboseLogging) {
          console.log('[DialView] 🔄 Calling hangupCall with sessionId:', selectedLineSession.id);
        }
        await hangupCall(selectedLineSession.id);
        
        if (verboseLogging) {
          console.log('[DialView] ✅ hangupCall completed successfully');
        }
        
        setDialValue('');
      } else {
        console.error('[DialView] ❌ No session to end on selected line:', selectedLine);
      }
    } catch (error) {
      console.error('[DialView] ❌ Hangup error:', error);
      addNotification({
        type: 'error',
        title: t('call.error', 'Call Error'),
        message: error instanceof Error ? error.message : 'Failed to end call'
      });
    }
  }, [selectedLine, selectedLineSession?.id, hangupCall, addNotification, t]);
  
  const handleTransfer = useCallback(async () => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    try {
      // Automatically put call on hold before transfer
      if (selectedLineSession?.id && !selectedLineSession.onHold) {
        if (verboseLogging) {
          console.log('[DialView] ⏸️ Putting call on hold before transfer');
        }
        await toggleHold(selectedLineSession.id);
      }
      
      // Clear any previous target and auto-start flag
      setTransferTarget(undefined);
      setAutoStartAttended(false);
      setShowTransferModal(true);
    } catch (error) {
      console.error('[DialView] Error preparing transfer:', error);
    }
  }, [selectedLineSession?.id, selectedLineSession?.onHold, toggleHold]);
  
  const handleTransferModalClose = useCallback(async () => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    // When closing transfer modal, automatically take call off hold
    if (selectedLineSession?.id && selectedLineSession.onHold) {
      if (verboseLogging) {
        console.log('[DialView] ▶️ Taking call off hold after transfer modal close');
      }
      try {
        await toggleHold(selectedLineSession.id);
      } catch (error) {
        console.error('[DialView] Error resuming call after transfer cancel:', error);
      }
    }
    
    setShowTransferModal(false);
    setTransferTarget(undefined);
    setAutoStartAttended(false);
  }, [selectedLineSession?.id, selectedLineSession?.onHold, toggleHold]);
  
  const handleBLFTransfer = useCallback(async (target: string, shouldAutoStart: boolean) => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    try {
      // Automatically put call on hold before transfer
      if (selectedLineSession?.id && !selectedLineSession.onHold) {
        if (verboseLogging) {
          console.log('[DialView] ⏸️ Putting call on hold before BLF transfer to:', target);
        }
        await toggleHold(selectedLineSession.id);
      }
      
      // Set transfer target and auto-start flag, then show modal
      setTransferTarget(target);
      setAutoStartAttended(shouldAutoStart);
      setShowTransferModal(true);
      
      if (verboseLogging) {
        console.log('[DialView] 📞 Opening transfer modal with target:', target, 'autoStart:', shouldAutoStart);
      }
    } catch (error) {
      console.error('[DialView] Error preparing BLF transfer:', error);
    }
  }, [selectedLineSession?.id, selectedLineSession?.onHold, toggleHold]);
  
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
        <div className="status-subtitle-row">
          <div className="status-subtitle-left">
            <span className="agent-prefix">Agent: </span>
            <span className="status-not-logged-in">Not Logged In</span>
          </div>
          <VoicemailIndicator />
        </div>
      );
    }
    
    const agentDisplay = agentName ? `${agentNumber} - ${agentName}` : agentNumber;
    
    if (agentState === 'paused') {
      return (
        <div className="status-subtitle-row">
          <div className="status-subtitle-left">
            <span className="agent-prefix">Agent: </span>
            <span className="status-paused">[PAUSED] {agentDisplay}</span>
          </div>
          <VoicemailIndicator />
        </div>
      );
    }
    
    return (
      <div className="status-subtitle-row">
        <div className="status-subtitle-left">
          <span className="agent-prefix">Agent: </span>
          <span className="status-connected">{agentDisplay}</span>
        </div>
        <VoicemailIndicator />
      </div>
    );
  };
  
  return (
    <div className="dial-view">
      <PanelHeader 
        title=""
        subtitle={getStatusSubtitle()}
        subtitleClassName="panel-header-title"
      />
      
      <div className="dial-view-layout">
        {/* Left BLF Panel */}
        {blfEnabled && (
          <BLFButtonGrid side="left" className="dial-blf-left" onTransferRequest={handleBLFTransfer} />
        )}
        
        <div className="dial-view-content">
          {/* Agent Keys */}
          <AgentKeys />
          
          {/* CLI Selector */}
          <CLISelector />
          
          {/* Line Keys */}
          <LineKeys />
          
          {/* Call Info Display OR Dial Input - based on selected line state */}
          {showCallInfo ? (
            <CallInfoDisplay session={selectedLineSession} />
          ) : (
            <DialInput
              value={dialValue}
              onChange={(e) => setDialValue(e.target.value)}
              onKeyDown={handleDialInputKeyDown}
              onCall={handleCall}
              onClear={handleClear}
              onBackspace={handleBackspace}
              isCallActive={false}
              disabled={!isRegistered || isDialing}
            />
          )}
          
          {/* Dialpad - always shown, sends DTMF during active call */}
          {(!isSelectedLineInCall || true) && (
            <Dialpad
              onDigit={handleDigit}
              onLongPress={handleLongPress}
              disabled={!isRegistered}
            />
          )}
          
          {/* Call Action Buttons - switches between CALL/END and MUTE/HOLD/TRANSFER/END */}
          <CallActionButtons
            isIdle={isSelectedLineIdle}
            isRinging={!!isSelectedLineRinging}
            isInCall={!!isSelectedLineInCall}
            hasIncoming={!!hasIncomingOnSelectedLine}
            isMuted={selectedLineSession?.muted || false}
            isOnHold={selectedLineSession?.onHold || false}
            isEstablished={!!isCallEstablished}
            onCall={handleCall}
            onAnswer={handleAnswer}
            onEndCall={handleEndCall}
            onReject={handleReject}
            onMuteToggle={handleMuteToggle}
            onHoldToggle={handleHoldToggle}
            onTransfer={handleTransfer}
            disabled={!isRegistered}
            isDialing={isDialing || !!isOutboundDialing}
            hasDialValue={!!dialValue.trim()}
            hasRedialNumber={!!lastDialedNumber}
            className="dial-action-buttons"
          />
        </div>
        
        {/* Right BLF Panel */}
        {blfEnabled && (
          <BLFButtonGrid side="right" className="dial-blf-right" onTransferRequest={handleBLFTransfer} />
        )}
      </div>
      
      {/* Transfer Modal */}
      <TransferModal
        isOpen={showTransferModal}
        onClose={handleTransferModalClose}
        sessionId={selectedLineSession?.id}
        initialTarget={transferTarget}
        autoStartAttended={autoStartAttended}
      />
    </div>
  );
}
