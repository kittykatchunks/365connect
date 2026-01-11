/**
 * Busylight Manager v2 - Simplified for 3-Line PWA
 * 
 * Manages Plenom Kuando Busylight devices via HTTP API proxy
 * Supports primary (global) and secondary (line-specific) state rules
 */

class BusylightManager {
    constructor() {
        // Core settings
        this.enabled = false;
        this.connected = false;
        this.bridgeUrl = '/api/busylight';
        
        // State tracking
        this.currentState = 'DISCONNECTED';
        // Load voicemail state from localStorage
        this.hasVoicemail = this.getVoicemailState();
        
        // Connection monitoring
        this.monitoringInterval = null;
        this.monitoringIntervalMs = 15000; // 15 seconds
        this.retryAttempts = 0;
        this.maxRetryAttempts = 5;
        
        // Flashing control for IDLENOTIFY slow flash
        this.slowFlashInterval = null;
        this.isSlowFlashing = false;
        
        // Alert settings from PWA settings
        this.alertNumber = 3; // 1-7 (default: Funky)
        this.alertVolume = 50; // 0/25/50/75/100
        
        // State definitions with colors
        this.stateConfig = {
            'DISCONNECTED': { color: null, flash: false, alert: false },                     // OFF
            'CONNECTED': { color: { red: 100, green: 100, blue: 100 }, flash: false, alert: false },  // White
            'IDLE': { color: { red: 0, green: 100, blue: 0 }, flash: false, alert: false },           // Green
            'IDLENOTIFY': { color: { red: 0, green: 100, blue: 0 }, flash: 'slow', alert: false },    // Green Slow Flash
            'BUSY': { color: { red: 100, green: 0, blue: 0 }, flash: false, alert: false },           // Red
            'RINGING': { color: { red: 100, green: 0, blue: 0 }, flash: false, alert: true },         // Red Alert
            'RINGWAITING': { color: { red: 100, green: 0, blue: 0 }, flash: false, alert: 'silent' }, // Red Alert (silent)
            'HOLD': { color: { red: 100, green: 100, blue: 0 }, flash: false, alert: false }          // Yellow
        };
        
        // Load settings
        this.loadSettings();
    }

    /**
     * Get voicemail notification state from localStorage
     */
    getVoicemailState() {
        if (!window.localDB) return false;
        return window.localDB.getItem('activeVmNotify', '0') === '1';
    }

    /**
     * Set voicemail notification state in localStorage
     */
    setVoicemailState(hasVoicemail) {
        if (!window.localDB) return;
        window.localDB.setItem('activeVmNotify', hasVoicemail ? '1' : '0');
    }

    /**
     * Load settings from localStorage
     */
    loadSettings() {
        if (!window.localDB) {
            console.warn('[Busylight] localDB not available, using defaults');
            return;
        }
        
        this.enabled = (window.localDB.getItem("BusylightEnabled", "0") === "1");
        this.alertNumber = parseInt(window.localDB.getItem("BusylightRingSound", "3"), 10);
        this.alertVolume = parseInt(window.localDB.getItem("BusylightRingVolume", "50"), 10);
        
        console.log('[Busylight] Settings loaded:', {
            enabled: this.enabled,
            alertNumber: this.alertNumber,
            alertVolume: this.alertVolume
        });
    }

    /**
     * Save settings to localStorage
     */
    saveSettings() {
        if (!window.localDB) return;
        
        window.localDB.setItem("BusylightEnabled", this.enabled ? "1" : "0");
        window.localDB.setItem("BusylightRingSound", this.alertNumber.toString());
        window.localDB.setItem("BusylightRingVolume", this.alertVolume.toString());
    }

    /**
     * Initialize Busylight Manager
     */
    async initialize() {
        console.log('[Busylight] Initializing...');
        
        // Setup event listeners regardless of enabled state
        this.setupEventListeners();
        
        if (!this.enabled) {
            console.log('[Busylight] Disabled in settings');
            return false;
        }

        // Check connection
        const connected = await this.checkConnection();
        if (connected) {
            console.log('[Busylight] Connected successfully');
            this.connected = true;
            this.retryAttempts = 0;
            
            // Run test sequence
            await this.testConnection();
            
            // Update to current state
            await this.updateState();
            
            // Start monitoring
            this.startMonitoring();
            
            return true;
        }

        console.warn('[Busylight] Failed initial connection - will retry via monitoring');
        this.connected = false;
        this.startMonitoring();
        
        return false;
    }

    /**
     * Check HTTP connection to bridge
     */
    async checkConnection() {
        try {
            const url = this.buildApiUrl('currentpresence');
            const headers = this.buildRequestHeaders();
            
            const response = await fetch(url, {
                method: 'GET',
                headers,
                signal: AbortSignal.timeout(3000)
            });

            return response.ok;

        } catch (error) {
            return false;
        }
    }

