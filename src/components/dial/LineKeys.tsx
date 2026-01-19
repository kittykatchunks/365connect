// ============================================
// Line Keys - Multi-line call management
// ============================================

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Phone, PhoneIncoming, PhoneOutgoing, Pause } from 'lucide-react';
import { cn } from '@/utils';
import { useSIPStore } from '@/stores';
import { useSIP } from '@/hooks';

interface LineKeyProps {
  lineNumber: 1 | 2 | 3;
}

function LineKey({ lineNumber }: LineKeyProps) {
  const { t } = useTranslation();
  const selectedLine = useSIPStore((state) => state.selectedLine);
  const lineStates = useSIPStore((state) => state.lineStates);
  const registrationState = useSIPStore((state) => state.registrationState);
  
  const { selectLine, toggleHold } = useSIP();
  
  // Check if we're connected/registered
  const isRegistered = registrationState === 'registered';
  
  const lineState = lineStates.find((l) => l.lineNumber === lineNumber);
  const isSelected = selectedLine === lineNumber;
  const state = lineState?.state || 'idle';
  const sessionId = lineState?.sessionId;
  
  const getIcon = () => {
    switch (state) {
      case 'ringing':
        return <PhoneIncoming className="line-key-icon animate-pulse" />;
      case 'dialing':
        return <PhoneOutgoing className="line-key-icon" />;
      case 'active':
        return <Phone className="line-key-icon text-success" />;
      case 'hold':
        return <Pause className="line-key-icon text-warning" />;
      default:
        return <Phone className="line-key-icon text-muted" />;
    }
  };
  
  const getLabel = () => {
    if (state === 'idle') {
      return t('line.idle', 'Line {{number}}', { number: lineNumber });
    }
    
    const callerInfo = lineState?.callerInfo;
    if (callerInfo?.name) {
      return callerInfo.name;
    }
    if (callerInfo?.number) {
      return callerInfo.number;
    }
    
    return t(`line.${state}`, state);
  };
  
  const handleClick = useCallback(async () => {
    if (isSelected) {
      // Already selected - toggle hold if active
      if ((state === 'active' || state === 'hold') && sessionId) {
        try {
          await toggleHold(sessionId);
        } catch (error) {
          console.error('[LineKey] Toggle hold error:', error);
        }
      }
    } else {
      // Select this line (auto-hold logic is handled in useSIP.selectLine)
      // Do NOT use selectLineWithSession to avoid any auto-unhold behavior
      await selectLine(lineNumber);
    }
  }, [isSelected, state, sessionId, lineNumber, selectLine, toggleHold]);
  
  return (
    <button
      type="button"
      className={cn(
        'line-key',
        `line-key-${state}`,
        isSelected && 'line-key-selected'
      )}
      onClick={handleClick}
      disabled={!isRegistered}
      aria-pressed={isSelected}
      aria-label={t('aria_label_line_state', 'Line {{number}}: {{state}}', { number: lineNumber, state })}
    >
      {getIcon()}
      <span className="line-key-label">{getLabel()}</span>
      {state === 'hold' && (
        <span className="line-key-status text-warning text-xs">{t('call_hold', 'HOLD')}</span>
      )}
    </button>
  );
}

export function LineKeys() {
  return (
    <div className="line-keys">
      <LineKey lineNumber={1} />
      <LineKey lineNumber={2} />
      <LineKey lineNumber={3} />
    </div>
  );
}
