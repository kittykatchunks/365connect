// ============================================
// Button Component
// ============================================

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'btn',
          `btn-${variant}`,
          `btn-${size}`,
          loading && 'btn-loading',
          className
        )}
        {...props}
      >
        {loading && <span className="btn-spinner" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
