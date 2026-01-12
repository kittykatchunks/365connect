# CSS Usage Analysis

## index.html

### BEM Classes
- main-container
- left-panel
- panel-header
- app-logo
- logo-light
- logo-dark
- register-status
- register-button
- register-disconnected
- register-text
- nav-tabs
- nav-tab
- contacts-controls-container
- contacts-top-controls
- contacts-import-export
- contacts-search-wrapper
- search-input-wrapper
- clear-search-btn
- search-container
- agent-keys-container
- agent-keys-wrapper
- agent-keys-grid
- agent-key
- login-idle
- queue-idle
- pause-idle
- agent-text
- content-area
- contacts-container
- contacts-list
- no-contacts-message
- dial-container
- blf-keys-left
- blf-keys-right
- blf-buttons-dial
- dial-center-panel
- sip-status-display
- status-row
- status-top
- status-bottom
- status-item
- status-label
- status-value
- voicemail-item
- voicemail-count
- voicemail-text
- voicemail-icon
- dial-input-row
- dial-input-wrapper
- clear-dial-btn
- call-status
- call-info-display
- call-main-info
- caller-number
- caller-name
- call-secondary-info
- call-direction
- call-duration
- agent-logged-out
- line-keys-container
- line-key
- line-key-indicator
- line-key-label
- line-key-info
- cli-selector-container
- cli-selector-content
- cli-company-select
- cli-confirm-btn
- cli-current-number
- dialpad-container
- dialpad-key
- dial-actions
- call-button
- call-controls
- btn-control
- btn-label
- activity-container
- activity-header
- activity-controls
- clear-history-btn
- refresh-history-btn
- history-container
- no-history-message
- company-numbers-container
- company-numbers-controls
- company-numbers-top-controls
- company-numbers-import-export
- company-numbers-list
- no-company-numbers-message
- blank-container
- blank-content
- blank-icon
- settings-container
- accordion
- accordion-item
- accordion-header
- header-title
- header-icon
- accordion-icon
- accordion-content
- accordion-body
- setting-item
- setting-help-text
- notification-status
- theme-toggle-control
- audio-device-control
- audio-test-btn
- micro-device-control
- micro-test-btn
- microphone-level-container
- microphone-level-bar
- settings-actions
- welcome-overlay
- welcome-blur-background
- welcome-content
- welcome-icon
- welcome-okay-btn
- notification-container
- update-banner
- update-content
- update-icon
- update-message
- update-btn
- dismiss-btn
- modal-overlay
- loading-screen
- loading-content
- loading-status
- loading-progress
- loading-bar
- transfer-modal
- transfer-modal-content
- modal-header
- modal-close
- modal-body
- modal-footer
- transfer-input-section
- transfer-input
- transfer-actions
- attended-actions
- attended-status
- attended-buttons
- btn-transfer

### Utility/Function Classes
- active
- hidden
- disabled
- uppercase
- selected
- full-width
- btn-primary
- btn-secondary
- btn-danger
- btn-success
- btn-cancel
- add-contact-btn
- delete-all-btn
- add-company-btn
- refresh-btn
- digit
- letters
- spinner

### CSS Variables (referenced in inline styles)
- --spacing-sm
- --spacing-md
- --text-color-secondary

---

## agent-buttons.js

### FUNCTION: createAgentNumberModal

**HTML:**
```html
<div class="modal-content">
    <div class="modal-header">
        <h3>Agent Login</h3>
    </div>
    <div class="modal-body">
        <div class="input-group" style="margin-bottom: 15px;">
            <label for="agentNumberInput" style="display: block; margin-bottom: 5px; font-weight: bold;">Agent Number *</label>
            <input type="text" id="agentNumberInput" data-translate-placeholder="agent_number" placeholder="Agent Number" maxlength="10" required 
                   style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
        </div>
        <div class="input-group" style="margin-bottom: 10px;">
            <label for="agentPasscodeInput" style="display: block; margin-bottom: 5px; font-weight: bold;">Passcode (Optional)</label>
            <input type="password" id="agentPasscodeInput" data-translate-placeholder="numeric_passcode" placeholder="Numeric passcode" maxlength="20" pattern="[0-9]*"
                   style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
            <small class="input-help" style="display: block; margin-top: 5px; color: #666; font-size: 12px;">Leave blank if no passcode required</small>
        </div>
    </div>
    <div class="modal-actions">
        <button id="confirmAgentBtn" class="btn-primary">Login</button>
        <button id="cancelAgentBtn" class="btn-secondary">Cancel</button>
    </div>
</div>
```

