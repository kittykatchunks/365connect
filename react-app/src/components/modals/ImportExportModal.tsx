// ============================================
// Import/Export Modal - Data import and export
// ============================================

import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Upload, Download, FileJson, Check, AlertTriangle } from 'lucide-react';
import { Button, Toggle } from '@/components/ui';
import { useContactsStore, useCompanyNumbersStore, useBLFStore, useSettingsStore } from '@/stores';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ExportData {
  version: string;
  exportedAt: string;
  contacts?: ReturnType<typeof useContactsStore.getState>['contacts'];
  companyNumbers?: ReturnType<typeof useCompanyNumbersStore.getState>['numbers'];
  blfButtons?: ReturnType<typeof useBLFStore.getState>['buttons'];
  settings?: ReturnType<typeof useSettingsStore.getState>['settings'];
}

type ImportMode = 'select' | 'importing' | 'success' | 'error';

export function ImportExportModal({ isOpen, onClose }: ImportExportModalProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Store access
  const contacts = useContactsStore((state) => state.contacts);
  const importContacts = useContactsStore((state) => state.importContacts);
  
  const companyNumbers = useCompanyNumbersStore((state) => state.numbers);
  const setCompanyNumbers = useCompanyNumbersStore((state) => state.setNumbers);
  
  const blfButtons = useBLFStore((state) => state.buttons);
  const importBLFButtons = useBLFStore((state) => state.importButtons);
  
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  
  // Local state
  const [mode, setMode] = useState<'export' | 'import'>('export');
  const [importMode, setImportMode] = useState<ImportMode>('select');
  const [importData, setImportData] = useState<ExportData | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  
  // Export options
  const [exportContacts, setExportContacts] = useState(true);
  const [exportCompanyNumbers, setExportCompanyNumbers] = useState(true);
  const [exportBLF, setExportBLF] = useState(true);
  const [exportSettings, setExportSettings] = useState(false);
  
  // Import options (what to include from imported file)
  const [includeContacts, setIncludeContacts] = useState(true);
  const [includeCompanyNumbers, setIncludeCompanyNumbers] = useState(true);
  const [includeBLF, setIncludeBLF] = useState(true);
  const [includeSettings, setIncludeSettings] = useState(false);
  
  const handleExport = () => {
    const data: ExportData = {
      version: '1.0',
      exportedAt: new Date().toISOString()
    };
    
    if (exportContacts && contacts.length > 0) {
      data.contacts = contacts;
    }
    if (exportCompanyNumbers && companyNumbers.length > 0) {
      data.companyNumbers = companyNumbers;
    }
    if (exportBLF) {
      const configuredButtons = blfButtons.filter((b) => b.extension);
      if (configuredButtons.length > 0) {
        data.blfButtons = blfButtons;
      }
    }
    if (exportSettings) {
      data.settings = settings;
    }
    
    // Create and download file
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `autocab365-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    onClose();
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string) as ExportData;
        
        // Validate structure
        if (!data.version) {
          throw new Error('Invalid file format: missing version');
        }
        
        setImportData(data);
        setImportMode('select');
        setImportError(null);
        
        // Auto-select what's available
        setIncludeContacts(!!data.contacts?.length);
        setIncludeCompanyNumbers(!!data.companyNumbers?.length);
        setIncludeBLF(!!data.blfButtons?.length);
        setIncludeSettings(!!data.settings);
      } catch (err) {
        setImportError(err instanceof Error ? err.message : 'Failed to parse file');
        setImportMode('error');
      }
    };
    reader.readAsText(file);
  };
  
  const handleImport = () => {
    if (!importData) return;
    
    setImportMode('importing');
    
    try {
      if (includeContacts && importData.contacts) {
        importContacts(importData.contacts);
      }
      if (includeCompanyNumbers && importData.companyNumbers) {
        setCompanyNumbers(importData.companyNumbers);
      }
      if (includeBLF && importData.blfButtons) {
        importBLFButtons(importData.blfButtons);
      }
      if (includeSettings && importData.settings) {
        updateSettings(importData.settings);
      }
      
      setImportMode('success');
      setTimeout(() => {
        onClose();
        resetState();
      }, 1500);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed');
      setImportMode('error');
    }
  };
  
  const resetState = () => {
    setMode('export');
    setImportMode('select');
    setImportData(null);
    setImportError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleClose = () => {
    resetState();
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content import-export-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('settings.import_export', 'Import / Export')}</h2>
          <Button variant="ghost" size="sm" onClick={handleClose} className="modal-close">
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="modal-body">
          {/* Mode Toggle */}
          <div className="import-export-tabs">
            <button 
              className={`tab ${mode === 'export' ? 'tab--active' : ''}`}
              onClick={() => { setMode('export'); resetState(); }}
            >
              <Download className="w-4 h-4" />
              {t('settings.export', 'Export')}
            </button>
            <button 
              className={`tab ${mode === 'import' ? 'tab--active' : ''}`}
              onClick={() => { setMode('import'); resetState(); }}
            >
              <Upload className="w-4 h-4" />
              {t('settings.import', 'Import')}
            </button>
          </div>
          
          {/* Export Mode */}
          {mode === 'export' && (
            <div className="import-export-content">
              <p className="import-export-description">
                {t('settings.export_description', 'Select the data you want to export to a JSON file.')}
              </p>
              
              <div className="import-export-options">
                <Toggle
                  label={t('settings.export_contacts', 'Contacts')}
                  description={`${contacts.length} ${t('common.items', 'items')}`}
                  checked={exportContacts}
                  onChange={setExportContacts}
                  disabled={contacts.length === 0}
                />
                <Toggle
                  label={t('settings.export_company_numbers', 'Company Numbers')}
                  description={`${companyNumbers.length} ${t('common.items', 'items')}`}
                  checked={exportCompanyNumbers}
                  onChange={setExportCompanyNumbers}
                  disabled={companyNumbers.length === 0}
                />
                <Toggle
                  label={t('settings.export_blf', 'BLF Buttons')}
                  description={`${blfButtons.filter((b) => b.extension).length} ${t('common.configured', 'configured')}`}
                  checked={exportBLF}
                  onChange={setExportBLF}
                  disabled={blfButtons.filter((b) => b.extension).length === 0}
                />
                <Toggle
                  label={t('settings.export_settings', 'Settings')}
                  description={t('settings.export_settings_desc', 'Include app settings')}
                  checked={exportSettings}
                  onChange={setExportSettings}
                />
              </div>
            </div>
          )}
          
          {/* Import Mode */}
          {mode === 'import' && (
            <div className="import-export-content">
              {!importData && importMode !== 'error' && (
                <>
                  <p className="import-export-description">
                    {t('settings.import_description', 'Select a previously exported JSON file to import.')}
                  </p>
                  
                  <label className="file-picker">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleFileSelect}
                      hidden
                    />
                    <FileJson className="w-8 h-8" />
                    <span>{t('settings.select_file', 'Select JSON File')}</span>
                  </label>
                </>
              )}
              
              {importMode === 'error' && (
                <div className="import-status import-status--error">
                  <AlertTriangle className="w-8 h-8" />
                  <p>{importError}</p>
                  <Button variant="ghost" onClick={resetState}>
                    {t('common.try_again', 'Try Again')}
                  </Button>
                </div>
              )}
              
              {importData && importMode === 'select' && (
                <>
                  <p className="import-export-description">
                    {t('settings.import_select', 'Select what to import from this file:')}
                  </p>
                  
                  <div className="import-export-options">
                    {importData.contacts && (
                      <Toggle
                        label={t('settings.import_contacts', 'Contacts')}
                        description={`${importData.contacts.length} ${t('common.items', 'items')}`}
                        checked={includeContacts}
                        onChange={setIncludeContacts}
                      />
                    )}
                    {importData.companyNumbers && (
                      <Toggle
                        label={t('settings.import_company_numbers', 'Company Numbers')}
                        description={`${importData.companyNumbers.length} ${t('common.items', 'items')}`}
                        checked={includeCompanyNumbers}
                        onChange={setIncludeCompanyNumbers}
                      />
                    )}
                    {importData.blfButtons && (
                      <Toggle
                        label={t('settings.import_blf', 'BLF Buttons')}
                        description={`${importData.blfButtons.filter((b) => b.extension).length} ${t('common.configured', 'configured')}`}
                        checked={includeBLF}
                        onChange={setIncludeBLF}
                      />
                    )}
                    {importData.settings && (
                      <Toggle
                        label={t('settings.import_settings', 'Settings')}
                        description={t('settings.import_settings_desc', 'Replace current settings')}
                        checked={includeSettings}
                        onChange={setIncludeSettings}
                      />
                    )}
                  </div>
                </>
              )}
              
              {importMode === 'importing' && (
                <div className="import-status">
                  <div className="spinner" />
                  <p>{t('settings.importing', 'Importing...')}</p>
                </div>
              )}
              
              {importMode === 'success' && (
                <div className="import-status import-status--success">
                  <Check className="w-8 h-8" />
                  <p>{t('settings.import_success', 'Import successful!')}</p>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="modal-footer">
          <Button variant="ghost" onClick={handleClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          
          {mode === 'export' && (
            <Button 
              variant="primary" 
              onClick={handleExport}
              disabled={!exportContacts && !exportCompanyNumbers && !exportBLF && !exportSettings}
            >
              <Download className="w-4 h-4" />
              {t('settings.export', 'Export')}
            </Button>
          )}
          
          {mode === 'import' && importData && importMode === 'select' && (
            <Button 
              variant="primary" 
              onClick={handleImport}
              disabled={!includeContacts && !includeCompanyNumbers && !includeBLF && !includeSettings}
            >
              <Upload className="w-4 h-4" />
              {t('settings.import', 'Import')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
