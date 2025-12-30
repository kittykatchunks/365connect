/* ====================================================================================== */
/* CONTACTS MANAGER - Contact Management System */
/* Version: 1.0.0 */
/* Handles CRUD operations, search, and CSV import/export for contacts */
/* ====================================================================================== */

class ContactsManager {
    constructor() {
        this.contacts = [];
        this.filteredContacts = [];
        this.searchQuery = '';
        this.initialized = false;
        
        console.log('📞 ContactsManager: Initialized');
    }

    /* ====================================================================================== */
    /* INITIALIZATION */
    /* ====================================================================================== */

    async initialize() {
        try {
            console.log('📞 ContactsManager: Starting initialization...');
            
            // Load contacts from localStorage
            await this.loadContacts();
            
            // Initialize UI event handlers
            this.initializeEventHandlers();
            
            // Initial render
            this.renderContacts();
            
            this.initialized = true;
            console.log('📞 ContactsManager: Initialization complete');
            
        } catch (error) {
            console.error('📞 ContactsManager: Initialization failed:', error);
            throw error;
        }
    }

    initializeEventHandlers() {
        // Add Contact button
        const addContactBtn = document.getElementById('addContactBtn');
        if (addContactBtn) {
            addContactBtn.addEventListener('click', () => this.showAddContactModal());
        }

        // Delete All button
        const deleteAllBtn = document.getElementById('deleteAllContactsBtn');
        if (deleteAllBtn) {
            deleteAllBtn.addEventListener('click', () => this.confirmDeleteAllContacts());
        }

        // Import/Export buttons
        const importBtn = document.getElementById('importContactsBtn');
        if (importBtn) {
            importBtn.addEventListener('click', () => this.importContacts());
        }

        const exportBtn = document.getElementById('exportContactsBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportContacts());
        }

        // Search input
        const searchInput = document.getElementById('contactSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
            // Clear search button
            const clearSearchBtn = document.getElementById('clearContactSearch');
            if (clearSearchBtn) {
                clearSearchBtn.addEventListener('click', () => {
                    searchInput.value = '';
                    this.handleSearch('');
                });
            }
        }

        // File input for CSV import
        const csvFileInput = document.getElementById('csvFileInput');
        if (csvFileInput) {
            csvFileInput.addEventListener('change', (e) => this.handleCSVImport(e));
        }
    }

    /* ====================================================================================== */
    /* CONTACT CRUD OPERATIONS */
    /* ====================================================================================== */

