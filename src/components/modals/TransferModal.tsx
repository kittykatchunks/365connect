// ============================================
// Transfer Modal - Blind and Attended Transfer UI
// Matches PWA implementation with two-state modal:
// 1. Initial state: Transfer number input with Blind/Attended/Cancel buttons
// 2. Attended state: Shows transfer progress with Complete/Cancel buttons
// ============================================

import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PhoneForwarded, Phone, X } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { useSIP } from '@/hooks';
import { useUIStore } from '@/stores';
import { isVerboseLoggingEnabled } from '@/utils';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId?: string;
  initialTarget?: string;
  autoStartAttended?: boolean;
}

export function TransferModal({ isOpen, onClose, sessionId, initialTarget, autoStartAttended }: TransferModalProps) {
  const { t } = useTranslation();
  const verboseLogging = isVerboseLoggingEnabled();
  
  const [transferTarget, setTransferTarget] = useState(initialTarget || '');
  const [isInAttendedMode, setIsInAttendedMode] = useState(false);
  const [attendedStatus, setAttendedStatus] = useState('Calling transfer target...');
  const [canCompleteTransfer, setCanCompleteTransfer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const addNotification = useUIStore((state) => state.addNotification);
  const { 
    blindTransfer, 
    startAttendedTransfer, 
    completeAttendedTransfer,
    cancelAttendedTransfer,
    currentSession 
  } = useSIP();
  
  const targetSessionId = sessionId || currentSession?.id;
  
  const handleClose = useCallback(() => {
    if (verboseLogging) {
      console.log('[TransferModal] 🔄 Closing transfer modal');
    }

    setTransferTarget('');
    setError(null);
    setIsInAttendedMode(false);
    setAttendedStatus('Calling transfer target...');
    setCanCompleteTransfer(false);
    onClose();
  }, [onClose, verboseLogging]);
  
  // Reset modal state when opened/closed
  useEffect(() => {
    if (!isOpen) {
      setTransferTarget('');
      setIsInAttendedMode(false);
      setAttendedStatus('Calling transfer target...');
      setCanCompleteTransfer(false);
      setError(null);
    } else {
      if (verboseLogging) {
        console.log('[TransferModal] 🔄 Opening transfer modal', { initialTarget, autoStartAttended });
      }
      
      // Set initial target if provided
      if (initialTarget) {
        setTransferTarget(initialTarget);
      }
    }
  }, [isOpen, initialTarget, autoStartAttended, verboseLogging]);
  
  // Listen for attended transfer events
  useEffect(() => {
    if (!isOpen) return;
    
    const handleAttendedTransferAnswered = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (verboseLogging) {
        console.log('[TransferModal] 📞 Attended transfer answered event received:', customEvent.detail);
      }
      
      setAttendedStatus(`${transferTarget} answered. You can now speak with them or complete the transfer.`);
      setCanCompleteTransfer(true);
      
      addNotification({
        type: 'success',
        title: t('transfer.answered', 'Transfer Target Answered'),
        message: t('transfer.answered_message', 'You can now speak with {{target}} or complete the transfer', { target: transferTarget })
      });
    };
    
    const handleAttendedTransferRejected = (event: Event) => {
      const customEvent = event as CustomEvent;
      const reason = customEvent.detail?.reason || 'Call rejected';
      
      if (verboseLogging) {
        console.log('[TransferModal] ❌ Attended transfer rejected event received:', customEvent.detail);
      }
      
      setError(t('transfer.rejected', 'Transfer target rejected the call: {{reason}}', { reason }));
      
      addNotification({
        type: 'error',
        title: t('transfer.rejected_title', 'Transfer Rejected'),
        message: reason
      });
      
      // Return to initial state after a delay
      setTimeout(() => {
        setIsInAttendedMode(false);
        setAttendedStatus('Calling transfer target...');
        setCanCompleteTransfer(false);
        setError(null);
      }, 2000);
    };
    
    const handleAttendedTransferTerminated = (event: Event) => {
      const customEvent = event as CustomEvent;
      const reason = customEvent.detail?.reason || 'Connection ended';
      
      if (verboseLogging) {
        console.log('[TransferModal] 📴 Attended transfer terminated event received:', customEvent.detail);
      }
      
      addNotification({
        type: 'error',
        title: t('transfer.terminated', 'Transfer Terminated'),
        message: t('transfer.terminated_message', 'Transfer to {{target}} terminated: {{reason}}', { target: transferTarget, reason })
      });
      
      // Close modal and reset
      handleClose();
    };
    
    const handleAttendedTransferCompleted = (event: Event) => {
      const customEvent = event as CustomEvent;
      
      if (verboseLogging) {
        console.log('[TransferModal] ✅ Attended transfer completed event received:', customEvent.detail);
      }
      
      if (customEvent.detail?.success) {
        addNotification({
          type: 'success',
          title: t('transfer.completed', 'Transfer Completed'),
          message: t('transfer.completed_success', 'Transfer completed successfully')
        });
        
        handleClose();
      } else {
        setError(customEvent.detail?.reason || t('transfer.error.completion_failed', 'Transfer completion failed'));
        
        addNotification({
          type: 'error',
          title: t('transfer.failed', 'Transfer Failed'),
          message: customEvent.detail?.reason || t('transfer.error.completion_failed', 'Transfer completion failed')
        });
      }
    };
    
    const handleTransferCompleted = (event: Event) => {
      const customEvent = event as CustomEvent;
      
      if (verboseLogging) {
        console.log('[TransferModal] ✅ Transfer completed event received:', customEvent.detail);
      }
      
      if (customEvent.detail?.success) {
        addNotification({
          type: 'success',
          title: t('transfer.completed', 'Transfer Completed'),
          message: t('transfer.completed_success', 'Call transferred to {{target}}', { target: customEvent.detail.target })
        });
        
        handleClose();
      } else {
        setError(customEvent.detail?.reason || t('transfer.error.failed', 'Transfer failed'));
        
        addNotification({
          type: 'error',
          title: t('transfer.failed', 'Transfer Failed'),
          message: customEvent.detail?.reason || t('transfer.error.failed', 'Transfer failed')
        });
      }
    };
    
    // Add event listeners
    window.addEventListener('attendedTransferAnswered', handleAttendedTransferAnswered);
    window.addEventListener('attendedTransferRejected', handleAttendedTransferRejected);
    window.addEventListener('attendedTransferTerminated', handleAttendedTransferTerminated);
    window.addEventListener('attendedTransferCompleted', handleAttendedTransferCompleted);
    window.addEventListener('transferCompleted', handleTransferCompleted);
    
    // Cleanup
    return () => {
      window.removeEventListener('attendedTransferAnswered', handleAttendedTransferAnswered);
      window.removeEventListener('attendedTransferRejected', handleAttendedTransferRejected);
      window.removeEventListener('attendedTransferTerminated', handleAttendedTransferTerminated);
      window.removeEventListener('attendedTransferCompleted', handleAttendedTransferCompleted);
      window.removeEventListener('transferCompleted', handleTransferCompleted);
    };
  }, [isOpen, transferTarget, addNotification, t, verboseLogging, handleClose]);
  
  // Handle blind transfer
  const handleBlindTransfer = useCallback(async () => {
    if (verboseLogging) {
      console.log('[TransferModal] 🚀 performBlindTransfer starting...');
    }

    if (!transferTarget.trim()) {
      setError(t('transfer.error.no_target', 'Please enter a number to transfer to'));
      return;
    }
    
    if (!targetSessionId) {
      setError(t('transfer.error.no_session', 'No active call to transfer'));
      return;
    }
    
    try {
      if (verboseLogging) {
        console.log('[TransferModal] 🎯 About to call blindTransfer method...', {
          target: transferTarget.trim(),
          sessionId: targetSessionId
        });
      }

      addNotification({
        type: 'info',
        title: t('transfer.initiating', 'Initiating Transfer'),
        message: t('transfer.blind_initiating', 'Initiating blind transfer to {{target}}...', { target: transferTarget })
      });

      await blindTransfer(transferTarget.trim(), targetSessionId);
      
      if (verboseLogging) {
        console.log('[TransferModal] ✅ blindTransfer method completed');
      }

      // Don't close modal here - wait for transfer completion event
      // The REFER response handlers in SIPService will emit transferCompleted event
      
    } catch (err) {
      console.error('[TransferModal] ❌ Failed to perform blind transfer:', err);
      setError(err instanceof Error ? err.message : t('transfer.error.failed', 'Transfer failed'));
      
      addNotification({
        type: 'error',
        title: t('transfer.failed', 'Transfer Failed'),
        message: err instanceof Error ? err.message : t('transfer.error.failed', 'Transfer failed')
      });
    }
  }, [transferTarget, targetSessionId, blindTransfer, addNotification, t, verboseLogging]);
  
  // Handle attended transfer initiation
  const handleAttendedTransfer = useCallback(async () => {
    if (verboseLogging) {
      console.log('[TransferModal] 🚀 performAttendedTransfer starting...');
    }

    if (!transferTarget.trim()) {
      setError(t('transfer.error.no_target', 'Please enter a number to transfer to'));
      return;
    }
    
    if (!targetSessionId) {
      setError(t('transfer.error.no_session', 'No active call to transfer'));
      return;
    }
    
    try {
      if (verboseLogging) {
        console.log('[TransferModal] 📞 Starting attended transfer to:', transferTarget.trim());
      }

      // Switch to attended transfer UI
      setIsInAttendedMode(true);
      setAttendedStatus(`Calling transfer target ${transferTarget}...`);
      setCanCompleteTransfer(false);
      setError(null);
      
      // Start attended transfer (creates consultation call)
      await startAttendedTransfer(transferTarget.trim(), targetSessionId);
      
      if (verboseLogging) {
        console.log('[TransferModal] ✅ Attended transfer initiated');
      }
      
    } catch (err) {
      console.error('[TransferModal] ❌ Failed to initiate attended transfer:', err);
      setError(err instanceof Error ? err.message : t('transfer.error.failed', 'Transfer failed'));
      
      // Return to initial state
      setIsInAttendedMode(false);
      
      addNotification({
        type: 'error',
        title: t('transfer.failed', 'Transfer Failed'),
        message: err instanceof Error ? err.message : t('transfer.error.failed', 'Transfer failed')
      });
    }
  }, [transferTarget, targetSessionId, startAttendedTransfer, addNotification, t, verboseLogging]);
  
  // Auto-start attended transfer if requested (must be after handleAttendedTransfer is defined)
  useEffect(() => {
    if (isOpen && autoStartAttended && initialTarget && targetSessionId && !isInAttendedMode) {
      // Small delay to ensure modal is fully rendered and transferTarget state is set
      const timer = setTimeout(() => {
        if (verboseLogging) {
          console.log('[TransferModal] 🚀 Auto-starting attended transfer to:', initialTarget);
        }
        handleAttendedTransfer();
      }, 150);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoStartAttended, initialTarget, targetSessionId, isInAttendedMode, handleAttendedTransfer, verboseLogging]);
  
  // Handle complete attended transfer
  const handleCompleteTransfer = useCallback(async () => {
    if (!targetSessionId) {
      console.error('[TransferModal] No transfer session available');
      return;
    }
    
    try {
      if (verboseLogging) {
        console.log('[TransferModal] 📞 Completing attended transfer');
      }

      await completeAttendedTransfer(targetSessionId);
      
      addNotification({
        type: 'success',
        title: t('transfer.completed', 'Transfer Completed'),
        message: t('transfer.completed_success', 'Transfer completed successfully')
      });
      
      onClose();
      
    } catch (err) {
      console.error('[TransferModal] ❌ Failed to complete attended transfer:', err);
      setError(err instanceof Error ? err.message : t('transfer.error.completion_failed', 'Transfer completion failed'));
      
      addNotification({
        type: 'error',
        title: t('transfer.failed', 'Transfer Failed'),
        message: err instanceof Error ? err.message : t('transfer.error.completion_failed', 'Transfer completion failed')
      });
    }
  }, [targetSessionId, completeAttendedTransfer, addNotification, onClose, t, verboseLogging]);
  
  // Handle cancel attended transfer
  const handleCancelTransfer = useCallback(async () => {
    if (!targetSessionId) {
      console.error('[TransferModal] No original session available');
      return;
    }
    
    try {
      if (verboseLogging) {
        console.log('[TransferModal] 🚫 Cancelling attended transfer');
      }

      await cancelAttendedTransfer(targetSessionId);
      
      // Reset to initial state
      setIsInAttendedMode(false);
      setAttendedStatus('Calling transfer target...');
      setCanCompleteTransfer(false);
      setTransferTarget('');
      setError(null);
      
      addNotification({
        type: 'info',
        title: t('transfer.cancelled', 'Transfer Cancelled'),
        message: t('transfer.cancelled_message', 'Transfer cancelled')
      });
      
    } catch (err) {
      console.error('[TransferModal] ❌ Failed to cancel attended transfer:', err);
      setError(err instanceof Error ? err.message : t('transfer.error.cancel_failed', 'Failed to cancel transfer'));
      
      addNotification({
        type: 'error',
        title: t('transfer.error.cancel_failed', 'Cancel Failed'),
        message: err instanceof Error ? err.message : t('transfer.error.cancel_failed', 'Failed to cancel transfer')
      });
    }
  }, [targetSessionId, cancelAttendedTransfer, addNotification, t, verboseLogging]);
  
  // Handle Enter key press for transfer
  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && transferTarget.trim() && !isInAttendedMode) {
      // Default to blind transfer on Enter (can be changed to attended via settings later)
      handleBlindTransfer();
    }
  }, [transferTarget, isInAttendedMode, handleBlindTransfer]);
  
  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);
  
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay" onClick={!isInAttendedMode ? handleClose : undefined}>
      <div className="modal-content transfer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('transfer.title', 'Transfer Call')}</h2>
          {!isInAttendedMode && (
            <Button variant="ghost" size="sm" onClick={handleClose} className="modal-close">
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
        
        {!isInAttendedMode ? (
          <>
            {/* Initial Transfer State */}
            <div className="modal-body">
              {error && (
                <div className="form-error">
                  {error}
                </div>
              )}
              
              <div className="form-group">
                <label htmlFor="transfer-target">
                  {t('transfer.target_label', 'Transfer to number:')}
                </label>
                <Input
                  id="transfer-target"
                  type="tel"
                  value={transferTarget}
                  onChange={(e) => setTransferTarget(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={t('transfer.target_placeholder', 'Enter number to transfer to')}
                  icon={<Phone className="w-4 h-4" />}
                  autoFocus
                />
              </div>
            </div>
            
            <div className="modal-footer">
              <Button
                variant="ghost"
                onClick={handleClose}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              
              <Button
                variant="secondary"
                onClick={handleAttendedTransfer}
                disabled={!transferTarget.trim()}
              >
                <Phone className="w-4 h-4 mr-2" />
                {t('transfer.attended', 'Attended')}
              </Button>
              
              <Button
                variant="primary"
                onClick={handleBlindTransfer}
                disabled={!transferTarget.trim()}
              >
                <PhoneForwarded className="w-4 h-4 mr-2" />
                {t('transfer.blind', 'Blind')}
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Attended Transfer Progress State */}
            <div className="modal-body">
              {error && (
                <div className="form-error">
                  {error}
                </div>
              )}
              
              <div className="transfer-status">
                <p>{attendedStatus}</p>
              </div>
            </div>
            
            <div className="modal-footer">
              <Button
                variant="ghost"
                onClick={handleCancelTransfer}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              
              <Button
                variant="primary"
                onClick={handleCompleteTransfer}
                disabled={!canCompleteTransfer}
              >
                <PhoneForwarded className="w-4 h-4 mr-2" />
                {t('transfer.complete', 'Complete Transfer')}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default TransferModal;