    /**
     * Test connection with quick color sequence
     */
    async testConnection() {
        if (!this.connected) return;

        try {
            console.log('[Busylight] Testing connection...');

            const colors = [
                { red: 100, green: 0, blue: 0 },    // Red
                { red: 0, green: 100, blue: 0 },    // Green
                { red: 100, green: 100, blue: 100 } // White
            ];

            for (let color of colors) {
                await this.apiRequest('light', color);
                await this.sleep(300);
            }

            await this.apiRequest('off');
            console.log('[Busylight] Test completed');

        } catch (error) {
            console.error('[Busylight] Test failed:', error);
        }
    }

    /**
     * Setup event listeners for SIP and agent events
     */
    setupEventListeners() {
        console.log('[Busylight] Setting up event listeners...');
        
        // Wait for managers to be available
        if (window.App?.managers?.sip) {
            this.attachListeners();
        } else {
            document.addEventListener('managersInitialized', () => {
                this.attachListeners();
            });
        }
    }

    /**
     * Attach listeners to SIP and line managers
     */
    attachListeners() {
        const sipManager = window.App?.managers?.sip;
        const lineKeyManager = window.App?.managers?.lineKeys;
        
        if (!sipManager) {
            console.warn('[Busylight] SIP manager not available');
            return;
        }
        
        console.log('[Busylight] Attaching event listeners');
        
        // Registration events
        sipManager.on('registered', () => this.updateState());
        sipManager.on('unregistered', () => this.updateState());
        sipManager.on('registrationFailed', () => this.updateState());
        
        // Call events
        sipManager.on('incomingCall', () => this.updateState());
        sipManager.on('sessionAnswered', () => this.updateState());
        sipManager.on('sessionEstablished', () => this.updateState());
        sipManager.on('sessionTerminated', () => this.updateState());
        sipManager.on('sessionHeld', () => this.updateState());
        
        // Line key events
        if (lineKeyManager) {
            lineKeyManager.on('lineStateChanged', () => this.updateState());
            lineKeyManager.on('lineChanged', () => this.updateState());
        }
    }

    /**
     * Update busylight state based on system status
     * Implements primary and secondary rules
     */
    async updateState() {
        if (!this.enabled || !this.connected) return;
        
        const newState = this.evaluateState();
        
        if (newState !== this.currentState) {
            console.log(`[Busylight] State change: ${this.currentState} → ${newState}`);
            this.currentState = newState;
            await this.applyState(newState);
        }
    }

    /**
     * Evaluate which state should be active based on rules
     * @returns {string} The state name (DISCONNECTED, CONNECTED, IDLE, etc.)
     */
    evaluateState() {
        const sipManager = window.App?.managers?.sip;
        const agentManager = window.App?.managers?.agent;
        const lineKeyManager = window.App?.managers?.lineKeys;
        
        const isRegistered = sipManager?.isRegistered?.() || false;
        const isAgentLoggedIn = agentManager?.isLoggedIn || false;
        
        // PRIMARY SCENARIOS (highest priority - regardless of selected line)
        
        // 1. Not registered to SIP server
        if (!isRegistered) {
            return 'DISCONNECTED';
        }
        
        // 2. Registered but no agent logged in
        if (!isAgentLoggedIn) {
            return 'CONNECTED';
        }
        
        // From here on, agent is logged in
        
        if (lineKeyManager) {
            const activeLines = lineKeyManager.getActiveLines();
            const ringingLines = activeLines.filter(line => line.state === 'ringing');
            const activeLinesNotRinging = activeLines.filter(line => line.state !== 'ringing');
            
            // 3. No active calls, check for voicemail
            if (activeLines.length === 0) {
                return this.hasVoicemail ? 'IDLENOTIFY' : 'IDLE';
            }
            
            // 4. Has active call(s) and incoming call on OTHER line(s)
            if (activeLinesNotRinging.length > 0 && ringingLines.length > 0) {
                return 'RINGWAITING';
            }
            
            // 5. No active calls but incoming call(s) ringing
            if (activeLinesNotRinging.length === 0 && ringingLines.length > 0) {
                return 'RINGING';
            }
            
            // SECONDARY SCENARIOS (selected line specific)
            // If primary scenarios don't match, check the currently selected line
            
            const selectedLine = lineKeyManager.getSelectedLine();
            const selectedLineState = lineKeyManager.getLineState(selectedLine);
            
            if (selectedLineState) {
                // Selected line has incoming call
                if (selectedLineState.state === 'ringing') {
                    return 'RINGING';
                }
                
                // Selected line has active call
                if (selectedLineState.state === 'active') {
                    return 'BUSY';
                }
                
                // Selected line has active call on hold
                if (selectedLineState.state === 'hold') {
                    return 'HOLD';
                }
                
                // Selected line is idle
                if (selectedLineState.state === 'idle') {
                    return this.hasVoicemail ? 'IDLENOTIFY' : 'IDLE';
                }
            }
        } else {
            // Fallback for systems without line key manager (single line)
            const hasIncoming = sipManager?.hasIncomingCall?.() || false;
            const hasActive = sipManager?.hasActiveSessions?.() || false;
            
            if (hasIncoming) {
                return 'RINGING';
            }
            
            if (hasActive) {
                const session = sipManager.getCurrentSession();
                if (session?.onHold) {
                    return 'HOLD';
                }
                return 'BUSY';
            }
        }
        
        // Default: logged in and idle
        return this.hasVoicemail ? 'IDLENOTIFY' : 'IDLE';
    }

