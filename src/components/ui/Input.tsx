// ============================================
// Input Component
// ============================================

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, icon, type = 'text', ...props }, ref) => {
    return (
      <div className={cn('input-wrapper', error && 'input-error')}>
        {icon && <span className="input-icon">{icon}</span>}
        <input
          ref={ref}
          type={type}
          className={cn('input', icon && 'input-with-icon', className)}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = 'Input';
