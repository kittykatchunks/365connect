const { app, Tray, Menu, nativeImage, dialog, shell } = require('electron');
const path = require('path');
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const fetch = require('node-fetch');
const fs = require('fs');
const AutoLaunch = require('auto-launch');

// Configuration
const CONFIG_FILE = path.join(app.getPath('userData'), 'config.json');
const DEFAULT_CONFIG = {
    bridgePort: 19774,
    kuandoHubUrl: 'http://127.0.0.1:8989',
    autoStart: true,
    minimizeToTray: true,
    showNotifications: true
};

let config = { ...DEFAULT_CONFIG };
let tray = null;
let server = null;
let wss = null;
let isConnected = false;
let lastKnownState = 'offline';
let connectedClients = new Set();

// Auto-launch configuration
const autoLauncher = new AutoLaunch({
    name: 'Busylight Bridge',
    path: app.getPath('exe')
});

// Load configuration
function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const data = fs.readFileSync(CONFIG_FILE, 'utf8');
            config = { ...DEFAULT_CONFIG, ...JSON.parse(data) };
        }
    } catch (err) {
        console.error('Error loading config:', err);
    }
}

// Save configuration
function saveConfig() {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    } catch (err) {
        console.error('Error saving config:', err);
    }
}

// Create tray icons
function createTrayIcon(state) {
    const iconSize = 16;
    const colors = {
        connected: '#00ff00',
        disconnected: '#888888',
        busy: '#ff0000',
        ringing: '#ff0000',
        error: '#ff6600'
    };
    
    // Create a simple colored circle icon
    const color = colors[state] || colors.disconnected;
    
    // Use a simple PNG approach - create data URL
    const svg = `
        <svg width="${iconSize}" height="${iconSize}" xmlns="http://www.w3.org/2000/svg">
            <circle cx="${iconSize/2}" cy="${iconSize/2}" r="${iconSize/2 - 1}" fill="${color}" stroke="#333" stroke-width="1"/>
        </svg>
    `;
    
    // For simplicity, we'll use static icon files
    // In production, include actual .ico/.png files
    const iconPath = path.join(__dirname, 'assets', `icon-${state}.png`);
    
    if (fs.existsSync(iconPath)) {
        return nativeImage.createFromPath(iconPath);
    }
    
    // Fallback to default icon
    const defaultIcon = path.join(__dirname, 'assets', 'icon-default.png');
    if (fs.existsSync(defaultIcon)) {
        return nativeImage.createFromPath(defaultIcon);
    }
    
    // Create a simple 16x16 icon programmatically
    return nativeImage.createEmpty();
}

// Update tray icon and tooltip
function updateTrayStatus(state, tooltip) {
    if (!tray) return;
    
    lastKnownState = state;
    
    const statusText = {
        connected: 'Connected - Ready',
        disconnected: 'Disconnected',
        busy: 'On Call',
        ringing: 'Incoming Call',
        error: 'Connection Error'
    };
    
    tray.setToolTip(`Busylight Bridge\n${statusText[state] || state}\nClients: ${connectedClients.size}`);
    
    // Update icon if we have state-specific icons
    const icon = createTrayIcon(state);
    if (icon && !icon.isEmpty()) {
        tray.setImage(icon);
    }
}

// Check Kuando Hub connection
async function checkKuandoConnection() {
    try {
        const response = await fetch(`${config.kuandoHubUrl}?action=currentpresence`, {
            method: 'GET',
            timeout: 3000
        });
        
        if (response.ok) {
            isConnected = true;
            return true;
        }
    } catch (err) {
        // Silently fail - kuandoHUB might not be running
    }
    
    isConnected = false;
    return false;
}

// Get connected Busylight devices
async function getDevices() {
    try {
        const response = await fetch(`${config.kuandoHubUrl}?action=busylightdevices`, {
            method: 'GET',
            timeout: 2000
        });
        
        if (response.ok) {
            return await response.json();
        }
    } catch (err) {
        console.error('Error getting devices:', err.message);
    }
    return [];
}

