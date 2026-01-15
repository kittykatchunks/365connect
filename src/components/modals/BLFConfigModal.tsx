// ============================================
// BLF Config Modal - Configure BLF/Speed Dial Button
// ============================================

import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Save } from 'lucide-react';
import { Modal, Button, Input, Select } from '@/components/ui';
import { useBLFStore } from '@/stores';
import type { BLFButtonType } from '@/types';

interface BLFConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  buttonIndex: number;
}

export function BLFConfigModal({ isOpen, onClose, buttonIndex }: BLFConfigModalProps) {
  const { t } = useTranslation();
  
  const buttons = useBLFStore((state) => state.buttons);
  const setButton = useBLFStore((state) => state.setButton);
  const clearButton = useBLFStore((state) => state.clearButton);
  
  const button = buttons.find((b) => b.index === buttonIndex);
  
  // Form state - initialize from button data
  const [type, setType] = useState<BLFButtonType>(() => button?.type || 'blf');
  const [extension, setExtension] = useState(() => button?.extension || '');
  const [displayName, setDisplayName] = useState(() => button?.displayName || '');
  const [error, setError] = useState<string | null>(null);
  
  // Reset form when modal opens with different button
  useEffect(() => {
    if (!isOpen) return;
    
    const currentButton = buttons.find((b) => b.index === buttonIndex);
    setType(currentButton?.type || 'blf');
    setExtension(currentButton?.extension || '');
    setDisplayName(currentButton?.displayName || '');
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, buttonIndex]);
  
  const handleSave = useCallback(() => {
    if (!extension.trim()) {
      setError(t('blf.error.extension_required', 'Extension or number is required'));
      return;
    }
    
    setButton(buttonIndex, {
      type,
      extension: extension.trim(),
      displayName: displayName.trim() || extension.trim()
    });
    
    onClose();
  }, [buttonIndex, type, extension, displayName, setButton, onClose, t]);
  
  const handleClear = useCallback(() => {
    clearButton(buttonIndex);
    onClose();
  }, [buttonIndex, clearButton, onClose]);
  
  const handleClose = useCallback(() => {
    setError(null);
    onClose();
  }, [onClose]);
  
  const typeOptions = [
    { value: 'blf', label: t('blf.type.blf', 'BLF (Busy Lamp Field)') },
    { value: 'speeddial', label: t('blf.type.speeddial', 'Speed Dial') }
  ];
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('blf.config.title', 'Configure Button {{index}}', { index: buttonIndex })}
      size="sm"
    >
      <div className="blf-config-content">
        {/* Button Type */}
        <div className="blf-config-field">
          <label htmlFor="blf-type" className="blf-config-label">
            {t('blf.config.type', 'Button Type')}
          </label>
          <Select
            id="blf-type"
            value={type}
            onChange={(e) => setType(e.target.value as BLFButtonType)}
            options={typeOptions}
          />
          <p className="blf-config-hint">
            {type === 'blf'
              ? t('blf.config.blf_hint', 'Shows presence status of an extension')
              : t('blf.config.speeddial_hint', 'Quick dial to any number')
            }
          </p>
        </div>
        
        {/* Extension/Number */}
        <div className="blf-config-field">
          <label htmlFor="blf-extension" className="blf-config-label">
            {type === 'blf'
              ? t('blf.config.extension', 'Extension')
              : t('blf.config.number', 'Phone Number')
            }
          </label>
          <Input
            id="blf-extension"
            type="tel"
            value={extension}
            onChange={(e) => setExtension(e.target.value)}
            placeholder={type === 'blf' ? '101' : '+1234567890'}
            autoFocus
          />
        </div>
        
        {/* Display Name */}
        <div className="blf-config-field">
          <label htmlFor="blf-name" className="blf-config-label">
            {t('blf.config.display_name', 'Display Name')}
          </label>
          <Input
            id="blf-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t('blf.config.name_placeholder', 'e.g. John Smith')}
          />
        </div>
        
        {/* Error */}
        {error && (
          <div className="blf-config-error text-sm text-danger">
            {error}
          </div>
        )}
        
        {/* Actions */}
        <div className="blf-config-actions">
          {button?.extension && (
            <Button
              variant="danger"
              onClick={handleClear}
              className="mr-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t('blf.config.clear', 'Clear')}
            </Button>
          )}
          
          <Button
            variant="ghost"
            onClick={handleClose}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          
          <Button
            variant="primary"
            onClick={handleSave}
          >
            <Save className="w-4 h-4 mr-2" />
            {t('blf.config.save', 'Save')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default BLFConfigModal;
