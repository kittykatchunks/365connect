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
      hasDialValue
    });
  }
  
  // PWA Pattern: Show CALL/END buttons when idle or ringing
  // Show MUTE/HOLD/TRANSFER/END when call is active
  
  if (isInCall) {
    // Active call - show call control buttons
    return (
      <div className={cn('call-action-buttons call-controls-active', className)} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
        {/* Mute Button */}
        <Button
          variant={isMuted ? 'danger' : 'secondary'}
          size="lg"
          onClick={onMuteToggle}
          disabled={disabled}
          aria-pressed={isMuted}
          aria-label={isMuted ? t('call.unmute', 'Unmute') : t('call.mute', 'Mute')}
          className="call-control-btn mute-btn"
        >
          {isMuted ? <MicOff className="icon" /> : <Mic className="icon" />}
          <span className="btn-label">{isMuted ? t('call.unmute', 'UNMUTE') : t('call.mute', 'MUTE')}</span>
        </Button>
        
        {/* Hold Button */}
        <Button
          variant={isOnHold ? 'warning' : 'secondary'}
          size="lg"
          onClick={onHoldToggle}
          disabled={disabled}
          aria-pressed={isOnHold}
          aria-label={isOnHold ? t('call.resume', 'Resume') : t('call.hold', 'Hold')}
          className="call-control-btn hold-btn"
        >
          {isOnHold ? <Play className="icon" /> : <Pause className="icon" />}
          <span className="btn-label">{isOnHold ? t('call.resume', 'RESUME') : t('call.hold', 'HOLD')}</span>
        </Button>
        
        {/* Transfer Button */}
        <Button
          variant="secondary"
          size="lg"
          onClick={onTransfer}
          disabled={disabled}
          aria-label={t('call.transfer', 'Transfer')}
          className="call-control-btn transfer-btn"
        >
          <PhoneForwarded className="icon" />
          <span className="btn-label">{t('call.transfer', 'TRANSFER')}</span>
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
          className="call-control-btn end-call-btn"
        >
          <PhoneOff className="icon" />
          <span className="btn-label">{t('call.end', 'END')}</span>
        </Button>
      </div>
    );
  }
  
  // Idle or ringing - show CALL/END buttons
  return (
    <div className={cn('call-action-buttons dial-actions', className)}>
      {/* CALL/ANSWER Button */}
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
        className={cn(
          'call-button uppercase',
          hasIncoming && 'answer-btn'
        )}
      >
        <Phone className="icon" />
        <span className="btn-label">
          {hasIncoming 
            ? t('call.answer', 'ANSWER')
            : isDialing 
              ? t('call.calling', 'CALLING')
              : t('call.call', 'CALL')
          }
        </span>
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
        className="hangup-button uppercase"
      >
        <PhoneOff className="icon" />
        <span className="btn-label">{t('call.end', 'END')}</span>
      </Button>
    </div>
  );
}
