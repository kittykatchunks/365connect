// ============================================
// Slider Component
// ============================================

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/utils';

export interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  showValue?: boolean;
  valueFormatter?: (value: number) => string;
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ className, label, showValue = true, valueFormatter, id, value, ...props }, ref) => {
    const inputId = id || `slider-${Math.random().toString(36).substring(2, 9)}`;
    const displayValue = valueFormatter 
      ? valueFormatter(Number(value)) 
      : String(value);
    
    return (
      <div className={cn('slider-wrapper', className)}>
        {(label || showValue) && (
          <div className="slider-header">
            {label && (
              <label htmlFor={inputId} className="slider-label">
                {label}
              </label>
            )}
            {showValue && (
              <span className="slider-value">{displayValue}</span>
            )}
          </div>
        )}
        <input
          ref={ref}
          type="range"
          id={inputId}
          className="slider-input"
          value={value}
          {...props}
        />
      </div>
    );
  }
);

Slider.displayName = 'Slider';
