// ============================================
// Company Number Modal - Add/Edit Company Number
// ============================================

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Building2, Phone, Hash } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { useCompanyNumbersStore } from '@/stores';
import type { CompanyNumber, CompanyNumberFormData } from '@/types/companyNumber';

interface CompanyNumberModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyNumber?: CompanyNumber | null;
}

export function CompanyNumberModal({ isOpen, onClose, companyNumber }: CompanyNumberModalProps) {
  const { t } = useTranslation();
  
  const addNumber = useCompanyNumbersStore((state) => state.addNumber);
  const updateNumber = useCompanyNumbersStore((state) => state.updateNumber);
  const getNextAvailableId = useCompanyNumbersStore((state) => state.getNextAvailableId);
  const isIdAvailable = useCompanyNumbersStore((state) => state.isIdAvailable);
  
  const [formData, setFormData] = useState<CompanyNumberFormData>({
    company_id: 1,
    name: '',
    cid: ''
  });
  const [error, setError] = useState<string | null>(null);
  
  const isEditing = !!companyNumber;
  
  // Initialize form when modal opens
  useEffect(() => {
    if (!isOpen) return;
    
    if (companyNumber) {
      setFormData({
        company_id: companyNumber.company_id,
        name: companyNumber.name,
        cid: companyNumber.cid
      });
    } else {
      setFormData({
        company_id: getNextAvailableId(),
        name: '',
        cid: ''
      });
    }
    setError(null);
  }, [isOpen, companyNumber, getNextAvailableId]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (isEditing && companyNumber) {
      const result = updateNumber(companyNumber.company_id, {
        name: formData.name,
        cid: formData.cid
      });
      if (result) {
        // Translate the error key returned from the store
        setError(t(result, result));
        return;
      }
    } else {
      // Check ID availability for new entries
      if (!isIdAvailable(formData.company_id)) {
        setError(t('company_numbers.error_id_exists', 'Company ID already exists'));
        return;
      }
      
      const result = addNumber(formData);
      if (result) {
        // Translate the error key returned from the store
        setError(t(result, result));
        return;
      }
    }
    
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content company-number-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {isEditing 
              ? t('company_numbers.edit_title', 'Edit Company Number') 
              : t('company_numbers.add_title', 'Add Company Number')
            }
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="modal-close">
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          {error && (
            <div className="form-error">
              {error}
            </div>
          )}
          
          <div className="form-group">
            <label>{t('company_numbers.company_id', 'Company ID')} (1-99) *</label>
            <Input
              type="number"
              min={1}
              max={99}
              value={formData.company_id}
              onChange={(e) => setFormData({ ...formData, company_id: parseInt(e.target.value) || 1 })}
              disabled={isEditing}
              icon={<Hash className="w-4 h-4" />}
              required
            />
            {!isEditing && (
              <span className="form-hint">
                {t('company_numbers.id_hint', 'Next available: {{id}}', { id: getNextAvailableId() })}
              </span>
            )}
          </div>
          
          <div className="form-group">
            <label>{t('company_numbers.company_name', 'Company Name')} *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('company_numbers.name_placeholder', 'Acme Taxis')}
              icon={<Building2 className="w-4 h-4" />}
              required
            />
          </div>
          
          <div className="form-group">
            <label>{t('company_numbers.caller_id', 'Caller ID (Phone Number)')} *</label>
            <Input
              value={formData.cid}
              onChange={(e) => setFormData({ ...formData, cid: e.target.value })}
              placeholder={t('company_numbers.cid_placeholder', '+1 555 123 4567')}
              icon={<Phone className="w-4 h-4" />}
              required
            />
          </div>
          
          <div className="modal-footer">
            <Button variant="ghost" type="button" onClick={onClose}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button variant="primary" type="submit">
              {isEditing ? t('common.save', 'Save') : t('company_numbers.add', 'Add Number')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
