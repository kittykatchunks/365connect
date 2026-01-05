/**
 * BLF Button Manager
 * Manages BLF (Button Line Function) buttons with modal configuration using app-consistent patterns
 * Refactored from blf-buttons.js to use class-based architecture and consistent modal system
 */

class BLFButtonManager {
    constructor() {
        this.blfButtons = [];
        this.currentEditingIndex = -1;
        this.isDirty = false;
        this.failedSubscriptions = new Set(); // Track extensions that failed to subscribe
        this.retryTimer = null; // Timer for periodic retry attempts
        this.retryInterval = 180000; // 180 seconds in milliseconds
        
        this.init();
    }

    init() {
        console.log('🔧 Initializing BLF Button Manager');
        this.loadBlfButtons();
        this.setupEventListeners();
        this.setupSipEventListeners();
        
        // Only render if BLF is enabled
        if (this.isBlfEnabled()) {
            this.renderBlfButtons();
        }
    }

    setupEventListeners() {
        // BLF Configuration modal close handlers
        const blfModalClose = document.getElementById('blfModalClose');
        if (blfModalClose) {
            blfModalClose.addEventListener('click', () => this.hideBlfModal());
        }

        // Click outside modal to close
        document.addEventListener('click', (e) => {
            const blfModal = document.getElementById('blfModal');
            if (blfModal && e.target === blfModal) {
                this.hideBlfModal();
            }
        });

        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const blfModal = document.getElementById('blfModal');
                if (blfModal && blfModal.classList.contains('show')) {
                    this.hideBlfModal();
                }
            }
        });
    }

    setupSipEventListeners() {
        // Set up SIP event listeners (will be called when SIP manager is ready)
        this.setupSipEventListeners();
    }
    
    setupSipEventListeners() {
        // Listen for SIP registration events to setup subscriptions
        if (window.App && window.App.managers && window.App.managers.sip) {
            console.log('🔧 BLF Button Manager: Setting up SIP event listeners');
            
            // Listen for BLF state changes
            window.App.managers.sip.on('blfStateChanged', (data) => {
                console.log('🔔 BLF Button Manager received blfStateChanged event:', data);
                this.handleBlfStateChange(data);
            });
            
            console.log('✅ BLF Button Manager: blfStateChanged listener registered');

            // Listen for registration events to auto-subscribe
            window.App.managers.sip.on('registered', () => {
                console.log('📱 SIP registered - setting up BLF subscriptions');
                this.subscribeToAllBlfButtons();
            });

            window.App.managers.sip.on('unregistering', () => {
                console.log('📱 SIP unregistering - cleaning up BLF subscriptions');
                this.unsubscribeFromAllBlfButtons();
            });
            
            return true; // Successfully set up listeners
        } else {
            console.warn('⚠️ BLF Button Manager: SIP manager not available, will retry later');
            return false; // SIP manager not ready yet
        }
    }
    
    // Call this method when the SIP manager becomes available
    initializeSipIntegration() {
        if (this.setupSipEventListeners()) {
            console.log('✅ BLF Button Manager: SIP integration initialized');
        } else {
            // Retry after a short delay
            setTimeout(() => this.initializeSipIntegration(), 100);
        }
    }

    loadBlfButtons() {
        try {
            if (window.localDB) {
                const stored = window.localDB.getItem('BlfButtons', '[]');
                this.blfButtons = JSON.parse(stored);
                console.log('📱 Loaded BLF buttons:', this.blfButtons.length);
            } else {
                this.blfButtons = [];
            }
        } catch (error) {
            console.error('❌ Error loading BLF buttons:', error);
            this.blfButtons = [];
        }
    }

    saveBlfButtons() {
        try {
            if (window.localDB) {
                window.localDB.setItem('BlfButtons', JSON.stringify(this.blfButtons));
                this.isDirty = false;
                console.log('💾 BLF buttons saved');
            }
        } catch (error) {
            console.error('❌ Error saving BLF buttons:', error);
        }
    }

    renderBlfButtons() {
        const leftContainer = document.getElementById('blf-left-dial');
        const rightContainer = document.getElementById('blf-right-dial');

        if (!leftContainer || !rightContainer) {
            console.warn('⚠️ BLF containers not found');
            return;
        }

        if (!this.isBlfEnabled()) {
            console.log('📱 BLF buttons disabled, hiding containers');
            // Hide the BLF containers when disabled
            leftContainer.style.display = 'none';
            rightContainer.style.display = 'none';
            // Clear any existing buttons
            leftContainer.innerHTML = '';
            rightContainer.innerHTML = '';
            return;
        }

        // Show the BLF containers when enabled
        console.log('📱 BLF buttons enabled, showing containers');
        leftContainer.style.display = 'flex';
        rightContainer.style.display = 'flex';

        // Clear existing buttons
        leftContainer.innerHTML = '';
        rightContainer.innerHTML = '';

        // Render buttons (split between left and right)
        const maxButtons = 20; // 10 per side
        const leftButtons = Math.ceil(maxButtons / 2);

        for (let i = 0; i < maxButtons; i++) {
            const button = this.createBlfButton(i);
            
            if (i < leftButtons) {
                leftContainer.appendChild(button);
            } else {
                rightContainer.appendChild(button);
            }
        }

        console.log('📱 Rendered BLF buttons');
    }

    createBlfButton(index) {
        const buttonData = this.blfButtons[index] || {};
        const button = document.createElement('button');
        
        button.className = 'blf-button';
        button.dataset.index = index;
        
        // Set button content
        if (buttonData.displayName) {
            button.innerHTML = `
                <div class="blf-label">${this.escapeHtml(buttonData.displayName)}</div>
                ${buttonData.number ? `<div class="blf-number">${this.escapeHtml(buttonData.number)}</div>` : ''}
            `;
        } else {
            button.innerHTML = `<div class="blf-empty">BLF ${index + 1}</div>`;
        }

        // Set button state based on presence
        this.updateButtonState(button, buttonData);

        // Add event listeners
        button.addEventListener('click', (e) => this.handleButtonClick(e, index));
        button.addEventListener('contextmenu', (e) => this.handleButtonRightClick(e, index));

        return button;
    }

    updateButtonState(button, buttonData) {
        // Remove all state classes  
        button.classList.remove(
            'blf-idle', 'blf-busy', 'blf-ringing', 'blf-unavailable', 'blf-configured',
            'blf-available', 'blf-inactive', 'blf-hold', 'speed-dial'
        );
        
        if (buttonData && buttonData.number && buttonData.enabled !== false) {
            button.classList.add('blf-configured');
            
            // Handle different button types
            const buttonType = buttonData.type || 'speeddial';
            
            if (buttonType === 'speeddial') {
                // Speed dial buttons - no presence monitoring
                button.classList.add('speed-dial');
            } else if (buttonType === 'blf') {
                // BLF buttons - check presence state
                const presenceState = this.getPresenceState(buttonData.number);
                console.log(`📱 BLF button ${buttonData.number} presence state: ${presenceState}`);
                
                // Map dialog states to CSS classes based on RFC 4235 dialog states
                switch (presenceState) {
                    case 'confirmed':
                    case 'established':
                        // Extension is busy (call answered/active)
                        button.classList.add('blf-busy');
                        break;
                    case 'early':
                        // Extension is ringing (incoming call)
                        button.classList.add('blf-ringing');
                        break;
                    case 'terminated':
                        // Extension is idle/available (no active call)
                        button.classList.add('blf-available');
                        break;
                    case 'trying':
                    case 'proceeding':
                        // Call setup states - treat as ringing
                        button.classList.add('blf-ringing');
                        break;
                    case 'hold':
                        // Extension has call on hold
                        button.classList.add('blf-hold');
                        break;
                    case 'unknown':
                        // Initial subscription state - show as inactive until we get real state
                        button.classList.add('blf-inactive');
                        break;
                    case 'available':
                        // Explicitly available
                        button.classList.add('blf-available');
                        break;
                    case null:
                    case undefined:
                    default:
                        // No subscription or unknown state
                        button.classList.add('blf-inactive');
                        break;
                }
            }
        }
        // Unprogrammed buttons get no additional classes (handled by CSS)
    }
    
    updateButtonStateWithPresence(button, buttonData, presenceState, remoteTarget) {
        // Remove all state classes  
        button.classList.remove(
            'blf-idle', 'blf-busy', 'blf-ringing', 'blf-unavailable', 'blf-configured',
            'blf-available', 'blf-inactive', 'blf-hold', 'speed-dial'
        );
        
        if (buttonData && buttonData.number && buttonData.enabled !== false) {
            button.classList.add('blf-configured');
            
            // Handle different button types
            const buttonType = buttonData.type || 'speeddial';
            
            if (buttonType === 'speeddial') {
                // Speed dial buttons - no presence monitoring
                button.classList.add('speed-dial');
            } else if (buttonType === 'blf') {
                console.log(`📱 Applying BLF state "${presenceState}" to button ${buttonData.number}`);
                
                // Map dialog states to CSS classes based on RFC 4235 dialog states
                switch (presenceState) {
                    case 'confirmed':
                    case 'established':
                        // Extension is busy (call answered/active)
                        button.classList.add('blf-busy');
                        console.log(`📱 Button ${buttonData.number} set to BUSY`);
                        break;
                    case 'early':
                        // Extension is ringing (incoming call)
                        button.classList.add('blf-ringing');
                        console.log(`📱 Button ${buttonData.number} set to RINGING`);
                        break;
                    case 'terminated':
                        // Extension is idle/available (no active call)
                        button.classList.add('blf-available');
                        console.log(`📱 Button ${buttonData.number} set to AVAILABLE`);
                        break;
                    case 'trying':
                    case 'proceeding':
                        // Call setup states - treat as ringing
                        button.classList.add('blf-ringing');
                        console.log(`📱 Button ${buttonData.number} set to RINGING (${presenceState})`);
                        break;
                    case 'hold':
                        // Extension has call on hold
                        button.classList.add('blf-hold');
                        console.log(`📱 Button ${buttonData.number} set to HOLD`);
                        break;
                    case 'unknown':
                        // Initial subscription state - show as inactive until we get real state
                        button.classList.add('blf-inactive');
                        console.log(`📱 Button ${buttonData.number} set to INACTIVE (unknown state)`);
                        break;
                    case 'available':
                        // Explicitly available
                        button.classList.add('blf-available');
                        console.log(`📱 Button ${buttonData.number} set to AVAILABLE (explicit)`);
                        break;
                    case null:
                    case undefined:
                    default:
                        // No subscription or unknown state
                        button.classList.add('blf-inactive');
                        console.log(`📱 Button ${buttonData.number} set to INACTIVE (${presenceState || 'null/undefined'})`);
                        break;
                }
                
                // Update button title with remote target info if available
                if (remoteTarget && (presenceState === 'early' || presenceState === 'confirmed')) {
                    const remoteName = remoteTarget.replace(/^sip:/, '').split('@')[0];
                    button.title = `${buttonData.displayName || buttonData.number} - ${presenceState === 'early' ? 'Ringing from' : 'Talking to'} ${remoteName}`;
                } else {
                    button.title = buttonData.displayName || buttonData.number;
                }
            }
        }
        // Unprogrammed buttons get no additional classes (handled by CSS)
    }

    getPresenceState(number) {
        // Integrate with SIP BLF presence system
        if (window.App && window.App.managers && window.App.managers.sip) {
            const blfState = window.App.managers.sip.getBLFState(number);
            return blfState;
        }
        
        // No SIP manager available
        return null;
    }

    handleButtonClick(event, index) {
        event.preventDefault();
        const buttonData = this.blfButtons[index];
        
        if (buttonData && buttonData.number && buttonData.enabled !== false) {
            // Check if there's an attended transfer already in progress
            const isAttendedTransferActive = this.isAttendedTransferActive();
            
            if (isAttendedTransferActive) {
                // Handle BLF click during attended transfer - initiate new attended transfer to this number
                console.log(`📞 Switching attended transfer target to ${buttonData.number}`);
                this.performAttendedTransferToNumber(buttonData.number, buttonData.displayName);
                return;
            }
            
            // Check if there's an active call for transfer functionality
            const hasActiveCall = this.hasActiveCall();
            
            if (hasActiveCall) {
                // Initiate transfer for any button type when call is active
                console.log(`📞 Active call detected, initiating transfer to ${buttonData.number}`);
                this.initiateTransfer(buttonData.number, buttonData.displayName);
            } else {
                // Regular dial functionality
                console.log('📞 Dialing BLF button:', buttonData.number);
                
                // Use existing app dial function
                if (window.DialByUser) {
                    window.DialByUser(buttonData.number);
                } else if (window.App && window.App.managers && window.App.managers.sip) {
                    window.App.managers.sip.makeCall(buttonData.number);
                } else {
                    console.warn('⚠️ No dial function available');
                }
            }
        } else {
            // Configure button
            this.showBlfModal(index);
        }
    }

    hasActiveCall() {
        // Check if there's an active call
        if (window.App && window.App.managers && window.App.managers.sip) {
            const currentSession = window.App.managers.sip.getCurrentSession();
            console.log('📞 Checking for active call:', {
                hasSession: !!currentSession,
                state: currentSession?.state,
                sessionId: currentSession?.id,
                direction: currentSession?.direction
            });
            // Check for established state (SIP.SessionState.Established can be a number or string)
            return currentSession && (
                currentSession.state === 'Established' ||
                currentSession.state === 'established' || 
                currentSession.state === 'active' ||
                (typeof currentSession.state === 'number' && currentSession.state === 3) // SIP.SessionState.Established = 3
            );
        }
        return false;
    }

    isAttendedTransferActive() {
        // Check if attended transfer modal is currently active
        const transferModal = document.getElementById('transferModal');
        const attendedActions = document.getElementById('attendedActions');
        
        return transferModal && 
               transferModal.classList.contains('show') && 
               attendedActions && 
               !attendedActions.classList.contains('hidden') &&
               window.currentTransferSession;
    }

    initiateTransfer(number, displayName) {
        console.log(`📞 Initiating transfer to ${number} (${displayName || 'Unknown'})`);
        
        const preferBlind = this.getTransferPreference();
        
        if (preferBlind) {
            // Perform blind transfer immediately
            this.performBlindTransferToNumber(number, displayName);
        } else {
            // Start attended transfer
            this.performAttendedTransferToNumber(number, displayName);
        }
    }

    async performBlindTransferToNumber(number, displayName) {
        try {
            console.log(`📞 Performing blind transfer to ${number}`);
            
            if (window.App && window.App.managers && window.App.managers.sip) {
                const currentSession = window.App.managers.sip.getCurrentSession();
                if (currentSession) {
                    await window.App.managers.sip.blindTransfer(currentSession.id, number);
                    this.showToast(`Call transferred to ${displayName || number}`, 'success');
                } else {
                    this.showToast('No active call to transfer', 'warning');
                }
            } else {
                this.showToast('Transfer not available', 'error');
            }
        } catch (error) {
            console.error('❌ Blind transfer failed:', error);
            this.showToast('Transfer failed', 'error');
        }
    }

    async performAttendedTransferToNumber(number, displayName) {
        try {
            console.log(`📞 Performing attended transfer to ${number}`);
            
            if (window.App && window.App.managers && window.App.managers.sip) {
                const currentSession = window.App.managers.sip.getCurrentSession();
                if (currentSession) {
                    // If there's already an attended transfer in progress, cancel it first
                    if (window.currentTransferSession) {
                        console.log('🔄 Cancelling existing attended transfer to start new one');
                        try {
                            await window.App.managers.sip.cancelAttendedTransfer(currentSession.id);
                        } catch (error) {
                            console.warn('⚠️ Failed to cancel existing transfer, proceeding anyway:', error);
                        }
                    }
                    
                    // Show transfer modal if not already showing
                    const transferModal = document.getElementById('transferModal');
                    if (!transferModal || !transferModal.classList.contains('show')) {
                        if (typeof showTransferModal === 'function') {
                            showTransferModal();
                        }
                    }
                    
                    // Wait a brief moment for modal to render, then set up attended transfer UI
                    setTimeout(() => {
                        // Set up the UI for attended transfer (same as performAttendedTransfer in phone.js)
                        const transferActions = document.getElementById('transferActions');
                        const attendedActions = document.getElementById('attendedActions');
                        const transferInputSection = document.querySelector('.transfer-input-section');
                        const completeTransferBtn = document.getElementById('completeTransferBtn');
                        const attendedStatusText = document.querySelector('.attended-status');
                        
                        console.log('🔧 Setting up attended transfer UI elements:', {
                            transferActions: !!transferActions,
                            attendedActions: !!attendedActions,
                            transferInputSection: !!transferInputSection,
                            completeTransferBtn: !!completeTransferBtn,
                            attendedStatusText: !!attendedStatusText
                        });
                        
                        if (transferActions && attendedActions) {
                            transferActions.classList.add('hidden');
                            attendedActions.classList.remove('hidden');
                            console.log('✅ Switched from transfer actions to attended actions');
                        }
                        
                        // Hide the transfer number input section during attended transfer
                        if (transferInputSection) {
                            transferInputSection.classList.add('hidden');
                            console.log('✅ Hidden transfer input section');
                        }
                        
                        // Update the status message with the dialed number
                        if (attendedStatusText) {
                            attendedStatusText.textContent = `Calling transfer target ${displayName || number}...`;
                            console.log('✅ Updated status text');
                        }
                        
                        // Disable the complete transfer button until call is answered
                        if (completeTransferBtn) {
                            completeTransferBtn.disabled = true;
                            completeTransferBtn.style.opacity = '0.5';
                            completeTransferBtn.style.cursor = 'not-allowed';
                            console.log('✅ Disabled complete transfer button');
                        }
                    }, 100); // Small delay to ensure modal is rendered
                    
                    // Start attended transfer (this will create a new session)
                    window.currentTransferSession = await window.App.managers.sip.attendedTransfer(currentSession.id, number);
                    
                    this.showToast(`Calling ${displayName || number} for transfer`, 'info');
                } else {
                    this.showToast('No active call to transfer', 'warning');
                }
            } else {
                this.showToast('Transfer not available', 'error');
            }
        } catch (error) {
            console.error('❌ Attended transfer failed:', error);
            this.showToast('Transfer failed', 'error');
            
            // On error, return to normal transfer modal
            if (typeof returnToTransferModal === 'function') {
                returnToTransferModal();
            }
        }
    }

    handleButtonRightClick(event, index) {
        event.preventDefault();
        this.showBlfModal(index);
    }

    showBlfModal(index = -1) {
        console.log('🔧 Opening BLF configuration modal for index:', index);
        
        this.currentEditingIndex = index;
        const buttonData = this.blfButtons[index] || {};
        
        // Get or create modal
        let modal = document.getElementById('blfModal');
        if (!modal) {
            this.createBlfModal();
            modal = document.getElementById('blfModal');
        }

        // Populate form fields
        const displayNameInput = document.getElementById('blfDisplayName');
        const numberInput = document.getElementById('blfNumber');
        const enabledCheckbox = document.getElementById('blfButtonEnabled');
        const speedDialCheckbox = document.getElementById('buttonTypeSpeedDial');
        const blfCheckbox = document.getElementById('buttonTypeBLF');

        if (displayNameInput) displayNameInput.value = buttonData.displayName || '';
        if (numberInput) numberInput.value = buttonData.number || '';
        if (enabledCheckbox) enabledCheckbox.checked = buttonData.enabled !== false;
        
        // Set button type (default to speeddial for backward compatibility)
        const buttonType = buttonData.type || 'speeddial';
        if (speedDialCheckbox) speedDialCheckbox.checked = buttonType === 'speeddial';
        if (blfCheckbox) blfCheckbox.checked = buttonType === 'blf';

        // Show modal
        const overlay = document.getElementById('modalOverlay');
        if (overlay) overlay.classList.remove('hidden');
        modal.classList.remove('hidden');

        // Focus first input
        setTimeout(() => {
            if (displayNameInput) displayNameInput.focus();
        }, 100);

        console.log('✅ BLF modal shown');
    }

    hideBlfModal() {
        const modal = document.getElementById('blfModal');
        const overlay = document.getElementById('modalOverlay');
        
        if (modal) modal.classList.add('hidden');
        if (overlay) overlay.classList.add('hidden');
        
        console.log('✅ BLF modal hidden');
    }

    createBlfModal() {
        console.log('🔧 Creating BLF configuration modal');
        
        // Create modal HTML structure following app patterns
        const modalHtml = `
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
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" id="blfModalCancel" data-translate="cancel">Cancel</button>
                        <button type="button" class="btn btn-danger" id="blfModalClear" data-translate="clear">Clear</button>
                        <button type="button" class="btn btn-primary" id="blfModalSave">Save</button>
                    </div>
                </div>
            </div>
        `; 

        // Insert modal into DOM
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Setup event listeners for the new modal
        this.setupModalEventListeners();
    }

    setupModalEventListeners() {
        // Save button
        const saveBtn = document.getElementById('blfModalSave');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveBlfButtonConfig());
        }

        // Cancel button
        const cancelBtn = document.getElementById('blfModalCancel');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.hideBlfModal());
        }

        // Clear button
        const clearBtn = document.getElementById('blfModalClear');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearBlfButtonConfig());
        }

        // Checkbox mutual exclusion logic (behave like radio buttons)
        const speedDialCheckbox = document.getElementById('buttonTypeSpeedDial');
        const blfCheckbox = document.getElementById('buttonTypeBLF');
        
        if (speedDialCheckbox) {
            speedDialCheckbox.addEventListener('change', () => {
                if (speedDialCheckbox.checked && blfCheckbox) {
                    blfCheckbox.checked = false;
                }
            });
        }
        
        if (blfCheckbox) {
            blfCheckbox.addEventListener('change', () => {
                if (blfCheckbox.checked && speedDialCheckbox) {
                    speedDialCheckbox.checked = false;
                }
            });
        }

        // Enter key to save
        const modal = document.getElementById('blfModal');
        if (modal) {
            modal.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.saveBlfButtonConfig();
                }
            });
        }
    }

    saveBlfButtonConfig() {
        const displayName = document.getElementById('blfDisplayName')?.value?.trim();
        const number = document.getElementById('blfNumber')?.value?.trim();
        const enabled = document.getElementById('blfButtonEnabled')?.checked;
        
        // Get all checked button types
        const checkedTypes = [];
        const speedDialCheckbox = document.getElementById('buttonTypeSpeedDial');
        const blfCheckbox = document.getElementById('buttonTypeBLF');
        
        if (speedDialCheckbox?.checked) checkedTypes.push('speeddial');
        if (blfCheckbox?.checked) checkedTypes.push('blf');
        
        // Use the first checked type, or default to speeddial
        const buttonType = checkedTypes.length > 0 ? checkedTypes[0] : 'speeddial';

        if (!displayName && !number) {
            const t = window.languageManager?.t || ((key, def) => def);
            this.showToast(t('please_enter_display_name_or_number', 'Please enter a display name or number'), 'warning');
            return;
        }

        // Save button configuration
        if (this.currentEditingIndex >= 0) {
            this.blfButtons[this.currentEditingIndex] = {
                displayName: displayName,
                number: number,
                enabled: enabled,
                type: buttonType
            };
            
            // Handle subscription changes
            const oldButtonData = this.blfButtons[this.currentEditingIndex];
            
            // Unsubscribe from old extension if it was BLF type
            if (oldButtonData && oldButtonData.type === 'blf' && oldButtonData.number && 
                (oldButtonData.number !== number || buttonType !== 'blf')) {
                this.unsubscribeFromBlfButton(oldButtonData.number);
            }
            
            // Subscribe to new extension if it's BLF type
            if (buttonType === 'blf' && number && 
                window.App && window.App.managers && window.App.managers.sip && 
                window.App.managers.sip.userAgent && window.App.managers.sip.userAgent.isRegistered()) {
                this.subscribeToBlfButton(number, displayName || `Button ${this.currentEditingIndex + 1}`);
            }
            
            this.isDirty = true;
            this.saveBlfButtons();
            this.renderBlfButtons();
            
            this.showToast('BLF button saved successfully', 'success');
            this.hideBlfModal();
        }
    }

    clearBlfButtonConfig() {
        if (this.currentEditingIndex >= 0) {
            // Remove button configuration
            delete this.blfButtons[this.currentEditingIndex];
            
            this.isDirty = true;
            this.saveBlfButtons();
            this.renderBlfButtons();
            
            this.showToast('BLF button cleared', 'info');
            this.hideBlfModal();
        }
    }

    showToast(message, type = 'info') {
        // Use existing toast system if available
        if (window.ShowToast) {
            window.ShowToast(message, type);
        } else {
            console.log(`📢 ${type.toUpperCase()}: ${message}`);
        }
    }

    isBlfEnabled() {
        if (window.localDB) {
            // Check both possible values for backward compatibility
            const enabled = window.localDB.getItem('BlfEnabled', '0');
            return enabled === '1' || enabled === 'true';
        }
        return false;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Transfer preference utilities
    getTransferPreference() {
        if (window.localDB) {
            return window.localDB.getItem('PreferBlindTransfer', '0') === '1';
        }
        return false; // Default to attended transfer
    }

    setTransferPreference(preferBlind) {
        if (window.localDB) {
            window.localDB.setItem('PreferBlindTransfer', preferBlind ? '1' : '0');
            console.log('📞 Transfer preference updated:', preferBlind ? 'Blind' : 'Attended');
        }
    }

    // Public API methods
    refresh() {
        this.loadBlfButtons();
        this.renderBlfButtons();
    }

    updatePresence(number, state) {
        // Find buttons with matching number
        const buttons = document.querySelectorAll('.blf-button');
        buttons.forEach(button => {
            const index = parseInt(button.dataset.index);
            const buttonData = this.blfButtons[index];
            if (buttonData && buttonData.number === number) {
                // Remove existing state classes
                button.classList.remove('blf-idle', 'blf-busy', 'blf-ringing', 'blf-unavailable');
                // Add new state class
                button.classList.add(`blf-${state}`);
                console.log(`📱 Updated BLF button ${index + 1} (${number}) to state: ${state}`);
            }
        });
    }

    // BLF Subscription Management
    subscribeToAllBlfButtons() {
        if (!this.isBlfEnabled()) {
            console.log('📱 BLF not enabled, skipping subscriptions');
            return;
        }

        if (!window.App || !window.App.managers || !window.App.managers.sip) {
            console.warn('⚠️ SIP manager not available, delaying BLF subscriptions');
            // Retry in 2 seconds if SIP manager isn't ready yet
            setTimeout(() => this.subscribeToAllBlfButtons(), 2000);
            return;
        }

        if (!window.App.managers.sip.isRegistered || !window.App.managers.sip.isRegistered()) {
            console.warn('⚠️ SIP not registered yet, skipping BLF subscriptions');
            return;
        }

        const blfButtons = this.blfButtons.filter(buttonData => 
            buttonData && buttonData.type === 'blf' && buttonData.number && buttonData.enabled !== false
        );

        console.log(`📱 Setting up BLF subscriptions for ${blfButtons.length} configured buttons`);
        
        // Clear failed subscriptions list for fresh attempt
        this.failedSubscriptions.clear();
        
        blfButtons.forEach((buttonData, index) => {
            const originalIndex = this.blfButtons.indexOf(buttonData);
            setTimeout(() => {
                this.subscribeToBlfButton(buttonData.number, buttonData.displayName || `Button ${originalIndex + 1}`);
            }, index * 100); // Stagger subscriptions by 100ms to avoid overwhelming the server
        });
        
        // Start periodic retry timer for failed subscriptions
        this.startRetryTimer();
    }

    subscribeToBlfButton(extension, displayName) {
        if (!window.App || !window.App.managers || !window.App.managers.sip) {
            console.warn('⚠️ SIP manager not available for BLF subscription');
            this.failedSubscriptions.add(extension);
            return false;
        }

        if (!window.App.managers.sip.isRegistered || !window.App.managers.sip.isRegistered()) {
            console.warn(`⚠️ Cannot subscribe to BLF for ${extension} - SIP not registered`);
            this.failedSubscriptions.add(extension);
            return false;
        }

        try {
            console.log(`📱 Subscribing to BLF for extension ${extension} (${displayName})`);
            const result = window.App.managers.sip.subscribeBLF(extension, displayName);
            
            if (result) {
                console.log(`✅ BLF subscription initiated for extension ${extension}`);
                // Remove from failed list if it was there
                this.failedSubscriptions.delete(extension);
                return true;
            } else {
                console.warn(`⚠️ BLF subscription returned null for extension ${extension}`);
                this.failedSubscriptions.add(extension);
                return false;
            }
        } catch (error) {
            console.error(`❌ Failed to subscribe to BLF for extension ${extension}:`, error);
            this.failedSubscriptions.add(extension);
            return false;
        }
    }

    unsubscribeFromBlfButton(extension) {
        if (!window.App || !window.App.managers || !window.App.managers.sip) {
            return;
        }

        try {
            console.log(`📱 Unsubscribing from BLF for extension ${extension}`);
            window.App.managers.sip.unsubscribeBLF(extension);
        } catch (error) {
            console.error(`❌ Failed to unsubscribe from BLF for extension ${extension}:`, error);
        }
    }

    unsubscribeFromAllBlfButtons() {
        if (!window.App || !window.App.managers || !window.App.managers.sip) {
            return;
        }

        console.log('📱 Unsubscribing from all BLF subscriptions');
        
        // Stop retry timer
        this.stopRetryTimer();
        
        // Clear failed subscriptions list
        this.failedSubscriptions.clear();
        
        this.blfButtons.forEach((buttonData) => {
            if (buttonData && buttonData.type === 'blf' && buttonData.number) {
                this.unsubscribeFromBlfButton(buttonData.number);
            }
        });
    }

    // Force re-subscription to all BLF buttons (useful for recovery)
    resubscribeToAllBlfButtons() {
        console.log('🔄 Force re-subscribing to all BLF buttons');
        this.unsubscribeFromAllBlfButtons();
        // Wait a bit for unsubscriptions to complete, then resubscribe
        setTimeout(() => {
            this.subscribeToAllBlfButtons();
        }, 1000);
    }
    
    // Start periodic retry timer for failed BLF subscriptions
    startRetryTimer() {
        // Clear any existing timer
        this.stopRetryTimer();
        
        // Only start timer if we have failed subscriptions or might get them
        this.retryTimer = setInterval(() => {
            this.retryFailedSubscriptions();
        }, this.retryInterval);
        
        console.log(`⏰ BLF retry timer started (${this.retryInterval / 1000}s interval)`);
    }
    
    // Stop periodic retry timer
    stopRetryTimer() {
        if (this.retryTimer) {
            clearInterval(this.retryTimer);
            this.retryTimer = null;
            console.log('⏰ BLF retry timer stopped');
        }
    }
    
    // Retry subscriptions for failed BLF buttons
    retryFailedSubscriptions() {
        if (this.failedSubscriptions.size === 0) {
            return;
        }
        
        // Check if we're still registered
        if (!window.App?.managers?.sip?.isRegistered?.()) {
            console.log('⚠️ Not registered, skipping BLF retry');
            return;
        }
        
        console.log(`🔄 Retrying ${this.failedSubscriptions.size} failed BLF subscription(s)`);
        
        // Create array from Set to iterate (avoid modifying during iteration)
        const extensionsToRetry = Array.from(this.failedSubscriptions);
        
        extensionsToRetry.forEach((extension, index) => {
            // Find button data for this extension
            const buttonData = this.blfButtons.find(btn => 
                btn && btn.type === 'blf' && btn.number === extension && btn.enabled !== false
            );
            
            if (buttonData) {
                // Stagger retries to avoid overwhelming server
                setTimeout(() => {
                    const displayName = buttonData.displayName || extension;
                    const success = this.subscribeToBlfButton(extension, displayName);
                    if (success) {
                        console.log(`✅ Retry successful for extension ${extension}`);
                    }
                }, index * 100);
            } else {
                // Button no longer configured, remove from failed list
                this.failedSubscriptions.delete(extension);
            }
        });
        
        // Log status after retry attempt
        setTimeout(() => {
            if (this.failedSubscriptions.size > 0) {
                console.log(`⚠️ Still have ${this.failedSubscriptions.size} failed BLF subscription(s), will retry in ${this.retryInterval / 1000}s`);
            } else {
                console.log('✅ All BLF subscriptions successful');
            }
        }, extensionsToRetry.length * 100 + 500);
    }

    handleBlfStateChange(data) {
        const { extension, state, remoteTarget } = data;
        console.log(`📱 BLF state changed for ${extension}: ${state}`, data);
        
        // Debug: Check if BLF manager is properly initialized
        console.log(`📱 BLF Manager has ${this.blfButtons.length} configured buttons:`);
        this.blfButtons.forEach((buttonData, i) => {
            console.log(`  Button ${i}: ${buttonData ? `${buttonData.number} (${buttonData.type})` : 'empty'}`);
        });
        
        // Find all buttons monitoring this extension and update their state
        const buttons = document.querySelectorAll('.blf-button');
        console.log(`📱 Found ${buttons.length} BLF buttons in DOM`);
        
        if (buttons.length === 0) {
            console.warn('⚠️ No BLF buttons found in DOM! Checking containers...');
            const leftContainer = document.getElementById('blf-left-dial');
            const rightContainer = document.getElementById('blf-right-dial');
            console.log('Left container:', leftContainer ? 'exists' : 'missing');
            console.log('Right container:', rightContainer ? 'exists' : 'missing');
        }
        
        let matchingButtonsFound = 0;
        
        buttons.forEach((button, buttonIndex) => {
            const index = parseInt(button.dataset.index);
            const buttonData = this.blfButtons[index];
            
            console.log(`📱 Button ${buttonIndex} (index ${index}): ${buttonData ? `${buttonData.number} (${buttonData.type})` : 'no data'} vs ${extension}`);
            
            if (buttonData && buttonData.number === extension) {
                matchingButtonsFound++;
                console.log(`📱 MATCH FOUND! Button ${index} for extension ${extension}`);
                
                if (buttonData.type === 'blf') {
                    console.log(`📱 Updating BLF button ${index + 1} for extension ${extension} - new state: ${state}`);
                    this.updateButtonStateWithPresence(button, buttonData, state, remoteTarget);
                    console.log(`📱 Button ${index + 1} updated - classes:`, button.className);
                } else {
                    console.log(`📱 Button ${index} matches extension but is type: ${buttonData.type}`);
                }
            }
        });
        
        if (matchingButtonsFound === 0) {
            console.warn(`⚠️ No buttons found monitoring extension ${extension}`);
        } else {
            console.log(`✅ Updated ${matchingButtonsFound} button(s) for extension ${extension}`);
        }
    }

    // Backward compatibility methods
    renderBlfButtons_old() {
        this.renderBlfButtons();
    }

    makeBlfButton() {
        console.warn('⚠️ makeBlfButton() is deprecated, use BLFButtonManager class methods');
    }
}

// Initialize BLF Button Manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Always initialize the manager (it will check if BLF is enabled internally)
    window.BLFManager = new BLFButtonManager();
    
    // Set up SIP integration when managers become available
    if (window.App && window.App.initialized) {
        // App is already ready, initialize now
        window.BLFManager.initializeSipIntegration();
    } else {
        // Wait for managers to be initialized, then set up SIP integration
        document.addEventListener('managersInitialized', () => {
            console.log('🔧 BLF Button Manager: Received managersInitialized event');
            window.BLFManager.initializeSipIntegration();
        });
    }
    console.log('📱 BLF Button Manager initialized');
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BLFButtonManager;
}