// Forward request to Kuando Hub
async function forwardToKuando(action, params = {}) {
    try {
        let url = `${config.kuandoHubUrl}?action=${action}`;
        
        // Add additional parameters
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== null) {
                url += `&${key}=${encodeURIComponent(value)}`;
            }
        }
        
        console.log(`[Bridge] Forwarding to Kuando: ${url}`);
        
        const response = await fetch(url, {
            method: 'GET',
            timeout: 3000
        });
        
        const text = await response.text();
        
        // Try to parse as JSON, otherwise return as text
        try {
            return { success: true, data: JSON.parse(text) };
        } catch {
            return { success: true, data: text };
        }
        
    } catch (err) {
        console.error('[Bridge] Error forwarding to Kuando:', err.message);
        return { success: false, error: err.message };
    }
}

// Start the Express server
function startServer() {
    const expressApp = express();
    
    // Enable CORS for all origins (your PWA will connect from its hosted domain)
    expressApp.use(cors({
        origin: '*',
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }));
    
    expressApp.use(express.json());
    
    // Logging middleware
    expressApp.use((req, res, next) => {
        console.log(`[Bridge] ${req.method} ${req.url}`);
        next();
    });
    
    // Health check endpoint
    expressApp.get('/health', async (req, res) => {
        const kuandoConnected = await checkKuandoConnection();
        const devices = kuandoConnected ? await getDevices() : [];
        
        res.json({
            bridge: 'online',
            kuandoHub: kuandoConnected ? 'connected' : 'disconnected',
            devices: devices.length,
            clients: connectedClients.size,
            version: app.getVersion()
        });
    });
    
    // Proxy endpoint - mirrors Kuando HTTP API format for compatibility
    // This allows your existing BusylightManager to work with minimal changes
    expressApp.get('/kuando', async (req, res) => {
        const { action, ...params } = req.query;
        
        if (!action) {
            return res.status(400).json({ success: false, error: 'Missing action parameter' });
        }
        
        const result = await forwardToKuando(action, params);
        
        if (result.success) {
            // Return data in same format as Kuando HTTP
            res.json(result.data);
        } else {
            res.status(502).json(result);
        }
    });
    
    // Alternative REST-style endpoints
    expressApp.get('/api/devices', async (req, res) => {
        const devices = await getDevices();
        res.json({ success: true, devices });
    });
    
    expressApp.get('/api/status', async (req, res) => {
        const result = await forwardToKuando('currentpresence');
        res.json(result);
    });
    
    expressApp.post('/api/light', async (req, res) => {
        const { red, green, blue } = req.body;
        const result = await forwardToKuando('light', { red, green, blue });
        res.json(result);
    });
    
    expressApp.post('/api/off', async (req, res) => {
        const result = await forwardToKuando('off');
        res.json(result);
    });
    
    expressApp.post('/api/alert', async (req, res) => {
        const { red, green, blue, sound } = req.body;
        const result = await forwardToKuando('alert', { red, green, blue, sound });
        res.json(result);
    });
    
    // Create HTTP server
    server = http.createServer(expressApp);
    
    // WebSocket server for real-time communication
    wss = new WebSocket.Server({ server, path: '/ws' });
    
    wss.on('connection', (ws, req) => {
        const clientId = Date.now().toString(36) + Math.random().toString(36).substr(2);
        connectedClients.add(clientId);
        
        console.log(`[Bridge] WebSocket client connected: ${clientId}`);
        updateTrayStatus(isConnected ? 'connected' : 'disconnected');
        
        // Send initial status
        ws.send(JSON.stringify({
            type: 'connected',
            clientId,
            kuandoHub: isConnected
        }));
        
        ws.on('message', async (message) => {
            try {
                const cmd = JSON.parse(message.toString());
                console.log(`[Bridge] WS command from ${clientId}:`, cmd);
                
                let result;
                
                switch (cmd.action) {
                    case 'light':
                        result = await forwardToKuando('light', {
                            red: cmd.red,
                            green: cmd.green,
                            blue: cmd.blue
                        });
                        break;
                        
                    case 'off':
                        result = await forwardToKuando('off');
                        updateTrayStatus('connected');
                        break;
                        
                    case 'alert':
                        result = await forwardToKuando('alert', {
                            red: cmd.red,
                            green: cmd.green,
                            blue: cmd.blue,
                            sound: cmd.sound
                        });
                        break;
                        
                    case 'status':
                        result = await forwardToKuando('currentpresence');
                        break;
                        
                    case 'devices':
                        const devices = await getDevices();
                        result = { success: true, devices };
                        break;
                        
                    // High-level call state commands
                    case 'ringing':
                        result = await forwardToKuando('alert', {
                            red: 100, green: 0, blue: 0, sound: cmd.sound ? 1 : 0
                        });
                        updateTrayStatus('ringing');
                        break;
                        
                    case 'busy':
                        result = await forwardToKuando('light', {
                            red: 100, green: 0, blue: 0
                        });
                        updateTrayStatus('busy');
                        break;
                        
                    case 'available':
                        result = await forwardToKuando('light', {
                            red: 0, green: 100, blue: 0
                        });
                        updateTrayStatus('connected');
                        break;
                        
                    case 'hold':
                        result = await forwardToKuando('alert', {
                            red: 100, green: 100, blue: 0
                        });
                        break;
                        
                    default:
                        result = { success: false, error: 'Unknown action' };
                }
                
                ws.send(JSON.stringify({
                    type: 'response',
                    action: cmd.action,
                    ...result
                }));
                
            } catch (err) {
                console.error('[Bridge] WS message error:', err);
                ws.send(JSON.stringify({
                    type: 'error',
                    error: err.message
                }));
            }
        });
        
        ws.on('close', () => {
            connectedClients.delete(clientId);
            console.log(`[Bridge] WebSocket client disconnected: ${clientId}`);
            updateTrayStatus(isConnected ? 'connected' : 'disconnected');
        });
        
        ws.on('error', (err) => {
            console.error(`[Bridge] WebSocket error for ${clientId}:`, err);
        });
    });
    
    // Start listening
    server.listen(config.bridgePort, '127.0.0.1', () => {
        console.log(`[Bridge] HTTP server running on http://127.0.0.1:${config.bridgePort}`);
        console.log(`[Bridge] WebSocket server running on ws://127.0.0.1:${config.bridgePort}/ws`);
        console.log(`[Bridge] Kuando proxy at http://127.0.0.1:${config.bridgePort}/kuando?action=...`);
    });
    
    server.on('error', (err) => {
        console.error('[Bridge] Server error:', err);
        if (err.code === 'EADDRINUSE') {
            dialog.showErrorBox(
                'Busylight Bridge',
                `Port ${config.bridgePort} is already in use. Please check if another instance is running.`
            );
        }
    });
}

