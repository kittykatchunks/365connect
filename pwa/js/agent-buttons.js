/* ====================================================================================== */
/* AUTOCAB365 PWA - AGENT BUTTONS MANAGER */
/* Handles agent login/logout, queue, pause operations */
/* ====================================================================================== */

class AgentButtonsManager {
    constructor() {
        this.isLoggedIn = false;
        this.isPaused = false;
        this.currentAgentNumber = null;
        this.currentAgentName = null;
        this.currentAgentPasscode = null;
        this.activeAgentSessions = new Map(); // Track agent operation sessions
        
        // Button states
        this.buttonStates = {
            login: 'idle', // idle, processing, connected
            queue: 'idle', // idle, processing
            pause: 'idle'  // idle, processing, active
        };
        
        // Agent codes
        this.agentCodes = {
            login: '*61',
            logout: '*61',
            queue: '*62',
            pause: '*63',
            unpause: '*63'
        };
        
        // Note: initialize() is called separately after construction
    }
    
    async initialize() {
        await this.restoreAgentState();
        this.setupEventListeners();
        this.createModalsIfNeeded();
        this.updateButtonStates();
        
        // Check initial registration state
        await this.checkInitialRegistrationState();
    }
    
    async checkInitialRegistrationState() {
        const sipManager = await this.waitForSipManager();
        
        if (sipManager && sipManager.isRegistered) {
            const isRegistered = sipManager.isRegistered();
            console.log(`[AgentButtons] Initial registration state: ${isRegistered}`);
            
            if (isRegistered) {
                this.onSipRegistered();
            } else {
                this.onSipUnregistered();
            }
        } else {
            // If we can't determine, disable buttons for safety
            console.log('[AgentButtons] Cannot determine registration state - disabling buttons');
            this.onSipUnregistered();
        }
    }
    
    async restoreAgentState() {
        // Check if there's a pending agent status from SIP registration
        if (window._pendingAgentStatus) {
            console.log('Found pending agent status from registration, applying it...');
            this.updateStateFromAPI(window._pendingAgentStatus);
            delete window._pendingAgentStatus;
            return;
        }
        
        // During initialization, just restore from localStorage
        // We'll check the API when user clicks Login button
        console.log('Restoring agent state from localStorage (API check deferred to login)');
        this.restoreFromLocalStorage();
    }

    async waitForSipManager(maxAttempts = 10, delayMs = 500) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            // Try multiple ways to get the SIP manager
            const sipManager = window.App?.managers?.sip || window.sipSessionManager || App?.managers?.sip;
            
            console.log(`Attempt ${attempt}/${maxAttempts} - SIP Manager Status:`, {
                windowApp: !!window.App,
                windowAppManagers: !!window.App?.managers,
                sipManager: !!sipManager,
                userAgent: !!sipManager?.userAgent,
                isRegistered: sipManager?.isRegistered?.(),
                userAgentState: sipManager?.userAgent?.state
            });
            
            // Check if we have a working SIP manager
            if (sipManager && sipManager.userAgent) {
                console.log(`✅ SIP Manager found on attempt ${attempt}`);
                return sipManager;
            }
            
