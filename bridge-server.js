/**
 * Busylight Bridge Server
 * 
 * This module provides a WebSocket-based bridge between the Connect365 PWA application
 * and remote Busylight bridge clients running on users' PCs.
 * 
 * Features:
 * - Accept incoming WebSocket connections from bridge clients
 * - Route HTTP API requests through WebSocket to connected bridges
 * - Bridge session tracking and identification
 * - Request/response correlation with unique request IDs
 * - CORS handling for cross-origin requests
 */

const WebSocket = require('ws');
const crypto = require('crypto');

class BusylightBridgeServer {
    constructor(options = {}) {
        this.bridges = new Map(); // Track connected bridge clients: uniqueId -> { ws, info, pendingRequests }
        this.bridgesByConnectionId = new Map(); // Track by connection ID for cleanup: connectionId -> uniqueId
        this.clients = new Map(); // Track PWA clients (legacy)
        this.pendingRequests = new Map(); // Track pending API requests by requestId
        this.requestTimeout = 30000; // 30 seconds
        
        console.log('[BusylightBridge] Bridge server initialized (reverse connection mode)');
        console.log('[BusylightBridge] Using uniqueId-based routing (Connect365 Username)');
        console.log('[BusylightBridge] Waiting for incoming bridge connections on port 8088...');
    }

