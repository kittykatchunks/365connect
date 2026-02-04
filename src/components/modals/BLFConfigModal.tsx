// ============================================
// BLF Config Modal - Configure BLF/Speed Dial Button
// ============================================

import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Save, X } from 'lucide-react';
import { Button, Input, Select } from '@/components/ui';
import { useBLFStore, useSettingsStore } from '@/stores';
import { useImmediateBLFSubscription } from '@/hooks';
import type { BLFButtonType, BLFTransferMethod } from '@/types';

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
  const preferBlindTransfer = useSettingsStore((state) => state.settings.call.preferBlindTransfer);
  
  // Hook for immediate BLF subscription
  const { subscribeImmediately } = useImmediateBLFSubscription();
  
  const button = buttons.find((b) => b.index === buttonIndex);
  
  // Form state - initialize from button data
  const [type, setType] = useState<BLFButtonType>(() => button?.type || 'blf');
  const [extension, setExtension] = useState(() => button?.extension || '');
  const [displayName, setDisplayName] = useState(() => button?.displayName || '');
  const [overrideTransfer, setOverrideTransfer] = useState(() => button?.overrideTransfer || false);
  const [transferMethod, setTransferMethod] = useState<BLFTransferMethod>(() => {
    if (button?.transferMethod) {
      return button.transferMethod;
    }
    // Default to opposite of current global preference
    return preferBlindTransfer ? 'attended' : 'blind';
  });
  const [error, setError] = useState<string | null>(null);
  
  // Reset form when modal opens with different button
  useEffect(() => {
    if (!isOpen) return;
    
    const currentButton = buttons.find((b) => b.index === buttonIndex);
    setType(currentButton?.type || 'blf');
    setExtension(currentButton?.extension || '');
    setDisplayName(currentButton?.displayName || '');
    setOverrideTransfer(currentButton?.overrideTransfer || false);
    setTransferMethod(currentButton?.transferMethod || (preferBlindTransfer ? 'attended' : 'blind'));
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, buttonIndex]);
  
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (!extension.trim()) {
      setError(t('blf.error.extension_required', 'Extension or number is required'));
      return;
    }
    
    const trimmedExtension = extension.trim();
    
    // Validate based on button type
    if (type === 'blf') {
      // BLF extension must be 3-5 numerical characters only
      const blfRegex = /^\d{3,5}$/;
      if (!blfRegex.test(trimmedExtension)) {
        setError(t('blf.error.extension_invalid', 'Extension must be 3-5 digits only'));
        return;
      }
    } else if (type === 'speeddial') {
      // Speed dial phone number must be +, *, #, or 0-9 characters only
      const speedDialRegex = /^[+*#0-9]+$/;
      if (!speedDialRegex.test(trimmedExtension)) {
        setError(t('blf.error.number_invalid', 'Phone number can only contain +, *, #, and digits (0-9)'));
        return;
      }
    }
    
    // Save the button configuration
    setButton(buttonIndex, {
      type,
      extension: trimmedExtension,
      displayName: displayName.trim() || trimmedExtension,
      overrideTransfer,
      transferMethod: overrideTransfer ? transferMethod : undefined
    });
    
    // Immediately subscribe to BLF if this is a BLF button (not speed dial)
    if (type === 'blf') {
      subscribeImmediately(trimmedExtension);
    }
    
    onClose();
  }, [buttonIndex, type, extension, displayName, overrideTransfer, transferMethod, setButton, subscribeImmediately, onClose, t]);
  
  const handleClear = useCallback(() => {
    clearButton(buttonIndex);
    onClose();
  }, [buttonIndex, clearButton, onClose]);
  
  const typeOptions = [
    { value: 'blf', label: t('blf.type.blf', 'BLF (Busy Lamp Field)') },
    { value: 'speeddial', label: t('blf.type.speeddial', 'Speed Dial') }
  ];
  
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
      <div className="modal-content contact-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('blf.config.title', 'Configure Button {{index}}', { index: buttonIndex })}</h2>
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
            <label htmlFor="blf-type">
              {t('blf.config.type', 'Button Type')}
            </label>
            <Select
              id="blf-type"
              value={type}
              onChange={(e) => setType(e.target.value as BLFButtonType)}
              options={typeOptions}
            />
            <p className="form-hint">
              {type === 'blf'
                ? t('blf.config.blf_hint', 'Shows presence status of an extension')
                : t('blf.config.speeddial_hint', 'Quick dial to any number')
              }
            </p>
          </div>
          
          <div className="form-group">
            <label htmlFor="blf-extension">
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
              placeholder={type === 'blf' 
                ? t('blf_extension_placeholder', '101') 
                : t('speeddial_number_placeholder', '+1234567890')
              }
              autoFocus
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="blf-name">
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
          
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={overrideTransfer}
                onChange={(e) => setOverrideTransfer(e.target.checked)}
              />
              <span>{t('blf.config.override_transfer', 'Override default transfer method for this button')}</span>
            </label>
          </div>
          
          {overrideTransfer && (
            <div className="form-group" style={{ marginLeft: '20px' }}>
              <label htmlFor="blf-transfer-method">
                {t('blf.config.transfer_method', 'Transfer Method')}
              </label>
              <Select
                id="blf-transfer-method"
                value={transferMethod}
                onChange={(e) => setTransferMethod(e.target.value as BLFTransferMethod)}
                options={[
                  { value: 'blind', label: t('blf.config.blind_transfer', 'Blind Transfer') },
                  { value: 'attended', label: t('blf.config.attended_transfer', 'Attended Transfer') }
                ]}
              />
              <p className="form-hint">
                {t('blf.config.transfer_hint', 'Current default: {{method}}', { 
                  method: preferBlindTransfer 
                    ? t('blf.config.blind_transfer', 'Blind Transfer')
                    : t('blf.config.attended_transfer', 'Attended Transfer')
                })}
              </p>
            </div>
          )}
          
          <div className="modal-footer">
            {button?.extension && (
              <Button
                variant="danger"
                type="button"
                onClick={handleClear}
                className="mr-auto"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('blf.config.clear', 'Clear')}
              </Button>
            )}
            
            <Button variant="ghost" type="button" onClick={onClose}>
              {t('common.cancel', 'Cancel')}
            </Button>
            
            <Button variant="primary" type="submit">
              <Save className="w-4 h-4 mr-2" />
              {t('blf.config.save', 'Save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BLFConfigModal;
