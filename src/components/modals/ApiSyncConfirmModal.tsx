// ============================================
// API Sync Confirm Modal - Company Numbers API Sync
// ============================================

import { useTranslation } from 'react-i18next';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui';
import type { CompanyNumber } from '@/types/companyNumber';

interface ApiSyncConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  apiData: CompanyNumber[];
  localData: CompanyNumber[];
}

export function ApiSyncConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  apiData,
  localData
}: ApiSyncConfirmModalProps) {
  const { t } = useTranslation();
  
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content api-sync-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-icon warning">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2>{t('company_numbers.confirm_sync', 'Confirm Synchronization')}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="modal-close">
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="modal-body">
          <p className="sync-warning">
            {t('company_numbers.sync_warning', 'All Company Numbers will be overwritten with new retrieved version, are you sure you wish to continue?')}
          </p>
          
          <div className="sync-stats">
            <div className="sync-stat">
              <span className="sync-stat-label">{t('company_numbers.current_numbers', 'Current Numbers')}</span>
              <span className="sync-stat-value">{localData.length}</span>
            </div>
            <div className="sync-stat-arrow">→</div>
            <div className="sync-stat">
              <span className="sync-stat-label">{t('company_numbers.api_numbers', 'API Numbers')}</span>
              <span className="sync-stat-value highlight">{apiData.length}</span>
            </div>
          </div>
          
          {apiData.length > 0 && (
            <div className="sync-preview">
              <h4>{t('company_numbers.api_data_preview', 'Preview of API Data')}</h4>
              <div className="sync-preview-list">
                {apiData.slice(0, 5).map((company) => (
                  <div key={company.company_id} className="sync-preview-item">
                    <span className="preview-id">#{company.company_id}</span>
                    <span className="preview-name">{company.name}</span>
                    <span className="preview-cid">{company.cid}</span>
                  </div>
                ))}
                {apiData.length > 5 && (
                  <div className="sync-preview-more">
                    {t('company_numbers.and_more', '... and {{count}} more', { count: apiData.length - 5 })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="modal-footer">
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            {t('common.confirm', 'Confirm & Sync')}
          </Button>
        </div>
      </div>
    </div>
  );
}