    /**
     * Register an incoming bridge connection
     * @param {WebSocket} ws - The bridge's WebSocket connection
     * @param {string} connectionId - Temporary connection identifier
     */
    registerBridge(ws, connectionId) {
        console.log(`[BusylightBridge] New bridge connection: ${connectionId} (waiting for registration with uniqueId)`);
        
        // Store temporary connection until we get uniqueId from bridge_register message
        this.bridgesByConnectionId.set(connectionId, {
            ws,
            connectionId,
            connectedAt: new Date(),
            registered: false
        });
        
        // Handle messages from bridge
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                this.handleBridgeMessage(connectionId, message);
            } catch (error) {
                console.error(`[BusylightBridge] Error parsing message from bridge ${connectionId}:`, error);
            }
        });
        
        // Handle bridge disconnect
        ws.on('close', () => {
            const tempBridge = this.bridgesByConnectionId.get(connectionId);
            if (tempBridge && tempBridge.uniqueId) {
                console.log(`[BusylightBridge] Bridge disconnected: ${tempBridge.uniqueId} (${connectionId})`);
                this.unregisterBridge(tempBridge.uniqueId);
            } else {
                console.log(`[BusylightBridge] Unregistered bridge disconnected: ${connectionId}`);
            }
            this.bridgesByConnectionId.delete(connectionId);
        });
        
        ws.on('error', (error) => {
            console.error(`[BusylightBridge] Bridge ${connectionId} error:`, error.message);
        });
        
        // Send welcome message
        ws.send(JSON.stringify({
            type: 'welcome',
            connectionId: connectionId,
            serverTime: new Date().toISOString(),
            message: 'Please send bridge_register message with uniqueId'
        }));
    }
    
    /**
     * Unregister a bridge by uniqueId
     * @param {string} uniqueId - The bridge uniqueId to unregister
     */
    unregisterBridge(uniqueId) {
        const bridge = this.bridges.get(uniqueId);
        if (bridge) {
            // Reject all pending requests for this bridge
            bridge.pendingRequests.forEach((request) => {
                if (request.reject) {
                    request.reject(new Error('Bridge disconnected'));
                }
            });
            this.bridges.delete(uniqueId);
            console.log(`[BusylightBridge] Bridge unregistered: ${uniqueId}. Remaining bridges: ${this.bridges.size}`);
        }
    }
    
    /**
     * Handle a message from a connected bridge
     * @param {string} connectionId - The temporary connection ID
     * @param {Object} message - The message object
     */
    handleBridgeMessage(connectionId, message) {
        const { type, requestId, uniqueId, connect365Username } = message;
        
        switch (type) {
            case 'bridge_register':
                // Bridge is registering with its uniqueId (Connect365 Username)
                const registrationId = uniqueId || connect365Username;
                
                if (!registrationId) {
                    console.warn(`[BusylightBridge] Bridge ${connectionId} attempted to register without uniqueId`);
                    const tempBridge = this.bridgesByConnectionId.get(connectionId);
                    if (tempBridge && tempBridge.ws && tempBridge.ws.readyState === WebSocket.OPEN) {
                        tempBridge.ws.send(JSON.stringify({
                            type: 'error',
                            message: 'Registration requires uniqueId (Connect365 Username)'
                        }));
                    }
                    return;
                }
                
                // Check if this uniqueId is already registered
                if (this.bridges.has(registrationId)) {
                    console.warn(`[BusylightBridge] Bridge with uniqueId ${registrationId} already registered. Replacing old connection.`);
                    // Close old connection
                    const oldBridge = this.bridges.get(registrationId);
                    if (oldBridge.ws.readyState === WebSocket.OPEN) {
                        oldBridge.ws.close();
                    }
                }
                
                // Move bridge from temporary to registered
                const tempBridge = this.bridgesByConnectionId.get(connectionId);
                if (tempBridge) {
                    const bridgeInfo = {
                        ws: tempBridge.ws,
                        uniqueId: registrationId,
                        connectionId,
                        connectedAt: tempBridge.connectedAt,
                        registeredAt: new Date(),
                        lastSeen: new Date(),
                        info: {
                            version: message.version,
                            kuandoConnected: message.kuandoConnected,
                            connect365Username: registrationId,
                            ...message
                        },
                        pendingRequests: new Map()
                    };
                    
                    this.bridges.set(registrationId, bridgeInfo);
                    tempBridge.uniqueId = registrationId;
                    tempBridge.registered = true;
                    
                    console.log(`[BusylightBridge] ✓ Bridge registered: ${registrationId} (${connectionId})`);
                    console.log(`[BusylightBridge]   Version: ${message.version}`);
                    console.log(`[BusylightBridge]   Kuando: ${message.kuandoConnected ? 'Connected' : 'Disconnected'}`);
                    console.log(`[BusylightBridge]   Total bridges: ${this.bridges.size}`);
                    
                    // Send confirmation
                    if (bridgeInfo.ws.readyState === WebSocket.OPEN) {
                        bridgeInfo.ws.send(JSON.stringify({
                            type: 'registration_complete',
                            uniqueId: registrationId,
                            message: 'Bridge successfully registered'
                        }));
                    }
                } else {
                    console.warn(`[BusylightBridge] Cannot find connection ${connectionId} for registration`);
                }
                break;
                
            case 'api_response':
                // Bridge is responding to an API request
                if (requestId) {
                    const pending = this.pendingRequests.get(requestId);
                    if (pending) {
                        clearTimeout(pending.timeout);
                        this.pendingRequests.delete(requestId);
                        
                        if (message.success) {
                            pending.resolve(message);
                        } else {
                            pending.reject(new Error(message.error || 'Request failed'));
                        }
                    } else {
                        console.warn(`[BusylightBridge] Received response for unknown request: ${requestId}`);
                    }
                }
                
                // Update lastSeen
                const responseBridge = this.bridgesByConnectionId.get(connectionId);
                if (responseBridge && responseBridge.uniqueId) {
                    const bridge = this.bridges.get(responseBridge.uniqueId);
                    if (bridge) {
                        bridge.lastSeen = new Date();
                    }
                }
                break;
                
            case 'pong':
                // Ping/pong keepalive
                const pongBridge = this.bridgesByConnectionId.get(connectionId);
                if (pongBridge && pongBridge.uniqueId) {
                    const registeredBridge = this.bridges.get(pongBridge.uniqueId);
                    if (registeredBridge) {
                        registeredBridge.lastSeen = new Date();
                    }
                    console.log(`[BusylightBridge] Pong from bridge ${pongBridge.uniqueId}`);
                }
                break;
                
            default:
                console.log(`[BusylightBridge] Unknown message type from bridge ${connectionId}: ${type}`);
        }
    }
    
    /**
     * Send an API request to a connected bridge
     * @param {string} uniqueId - The bridge uniqueId to send the request to (Connect365 Username)
     * @param {string} action - The action to perform
     * @param {Object} params - Action parameters
     * @returns {Promise<Object>} - The response from the bridge
     */
    async sendToBridge(uniqueId, action, params = {}) {
        // If no uniqueId specified, use the first available bridge
        if (!uniqueId && this.bridges.size > 0) {
            uniqueId = Array.from(this.bridges.keys())[0];
            console.log(`[BusylightBridge] No uniqueId specified, using first available bridge: ${uniqueId}`);
        }
        
        const bridge = this.bridges.get(uniqueId);
        if (!bridge) {
            throw new Error(`Bridge not found for uniqueId: ${uniqueId || 'none'}. Available bridges: ${Array.from(this.bridges.keys()).join(', ') || 'none'}`);
        }
        
        if (bridge.ws.readyState !== WebSocket.OPEN) {
            throw new Error(`Bridge ${uniqueId} is not connected`);
        }
        
        // Generate unique request ID
        const requestId = crypto.randomBytes(16).toString('hex');
        
        // Create promise for response
        return new Promise((resolve, reject) => {
            // Set timeout
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(requestId);
                reject(new Error(`Request timeout for bridge ${uniqueId}`));
            }, this.requestTimeout);
            
            // Store pending request
            this.pendingRequests.set(requestId, {
                uniqueId,
                action,
                params,
                resolve,
                reject,
                timeout,
                sentAt: new Date()
            });
            
            // Send request to bridge with targetUser for validation
            const message = {
                type: 'api_request',
                requestId,
                action,
                params,
                targetUser: uniqueId // Include for bridge-side validation
            };
            
            console.log(`[BusylightBridge] Sending request ${requestId} to bridge ${uniqueId}:`, action);
            bridge.ws.send(JSON.stringify(message));
        });
    }

    /**
     * Register a client WebSocket connection
     * @param {WebSocket} ws - The client WebSocket connection
     * @param {string} clientId - Unique identifier for the client
     */
    registerClient(ws, clientId) {
        console.log(`[BusylightBridge] Client registered: ${clientId}`);
        this.clients.set(clientId, ws);

        // Handle messages from client
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                console.log(`[BusylightBridge] Message from client ${clientId}:`, message);
                this.handleClientMessage(clientId, message);
            } catch (error) {
                console.error(`[BusylightBridge] Error parsing message from client ${clientId}:`, error);
            }
        });

        // Handle client disconnect
        ws.on('close', () => {
            console.log(`[BusylightBridge] Client disconnected: ${clientId}`);
            this.unregisterClient(clientId);
        });

        ws.on('error', (error) => {
            console.error(`[BusylightBridge] Client ${clientId} error:`, error.message);
        });

        // Send initial status
        ws.send(JSON.stringify({
            type: 'connection_status',
            connected: this.bridges.size > 0,
            bridges: this.bridges.size,
            clientId: clientId,
            message: 'Connected to bridge server'
        }));
    }

    /**
     * Unregister a client
     * @param {string} clientId - The client ID to unregister
     */
    unregisterClient(clientId) {
        this.clients.delete(clientId);
        console.log(`[BusylightBridge] Client unregistered: ${clientId}. Remaining clients: ${this.clients.size}`);
    }

    /**
     * Handle a message from a client
     * @param {string} clientId - The client ID
     * @param {Object} message - The message object
     */
    async handleClientMessage(clientId, message) {
        try {
            // In reverse connection mode, forward WebSocket messages from clients to the bridge
            // just like HTTP requests
            const { action } = message;
            
            if (!action) {
                console.warn('[BusylightBridge] Client message missing action:', message);
                const client = this.clients.get(clientId);
                if (client && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'error',
                        message: 'Missing action in request'
                    }));
                }
                return;
            }
            
            // Map client action names to bridge action names (same as HTTP middleware)
            let bridgeAction = action;
            if (action === 'busylightdevices') {
                bridgeAction = 'devices';
            } else if (action === 'currentpresence') {
                bridgeAction = 'status';
            }
            
            // Extract parameters (remove action from params)
            const params = { ...message };
            delete params.action;
            
            console.log(`[BusylightBridge] Client WS → Bridge: ${action} → ${bridgeAction}`, params);
            
            // Send to bridge and get response
            const result = await this.sendToBridge(null, bridgeAction, params);
            
            // Send response back to client
            const client = this.clients.get(clientId);
            if (client && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'response',
                    action: action,
                    success: result.success,
                    data: result.data,
                    error: result.error
                }));
            }
            
        } catch (error) {
            console.error(`[BusylightBridge] Error handling client message:`, error);
            
            // Send error back to client
            const client = this.clients.get(clientId);
            if (client && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'error',
                    message: error.message,
                    originalMessage: message
                }));
            }
        }
    }

    /**
     * Broadcast a message to all connected clients
     * @param {Object} message - The message to broadcast
     */
    broadcastToClients(message) {
        const messageStr = JSON.stringify(message);
        let sentCount = 0;
        
        this.clients.forEach((client, clientId) => {
            if (client.readyState === WebSocket.OPEN) {
                try {
                    client.send(messageStr);
                    sentCount++;
                } catch (error) {
                    console.error(`[BusylightBridge] Error broadcasting to client ${clientId}:`, error);
                }
            }
        });
        
        if (sentCount > 0) {
            console.log(`[BusylightBridge] Broadcast message to ${sentCount} client(s)`);
        }
    }

    /**
     * Create Express middleware for HTTP to WebSocket proxy
     * This handles HTTP requests to /api/busylight and forwards them via WebSocket to connected bridges
     */
    createHttpMiddleware() {
        return async (req, res, next) => {
            // Extract targetUser from headers (Connect365 Username for routing)
            const targetUser = req.headers['x-connect365-username'] || req.query.bridgeId || null;
            
            // Check if we have any connected bridges
            if (this.bridges.size === 0) {
                console.warn('[BusylightBridge] HTTP request received but no bridges connected');
                return res.status(503).json({
                    error: 'Busylight service unavailable',
                    message: 'No Busylight Bridge clients are currently connected. Please ensure the Busylight Bridge application is running on a PC with the server configured.',
                    connected: false,
                    bridges: 0
                });
            }
            
            // If targetUser specified, check if that bridge is connected
            if (targetUser && !this.bridges.has(targetUser)) {
                console.warn(`[BusylightBridge] Request for bridge ${targetUser} but it is not connected`);
                return res.status(404).json({
                    error: 'Bridge not found',
                    message: `No bridge connected for user: ${targetUser}`,
                    targetUser,
                    availableBridges: Array.from(this.bridges.keys())
                });
            }

            try {
                // Parse the request to determine action
                const urlPath = req.originalUrl.replace('/api/busylight', '');
                const queryParams = req.query || {};
                const body = req.body || {};
                
                console.log(`[BusylightBridge] HTTP → Bridge WebSocket translation:`);
                console.log(`  Method: ${req.method}`);
                console.log(`  Path:   ${req.originalUrl}`);
                console.log(`  Target: ${targetUser || 'auto (first available)'}`);
                
                let action = queryParams.action;
                let params = { ...queryParams };
                delete params.action;
                delete params.bridgeId; // Remove from params if present
                
                // Map Kuando HTTP API actions to bridge actions
                if (action === 'busylightdevices') {
                    action = 'devices';
                } else if (action === 'currentpresence') {
                    action = 'status';
                }
                
                // Map HTTP endpoints to actions
                if (!action) {
                    if (urlPath.includes('/health') || req.originalUrl.includes('/health')) {
                        action = 'health';
                    } else if (urlPath.includes('/devices')) {
                        action = 'devices';
                    } else if (urlPath.includes('/status')) {
                        action = 'status';
                    } else if (urlPath.includes('/light')) {
                        action = 'light';
                        params = { ...body };
                    } else if (urlPath.includes('/off')) {
                        action = 'off';
                    } else if (urlPath.includes('/alert')) {
                        action = 'alert';
                        params = { ...body };
                    } else if (urlPath.includes('/ringing')) {
                        action = 'ringing';
                        params = { ...body };
                    } else if (urlPath.includes('/busy')) {
                        action = 'busy';
                    } else if (urlPath.includes('/available')) {
                        action = 'available';
                    } else if (urlPath.includes('/hold')) {
                        action = 'hold';
                    } else {
                        // Default: assume query string format like /kuando?action=...
                        action = 'status';
                    }
                }
                
                console.log(`  Action: ${action}`);
                console.log(`  Params:`, params);
                
                // Send request to specified bridge or first available
                const result = await this.sendToBridge(targetUser, action, params);
                
                console.log(`[BusylightBridge] Bridge response:`, result);
                
                // Send response back to client
                if (result.success) {
                    res.status(200).json(result.data || { success: true });
                } else {
                    res.status(500).json({
                        error: result.error || 'Request failed',
                        success: false
                    });
                }

            } catch (error) {
                console.error('[BusylightBridge] Error processing HTTP request:', error);
                res.status(502).json({
                    error: 'Bridge communication error',
                    message: error.message,
                    success: false
                });
            }
        };
    }

    /**
     * Register a client WebSocket connection (legacy/PWA clients)
     * @param {WebSocket} ws - The client WebSocket connection
     * @param {string} clientId - Unique identifier for the client
     */
    registerClient(ws, clientId) {
        console.log(`[BusylightBridge] Client registered: ${clientId}`);
        this.clients.set(clientId, ws);

        // Handle messages from client (legacy support)
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                console.log(`[BusylightBridge] Message from client ${clientId}:`, message);
                // Forward to bridges if needed
            } catch (error) {
                console.error(`[BusylightBridge] Error parsing message from client ${clientId}:`, error);
            }
        });

        // Handle client disconnect
        ws.on('close', () => {
            console.log(`[BusylightBridge] Client disconnected: ${clientId}`);
            this.unregisterClient(clientId);
        });

        ws.on('error', (error) => {
            console.error(`[BusylightBridge] Client ${clientId} error:`, error.message);
        });

        // Send initial status
        ws.send(JSON.stringify({
            type: 'connection_status',
            bridges: this.bridges.size,
            clientId: clientId,
            message: 'Connected to bridge server'
        }));
    }

    /**
     * Unregister a client
     * @param {string} clientId - The client ID to unregister
     */
    unregisterClient(clientId) {
        this.clients.delete(clientId);
        console.log(`[BusylightBridge] Client unregistered: ${clientId}. Remaining clients: ${this.clients.size}`);
    }

    /**
     * Broadcast a message to all connected clients
     * @param {Object} message - The message to broadcast
     */
    broadcastToClients(message) {
        const messageStr = JSON.stringify(message);
        let sentCount = 0;
        
        this.clients.forEach((client, clientId) => {
            if (client.readyState === WebSocket.OPEN) {
                try {
                    client.send(messageStr);
                    sentCount++;
                } catch (error) {
                    console.error(`[BusylightBridge] Error broadcasting to client ${clientId}:`, error);
                }
            }
        });
        
        if (sentCount > 0) {
            console.log(`[BusylightBridge] Broadcast message to ${sentCount} client(s)`);
        }
    }

    /**
     * Get current connection status
     */
    getStatus() {
        const bridgeList = Array.from(this.bridges.entries()).map(([uniqueId, bridge]) => ({
            uniqueId,
            connect365Username: uniqueId,
            connectedAt: bridge.connectedAt,
            registeredAt: bridge.registeredAt,
            lastSeen: bridge.lastSeen,
            info: bridge.info
        }));
        
        return {
            bridges: this.bridges.size,
            bridgeList,
            pendingRequests: this.pendingRequests.size,
            clients: this.clients.size
        };
    }

    /**
     * Cleanup - close all connections
     */
    shutdown() {
        console.log('[BusylightBridge] Shutting down...');
        
        // Close all client connections
        this.clients.forEach((client, clientId) => {
            try {
                client.close();
            } catch (error) {
                console.error(`[BusylightBridge] Error closing client ${clientId}:`, error);
            }
        });
        this.clients.clear();

        // Close all bridge connections
        this.bridges.forEach((bridge, bridgeId) => {
            try {
                bridge.ws.close();
            } catch (error) {
                console.error(`[BusylightBridge] Error closing bridge ${bridgeId}:`, error);
            }
        });
        this.bridges.clear();

        // Clear pending requests
        this.pendingRequests.forEach((request) => {
            if (request.timeout) {
                clearTimeout(request.timeout);
            }
            if (request.reject) {
                request.reject(new Error('Server shutting down'));
            }
        });
        this.pendingRequests.clear();
        
        console.log('[BusylightBridge] Shutdown complete');
    }
}

module.exports = BusylightBridgeServer;