    /**
     * Apply the state to the busylight device
     * @param {string} state - State name
     */
    async applyState(state) {
        const config = this.stateConfig[state];
        
        if (!config) {
            console.warn(`[Busylight] Unknown state: ${state}`);
            return;
        }
        
        // Stop any slow flashing first
        this.stopSlowFlash();
        
        // DISCONNECTED - Turn off
        if (state === 'DISCONNECTED') {
            await this.apiRequest('off');
            return;
        }
        
        // RINGING - Use alert with sound
        if (state === 'RINGING') {
            await this.apiRequest('alert', {
                ...config.color,
                sound: this.alertNumber,
                volume: this.alertVolume
            });
            return;
        }
        
        // RINGWAITING - Use alert with SILENT (volume 0)
        if (state === 'RINGWAITING') {
            await this.apiRequest('alert', {
                ...config.color,
                sound: this.alertNumber,
                volume: 0  // Silent
            });
            return;
        }
        
        // IDLENOTIFY - Slow flash (1000ms ON / 1000ms OFF)
        if (state === 'IDLENOTIFY') {
            this.startSlowFlash(config.color);
            return;
        }
        
        // All other states - Solid color
        if (config.color) {
            await this.apiRequest('light', config.color);
        }
    }

    /**
     * Start slow flash for IDLENOTIFY (1000ms ON / 1000ms OFF)
     */
    startSlowFlash(color) {
        if (this.isSlowFlashing) return;
        
        console.log('[Busylight] Starting slow flash (1000ms ON/OFF)');
        this.isSlowFlashing = true;
        
        let isOn = true;
        
        // Set initial ON state
        this.apiRequest('light', color);
        
        // Setup flashing interval
        this.slowFlashInterval = setInterval(async () => {
            if (!this.enabled || !this.connected) {
                this.stopSlowFlash();
                return;
            }
            
            if (isOn) {
                await this.apiRequest('off');
            } else {
                await this.apiRequest('light', color);
            }
            isOn = !isOn;
        }, 1000); // 1000ms interval
    }

    /**
     * Stop slow flash
     */
    stopSlowFlash() {
        if (this.slowFlashInterval) {
            clearInterval(this.slowFlashInterval);
            this.slowFlashInterval = null;
            this.isSlowFlashing = false;
        }
    }

    /**
     * Make API request to bridge
     */
    async apiRequest(action, params = {}) {
        if (!this.enabled || !this.connected) return false;

        try {
            const url = this.buildApiUrl(action, params);
            const headers = this.buildRequestHeaders();
            
            const response = await fetch(url, {
                method: 'GET',
                headers,
                signal: AbortSignal.timeout(2000)
            });

            if (response.ok) {
                this.retryAttempts = 0;
                return true;
            }
            
            return false;

        } catch (error) {
            console.error(`[Busylight] API error:`, error);
            return false;
        }
    }

    /**
     * Build API URL with parameters
     */
    buildApiUrl(action, params = {}) {
        const url = new URL(this.bridgeUrl, window.location.origin);
        url.searchParams.set('action', action);
        
        // Get username for bridge routing
        const username = this.getSipUsername();
        if (username) {
            url.searchParams.set('bridgeId', username);
        }
        
        // Add additional parameters
        for (const [key, value] of Object.entries(params)) {
            if (value !== null && value !== undefined) {
                url.searchParams.set(key, value.toString());
            }
        }
        
        return url.toString();
    }

    /**
     * Get SIP username for bridge routing
     */
    getSipUsername() {
        try {
            if (window.localDB) {
                const username = window.localDB.getItem('SipUsername', '');
                if (username) return username;
            }
            
            if (window.App?.settings?.SipUsername) {
                return window.App.settings.SipUsername;
            }
        } catch (error) {
            console.warn('[Busylight] Error getting SIP username:', error);
        }
        return null;
    }

