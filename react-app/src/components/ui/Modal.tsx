// ============================================
// Modal Component
// ============================================

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils';
import { Button } from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closable?: boolean;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closable = true,
  className
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    
    if (isOpen) {
      dialog.showModal();
      document.body.style.overflow = 'hidden';
    } else {
      dialog.close();
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closable) {
        onClose();
      }
    };
    
    const handleBackdropClick = (e: MouseEvent) => {
      if (e.target === dialog && closable) {
        onClose();
      }
    };
    
    dialog.addEventListener('keydown', handleKeyDown);
    dialog.addEventListener('click', handleBackdropClick);
    
    return () => {
      dialog.removeEventListener('keydown', handleKeyDown);
      dialog.removeEventListener('click', handleBackdropClick);
    };
  }, [closable, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <dialog
      ref={dialogRef}
      className={cn('modal-backdrop', className)}
    >
      <div className={cn('modal-container', `modal-${size}`)}>
        {(title || closable) && (
          <div className="modal-header">
            <div className="modal-header-text">
              {title && <h2 className="modal-title">{title}</h2>}
              {description && <p className="modal-description">{description}</p>}
            </div>
            {closable && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="Close"
                className="modal-close"
              >
                <X />
              </Button>
            )}
          </div>
        )}
        
        <div className="modal-content">
          {children}
        </div>
        
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
}