// Stop the server
function stopServer() {
    if (wss) {
        wss.clients.forEach(client => client.close());
        wss.close();
        wss = null;
    }
    
    if (server) {
        server.close();
        server = null;
    }
}

// Create system tray
function createTray() {
    // Create default icon
    const iconPath = path.join(__dirname, 'assets', 'icon-default.png');
    let icon;
    
    if (fs.existsSync(iconPath)) {
        icon = nativeImage.createFromPath(iconPath);
    } else {
        // Create a simple 16x16 placeholder
        icon = nativeImage.createEmpty();
    }
    
    tray = new Tray(icon);
    
    updateTrayMenu();
    updateTrayStatus('disconnected');
    
    // Double-click to show status
    tray.on('double-click', () => {
        showStatus();
    });
}

// Update tray context menu
function updateTrayMenu() {
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Busylight Bridge',
            enabled: false
        },
        { type: 'separator' },
        {
            label: `Status: ${isConnected ? 'Connected' : 'Disconnected'}`,
            enabled: false
        },
        {
            label: `Clients: ${connectedClients.size}`,
            enabled: false
        },
        { type: 'separator' },
        {
            label: 'Test Connection',
            click: async () => {
                const connected = await checkKuandoConnection();
                if (connected) {
                    const devices = await getDevices();
                    
                    // Flash green to show success
                    await forwardToKuando('light', { red: 0, green: 100, blue: 0 });
                    setTimeout(() => forwardToKuando('off'), 2000);
                    
                    dialog.showMessageBox({
                        type: 'info',
                        title: 'Connection Test',
                        message: 'Kuando Hub Connected',
                        detail: `Found ${devices.length} device(s)`
                    });
                } else {
                    dialog.showMessageBox({
                        type: 'error',
                        title: 'Connection Test',
                        message: 'Connection Failed',
                        detail: 'Could not connect to Kuando Hub.\nMake sure kuandoHUB or kuando HTTP is running.'
                    });
                }
                updateTrayStatus(connected ? 'connected' : 'error');
            }
        },
        {
            label: 'Show Status',
            click: showStatus
        },
        { type: 'separator' },
        {
            label: 'Start with Windows',
            type: 'checkbox',
            checked: config.autoStart,
            click: async (menuItem) => {
                config.autoStart = menuItem.checked;
                saveConfig();
                
                if (config.autoStart) {
                    await autoLauncher.enable();
                } else {
                    await autoLauncher.disable();
                }
            }
        },
        { type: 'separator' },
        {
            label: 'Open Logs Folder',
            click: () => {
                shell.openPath(app.getPath('userData'));
            }
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                app.quit();
            }
        }
    ]);
    
    tray.setContextMenu(contextMenu);
}