            // Wait before next attempt (except on last attempt)
            if (attempt < maxAttempts) {
                console.log(`⏳ Waiting ${delayMs}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
        
        console.warn('⚠️ SIP Manager not available after all attempts - this is normal during startup');
        return null;
    }

    async waitForApiManager(maxAttempts = 5, delayMs = 500) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            // Try multiple ways to get the API manager
            const apiManager = window.App?.managers?.api || App?.managers?.api || window.phantomApiManager;
            
            console.log(`Attempt ${attempt}/${maxAttempts} - API Manager Status:`, {
                windowApp: !!window.App,
                windowAppManagers: !!window.App?.managers,
                windowAppApi: !!window.App?.managers?.api,
                globalAppApi: !!App?.managers?.api,
                windowPhantomApi: !!window.phantomApiManager,
                finalApiManager: !!apiManager,
                hasPostWithBasicAuth: typeof apiManager?.postWithBasicAuth === 'function',
                hasPostWithBasicAuthSimple: typeof apiManager?.postWithBasicAuthSimple === 'function',
                hasPostSimpleNoAuth: typeof apiManager?.postSimpleNoAuth === 'function'
            });
            
            // Check if we have a working API manager (test no-auth method first)
            if (apiManager && typeof apiManager.postSimpleNoAuth === 'function') {
                console.log(`✅ API Manager found on attempt ${attempt}`);
                return apiManager;
            }
            
            // Wait before next attempt (except on last attempt)
            if (attempt < maxAttempts) {
                console.log(`⏳ Waiting ${delayMs}ms before API retry...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
        
        console.error('❌ API Manager not available after all attempts');
        return null;
    }

    getCurrentDeviceExtension() {
        // Try to get device extension from SIP manager config
        if (window.App && window.App.managers && window.App.managers.sip) {
            const sipManager = window.App.managers.sip;
            if (sipManager.config && sipManager.config.username) {
                return sipManager.config.username;
            }
        }
        
        // Fallback to localStorage
        if (window.localDB) {
            const sipUsername = window.localDB.getItem('SipUsername');
            if (sipUsername && sipUsername !== 'null' && sipUsername !== 'undefined') {
                return sipUsername;
            }
        }
        
        return null;
    }

    async queryAgentStatusFromAPI(deviceExtension) {
        try {
            // Get API manager directly from the wait function result
            const apiManager = await this.waitForApiManager();
            
            if (!apiManager) {
                throw new Error('PhantomApiManager not available after waiting');
            }

            console.log(`Querying agent status from API for device: ${deviceExtension}`);

            // Make the API request with basic auth
            const requestData = {
                phone: deviceExtension
            };

            // Test with no auth first to see if CORS is the issue
            const result = await apiManager.postWithBasicAuthSimple(
                'AgentfromPhone',
                requestData
            );

            console.log('Agent status API response:', result);
            return result;
        } catch (error) {
            console.error('Error querying agent status from API:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async queryAgentStatusAfterLogin() {
        try {
            // Get current device extension
            const deviceExtension = this.getCurrentDeviceExtension();
            if (!deviceExtension) {
                console.warn('Device extension not available for post-login agent status check');
                return;
            }

            console.log('Querying agent status after login to get updated information...');
            
            // Query API for updated agent status
            const result = await this.queryAgentStatusFromAPI(deviceExtension);
            
            console.log('Agent status API response:', result);
            
            // API returns object with 'agent' property
            if (result && result.agent) {
                const agentData = result.agent;
                const num = agentData.num;
                const name = agentData.name;
                
                if (num !== null && num !== undefined && num !== '') {
                    console.log(`✅ Agent found - Name: ${name}, Num: ${num}`);
                    this.updateStateFromAPI(agentData);
                } else {
                    console.warn('Agent num is null or empty:', agentData);
                }
            } else {
                console.warn('No agent data returned from API');
            }
            
        } catch (error) {
            console.error('Error querying agent status after login:', error);
            // Don't throw - this is a non-critical check
        }
    }

    updateStateFromAPI(apiData) {
        // Update state based on API response
        if (apiData.num && apiData.num !== null && apiData.num !== '') {
            // Agent is logged in
            this.isLoggedIn = true;
            this.currentAgentNumber = apiData.num.toString();
            this.currentAgentName = apiData.name ? apiData.name.toString() : null;
            
            // Check pause status
            this.isPaused = apiData.pause === true || apiData.pause === 'true';
            
            // Update display with both number and name
            const displayStatus = this.isPaused ? 'paused' : 'logged-in';
            this.updateAgentStatusDisplay(displayStatus, this.currentAgentNumber, this.currentAgentName);
            
            // Save agent name in sessionStorage for display during session (cleared on app exit)
            if (this.currentAgentName) {
                try {
                    sessionStorage.setItem('cachedAgentName', this.currentAgentName);
                    console.log(`💾 Agent name cached in session: ${this.currentAgentName}`);
                } catch (e) {
                    console.warn('Failed to cache agent name in sessionStorage:', e);
                }
            }
            
            console.log(`Agent status updated from API - Agent: ${this.currentAgentNumber}${this.currentAgentName ? ' (' + this.currentAgentName + ')' : ''}, Paused: ${this.isPaused}`);
        } else {
            // Agent is not logged in
            this.isLoggedIn = false;
            this.isPaused = false;
            this.currentAgentNumber = null;
            this.currentAgentName = null;
            this.updateAgentStatusDisplay('logged-out');
            
            // Clear cached agent name from sessionStorage
            try {
                sessionStorage.removeItem('cachedAgentName');
            } catch (e) {
                console.warn('Failed to clear cached agent name:', e);
            }
            
            console.log('Agent status updated from API - Not logged in');
        }
        
        // Save to localStorage for fallback
        this.saveAgentState();
    }

    restoreFromLocalStorage() {
        // Fallback: Restore agent state from localStorage if API fails
        if (window.localDB) {
            const savedAgentNumber = window.localDB.getItem('currentAgentNumber');
            const savedLoginState = window.localDB.getItem('agentLoggedIn') === 'true';
            const savedPauseState = window.localDB.getItem('agentPaused') === 'true';
            
            if (savedAgentNumber) {
                this.currentAgentNumber = savedAgentNumber;
            }
            
            // Try to restore agent name from sessionStorage (if available during current session)
            try {
                const cachedAgentName = sessionStorage.getItem('cachedAgentName');
                if (cachedAgentName) {
                    this.currentAgentName = cachedAgentName;
                    console.log(`📖 Agent name restored from session cache: ${cachedAgentName}`);
                }
            } catch (e) {
                console.warn('Failed to restore cached agent name:', e);
            }
            
            if (savedLoginState) {
                this.isLoggedIn = true;
                this.updateAgentStatusDisplay(savedPauseState ? 'paused' : 'logged-in', this.currentAgentNumber, this.currentAgentName);
            }
            
            if (savedPauseState) {
                this.isPaused = true;
            }
            
            console.log('Agent state restored from localStorage (fallback)');
        }
    }
    
    saveAgentState() {
        // Persist agent state to localStorage
        // Note: Agent name is now stored in sessionStorage only (cleared on app exit)
        if (window.localDB) {
            if (this.currentAgentNumber) {
                window.localDB.setItem('currentAgentNumber', this.currentAgentNumber);
            } else {
                window.localDB.removeItem('currentAgentNumber');
            }
            
            if (this.currentAgentName) {
                window.localDB.setItem('currentAgentName', this.currentAgentName);
            } else {
                window.localDB.removeItem('currentAgentName');
            }
            
            window.localDB.setItem('agentLoggedIn', this.isLoggedIn.toString());
            window.localDB.setItem('agentPaused', this.isPaused.toString());
        }
    }
    
    setupEventListeners() {
        // Login button
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.handleLogin());
        }
        
        // Queue button
        const queueBtn = document.getElementById('queueBtn');
        if (queueBtn) {
            queueBtn.addEventListener('click', () => this.handleQueue());
        }
        
        // Pause button
        const pauseBtn = document.getElementById('pauseBtn');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.handlePause());
        }
        
