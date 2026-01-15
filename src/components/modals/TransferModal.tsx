// ============================================
// Transfer Modal - Blind and Attended Transfer UI
// ============================================

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PhoneForwarded, Phone, UserPlus, X } from 'lucide-react';
import { Modal, Button, Input } from '@/components/ui';
import { useSIP } from '@/hooks';
import { useUIStore } from '@/stores';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId?: string;
}

export function TransferModal({ isOpen, onClose, sessionId }: TransferModalProps) {
  const { t } = useTranslation();
  const [transferTarget, setTransferTarget] = useState('');
  const [transferType, setTransferType] = useState<'blind' | 'attended'>('blind');
  const [isTransferring, setIsTransferring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const addNotification = useUIStore((state) => state.addNotification);
  const { blindTransfer, startAttendedTransfer, currentSession } = useSIP();
  
  const targetSessionId = sessionId || currentSession?.id;
  
  const handleTransfer = useCallback(async () => {
    if (!transferTarget.trim()) {
      setError(t('transfer.error.no_target', 'Please enter a transfer target'));
      return;
    }
    
    if (!targetSessionId) {
      setError(t('transfer.error.no_session', 'No active call to transfer'));
      return;
    }
    
    setIsTransferring(true);
    setError(null);
    
    try {
      if (transferType === 'blind') {
        await blindTransfer(transferTarget.trim(), targetSessionId);
        addNotification({
          type: 'success',
          title: t('transfer.success', 'Transfer Initiated'),
          message: t('transfer.blind_success', 'Call transferred to {{target}}', { target: transferTarget })
        });
        onClose();
      } else {
        // Attended transfer - starts a new call, original on hold
        await startAttendedTransfer(transferTarget.trim(), targetSessionId);
        addNotification({
          type: 'info',
          title: t('transfer.attended_started', 'Attended Transfer'),
          message: t('transfer.attended_instructions', 'Speak with {{target}}, then complete transfer', { target: transferTarget })
        });
        onClose();
      }
      setTransferTarget('');
    } catch (err) {
      console.error('Transfer error:', err);
      setError(err instanceof Error ? err.message : t('transfer.error.failed', 'Transfer failed'));
    } finally {
      setIsTransferring(false);
    }
  }, [transferTarget, targetSessionId, transferType, blindTransfer, startAttendedTransfer, addNotification, onClose, t]);
  
  const handleClose = useCallback(() => {
    setTransferTarget('');
    setError(null);
    setTransferType('blind');
    onClose();
  }, [onClose]);
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('transfer.title', 'Transfer Call')}
      size="sm"
    >
      <div className="transfer-modal-content">
        {/* Transfer Type Selection */}
        <div className="transfer-type-tabs">
          <button
            type="button"
            className={`transfer-type-tab ${transferType === 'blind' ? 'active' : ''}`}
            onClick={() => setTransferType('blind')}
          >
            <PhoneForwarded className="w-4 h-4" />
            <span>{t('transfer.blind', 'Blind')}</span>
          </button>
          <button
            type="button"
            className={`transfer-type-tab ${transferType === 'attended' ? 'active' : ''}`}
            onClick={() => setTransferType('attended')}
          >
            <UserPlus className="w-4 h-4" />
            <span>{t('transfer.attended', 'Attended')}</span>
          </button>
        </div>
        
        {/* Transfer Description */}
        <p className="transfer-description text-sm text-muted-foreground">
          {transferType === 'blind'
            ? t('transfer.blind_description', 'Transfer the call directly without speaking to the recipient.')
            : t('transfer.attended_description', 'Speak with the recipient before completing the transfer.')
          }
        </p>
        
        {/* Transfer Target Input */}
        <div className="transfer-input-group">
          <label htmlFor="transfer-target" className="transfer-label">
            {t('transfer.target_label', 'Transfer to')}
          </label>
          <Input
            id="transfer-target"
            type="tel"
            value={transferTarget}
            onChange={(e) => setTransferTarget(e.target.value)}
            placeholder={t('transfer.target_placeholder', 'Enter extension or number')}
            disabled={isTransferring}
            autoFocus
          />
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="transfer-error text-sm text-danger">
            {error}
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="transfer-actions">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isTransferring}
          >
            <X className="w-4 h-4 mr-2" />
            {t('common.cancel', 'Cancel')}
          </Button>
          
          <Button
            variant="primary"
            onClick={handleTransfer}
            disabled={!transferTarget.trim() || isTransferring}
          >
            {isTransferring ? (
              <>
                <span className="animate-spin mr-2">⟳</span>
                {t('transfer.transferring', 'Transferring...')}
              </>
            ) : (
              <>
                <Phone className="w-4 h-4 mr-2" />
                {t('transfer.transfer', 'Transfer')}
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default TransferModal;
