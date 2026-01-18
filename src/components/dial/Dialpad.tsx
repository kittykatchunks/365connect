// ============================================
// Dialpad - Numeric keypad for dialing
// ============================================

import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils';

interface DialpadProps {
  onDigit: (digit: string) => void;
  onLongPress?: (digit: string) => void;
  disabled?: boolean;
  className?: string;
}

const dialpadKeys = [
  { digit: '1', letters: '\u00A0' },
  { digit: '2', letters: 'ABC' },
  { digit: '3', letters: 'DEF' },
  { digit: '4', letters: 'GHI' },
  { digit: '5', letters: 'JKL' },
  { digit: '6', letters: 'MNO' },
  { digit: '7', letters: 'PQRS' },
  { digit: '8', letters: 'TUV' },
  { digit: '9', letters: 'WXYZ' },
  { digit: '*', letters: '\u00A0' },
  { digit: '0', letters: '+' },
  { digit: '#', letters: '\u00A0' },
];

export function Dialpad({ onDigit, onLongPress, disabled, className }: DialpadProps) {
  const { t } = useTranslation();
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const handlePointerDown = (digit: string) => {
    if (disabled) return;
    
    // Start long press timer for 0 -> +
    if (digit === '0' && onLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        onLongPress('+');
        longPressTimerRef.current = null;
      }, 500);
    }
  };
  
  const handlePointerUp = (digit: string) => {
    if (disabled) return;
    
    // If long press timer exists, it wasn't triggered, so do normal press
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
      onDigit(digit);
    } else if (digit !== '0') {
      // For non-zero digits, always trigger on up
      onDigit(digit);
    }
  };
  
  const handlePointerLeave = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };
  
  return (
    <div className={cn('dialpad', className)}>
      {dialpadKeys.map(({ digit, letters }) => (
        <button
          key={digit}
          type="button"
          className="dialpad-key"
          disabled={disabled}
          onPointerDown={() => handlePointerDown(digit)}
          onPointerUp={() => handlePointerUp(digit)}
          onPointerLeave={handlePointerLeave}
          aria-label={t('aria_label_dial_digit', 'Dial {{digit}}', { digit })}
        >
          <span className="dialpad-digit">{digit}</span>
          {letters && <span className="dialpad-letters">{letters}</span>}
        </button>
      ))}
    </div>
  );
}