    /**
     * Build request headers
     */
    buildRequestHeaders() {
        const headers = {};
        
        const username = this.getSipUsername();
        if (username) {
            headers['x-connect365-username'] = username;
        }
        
        return headers;
    }

    /**
     * Start connection monitoring
     */
    startMonitoring() {
        if (this.monitoringInterval) return;

        console.log(`[Busylight] Starting monitoring (${this.monitoringIntervalMs}ms)`);
        
        this.monitoringInterval = setInterval(async () => {
            if (!this.enabled) {
                this.stopMonitoring();
                return;
            }

            const wasConnected = this.connected;
            const isConnected = await this.checkConnection();

            if (!wasConnected && isConnected) {
                console.log('[Busylight] Bridge reconnected');
                this.connected = true;
                this.retryAttempts = 0;
                await this.updateState();
                
                if (window.Alert) {
                    window.Alert('Busylight bridge has reconnected!', 'Busylight Reconnected');
                }
                
            } else if (wasConnected && !isConnected) {
                console.warn('[Busylight] Bridge disconnected');
                this.connected = false;
                this.stopSlowFlash();
                
                // Show error toast notification
                if (window.Toast) {
                    window.Toast('Busylight bridge connection lost. Please check the bridge application is running.', 'error');
                }
            }
        }, this.monitoringIntervalMs);
    }

    /**
     * Stop monitoring
     */
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
    }

    /**
     * Disconnect and cleanup
     */
    async disconnect() {
        console.log('[Busylight] Disconnecting...');
        
        this.stopMonitoring();
        this.stopSlowFlash();
        
        if (this.connected) {
            await this.apiRequest('off');
        }
        
        this.connected = false;
        this.retryAttempts = 0;
    }

    /**
     * Enable/disable busylight
     * When enabled: runs test color sequence
     * When disabled: turns off device
     */
    async setEnabled(enabled) {
        if (this.enabled === enabled) return;
        
        this.enabled = enabled;
        this.saveSettings();
        
        if (enabled) {
            console.log('[Busylight] Enabling from settings...');
            await this.initialize();
            
            // If already connected, run test sequence (happens when toggling in settings)
            if (this.connected) {
                console.log('[Busylight] Running test sequence...');
                await this.testConnection();
                await this.updateState();
            }
        } else {
            console.log('[Busylight] Disabling from settings...');
            
            // Explicitly turn off device before disconnecting
            if (this.connected) {
                console.log('[Busylight] Turning off device...');
                await this.apiRequest('off');
            }
            
            await this.disconnect();
        }
    }

    /**
     * Update voicemail notification status
     */
    async onVoicemailUpdate(count) {
        const hasVoicemail = count > 0;
        
        if (hasVoicemail !== this.hasVoicemail) {
            this.hasVoicemail = hasVoicemail;
            // Save to localStorage for persistence
            this.setVoicemailState(hasVoicemail);
            console.log('[Busylight] Voicemail status:', hasVoicemail ? 'has voicemail' : 'no voicemail');
            await this.updateState();
        }
    }

    /**
     * Update alert settings
     */
    updateAlertSettings(alertNumber, alertVolume) {
        this.alertNumber = alertNumber;
        this.alertVolume = alertVolume;
        this.saveSettings();
        console.log(`[Busylight] Alert settings updated: Number=${alertNumber}, Volume=${alertVolume}`);
    }

    /**
     * Get current status
     */
    getStatus() {
        return {
            enabled: this.enabled,
            connected: this.connected,
            state: this.currentState,
            hasVoicemail: this.hasVoicemail,
            isSlowFlashing: this.isSlowFlashing,
            alertNumber: this.alertNumber,
            alertVolume: this.alertVolume,
            username: this.getSipUsername() || 'auto'
        };
    }

    /**
     * Helper for delays
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export to window
window.BusylightManager = BusylightManager;

// Debug functions
window.testBusylight = async function() {
    const manager = window.App?.managers?.busylight;
    if (!manager) {
        console.error('Busylight manager not found');
        return;
    }
    
    console.group('🔍 Busylight Status');
    console.log('Enabled:', manager.enabled);
    console.log('Connected:', manager.connected);
    console.log('State:', manager.currentState);
    console.log('Has Voicemail:', manager.hasVoicemail);
    console.log('Slow Flashing:', manager.isSlowFlashing);
    console.log('Alert Number:', manager.alertNumber);
    console.log('Alert Volume:', manager.alertVolume);
    console.log('Username:', manager.getSipUsername() || 'auto');
    
    const connected = await manager.checkConnection();
    console.log('Connection Test:', connected ? '✅ Connected' : '❌ Not connected');
    
    console.groupEnd();
    return manager.getStatus();
};

console.log('💡 Busylight Manager v2 loaded');
console.log('Debug: testBusylight()');
