/* ====================================================================================== */
/* COMPANY NUMBERS MANAGER - CLI Management System */
/* Version: 1.0.0 */
/* Handles company number management with CSV import/export for outgoing CLI selection */
/* ====================================================================================== */

class CompanyNumbersManager {
    constructor() {
        this.companyNumbers = [];
        this.currentSelectedCompany = null;
        this.initialized = false;
        this.storageKey = 'CompanyNumbers';
        
        console.log('📞 CompanyNumbersManager: Initialized');
    }

    /* ====================================================================================== */
    /* INITIALIZATION */
    /* ====================================================================================== */

    async initialize() {
        try {
            console.log('📞 CompanyNumbersManager: Starting initialization...');
            
            // Load company numbers from localStorage
            await this.loadCompanyNumbers();
            
            // Initialize UI event handlers
            this.initializeEventHandlers();
            
            // Initial render if tab is visible
            if (this.isCompanyNumbersTabVisible()) {
                this.renderCompanyNumbers();
            }
            
            // Initialize dial tab CLI selector
            this.initializeCliSelector();
            
            this.initialized = true;
            console.log('📞 CompanyNumbersManager: Initialization complete');
            
        } catch (error) {
            console.error('📞 CompanyNumbersManager: Initialization failed:', error);
            throw error;
        }
    }

    initializeEventHandlers() {
        // Add Company Number button
        const addCompanyBtn = document.getElementById('addCompanyNumberBtn');
        if (addCompanyBtn) {
            addCompanyBtn.addEventListener('click', () => this.showAddCompanyModal());
        }

        // Delete All button
        const deleteAllBtn = document.getElementById('deleteAllCompanyNumbersBtn');
        if (deleteAllBtn) {
            deleteAllBtn.addEventListener('click', () => this.confirmDeleteAllCompanyNumbers());
        }

        // Import/Export buttons
        const importBtn = document.getElementById('importCompanyNumbersBtn');
        if (importBtn) {
            importBtn.addEventListener('click', () => this.importCompanyNumbers());
        }

        const exportBtn = document.getElementById('exportCompanyNumbersBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportCompanyNumbers());
        }

        // File input for CSV import
        const csvFileInput = document.getElementById('companyNumbersCsvFileInput');
        if (csvFileInput) {
            csvFileInput.addEventListener('change', (e) => this.handleCSVImport(e));
        }

        // CLI Selector in dial tab
        const cliDropdown = document.getElementById('cliCompanySelect');
        if (cliDropdown) {
            cliDropdown.addEventListener('change', () => this.handleCliSelectionChange());
        }

        const cliConfirmBtn = document.getElementById('cliConfirmBtn');
        if (cliConfirmBtn) {
            cliConfirmBtn.addEventListener('click', () => this.confirmCliChange());
        }

        // Refresh button for API sync
        const refreshBtn = document.getElementById('refreshCompanyNumbersBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.syncCompanyNumbersFromApi(true));
        }
    }

    isCompanyNumbersTabVisible() {
        const tab = document.getElementById('navBlank1');
        return tab && !tab.classList.contains('disabled') && !tab.classList.contains('tab-hidden');
    }

    /* ====================================================================================== */
    /* COMPANY NUMBER CRUD OPERATIONS */
    /* ====================================================================================== */

    addCompanyNumber(companyData) {
        // Validate required fields
        if (!this.validateCompanyNumber(companyData)) {
            throw new Error(t('invalidCompanyDataRequired', 'Invalid company data. Company ID (1-99), Name, and Number are required.'));
        }

        // Check for duplicate ID
        if (this.companyNumbers.find(c => c.company_id === companyData.company_id)) {
            throw new Error(`Company ID ${companyData.company_id} already exists.`);
        }

        const company = {
            company_id: parseInt(companyData.company_id),
            name: companyData.name.trim(),
            cid: companyData.cid.trim()
        };

        this.companyNumbers.push(company);
        this.saveCompanyNumbers();
        this.renderCompanyNumbers();
        this.updateCliSelector();
        
        this.showSuccess(`${t('company', 'Company')} "${company.name}" ${t('addedSuccessfully', 'added successfully')}`);
        console.log('📞 CompanyNumbersManager: Company added:', company);
        
        return company;
    }