        // Listen for SIP session events
        if (window.App && window.App.managers && window.App.managers.sip) {
            this.setupSipEventListeners();
        } else {
            // Wait for managers to be initialized
            document.addEventListener('managersInitialized', () => {
                this.setupSipEventListeners();
            });
        }
    }
    
    setupSipEventListeners() {
        const sipManager = window.App.managers.sip;
        
        // Listen for registration state changes
        sipManager.on('registered', () => {
            console.log('[AgentButtons] SIP registered - enabling agent buttons');
            this.onSipRegistered();
        });
        
        sipManager.on('unregistered', () => {
            console.log('[AgentButtons] SIP unregistered - disabling agent buttons');
            this.onSipUnregistered();
        });
        
        sipManager.on('registrationFailed', () => {
            console.log('[AgentButtons] SIP registration failed - disabling agent buttons');
            this.onSipUnregistered();
        });
        
        sipManager.on('sessionAnswered', (sessionData) => {
            if (this.activeAgentSessions.has(sessionData.id)) {
                const operation = this.activeAgentSessions.get(sessionData.id);
                this.handleAgentCallAnswered(operation, sessionData);
            }
        });
        
        sipManager.on('sessionTerminated', (sessionData) => {
            if (this.activeAgentSessions.has(sessionData.id)) {
                const operation = this.activeAgentSessions.get(sessionData.id);
                this.handleAgentCallCompleted(operation, sessionData);
                this.activeAgentSessions.delete(sessionData.id);
            }
        });
    }
    
    async onSipRegistered() {
        // Enable all agent buttons when registered
        this.setAgentButtonsEnabled(true);
        
        // Query API to check current agent status
        await this.checkAgentStatusAfterRegistration();
        
        // Update button states based on current login status
        this.updateButtonStates();
    }
    
    async checkAgentStatusAfterRegistration() {
        try {
            // Get current device extension
            const deviceExtension = this.getCurrentDeviceExtension();
            if (!deviceExtension) {
                console.warn('Device extension not available for agent status check');
                return;
            }

            console.log('Checking agent status after SIP registration...');
            
            // Query API for current agent status
            const result = await this.queryAgentStatusFromAPI(deviceExtension);
            
            console.log('Agent status after registration:', result);
            
            // API returns object with 'agent' property
            if (result && result.agent) {
                const agentData = result.agent;
                const num = agentData.num;
                const name = agentData.name;
                
                if (num !== null && num !== undefined && num !== '') {
                    // Agent is logged in
                    console.log(`✅ Agent already logged in - Name: ${name}, Num: ${num}`);
                    this.updateStateFromAPI(agentData);
                    this.updateButtonState('login', 'connected');
                    this.setAllButtonsEnabled(true);
                    this.updateButtonEnabledStates();
                } else {
                    // Agent is not logged in
                    console.log('Agent not logged in (num is null)');
                    this.isLoggedIn = false;
                    this.isPaused = false;
                    this.currentAgentNumber = null;
                    this.currentAgentName = null;
                    this.updateAgentStatusDisplay('logged-out');
                    this.updateButtonState('login', 'idle');
                    this.setAllButtonsEnabled(true);
                    this.updateButtonEnabledStates();
                }
            } else {
                console.warn('No agent data returned from API after registration');
                // Default to logged out if no data
                this.isLoggedIn = false;
                this.updateAgentStatusDisplay('logged-out');
                this.updateButtonState('login', 'idle');
            }
            
        } catch (error) {
            console.error('Error checking agent status after registration:', error);
            // Don't throw - just log the error and continue
        }
    }
    
    onSipUnregistered() {
        // Disable all agent buttons when not registered
        this.setAgentButtonsEnabled(false);
        
        // Keep buttons visually in their current state, just disabled
        this.updateButtonStates();
    }
    
    setAgentButtonsEnabled(enabled) {
        const loginBtn = document.getElementById('loginBtn');
        const queueBtn = document.getElementById('queueBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        
        if (loginBtn) {
            loginBtn.disabled = !enabled;
        }
        
        // Queue and Pause should only be enabled if registered AND logged in
        if (queueBtn) {
            queueBtn.disabled = !enabled || !this.isLoggedIn;
        }
        
        if (pauseBtn) {
            pauseBtn.disabled = !enabled || !this.isLoggedIn;
        }
    }
    
    createModalsIfNeeded() {
        // Create agent number modal if it doesn't exist
        if (!document.getElementById('agentNumberModal')) {
            this.createAgentNumberModal();
        }
        
        // Create DTMF input modal if it doesn't exist
        if (!document.getElementById('dtmfInputModal')) {
            this.createDtmfInputModal();
        }
    }
    
    createAgentNumberModal() {
        const modal = document.createElement('div');
        modal.id = 'agentNumberModal';
        modal.className = 'modal-overlay hidden';
        modal.innerHTML = `
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
        `;
        document.body.appendChild(modal);
        
        // Setup event listeners
        document.getElementById('confirmAgentBtn').addEventListener('click', () => this.confirmAgentNumber());
        document.getElementById('cancelAgentBtn').addEventListener('click', () => this.cancelAgentNumber());
        
        const agentNumberInput = document.getElementById('agentNumberInput');
        const passcodeInput = document.getElementById('agentPasscodeInput');
        
        // Handle Enter/Escape keys for agent number input
        agentNumberInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                // Move to passcode field if empty, otherwise confirm
                if (passcodeInput.value.trim() === '') {
                    passcodeInput.focus();
                } else {
                    this.confirmAgentNumber();
                }
            } else if (e.key === 'Escape') {
                this.cancelAgentNumber();
            }
        });
        
        // Handle Enter/Escape keys for passcode input
        passcodeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.confirmAgentNumber();
            } else if (e.key === 'Escape') {
                this.cancelAgentNumber();
            }
        });
        
        // Restrict passcode input to numeric characters only
        passcodeInput.addEventListener('input', (e) => {
            // Remove any non-numeric characters
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });
    }
    
    createDtmfInputModal() {
        const modal = document.createElement('div');
        modal.id = 'dtmfInputModal';
        modal.className = 'modal-overlay hidden';
        modal.innerHTML = `
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
        `;
        document.body.appendChild(modal);
        
        // Setup event listeners
        document.getElementById('dtmfSendBtn').addEventListener('click', () => this.sendDtmfCode());
        document.getElementById('dtmfCancelBtn').addEventListener('click', () => this.cancelDtmfInput());
        
        const input = document.getElementById('dtmfInput');
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.sendDtmfCode();
            } else if (e.key === 'Escape') {
                this.cancelDtmfInput();
            }
        });
    }
    
    async handleLogin() {
        if (this.isLoggedIn) {
            await this.performLogout();
        } else {
            // Show login modal directly without pre-checking
            this.showAgentNumberModal();
        }
    }
    
    showAgentNumberModal() {
        const modal = document.getElementById('agentNumberModal');
        const agentNumberInput = document.getElementById('agentNumberInput');
        const passcodeInput = document.getElementById('agentPasscodeInput');
        
        // Prefill with current agent number, or last entered agent number from localStorage
        let prefillNumber = this.currentAgentNumber;
        if (!prefillNumber && window.localDB) {
            prefillNumber = window.localDB.getItem('lastEnteredAgentNumber') || '';
        }
        agentNumberInput.value = prefillNumber;
        
        passcodeInput.value = ''; // Always clear passcode for security
        modal.classList.remove('hidden');
        
        setTimeout(() => agentNumberInput.focus(), 100);
    }
    
    hideAgentNumberModal() {
        const modal = document.getElementById('agentNumberModal');
        modal.classList.add('hidden');
    }
    
    confirmAgentNumber() {
        const agentNumberInput = document.getElementById('agentNumberInput');
        const passcodeInput = document.getElementById('agentPasscodeInput');
        const agentNumber = agentNumberInput.value.trim();
        const passcode = passcodeInput.value.trim();
        
        if (!agentNumber) {
            this.showNotification('error', 'Please enter an agent number');
            agentNumberInput.focus();
            return;
        }
        
        if (!/^\d+$/.test(agentNumber)) {
            this.showNotification('error', 'Agent number must contain only digits');
            agentNumberInput.focus();
            return;
        }
        
        // Validate passcode if entered (must be numeric)
        if (passcode && !/^\d+$/.test(passcode)) {
            this.showNotification('error', 'Passcode must contain only digits');
            passcodeInput.focus();
            return;
        }
        
        this.currentAgentNumber = agentNumber;
        this.currentAgentPasscode = passcode || null; // Store passcode if provided
        
        // Save last entered agent number for prefilling next time
        if (window.localDB) {
            window.localDB.setItem('lastEnteredAgentNumber', agentNumber);
        }
        
        this.hideAgentNumberModal();
        this.performLogin();
    }
    
    cancelAgentNumber() {
        this.hideAgentNumberModal();
        this.updateButtonState('login', 'idle');
    }
    
    async performLogin() {
        try {
            this.updateButtonState('login', 'processing');
            this.setAllButtonsEnabled(false);
            
            // Wait for SIP manager to be available with retry logic
            const sipManager = await this.waitForSipManager();
            
            if (!sipManager) {
                throw new Error('SIP manager not available after waiting - check SIP registration');
            }
            
            // Optional: Add a more lenient registration check with fallback
            if (sipManager.isRegistered && !sipManager.isRegistered()) {
                console.warn('SIP not registered, attempting call anyway...');
                // Don't throw error, just log warning and continue
            }
            
            const sessionData = await sipManager.createOutgoingSession(this.agentCodes.login, {
                type: 'agent-login',
                agentNumber: this.currentAgentNumber,
                hasPasscode: !!this.currentAgentPasscode
            });
            
            this.activeAgentSessions.set(sessionData.id, {
                type: 'login',
                dtmfToSend: this.currentAgentNumber + '#',
                passcode: this.currentAgentPasscode
            });
            
        } catch (error) {
            console.error('Login failed:', error);
            this.showNotification('error', 'Login failed: ' + error.message);
            this.updateButtonState('login', 'idle');
            this.setAllButtonsEnabled(true);
        }
    }
    
    async performLogout() {
        try {
            this.updateButtonState('login', 'processing');
            this.setAllButtonsEnabled(false);
            
            const sipManager = await this.waitForSipManager();
            if (!sipManager) {
                throw new Error('SIP manager not available');
            }
            
            const sessionData = await sipManager.createOutgoingSession(this.agentCodes.logout, {
                type: 'agent-logout'
            });
            
            this.activeAgentSessions.set(sessionData.id, {
                type: 'logout'
            });
            
        } catch (error) {
            console.error('Logout failed:', error);
            this.showNotification('error', 'Logout failed: ' + error.message);
            this.updateButtonState('login', 'connected');
            this.setAllButtonsEnabled(true);
        }
    }
    
    async handleQueue() {
        if (!this.isLoggedIn) {
            this.showNotification('warning', 'Please login first');
            return;
        }
        
        try {
            this.updateButtonState('queue', 'processing');
            
            const sipManager = await this.waitForSipManager();
            if (!sipManager) {
                throw new Error('SIP manager not available');
            }
            
            const sessionData = await sipManager.createOutgoingSession(this.agentCodes.queue, {
                type: 'agent-queue'
            });
            
            this.activeAgentSessions.set(sessionData.id, {
                type: 'queue'
            });
            
        } catch (error) {
            console.error('Queue operation failed:', error);
            this.showNotification('error', 'Queue operation failed: ' + error.message);
            this.updateButtonState('queue', 'idle');
        }
    }
    
    async handlePause() {
        if (!this.isLoggedIn) {
            this.showNotification('warning', 'Please login first');
            return;
        }
        
        if (this.isPaused) {
            await this.performUnpause();
        } else {
            await this.performPause();
        }
    }
    
    async performPause() {
        try {
            this.updateButtonState('pause', 'processing');
            this.setAllButtonsEnabled(false);
            
            const sipManager = await this.waitForSipManager();
            if (!sipManager) {
                throw new Error('SIP manager not available');
            }
            
            const sessionData = await sipManager.createOutgoingSession(this.agentCodes.pause, {
                type: 'agent-pause'
            });
            
            this.activeAgentSessions.set(sessionData.id, {
                type: 'pause',
                requiresDtmf: true
            });
            
        } catch (error) {
            console.error('Pause failed:', error);
            this.showNotification('error', 'Pause failed: ' + error.message);
            this.updateButtonState('pause', 'idle');
            this.setAllButtonsEnabled(true);
        }
    }
    
    async performUnpause() {
        try {
            this.updateButtonState('pause', 'processing');
            this.setAllButtonsEnabled(false);
            
            const sipManager = await this.waitForSipManager();
            if (!sipManager) {
                throw new Error('SIP manager not available');
            }
            
            const sessionData = await sipManager.createOutgoingSession(this.agentCodes.unpause, {
                type: 'agent-unpause'
            });
            
            this.activeAgentSessions.set(sessionData.id, {
                type: 'unpause'
            });
            
        } catch (error) {
            console.error('Unpause failed:', error);
            this.showNotification('error', 'Unpause failed: ' + error.message);
            this.updateButtonState('pause', 'active');
            this.setAllButtonsEnabled(true);
        }
    }
    
    handleAgentCallAnswered(operation, sessionData) {
        if (operation.dtmfToSend) {
            // Send DTMF sequence (includes built-in initial delay)
            (async () => {
                try {
                    const sipManager = await this.waitForSipManager();
                    if (!sipManager) {
                        console.error('SIP manager not available for DTMF');
                        return;
                    }
                    
                    // Send the main DTMF sequence (includes 500ms initial delay + proper timing)
                    await sipManager.sendDTMFSequence(sessionData.id, operation.dtmfToSend);
                    console.log(`Sent DTMF sequence for ${operation.type}: ${operation.dtmfToSend}`);
                    
                    // If there's a passcode, send it after a brief pause
                    if (operation.passcode) {
                        // Wait a bit for the system to process the login sequence
                        setTimeout(async () => {
                            try {
                                // Send passcode with shorter initial delay since call is already established
                                await sipManager.sendDTMFSequence(sessionData.id, operation.passcode + '#', 150, 200, 200);
                                console.log(`Sent passcode DTMF sequence: ${operation.passcode}#`);
                            } catch (error) {
                                console.error('Failed to send passcode DTMF:', error);
                            }
                        }, 800); // 800ms after the first DTMF sequence completes
                    }
                } catch (error) {
                    console.error('Failed to send DTMF:', error);
                }
            })();
        }
        
        if (operation.requiresDtmf) {
            // Show DTMF input modal for pause code
            this.showDtmfInputModal(sessionData.id);
        }
    }
    
    handleAgentCallCompleted(operation, sessionData) {
        switch (operation.type) {
            case 'login':
                this.isLoggedIn = true;
                this.updateButtonState('login', 'connected');
                this.setAllButtonsEnabled(true);
                // Now that logged in, enable Queue and Pause
                this.updateButtonEnabledStates();
                this.updateAgentStatusDisplay('logged-in', this.currentAgentNumber, this.currentAgentName);
                this.saveAgentState();
                this.showNotification('success', 'Successfully logged in as agent ' + this.currentAgentNumber);
                
                // Notify busylight of agent login
                if (window.App?.managers?.busylight) {
                    window.App.managers.busylight.onAgentLoggedIn();
                }
                
                // Query API to get updated agent information after login
                this.queryAgentStatusAfterLogin();
                break;
                
            case 'logout':
                this.isLoggedIn = false;
                this.isPaused = false;
                this.currentAgentNumber = null;
                this.currentAgentName = null;
                this.currentAgentPasscode = null; // Clear passcode for security
                this.updateButtonState('login', 'idle');
                this.updateButtonState('pause', 'idle');
                this.updateAgentStatusDisplay('logged-out');
                this.saveAgentState();
                this.setAllButtonsEnabled(true);
                // After logout, disable Queue and Pause
                this.updateButtonEnabledStates();
                this.showNotification('success', 'Successfully logged out');
                
                // Unsubscribe from all BLF buttons on agent logout
                if (window.BLFManager) {
                    console.log('🔌 Unsubscribing from all BLF buttons on agent logout');
                    window.BLFManager.unsubscribeFromAllBlfButtons();
                }
                
                // Reset voicemail indicator on agent logout
                if (window.updateVoicemailMWI) {
                    console.log('📧 Resetting voicemail indicator on agent logout');
                    window.updateVoicemailMWI({ newVoiceMessages: 0, messagesWaiting: false });
                }
                
                // Notify busylight of agent logout
                if (window.App?.managers?.busylight) {
                    window.App.managers.busylight.onAgentLoggedOut();
                }
                break;
                
            case 'queue':
                this.updateButtonState('queue', 'idle');
                this.showNotification('info', 'Queue operation completed');
                break;
                
            case 'pause':
                this.isPaused = true;
                this.updateButtonState('pause', 'active');
                this.updateAgentStatusDisplay('paused', this.currentAgentNumber, this.currentAgentName);
                this.saveAgentState();
                this.setAllButtonsEnabled(true);
                this.updateButtonEnabledStates();
                this.hideDtmfInputModal();
                this.showNotification('success', 'Agent paused');
                break;
                
            case 'unpause':
                this.isPaused = false;
                this.updateButtonState('pause', 'idle');
                this.updateAgentStatusDisplay('logged-in', this.currentAgentNumber, this.currentAgentName);
                this.saveAgentState();
                this.setAllButtonsEnabled(true);
                this.updateButtonEnabledStates();
                this.showNotification('success', 'Agent unpaused');
                break;
        }
    }
    
    showDtmfInputModal(sessionId) {
        const modal = document.getElementById('dtmfInputModal');
        const input = document.getElementById('dtmfInput');
        
        input.value = '';
        modal.classList.remove('hidden');
        modal.dataset.sessionId = sessionId;
        
        setTimeout(() => input.focus(), 100);
    }
    
    hideDtmfInputModal() {
        const modal = document.getElementById('dtmfInputModal');
        modal.classList.add('hidden');
        delete modal.dataset.sessionId;
    }
    
    async sendDtmfCode() {
        const modal = document.getElementById('dtmfInputModal');
        const input = document.getElementById('dtmfInput');
        const sessionId = modal.dataset.sessionId;
        const dtmfCode = input.value.trim();
        
        if (!dtmfCode) {
            this.showNotification('warning', 'Please enter a pause code');
            input.focus();
            return;
        }
        
        try {
            const sipManager = await this.waitForSipManager();
            if (!sipManager) {
                throw new Error('SIP manager not available');
            }
            
            await sipManager.sendDTMFSequence(sessionId, dtmfCode);
            console.log(`Sent pause DTMF sequence: ${dtmfCode}`);
            this.hideDtmfInputModal();
        } catch (error) {
            console.error('Failed to send DTMF:', error);
            
            // Don't show error if session was terminated (common for *63 calls)
            // The DTMF was likely sent successfully before the call ended
            if (!error.message || !error.message.includes('Session not found')) {
                this.showNotification('error', 'Failed to send pause code');
            } else {
                console.log('Session ended during DTMF sequence - this is normal for feature codes');
                this.hideDtmfInputModal();
            }
        }
    }
    
    cancelDtmfInput() {
        const modal = document.getElementById('dtmfInputModal');
        const sessionId = modal.dataset.sessionId;
        
        this.hideDtmfInputModal();
        
        // Terminate the session
        if (sessionId) {
            const sipManager = window.App.managers.sip;
            sipManager.terminateSession(sessionId);
        }
        
        // Reset pause button state
        this.updateButtonState('pause', 'idle');
        this.setAllButtonsEnabled(true);
    }
    
    updateButtonState(buttonType, state) {
        this.buttonStates[buttonType] = state;
        
        const buttonMap = {
            'login': 'loginBtn',
            'queue': 'queueBtn',
            'pause': 'pauseBtn'
        };
        
        const button = document.getElementById(buttonMap[buttonType]);
        if (!button) return;
        
        // Remove all state classes while preserving base classes
        button.className = button.className.replace(/\b(login|queue|pause)-(idle|processing|connected|active|logged-in|joined|paused)\b/g, '');
        
        // Add new state class - map to CSS naming convention
        const cssStateMap = {
            'connected': 'logged-in',  // login-connected -> login-logged-in
            'active': 'paused'         // pause-active -> pause-paused  
        };
        const cssState = cssStateMap[state] || state;
        button.classList.add(`${buttonType}-${cssState}`);
        
        // Update button text and state
        switch (buttonType) {
            case 'login':
                switch (state) {
                    case 'idle':
                        button.textContent = t('login', 'Login');
                        button.disabled = false;
                        break;
                    case 'processing':
                        button.textContent = this.isLoggedIn ? t('logging_out', 'Logging Out...') : t('logging_in', 'Logging In...');
                        button.disabled = true;
                        break;
                    case 'connected':
                        button.textContent = t('logout', 'Logout');
                        button.disabled = false;
                        break;
                }
                break;
                
            case 'queue':
                switch (state) {
                    case 'idle':
                        button.textContent = t('queue', 'Queue');
                        button.disabled = false;
                        break;
                    case 'processing':
                        button.textContent = t('processing', 'Processing...');
                        button.disabled = true;
                        break;
                }
                break;
                
            case 'pause':
                switch (state) {
                    case 'idle':
                        button.textContent = t('pause', 'Pause');
                        button.disabled = false;
                        break;
                    case 'processing':
                        button.textContent = this.isPaused ? 'Unpausing...' : 'Pausing...';
                        button.disabled = true;
                        break;
                    case 'active':
                        button.textContent = t('unpause', 'Unpause');
                        button.disabled = false;
                        break;
                }
                break;
        }
    }
    
    updateButtonStates() {
        this.updateButtonState('login', this.isLoggedIn ? 'connected' : 'idle');
        this.updateButtonState('queue', 'idle');
        this.updateButtonState('pause', this.isPaused ? 'active' : 'idle');
        
        // Update enabled/disabled state based on registration and login
        this.updateButtonEnabledStates();
    }
    
    async updateButtonEnabledStates() {
        const sipManager = await this.waitForSipManager();
        const isRegistered = sipManager && sipManager.isRegistered ? sipManager.isRegistered() : false;
        
        const loginBtn = document.getElementById('loginBtn');
        const queueBtn = document.getElementById('queueBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        
        // Login button: only enabled if registered
        if (loginBtn && !loginBtn.disabled) {
            loginBtn.disabled = !isRegistered;
        }
        
        // Queue and Pause buttons: only enabled if registered AND logged in
        if (queueBtn) {
            queueBtn.disabled = !isRegistered || !this.isLoggedIn;
        }
        
        if (pauseBtn) {
            pauseBtn.disabled = !isRegistered || !this.isLoggedIn;
        }
    }
    
    setAllButtonsEnabled(enabled) {
        const buttons = document.querySelectorAll('.sip-button, .agent-button');
        buttons.forEach(btn => {
            if (!btn.classList.contains('always-enabled')) {
                btn.disabled = !enabled;
            }
        });
    }
    
    updateAgentStatusDisplay(status, agentNumber = null, agentName = null) {
        const agentStatusElement = document.getElementById('agentStatus');
        if (!agentStatusElement) return;
        
        // Remove existing status classes
        agentStatusElement.className = agentStatusElement.className.replace(/\bagent-\w+\b/g, '');
        
        // Build agent display text with format: num - name
        let agentDisplayText = '';
        if (agentName && agentNumber) {
            agentDisplayText = `${agentNumber} - ${agentName}`;
        } else if (agentNumber) {
            agentDisplayText = agentNumber;
        } else if (agentName) {
            agentDisplayText = agentName;
        }
        
        switch (status) {
            case 'logged-in':
                agentStatusElement.textContent = agentDisplayText || 'Logged In';
                agentStatusElement.classList.add('agent-logged-in');
                break;
            case 'paused':
                agentStatusElement.textContent = agentDisplayText ? `${agentDisplayText} (Paused)` : 'Paused';
                agentStatusElement.classList.add('agent-paused');
                break;
            case 'logged-out':
            default:
                agentStatusElement.textContent = t('logged_out', 'Logged Out');
                agentStatusElement.classList.add('agent-logged-out');
                break;
        }
    }
    
    showNotification(type, message) {
        if (window.App && window.App.managers && window.App.managers.ui) {
            window.App.managers.ui.addNotification({
                type: type,
                title: type.charAt(0).toUpperCase() + type.slice(1),
                message: message,
                duration: 3000
            });
        } else {
            // Fallback to console
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
    
    // Refresh agent status from API
    async refreshAgentStatus() {
        console.log('Refreshing agent status from API...');
        await this.restoreAgentState();
        this.updateButtonStates();
        return this.getStatus();
    }

    // Public API
    getStatus() {
        return {
            isLoggedIn: this.isLoggedIn,
            isPaused: this.isPaused,
            currentAgentNumber: this.currentAgentNumber,
            currentAgentName: this.currentAgentName,
            hasPasscode: !!this.currentAgentPasscode, // Boolean flag only for security
            buttonStates: { ...this.buttonStates }
        };
    }
    
    destroy() {
        // Cleanup active sessions
        this.activeAgentSessions.clear();
        
        // Remove event listeners
        const buttons = ['loginBtn', 'queueBtn', 'pauseBtn'];
        buttons.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.replaceWith(btn.cloneNode(true));
            }
        });
        
        // Remove modals
        const modals = ['agentNumberModal', 'dtmfInputModal'];
        modals.forEach(id => {
            const modal = document.getElementById(id);
            if (modal) {
                modal.remove();
            }
        });
    }
}

