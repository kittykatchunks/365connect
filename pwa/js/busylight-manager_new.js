/**
 * BusylightManager - Updated to work with Busylight Bridge
 * 
 * This version connects through the local Busylight Bridge service
 * which handles CORS and proxies requests to kuandoHUB.
 * 
 * Connection methods (in order of preference):
 * 1. WebSocket (ws://127.0.0.1:19774/ws) - Real-time, recommended
 * 2. HTTP Bridge (http://127.0.0.1:19774/kuando) - Fallback
 * 3. Direct (http://127.0.0.1:8989) - Only works in Electron/desktop apps
 */

class BusylightManager {
    constructor() {
        this.enabled = false;
        this.connected = false;
        this.bridgeConnected = false;
        this.kuandoConnected = false;
        
        // Connection settings
        this.bridgeUrl = 'http://127.0.0.1:19774';
        this.bridgeWsUrl = 'ws://localhost:19774/ws';
        this.directUrl = 'http://127.0.0.1:8989';  // Direct kuandoHUB (fallback)
        
        // Computed baseUrl for API calls
        this.baseUrl = null;
        this.useWebSocket = true;
        
        // WebSocket connection
        this.ws = null;
        this.wsReconnectInterval = null;
        this.wsReconnectDelay = 5000;
        
        // State tracking
        this.monitoringInterval = null;
        this.lastVoicemailCount = 0;
        this.currentCallState = 'offline';
        this.configDialog = null;
        this.flashingInterval = null;
        this.isFlashing = false;
        
        // Load settings from localStorage
        this.loadSettings();
        
        // State color mappings (0-100 scale for Kuando API)
        this.stateColors = {
            'offline': { red: 50, green: 50, blue: 50 },     // Gray - not registered
            'registered': { red: 0, green: 0, blue: 100 },   // Blue - registered but not logged in
            'idle': { red: 0, green: 100, blue: 0 },         // Green - logged in and idle
            'ringing': { red: 100, green: 0, blue: 0 },      // Red - incoming call (will flash)
            'active': { red: 100, green: 0, blue: 0 },       // Red - active call
            'hold': { red: 100, green: 100, blue: 0 },       // Yellow - on hold (will flash slowly)
            'voicemail': { red: 0, green: 0, blue: 100 }     // Blue - voicemail notification
        };
    }

    // Load settings from localStorage
    loadSettings() {
        this.enabled = (window.localDB?.getItem("BusylightEnabled", "0") === "1");
        this.useWebSocket = (window.localDB?.getItem("BusylightUseWebSocket", "1") === "1");
        
        // Migration from old settings
        const oldUrl = window.localDB?.getItem("BusylightUrl", "");
        if (oldUrl && oldUrl.includes(':8989')) {
            console.log("[Busylight] Migrating from direct connection to bridge");
            window.localDB?.setItem("BusylightUseBridge", "1");
        }
    }

    // Save settings to localStorage
    saveSettings() {
        window.localDB?.setItem("BusylightEnabled", this.enabled ? "1" : "0");
        window.localDB?.setItem("BusylightUseWebSocket", this.useWebSocket ? "1" : "0");
    }

    // Initialize busylight connection
    async initialize() {
        console.log('[Busylight] Initializing Kuando Busylight service...');
        console.log('[Busylight] Enabled:', this.enabled);
        console.log('[Busylight] Use WebSocket:', this.useWebSocket);
        
        // Setup event listeners regardless of enabled state
        this.setupEventListeners();
        
        if (!this.enabled) {
            console.log("[Busylight] Disabled in settings - skipping connection");
            return false;
        }

        // Try WebSocket connection first (preferred)
        if (this.useWebSocket) {
            const wsConnected = await this.connectWebSocket();
            if (wsConnected) {
                this.baseUrl = `${this.bridgeUrl}/kuando`;
                await this.updateStateFromSystem();
                return true;
            }
        }
        
        // Fall back to HTTP bridge
        const bridgeConnected = await this.checkBridgeConnection();
        if (bridgeConnected) {
            this.baseUrl = `${this.bridgeUrl}/kuando`;
            await this.testConnection();
            this.startMonitoring();
            await this.updateStateFromSystem();
            return true;
        }
        
        // Last resort: try direct connection (only works in certain environments)
        const directConnected = await this.checkDirectConnection();
        if (directConnected) {
            this.baseUrl = this.directUrl;
            console.log('[Busylight] Using direct connection (no bridge)');
            await this.testConnection();
            this.startMonitoring();
            await this.updateStateFromSystem();
            return true;
        }
        
        this.showConnectionError();
        return false;
    }

