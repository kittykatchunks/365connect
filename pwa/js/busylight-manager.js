class BusylightManager {
    constructor() {
        this.enabled = false;
        this.connected = false;
        this.baseUrl = null;
        this.monitoringInterval = null;
        this.lastVoicemailCount = 0;
        this.currentCallState = 'offline';
        this.configDialog = null;
        this.flashingInterval = null;
        this.isFlashing = false;
        
        // Load settings from localStorage
        this.loadSettings();
        
        // State color mappings based on requirements:
        // - Registered but NOT logged in: Solid Blue
        // - Logged in and idle: Solid Green
        // - Active call: Solid Red
        // - Ringing: Flashing Red (handled separately)
        // - On hold: Slowly Flashing Yellow
        this.stateColors = {
            'offline': { red: 50, green: 50, blue: 50 },    // Gray - not registered
            'registered': { red: 0, green: 0, blue: 100 },  // Blue - registered but not logged in
            'idle': { red: 0, green: 100, blue: 0 },        // Green - logged in and idle
            'ringing': { red: 100, green: 0, blue: 0 },     // Red - incoming call (will flash)
            'active': { red: 100, green: 0, blue: 0 },      // Red - active call
            'hold': { red: 100, green: 100, blue: 0 },      // Yellow - on hold (will flash slowly)
            'voicemail': { red: 0, green: 0, blue: 100 }    // Blue - voicemail notification
        };
    }

    // Load settings from localStorage
    loadSettings() {
        this.enabled = (window.localDB.getItem("BusylightEnabled", "0") === "1");
        this.baseUrl = window.localDB.getItem("BusylightUrl", "http://localhost:8989");
        
        // Migration: Update 127.0.0.1 to localhost and old API format
        if (this.baseUrl === "http://127.0.0.1:8989" || this.baseUrl === "http://127.0.0.1:8989/api") {
            this.baseUrl = "http://localhost:8989";
            window.localDB.setItem("BusylightUrl", this.baseUrl);
            console.log("[Busylight] Migrated URL to localhost");
        }
    }

    // Save settings to localStorage
    saveSettings() {
        localDB.setItem("BusylightEnabled", this.enabled ? "1" : "0");
        localDB.setItem("BusylightUrl", this.baseUrl || "http://localhost:8989");
    }

    // Initialize busylight connection and setup event listeners
    async initialize() {
        console.log('[Busylight] Initializing Kuando Busylight service...');
        console.log('[Busylight] Enabled:', this.enabled);
        console.log('[Busylight] Base URL:', this.baseUrl);
        
        // Setup event listeners regardless of enabled state
        this.setupEventListeners();
        
        if (!this.enabled) {
            console.log("[Busylight] Disabled in settings - skipping connection");
            return false;
        }

        if (!this.baseUrl) {
            console.warn("[Busylight] URL not configured - using default");
            this.baseUrl = "http://localhost:8989";
        }

        const connected = await this.checkConnection();
        if (connected) {
            await this.testConnection();
            this.startMonitoring();
            await this.updateStateFromSystem();
            return true;
        } else {
            this.showConnectionError();
            return false;
        }
    }

    // Check if Busylight service is responding and has devices
    async checkConnection() {
        try {
            // First check if the HTTP service is responding
            const response = await fetch(`${this.baseUrl}?action=currentpresence`, {
                method: 'GET',
                signal: AbortSignal.timeout(3000)
            });

            if (!response.ok) {
                this.connected = false;
                console.warn("[Busylight] Kuando HTTP service returned error:", response.status);
                return false;
            }

            console.log("[Busylight] Kuando HTTP service is responding");

            // Now check if any actual devices are connected
            try {
                const devices = await this.getDevices();

                if (!devices || devices.length === 0) {
                    console.warn("[Busylight] Kuando HTTP service running but no devices connected");
                    this.connected = false;
                    return false;
                }

                console.log(`[Busylight] Kuando service running with ${devices.length} device(s) connected`);
                this.connected = true;
                return true;

            } catch (deviceError) {
                console.warn("[Busylight] Could not check for devices:", deviceError.message);
                // If we can't check devices but service responds, assume connection for now
                this.connected = true;
                return true;
            }

        } catch (error) {
            this.connected = false;
            console.warn("[Busylight] Kuando Busylight service not reachable:", error.message);
            return false;
        }
    }

    // Test connection with color sequence
    async testConnection() {
        if (!this.connected) return;

        try {
            console.log("[Busylight] Checking for connected Kuando Busylight devices...");

            // First, check if any devices are actually connected
            const devices = await this.getDevices();

            if (!devices || devices.length === 0) {
                console.warn("[Busylight] Kuando HTTP service is running but no Busylight devices found");
                this.connected = false;
                if (window.Alert) {
                    Alert(
                        "Service is running but no devices found.\n\nPlease check:\n- Device is plugged in\n- Device is recognized by system\n- Kuando software is running",
                        "Busylight Connection Error"
                    );
                }
                return;
            }

            console.log(`[Busylight] Found ${devices.length} Kuando Busylight device(s):`, devices.map(d => d.ProductID || 'Unknown'));
            console.log("[Busylight] Testing connection with color sequence...");

            // Test sequence using official Kuando API (values 0-100)
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
                    throw new Error("Failed to set color during test sequence");
                }
                await this.sleep(300);
            }

            // Turn off after test
            await this.turnOff();

            // Show success message with device info
            if (window.Alert) {
                const deviceNames = devices.map(d => d.ProductID || 'Unknown Model').join(', ');
                Alert(
                    `Busylight connected successfully!\n\nFound ${devices.length} device(s):\n${deviceNames}`,
                    "Busylight Connected"
                );
            }

        } catch (error) {
            console.error("[Busylight] Error testing connection:", error);
            this.connected = false;
            this.showConnectionError();
        }
    }

    // Get list of connected Busylight devices
    async getDevices() {
        try {
            const url = `${this.baseUrl}?action=busylightdevices`;
            const response = await fetch(url, {
                method: 'GET',
                signal: AbortSignal.timeout(2000)
            });

            if (response.ok) {
                const devices = await response.json();
                return devices;
            }
        } catch (error) {
            console.warn("[Busylight] Error getting devices:", error);
        }
        return [];
    }
    
    // Setup event listeners for SIP and agent events
    setupEventListeners() {
        console.log('[Busylight] Setting up event listeners...');
        
        // Wait for managers to be available
        if (window.App && window.App.managers && window.App.managers.sip) {
            this.attachSipListeners();
        } else {
            // Listen for managers initialization
            document.addEventListener('managersInitialized', () => {
                this.attachSipListeners();
            });
        }
        
        // Listen for custom events that might be triggered via webhooks
        document.addEventListener('sipRegistered', () => this.onSipRegistered());
        document.addEventListener('sipUnregistered', () => this.onSipUnregistered());
        document.addEventListener('incomingCall', () => this.onIncomingCall());
        document.addEventListener('callAnswered', () => this.onCallAnswered());
        document.addEventListener('callTerminated', () => this.onCallTerminated());
    }
    
    // Attach listeners to SIP manager events
    attachSipListeners() {
        const sipManager = window.App.managers.sip;
        if (!sipManager) {
            console.warn('[Busylight] SIP manager not available for event listeners');
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
    
    // Update state based on current system status
    async updateStateFromSystem() {
        if (!this.enabled || !this.connected) return;
        
        // Check if we have active calls
        if (window.App?.managers?.sip?.hasActiveSessions()) {
            const session = window.App.managers.sip.getCurrentSession();
            if (session) {
                if (session.onHold) {
                    await this.setState('hold');
                } else {
                    await this.setState('active');
                }
                return;
            }
        }
        
        // Check if agent is logged in
        if (window.App?.managers?.agent?.isLoggedIn) {
            await this.setState('idle');
            return;
        }
        
        // Check if SIP is registered
        if (window.App?.managers?.sip?.isRegistered()) {
            await this.setState('registered');
            return;
        }
        
        // Default to offline
        await this.setState('offline');
    }
    
    // Event handlers
    async onSipRegistered() {
        console.log('[Busylight] SIP registered');
        console.log('[Busylight] Enabled:', this.enabled, 'Connected:', this.connected);
        if (!this.enabled || !this.connected) {
            console.log('[Busylight] Skipping state update - not enabled or not connected');
            return;
        }
        
        // Check if agent is logged in
        const agentLoggedIn = window.App?.managers?.agent?.isLoggedIn;
        console.log('[Busylight] Agent logged in:', agentLoggedIn);
        if (agentLoggedIn) {
            console.log('[Busylight] Setting state to idle (agent logged in)');
            await this.setState('idle');
        } else {
            console.log('[Busylight] Setting state to registered (agent not logged in)');
            await this.setState('registered');
        }
    }
    
    async onSipUnregistered() {
        console.log('[Busylight] SIP unregistered');
        console.log('[Busylight] Enabled:', this.enabled, 'Connected:', this.connected);
        if (!this.enabled || !this.connected) {
            console.log('[Busylight] Skipping state update');
            return;
        }
        console.log('[Busylight] Setting state to offline');
        await this.setState('offline');
    }
    
    async onIncomingCall(session) {
        console.log('[Busylight] Incoming call');
        console.log('[Busylight] Enabled:', this.enabled, 'Connected:', this.connected);
        if (!this.enabled || !this.connected) {
            console.log('[Busylight] Skipping state update');
            return;
        }
        console.log('[Busylight] Setting state to ringing');
        await this.setState('ringing');
    }
    
    async onCallAnswered(session) {
        console.log('[Busylight] Call answered');
        console.log('[Busylight] Enabled:', this.enabled, 'Connected:', this.connected);
        if (!this.enabled || !this.connected) {
            console.log('[Busylight] Skipping state update');
            return;
        }
        console.log('[Busylight] Setting state to active');
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
        
        // Return to appropriate idle state
        if (window.App?.managers?.agent?.isLoggedIn) {
            await this.setState('idle');
        } else if (window.App?.managers?.sip?.isRegistered()) {
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
    
    // Listen for agent login/logout (called from agent-buttons.js)
    async onAgentLoggedIn() {
        console.log('[Busylight] Agent logged in');
        console.log('[Busylight] Enabled:', this.enabled, 'Connected:', this.connected);
        if (!this.enabled || !this.connected) {
            console.log('[Busylight] Skipping state update');
            return;
        }
        console.log('[Busylight] Setting state to idle (green)');
        await this.setState('idle');
    }
    
    async onAgentLoggedOut() {
        console.log('[Busylight] Agent logged out');
        console.log('[Busylight] Enabled:', this.enabled, 'Connected:', this.connected);
        if (!this.enabled || !this.connected) {
            console.log('[Busylight] Skipping state update');
            return;
        }
        
        // Return to registered state
        const isRegistered = window.App?.managers?.sip?.isRegistered();
        console.log('[Busylight] SIP registered:', isRegistered);
        if (isRegistered) {
            console.log('[Busylight] Setting state to registered (blue)');
            await this.setState('registered');
        } else {
            console.log('[Busylight] Setting state to offline (gray)');
            await this.setState('offline');
        }
    }

    // Disconnect and cleanup
    async disconnect() {
        console.log('[Busylight] Disconnecting...');
        
        // Stop flashing
        this.stopFlashing();
        
        // Stop monitoring
        this.stopMonitoring();
        
        if (this.connected) {
            try {
                await this.turnOff();
            } catch (error) {
                console.warn("[Busylight] Error turning off during disconnect:", error);
            }
        }
        
        this.connected = false;
        console.log("[Busylight] Disconnected");
    }

    // Set state and update busylight with appropriate lighting pattern
    async setState(state) {
        console.log(`[Busylight] Setting state to: ${state}`);
        this.currentCallState = state;
        
        if (!this.enabled || !this.connected) return;
        
        // Stop any existing flashing
        this.stopFlashing();

        const color = this.stateColors[state] || this.stateColors.offline;
        
        // Handle special flashing states
        if (state === 'ringing') {
            // Flash red for ringing
            await this.startFlashing(color, 500); // Flash every 500ms
        } else if (state === 'hold') {
            // Slow flash yellow for hold
            await this.startFlashing(color, 1500); // Flash every 1.5 seconds
        } else {
            // Solid color for other states
            await this.setColor(color);
        }
    }
    
    // Backward compatibility method
    async setCallState(state) {
        return this.setState(state);
    }

    // Set specific color
    async setColor({ red, green, blue }) {
        if (!this.enabled || !this.connected) return;
        return await this.setColorRGB(red, green, blue);
    }

    // Set color using RGB values (0-100 scale)
    async setColorRGB(red, green, blue) {
        if (!this.enabled || !this.connected) return false;

        try {
            // Use official Kuando API format (values 0-100)
            const url = `${this.baseUrl}?action=light&red=${red}&green=${green}&blue=${blue}`;
            const response = await fetch(url, {
                method: 'GET',
                signal: AbortSignal.timeout(2000)
            });

            if (response.ok) {
                return true;
            } else if (response.status === 404) {
                console.warn("[Busylight] Device not connected (404)");
                this.connected = false;
                return false;
            } else if (response.status === 401) {
                console.warn("[Busylight] HTTP token invalid (401)");
                this.connected = false;
                return false;
            } else {
                console.warn("[Busylight] Failed to set color:", response.status);
                return false;
            }

        } catch (error) {
            console.error("[Busylight] Error setting color:", error);
            this.connected = false;
            return false;
        }
    }

    // Set alert with sound
    async setAlert(red, green, blue, sound = 3, volume = 50) {
        if (!this.enabled || !this.connected) return false;

        try {
            // Use official Kuando alert API
            const url = `${this.baseUrl}?action=alert&red=${red}&green=${green}&blue=${blue}&sound=${sound}&volume=${volume}`;
            const response = await fetch(url, {
                method: 'GET',
                signal: AbortSignal.timeout(2000)
            });

            return response.ok;
        } catch (error) {
            console.error("[Busylight] Error setting alert:", error);
            this.connected = false;
            return false;
        }
    }

    // Set blink pattern
    async setBlink(red, green, blue, ontime = 5, offtime = 5) {
        if (!this.enabled || !this.connected) return false;

        try {
            // Use official Kuando blink API (ontime/offtime in 0.1 second steps)
            const url = `${this.baseUrl}?action=blink&red=${red}&green=${green}&blue=${blue}&ontime=${ontime}&offtime=${offtime}`;
            const response = await fetch(url, {
                method: 'GET',
                signal: AbortSignal.timeout(2000)
            });

            return response.ok;
        } catch (error) {
            console.error("[Busylight] Error setting blink:", error);
            this.connected = false;
            return false;
        }
    }
    
    // Turn light off
    async turnOff() {
        if (!this.connected) return;
        
        try {
            // Use official Kuando off command
            const url = `${this.baseUrl}?action=off`;
            const response = await fetch(url, {
                method: 'GET',
                signal: AbortSignal.timeout(2000)
            });
            return response.ok;
        } catch (error) {
            console.warn("[Busylight] Failed to turn off:", error);
            return false;
        }
    }
    
    // Start flashing with specified color and interval
    async startFlashing(color, intervalMs = 500) {
        if (!this.enabled || !this.connected || this.isFlashing) return;
        
        console.log(`[Busylight] Starting flash pattern (${intervalMs}ms interval)`);
        this.isFlashing = true;
        
        let isOn = true;
        
        // Set initial color
        await this.setColor(color);
        
        // Setup flashing interval
        this.flashingInterval = setInterval(async () => {
            if (!this.enabled || !this.connected) {
                this.stopFlashing();
                return;
            }
            
            if (isOn) {
                await this.turnOff();
            } else {
                await this.setColor(color);
            }
            isOn = !isOn;
        }, intervalMs);
    }
    
    // Stop flashing
    stopFlashing() {
        if (this.flashingInterval) {
            clearInterval(this.flashingInterval);
            this.flashingInterval = null;
            this.isFlashing = false;
            console.log('[Busylight] Stopped flashing');
        }
    }

    // Handle voicemail notifications
    async handleVoicemailNotification(newCount, oldCount) {
        if (newCount > this.lastVoicemailCount) {
            // New voicemail - flash blue
            await this.flashColor(this.stateColors.voicemail, 3);
            this.lastVoicemailCount = newCount;
        } else if (newCount === 0) {
            // No voicemails - return to current call state
            await this.setCallState(this.currentCallState);
            this.lastVoicemailCount = 0;
        }
    }

    // Flash color a specified number of times
    async flashColor(color, times = 3, duration = 500) {
        if (!this.connected) return;

        const originalColor = this.stateColors[this.currentCallState];

        for (let i = 0; i < times; i++) {
            await this.setColor(color);
            await this.sleep(duration);
            await this.setColor(originalColor);
            await this.sleep(duration);
        }
    }

    // Start monitoring busylight connection
    startMonitoring() {
        if (this.monitoringInterval) return;

        this.monitoringInterval = setInterval(async () => {
            if (!this.enabled) {
                this.stopMonitoring();
                return;
            }

            const wasConnected = this.connected;
            const isConnected = await this.checkConnection();

            if (!wasConnected && isConnected) {
                console.log("[Busylight] Kuando Busylight reconnected");
                await this.updateStateFromSystem();
            } else if (wasConnected && !isConnected) {
                console.warn("[Busylight] Kuando Busylight disconnected");
                this.showConnectionError();
            }
        }, 15000); // Check every 15 seconds
    }

    // Stop monitoring
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            console.log("Busylight monitoring stopped");
        }
    }

    // Toggle busylight on/off
    async toggle() {
        this.enabled = !this.enabled;
        this.saveSettings();

        if (this.enabled) {
            console.log("[Busylight] Enabled");
            const connected = await this.initialize();
            if (!connected) {
                this.showConfigDialog();
            }
        } else {
            console.log("[Busylight] Disabled");
            await this.disconnect();
        }

        return this.enabled;
    }
    
    // Enable/disable based on settings
    async setEnabled(enabled) {
        if (this.enabled === enabled) return;
        
        this.enabled = enabled;
        this.saveSettings();
        
        if (enabled) {
            await this.initialize();
        } else {
            await this.disconnect();
        }
    }

    // Show connection error dialog
    showConnectionError() {
        if (!this.enabled) return;
        
        if (window.Alert && window.Confirm) {
            Alert(
                `Busylight service is not responding at:\n${this.baseUrl}\n\nPlease check that the Kuando HTTP server is running.`,
                "Busylight Connection Error",
                () => {
                    // Offer to retry connection
                    Confirm(
                        "Would you like to retry the connection?",
                        "Retry Connection",
                        async () => {
                            await this.initialize();
                        },
                        () => {
                            // Offer to configure URL
                            this.showConfigDialog();
                        }
                    );
                }
            );
        }
    }

    // Show configuration dialog
    showConfigDialog() {
        if (this.configDialog) {
            this.configDialog.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'busylight-config-modal';
        
        modal.innerHTML = `
            <h3>Busylight Configuration</h3>
            <p>Configure your Kuando Busylight settings:</p>
            <div class="busylight-form-group">
                <label>Busylight Service URL:</label>
                <input id="busylight-url" type="text" value="${this.baseUrl || 'http://localhost:8989'}" 
                       placeholder="http://localhost:8989" />
                <div class="busylight-help-text">Default: http://localhost:8989</div>
            </div>
            <div class="busylight-form-group">
                <label><input type="checkbox" id="busylight-enabled" ${this.enabled ? 'checked' : ''}> Enable Busylight</label>
            </div>
            <div class="busylight-form-group">
                <label>Device Information:</label>
                <div id="device-info">
                    Loading device info...
                </div>
            </div>
            <div class="busylight-actions">
                <button id="busylight-test">Test Connection</button>
                <span id="busylight-status"></span>
            </div>
            <div class="busylight-footer">
                <button id="busylight-save">Save</button>
                <button id="busylight-cancel">Cancel</button>
            </div>
        `;

        document.body.appendChild(modal);
        this.configDialog = modal;

        // Load device info when dialog opens
        this.loadDeviceInfo();

        // Event handlers
        document.getElementById('busylight-test').onclick = async () => {
            const url = document.getElementById('busylight-url').value;
            const status = document.getElementById('busylight-status');
            
            status.textContent = 'Testing...';
            status.className = 'busylight-status-testing';

            try {
                const response = await fetch(`${url}?action=currentpresence`, {
                    method: 'GET',
                    signal: AbortSignal.timeout(3000)
                });

                if (response.ok) {
                    status.textContent = 'Connection successful!';
                    status.className = 'busylight-status-success';
                    
                    // Flash green to indicate success
                    await fetch(`${url}?action=light&red=0&green=100&blue=0`, {
                        method: 'GET'
                    });
                    setTimeout(() => fetch(`${url}?action=off`, {
                        method: 'GET'
                    }), 2000);
                    
                    // Reload device info
                    await this.loadDeviceInfo();
                } else {
                    status.textContent = `Connection failed: HTTP ${response.status}`;
                    status.className = 'busylight-status-error';
                }
            } catch (error) {
                status.textContent = `Connection failed: ${error.message}`;
                status.className = 'busylight-status-error';
            }
        };

        document.getElementById('busylight-save').onclick = async () => {
            this.baseUrl = document.getElementById('busylight-url').value;
            this.enabled = document.getElementById('busylight-enabled').checked;
            this.saveSettings();

            if (this.enabled) {
                await this.initialize();
            } else {
                await this.disconnect();
            }

            modal.remove();
            this.configDialog = null;
        };

        document.getElementById('busylight-cancel').onclick = () => {
            modal.remove();
            this.configDialog = null;
        };
    }

    // Load device information into config dialog
    async loadDeviceInfo() {
        const deviceInfoEl = document.getElementById('device-info');
        if (!deviceInfoEl) return;

        try {
            const devices = await this.getDevices();
            let deviceHtml = "";

            if (devices && devices.length > 0) {
                deviceHtml = `Found ${devices.length} device(s):<br/>`;
                devices.forEach((device, index) => {
                    deviceHtml += `${index + 1}. ${device.ModelName || device.ProductID || 'Unknown'}<br/>`;
                    if (device.UniqueID) deviceHtml += `   ID: ${device.UniqueID}<br/>`;
                });
            } else {
                deviceHtml = "No devices found.<br/>Check that device is connected and service is running.";
            }

            deviceInfoEl.innerHTML = deviceHtml;
        } catch (error) {
            deviceInfoEl.innerHTML = "Unable to retrieve device information.<br/>" + error.message;
        }
    }

    // Helper method for delays
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Get current status
    getStatus() {
        return {
            enabled: this.enabled,
            connected: this.connected,
            callState: this.currentCallState,
            baseUrl: this.baseUrl
        };
    }
}

// Export for use in other files
window.BusylightManager = BusylightManager;

// Debug helper functions for console testing
window.testBusylight = async function() {
    console.group('🔍 Busylight Diagnostic');
    
    const manager = window.App?.managers?.busylight;
    if (!manager) {
        console.error('❌ Busylight manager not found');
        console.groupEnd();
        return;
    }
    
    console.log('Manager found:', manager.constructor.name);
    console.log('Enabled:', manager.enabled);
    console.log('Connected:', manager.connected);
    console.log('Base URL:', manager.baseUrl);
    console.log('Current State:', manager.currentCallState);
    console.log('Is Flashing:', manager.isFlashing);
    
    // Test connection
    if (manager.baseUrl) {
        console.log('\n📡 Testing connection to', manager.baseUrl);
        try {
            await fetch(`${manager.baseUrl}/?action=busylightdevices`, {
                method: 'GET',
                mode: 'no-cors',
                signal: AbortSignal.timeout(3000)
            });
            console.log('Connection: ✅ SUCCESS (using no-cors mode)');
            console.log('Note: With no-cors mode, we cannot read response status');
            console.log('      If no error thrown, connection is working');
        } catch (error) {
            console.error('Connection: ❌ FAILED -', error.message);
        }
    }
    
    // Check event listeners
    console.log('\n📋 Checking SIP manager event listeners...');
    const sipManager = window.App?.managers?.sip;
    if (sipManager && sipManager.eventHandlers) {
        const busylightEvents = ['registered', 'unregistered', 'incomingCall', 'sessionAnswered', 'sessionTerminated'];
        busylightEvents.forEach(event => {
            const handlers = sipManager.eventHandlers[event];
            console.log(`  ${event}:`, handlers ? `${handlers.length} handlers` : 'No handlers');
        });
    }
    
    // Check agent manager
    console.log('\n👤 Checking agent status...');
    const agentManager = window.App?.managers?.agent;
    if (agentManager) {
        console.log('Agent logged in:', agentManager.isLoggedIn);
        console.log('Agent paused:', agentManager.isPaused);
        console.log('Agent number:', agentManager.currentAgentNumber);
    } else {
        console.log('Agent manager not found');
    }
    
    // Test device listing
    console.log('\n📟 Checking connected devices...');
    try {
        const devices = await manager.getDevices();
        if (devices && devices.length > 0) {
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
window.testBusylightRed = () => window.App?.managers?.busylight?.setColor({red: 100, green: 0, blue: 0});
window.testBusylightGreen = () => window.App?.managers?.busylight?.setColor({red: 0, green: 100, blue: 0});
window.testBusylightBlue = () => window.App?.managers?.busylight?.setColor({red: 0, green: 0, blue: 100});
window.testBusylightOff = () => window.App?.managers?.busylight?.turnOff();

console.log('💡 Busylight debug functions loaded:');
console.log('  - testBusylight() - Full diagnostic');
console.log('  - testBusylightRed() - Test red color');
console.log('  - testBusylightGreen() - Test green color');
console.log('  - testBusylightBlue() - Test blue color');
console.log('  - testBusylightOff() - Turn off');