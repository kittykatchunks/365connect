// ============================================
// Toast Component
// ============================================

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/utils';
import { Button } from './Button';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  onDismiss: (id: string) => void;
}

const iconMap = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
};

export function Toast({
  id,
  type,
  title,
  message,
  duration = 5000,
  persistent = false,
  onDismiss
}: ToastProps) {
  const { t } = useTranslation();
  
  useEffect(() => {
    if (persistent) return;
    
    const timer = setTimeout(() => {
      onDismiss(id);
    }, duration);
    
    return () => clearTimeout(timer);
  }, [id, duration, persistent, onDismiss]);
  
  const Icon = iconMap[type];
  
  return (
    <div className={cn('toast', `toast-${type}`)}>
      <Icon className="toast-icon" />
      <div className="toast-content">
        <p className="toast-title">{title}</p>
        {message && <p className="toast-message">{message}</p>}
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDismiss(id)}
        aria-label={t('aria_label_dismiss', 'Dismiss')}
        className="toast-close"
      >
        <X />
      </Button>
    </div>
  );
}

export interface ToastContainerProps {
  toasts: ToastProps[];
  onDismiss: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export function ToastContainer({ 
  toasts, 
  onDismiss, 
  position = 'top-right' 
}: ToastContainerProps) {
  if (toasts.length === 0) return null;
  
  return (
    <div className={cn('toast-container', `toast-container-${position}`)}>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}
