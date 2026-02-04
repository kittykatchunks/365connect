// ============================================
// Confirm Modal - Generic Confirmation Dialog
// ============================================

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  variant = 'danger'
}: ConfirmModalProps) {
  const { t } = useTranslation();
  
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };
  
  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="modal-close">
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="modal-body">
          <div className={`confirm-icon confirm-icon--${variant}`}>
            <AlertTriangle className="w-8 h-8" />
          </div>
          <p className="confirm-message">{message}</p>
        </div>
        
        <div className="modal-footer">
          <Button variant="ghost" onClick={onClose}>
            {cancelText || t('common.cancel', 'Cancel')}
          </Button>
          <Button 
            variant={variant === 'danger' ? 'danger' : 'primary'} 
            onClick={handleConfirm}
          >
            {confirmText || t('common.confirm', 'Confirm')}
          </Button>
        </div>
      </div>
    </div>
  );
}
