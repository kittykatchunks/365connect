// ============================================
// Dial Input - Number input for dialing
// ============================================

import { forwardRef, type InputHTMLAttributes } from 'react';
import { Phone, X, Delete } from 'lucide-react';
import { cn } from '@/utils';
import { Button } from '@/components/ui';

export interface DialInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onCall?: () => void;
  onClear?: () => void;
  onBackspace?: () => void;
  isCallActive?: boolean;
}

export const DialInput = forwardRef<HTMLInputElement, DialInputProps>(
  ({ className, value, onCall, onClear, onBackspace, isCallActive, ...props }, ref) => {
    const hasValue = value && String(value).length > 0;
    
    return (
      <div className={cn('dial-input-container', className)}>
        <input
          ref={ref}
          type="tel"
          className="dial-input"
          value={value}
          placeholder="Enter number"
          autoComplete="off"
          {...props}
        />
        
        <div className="dial-input-actions">
          {hasValue && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={onBackspace}
                aria-label="Backspace"
                className="dial-input-backspace"
              >
                <Delete />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={onClear}
                aria-label="Clear"
                className="dial-input-clear"
              >
                <X />
              </Button>
            </>
          )}
          
          {/* Call button removed per UI requirements */}
          {/* <Button
            variant={isCallActive ? 'danger' : 'success'}
            size="icon"
            onClick={onCall}
            disabled={!hasValue && !isCallActive}
            aria-label={isCallActive ? 'End call' : 'Make call'}
            className="dial-input-call"
          >
            <Phone className={isCallActive ? 'rotate-[135deg]' : ''} />
          </Button> */}
        </div>
      </div>
    );
  }
);

DialInput.displayName = 'DialInput';
