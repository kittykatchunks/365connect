// ============================================
// Toggle/Switch Component
// ============================================

import { forwardRef, type InputHTMLAttributes, type ChangeEvent } from 'react';
import { cn } from '@/utils';

export interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size' | 'onChange'> {
  label?: string;
  description?: string;
  toggleSize?: 'sm' | 'md' | 'lg';
  /** Simplified callback that receives boolean directly */
  onChange?: (checked: boolean) => void;
  /** Standard HTML onChange event handler */
  onChangeEvent?: (event: ChangeEvent<HTMLInputElement>) => void;
}

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  ({ className, label, description, toggleSize = 'md', id, onChange, onChangeEvent, ...props }, ref) => {
    const inputId = id || `toggle-${Math.random().toString(36).substring(2, 9)}`;
    
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.checked);
      onChangeEvent?.(e);
    };
    
    return (
      <div className={cn('toggle-wrapper', className)}>
        {(label || description) && (
          <div className="toggle-content">
            {label && (
              <label htmlFor={inputId} className="toggle-label">
                {label}
              </label>
            )}
            {description && (
              <p className="toggle-description">{description}</p>
            )}
          </div>
        )}
        <div className="toggle-container">
          <input
            ref={ref}
            type="checkbox"
            id={inputId}
            className="toggle-input"
            onChange={handleChange}
            {...props}
          />
          <div className={cn('toggle-track', `toggle-${toggleSize}`)}>
            <div className="toggle-thumb" />
          </div>
        </div>
      </div>
    );
  }
);

Toggle.displayName = 'Toggle';
