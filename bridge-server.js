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
        this.bridges = new Map(); // Track connected bridge clients: bridgeId -> { ws, info, pendingRequests }
        this.clients = new Map(); // Track PWA clients (legacy)
        this.pendingRequests = new Map(); // Track pending API requests by requestId
        this.requestTimeout = 30000; // 30 seconds
        
        console.log('[BusylightBridge] Bridge server initialized (reverse connection mode)');
        console.log('[BusylightBridge] Waiting for incoming bridge connections on port 8088...');
    }

    /**
     * Register an incoming bridge connection
     * @param {WebSocket} ws - The bridge's WebSocket connection
     * @param {string} bridgeId - Unique identifier for the bridge
     */
    registerBridge(ws, bridgeId) {
        console.log(`[BusylightBridge] Registering bridge: ${bridgeId}`);
        
        const bridgeInfo = {
            ws,
            bridgeId,
            connectedAt: new Date(),
            lastSeen: new Date(),
            info: {},
            pendingRequests: new Map()
        };
        
        this.bridges.set(bridgeId, bridgeInfo);
        
        // Handle messages from bridge
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                console.log(`[BusylightBridge] Message from bridge ${bridgeId}:`, message);
                this.handleBridgeMessage(bridgeId, message);
                bridgeInfo.lastSeen = new Date();
            } catch (error) {
                console.error(`[BusylightBridge] Error parsing message from bridge ${bridgeId}:`, error);
            }
        });
        
        // Handle bridge disconnect
        ws.on('close', () => {
            console.log(`[BusylightBridge] Bridge disconnected: ${bridgeId}`);
            this.unregisterBridge(bridgeId);
        });
        
        ws.on('error', (error) => {
            console.error(`[BusylightBridge] Bridge ${bridgeId} error:`, error.message);
        });
        
        // Send welcome message
        ws.send(JSON.stringify({
            type: 'welcome',
            bridgeId: bridgeId,
            serverTime: new Date().toISOString()
        }));
    }
    
    /**
     * Unregister a bridge
     * @param {string} bridgeId - The bridge ID to unregister
     */
    unregisterBridge(bridgeId) {
        const bridge = this.bridges.get(bridgeId);
        if (bridge) {
            // Reject all pending requests for this bridge
            bridge.pendingRequests.forEach((request) => {
                if (request.reject) {
                    request.reject(new Error('Bridge disconnected'));
                }
            });
            this.bridges.delete(bridgeId);
            console.log(`[BusylightBridge] Bridge unregistered: ${bridgeId}. Remaining bridges: ${this.bridges.size}`);
        }
    }
    
    /**
     * Handle a message from a connected bridge
     * @param {string} bridgeId - The bridge ID
     * @param {Object} message - The message object
     */
    handleBridgeMessage(bridgeId, message) {
        const { type, requestId } = message;
        
        switch (type) {
            case 'bridge_register':
                // Bridge is announcing its capabilities/info
                const bridge = this.bridges.get(bridgeId);
                if (bridge) {
                    bridge.info = {
                        version: message.version,
                        kuandoConnected: message.kuandoConnected,
                        ...message
                    };
                    console.log(`[BusylightBridge] Bridge ${bridgeId} registered with info:`, bridge.info);
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
                break;
                
            case 'pong':
                // Ping/pong keepalive
                console.log(`[BusylightBridge] Pong from bridge ${bridgeId}`);
                break;
                
            default:
                console.log(`[BusylightBridge] Unknown message type from bridge ${bridgeId}: ${type}`);
        }
    }
    
    /**
     * Send an API request to a connected bridge
     * @param {string} bridgeId - The bridge to send the request to (optional, uses first available)
     * @param {string} action - The action to perform
     * @param {Object} params - Action parameters
     * @returns {Promise<Object>} - The response from the bridge
     */
    async sendToBridge(bridgeId, action, params = {}) {
        // If no bridgeId specified, use the first available bridge
        if (!bridgeId && this.bridges.size > 0) {
            bridgeId = Array.from(this.bridges.keys())[0];
            console.log(`[BusylightBridge] No bridge specified, using first available: ${bridgeId}`);
        }
        
        const bridge = this.bridges.get(bridgeId);
        if (!bridge) {
            throw new Error(`Bridge not found or disconnected: ${bridgeId || 'none'}`);
        }
        
        if (bridge.ws.readyState !== WebSocket.OPEN) {
            throw new Error(`Bridge ${bridgeId} is not connected`);
        }
        
        // Generate unique request ID
        const requestId = crypto.randomBytes(16).toString('hex');
        
        // Create promise for response
        return new Promise((resolve, reject) => {
            // Set timeout
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(requestId);
                reject(new Error(`Request timeout for bridge ${bridgeId}`));
            }, this.requestTimeout);
            
            // Store pending request
            this.pendingRequests.set(requestId, {
                bridgeId,
                action,
                params,
                resolve,
                reject,
                timeout,
                sentAt: new Date()
            });
            
            // Send request to bridge
            const message = {
                type: 'api_request',
                requestId,
                action,
                params
            };
            
            console.log(`[BusylightBridge] Sending request ${requestId} to bridge ${bridgeId}:`, action);
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

        // If this is the first client, connect to local service
        if (this.clients.size === 1) {
            console.log('[BusylightBridge] First client connected, establishing local service connection...');
            this.connectToLocalService();
        }

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
            type: 'bridge_status',
            connected: this.localConnection && this.localConnection.readyState === WebSocket.OPEN,
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

        // If no more clients, disconnect from local service
        if (this.clients.size === 0) {
            console.log('[BusylightBridge] No more clients, disconnecting from local service...');
            this.disconnectFromLocalService();
        }
    }

    /**
     * Handle a message from a client
     * @param {string} clientId - The client ID
     * @param {Object} message - The message object
     */
    handleClientMessage(clientId, message) {
        // Forward the message to the local service if connected
        if (this.localConnection && this.localConnection.readyState === WebSocket.OPEN) {
            console.log(`[BusylightBridge] Forwarding message to local service:`, message);
            this.localConnection.send(JSON.stringify(message));
        } else {
            console.warn('[BusylightBridge] Cannot forward message - not connected to local service');
            
            // Send error back to client
            const client = this.clients.get(clientId);
            if (client && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'error',
                    message: 'Not connected to local Busylight service',
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

            try {
                // Parse the request to determine action
                const urlPath = req.originalUrl.replace('/api/busylight', '');
                const queryParams = req.query || {};
                const body = req.body || {};
                
                console.log(`[BusylightBridge] HTTP → Bridge WebSocket translation:`);
                console.log(`  Method: ${req.method}`);
                console.log(`  Path:   ${req.originalUrl}`);
                
                let action = queryParams.action;
                let params = { ...queryParams };
                delete params.action;
                
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
                
                // Send request to first available bridge (TODO: implement bridge selection/routing)
                const result = await this.sendToBridge(null, action, params);
                
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
        const bridgeList = Array.from(this.bridges.entries()).map(([id, bridge]) => ({
            id,
            connectedAt: bridge.connectedAt,
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
