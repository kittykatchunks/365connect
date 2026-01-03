/**
 * Busylight Manager - Refactored HTTP API Only
 * 
 * Manages Plenom Kuando Busylight devices via HTTP API proxy
 * All communication is through /api/busylight proxy to bridge server
 */

class BusylightManager {
    constructor() {
        // Core settings
        this.enabled = false;
        this.connected = false;
        this.bridgeUrl = '/api/busylight';
        this.bridgeId = null; // Unique bridge identifier for routing
        
        // State tracking
        this.currentState = 'offline';
        this.hasVoicemail = false;
        this.retryAttempts = 0;
        this.maxRetryAttempts = 5;
        this.isRetrying = false;
        
        // Monitoring
        this.monitoringInterval = null;
        this.monitoringIntervalMs = 15000; // 15 seconds
        
        // Device type detection
        this.deviceModel = null;
        this.isAlphaDevice = false;
        
        // Flashing control
        this.isFlashing = false;
        this.flashingInterval = null; // For alpha devices using manual flashing
        
        // Alert settings for ringing
        this.ringSound = 3; // 1-7 (default: Funky)
        this.ringVolume = 50; // 0/25/50/75/100
        
        // Load settings from localStorage
        this.loadSettings();
        
        // State color mappings per requirements:
        // - Offline: OFF (light off, not registered)
        // - Registered: WHITE (registered but not logged in)
        // - Idle: GREEN solid (logged in and available)
        // - Idle with voicemail: GREEN slow flash
        // - Ringing: RED alert with sound (500ms/500ms flash)
        // - Active: RED solid (on call)
        // - Hold: YELLOW slow flash
        this.stateColors = {
            'offline': null,                                    // OFF
            'registered': { red: 100, green: 100, blue: 100 }, // WHITE
            'idle': { red: 0, green: 100, blue: 0 },           // GREEN
            'idle_voicemail': { red: 0, green: 100, blue: 0 }, // GREEN (will flash)
            'ringing': { red: 100, green: 0, blue: 0 },        // RED (will use alert)
            'active': { red: 100, green: 0, blue: 0 },         // RED
            'hold': { red: 100, green: 100, blue: 0 }          // YELLOW (will flash)
        };
        
        // Flash intervals for blink API (in 0.1 second units)
        // e.g., 15 = 1.5 seconds
        this.flashIntervals = {
            'ringing': { ontime: 5, offtime: 5 },        // Fast flash for ringing (0.5s on/off)
            'hold': { ontime: 15, offtime: 15 },         // Slow flash for hold (1.5s on/off)
            'idle_voicemail': { ontime: 15, offtime: 15 } // Slow flash for voicemail (1.5s on/off)
        };
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
        // bridgeId should be the Connect365 username (SIP username), not a connection ID
        // We'll get this dynamically from SIP manager when needed
        this.bridgeId = null;
        this.ringSound = parseInt(window.localDB.getItem("BusylightRingSound", "3"), 10);
        this.ringVolume = parseInt(window.localDB.getItem("BusylightRingVolume", "50"), 10);
        
        console.log('[Busylight] Settings loaded:');
        console.log('  Enabled:', this.enabled);
        console.log('  Ring Sound:', this.ringSound);
        console.log('  Ring Volume:', this.ringVolume);
    }

    /**
     * Save settings to localStorage
     */
    saveSettings() {
        if (!window.localDB) {
            console.warn('[Busylight] localDB not available, cannot save settings');
            return;
        }
        
        window.localDB.setItem("BusylightEnabled", this.enabled ? "1" : "0");
        window.localDB.setItem("BusylightRingSound", this.ringSound.toString());
        window.localDB.setItem("BusylightRingVolume", this.ringVolume.toString());
        
        console.log('[Busylight] Settings saved');
    }