**CSS:**
- BEM Classes: modal-content, modal-header, modal-body, modal-actions, input-group, input-help
- Utility/Function Classes: btn-primary, btn-secondary
- CSS Variables: None

### FUNCTION: createDtmfInputModal

**HTML:**
```html
<div class="modal-content">
    <div class="modal-header">
        <h3>Enter Pause Code</h3>
    </div>
    <div class="modal-body">
        <input type="text" id="dtmfInput" data-translate-placeholder="pause_code" placeholder="Pause Code" maxlength="10">
    </div>
    <div class="modal-actions">
        <button id="dtmfSendBtn" class="btn-primary">Send</button>
        <button id="dtmfCancelBtn" class="btn-secondary">Cancel</button>
    </div>
</div>
```

**CSS:**
- BEM Classes: modal-content, modal-header, modal-body, modal-actions
- Utility/Function Classes: btn-primary, btn-secondary
- CSS Variables: None

### FUNCTION: createPauseReasonModal

**HTML:**
```html
<div class="modal-content pause-reason-modal">
    <div class="modal-header">
        <h3>Select Pause Reason</h3>
    </div>
    <div class="modal-body">
        <div id="pauseReasonList" class="pause-reason-list">
            <!-- Pause reasons will be dynamically added here -->
        </div>
    </div>
    <div class="modal-actions">
        <button id="pauseReasonCancelBtn" class="btn-secondary">Cancel</button>
    </div>
</div>
```

**CSS:**
- BEM Classes: modal-content, pause-reason-modal, modal-header, modal-body, modal-actions, pause-reason-list
- Utility/Function Classes: btn-secondary
- CSS Variables: None

### FUNCTION: showPauseReasonModal

**HTML:**
```javascript
// Dynamically creates buttons:
const button = document.createElement('button');
button.className = 'pause-reason-button';
button.textContent = reason.label;
button.dataset.code = reason.code;
```

**CSS:**
- BEM Classes: pause-reason-button
- Utility/Function Classes: None
- CSS Variables: None

---

## blf-button-manager.js

### FUNCTION: createBlfButton

**HTML:**
```html
<!-- When buttonData.displayName exists: -->
<div class="blf-label">${this.escapeHtml(buttonData.displayName)}</div>
${buttonData.number ? `<div class="blf-number">${this.escapeHtml(buttonData.number)}</div>` : ''}

<!-- When buttonData.displayName is empty: -->
<div class="blf-empty">BLF ${index + 1}</div>
```

**CSS:**
- BEM Classes: blf-button (class name on button element), blf-label, blf-number, blf-empty
- Utility/Function Classes: None
- CSS Variables: None

### FUNCTION: createBlfModal