    addContact(contactData) {
        // Validate required fields
        if (!this.validateContact(contactData)) {
            throw new Error(t('invalidContactDataNameRequired', 'Invalid contact data. At least one name field is required.'));
        }

        // Generate unique ID
        const contact = {
            id: this.generateContactId(),
            firstName: contactData.firstName?.trim() || '',
            lastName: contactData.lastName?.trim() || '',
            companyName: contactData.companyName?.trim() || '',
            phoneNumber: contactData.phoneNumber?.trim() || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.contacts.push(contact);
        this.saveContacts();
        this.renderContacts();
        
        console.log('📞 ContactsManager: Contact added:', contact);
        return contact;
    }

    updateContact(contactId, contactData) {
        const index = this.contacts.findIndex(contact => contact.id === contactId);
        if (index === -1) {
            throw new Error(t('contactNotFound', 'Contact not found'));
        }

        if (!this.validateContact(contactData)) {
            throw new Error(t('invalidContactDataNameRequired', 'Invalid contact data. At least one name field is required.'));
        }

        this.contacts[index] = {
            ...this.contacts[index],
            firstName: contactData.firstName?.trim() || '',
            lastName: contactData.lastName?.trim() || '',
            companyName: contactData.companyName?.trim() || '',
            phoneNumber: contactData.phoneNumber?.trim() || '',
            updatedAt: new Date().toISOString()
        };

        this.saveContacts();
        this.renderContacts();
        
        console.log('📞 ContactsManager: Contact updated:', this.contacts[index]);
        return this.contacts[index];
    }

    deleteContact(contactId) {
        const index = this.contacts.findIndex(c => c.id === contactId);
        if (index === -1) {
            throw new Error(t('contactNotFound', 'Contact not found'));
        }

        const contact = this.contacts[index];
        this.contacts.splice(index, 1);
        this.saveContacts();
        this.renderContacts();
        
        console.log('📞 ContactsManager: Contact deleted:', contact);
        return contact;
    }

    getContact(contactId) {
        return this.contacts.find(c => c.id === contactId);
    }

    getAllContacts() {
        return [...this.contacts];
    }

    /* ====================================================================================== */
    /* VALIDATION */
    /* ====================================================================================== */

    validateContact(contactData) {
        // At least one name field must be present
        const hasFirstName = contactData.firstName && contactData.firstName.trim().length > 0;
        const hasLastName = contactData.lastName && contactData.lastName.trim().length > 0;
        const hasCompanyName = contactData.companyName && contactData.companyName.trim().length > 0;
        
        return hasFirstName || hasLastName || hasCompanyName;
    }

    generateContactId() {
        return 'contact_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /* ====================================================================================== */
    /* SEARCH FUNCTIONALITY */
    /* ====================================================================================== */

    handleSearch(query) {
        this.searchQuery = query.toLowerCase().trim();
        
        if (!this.searchQuery) {
            this.filteredContacts = [...this.contacts];
        } else {
            this.filteredContacts = this.contacts.filter(contact => {
                const searchString = [
                    contact.firstName,
                    contact.lastName, 
                    contact.companyName
                ].join(' ').toLowerCase();
                
                return this.fuzzySearch(searchString, this.searchQuery);
            });
        }
        
        this.renderContacts();
        console.log('📞 ContactsManager: Search completed for:', query, 'Results:', this.filteredContacts.length);
    }

    fuzzySearch(text, query) {
        // Simple fuzzy search - checks if all characters in query appear in order in text
        const textChars = text.toLowerCase().split('');
        const queryChars = query.toLowerCase().split('');
        
        let queryIndex = 0;
        
        for (let i = 0; i < textChars.length && queryIndex < queryChars.length; i++) {
            if (textChars[i] === queryChars[queryIndex]) {
                queryIndex++;
            }
        }
        
        return queryIndex === queryChars.length;
    }

    /* ====================================================================================== */
    /* SORTING */
    /* ====================================================================================== */

    sortContacts(contacts) {
        return contacts.sort((a, b) => {
            // Priority: Company Name -> Last Name -> First Name
            const aName = this.getDisplayName(a).toLowerCase();
            const bName = this.getDisplayName(b).toLowerCase();
            
            return aName.localeCompare(bName);
        });
    }

    getDisplayName(contact) {
        // Priority: Company Name first, then Last Name, then First Name
        if (contact.companyName && contact.companyName.trim()) {
            return contact.companyName.trim();
        }
        if (contact.lastName && contact.lastName.trim()) {
            return contact.lastName.trim();
        }
        if (contact.firstName && contact.firstName.trim()) {
            return contact.firstName.trim();
        }
        return t('unknown', 'Unknown');
    }

    getFullDisplayName(contact) {
        let parts = [];
        
        if (contact.companyName && contact.companyName.trim()) {
            parts.push(contact.companyName.trim());
        }
        
        let personalName = [];
        if (contact.firstName && contact.firstName.trim()) {
            personalName.push(contact.firstName.trim());
        }
        if (contact.lastName && contact.lastName.trim()) {
            personalName.push(contact.lastName.trim());
        }
        
        if (personalName.length > 0) {
            if (parts.length > 0) {
                parts.push(`(${personalName.join(' ')})`);
            } else {
                parts.push(personalName.join(' '));
            }
        }
        
        return parts.length > 0 ? parts.join(' ') : 'Unknown Contact';
    }

    /* ====================================================================================== */
    /* PERSISTENCE */
    /* ====================================================================================== */

    async loadContacts() {
        try {
            if (window.localDB) {
                const contactsData = window.localDB.getItem('contacts', '[]');
                this.contacts = JSON.parse(contactsData);
                this.filteredContacts = [...this.contacts];
                console.log('📞 ContactsManager: Loaded', this.contacts.length, 'contacts from storage');
            }
        } catch (error) {
            console.error('📞 ContactsManager: Failed to load contacts:', error);
            this.contacts = [];
            this.filteredContacts = [];
        }
    }

    saveContacts() {
        try {
            if (window.localDB) {
                window.localDB.setItem('contacts', JSON.stringify(this.contacts));
                console.log('📞 ContactsManager: Saved', this.contacts.length, 'contacts to storage');
            }
        } catch (error) {
            console.error('📞 ContactsManager: Failed to save contacts:', error);
        }
    }

    /* ====================================================================================== */
    /* CSV IMPORT/EXPORT */
    /* ====================================================================================== */

    exportContacts() {
        try {
            const csvData = this.contactsToCSV();
            const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `contacts-${new Date().toISOString().split('T')[0]}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                this.showSuccess('Contacts exported successfully');
                console.log('📞 ContactsManager: Contacts exported to CSV');
            }
        } catch (error) {
            console.error('📞 ContactsManager: Export failed:', error);
            this.showError('Failed to export contacts: ' + error.message);
        }
    }

    contactsToCSV() {
        const headers = ['First Name', 'Last Name', 'Company Name', 'Phone Number'];
        const csvRows = [headers.join(',')];
        
        this.contacts.forEach(contact => {
            const row = [
                this.escapeCSVField(contact.firstName),
                this.escapeCSVField(contact.lastName),
                this.escapeCSVField(contact.companyName),
                this.escapeCSVField(contact.phoneNumber)
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

    importContacts() {
        const fileInput = document.getElementById('csvFileInput');
        if (fileInput) {
            fileInput.click();
        }
    }

    async handleCSVImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await this.readFileAsText(file);
            const importedContacts = this.parseCSV(text);
            
            if (importedContacts.length === 0) {
                this.showError('No valid contacts found in CSV file');
                return;
            }

            // Show confirmation dialog
            const confirmed = confirm(`Import ${importedContacts.length} contacts? This will add to existing contacts.`);
            if (!confirmed) return;

            let successCount = 0;
            let errorCount = 0;

            importedContacts.forEach(contactData => {
                try {
                    if (this.validateContact(contactData)) {
                        this.addContactSilent(contactData);
                        successCount++;
                    } else {
                        errorCount++;
                    }
                } catch (error) {
                    errorCount++;
                }
            });

            this.saveContacts();
            this.renderContacts();

            this.showSuccess(`Import completed: ${successCount} contacts added, ${errorCount} skipped`);
            console.log('📞 ContactsManager: CSV import completed:', { successCount, errorCount });

        } catch (error) {
            console.error('📞 ContactsManager: CSV import failed:', error);
            this.showError('Failed to import CSV: ' + error.message);
        }

        // Clear file input
        event.target.value = '';
    }

    addContactSilent(contactData) {
        const contact = {
            id: this.generateContactId(),
            firstName: contactData.firstName?.trim() || '',
            lastName: contactData.lastName?.trim() || '',
            companyName: contactData.companyName?.trim() || '',
            phoneNumber: contactData.phoneNumber?.trim() || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.contacts.push(contact);
        return contact;
    }

    parseCSV(text) {
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        if (lines.length < 2) return [];

        const headers = this.parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
        const contacts = [];

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length === 0) continue;

            const contact = {};
            
            // Map CSV columns to contact fields
            headers.forEach((header, index) => {
                const value = values[index] || '';
                
                if (header.includes('first') && header.includes('name')) {
                    contact.firstName = value;
                } else if (header.includes('last') && header.includes('name')) {
                    contact.lastName = value;
                } else if (header.includes('company')) {
                    contact.companyName = value;
                } else if (header.includes('phone') || header.includes('number') || header.includes('tel')) {
                    contact.phoneNumber = value;
                }
            });

            contacts.push(contact);
        }

        return contacts;
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
                    i++; // Skip next quote
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

    renderContacts() {
        const container = document.getElementById('contactsList');
        if (!container) {
            console.error('📞 ContactsManager: Contacts list container not found');
            return;
        }

        const contactsToShow = this.searchQuery ? this.filteredContacts : this.contacts;
        const sortedContacts = this.sortContacts([...contactsToShow]);

        if (sortedContacts.length === 0) {
            this.renderEmptyState(container);
            return;
        }

        container.innerHTML = '';
        
        sortedContacts.forEach(contact => {
            const contactElement = this.createContactElement(contact);
            container.appendChild(contactElement);
        });

        console.log('📞 ContactsManager: Rendered', sortedContacts.length, 'contacts');
    }

    renderEmptyState(container) {
        const message = this.searchQuery ? 'No contacts found matching your search' : 'No contacts yet';
        const actionText = this.searchQuery ? 'Try a different search term' : 'Add your first contact';
        
        container.innerHTML = `
            <div class="no-contacts-message">
                <i class="fa fa-users"></i>
                <h3>${message}</h3>
                <p>${actionText}</p>
                ${!this.searchQuery ? '<button class="btn-primary" onclick="App.managers.contacts.showAddContactModal()">Add Contact</button>' : ''}
            </div>
        `;
    }

    createContactElement(contact) {
        const div = document.createElement('div');
        div.className = 'contact-item';
        div.setAttribute('data-contact-id', contact.id);

        const displayName = this.getFullDisplayName(contact);
        const phoneNumber = contact.phoneNumber || 'No phone number';

        div.innerHTML = `
            <div class="contact-info">
                <div class="contact-name">${this.escapeHtml(displayName)}</div>
                <div class="contact-phone">${this.escapeHtml(phoneNumber)}</div>
            </div>
            <div class="contact-actions">
                <button class="contact-action-btn dial-btn" onclick="App.managers.contacts.dialContact('${contact.id}')" title="Dial this number">
                    <i class="fa fa-phone"></i>
                </button>
                <button class="contact-action-btn edit-btn" onclick="App.managers.contacts.showEditContactModal('${contact.id}')" title="Edit contact">
                    <i class="fa fa-edit"></i>
                </button>
                <button class="contact-action-btn delete-btn" onclick="App.managers.contacts.confirmDeleteContact('${contact.id}')" title="Delete contact">
                    <i class="fa fa-trash"></i>
                </button>
            </div>
        `;

        return div;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /* ====================================================================================== */
    /* MODAL HANDLING */
    /* ====================================================================================== */

    showAddContactModal() {
        this.showContactModal('Add Contact', null);
    }

    showEditContactModal(contactId) {
        const contact = this.getContact(contactId);
        if (!contact) {
            this.showError('Contact not found');
            return;
        }
        this.showContactModal('Edit Contact', contact);
    }

    showContactModal(title, contact) {
        // Create modal HTML
        const isEdit = contact !== null;
        const modalId = 'contactModal';
        
        // Remove existing modal if any
        const existingModal = document.getElementById(modalId);
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal-overlay';
        
        modal.innerHTML = `
            <div class="modal-content contact-modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" onclick="App.managers.contacts.hideContactModal()">
                        <i class="fa fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="contactForm">
                        <div class="form-group">
                            <label for="contactFirstName">First Name:</label>
                            <input type="text" id="contactFirstName" name="firstName" value="${contact?.firstName || ''}" />
                        </div>
                        <div class="form-group">
                            <label for="contactLastName">Last Name:</label>
                            <input type="text" id="contactLastName" name="lastName" value="${contact?.lastName || ''}" />
                        </div>
                        <div class="form-group">
                            <label for="contactCompanyName">Company Name:</label>
                            <input type="text" id="contactCompanyName" name="companyName" value="${contact?.companyName || ''}" />
                        </div>
                        <div class="form-group">
                            <label for="contactPhoneNumber">Phone Number:</label>
                            <input type="tel" id="contactPhoneNumber" name="phoneNumber" value="${contact?.phoneNumber || ''}" />
                        </div>
                        <div class="form-note">
                            <i class="fa fa-info-circle"></i>
                            At least one name field (First Name, Last Name, or Company Name) is required.
                        </div>
                        <div class="modal-actions">
                            <button type="submit" class="btn-primary">${isEdit ? 'Update' : 'Add'} Contact</button>
                            <button type="button" class="btn-secondary" onclick="App.managers.contacts.hideContactModal()">Cancel</button>
                        </div>
                        ${isEdit ? `<input type="hidden" id="contactId" value="${contact.id}" />` : ''}
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Attach form submit handler
        const form = document.getElementById('contactForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleContactSubmit(e, isEdit));
        }
        
        // Show modal
        setTimeout(() => {
            modal.classList.add('show');
            // Focus first input
            const firstInput = modal.querySelector('input[type="text"]');
            if (firstInput) {
                firstInput.focus();
            }
        }, 10);
    }

    hideContactModal() {
        const modal = document.getElementById('contactModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    }

    handleContactSubmit(event, isEdit) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const contactData = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            companyName: formData.get('companyName'),
            phoneNumber: formData.get('phoneNumber')
        };

        try {
            if (isEdit) {
                const contactId = document.getElementById('contactId').value;
                this.updateContact(contactId, contactData);
                this.showSuccess('Contact updated successfully');
            } else {
                this.addContact(contactData);
                this.showSuccess('Contact added successfully');
            }
            
            this.hideContactModal();
        } catch (error) {
            this.showError(error.message);
        }
    }

    /* ====================================================================================== */
    /* CONTACT ACTIONS */
    /* ====================================================================================== */

    dialContact(contactId) {
        const contact = this.getContact(contactId);
        if (!contact || !contact.phoneNumber) {
            this.showError('No phone number available for this contact');
            return;
        }

        // Switch to dial tab and populate the number
        if (window.Phone && typeof window.Phone.switchTab === 'function') {
            window.Phone.switchTab('dial');
        }

        // Set the dial input
        const dialInput = document.getElementById('dialInput');
        if (dialInput) {
            dialInput.value = contact.phoneNumber;
            dialInput.focus();
            console.log('📞 ContactsManager: Number ready to dial:', contact.phoneNumber);
            this.showSuccess(`Ready to call ${this.getFullDisplayName(contact)}`);
        }
    }

    confirmDeleteContact(contactId) {
        const contact = this.getContact(contactId);
        if (!contact) {
            this.showError('Contact not found');
            return;
        }

        const displayName = this.getFullDisplayName(contact);
        const confirmed = confirm(`Are you sure you want to delete "${displayName}"?\n\nThis action cannot be undone.`);
        
        if (confirmed) {
            try {
                this.deleteContact(contactId);
                this.showSuccess('Contact deleted successfully');
            } catch (error) {
                this.showError('Failed to delete contact: ' + error.message);
            }
        }
    }

    confirmDeleteAllContacts() {
        if (this.contacts.length === 0) {
            this.showError(t('noContactsToDelete', 'No contacts to delete'));
            return;
        }

        const contactCount = this.contacts.length;
        const confirmed = confirm(
            `⚠️ ${t('warning', 'WARNING')}: ${t('deleteAllContacts', 'Delete ALL Contacts')}?\n\n` +
            `${t('thisWillPermanentlyDeleteAll', 'This will permanently delete all')} ${contactCount} ${t('contact', 'contact')}${contactCount !== 1 ? t('s', 's') : ''} ${t('fromYourList', 'from your list')}.\n\n` +
            `${t('thisActionCannotBeUndone', 'This action CANNOT be undone')}!\n\n` +
            `${t('areYouAbsolutelySure', 'Are you absolutely sure you want to continue')}?`
        );
        
        if (confirmed) {
            // Double confirmation for safety
            const doubleConfirmed = confirm(
                `${t('finalConfirmation', 'FINAL CONFIRMATION')}\n\n` +
                `${t('youAreAboutToDelete', 'You are about to delete')} ${contactCount} ${t('contact', 'contact')}${contactCount !== 1 ? t('s', 's') : ''}.\n\n` +
                `${t('clickOkToPermanentlyDeleteContacts', 'Click OK to permanently delete all contacts, or Cancel to abort')}.`
            );
            
            if (doubleConfirmed) {
                try {
                    this.deleteAllContacts();
                    this.showSuccess(`${t('allContactsDeleted', 'All contacts deleted')} (${contactCount} ${t('contact', 'contact')}${contactCount !== 1 ? t('s', 's') : ''})`);
                } catch (error) {
                    this.showError(t('failedToDeleteContacts', 'Failed to delete contacts') + ': ' + error.message);
                }
            }
        }
    }

    deleteAllContacts() {
        this.contacts = [];
        this.filteredContacts = [];
        this.searchQuery = '';
        
        // Clear search input if present
        const searchInput = document.getElementById('contactSearchInput');
        if (searchInput) {
            searchInput.value = '';
        }
        
        this.saveContacts();
        this.renderContacts();
        
        console.log('📞 ContactsManager: All contacts deleted');
    }

    /* ====================================================================================== */
    /* NOTIFICATION HELPERS */
    /* ====================================================================================== */

    showSuccess(message) {
        if (window.showToast) {
            window.showToast(message, 'success');
        } else {
            console.log('✅', message);
        }
    }

    showError(message) {
        if (window.showToast) {
            window.showToast(message, 'error');
        } else {
            console.error('❌', message);
        }
    }

    /* ====================================================================================== */
    /* PUBLIC API */
    /* ====================================================================================== */

    getContactsCount() {
        return this.contacts.length;
    }

    searchContacts(query) {
        this.handleSearch(query);
        return this.filteredContacts;
    }

    clearSearch() {
        const searchInput = document.getElementById('contactSearchInput');
        if (searchInput) {
            searchInput.value = '';
        }
        this.handleSearch('');
    }
}

// Make ContactsManager available globally
window.ContactsManager = ContactsManager;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ContactsManager;
}