// Create global instance
let agentButtonsManager = null;

// Initialize when managers are ready
document.addEventListener('managersInitialized', async () => {
    console.log('Managers initialized, creating AgentButtonsManager...');
    agentButtonsManager = new AgentButtonsManager();
    
    // Initialize asynchronously with retry logic
    try {
        await agentButtonsManager.initialize();
        console.log('✓ Agent Buttons Manager initialized');
    } catch (error) {
        console.warn('AgentButtonsManager initialization failed, will retry when SIP is ready:', error.message);
        
        // Retry when SIP becomes available
        const retryInit = async () => {
            try {
                await agentButtonsManager.initialize();
                console.log('✓ Agent Buttons Manager initialized on retry');
            } catch (retryError) {
                console.warn('AgentButtonsManager retry failed:', retryError.message);
            }
        };
        
        // Listen for SIP registration events to retry
        document.addEventListener('sipRegistered', retryInit, { once: true });
        
        // Also try again after a delay
        setTimeout(retryInit, 2000);
    }
    
    // Add to App managers for consistency
    if (window.App && window.App.managers) {
        window.App.managers.agent = agentButtonsManager;
    }
    
    // Expose globally for debugging
    window.agentButtonsManager = agentButtonsManager;
});

// Fallback initialization if event doesn't fire
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(async () => {
        if (!agentButtonsManager && window.App?.initialized) {
            console.log('Fallback: Creating AgentButtonsManager...');
            agentButtonsManager = new AgentButtonsManager();
            
            // Initialize asynchronously
            try {
                await agentButtonsManager.initialize();
                console.log('✓ Agent Buttons Manager initialized (fallback)');
            } catch (error) {
                console.error('Failed to initialize AgentButtonsManager (fallback):', error);
            }
            
            // Add to App managers for consistency
            if (window.App && window.App.managers) {
                window.App.managers.agent = agentButtonsManager;
            }
            
            window.agentButtonsManager = agentButtonsManager;
        }
    }, 2000);
});