**HTML:**
```html
<div id="blfModal" class="modal-overlay blf-modal hidden">
    <div class="modal-content">
        <div class="modal-header">
            <h3>Configure BLF Button</h3>
            <button class="modal-close" id="blfModalClose">
                <i class="fa fa-times"></i>
            </button>
        </div>
        <div class="modal-body">
            <div class="form-group">
                <label>Button Type:</label>
                <div class="checkbox-group">
                    <label class="checkbox-label">
                        <input type="checkbox" value="speeddial" id="buttonTypeSpeedDial" checked>
                        Speed Dial - Quick dial without presence monitoring
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" value="blf" id="buttonTypeBLF">
                        BLF - Monitor presence and enable quick transfer
                    </label>
                </div>
            </div>
            <div class="form-group">
                <label for="blfDisplayName">Display Name:</label>
                <input type="text" id="blfDisplayName" class="form-control" 
                       data-translate-placeholder="button_label" placeholder="Button label" maxlength="20">
            </div>
            <div class="form-group">
                <label for="blfNumber">Number/Extension:</label>
                <input type="text" id="blfNumber" class="form-control" 
                       data-translate-placeholder="extension_or_phone_number" placeholder="Extension or phone number">
            </div>
            <div class="form-group">
                <label class="checkbox-label">
                    <input type="checkbox" id="blfOverrideTransfer">
                    <span data-translate="override_transfer_method">Override default transfer method for this key</span>
                </label>
            </div>
            <div class="form-group" id="blfTransferMethodGroup" style="display: none; margin-left: 20px;">
                <label for="blfTransferMethod" data-translate="transfer_method">Transfer Method:</label>
                <select id="blfTransferMethod" class="form-control">
                    <option value="blind" data-translate="blind_transfer">Blind</option>
                    <option value="attended" data-translate="attended_transfer">Attended</option>
                </select>
            </div>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="blfModalCancel" data-translate="cancel">Cancel</button>
            <button type="button" class="btn btn-danger" id="blfModalClear" data-translate="clear">Clear</button>
            <button type="button" class="btn btn-primary" id="blfModalSave">Save</button>
        </div>
    </div>
</div>
```

**CSS:**
- BEM Classes: modal-overlay, blf-modal, modal-content, modal-header, modal-close, modal-body, modal-footer, form-group, checkbox-group, checkbox-label, form-control
- Utility/Function Classes: hidden, btn, btn-secondary, btn-danger, btn-primary
- CSS Variables: None

---

## call-history-manager.js

### FUNCTION: generateHistoryHTML

**HTML:**
```html
<!-- When history is empty: -->
<div class="no-history-message">
    <i class="fa fa-phone-square"></i>
    <h3 data-translate="no_call_history">${t('no_call_history', 'No Call History')}</h3>
    <p data-translate="call_history_will_appear">${t('call_history_will_appear', 'Your call history will appear here after you make or receive calls.')}</p>
</div>

<!-- When history has entries: -->
<div class="history-date-group">
    <div class="history-date-header">${date}</div>
    
    <!-- For each call: -->
    <div class="history-item ${directionClass} ${statusClass}" data-call-id="${call.id}">
        <div class="call-direction">
            <i class="fa ${directionIcon}"></i>
        </div>
        <div class="call-info">
            <div class="call-name">${displayName}</div>
            ${displayNumber ? `<div class="call-number">${displayNumber}</div>` : ''}
            <div class="call-details">
                <span class="call-time">${timeWithDate}</span>
                ${duration ? `<span class="call-duration">${duration}</span>` : ''}
                ${call.status === 'missed' ? '<span class="missed-indicator">Missed</span>' : ''}
            </div>
        </div>
        <div class="call-actions">
            <button class="callback-button" data-number="${call.number}" title="Call back">
                <i class="fa fa-phone"></i>
            </button>
            <button class="remove-call-button" data-call-id="${call.id}" title="Remove from history">
                <i class="fa fa-trash"></i>
            </button>
        </div>
    </div>
</div>
```

**CSS:**
- BEM Classes: no-history-message, history-date-group, history-date-header, history-item, call-direction, call-info, call-name, call-number, call-details, call-time, call-duration, missed-indicator, call-actions, callback-button, remove-call-button
- Utility/Function Classes: incoming, outgoing, missed, completed
- CSS Variables: None

---

## call-history-ui.js

### FUNCTION: performHistorySearch

**HTML:**
```html
<!-- When no search results found: -->
<div class="no-history-message">
    <i class="fa fa-search"></i>
    <h3>No Results Found</h3>
    <p>No calls found matching "${query}". Try a different search term.</p>
</div>
```

**CSS:**
- BEM Classes: no-history-message
- Utility/Function Classes: None
- CSS Variables: None

### FUNCTION: generateFilteredHistoryHTML

**HTML:**
```html
<!-- When no calls to display: -->
<div class="no-history-message">
    <i class="fa fa-phone-square"></i>
    <h3 data-translate="no_call_history">${t('no_call_history', 'No Call History')}</h3>
    <p data-translate="call_history_will_appear">${t('call_history_will_appear', 'Your call history will appear here after you make or receive calls.')}</p>
</div>

<!-- When calls exist (grouped by date): -->
<div class="history-date-group">
    <div class="history-date-header">${date}</div>
    <!-- Call items generated by generateCallItemHTML -->
</div>
```

