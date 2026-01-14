// ============================================
// Call Controls - In-call control buttons
// ============================================

import { useTranslation } from 'react-i18next';
import { 
  Mic, 
  MicOff, 
  Pause, 
  Play, 
  PhoneForwarded, 
  Grid3X3,
  Volume2,
  PhoneOff
} from 'lucide-react';
import { cn } from '@/utils';
import { Button } from '@/components/ui';

interface CallControlsProps {
  isMuted: boolean;
  isOnHold: boolean;
  showDialpad: boolean;
  onMuteToggle: () => void;
  onHoldToggle: () => void;
  onTransfer: () => void;
  onDialpadToggle: () => void;
  onEndCall?: () => void;
  disabled?: boolean;
  className?: string;
}

export function CallControls({
  isMuted,
  isOnHold,
  showDialpad,
  onMuteToggle,
  onHoldToggle,
  onTransfer,
  onDialpadToggle,
  onEndCall,
  disabled,
  className
}: CallControlsProps) {
  const { t } = useTranslation();
  
  return (
    <div className={cn('call-controls', className)}>
      <Button
        variant={isMuted ? 'danger' : 'secondary'}
        size="lg"
        onClick={onMuteToggle}
        disabled={disabled}
        aria-pressed={isMuted}
        className="call-control-btn"
      >
        {isMuted ? <MicOff /> : <Mic />}
        <span>{isMuted ? t('call.unmute', 'Unmute') : t('call.mute', 'Mute')}</span>
      </Button>
      
      <Button
        variant={isOnHold ? 'warning' : 'secondary'}
        size="lg"
        onClick={onHoldToggle}
        disabled={disabled}
        aria-pressed={isOnHold}
        className="call-control-btn"
      >
        {isOnHold ? <Play /> : <Pause />}
        <span>{isOnHold ? t('call.resume', 'Resume') : t('call.hold', 'Hold')}</span>
      </Button>
      
      <Button
        variant="secondary"
        size="lg"
        onClick={onTransfer}
        disabled={disabled}
        className="call-control-btn"
      >
        <PhoneForwarded />
        <span>{t('call.transfer', 'Transfer')}</span>
      </Button>
      
      <Button
        variant={showDialpad ? 'primary' : 'secondary'}
        size="lg"
        onClick={onDialpadToggle}
        disabled={disabled}
        aria-pressed={showDialpad}
        className="call-control-btn"
      >
        <Grid3X3 />
        <span>{t('call.keypad', 'Keypad')}</span>
      </Button>
      
      {onEndCall && (
        <Button
          variant="danger"
          size="lg"
          onClick={onEndCall}
          disabled={disabled}
          className="call-control-btn end-call-btn"
        >
          <PhoneOff />
          <span>{t('call.end', 'End Call')}</span>
        </Button>
      )}
    </div>
  );
}

// Simple volume indicator
interface VolumeIndicatorProps {
  level: number; // 0-100
  className?: string;
}

export function VolumeIndicator({ level, className }: VolumeIndicatorProps) {
  return (
    <div className={cn('volume-indicator', className)}>
      <Volume2 className="volume-icon" />
      <div className="volume-bar">
        <div 
          className="volume-fill" 
          style={{ width: `${level}%` }}
        />
      </div>
    </div>
  );
}
