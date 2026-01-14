// ============================================
// CLI Selector - Company Number Selection
// ============================================

import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Check, Phone, Building2, RefreshCw } from 'lucide-react';
import { cn } from '@/utils';
import { useAppStore, useSettingsStore } from '@/stores';

export interface CompanyNumber {
  id: string;
  number: string;
  name: string;
  isDefault?: boolean;
}

interface CLISelectorProps {
  className?: string;
}

export function CLISelector({ className }: CLISelectorProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Get company numbers from app store (will be populated from API)
  const companyNumbers = useAppStore((state) => state.companyNumbers);
  const selectedCLI = useAppStore((state) => state.selectedCLI);
  const setSelectedCLI = useAppStore((state) => state.setSelectedCLI);
  const fetchCompanyNumbers = useAppStore((state) => state.fetchCompanyNumbers);
  
  const showCLISelector = useSettingsStore((state) => state.settings.interface.showCompanyNumbersTab);
  
  // Find the currently selected number
  const selectedNumber = companyNumbers.find((n) => n.id === selectedCLI);
  
  // Toggle dropdown
  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);
  
  // Select a number
  const handleSelect = useCallback((number: CompanyNumber) => {
    setSelectedCLI(number.id);
    setIsOpen(false);
  }, [setSelectedCLI]);
  
  // Refresh company numbers
  const handleRefresh = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoading(true);
    try {
      await fetchCompanyNumbers();
    } catch (error) {
      console.error('Failed to refresh company numbers:', error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchCompanyNumbers]);
  
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
  if (!showCLISelector || companyNumbers.length === 0) {
    return null;
  }
  
  return (
    <div className={cn('cli-selector', className)}>
      <button
        type="button"
        className="cli-selector-trigger"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="cli-selector-value">
          <Building2 className="cli-selector-icon" />
          <div className="cli-selector-text">
            <span className="cli-selector-label">{t('cli.outbound_number', 'Outbound Number')}</span>
            <span className="cli-selector-number">
              {selectedNumber ? selectedNumber.name || selectedNumber.number : t('cli.select', 'Select...')}
            </span>
          </div>
        </div>
        <div className="cli-selector-actions">
          <button
            type="button"
            className="cli-refresh-btn"
            onClick={handleRefresh}
            disabled={isLoading}
            title={t('cli.refresh', 'Refresh')}
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </button>
          <ChevronDown className={cn('cli-selector-chevron', isOpen && 'rotate-180')} />
        </div>
      </button>
      
      {/* Dropdown */}
      {isOpen && (
        <div className="cli-selector-dropdown" role="listbox">
          {companyNumbers.map((number) => (
            <button
              key={number.id}
              type="button"
              className={cn(
                'cli-selector-option',
                selectedCLI === number.id && 'cli-selector-option-selected'
              )}
              onClick={() => handleSelect(number)}
              role="option"
              aria-selected={selectedCLI === number.id}
            >
              <Phone className="cli-option-icon" />
              <div className="cli-option-content">
                <span className="cli-option-name">{number.name || number.number}</span>
                {number.name && (
                  <span className="cli-option-number">{number.number}</span>
                )}
              </div>
              {selectedCLI === number.id && (
                <Check className="cli-option-check" />
              )}
              {number.isDefault && (
                <span className="cli-option-badge">{t('cli.default', 'Default')}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default CLISelector;