**CSS:**
- BEM Classes: no-history-message, history-date-group, history-date-header
- Utility/Function Classes: None
- CSS Variables: None

### FUNCTION: generateCallItemHTML

**HTML:**
```html
<div class="history-item ${directionClass} ${statusClass}" data-call-id="${call.id}">
    <div class="call-direction">
        <i class="fa ${directionIcon}"></i>
    </div>
    <div class="call-info">
        <div class="call-name">${displayName}</div>
        ${displayNumber ? `<div class="call-number">${displayNumber}</div>` : ''}
        <div class="call-details">
            <span class="call-time">${timeWithDate}</span>
            ${duration ? `<span class="call-duration">${duration}</span>` : ''}
            ${call.status === 'missed' ? '<span class="missed-indicator">Missed</span>' : ''}
        </div>
    </div>
    <div class="call-actions">
        <button class="callback-button" data-number="${call.number}" title="Call back">
            <i class="fa fa-phone"></i>
        </button>
        <button class="remove-call-button" data-call-id="${call.id}" title="Remove from history">
            <i class="fa fa-trash"></i>
        </button>
    </div>
</div>
```

**CSS:**
- BEM Classes: history-item, call-direction, call-info, call-name, call-number, call-details, call-time, call-duration, missed-indicator, call-actions, callback-button, remove-call-button
- Utility/Function Classes: incoming, outgoing, missed, completed (dynamic classes in ${directionClass} ${statusClass})
- CSS Variables: None

---

## company-numbers-manager.js

### FUNCTION: renderCompanyNumbers

**HTML:**
```html
<!-- When no company numbers exist: -->
<div class="no-company-numbers-message">
    <i class="fa fa-building"></i>
    <h3 data-translate="no_company_numbers_yet">${t('no_company_numbers_yet', 'No company numbers yet')}</h3>
    <p data-translate="add_company_numbers_cli">${t('add_company_numbers_cli', 'Add company numbers to enable CLI selection')}</p>
    <button class="btn-primary" onclick="App.managers.companyNumbers?.showAddCompanyModal()" data-translate="add_company_number">${t('add_company_number', 'Add Company Number')}</button>
</div>

<!-- When company numbers exist: -->
<table class="company-numbers-table">
    <thead>
        <tr>
            <th>ID</th>
            <th>Company Name</th>
            <th>Telephone Number</th>
            <th>Actions</th>
        </tr>
    </thead>
    <tbody id="companyNumbersTableBody"></tbody>
</table>

<!-- For each company number row: -->
<tr>
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
</tr>
```

**CSS:**
- BEM Classes: no-company-numbers-message, company-numbers-table, editable-cell, actions-cell, btn-icon, btn-edit, btn-delete
- Utility/Function Classes: btn-primary
- CSS Variables: None

### FUNCTION: updateCliSelector

**HTML:**
```html
<!-- Initial option: -->
<option value="" data-translate="select_company_cli">${t('select_company_cli', 'Select Company CLI')}</option>

<!-- For each company (dynamically created): -->
const option = document.createElement('option');
option.value = company.company_id;
option.textContent = company.name;
```

**CSS:**
- BEM Classes: None
- Utility/Function Classes: None
- CSS Variables: None

### FUNCTION: showApiSyncConfirmation

**HTML:**
```html
<div class="modal">
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
</div>
```

**CSS:**
- BEM Classes: modal, modal-header, modal-body, modal-footer, cancel-btn, confirm-btn
- Utility/Function Classes: btn-secondary, btn-primary
- CSS Variables: None

---

## contacts-manager.js

### FUNCTION: renderEmptyState

**HTML:**
```html
<div class="no-contacts-message">
    <i class="fa fa-users"></i>
    <h3 data-translate="${messageKey}">${message}</h3>
    <p data-translate="${actionKey}">${actionText}</p>
    ${!this.searchQuery ? `<button class="btn-primary" onclick="App.managers.contacts.showAddContactModal()" data-translate="add_contact">${t('add_contact', 'Add Contact')}</button>` : ''}
</div>
```

