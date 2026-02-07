// ============================================
// Company Numbers View - Manage outbound CLI numbers
// ============================================

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Building2, Phone, Search, RefreshCw, Pencil, Trash2, MoreVertical } from 'lucide-react';
import { PanelHeader } from '@/components/layout';
import { Button, Input } from '@/components/ui';
import { CompanyNumberModal, ConfirmModal, ApiSyncConfirmModal } from '@/components/modals';
import { useCompanyNumbersStore, useSettingsStore, useUIStore } from '@/stores';
import type { CompanyNumber } from '@/types/companyNumber';
import { isVerboseLoggingEnabled } from '@/utils';

export function CompanyNumbersView() {
  const { t } = useTranslation();
  
  const verboseLogging = isVerboseLoggingEnabled();
  
  // Store state
  const numbers = useCompanyNumbersStore((state) => state.filteredNumbers);
  const searchQuery = useCompanyNumbersStore((state) => state.searchQuery);
  const setSearchQuery = useCompanyNumbersStore((state) => state.setSearchQuery);
  const deleteNumber = useCompanyNumbersStore((state) => state.deleteNumber);
  const deleteAllNumbers = useCompanyNumbersStore((state) => state.deleteAllNumbers);
  const isLoading = useCompanyNumbersStore((state) => state.isLoading);
  const isSyncing = useCompanyNumbersStore((state) => state.isSyncing);
  const error = useCompanyNumbersStore((state) => state.error);
  const syncWithConfirmation = useCompanyNumbersStore((state) => state.syncWithConfirmation);
  const replaceWithApiData = useCompanyNumbersStore((state) => state.replaceWithApiData);
  
  // Get PhantomID from settings
  const phantomId = useSettingsStore((state) => state.settings.connection.phantomId);
  
  // UI notifications
  const addNotification = useUIStore((state) => state.addNotification);
  
  // Local UI state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNumber, setEditingNumber] = useState<CompanyNumber | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleteAllConfirmOpen, setIsDeleteAllConfirmOpen] = useState(false);
  const [numberToDelete, setNumberToDelete] = useState<CompanyNumber | null>(null);
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  
  // API Sync state
  const [isSyncConfirmOpen, setIsSyncConfirmOpen] = useState(false);
  const [apiSyncData, setApiSyncData] = useState<CompanyNumber[]>([]);
  
  const handleAddNumber = () => {
    setEditingNumber(null);
    setIsModalOpen(true);
  };
  
  const handleEditNumber = (num: CompanyNumber) => {
    setEditingNumber(num);
    setIsModalOpen(true);
    setActiveMenu(null);
  };
  
  const handleDeleteNumber = (num: CompanyNumber) => {
    setNumberToDelete(num);
    setIsDeleteConfirmOpen(true);
    setActiveMenu(null);
  };
  
  const confirmDeleteNumber = () => {
    if (numberToDelete) {
      deleteNumber(numberToDelete.company_id);
      setNumberToDelete(null);
      addNotification({
        type: 'success',
        title: t('common.success', 'Success'),
        message: t('company_numbers.deleted_success', 'Company number deleted successfully')
      });
    }
  };
  
  const handleRefresh = async () => {
    if (!phantomId) {
      addNotification({
        type: 'warning',
        title: t('common.warning', 'Warning'),
        message: t('company_numbers.no_phantom_id', 'No PhantomID configured')
      });
      return;
    }
    
    if (verboseLogging) {
      console.log('[CompanyNumbersView] Starting API sync...');
    }
    
    const result = await syncWithConfirmation(phantomId);
    
    // Check for errors first
    const currentError = useCompanyNumbersStore.getState().error;
    
    if (currentError && !result.identical && !result.needsConfirmation) {
      // API call failed - translate if it's a translation key, otherwise use raw message
      const errorMessage = currentError.startsWith('company_numbers.') 
        ? t(currentError, currentError) 
        : currentError;
      addNotification({
        type: 'error',
        title: t('common.error', 'Error'),
        message: errorMessage
      });
    } else if (result.identical) {
      // Data is up to date
      addNotification({
        type: 'success',
        title: t('common.success', 'Success'),
        message: t('company_numbers.up_to_date', 'Your company numbers is the latest version')
      });
    } else if (result.needsConfirmation && result.apiData) {
      // Data differs - show confirmation modal
      if (verboseLogging) {
        console.log('[CompanyNumbersView] Data differs, showing confirmation modal');
      }
      setApiSyncData(result.apiData);
      setIsSyncConfirmOpen(true);
    }
    // Note: Error handling is done at the start of this function
  };
  
  const confirmApiSync = () => {
    if (verboseLogging) {
      console.log('[CompanyNumbersView] User confirmed API sync');
    }
    
    replaceWithApiData(apiSyncData);
    setIsSyncConfirmOpen(false);
    setApiSyncData([]);
    
    addNotification({
      type: 'success',
      title: t('common.success', 'Success'),
      message: t('company_numbers.sync_success', 'Company numbers updated successfully from server')
    });
  };
  
  const cancelApiSync = () => {
    if (verboseLogging) {
      console.log('[CompanyNumbersView] User cancelled API sync');
    }
    
    setIsSyncConfirmOpen(false);
    setApiSyncData([]);
  };
  
  const toggleMenu = (companyId: number) => {
    setActiveMenu(activeMenu === companyId ? null : companyId);
  };
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    if (activeMenu !== null) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [activeMenu]);
  
  return (
    <div className="company-numbers-view">
      <PanelHeader 
        title={t('company_numbers.title', 'Company Numbers')}
        subtitle={numbers.length > 0 ? t('company_numbers.count', '{{count}} numbers', { count: numbers.length }) : t('company_numbers.subtitle', 'Manage outbound caller IDs')}
        actions={
          <div className="header-actions">
            {phantomId && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading || isSyncing}
                title={t('company_numbers.refresh', 'Refresh from API')}
              >
                <RefreshCw className={`w-4 h-4 ${(isLoading || isSyncing) ? 'animate-spin' : ''}`} />
              </Button>
            )}
            {numbers.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-error"
                onClick={() => setIsDeleteAllConfirmOpen(true)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={handleAddNumber}>
              <Plus className="w-4 h-4" />
              {t('company_numbers.add', 'Add')}
            </Button>
          </div>
        }
      />
      
      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}
      
      <div className="company-numbers-search">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('company_numbers.search_placeholder', 'Search numbers...')}
          icon={<Search className="w-4 h-4" />}
        />
      </div>
      
      <div className="company-numbers-list">
        {numbers.length === 0 ? (
          <div className="empty-state">
            <Building2 className="empty-state-icon" />
            <h3>{t('company_numbers.empty_title', 'No company numbers')}</h3>
            <p>{t('company_numbers.empty_description', 'Add numbers to use as outbound caller IDs')}</p>
            {phantomId && (
              <Button variant="ghost" onClick={handleRefresh} disabled={isLoading || isSyncing}>
                <RefreshCw className={`w-4 h-4 ${(isLoading || isSyncing) ? 'animate-spin' : ''}`} />
                {t('company_numbers.fetch_from_api', 'Fetch from API')}
              </Button>
            )}
          </div>
        ) : (
          <div className="company-numbers-items">
            {numbers.map((num) => (
              <div key={num.company_id} className="company-number-item">
                <div className="company-number-id">
                  <span className="company-id-label">ID</span>
                  <span>{num.company_id}</span>
                </div>
                
                <div className="company-number-info">
                  <div className="company-number-name">{num.name}</div>
                  <div className="company-number-cid">
                    <Phone className="w-3 h-3" />
                    {num.cid}
                  </div>
                </div>
                
                <div className="company-number-actions">
                  <div className="company-number-menu-container">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMenu(num.company_id);
                      }}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                    
                    {activeMenu === num.company_id && (
                      <div className="company-number-menu" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleEditNumber(num)}>
                          <Pencil className="w-4 h-4" />
                          {t('common.edit', 'Edit')}
                        </button>
                        <button onClick={() => handleDeleteNumber(num)} className="text-error">
                          <Trash2 className="w-4 h-4" />
                          {t('common.delete', 'Delete')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Add/Edit Modal */}
      <CompanyNumberModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingNumber(null);
        }}
        companyNumber={editingNumber}
      />
      
      {/* Delete Single Confirm */}
      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false);
          setNumberToDelete(null);
        }}
        onConfirm={confirmDeleteNumber}
        title={t('company_numbers.delete_title', 'Delete Company Number')}
        message={t('company_numbers.delete_message', 'Are you sure you want to delete "{{name}}"?', {
          name: numberToDelete?.name || ''
        })}
        confirmText={t('common.delete', 'Delete')}
        variant="danger"
      />
      
      {/* Delete All Confirm */}
      <ConfirmModal
        isOpen={isDeleteAllConfirmOpen}
        onClose={() => setIsDeleteAllConfirmOpen(false)}
        onConfirm={() => {
          deleteAllNumbers();
          setIsDeleteAllConfirmOpen(false);
          addNotification({
            type: 'success',
            title: t('common.success', 'Success'),
            message: t('company_numbers.all_deleted', 'All company numbers deleted')
          });
        }}
        title={t('company_numbers.delete_all_title', 'Delete All Company Numbers')}
        message={t('company_numbers.delete_all_message', 'Are you sure you want to delete all {{count}} company numbers? This cannot be undone.', {
          count: numbers.length
        })}
        confirmText={t('company_numbers.delete_all', 'Delete All')}
        variant="danger"
      />
      
      {/* API Sync Confirm */}
      <ApiSyncConfirmModal
        isOpen={isSyncConfirmOpen}
        onClose={cancelApiSync}
        onConfirm={confirmApiSync}
        apiData={apiSyncData}
        localData={numbers}
      />
    </div>
  );
}
