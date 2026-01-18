// ============================================
// Call Action Buttons - CALL/END buttons that switch to call controls during active call
// Matches PWA behavior exactly
// ============================================

import { useTranslation } from 'react-i18next';
import { Phone, PhoneOff, Mic, MicOff, Pause, Play, PhoneForwarded } from 'lucide-react';
import { cn, isVerboseLoggingEnabled } from '@/utils';
import { Button } from '@/components/ui';

interface CallActionButtonsProps {
  // Call state
  isIdle: boolean;
  isRinging: boolean;
  isInCall: boolean;
  hasIncoming: boolean;
  
  // Call info
  isMuted?: boolean;
  isOnHold?: boolean;
  
  // Actions
  onCall: () => void;
  onAnswer: () => void;
  onEndCall: () => void;
  onReject: () => void;
  onMuteToggle: () => void;
  onHoldToggle: () => void;
  onTransfer: () => void;
  
  // State
  disabled?: boolean;
  isDialing?: boolean;
  hasDialValue?: boolean;
  hasRedialNumber?: boolean;
  
  className?: string;
}

export function CallActionButtons({
  isIdle,
  isRinging: _isRinging,
  isInCall,
  hasIncoming,
  isMuted = false,
  isOnHold = false,
  onCall,
  onAnswer,
  onEndCall,
  onReject,
  onMuteToggle,
  onHoldToggle,
  onTransfer,
  disabled = false,
  isDialing = false,
  hasDialValue = false,
  hasRedialNumber = false,
  className
}: CallActionButtonsProps) {
  const { t } = useTranslation();
  const verboseLogging = isVerboseLoggingEnabled();
  
  if (verboseLogging) {
    console.log('[CallActionButtons] Render:', {
      isIdle,
      isRinging: _isRinging,
      isInCall,
      hasIncoming,
      isMuted,
      isOnHold,
      disabled,
      isDialing,
      hasDialValue,
      displayState: isInCall ? 'call-actions (4 buttons)' : 'dial-actions (2 buttons)'
    });
  }
  
  // PWA Pattern: Show CALL/END buttons when idle or ringing
  // Show MUTE/HOLD/TRANSFER/END when call is active
  
  if (isInCall) {
    // Active call - show call control buttons in call-actions container
    if (verboseLogging) {
      console.log('[CallActionButtons] 📱 Rendering call-actions container (active call state)');
    }
    return (
      <div className={cn('call-controls-container', className)}>
        <div className="call-actions">
          {/* Mute Button */}
          <Button
            variant={isMuted ? 'danger' : 'secondary'}
            size="lg"
            onClick={onMuteToggle}
            disabled={disabled}
            aria-pressed={isMuted}
            aria-label={isMuted ? t('call.unmute', 'Unmute') : t('call.mute', 'Mute')}
            title={isMuted ? t('call.unmute', 'Unmute') : t('call.mute', 'Mute')}
            className="call-control-btn mute-btn"
          >
            {isMuted ? <MicOff className="icon" /> : <Mic className="icon" />}
          </Button>
          
          {/* Hold Button */}
          <Button
            variant={isOnHold ? 'warning' : 'secondary'}
            size="lg"
            onClick={onHoldToggle}
            disabled={disabled}
            aria-pressed={isOnHold}
            aria-label={isOnHold ? t('call.resume', 'Resume') : t('call.hold', 'Hold')}
            title={isOnHold ? t('call.resume', 'Resume') : t('call.hold', 'Hold')}
            className="call-control-btn hold-btn"
          >
            {isOnHold ? <Play className="icon" /> : <Pause className="icon" />}
          </Button>
          
          {/* Transfer Button */}
          <Button
            variant="secondary"
            size="lg"
            onClick={onTransfer}
            disabled={disabled}
            aria-label={t('call.transfer', 'Transfer')}
            title={t('call.transfer', 'Transfer')}
            className="call-control-btn transfer-btn"
          >
            <PhoneForwarded className="icon" />
          </Button>
          
          {/* End Call Button */}
          <Button
            variant="danger"
            size="lg"
            onClick={() => {
              if (verboseLogging) {
                console.log('[CallActionButtons] 📴 End call button clicked (active call)');
              }
              onEndCall();
            }}
            disabled={disabled}
            aria-label={t('call.end', 'End Call')}
            title={t('call.end', 'End Call')}
            className="call-control-btn end-call-btn"
          >
            <PhoneOff className="icon" />
          </Button>
        </div>
      </div>
    );
  }
  
  // Idle or ringing - show CALL/END buttons in dial-actions container
  if (verboseLogging) {
    console.log('[CallActionButtons] 📱 Rendering dial-actions container (idle/ringing state)');
  }
  return (
    <div className={cn('call-controls-container', className)}>
      <div className="dial-actions">{
        /* CALL/ANSWER Button */}
      <Button
        variant="success"
        size="lg"
        onClick={() => {
          if (verboseLogging) {
            console.log('[CallActionButtons] 📞 Call/Answer button clicked:', {
              hasIncoming,
              action: hasIncoming ? 'answer' : 'call',
              hasDialValue,
              isDialing
            });
          }
          if (hasIncoming) {
            onAnswer();
          } else {
            onCall();
          }
        }}
        disabled={disabled || (isIdle && !hasDialValue && !hasRedialNumber && !isDialing)}
        aria-label={hasIncoming ? t('call.answer', 'Answer') : t('call.call', 'Call')}
        title={hasIncoming 
          ? t('call.answer', 'Answer')
          : isDialing 
            ? t('call.calling', 'Calling')
            : t('call.call', 'Call')
        }
        className={cn(
          'call-button uppercase',
          hasIncoming && 'answer-btn'
        )}
      >
        <Phone className="icon" />
      </Button>
      
      {/* END/REJECT Button */}
      <Button
        variant="danger"
        size="lg"
        onClick={() => {
          if (verboseLogging) {
            console.log('[CallActionButtons] 📴 End/Reject button clicked:', {
              hasIncoming,
              action: hasIncoming ? 'reject' : 'end'
            });
          }
          if (hasIncoming) {
            onReject();
          } else {
            onEndCall();
          }
        }}
        disabled={disabled && !hasIncoming}
        aria-label={hasIncoming ? t('call.reject', 'Reject') : t('call.end', 'End')}
        title={hasIncoming ? t('call.reject', 'Reject') : t('call.end', 'End')}
        className="hangup-button uppercase"
      >
        <PhoneOff className="icon" />
      </Button>
      </div>
    </div>
  );
}