**CSS:**
- BEM Classes: no-contacts-message
- Utility/Function Classes: btn-primary
- CSS Variables: None

### FUNCTION: createContactElement

**HTML:**
```html
<div class="contact-item" data-contact-id="${contact.id}">
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
</div>
```

**CSS:**
- BEM Classes: contact-item, contact-info, contact-name, contact-phone, contact-actions, contact-action-btn, dial-btn, edit-btn, delete-btn
- Utility/Function Classes: None
- CSS Variables: None

### FUNCTION: showContactModal

**HTML:**
```html
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
```

**CSS:**
- BEM Classes: modal-content, contact-modal-content, modal-header, modal-close, modal-body, modal-actions, form-group, form-note
- Utility/Function Classes: btn-primary, btn-secondary
- CSS Variables: None

---

## ui-state-manager.js

### FUNCTION: createNotificationElement

**HTML:**
```html
<div class="notification notification-${notification.type || 'info'}">
    <!-- With icon: -->
    <div class="notification-content-with-icon">
        <i class="fa ${iconClass} notification-icon notification-icon-${notification.type}"></i>
        <div class="notification-text">
            <div class="notification-title">${notification.title}</div>
            <div class="notification-message">${notification.message}</div>
            <!-- If actions provided: -->
            <div class="notification-actions">
                <button id="${buttonId}" class="notification-action ${action.class || 'btn-primary'}">${action.text}</button>
            </div>
        </div>
    </div>
    
    <!-- Without icon: -->
    <div class="notification-text">
        <div class="notification-title">${notification.title}</div>
        <div class="notification-message">${notification.message}</div>
        <div class="notification-actions">
            <button id="${buttonId}" class="notification-action ${action.class || 'btn-primary'}">${action.text}</button>
        </div>
    </div>
    
    <button class="notification-close" title="Close" data-action="close">&times;</button>
</div>
```

**CSS:**
- BEM Classes: notification, notification-content-with-icon, notification-icon, notification-text, notification-title, notification-message, notification-actions, notification-action, notification-close
- Utility/Function Classes: notification-info (dynamic based on type), notification-icon-${type}, btn-primary (default for actions)
- CSS Variables: None

### FUNCTION: createContactElement

**HTML:**
```html
<div class="contact-item">
    <div class="contact-status ${statusClass}"></div>
    <div class="contact-info">
        <div class="contact-name">${buddy.callerID}</div>
        <div class="contact-number">${buddy.number}</div>
    </div>
    <button class="contact-call-btn btn-sm btn-primary" data-number="${buddy.number}">
        <i class="fa fa-phone"></i>
    </button>
</div>
```

**CSS:**
- BEM Classes: contact-item, contact-status, contact-info, contact-name, contact-number, contact-call-btn
- Utility/Function Classes: contact-status-${devState} (dynamic status class), btn-sm, btn-primary
- CSS Variables: None

---

## audio-settings-manager.js

### FUNCTION: updateDeviceDropdowns

**HTML:**
```html
<!-- Speaker dropdown initial option: -->
<option value="default">${t('default_speaker', 'Default Speaker')}</option>

<!-- For each speaker device (dynamically created): -->
const option = document.createElement('option');
option.value = device.deviceId;
option.textContent = device.label;

<!-- Microphone dropdown initial option: -->
<option value="default">${t('default_microphone', 'Default Microphone')}</option>

<!-- For each microphone device (dynamically created): -->
const option = document.createElement('option');
option.value = device.deviceId;
option.textContent = device.label;

<!-- Ringer dropdown initial option: -->
<option value="default">Default Ringer</option>

<!-- For each ringer device (dynamically created): -->
const option = document.createElement('option');
option.value = device.deviceId;
option.textContent = device.label;

<!-- For each ringtone (dynamically created): -->
const option = document.createElement('option');
option.value = ringtone.filename;
option.textContent = ringtone.label;
```

**CSS:**
- BEM Classes: None
- Utility/Function Classes: None
- CSS Variables: None