// Backward compatibility functions
window.handleLogin = () => agentButtonsManager?.handleLogin();
window.handleQueue = () => agentButtonsManager?.handleQueue();
window.handlePause = () => agentButtonsManager?.handlePause();

// Debug functions for console access
window.debugAgentStatus = async function() {
    if (agentButtonsManager) {
        console.log('🔍 Current agent status:', agentButtonsManager.getStatus());
        console.log('📱 Current device extension:', agentButtonsManager.getCurrentDeviceExtension());
        
        try {
            const refreshedStatus = await agentButtonsManager.refreshAgentStatus();
            console.log('🔄 Refreshed agent status:', refreshedStatus);
        } catch (error) {
            console.error('❌ Failed to refresh agent status:', error);
        }
    } else {
        console.log('❌ Agent buttons manager not initialized');
    }
};

window.testAgentAPI = async function(deviceExtension) {
    if (agentButtonsManager) {
        const extension = deviceExtension || agentButtonsManager.getCurrentDeviceExtension();
        if (extension) {
            console.log(`🧪 Testing agent API for extension: ${extension}`);
            const result = await agentButtonsManager.queryAgentStatusFromAPI(extension);
            console.log('📊 API Test Result:', result);
            return result;
        } else {
            console.log('❌ No device extension available for testing');
        }
    } else {
        console.log('❌ Agent buttons manager not initialized');
    }
};

