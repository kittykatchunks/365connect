/* ====================================================================================== */
/* DATA IMPORT/EXPORT MANAGER - Local Storage Import/Export System */
/* Version: 1.0.0 */
/* Handles import/export of BLF Buttons, Contacts, Company Numbers, and Tab Settings */
/* ====================================================================================== */

class DataImportExportManager {
    constructor() {
        this.initialized = false;
        this.exportableKeys = {
            blfButtons: 'BlfButtons',
            contacts: 'contacts',
            companyNumbers: 'CompanyNumbers'
        };
        
        console.log('💾 DataImportExportManager: Initialized');
    }

    /* ====================================================================================== */
    /* INITIALIZATION */
    /* ====================================================================================== */

    async initialize() {
        try {
            console.log('💾 DataImportExportManager: Starting initialization...');
            
            // Initialize UI event handlers
            this.initializeEventHandlers();
            
            this.initialized = true;
            console.log('💾 DataImportExportManager: Initialization complete');
            
        } catch (error) {
            console.error('💾 DataImportExportManager: Initialization failed:', error);
            throw error;
        }
    }

    initializeEventHandlers() {
        // Export Data button
        const exportDataBtn = document.getElementById('exportDataBtn');
        if (exportDataBtn) {
            exportDataBtn.addEventListener('click', () => this.exportData());
        }

        // Import Data button
        const importDataBtn = document.getElementById('importDataBtn');
        if (importDataBtn) {
            importDataBtn.addEventListener('click', () => this.showImportModal());
        }

        // Import Modal - Close button
        const importModalClose = document.getElementById('importModalClose');
        if (importModalClose) {
            importModalClose.addEventListener('click', () => this.hideImportModal());
        }

        // Import Modal - Cancel button
        const importCancelBtn = document.getElementById('importCancelBtn');
        if (importCancelBtn) {
            importCancelBtn.addEventListener('click', () => this.hideImportModal());
        }

        // Import Modal - Continue button
        const importContinueBtn = document.getElementById('importContinueBtn');
        if (importContinueBtn) {
            importContinueBtn.addEventListener('click', () => this.processImport());
        }

        // File input for import
        const dataFileInput = document.getElementById('dataFileInput');
        if (dataFileInput) {
            dataFileInput.addEventListener('change', (e) => this.handleFileSelected(e));
        }

        // Click outside modal to close
        document.addEventListener('click', (e) => {
            const importModal = document.getElementById('importDataModal');
            if (importModal && e.target === importModal) {
                this.hideImportModal();
            }
        });

        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const importModal = document.getElementById('importDataModal');
                if (importModal && !importModal.classList.contains('hidden')) {
                    this.hideImportModal();
                }
            }
        });
    }

    /* ====================================================================================== */
    /* EXPORT FUNCTIONALITY */
    /* ====================================================================================== */

    exportData() {
        try {
            console.log('💾 Starting data export...');

            // Collect all exportable data
            const exportData = {
                exportDate: new Date().toISOString(),
                version: '1.0',
                data: {}
            };

            // Export BLF Buttons
            if (window.localDB) {
                const blfButtons = window.localDB.getItem(this.exportableKeys.blfButtons, '[]');
                exportData.data.BlfButtons = JSON.parse(blfButtons);
                console.log('💾 Exported BLF Buttons:', exportData.data.BlfButtons.length);
            }

            // Export Contacts
            if (window.localDB) {
                const contacts = window.localDB.getItem(this.exportableKeys.contacts, '[]');
                exportData.data.contacts = JSON.parse(contacts);
                console.log('💾 Exported Contacts:', exportData.data.contacts.length);
            }

            // Export Company Numbers
            if (window.localDB) {
                const companyNumbers = window.localDB.getItem(this.exportableKeys.companyNumbers, '[]');
                exportData.data.CompanyNumbers = JSON.parse(companyNumbers);
                console.log('💾 Exported Company Numbers:', exportData.data.CompanyNumbers.length);
            }

            // Create JSON blob and download
            const dataStr = JSON.stringify(exportData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            // Create download link
            const a = document.createElement('a');
            a.href = url;
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            a.download = `connect365-data-export-${timestamp}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log('💾 Data export completed successfully');
            
            // Show success notification
            if (window.App && window.App.showToast) {
                window.App.showToast('Data exported successfully', 'success');
            }
            
        } catch (error) {
            console.error('💾 Error exporting data:', error);
            if (window.App && window.App.showToast) {
                window.App.showToast('Error exporting data: ' + error.message, 'error');
            }
        }
    }

    /* ====================================================================================== */
    /* IMPORT FUNCTIONALITY */
    /* ====================================================================================== */

    showImportModal() {
        // Clear any previous file selection
        const fileInput = document.getElementById('dataFileInput');
        if (fileInput) {
            fileInput.value = '';
        }

        // Reset checkboxes to all checked
        document.getElementById('importBlfButtons').checked = true;
        document.getElementById('importContacts').checked = true;
        document.getElementById('importCompanyNumbers').checked = true;

        // Disable continue button until file is selected
        const continueBtn = document.getElementById('importContinueBtn');
        if (continueBtn) {
            continueBtn.disabled = true;
        }

        // Show the modal
        const modal = document.getElementById('importDataModal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    hideImportModal() {
        const modal = document.getElementById('importDataModal');
        if (modal) {
            modal.classList.add('hidden');
        }

        // Clear stored file data
        this.importFileData = null;
    }

    handleFileSelected(event) {
        const file = event.target.files[0];
        if (!file) {
            return;
        }

        // Validate file type
        if (!file.name.endsWith('.json')) {
            if (window.App && window.App.showToast) {
                window.App.showToast('Please select a valid JSON file', 'error');
            }
            return;
        }

        // Read the file
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                // Validate data structure
                if (!data.data || typeof data.data !== 'object') {
                    throw new Error('Invalid file format');
                }

                // Store the data for import
                this.importFileData = data;

                // Enable continue button
                const continueBtn = document.getElementById('importContinueBtn');
                if (continueBtn) {
                    continueBtn.disabled = false;
                }

                console.log('💾 File loaded successfully:', file.name);
                
            } catch (error) {
                console.error('💾 Error reading file:', error);
                if (window.App && window.App.showToast) {
                    window.App.showToast('Error reading file: ' + error.message, 'error');
                }
            }
        };
        
        reader.onerror = () => {
            console.error('💾 Error reading file');
            if (window.App && window.App.showToast) {
                window.App.showToast('Error reading file', 'error');
            }
        };

        reader.readAsText(file);
    }

    processImport() {
        if (!this.importFileData) {
            if (window.App && window.App.showToast) {
                window.App.showToast('Please select a file first', 'error');
            }
            return;
        }

        try {
            console.log('💾 Starting data import...');

            const data = this.importFileData.data;
            let importedCount = 0;

            // Import BLF Buttons
            if (document.getElementById('importBlfButtons').checked && data.BlfButtons) {
                if (window.localDB) {
                    window.localDB.setItem(this.exportableKeys.blfButtons, JSON.stringify(data.BlfButtons));
                    console.log('💾 Imported BLF Buttons:', data.BlfButtons.length);
                    importedCount++;
                    
                    // Auto-enable BLF buttons setting
                    window.localDB.setItem('BlfEnabled', 'true');
                    const blfEnabledCheckbox = document.getElementById('BlfEnabled');
                    if (blfEnabledCheckbox) {
                        blfEnabledCheckbox.checked = true;
                    }
                    console.log('💾 Auto-enabled BLF Buttons setting');
                    
                    // Reload BLF buttons if manager exists
                    if (window.App && window.App.managers && window.App.managers.blf) {
                        window.App.managers.blf.loadBlfButtons();
                        window.App.managers.blf.renderBlfButtons();
                    }
                }
            }

            // Import Contacts
            if (document.getElementById('importContacts').checked && data.contacts) {
                if (window.localDB) {
                    window.localDB.setItem(this.exportableKeys.contacts, JSON.stringify(data.contacts));
                    console.log('💾 Imported Contacts:', data.contacts.length);
                    importedCount++;
                    
                    // Reload contacts if manager exists
                    if (window.App && window.App.managers && window.App.managers.contacts) {
                        window.App.managers.contacts.loadContacts();
                        window.App.managers.contacts.renderContacts();
                    }
                }
            }

            // Import Company Numbers
            if (document.getElementById('importCompanyNumbers').checked && data.CompanyNumbers) {
                if (window.localDB) {
                    window.localDB.setItem(this.exportableKeys.companyNumbers, JSON.stringify(data.CompanyNumbers));
                    console.log('💾 Imported Company Numbers:', data.CompanyNumbers.length);
                    importedCount++;
                    
                    // Auto-enable Company Numbers tab (Blank1Tab)
                    window.localDB.setItem('ShowBlank1Tab', 'true');
                    const showBlank1Checkbox = document.getElementById('ShowBlank1Tab');
                    if (showBlank1Checkbox) {
                        showBlank1Checkbox.checked = true;
                    }
                    console.log('💾 Auto-enabled Company Numbers tab');
                    
                    // Update tab visibility
                    if (window.saveTabVisibilitySettings) {
                        window.saveTabVisibilitySettings();
                    }
                    
                    // Reload company numbers if manager exists
                    if (window.App && window.App.managers && window.App.managers.companyNumbers) {
                        window.App.managers.companyNumbers.loadCompanyNumbers();
                        window.App.managers.companyNumbers.renderCompanyNumbers();
                    }
                }
            }

            // Hide modal
            this.hideImportModal();

            // Show success notification
            if (importedCount > 0) {
                console.log('💾 Data import completed successfully');
                if (window.App && window.App.showToast) {
                    window.App.showToast(`Data imported successfully (${importedCount} section${importedCount > 1 ? 's' : ''})`, 'success');
                }
            } else {
                if (window.App && window.App.showToast) {
                    window.App.showToast('No data was imported (no sections selected)', 'warning');
                }
            }

        } catch (error) {
            console.error('💾 Error importing data:', error);
            if (window.App && window.App.showToast) {
                window.App.showToast('Error importing data: ' + error.message, 'error');
            }
        }
    }

    /* ====================================================================================== */
    /* UTILITY METHODS */
    /* ====================================================================================== */

    isInitialized() {
        return this.initialized;
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.DataImportExportManager = DataImportExportManager;
}
