// ============================================
// Pause Reason Modal - Select pause reason
// ============================================

import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Button } from '@/components/ui';
import type { PauseReason } from '@/types/agent';

interface PauseReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (code: number, label: string) => Promise<void>;
  reasons: PauseReason[];
  isLoading?: boolean;
}

export function PauseReasonModal({ 
  isOpen, 
  onClose, 
  onSelect,
  reasons,
  isLoading = false 
}: PauseReasonModalProps) {
  const { t } = useTranslation();
  
  const handleSelect = async (code: number, label: string) => {
    await onSelect(code, label);
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content pause-reason-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('agent.select_pause_reason', 'Select Pause Reason')}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="modal-close" disabled={isLoading}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="modal-body">
          <div className="pause-reason-list">
            {reasons.map((reason) => (
              <button
                key={reason.code}
                className="pause-reason-button"
                onClick={() => handleSelect(reason.code, reason.label)}
                disabled={isLoading}
              >
                <span className="pause-reason-code">{reason.code}</span>
                <span className="pause-reason-label">{reason.label}</span>
              </button>
            ))}
          </div>
        </div>
        
        <div className="modal-footer">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
          >
            <X className="w-4 h-4 mr-2" />
            {t('common.cancel', 'Cancel')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default PauseReasonModal;