// Show status dialog
async function showStatus() {
    const connected = await checkKuandoConnection();
    const devices = connected ? await getDevices() : [];
    
    let deviceList = devices.length > 0
        ? devices.map(d => `  • ${d.ProductID || d.ModelName || 'Unknown'}`).join('\n')
        : '  No devices found';
    
    dialog.showMessageBox({
        type: 'info',
        title: 'Busylight Bridge Status',
        message: 'Busylight Bridge',
        detail: `Bridge Status: Running
Kuando Hub: ${connected ? 'Connected' : 'Disconnected'}
Bridge Port: ${config.bridgePort}
Connected PWA Clients: ${connectedClients.size}

Devices:
${deviceList}

URLs:
  HTTP: http://127.0.0.1:${config.bridgePort}/kuando
  WebSocket: ws://127.0.0.1:${config.bridgePort}/ws`
    });
}

// Periodic connection check
function startConnectionMonitor() {
    setInterval(async () => {
        const wasConnected = isConnected;
        await checkKuandoConnection();
        
        if (wasConnected !== isConnected) {
            updateTrayStatus(isConnected ? 'connected' : 'disconnected');
            updateTrayMenu();
            
            // Notify connected WebSocket clients
            if (wss) {
                const message = JSON.stringify({
                    type: 'kuandoStatus',
                    connected: isConnected
                });
                
                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(message);
                    }
                });
            }
        }
    }, 5000);
}

// App ready
app.whenReady().then(async () => {
    // Load configuration
    loadConfig();
    
    // Set up auto-launch if enabled
    if (config.autoStart) {
        try {
            const isEnabled = await autoLauncher.isEnabled();
            if (!isEnabled) {
                await autoLauncher.enable();
            }
        } catch (err) {
            console.error('Auto-launch setup error:', err);
        }
    }
    
    // Create tray icon
    createTray();
    
    // Start the bridge server
    startServer();
    
    // Check initial connection
    await checkKuandoConnection();
    updateTrayStatus(isConnected ? 'connected' : 'disconnected');
    
    // Start monitoring
    startConnectionMonitor();
    
    console.log('[Bridge] Busylight Bridge started');
});

// Prevent app from closing when all windows are closed (it's a tray app)
app.on('window-all-closed', (e) => {
    e.preventDefault();
});

// Clean up on quit
app.on('before-quit', () => {
    stopServer();
    
    if (tray) {
        tray.destroy();
    }
});

// Handle second instance
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    console.log('[Bridge] Another instance is already running');
    app.quit();
} else {
    app.on('second-instance', () => {
        // Focus tray or show status
        showStatus();
    });
}