    /**
     * Initialize Busylight Manager
     */
    async initialize() {
        console.log('[Busylight] Initializing Busylight Manager...');
        console.log('[Busylight] Enabled:', this.enabled);
        console.log('[Busylight] Bridge URL:', this.bridgeUrl);
        console.log('[Busylight] Bridge ID:', this.bridgeId || 'auto-select');
        
        // Setup event listeners regardless of enabled state
        this.setupEventListeners();
        
        if (!this.enabled) {
            console.log('[Busylight] Disabled in settings - skipping connection');
            return false;
        }

        // Check connection
        const connected = await this.checkConnection();
        if (connected) {
            console.log('[Busylight] Connected successfully');
            this.connected = true;
            this.retryAttempts = 0;
            this.isRetrying = false;
            
            // Detect device type
            await this.detectDeviceType();
            
            // Run test sequence
            await this.testConnection();
            
            // Start monitoring
            this.startMonitoring();
            
            // Update to current system state
            await this.updateStateFromSystem();
            
            return true;
        }

        console.warn('[Busylight] Failed to connect');
        this.connected = false;
        this.showConnectionError();
        return false;
    }

    /**
     * Check HTTP connection to bridge
     */
    async checkConnection() {
        try {
            const url = this.buildApiUrl('currentpresence');
            const headers = this.buildRequestHeaders();
            
            console.log(`[Busylight] Checking connection: ${url}`);
            
            const response = await fetch(url, {
                method: 'GET',
                headers,
                signal: AbortSignal.timeout(3000)
            });

            if (!response.ok) {
                console.warn('[Busylight] Bridge returned error:', response.status);
                return false;
            }

            console.log('[Busylight] Bridge is responding');
            return true;

        } catch (error) {
            console.warn('[Busylight] Bridge not reachable:', error.message);
            return false;
        }
    }

    /**
     * Test connection with color sequence
     */
    async testConnection() {
        if (!this.connected) return;

        try {
            console.log('[Busylight] Testing connection with color sequence...');

            // Test sequence - 7 colors
            const colors = [
                { red: 100, green: 0, blue: 0 },    // Red
                { red: 0, green: 100, blue: 0 },    // Green
                { red: 0, green: 0, blue: 100 },    // Blue
                { red: 100, green: 100, blue: 0 },  // Yellow
                { red: 100, green: 0, blue: 100 },  // Magenta
                { red: 0, green: 100, blue: 100 },  // Cyan
                { red: 100, green: 100, blue: 100 } // White
            ];

            for (let color of colors) {
                const success = await this.setColorRGB(color.red, color.green, color.blue);
                if (!success) {
                    throw new Error('Failed to set color during test sequence');
                }
                await this.sleep(300);
            }

            // Turn off after test
            await this.turnOff();
            console.log('[Busylight] Test sequence completed successfully');

        } catch (error) {
            console.error('[Busylight] Error testing connection:', error);
            this.connected = false;
            throw error;
        }
    }

    /**
     * Detect device type to determine if manual flashing is needed
     */
    async detectDeviceType() {
        try {
            const devices = await this.getDevices();
            if (devices.length > 0) {
                const device = devices[0];
                this.deviceModel = device.ModelName || device.ProductID || 'Unknown';
                
                // Check if device is an Alpha model (doesn't support blink API)
                this.isAlphaDevice = this.deviceModel.toLowerCase().includes('alpha');
                
                console.log('[Busylight] Device detected:');
                console.log('  Model:', this.deviceModel);
                console.log('  Is Alpha:', this.isAlphaDevice);
                console.log('  Flash method:', this.isAlphaDevice ? 'Manual (interval-based)' : 'Hardware blink API');
            } else {
                console.warn('[Busylight] No devices detected');
            }
        } catch (error) {
            console.warn('[Busylight] Error detecting device type:', error);
        }
    }

    /**
     * Get list of connected Busylight devices
     */
    async getDevices() {
        try {
            const url = this.buildApiUrl('busylightdevices');
            const headers = this.buildRequestHeaders();
            
            const response = await fetch(url, {
                method: 'GET',
                headers,
                signal: AbortSignal.timeout(2000)
            });

            if (response.ok) {
                const result = await response.json();
                
                // Handle multiple response formats
                if (Array.isArray(result)) {
                    return result;
                } else if (result.devices && Array.isArray(result.devices)) {
                    return result.devices;
                } else if (result.data && Array.isArray(result.data)) {
                    return result.data;
                } else if (result.data && result.data.devices && Array.isArray(result.data.devices)) {
                    return result.data.devices;
                }
                
                console.warn('[Busylight] Unexpected device response format:', result);
                return [];
            }
        } catch (error) {
            console.warn('[Busylight] Error getting devices:', error);
        }
        return [];
    }