    // Connect via WebSocket
    async connectWebSocket() {
        return new Promise((resolve) => {
            try {
                console.log(`[Busylight] Connecting WebSocket to ${this.bridgeWsUrl}`);
                
                this.ws = new WebSocket(this.bridgeWsUrl);
                
                const timeout = setTimeout(() => {
                    if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
                        this.ws.close();
                        resolve(false);
                    }
                }, 3000);
                
                this.ws.onopen = () => {
                    clearTimeout(timeout);
                    console.log('[Busylight] WebSocket connected');
                    this.bridgeConnected = true;
                    this.connected = true;
                    
                    // Clear any reconnect interval
                    if (this.wsReconnectInterval) {
                        clearInterval(this.wsReconnectInterval);
                        this.wsReconnectInterval = null;
                    }
                    
                    resolve(true);
                };
                
                this.ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        this.handleWebSocketMessage(data);
                    } catch (err) {
                        console.error('[Busylight] WS message parse error:', err);
                    }
                };
                
                this.ws.onclose = () => {
                    console.log('[Busylight] WebSocket disconnected');
                    this.bridgeConnected = false;
                    this.scheduleReconnect();
                };
                
                this.ws.onerror = (err) => {
                    clearTimeout(timeout);
                    console.warn('[Busylight] WebSocket error:', err);
                    resolve(false);
                };
                
            } catch (err) {
                console.warn('[Busylight] WebSocket connection failed:', err);
                resolve(false);
            }
        });
    }

    // Handle incoming WebSocket messages
    handleWebSocketMessage(data) {
        console.log('[Busylight] WS message:', data);
        
        switch (data.type) {
            case 'connected':
                this.kuandoConnected = data.kuandoHub;
                console.log(`[Busylight] Bridge reports kuandoHub: ${data.kuandoHub}`);
                break;
                
            case 'kuandoStatus':
                this.kuandoConnected = data.connected;
                if (!data.connected) {
                    console.warn('[Busylight] kuandoHub disconnected');
                }
                break;
                
            case 'response':
                // Command response - could trigger callbacks if needed
                break;
                
            case 'error':
                console.error('[Busylight] Bridge error:', data.error);
                break;
        }
    }

    // Schedule WebSocket reconnection
    scheduleReconnect() {
        if (this.wsReconnectInterval) return;
        
        if (this.enabled) {
            console.log(`[Busylight] Scheduling reconnect in ${this.wsReconnectDelay}ms`);
            this.wsReconnectInterval = setInterval(async () => {
                if (!this.bridgeConnected && this.enabled) {
                    console.log('[Busylight] Attempting reconnect...');
                    await this.connectWebSocket();
                }
            }, this.wsReconnectDelay);
        }
    }

    // Send command via WebSocket
    sendWsCommand(action, params = {}) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const cmd = { action, ...params };
            this.ws.send(JSON.stringify(cmd));
            return true;
        }
        return false;
    }

    // Check bridge HTTP connection
    async checkBridgeConnection() {
        try {
            const response = await fetch(`${this.bridgeUrl}/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(3000)
            });
            
            if (response.ok) {
                const data = await response.json();
                this.bridgeConnected = true;
                this.kuandoConnected = data.kuandoHub === 'connected';
                console.log('[Busylight] Bridge connected, kuandoHub:', data.kuandoHub);
                return this.kuandoConnected;
            }
        } catch (err) {
            console.warn('[Busylight] Bridge not available:', err.message);
        }
        
        this.bridgeConnected = false;
        return false;
    }

    // Check direct kuandoHUB connection (fallback)
    async checkDirectConnection() {
        try {
            const response = await fetch(`${this.directUrl}?action=currentpresence`, {
                method: 'GET',
                signal: AbortSignal.timeout(3000)
            });
            
            if (response.ok) {
                console.log('[Busylight] Direct kuandoHUB connection available');
                this.connected = true;
                return true;
            }
        } catch (err) {
            // CORS will likely block this in a web context
            console.warn('[Busylight] Direct connection not available (expected in web context)');
        }
        
        return false;
    }

    // Get list of connected devices
    async getDevices() {
        // Try WebSocket first
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return new Promise((resolve) => {
                const handler = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.type === 'response' && data.action === 'devices') {
                            this.ws.removeEventListener('message', handler);
                            resolve(data.devices || []);
                        }
                    } catch (err) {
                        // Ignore parse errors
                    }
                };
                
                this.ws.addEventListener('message', handler);
                this.sendWsCommand('devices');
                
                // Timeout after 2 seconds
                setTimeout(() => {
                    this.ws.removeEventListener('message', handler);
                    resolve([]);
                }, 2000);
            });
        }
        
        // Fall back to HTTP
        try {
            const url = `${this.baseUrl}?action=busylightdevices`;
            const response = await fetch(url, {
                method: 'GET',
                signal: AbortSignal.timeout(2000)
            });
            
            if (response.ok) {
                return await response.json();
            }
        } catch (err) {
            console.warn('[Busylight] Error getting devices:', err.message);
        }
        
        return [];
    }

    // Set color using RGB values (0-100 scale)
    async setColorRGB(red, green, blue) {
        // Try WebSocket first
        if (this.sendWsCommand('light', { red, green, blue })) {
            return true;
        }
        
        // Fall back to HTTP
        try {
            const url = `${this.baseUrl}?action=light&red=${red}&green=${green}&blue=${blue}`;
            const response = await fetch(url, {
                method: 'GET',
                signal: AbortSignal.timeout(2000)
            });
            return response.ok;
        } catch (err) {
            console.error('[Busylight] Error setting color:', err.message);
            return false;
        }
    }

    // Set color from state object
    async setColor(colorObj) {
        return await this.setColorRGB(colorObj.red, colorObj.green, colorObj.blue);
    }

    // Turn off the light
    async turnOff() {
        this.stopFlashing();
        
        // Try WebSocket first
        if (this.sendWsCommand('off')) {
            return true;
        }
        
        // Fall back to HTTP
        try {
            const url = `${this.baseUrl}?action=off`;
            const response = await fetch(url, {
                method: 'GET',
                signal: AbortSignal.timeout(2000)
            });
            return response.ok;
        } catch (err) {
            console.error('[Busylight] Error turning off:', err.message);
            return false;
        }
    }

    // Start flashing with specified color and interval
    startFlashing(colorObj, interval = 500) {
        this.stopFlashing();
        this.isFlashing = true;
        
        let isOn = true;
        this.flashingInterval = setInterval(async () => {
            if (isOn) {
                await this.setColor(colorObj);
            } else {
                await this.setColorRGB(0, 0, 0);
            }
            isOn = !isOn;
        }, interval);
    }

    // Stop flashing
    stopFlashing() {
        if (this.flashingInterval) {
            clearInterval(this.flashingInterval);
            this.flashingInterval = null;
        }
        this.isFlashing = false;
    }

    // ============================================================
    // COMPATIBILITY METHODS - These were missing from the new class
    // ============================================================

    /**
     * setState - Backward compatibility method used by phone.js
     * Maps to updateCallState internally
     */
    async setState(state) {
        console.log(`[Busylight] setState called with: ${state}`);
        return await this.updateCallState(state);
    }

    /**
     * setCallState - Backward compatibility alias for setState
     */
    async setCallState(state) {
        return await this.setState(state);
    }

    /**
     * setEnabled - Enable/disable busylight based on settings
     * This method was missing from the new class
     */
    async setEnabled(enabled) {
        console.log(`[Busylight] setEnabled called: ${enabled}`);
        
        if (this.enabled === enabled) {
            console.log('[Busylight] Enabled state unchanged, skipping');
            return;
        }
        
        this.enabled = enabled;
        this.saveSettings();
        
        if (enabled) {
            console.log('[Busylight] Enabling and initializing...');
            await this.initialize();
        } else {
            console.log('[Busylight] Disabling and disconnecting...');
            await this.disconnect();
        }
    }

    /**
     * isEnabled - Check if busylight is enabled
     */
    isEnabled() {
        return this.enabled;
    }

    // ============================================================
    // END COMPATIBILITY METHODS
    // ============================================================

    // Update state based on call status
    async updateCallState(state) {
        if (!this.enabled || !this.connected) return;
        
        console.log(`[Busylight] State change: ${this.currentCallState} -> ${state}`);
        this.currentCallState = state;
        
        this.stopFlashing();
        
        switch (state) {
            case 'ringing':
                // Use WebSocket high-level command if available
                if (this.sendWsCommand('ringing', { sound: false })) {
                    return;
                }
                this.startFlashing(this.stateColors.ringing, 500);
                break;
                
            case 'hold':
                this.startFlashing(this.stateColors.hold, 1000);  // Slower flash
                break;
                
            case 'active':
                if (this.sendWsCommand('busy')) {
                    return;
                }
                await this.setColor(this.stateColors.active);
                break;
                
            case 'idle':
                if (this.sendWsCommand('available')) {
                    return;
                }
                await this.setColor(this.stateColors.idle);
                break;
                
            case 'registered':
                await this.setColor(this.stateColors.registered);
                break;
                
            case 'offline':
                await this.turnOff();
                break;
                
            default:
                if (this.stateColors[state]) {
                    await this.setColor(this.stateColors[state]);
                }
        }
    }

    // Setup SIP event listeners
    setupEventListeners() {
        const sipManager = window.App?.managers?.sip;
        if (!sipManager) {
            console.warn('[Busylight] SIP manager not found - will retry');
            setTimeout(() => this.setupEventListeners(), 1000);
            return;
        }
        
        // SIP registration events
        sipManager.on('registered', () => {
            const agentManager = window.App?.managers?.agent;
            if (agentManager?.isLoggedIn) {
                this.updateCallState('idle');
            } else {
                this.updateCallState('registered');
            }
        });
        
        sipManager.on('unregistered', () => {
            this.updateCallState('offline');
        });
        
        // Call events
        sipManager.on('incomingCall', () => {
            this.updateCallState('ringing');
        });
        
        sipManager.on('sessionAnswered', () => {
            this.updateCallState('active');
        });
        
        sipManager.on('sessionTerminated', () => {
            const agentManager = window.App?.managers?.agent;
            if (agentManager?.isLoggedIn) {
                this.updateCallState('idle');
            } else if (sipManager.isRegistered) {
                this.updateCallState('registered');
            } else {
                this.updateCallState('offline');
            }
        });
        
        sipManager.on('hold', () => {
            this.updateCallState('hold');
        });
        
        sipManager.on('unhold', () => {
            this.updateCallState('active');
        });
        
        // Agent events
        const agentManager = window.App?.managers?.agent;
        if (agentManager) {
            agentManager.on('loggedIn', () => {
                this.updateCallState('idle');
            });
            
            agentManager.on('loggedOut', () => {
                if (sipManager?.isRegistered) {
                    this.updateCallState('registered');
                }
            });
        }
        
        console.log('[Busylight] Event listeners attached');
    }

    // Update state from current system status
    async updateStateFromSystem() {
        const sipManager = window.App?.managers?.sip;
        const agentManager = window.App?.managers?.agent;
        
        if (!sipManager?.isRegistered) {
            await this.updateCallState('offline');
        } else if (agentManager?.isLoggedIn) {
            await this.updateCallState('idle');
        } else {
            await this.updateCallState('registered');
        }
    }

    // Test connection with color sequence
    async testConnection() {
        if (!this.connected && !this.bridgeConnected) return;
        
        try {
            console.log("[Busylight] Testing connection with color sequence...");
            
            const colors = [
                { red: 100, green: 0, blue: 0 },
                { red: 0, green: 100, blue: 0 },
                { red: 0, green: 0, blue: 100 },
            ];
            
            for (let color of colors) {
                await this.setColor(color);
                await this.sleep(300);
            }
            
            await this.turnOff();
            console.log("[Busylight] Connection test complete");
            
        } catch (error) {
            console.error("[Busylight] Error testing connection:", error);
        }
    }

    // Start periodic monitoring
    startMonitoring() {
        if (this.monitoringInterval) return;
        
        this.monitoringInterval = setInterval(async () => {
            // Periodically check connection status
            if (!this.bridgeConnected && !this.ws) {
                await this.checkBridgeConnection();
            }
        }, 30000);
    }

    // Disconnect and cleanup
    async disconnect() {
        console.log('[Busylight] Disconnecting...');
        
        this.stopFlashing();
        await this.turnOff();
        
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        
        if (this.wsReconnectInterval) {
            clearInterval(this.wsReconnectInterval);
            this.wsReconnectInterval = null;
        }
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        this.connected = false;
        this.bridgeConnected = false;
    }

    // Show connection error dialog
    showConnectionError() {
        if (window.Alert) {
            Alert(
                "Could not connect to Busylight.\n\n" +
                "Please ensure:\n" +
                "1. Busylight Bridge is running (check system tray)\n" +
                "2. kuandoHUB or Kuando HTTP is installed\n" +
                "3. Busylight device is connected via USB",
                "Busylight Connection Error"
            );
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
            bridgeConnected: this.bridgeConnected,
            kuandoConnected: this.kuandoConnected,
            websocket: this.ws?.readyState === WebSocket.OPEN,
            callState: this.currentCallState,
            baseUrl: this.baseUrl
        };
    }

    // Configuration dialog
    showConfigDialog() {
        if (this.configDialog) {
            this.configDialog.remove();
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 450px;">
                <div class="modal-header">
                    <h3>Busylight Configuration</h3>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="busylight-enabled" ${this.enabled ? 'checked' : ''}>
                            Enable Busylight
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="busylight-websocket" ${this.useWebSocket ? 'checked' : ''}>
                            Use WebSocket (recommended)
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label>Connection Status:</label>
                        <div id="busylight-status" style="padding: 10px; background: #f5f5f5; border-radius: 4px; font-family: monospace; font-size: 12px;">
                            Checking...
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Devices:</label>
                        <div id="device-info" style="padding: 10px; background: #f5f5f5; border-radius: 4px; font-size: 12px;">
                            Checking...
                        </div>
                    </div>
                    
                    <p style="font-size: 12px; color: #666; margin-top: 15px;">
                        <strong>Note:</strong> Requires Busylight Bridge app to be running.<br>
                        <a href="#" id="download-bridge">Download Busylight Bridge</a>
                    </p>
                </div>
                <div class="modal-footer">
                    <button id="busylight-test" class="btn btn-secondary">Test Connection</button>
                    <button id="busylight-cancel" class="btn btn-secondary">Cancel</button>
                    <button id="busylight-save" class="btn btn-primary">Save</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.configDialog = modal;
        
        // Load status
        this.updateConfigStatus();
        
        // Event handlers
        document.getElementById('busylight-test').onclick = async () => {
            const statusEl = document.getElementById('busylight-status');
            statusEl.textContent = 'Testing...';
            statusEl.style.color = '#ffc107';
            
            const bridgeOk = await this.checkBridgeConnection();
            
            if (bridgeOk) {
                statusEl.innerHTML = '✓ Bridge: Connected<br>✓ kuandoHub: Connected';
                statusEl.style.color = '#28a745';
                
                // Flash green
                await this.setColorRGB(0, 100, 0);
                setTimeout(() => this.turnOff(), 2000);
                
                // Reload device info
                await this.loadDeviceInfo();
            } else {
                statusEl.innerHTML = '✗ Bridge: Not running<br><br>Please install and run Busylight Bridge';
                statusEl.style.color = '#dc3545';
            }
        };
        
        document.getElementById('busylight-save').onclick = async () => {
            this.enabled = document.getElementById('busylight-enabled').checked;
            this.useWebSocket = document.getElementById('busylight-websocket').checked;
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

    async updateConfigStatus() {
        const statusEl = document.getElementById('busylight-status');
        if (!statusEl) return;
        
        const bridgeOk = await this.checkBridgeConnection();
        
        if (bridgeOk) {
            statusEl.innerHTML = `✓ Bridge: Connected<br>✓ kuandoHub: ${this.kuandoConnected ? 'Connected' : 'Disconnected'}`;
            statusEl.style.color = this.kuandoConnected ? '#28a745' : '#ffc107';
        } else {
            statusEl.innerHTML = '✗ Bridge: Not running';
            statusEl.style.color = '#dc3545';
        }
        
        await this.loadDeviceInfo();
    }

    async loadDeviceInfo() {
        const deviceInfoEl = document.getElementById('device-info');
        if (!deviceInfoEl) return;
        
        try {
            const devices = await this.getDevices();
            
            if (devices && devices.length > 0) {
                let html = `Found ${devices.length} device(s):<br>`;
                devices.forEach((device, index) => {
                    html += `${index + 1}. ${device.ModelName || device.ProductID || 'Unknown'}<br>`;
                });
                deviceInfoEl.innerHTML = html;
            } else {
                deviceInfoEl.innerHTML = 'No devices found';
            }
        } catch (err) {
            deviceInfoEl.innerHTML = 'Unable to retrieve device information';
        }
    }
}

// Export for use in other files
window.BusylightManager = BusylightManager;

// Debug helpers
window.testBusylight = async function() {
    console.group('🔍 Busylight Diagnostic');
    
    const manager = window.App?.managers?.busylight;
    if (!manager) {
        console.error('❌ Busylight manager not found');
        console.groupEnd();
        return;
    }
    
    const status = manager.getStatus();
    console.log('Status:', status);
    
    console.groupEnd();
    return status;
};

// Quick test functions for console
window.testBusylightRed = () => window.App?.managers?.busylight?.setColor({red: 100, green: 0, blue: 0});
window.testBusylightGreen = () => window.App?.managers?.busylight?.setColor({red: 0, green: 100, blue: 0});
window.testBusylightBlue = () => window.App?.managers?.busylight?.setColor({red: 0, green: 0, blue: 100});
window.testBusylightOff = () => window.App?.managers?.busylight?.turnOff();

console.log('💡 Busylight Manager loaded (Bridge-enabled version with compatibility methods)');
console.log('  - setState() - Backward compatible method');
console.log('  - setEnabled() - Enable/disable busylight');
console.log('  - testBusylight() - Full diagnostic');
console.log('  - testBusylightRed/Green/Blue/Off() - Quick tests');