---

## app-startup.js

### FUNCTION: resetButtons (inline code within function)

**HTML:**
```html
<i class="fa fa-phone"></i> <span data-translate="call">CALL</span>
```

**CSS:**
- BEM Classes: None
- Utility/Function Classes: None
- CSS Variables: None

### FUNCTION: showInitializationError

**HTML:**
```html
<div class="initialization-error">
    <div class="error-content">
        <div class="error-icon">⚠️</div>
        <h1>${t('initializationFailed', 'Initialization Failed')}</h1>
        <p>${t('pwaFailedToStart', 'The Autocab365 PWA failed to start properly.')}</p>
        <div class="error-details">
            <strong>${t('error', 'Error')}:</strong> ${error.message}
        </div>
        <div class="error-actions">
            <button onclick="location.reload()" class="btn-primary">
                🔄 ${t('reloadApplication', 'Reload Application')}
            </button>
            <button onclick="this.showDiagnostics()" class="btn-secondary">
                🔍 ${t('showDiagnostics', 'Show Diagnostics')}
            </button>
        </div>
        <p class="error-help">
            ${t('ifProblemPersistsCheckConsole', 'If this problem persists, please check the browser console (F12) for more details.')}
        </p>
    </div>
</div>
```

**CSS:**
- BEM Classes: initialization-error, error-content, error-icon, error-details, error-actions, error-help
- Utility/Function Classes: btn-primary, btn-secondary
- CSS Variables: None

---

## phone.js

### FUNCTION: resetCallUI (inline code within function)

**HTML:**
```html
<i class="fa fa-phone"></i><span class="btn-label">CALL</span>
```

**CSS:**
- BEM Classes: btn-label
- Utility/Function Classes: None
- CSS Variables: None

### FUNCTION: updateBuddyList

**HTML:**
```html
<!-- When no buddies: -->
<div class="empty-state">No contacts found</div>

<!-- When buddies exist: -->
<div class="buddy-item" data-id="${buddy.id}">
    <div class="buddy-info">
        <div class="buddy-name">${buddy.name}</div>
        <div class="buddy-number">${buddy.number}</div>
    </div>
    <div class="buddy-actions">
        <button onclick="callBuddy('${buddy.number}')" class="call-buddy-btn">📞</button>
        <button onclick="removeBuddy('${buddy.id}')" class="remove-buddy-btn">🗑️</button>
    </div>
</div>
```

**CSS:**
- BEM Classes: empty-state, buddy-item, buddy-info, buddy-name, buddy-number, buddy-actions, call-buddy-btn, remove-buddy-btn
- Utility/Function Classes: None
- CSS Variables: None

### FUNCTION: showDatabaseInfo (inline code within function)

**HTML:**
```html
<!-- When no database entries: -->
<div class="empty-state">No database entries found</div>

<!-- When entries exist: -->
<div class="db-item">
    <strong>${key}:</strong> ${truncatedValue}
</div>
```

**CSS:**
- BEM Classes: empty-state, db-item
- Utility/Function Classes: None
- CSS Variables: None

### FUNCTION: showFallbackNotification

**HTML:**
```html
<div class="notification notification-${type}">
    <div class="notification-content">
        <div class="notification-title">${title}</div>
        <div class="notification-message">${message}</div>
    </div>
    <button class="notification-close" onclick="this.parentElement.remove()">×</button>
</div>
```

**CSS:**
- BEM Classes: notification, notification-content, notification-title, notification-message, notification-close
- Utility/Function Classes: notification-${type} (dynamic based on type)
- CSS Variables: None

### FUNCTION: updateCallButtonState

**HTML:**
```html
<!-- No active session: -->
<i class="fa fa-phone"></i> CALL

<!-- Incoming call: -->
<i class="fa fa-phone"></i> ANSWER

<!-- Call established: -->
<i class="fa fa-share"></i> TRANSFER

<!-- Call connecting: -->
<i class="fa fa-spinner"></i> CALLING
```

**CSS:**
- BEM Classes: None
- Utility/Function Classes: btn-success, btn-warning, btn-danger, btn-primary (dynamically applied)
- CSS Variables: None
