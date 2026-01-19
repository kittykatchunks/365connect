// ============================================
// Loading Screen Component
// ============================================

import { cn } from '@/utils';
import { useTranslation } from 'react-i18next';

export interface LoadingScreenProps {
  message?: string;
  className?: string;
}

export function LoadingScreen({ message, className }: LoadingScreenProps) {
  const { t } = useTranslation();
  
  return (
    <div className={cn('loading-screen', className)}>
      <div className="loading-content">
        <div className="loading-logo">
          <img 
            src="/icons/pwa-192x192.png" 
            alt="Autocab365 Connect" 
            className="loading-logo-img"
          />
        </div>
        <div className="loading-spinner" />
        <p className="loading-message">{message || t('loading_default', 'Loading...')}</p>
      </div>
    </div>
  );
}

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  return (
    <div className={cn('spinner', `spinner-${size}`, className)} />
  );
}