window.debugSipRegistration = function() {
    // Try multiple ways to get the SIP manager
    const sipManager = window.App?.managers?.sip || window.sipSessionManager || App?.managers?.sip;
    
    console.group('🔍 SIP Registration Debug');
    console.log('Window.App exists:', !!window.App);
    console.log('Window.App.managers exists:', !!window.App?.managers);
    console.log('SIP Manager (App.managers.sip):', !!window.App?.managers?.sip);
    console.log('SIP Manager (window.sipSessionManager):', !!window.sipSessionManager);
    console.log('SIP Manager (global App):', !!App?.managers?.sip);
    console.log('Final SIP Manager exists:', !!sipManager);
    
    if (sipManager) {
        console.log('UserAgent exists:', !!sipManager.userAgent);
        console.log('UserAgent state:', sipManager.userAgent?.state);
        console.log('IsRegistered method exists:', typeof sipManager.isRegistered === 'function');
        console.log('IsRegistered result:', sipManager.isRegistered?.());
        console.log('UserAgent isRegistered:', sipManager.userAgent?.isRegistered?.());
        console.log('Config username:', sipManager.config?.username);
    } else {
        console.log('❌ No SIP Manager found via any method');
    }
    console.groupEnd();
    
    return {
        windowApp: !!window.App,
        windowAppManagers: !!window.App?.managers,
        appManagersSip: !!window.App?.managers?.sip,
        windowSipSessionManager: !!window.sipSessionManager,
        globalAppSip: !!App?.managers?.sip,
        finalSipManager: !!sipManager,
        userAgent: !!sipManager?.userAgent,
        userAgentState: sipManager?.userAgent?.state,
        isRegistered: sipManager?.isRegistered?.(),
        userAgentRegistered: sipManager?.userAgent?.isRegistered?.()
    };
};

// Export for use in other files
window.AgentButtonsManager = AgentButtonsManager;

console.log('✓ Agent Buttons Manager loaded');