    updateCompanyNumber(companyId, updatedData) {
        const index = this.companyNumbers.findIndex(c => c.company_id === companyId);
        if (index === -1) {
            throw new Error('Company not found');
        }

        // Validate updated data
        if (!this.validateCompanyNumber({ ...this.companyNumbers[index], ...updatedData })) {
            throw new Error(t('invalidCompanyData', 'Invalid company data'));
        }

        const company = this.companyNumbers[index];
        company.name = updatedData.name?.trim() || company.name;
        company.cid = updatedData.cid?.trim() || company.cid;

        this.saveCompanyNumbers();
        this.renderCompanyNumbers();
        this.updateCliSelector();
        
        this.showSuccess(t('companyUpdatedSuccessfully', 'Company "{name}" updated successfully').replace('{name}', company.name));
        console.log('📞 CompanyNumbersManager: Company updated:', company);
        
        return company;
    }

    deleteCompanyNumber(companyId) {
        const index = this.companyNumbers.findIndex(c => c.company_id === companyId);
        if (index === -1) {
            throw new Error('Company not found');
        }

        const company = this.companyNumbers[index];
        this.companyNumbers.splice(index, 1);
        
        this.saveCompanyNumbers();
        this.renderCompanyNumbers();
        this.updateCliSelector();
        
        this.showSuccess(t('companyDeletedSuccessfully', 'Company "{name}" deleted successfully').replace('{name}', company.name));
        console.log('📞 CompanyNumbersManager: Company deleted:', companyId);
    }

    deleteAllCompanyNumbers() {
        this.companyNumbers = [];
        this.currentSelectedCompany = null;
        this.saveCompanyNumbers();
        this.renderCompanyNumbers();
        this.updateCliSelector();
        
        this.showSuccess(t('allCompanyNumbersDeleted', 'All company numbers deleted'));
        console.log('📞 CompanyNumbersManager: All companies deleted');
    }

    confirmDeleteAllCompanyNumbers() {
        if (this.companyNumbers.length === 0) {
            this.showWarning(t('noCompanyNumbersToDelete', 'No company numbers to delete'));
            return;
        }

        const confirmed = confirm(`${t('areYouSureDeleteAllCompanyNumbers', 'Are you sure you want to delete all')} ${this.companyNumbers.length} ${t('companyNumbers', 'company numbers')}? ${t('thisActionCannotBeUndone', 'This action cannot be undone')}.`);
        if (confirmed) {
            this.deleteAllCompanyNumbers();
        }
    }

    validateCompanyNumber(companyData) {
        if (!companyData.company_id || !companyData.name || !companyData.cid) {
            return false;
        }
        
        const id = parseInt(companyData.company_id);
        if (isNaN(id) || id < 1 || id > 99) {
            return false;
        }
        
        return true;
    }

    getCompanyById(companyId) {
        return this.companyNumbers.find(c => c.company_id === companyId);
    }

    getCompanyByName(name) {
        return this.companyNumbers.find(c => c.name.toLowerCase() === name.toLowerCase());
    }

    getAllCompanies() {
        return [...this.companyNumbers].sort((a, b) => a.name.localeCompare(b.name));
    }

    getLowestAvailableCompanyId() {
        // Find the lowest available ID from 1-99
        for (let i = 1; i <= 99; i++) {
            if (!this.companyNumbers.find(c => c.company_id === i)) {
                return i;
            }
        }
        return null; // All IDs are used
    }

    /* ====================================================================================== */
    /* STORAGE OPERATIONS */
    /* ====================================================================================== */

    saveCompanyNumbers() {
        try {
            if (window.localDB) {
                window.localDB.setItem(this.storageKey, JSON.stringify(this.companyNumbers));
                console.log('📞 CompanyNumbersManager: Saved to localStorage');
            }
        } catch (error) {
            console.error('📞 CompanyNumbersManager: Save failed:', error);
            this.showError(t('failedToSaveCompanyNumbers', 'Failed to save company numbers'));
        }
    }