    /**
     * Get available bridges from server
     */
    async getAvailableBridges() {
        try {
            const response = await fetch('/api/busylight-status', {
                method: 'GET',
                signal: AbortSignal.timeout(2000)
            });

            if (response.ok) {
                const status = await response.json();
                return status.bridgeList || [];
            }
        } catch (error) {
            console.warn('[Busylight] Error getting bridges:', error);
        }
        return [];
    }

    /**
     * Build API URL with optional bridge ID (username-based routing)
     */
    buildApiUrl(action, params = {}) {
        const url = new URL(this.bridgeUrl, window.location.origin);
        url.searchParams.set('action', action);
        
        // Get username from SIP manager for bridge routing
        const username = this.getConnect365Username();
        if (username) {
            url.searchParams.set('bridgeId', username);
            console.log(`[Busylight] Routing to bridge for user: ${username}`);
        } else {
            console.log('[Busylight] No username available, using auto-select routing');
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
     * Get Connect365 Username from connection settings for routing
     * This is used as the unique identifier to route commands to the correct busylight-bridge
     */
    getConnect365Username() {
        try {
            // Get from connection settings (stored by connection manager)
            if (window.localDB) {
                const username = window.localDB.getItem('CurrentUser', '');
                if (username) {
                    return username;
                }
            }
            
            // Fallback: try to get from global App settings
            if (window.App?.settings?.currentUser) {
                return window.App.settings.currentUser;
            }
        } catch (error) {
            console.warn('[Busylight] Error getting Connect365 Username:', error);
        }
        return null;
    }

    /**
     * Build request headers including Connect365 Username for routing
     */
    buildRequestHeaders() {
        const headers = {};
        
        const username = this.getConnect365Username();
        if (username) {
            headers['x-connect365-username'] = username;
        }
        
        return headers;
    }

    /**
     * Make API request with retry logic
     */
    async apiRequest(action, params = {}) {
        if (!this.enabled) return false;

        try {
            const url = this.buildApiUrl(action, params);
            const headers = this.buildRequestHeaders();
            
            const response = await fetch(url, {
                method: 'GET',
                headers,
                signal: AbortSignal.timeout(2000)
            });

            if (response.ok) {
                // Success - reset retry counter
                this.retryAttempts = 0;
                this.isRetrying = false;
                return true;
            } else {
                console.warn(`[Busylight] API request failed: ${response.status}`);
                return await this.handleRequestFailure();
            }
        } catch (error) {
            console.error(`[Busylight] API request error:`, error);
            return await this.handleRequestFailure();
        }
    }

    /**
     * Handle request failure with retry logic
     */
    async handleRequestFailure() {
        if (this.isRetrying || this.retryAttempts >= this.maxRetryAttempts) {
            if (!this.isRetrying) {
                console.error(`[Busylight] Max retry attempts (${this.maxRetryAttempts}) reached`);
                this.connected = false;
                this.showConnectionError();
                this.isRetrying = true;
            }
            return false;
        }

        this.retryAttempts++;
        console.log(`[Busylight] Retry attempt ${this.retryAttempts}/${this.maxRetryAttempts}`);
        
        // Wait before retry (exponential backoff)
        await this.sleep(500 * this.retryAttempts);
        
        return false;
    }

    /**
     * Setup event listeners for SIP and agent events
     */
    setupEventListeners() {
        console.log('[Busylight] Setting up event listeners...');
        
        // Wait for managers to be available
        if (window.App?.managers?.sip) {
            this.attachSipListeners();
        } else {
            document.addEventListener('managersInitialized', () => {
                this.attachSipListeners();
            });
        }
    }

    /**
     * Attach listeners to SIP manager events
     */
    attachSipListeners() {
        const sipManager = window.App?.managers?.sip;
        if (!sipManager) {
            console.warn('[Busylight] SIP manager not available');
            return;
        }
        
        console.log('[Busylight] Attaching SIP event listeners');
        
        // Registration events
        sipManager.on('registered', () => this.onSipRegistered());
        sipManager.on('unregistered', () => this.onSipUnregistered());
        sipManager.on('registrationFailed', () => this.onSipUnregistered());
        
        // Call events
        sipManager.on('incomingCall', (session) => this.onIncomingCall(session));
        sipManager.on('sessionAnswered', (session) => this.onCallAnswered(session));
        sipManager.on('sessionEstablished', (session) => this.onCallEstablished(session));
        sipManager.on('sessionTerminated', (session) => this.onCallTerminated(session));
        
        // Hold events
        sipManager.on('sessionHeld', (data) => this.onSessionHeld(data));
    }

    /**
     * Update state based on current system status
     */
    async updateStateFromSystem() {
        if (!this.enabled || !this.connected) return;
        
        // Priority 1: Ringing (incoming call)
        if (window.App?.managers?.sip?.hasIncomingCall?.()) {
            await this.setState('ringing');
            return;
        }
        
        // Priority 2: Active call
        if (window.App?.managers?.sip?.hasActiveSessions?.()) {
            const session = window.App.managers.sip.getCurrentSession();
            if (session) {
                if (session.onHold) {
                    // Priority 3: On hold
                    await this.setState('hold');
                } else {
                    await this.setState('active');
                }
                return;
            }
        }
        
        // Priority 4: Available with voicemail
        if (window.App?.managers?.agent?.isLoggedIn && this.hasVoicemail) {
            await this.setState('idle_voicemail');
            return;
        }
        
        // Priority 5: Available (logged in)
        if (window.App?.managers?.agent?.isLoggedIn) {
            await this.setState('idle');
            return;
        }
        
        // Priority 6: Registered but not logged in
        if (window.App?.managers?.sip?.isRegistered?.()) {
            await this.setState('registered');
            return;
        }
        
        // Priority 7: Offline
        await this.setState('offline');
    }

    /**
     * Event handlers
     */
    async onSipRegistered() {
        console.log('[Busylight] SIP registered');
        if (!this.enabled || !this.connected) return;
        
        const agentLoggedIn = window.App?.managers?.agent?.isLoggedIn;
        if (agentLoggedIn) {
            await this.setState(this.hasVoicemail ? 'idle_voicemail' : 'idle');
        } else {
            await this.setState('registered');
        }
    }

    async onSipUnregistered() {
        console.log('[Busylight] SIP unregistered');
        if (!this.enabled || !this.connected) return;
        await this.setState('offline');
    }

    async onIncomingCall(session) {
        console.log('[Busylight] Incoming call');
        if (!this.enabled || !this.connected) return;
        await this.setState('ringing');
    }

    async onCallAnswered(session) {
        console.log('[Busylight] Call answered');
        if (!this.enabled || !this.connected) return;
        await this.setState('active');
    }

    async onCallEstablished(session) {
        console.log('[Busylight] Call established');
        if (!this.enabled || !this.connected) return;
        await this.setState('active');
    }

    async onCallTerminated(session) {
        console.log('[Busylight] Call terminated');
        if (!this.enabled || !this.connected) return;
        
        // Return to appropriate state
        if (window.App?.managers?.agent?.isLoggedIn) {
            await this.setState(this.hasVoicemail ? 'idle_voicemail' : 'idle');
        } else if (window.App?.managers?.sip?.isRegistered?.()) {
            await this.setState('registered');
        } else {
            await this.setState('offline');
        }
    }

    async onSessionHeld(data) {
        console.log('[Busylight] Session hold state changed:', data);
        if (!this.enabled || !this.connected) return;
        
        if (data.onHold) {
            await this.setState('hold');
        } else {
            await this.setState('active');
        }
    }

    /**
     * Agent login/logout handlers (called from agent-buttons.js)
     */
    async onAgentLoggedIn() {
        console.log('[Busylight] Agent logged in');
        if (!this.enabled || !this.connected) return;
        await this.setState(this.hasVoicemail ? 'idle_voicemail' : 'idle');
    }

    async onAgentLoggedOut() {
        console.log('[Busylight] Agent logged out');
        if (!this.enabled || !this.connected) return;
        
        const isRegistered = window.App?.managers?.sip?.isRegistered?.();
        if (isRegistered) {
            await this.setState('registered');
        } else {
            await this.setState('offline');
        }
    }

    /**
     * Voicemail notification handler
     */
    async onVoicemailUpdate(count) {
        const hasVoicemail = count > 0;
        
        if (hasVoicemail !== this.hasVoicemail) {
            this.hasVoicemail = hasVoicemail;
            console.log('[Busylight] Voicemail status changed:', hasVoicemail ? 'has voicemail' : 'no voicemail');
            
            // Update state if currently in idle
            if (this.currentState === 'idle' || this.currentState === 'idle_voicemail') {
                await this.setState(hasVoicemail ? 'idle_voicemail' : 'idle');
            }
        }
    }

    /**
     * Set state and update busylight
     */
    async setState(state) {
        console.log(`[Busylight] Setting state to: ${state}`);
        this.currentState = state;
        
        if (!this.enabled || !this.connected) return;
        
        // Mark that we're flashing or not
        this.isFlashing = (state === 'hold' || state === 'idle_voicemail');

        const color = this.stateColors[state];
        
        // Handle special states
        if (state === 'offline') {
            // Turn off light
            await this.turnOff();
            
        } else if (state === 'ringing') {
            // Use alert with sound for ringing
            await this.setAlert(
                color.red,
                color.green,
                color.blue,
                this.ringSound,
                this.ringVolume
            );
            
        } else if (state === 'hold' || state === 'idle_voicemail') {
            // Use appropriate flashing method based on device type
            if (this.isAlphaDevice) {
                // Alpha devices: use manual interval-based flashing
                const intervalMs = state === 'hold' ? 1500 : 1500; // 1.5s for both hold and voicemail
                await this.startFlashingAlpha(color, intervalMs);
            } else {
                // Non-alpha devices: use hardware blink API
                const timing = this.flashIntervals[state];
                await this.setBlink(
                    color.red,
                    color.green,
                    color.blue,
                    timing.ontime,
                    timing.offtime
                );
            }
            
        } else {
            // Solid color for other states
            await this.setColorRGB(color.red, color.green, color.blue);
        }
    }

    /**
     * Set color using RGB values (0-100 scale)
     */
    async setColorRGB(red, green, blue) {
        return await this.apiRequest('light', { red, green, blue });
    }

    /**
     * Set alert with sound (for ringing)
     * @param {number} red - Red value (0-100)
     * @param {number} green - Green value (0-100)
     * @param {number} blue - Blue value (0-100)
     * @param {number} sound - Sound ID (1-7): 1=OpenOffice, 2=Quiet, 3=Funky, 4=FairyTale, 5=KuandoTrain, 6=Telephone, 7=HighPitch
     * @param {number} volume - Volume (0, 25, 50, 75, 100)
     */
    async setAlert(red, green, blue, sound, volume) {
        return await this.apiRequest('alert', { red, green, blue, sound, volume });
    }

    /**
     * Set blink pattern using device's built-in blink command
     * @param {number} red - Red value (0-100)
     * @param {number} green - Green value (0-100)
     * @param {number} blue - Blue value (0-100)
     * @param {number} ontime - Time light is on in 0.1 second units (default 5 = 0.5s)
     * @param {number} offtime - Time light is off in 0.1 second units (default 5 = 0.5s)
     */
    async setBlink(red, green, blue, ontime = 5, offtime = 5) {
        return await this.apiRequest('blink', { red, green, blue, ontime, offtime });
    }

    /**
     * Turn light off
     */
    async turnOff() {
        // Stop any manual flashing for alpha devices
        this.stopFlashingAlpha();
        return await this.apiRequest('off');
    }

    /**
     * Start manual flashing for alpha devices (interval-based)
     * @param {object} color - Color object with red, green, blue properties (0-100)
     * @param {number} intervalMs - Flash interval in milliseconds
     */
    async startFlashingAlpha(color, intervalMs = 500) {
        if (!this.enabled || !this.connected || this.isFlashing) return;
        
        console.log(`[Busylight] Starting manual flash for alpha device (${intervalMs}ms interval)`);
        this.isFlashing = true;
        
        let isOn = true;
        
        // Set initial color
        await this.setColorRGB(color.red, color.green, color.blue);
        
        // Setup flashing interval
        this.flashingInterval = setInterval(async () => {
            if (!this.enabled || !this.connected) {
                this.stopFlashingAlpha();
                return;
            }
            
            if (isOn) {
                await this.apiRequest('off');
            } else {
                await this.setColorRGB(color.red, color.green, color.blue);
            }
            isOn = !isOn;
        }, intervalMs);
    }

    /**
     * Stop manual flashing for alpha devices
     */
    stopFlashingAlpha() {
        if (this.flashingInterval) {
            clearInterval(this.flashingInterval);
            this.flashingInterval = null;
            this.isFlashing = false;
            console.log('[Busylight] Stopped manual flashing for alpha device');
        }
    }



    /**
     * Start connection monitoring
     */
    startMonitoring() {
        if (this.monitoringInterval) return;

        console.log(`[Busylight] Starting connection monitoring (${this.monitoringIntervalMs}ms)`);
        
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
                this.isRetrying = false;
                await this.updateStateFromSystem();
                
                if (window.Alert) {
                    window.Alert('Busylight bridge has reconnected!', 'Busylight Reconnected');
                }
                
            } else if (wasConnected && !isConnected) {
                console.warn('[Busylight] Bridge disconnected');
                this.connected = false;
                this.showConnectionError();
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
            console.log('[Busylight] Stopped monitoring');
        }
    }

    /**
     * Disconnect and cleanup
     */
    async disconnect() {
        console.log('[Busylight] Disconnecting...');
        
        this.stopMonitoring();
        this.stopFlashingAlpha();
        
        if (this.connected) {
            await this.turnOff();
        }
        
        this.connected = false;
        this.retryAttempts = 0;
        this.isRetrying = false;
        this.isFlashing = false;
        
        console.log('[Busylight] Disconnected');
    }

    /**
     * Enable/disable busylight
     */
    async setEnabled(enabled) {
        if (this.enabled === enabled) return;
        
        this.enabled = enabled;
        this.saveSettings();
        
        if (enabled) {
            console.log('[Busylight] Enabling...');
            await this.initialize();
        } else {
            console.log('[Busylight] Disabling...');
            await this.disconnect();
        }
    }

    /**
     * Toggle busylight on/off
     */
    async toggle() {
        await this.setEnabled(!this.enabled);
        return this.enabled;
    }

    /**
     * Update alert settings
     */
    updateAlertSettings(sound, volume) {
        this.ringSound = sound;
        this.ringVolume = volume;
        this.saveSettings();
        console.log(`[Busylight] Alert settings updated: Sound=${sound}, Volume=${volume}`);
    }

    /**
     * Select bridge by ID (DEPRECATED - now uses automatic username-based routing)
     */
    async selectBridge(bridgeId) {
        console.log(`[Busylight] selectBridge() is deprecated - now using automatic username-based routing`);
        console.log(`[Busylight] Requests will automatically route to bridge for current SIP username`);
    }

    /**
     * Show connection error
     */
    showConnectionError() {
        if (!this.enabled) return;
        
        console.error('[Busylight] Connection error - max retries reached');
        
        if (window.Alert) {
            window.Alert(
                `Busylight Bridge is not responding.\n\nPlease check:\n1. Busylight Bridge application is running\n2. Device is connected\n3. Network connection is working\n\nConnection monitoring will continue and automatically reconnect when available.`,
                'Busylight Connection Error'
            );
        }
    }

    /**
     * Get current status
     */
    getStatus() {
        return {
            enabled: this.enabled,
            connected: this.connected,
            bridgeId: this.getConnect365Username() || 'auto',
            username: this.getConnect365Username(),
            deviceModel: this.deviceModel || 'Unknown',
            isAlphaDevice: this.isAlphaDevice,
            flashMethod: this.isAlphaDevice ? 'Manual (interval-based)' : 'Hardware blink API',
            state: this.currentState,
            hasVoicemail: this.hasVoicemail,
            isFlashing: this.isFlashing,
            retryAttempts: this.retryAttempts,
            ringSound: this.ringSound,
            ringVolume: this.ringVolume
        };
    }

    /**
     * Helper method for delays
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export to window
window.BusylightManager = BusylightManager;

// Debug functions for console testing
window.testBusylight = async function() {
    console.group('🔍 Busylight Diagnostic');
    
    const manager = window.App?.managers?.busylight;
    if (!manager) {
        console.error('❌ Busylight manager not found');
        console.groupEnd();
        return;
    }
    
    const username = manager.getConnect365Username();
    
    console.log('✓ Manager found');
    console.log('Enabled:', manager.enabled);
    console.log('Connected:', manager.connected);
    console.log('Bridge URL:', manager.bridgeUrl);
    console.log('Username (Bridge Routing):', manager.getConnect365Username() || 'auto-select');
    console.log('Connect365 Username:', username || 'not configured');
    console.log('Device Model:', manager.deviceModel || 'Unknown');
    console.log('Is Alpha Device:', manager.isAlphaDevice);
    console.log('Flash Method:', manager.isAlphaDevice ? 'Manual (interval-based)' : 'Hardware blink API');
    console.log('Current State:', manager.currentState);
    console.log('Has Voicemail:', manager.hasVoicemail);
    console.log('Is Flashing:', manager.isFlashing);
    console.log('Retry Attempts:', `${manager.retryAttempts}/${manager.maxRetryAttempts}`);
    console.log('Ring Sound:', manager.ringSound);
    console.log('Ring Volume:', manager.ringVolume);
    
    // Test connection
    console.log('\n📡 Testing connection...');
    try {
        const connected = await manager.checkConnection();
        console.log(connected ? '✅ Connected' : '❌ Not connected');
    } catch (error) {
        console.error('❌ Connection test failed:', error.message);
    }
    
    // Get available bridges
    console.log('\n🌉 Available bridges...');
    try {
        const bridges = await manager.getAvailableBridges();
        if (bridges.length > 0) {
            console.log(`Found ${bridges.length} bridge(s):`);
            bridges.forEach((b, i) => {
                console.log(`  ${i + 1}. ID: ${b.id}`);
                console.log(`     Connected: ${new Date(b.connectedAt).toLocaleString()}`);
                if (b.info) console.log(`     Info:`, b.info);
            });
        } else {
            console.log('No bridges found');
        }
    } catch (error) {
        console.error('Error getting bridges:', error.message);
    }
    
    // Get devices
    console.log('\n📟 Connected devices...');
    try {
        const devices = await manager.getDevices();
        if (devices.length > 0) {
            console.log(`Found ${devices.length} device(s):`);
            devices.forEach((d, i) => {
                console.log(`  ${i + 1}. ${d.ModelName || d.ProductID || 'Unknown'}`);
                if (d.UniqueID) console.log(`     ID: ${d.UniqueID}`);
            });
        } else {
            console.log('No devices found');
        }
    } catch (error) {
        console.error('Error getting devices:', error.message);
    }
    
    console.groupEnd();
    return manager.getStatus();
};

// Quick test functions
window.testBusylightRed = () => window.App?.managers?.busylight?.setColorRGB(100, 0, 0);
window.testBusylightGreen = () => window.App?.managers?.busylight?.setColorRGB(0, 100, 0);
window.testBusylightBlue = () => window.App?.managers?.busylight?.setColorRGB(0, 0, 100);
window.testBusylightWhite = () => window.App?.managers?.busylight?.setColorRGB(100, 100, 100);
window.testBusylightOff = () => window.App?.managers?.busylight?.turnOff();
window.testBusylightAlert = () => window.App?.managers?.busylight?.setAlert(100, 0, 0, 3, 50);

console.log('💡 Busylight Manager loaded (HTTP API only)');
console.log('Debug functions:');
console.log('  testBusylight() - Full diagnostic');
console.log('  testBusylightRed() - Red color');
console.log('  testBusylightGreen() - Green color');
console.log('  testBusylightBlue() - Blue color');
console.log('  testBusylightWhite() - White color');
console.log('  testBusylightOff() - Turn off');
console.log('  testBusylightAlert() - Test alert with sound');
