// ============================================
// CLI Selector - Company Number Selection
// ============================================

import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Check, Phone, Building2 } from 'lucide-react';
import { cn } from '@/utils';
import { useCompanyNumbersStore, useSettingsStore } from '@/stores';
import { useSIP } from '@/hooks';
import { isVerboseLoggingEnabled } from '@/utils';

interface CLISelectorProps {
  className?: string;
}

export function CLISelector({ className }: CLISelectorProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  
  const verboseLogging = isVerboseLoggingEnabled();
  
  // Get company numbers and state from store
  const numbers = useCompanyNumbersStore((state) => state.numbers);
  const currentCompany = useCompanyNumbersStore((state) => state.currentCompany);
  const pendingCompany = useCompanyNumbersStore((state) => state.pendingCompany);
  const setPendingCompany = useCompanyNumbersStore((state) => state.setPendingCompany);
  const confirmCliChange = useCompanyNumbersStore((state) => state.confirmCliChange);
  const isSyncing = useCompanyNumbersStore((state) => state.isSyncing);
  
  const showCLISelector = useSettingsStore((state) => state.settings.interface.showCompanyNumbersTab);
  
  // SIP hook for making calls
  const { makeCall } = useSIP();
  
  // Toggle dropdown
  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);
  
  // Select a number (set as pending)
  const handleSelect = useCallback((company: typeof numbers[0]) => {
    if (verboseLogging) {
      console.log('[CLISelector] Setting pending company:', company);
    }
    setPendingCompany(company);
    setIsOpen(false);
  }, [setPendingCompany, verboseLogging]);
  
  // Confirm CLI change (dial *82*{id})
  const handleConfirm = useCallback(async () => {
    if (!pendingCompany) return;
    
    if (verboseLogging) {
      console.log('[CLISelector] Confirming CLI change to:', pendingCompany);
    }
    
    const success = await confirmCliChange(makeCall);
    
    if (!success) {
      console.error('[CLISelector] Failed to confirm CLI change');
    }
  }, [pendingCompany, confirmCliChange, makeCall, verboseLogging]);
  
  // Cancel pending selection
  const handleCancelPending = useCallback(() => {
    if (verboseLogging) {
      console.log('[CLISelector] Cancelling pending CLI change');
    }
    setPendingCompany(null);
  }, [setPendingCompany, verboseLogging]);
  
  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.cli-selector')) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen]);
  
  // Don't render if no company numbers or feature disabled
  if (!showCLISelector || numbers.length === 0) {
    return null;
  }
  
  return (
    <div className={cn('cli-selector', className)}>
      {/* Dropdown selector */}
      <button
        type="button"
        className="cli-selector-trigger"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        disabled={!!pendingCompany}
      >
        <div className="cli-selector-value">
          <Building2 className="cli-selector-icon" />
          <div className="cli-selector-text">
            <span className="cli-selector-label">{t('cli.select_company', 'Select Company CLI')}</span>
            <span className="cli-selector-number">
              {currentCompany 
                ? `${currentCompany.name} - ${currentCompany.cid}`
                : t('cli.no_cli_selected', 'No CLI Selected')
              }
            </span>
          </div>
        </div>
        <ChevronDown className={cn('cli-selector-chevron', isOpen && 'rotate-180')} />
      </button>
      
      {/* Dropdown */}
      {isOpen && (
        <div className="cli-selector-dropdown" role="listbox">
          {numbers.map((number) => (
            <button
              key={number.company_id}
              type="button"
              className={cn(
                'cli-selector-option',
                currentCompany?.company_id === number.company_id && 'cli-selector-option-selected'
              )}
              onClick={() => handleSelect(number)}
              role="option"
              aria-selected={currentCompany?.company_id === number.company_id}
            >
              <Phone className="cli-option-icon" />
              <div className="cli-option-content">
                <span className="cli-option-name">{number.name}</span>
                <span className="cli-option-number">{number.cid}</span>
                <span className="cli-option-id">ID: {number.company_id}</span>
              </div>
              {currentCompany?.company_id === number.company_id && (
                <Check className="cli-option-check" />
              )}
            </button>
          ))}
        </div>
      )}
      
      {/* Orange Confirm Button - Shows when pending selection */}
      {pendingCompany && (
        <div className="cli-confirm-container">
          <button
            type="button"
            className="cli-confirm-btn"
            onClick={handleConfirm}
            disabled={isSyncing}
          >
            <Phone className="w-4 h-4" />
            <div className="cli-confirm-text">
              <span className="cli-confirm-label">{t('cli.confirm_change', 'Confirm CLI Change')}</span>
              <span className="cli-confirm-number">
                {pendingCompany.name} - {pendingCompany.cid}
              </span>
            </div>
          </button>
          <button
            type="button"
            className="cli-cancel-btn"
            onClick={handleCancelPending}
            title={t('common.cancel', 'Cancel')}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

export default CLISelector;