    loadCompanyNumbers() {
        try {
            if (window.localDB) {
                const data = window.localDB.getItem(this.storageKey);
                if (data) {
                    this.companyNumbers = JSON.parse(data);
                    
                    // Clean up old timestamp fields if they exist
                    let needsCleanup = false;
                    this.companyNumbers = this.companyNumbers.map(company => {
                        if (company.hasOwnProperty('createdAt') || company.hasOwnProperty('updatedAt')) {
                            needsCleanup = true;
                            const { createdAt, updatedAt, ...cleanCompany } = company;
                            return cleanCompany;
                        }
                        return company;
                    });
                    
                    // Save cleaned data back to storage
                    if (needsCleanup) {
                        this.saveCompanyNumbers();
                        console.log('📞 CompanyNumbersManager: Cleaned up old timestamp fields from storage');
                    }
                    
                    console.log('📞 CompanyNumbersManager: Loaded', this.companyNumbers.length, 'companies from storage');
                }
            }
        } catch (error) {
            console.error('📞 CompanyNumbersManager: Load failed:', error);
            this.companyNumbers = [];
        }
    }

    /* ====================================================================================== */
    /* CSV IMPORT/EXPORT */
    /* ====================================================================================== */

    exportCompanyNumbers() {
        try {
            if (this.companyNumbers.length === 0) {
                this.showWarning(t('noCompanyNumbersToExport', 'No company numbers to export'));
                return;
            }

            const csvData = this.companyNumbersToCSV();
            const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `company-numbers-${new Date().toISOString().split('T')[0]}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                this.showSuccess(t('companyNumbersExportedSuccessfully', 'Company numbers exported successfully'));
                console.log('📞 CompanyNumbersManager: Company numbers exported to CSV');
            }
        } catch (error) {
            console.error('📞 CompanyNumbersManager: Export failed:', error);
            this.showError(t('failedToExportCompanyNumbers', 'Failed to export company numbers: {error}').replace('{error}', error.message));
        }
    }

    companyNumbersToCSV() {
        const headers = ['Company ID', 'Company Name', 'Telephone Number'];
        const csvRows = [headers.join(',')];
        
        // Sort by ID for cleaner export
        const sorted = [...this.companyNumbers].sort((a, b) => a.company_id - b.company_id);
        
        sorted.forEach(company => {
            const row = [
                company.company_id,
                this.escapeCSVField(company.name),
                this.escapeCSVField(company.cid)
            ];
            csvRows.push(row.join(','));
        });
        
        return csvRows.join('\n');
    }

    escapeCSVField(field) {
        if (!field) return '';
        const str = field.toString();
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    }

    importCompanyNumbers() {
        const fileInput = document.getElementById('companyNumbersCsvFileInput');
        if (fileInput) {
            fileInput.click();
        }
    }

    async handleCSVImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await this.readFileAsText(file);
            const importedCompanies = this.parseCSV(text);
            
            if (importedCompanies.length === 0) {
                this.showError(t('noValidCompanyNumbersInCSV', 'No valid company numbers found in CSV file'));
                return;
            }

            // Show confirmation dialog
            const confirmed = confirm(`Import ${importedCompanies.length} company numbers? This will add to existing companies.`);
            if (!confirmed) return;

            let successCount = 0;
            let errorCount = 0;
            const errors = [];

            importedCompanies.forEach(companyData => {
                try {
                    if (this.validateCompanyNumber(companyData)) {
                        // Check for duplicate
                        if (!this.companyNumbers.find(c => c.company_id === companyData.company_id)) {
                            this.addCompanyNumberSilent(companyData);
                            successCount++;
                        } else {
                            errors.push(`ID ${companyData.company_id} already exists`);
                            errorCount++;
                        }
                    } else {
                        errors.push(`Invalid data: ${JSON.stringify(companyData)}`);
                        errorCount++;
                    }
                } catch (error) {
                    errors.push(error.message);
                    errorCount++;
                }
            });

            this.saveCompanyNumbers();
            this.renderCompanyNumbers();
            this.updateCliSelector();

            if (errors.length > 0 && errors.length <= 5) {
                console.warn('📞 CompanyNumbersManager: Import errors:', errors);
            }

            this.showSuccess(t('companyImportCompleted', 'Import completed: {success} companies added, {errors} skipped').replace('{success}', successCount).replace('{errors}', errorCount));
            console.log('📞 CompanyNumbersManager: CSV import completed:', { successCount, errorCount });

        } catch (error) {
            console.error('📞 CompanyNumbersManager: CSV import failed:', error);
            this.showError('Failed to import CSV: ' + error.message);
        }

        // Clear file input
        event.target.value = '';
    }

    addCompanyNumberSilent(companyData) {
        const company = {
            company_id: parseInt(companyData.company_id),
            name: companyData.name.trim(),
            cid: companyData.cid.trim()
        };

        this.companyNumbers.push(company);
        return company;
    }

    parseCSV(text) {
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        if (lines.length < 2) return [];

        const headers = this.parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
        const companies = [];

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length === 0) continue;

            const company = {};
            
            // Map CSV columns to company fields
            headers.forEach((header, index) => {
                const value = values[index] || '';
                
                if (header.includes('id') || header === 'company id') {
                    company.company_id = parseInt(value);
                } else if (header.includes('name') || header === 'company name') {
                    company.name = value;
                } else if (header.includes('phone') || header.includes('number') || header.includes('tel')) {
                    company.cid = value;
                }
            });

            if (company.company_id && company.name && company.cid) {
                companies.push(company);
            }
        }

        return companies;
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    /* ====================================================================================== */
    /* UI RENDERING */
    /* ====================================================================================== */

    renderCompanyNumbers() {
        const container = document.getElementById('companyNumbersList');
        if (!container) return;

        // Clear existing content
        container.innerHTML = '';

        if (this.companyNumbers.length === 0) {
            container.innerHTML = `
                <div class="no-company-numbers-message">
                    <i class="fa fa-building"></i>
                    <h3 data-translate="no_company_numbers_yet">${t('no_company_numbers_yet', 'No company numbers yet')}</h3>
                    <p data-translate="add_company_numbers_cli">${t('add_company_numbers_cli', 'Add company numbers to enable CLI selection')}</p>
                    <button class="btn-primary" onclick="App.managers.companyNumbers?.showAddCompanyModal()" data-translate="add_company_number">${t('add_company_number', 'Add Company Number')}</button>
                </div>
            `;
            return;
        }

        // Sort by ID
        const sorted = [...this.companyNumbers].sort((a, b) => a.company_id - b.company_id);

        // Create table
        const table = document.createElement('table');
        table.className = 'company-numbers-table';
        
        // Table header
        table.innerHTML = `
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Company Name</th>
                    <th>Telephone Number</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody id="companyNumbersTableBody"></tbody>
        `;
        
        container.appendChild(table);
        
        const tbody = document.getElementById('companyNumbersTableBody');
        
        sorted.forEach(company => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${company.company_id}</td>
                <td class="editable-cell" data-company-id="${company.company_id}" data-field="name">${this.escapeHtml(company.name)}</td>
                <td class="editable-cell" data-company-id="${company.company_id}" data-field="cid">${this.escapeHtml(company.cid)}</td>
                <td class="actions-cell">
                    <button class="btn-icon btn-edit" onclick="App.managers.companyNumbers?.editCompanyInline(${company.company_id})" title="Edit">
                        <i class="fa fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="App.managers.companyNumbers?.deleteCompanyWithConfirm(${company.company_id})" title="Delete">
                        <i class="fa fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Make cells editable on double-click
        document.querySelectorAll('.editable-cell').forEach(cell => {
            cell.addEventListener('dblclick', () => this.makeFieldEditable(cell));
        });
    }

    makeFieldEditable(cell) {
        const companyId = parseInt(cell.dataset.companyId);
        const field = cell.dataset.field;
        const currentValue = cell.textContent;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentValue;
        input.className = 'inline-edit-input';
        
        const save = () => {
            const newValue = input.value.trim();
            if (newValue && newValue !== currentValue) {
                try {
                    this.updateCompanyNumber(companyId, { [field]: newValue });
                } catch (error) {
                    this.showError(error.message);
                    cell.textContent = currentValue;
                }
            } else {
                cell.textContent = currentValue;
            }
        };
        
        input.addEventListener('blur', save);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                save();
            } else if (e.key === 'Escape') {
                cell.textContent = currentValue;
            }
        });
        
        cell.textContent = '';
        cell.appendChild(input);
        input.focus();
        input.select();
    }

    editCompanyInline(companyId) {
        const nameCell = document.querySelector(`.editable-cell[data-company-id="${companyId}"][data-field="name"]`);
        if (nameCell) {
            this.makeFieldEditable(nameCell);
        }
    }

    deleteCompanyWithConfirm(companyId) {
        const company = this.getCompanyById(companyId);
        if (!company) return;
        
        const confirmed = confirm(`Are you sure you want to delete "${company.name}"?`);
        if (confirmed) {
            this.deleteCompanyNumber(companyId);
        }
    }

    showAddCompanyModal() {
        // Get the lowest available Company ID
        const lowestAvailableId = this.getLowestAvailableCompanyId();
        
        // Create modal HTML
        const modalHtml = `
            <div class="modal-content company-modal">
                <div class="modal-header">
                    <h2>${t('add_company_number', 'Add Company Number')}</h2>
                    <button class="modal-close" onclick="App.managers.companyNumbers?.closeModal()">
                        <i class="fa fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="addCompanyForm">
                        <div class="form-group">
                            <label for="companyId">${t('company_id_label', 'Company ID (1-99)')} *</label>
                            <input type="number" id="companyId" name="company_id" min="1" max="99" value="${lowestAvailableId || ''}" required />
                        </div>
                        <div class="form-group">
                            <label for="companyName">${t('company_name_label', 'Company Name')} *</label>
                            <input type="text" id="companyName" name="name" required />
                        </div>
                        <div class="form-group">
                            <label for="companyNumber">${t('telephone_number_label', 'Telephone Number')} *</label>
                            <input type="tel" id="companyNumber" name="cid" required />
                        </div>
                        <div class="modal-actions">
                            <button type="submit" class="btn-primary">${t('add_company_number', 'Add Company Number')}</button>
                            <button type="button" class="btn-secondary" onclick="App.managers.companyNumbers?.closeModal()">${t('cancel', 'Cancel')}</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        this.showModal(modalHtml);
    }

    handleAddCompanySubmit(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const companyData = {
            company_id: formData.get('company_id'),
            name: formData.get('name'),
            cid: formData.get('cid')
        };
        
        try {
            this.addCompanyNumber(companyData);
            this.closeModal();
        } catch (error) {
            this.showError(error.message);
        }
    }

    showModal(contentHtml) {
        const overlay = document.getElementById('modalOverlay');
        if (!overlay) return;
        
        overlay.innerHTML = contentHtml;
        overlay.classList.remove('hidden');
        
        // Attach form submit handler if form exists
        const form = document.getElementById('addCompanyForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleAddCompanySubmit(e));
        }
    }

    closeModal() {
        const overlay = document.getElementById('modalOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
            overlay.innerHTML = '';
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /* ====================================================================================== */
    /* CLI SELECTOR (DIAL TAB) */
    /* ====================================================================================== */

    initializeCliSelector() {
        this.updateCliSelector();
        this.updateCliDisplay();
    }

    updateCliSelector() {
        const dropdown = document.getElementById('cliCompanySelect');
        if (!dropdown) return;

        const currentValue = dropdown.value;
        dropdown.innerHTML = `<option value="" data-translate="select_company_cli">${t('select_company_cli', 'Select Company CLI')}</option>`;
        
        const sorted = this.getAllCompanies();
        sorted.forEach(company => {
            const option = document.createElement('option');
            option.value = company.company_id;
            option.textContent = company.name;
            dropdown.appendChild(option);
        });

        // Restore selection if still valid
        if (currentValue && this.getCompanyById(parseInt(currentValue))) {
            dropdown.value = currentValue;
        }
    }

    handleCliSelectionChange() {
        const dropdown = document.getElementById('cliCompanySelect');
        const confirmBtn = document.getElementById('cliConfirmBtn');
        const confirmNumber = document.getElementById('cliConfirmNumber');
        const currentDisplay = document.getElementById('cliCurrentNumber');
        
        if (!dropdown || !confirmBtn) return;

        const selectedId = dropdown.value;
        
        if (selectedId) {
            const company = this.getCompanyById(parseInt(selectedId));
            if (company) {
                // Show orange button with company name and phone number
                if (confirmNumber) {
                    confirmNumber.textContent = `${company.name} - ${company.cid}`;
                }
                confirmBtn.style.display = 'block';
                // Hide current number display
                if (currentDisplay) {
                    currentDisplay.style.display = 'none';
                }
            }
        } else {
            // Hide button, show current number if exists
            confirmBtn.style.display = 'none';
            if (currentDisplay && this.currentSelectedCompany) {
                currentDisplay.style.display = 'block';
            }
        }
    }

    async confirmCliChange() {
        const dropdown = document.getElementById('cliCompanySelect');
        if (!dropdown) return;

        const selectedId = parseInt(dropdown.value);
        if (!selectedId) return;

        const company = this.getCompanyById(selectedId);
        if (!company) {
            this.showError(t('selectedCompanyNotFound', 'Selected company not found'));
            return;
        }

        // Dial the CLI change code: *82*{company_id}
        const cliCode = `*82*${company.company_id}`;
        
        try {
            console.log('📞 CompanyNumbersManager: Changing CLI to company:', company);
            
            // Use the SIP manager to make the call
            if (App.managers.sip) {
                await App.managers.sip.makeCall(cliCode);
                
                this.currentSelectedCompany = company;
                
                // Hide orange button
                const confirmBtn = document.getElementById('cliConfirmBtn');
                if (confirmBtn) {
                    confirmBtn.style.display = 'none';
                }
                
                // Reset dropdown to default
                const dropdown = document.getElementById('cliCompanySelect');
                if (dropdown) {
                    dropdown.value = '';
                }
                
                // Show just the phone number
                this.updateCliDisplay();
                
                this.showSuccess(t('cliChangedTo', 'CLI changed to {name}').replace('{name}', company.name));
            } else {
                throw new Error('SIP manager not available');
            }
            
        } catch (error) {
            console.error('📞 CompanyNumbersManager: CLI change failed:', error);
            this.showError(t('failedToChangeCLI', 'Failed to change CLI: {error}').replace('{error}', error.message));
        }
    }

    updateCliDisplay() {
        const display = document.getElementById('cliCurrentNumber');
        if (!display) return;

        if (this.currentSelectedCompany) {
            display.textContent = `${this.currentSelectedCompany.name} - ${this.currentSelectedCompany.cid}`;
            display.style.display = 'block';
        } else {
            display.textContent = '';
            display.style.display = 'none';
        }
    }

    /**
     * Sync current CLIP from API agent data
     * Called after agent login check to retrieve and display current outgoing CLI
     * @param {Object} agentData - Agent data from API containing 'cid' field
     */
    syncCurrentClipFromAPI(agentData) {
        // Check if company numbers tab is enabled
        if (!this.isCompanyNumbersTabVisible()) {
            console.log('📞 CompanyNumbersManager: Company Numbers tab not enabled, skipping CLIP sync');
            return;
        }

        // Extract the cid (current CLIP outgoing) from agent data
        const currentCid = agentData.cid;
        
        if (!currentCid) {
            console.log('📞 CompanyNumbersManager: No cid field in agent data');
            return;
        }

        console.log('📞 CompanyNumbersManager: Current CLIP from API (cid):', currentCid);

        // Try to find a matching company by telephone number
        // The cid from API is the actual phone number being used as outgoing CLI
        const matchingCompany = this.companyNumbers.find(c => c.cid === currentCid.toString());

        if (matchingCompany) {
            console.log('📞 CompanyNumbersManager: Found matching company for cid:', matchingCompany);
            
            // Set as current selected company
            this.currentSelectedCompany = matchingCompany;
            
            // Update the UI to reflect current company
            this.updateCliDisplay();
            
            // Reset dropdown to default (not showing a pending selection)
            const dropdown = document.getElementById('cliCompanySelect');
            if (dropdown) {
                dropdown.value = '';
            }
            
            // Ensure confirm button is hidden
            const confirmBtn = document.getElementById('cliConfirmBtn');
            if (confirmBtn) {
                confirmBtn.style.display = 'none';
            }
            
            console.log('✅ CompanyNumbersManager: CLI synced from API - Current company:', matchingCompany.name);
        } else {
            console.log('📞 CompanyNumbersManager: No matching company found for cid:', currentCid);
            // Clear current selection if cid doesn't match any stored company
            this.currentSelectedCompany = null;
            this.updateCliDisplay();
        }
    }

    /* ====================================================================================== */
    /* API SYNCHRONIZATION */
    /* ====================================================================================== */

    /**
     * Check if Company Numbers tab is enabled in settings
     */
    isCompanyNumbersTabEnabled() {
        const checkbox = document.getElementById('ShowBlank1Tab');
        return checkbox && checkbox.checked;
    }

    /**
     * Fetch company numbers from Phantom API
     * @returns {Array|null} Array of company numbers or null on error
     */
    async fetchCompanyNumbersFromApi() {
        try {
            // Check if API manager is available
            if (!App.managers.api) {
                console.warn('📞 CompanyNumbersManager: API manager not available');
                return null;
            }

            console.log('📞 CompanyNumbersManager: Fetching company numbers from Phantom API...');
            
            const result = await App.managers.api.get('companyNumbers');
            
            if (result.success && result.data && result.data.company_numbers) {
                console.log('📞 CompanyNumbersManager: Fetched', result.data.company_numbers.length, 'company numbers from API');
                return result.data.company_numbers;
            } else {
                console.warn('📞 CompanyNumbersManager: API returned no company numbers');
                return null;
            }
        } catch (error) {
            console.error('📞 CompanyNumbersManager: API fetch failed:', error);
            return null;
        }
    }

    /**
     * Compare API data with local storage data
     * @param {Array} apiData - Company numbers from API
     * @param {Array} localData - Company numbers from local storage
     * @returns {boolean} True if identical, false if different
     */
    compareCompanyNumbers(apiData, localData) {
        // Quick check: compare counts first
        if (apiData.length !== localData.length) {
            console.log('📞 CompanyNumbersManager: Different counts -', 
                'API:', apiData.length, 'Local:', localData.length);
            return false;
        }

        // If both empty, they're identical
        if (apiData.length === 0) {
            return true;
        }

        // Deep comparison: check each entry exists in both arrays
        // Order doesn't matter, so we'll search for matches
        for (const apiEntry of apiData) {
            const match = localData.find(localEntry => 
                localEntry.company_id === apiEntry.company_id &&
                localEntry.cid === apiEntry.cid &&
                localEntry.name === apiEntry.name
            );

            if (!match) {
                console.log('📞 CompanyNumbersManager: Entry not found in local storage:', apiEntry);
                return false;
            }
        }

        // All entries match
        console.log('📞 CompanyNumbersManager: All entries match between API and local storage');
        return true;
    }

    /**
     * Synchronize company numbers from Phantom API
     * @param {boolean} showToasts - Whether to show toast notifications (true for manual refresh)
     */
    async syncCompanyNumbersFromApi(showToasts = false) {
        try {
            // Check if Company Numbers tab is enabled
            if (!this.isCompanyNumbersTabEnabled()) {
                console.log('📞 CompanyNumbersManager: Tab not enabled, skipping API sync');
                return;
            }

            console.log('📞 CompanyNumbersManager: Starting API sync...');

            // Fetch data from API
            const apiData = await this.fetchCompanyNumbersFromApi();

            // Handle no data or error
            if (!apiData || apiData.length === 0) {
                if (showToasts) {
                    this.showWarning(t('no_company_numbers_on_phantom', 'No company numbers available on Phantom'));
                }
                return;
            }

            // Compare with local storage
            const isIdentical = this.compareCompanyNumbers(apiData, this.companyNumbers);

            if (isIdentical) {
                // Data is up to date
                if (showToasts) {
                    this.showSuccess(t('company_numbers_latest_version', 'Your company numbers is the latest version'));
                }
                console.log('✅ CompanyNumbersManager: Company numbers are up to date');
            } else {
                // Data is different - show confirmation
                const confirmed = await this.showApiSyncConfirmation(apiData);
                
                if (confirmed) {
                    // User confirmed - replace data
                    await this.replaceCompanyNumbersWithApiData(apiData);
                    this.showSuccess(t('company_numbers_updated_successfully', 'Company numbers updated successfully from server'));
                    console.log('✅ CompanyNumbersManager: Company numbers updated from API');
                } else {
                    // User cancelled - keep existing data
                    console.log('📞 CompanyNumbersManager: User cancelled API sync');
                }
            }

        } catch (error) {
            console.error('📞 CompanyNumbersManager: API sync failed:', error);
            if (showToasts) {
                this.showError(t('failed_to_fetch_company_numbers', 'Failed to fetch company numbers from server'));
            }
        }
    }

    /**
     * Replace local storage company numbers with API data
     * @param {Array} apiData - Company numbers from API
     */
    async replaceCompanyNumbersWithApiData(apiData) {
        try {
            console.log('📞 CompanyNumbersManager: Replacing company numbers with API data...');

            // Clear existing data
            this.companyNumbers = [];

            // Add all API data
            apiData.forEach(entry => {
                this.companyNumbers.push({
                    company_id: entry.company_id,
                    cid: entry.cid,
                    name: entry.name
                });
            });

            // Save to localStorage
            this.saveCompanyNumbers();

            // Update UI
            this.renderCompanyNumbers();
            this.updateCliSelector();

            console.log('✅ CompanyNumbersManager: Successfully replaced company numbers with API data');

        } catch (error) {
            console.error('📞 CompanyNumbersManager: Failed to replace company numbers:', error);
            throw error;
        }
    }

    /**
     * Show confirmation dialog for API sync
     * @param {Array} apiData - Company numbers from API
     * @returns {Promise<boolean>} True if user confirms, false if cancelled
     */
    async showApiSyncConfirmation(apiData) {
        return new Promise((resolve) => {
            // Create modal overlay
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.style.display = 'flex';

            // Create modal
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-header">
                    <h3><i class="fa fa-exclamation-triangle"></i> ${t('confirm_sync', 'Confirm Synchronization')}</h3>
                </div>
                <div class="modal-body">
                    <p>${t('company_numbers_will_be_overwritten', 'All Company Numbers will be overwritten with new retrieved version, are you sure you wish to continue?')}</p>
                    <p><strong>${apiData.length} ${t('company_numbers', 'company numbers')}</strong> ${t('will_be_imported', 'will be imported.')}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary cancel-btn">${t('cancel', 'Cancel')}</button>
                    <button class="btn-primary confirm-btn">${t('okay', 'Okay')}</button>
                </div>
            `;

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            // Handle button clicks
            const cancelBtn = modal.querySelector('.cancel-btn');
            const confirmBtn = modal.querySelector('.confirm-btn');

            cancelBtn.addEventListener('click', () => {
                document.body.removeChild(overlay);
                resolve(false);
            });

            confirmBtn.addEventListener('click', () => {
                document.body.removeChild(overlay);
                resolve(true);
            });

            // Handle overlay click (cancel)
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    document.body.removeChild(overlay);
                    resolve(false);
                }
            });
        });
    }

    /* ====================================================================================== */
    /* NOTIFICATIONS */
    /* ====================================================================================== */

    showSuccess(message) {
        if (App.managers.ui && App.managers.ui.showNotification) {
            App.managers.ui.showNotification(message, 'success');
        } else {
            console.log('✅', message);
        }
    }

    showError(message) {
        if (App.managers.ui && App.managers.ui.showNotification) {
            App.managers.ui.showNotification(message, 'error');
        } else {
            console.error('❌', message);
        }
    }

    showWarning(message) {
        if (App.managers.ui && App.managers.ui.showNotification) {
            App.managers.ui.showNotification(message, 'warning');
        } else {
            console.warn('⚠️', message);
        }
    }
}

// Make available globally for inline event handlers
if (typeof window !== 'undefined') {
    window.CompanyNumbersManager = CompanyNumbersManager;
}
