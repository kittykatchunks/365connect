// ============================================
// Import/Export Modal - Data import and export
// ============================================

import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Upload, Download, FileJson, Check, AlertTriangle } from 'lucide-react';
import { Button, Toggle } from '@/components/ui';
import { useContactsStore, useCompanyNumbersStore, useBLFStore, useSettingsStore } from '@/stores';
import { ConfirmModal } from '@/components/modals';
import { 
  exportQueueMonitoringData, 
  importQueueMonitoringData,
  loadQueueConfigs 
} from '@/utils/queueStorage';
import { 
  exportQueueGroupsData, 
  importQueueGroupsData,
  loadQueueGroups 
} from '@/utils/queueGroupStorage';

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
  queueMonitoring?: any; // Future development
  queueGroups?: any; // Future development
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
  
  const setBLFEnabled = useSettingsStore((state) => state.setBLFEnabled);
  const setShowCompanyNumbersTab = useSettingsStore((state) => state.setShowCompanyNumbersTab);
  
  // Get queue monitoring and queue groups counts
  const queueConfigs = loadQueueConfigs();
  const queueGroups = loadQueueGroups();
  
  // Local state
  const [mode, setMode] = useState<'export' | 'import'>('export');
  const [importMode, setImportMode] = useState<ImportMode>('select');
  const [importData, setImportData] = useState<ExportData | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [showImportWarning, setShowImportWarning] = useState(false);
  
  // Export options - default ON for Contacts, Company Numbers, BLF; Queue options default ON too
  const [exportContacts, setExportContacts] = useState(true);
  const [exportCompanyNumbers, setExportCompanyNumbers] = useState(true);
  const [exportBLF, setExportBLF] = useState(true);
  const [exportQueueMonitoring, setExportQueueMonitoring] = useState(true);
  const [exportQueueGroups, setExportQueueGroups] = useState(true);
  
  // Import options - default ON for available data
  const [includeContacts, setIncludeContacts] = useState(true);
  const [includeCompanyNumbers, setIncludeCompanyNumbers] = useState(true);
  const [includeBLF, setIncludeBLF] = useState(true);
  const [includeQueueMonitoring, setIncludeQueueMonitoring] = useState(true);
  const [includeQueueGroups, setIncludeQueueGroups] = useState(true);
  
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
    // Queue monitoring data
    if (exportQueueMonitoring) {
      try {
        const queueData = exportQueueMonitoringData();
        const parsedData = JSON.parse(queueData);
        if (parsedData.configs && parsedData.configs.length > 0) {
          data.queueMonitoring = parsedData;
        }
      } catch (error) {
        console.error('[ImportExportModal] Error exporting queue monitoring data:', error);
      }
    }
    // Queue groups data
    if (exportQueueGroups) {
      try {
        const groupsData = exportQueueGroupsData();
        const parsedData = JSON.parse(groupsData);
        if (parsedData.groups && parsedData.groups.length > 0) {
          data.queueGroups = parsedData;
        }
      } catch (error) {
        console.error('[ImportExportModal] Error exporting queue groups data:', error);
      }
    }
    
    // Create and download file
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `connect365-settings-${new Date().toISOString().split('T')[0]}.json`;
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
        
        // Auto-select what's available (default ON for all options)
        setIncludeContacts(!!data.contacts?.length);
        setIncludeCompanyNumbers(!!data.companyNumbers?.length);
        setIncludeBLF(!!data.blfButtons?.length);
        setIncludeQueueMonitoring(!!(data.queueMonitoring?.configs?.length));
        setIncludeQueueGroups(!!(data.queueGroups?.groups?.length));
      } catch (err) {
        setImportError(err instanceof Error ? err.message : 'Failed to parse file');
        setImportMode('error');
      }
    };
    reader.readAsText(file);
  };
  
  const handleImportRequest = () => {
    // Show warning dialog before importing
    setShowImportWarning(true);
  };

  const handleImportConfirmed = () => {
    setShowImportWarning(false);
    performImport();
  };

  const performImport = () => {
    if (!importData) return;
    
    setImportMode('importing');
    
    try {
      // OVERWRITE all data (no merging) for each selected category
      if (includeContacts && importData.contacts) {
        importContacts(importData.contacts);
      }
      if (includeCompanyNumbers && importData.companyNumbers) {
        setCompanyNumbers(importData.companyNumbers);
        // Automatically enable Company Numbers tab
        setShowCompanyNumbersTab(true);
      }
      if (includeBLF && importData.blfButtons) {
        importBLFButtons(importData.blfButtons);
        // Automatically enable BLF buttons
        setBLFEnabled(true);
      }
      // Queue monitoring data
      if (includeQueueMonitoring && importData.queueMonitoring) {
        const result = importQueueMonitoringData(JSON.stringify(importData.queueMonitoring));
        if (!result.success) {
          throw new Error(`Queue monitoring import failed: ${result.error}`);
        }
      }
      // Queue groups data
      if (includeQueueGroups && importData.queueGroups) {
        const result = importQueueGroupsData(JSON.stringify(importData.queueGroups));
        if (!result.success) {
          throw new Error(`Queue groups import failed: ${result.error}`);
        }
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
    setShowImportWarning(false);
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
              onClick={() => { 
                setMode('export');
                setImportMode('select');
                setImportData(null);
                setImportError(null);
              }}
            >
              <Download className="w-4 h-4" />
              {t('settings.export', 'Export')}
            </button>
            <button 
              className={`tab ${mode === 'import' ? 'tab--active' : ''}`}
              onClick={() => { 
                setMode('import');
                setImportMode('select');
                setImportData(null);
                setImportError(null);
              }}
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
                  label={t('settings.export_queue_monitoring', 'Queue Monitoring')}
                  description={`${queueConfigs.length} ${t('common.configured', 'configured')}`}
                  checked={exportQueueMonitoring}
                  onChange={setExportQueueMonitoring}
                  disabled={queueConfigs.length === 0}
                />
                <Toggle
                  label={t('settings.export_queue_groups', 'Queue Groups')}
                  description={`${queueGroups.length} ${t('common.configured', 'configured')}`}
                  checked={exportQueueGroups}
                  onChange={setExportQueueGroups}
                  disabled={queueGroups.length === 0}
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
                    {importData.queueMonitoring && (
                      <Toggle
                        label={t('settings.import_queue_monitoring', 'Queue Monitoring')}
                        description={`${importData.queueMonitoring.configs?.length || 0} ${t('common.configured', 'configured')}`}
                        checked={includeQueueMonitoring}
                        onChange={setIncludeQueueMonitoring}
                      />
                    )}
                    {importData.queueGroups && (
                      <Toggle
                        label={t('settings.import_queue_groups', 'Queue Groups')}
                        description={`${importData.queueGroups.groups?.length || 0} ${t('common.configured', 'configured')}`}
                        checked={includeQueueGroups}
                        onChange={setIncludeQueueGroups}
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
              disabled={!exportContacts && !exportCompanyNumbers && !exportBLF && !exportQueueMonitoring && !exportQueueGroups}
            >
              <Download className="w-4 h-4" />
              {t('settings.export', 'Export')}
            </Button>
          )}
          
          {mode === 'import' && importData && importMode === 'select' && (
            <Button 
              variant="primary" 
              onClick={handleImportRequest}
              disabled={!includeContacts && !includeCompanyNumbers && !includeBLF && !includeQueueMonitoring && !includeQueueGroups}
            >
              <Upload className="w-4 h-4" />
              {t('settings.import', 'Import')}
            </Button>
          )}
        </div>
      </div>

      {/* Import Warning Confirmation Modal */}
      <ConfirmModal
        isOpen={showImportWarning}
        title={t('settings.import_warning_title', 'Import Warning')}
        message={t('settings.import_warning_message', 'This will OVERWRITE all existing data in the selected categories. This action cannot be undone. Are you sure you want to continue?')}
        confirmText={t('common.continue', 'Continue')}
        cancelText={t('common.cancel', 'Cancel')}
        onConfirm={handleImportConfirmed}
        onClose={() => setShowImportWarning(false)}
        variant="warning"
      />
    </div>
  );
}
