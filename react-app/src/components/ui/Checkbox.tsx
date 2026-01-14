// ============================================
// Checkbox Component
// ============================================

import { forwardRef, type InputHTMLAttributes } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/utils';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, id, ...props }, ref) => {
    const inputId = id || `checkbox-${Math.random().toString(36).substring(2, 9)}`;
    
    return (
      <div className={cn('checkbox-wrapper', className)}>
        <div className="checkbox-container">
          <input
            ref={ref}
            type="checkbox"
            id={inputId}
            className="checkbox-input"
            {...props}
          />
          <div className="checkbox-box">
            <Check className="checkbox-check" />
          </div>
        </div>
        {(label || description) && (
          <div className="checkbox-content">
            {label && (
              <label htmlFor={inputId} className="checkbox-label">
                {label}
              </label>
            )}
            {description && (
              <p className="checkbox-description">{description}</p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
