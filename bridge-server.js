/**
 * Busylight Bridge Server
 * 
 * This module provides a WebSocket-based bridge between the Connect365 PWA application
 * and the local Busylight service running on the user's PC.
 * 
 * Features:
 * - WebSocket connection management to ws://127.0.0.1:19774/ws
 * - HTTP-to-WebSocket proxy for API requests
 * - Client session tracking
 * - Automatic connection/disconnection based on client settings
 * - CORS handling for cross-origin requests
 */

const WebSocket = require('ws');
const { createProxyMiddleware } = require('http-proxy-middleware');

class BusylightBridgeServer {
    constructor(options = {}) {
        this.localServiceUrl = options.localServiceUrl || 'ws://127.0.0.1:19774/ws';
        this.localServiceHost = options.localServiceHost || 'http://127.0.0.1:19774';
        this.clients = new Map(); // Track connected clients
        this.localConnection = null; // WebSocket connection to local service
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000;
        this.isConnecting = false;
        this.connectionCheckInterval = null;
        
        console.log('[BusylightBridge] Bridge server initialized');
        console.log(`[BusylightBridge] Local service URL: ${this.localServiceUrl}`);
        console.log(`[BusylightBridge] Local service host: ${this.localServiceHost}`);
    }

    /**
     * Initialize the WebSocket connection to the local Busylight service
     */
    async connectToLocalService() {
        if (this.isConnecting || (this.localConnection && this.localConnection.readyState === WebSocket.OPEN)) {
            console.log('[BusylightBridge] Already connected or connecting to local service');
            return true;
        }

        this.isConnecting = true;

        return new Promise((resolve) => {
            try {
                console.log(`[BusylightBridge] Connecting to local service at ${this.localServiceUrl}...`);
                
                this.localConnection = new WebSocket(this.localServiceUrl);

                const timeout = setTimeout(() => {
                    if (this.localConnection.readyState !== WebSocket.OPEN) {
                        console.warn('[BusylightBridge] Connection timeout');
                        this.localConnection.close();
                        this.localConnection = null;
                        this.isConnecting = false;
                        resolve(false);
                    }
                }, 5000);

                this.localConnection.on('open', () => {
                    clearTimeout(timeout);
                    this.isConnecting = false;
                    this.reconnectAttempts = 0;
                    console.log('[BusylightBridge] ✓ Connected to local Busylight service');
                    
                    // Notify all connected clients
                    this.broadcastToClients({
                        type: 'bridge_status',
                        connected: true,
                        message: 'Connected to local Busylight service'
                    });
                    
                    resolve(true);
                });

                this.localConnection.on('message', (data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        console.log('[BusylightBridge] Message from local service:', message);
                        
                        // Broadcast to all connected clients
                        this.broadcastToClients(message);
                    } catch (error) {
                        console.error('[BusylightBridge] Error parsing message from local service:', error);
                    }
                });

                this.localConnection.on('error', (error) => {
                    clearTimeout(timeout);
                    this.isConnecting = false;
                    console.error('[BusylightBridge] Local service connection error:', error.message);
                    resolve(false);
                });

                this.localConnection.on('close', (code, reason) => {
                    this.isConnecting = false;
                    console.log(`[BusylightBridge] Local service connection closed: ${code} - ${reason}`);
                    this.localConnection = null;
                    
                    // Notify all connected clients
                    this.broadcastToClients({
                        type: 'bridge_status',
                        connected: false,
                        message: 'Disconnected from local Busylight service'
                    });
                    
                    // Attempt to reconnect if we have active clients
                    if (this.clients.size > 0 && this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.reconnectAttempts++;
                        console.log(`[BusylightBridge] Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
                        setTimeout(() => {
                            this.connectToLocalService();
                        }, this.reconnectDelay * this.reconnectAttempts);
                    }
                });

            } catch (error) {
                this.isConnecting = false;
                console.error('[BusylightBridge] Error creating WebSocket connection:', error);
                resolve(false);
            }
        });
    }

    /**
     * Disconnect from the local Busylight service
     */
    disconnectFromLocalService() {
        if (this.localConnection) {
            console.log('[BusylightBridge] Disconnecting from local service...');
            this.localConnection.close();
            this.localConnection = null;
        }
        
        if (this.connectionCheckInterval) {
            clearInterval(this.connectionCheckInterval);
            this.connectionCheckInterval = null;
        }
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
     * This handles HTTP requests to /api/busylight and forwards them via WebSocket
     */
    createHttpMiddleware() {
        return async (req, res, next) => {
            // Check if we're connected to the local service
            if (!this.localConnection || this.localConnection.readyState !== WebSocket.OPEN) {
                console.warn('[BusylightBridge] HTTP request received but not connected to local service');
                return res.status(503).json({
                    error: 'Busylight service unavailable',
                    message: 'Not connected to local Busylight service. Please ensure the Busylight Bridge application is running on your PC.',
                    connected: false
                });
            }

            try {
                // Parse the request path and query parameters
                const urlPath = req.originalUrl.replace('/api/busylight', '');
                const fullUrl = `${this.localServiceHost}/kuando${urlPath}`;
                
                console.log(`[BusylightBridge] HTTP → WebSocket translation:`);
                console.log(`  Input:  ${req.method} ${req.originalUrl}`);
                console.log(`  Output: ${fullUrl}`);

                // Make HTTP request to local service
                const http = require('http');
                const url = require('url');
                const parsedUrl = url.parse(fullUrl);

                const options = {
                    hostname: parsedUrl.hostname,
                    port: parsedUrl.port || 19774,
                    path: parsedUrl.path,
                    method: req.method,
                    headers: {
                        'Content-Type': 'application/json',
                        ...req.headers
                    }
                };

                const proxyReq = http.request(options, (proxyRes) => {
                    let data = '';

                    proxyRes.on('data', (chunk) => {
                        data += chunk;
                    });

                    proxyRes.on('end', () => {
                        console.log(`[BusylightBridge] Response status: ${proxyRes.statusCode}`);
                        
                        // Forward the response
                        res.status(proxyRes.statusCode);
                        
                        // Copy headers
                        Object.keys(proxyRes.headers).forEach(key => {
                            res.setHeader(key, proxyRes.headers[key]);
                        });
                        
                        // Add CORS headers
                        res.setHeader('Access-Control-Allow-Origin', '*');
                        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
                        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
                        
                        res.send(data);
                    });
                });

                proxyReq.on('error', (error) => {
                    console.error('[BusylightBridge] HTTP request error:', error);
                    res.status(502).json({
                        error: 'Proxy error',
                        message: error.message
                    });
                });

                // Send request body if present
                if (req.body) {
                    proxyReq.write(JSON.stringify(req.body));
                }

                proxyReq.end();

            } catch (error) {
                console.error('[BusylightBridge] Error processing HTTP request:', error);
                res.status(500).json({
                    error: 'Internal server error',
                    message: error.message
                });
            }
        };
    }

    /**
     * Get current connection status
     */
    getStatus() {
        return {
            connected: this.localConnection && this.localConnection.readyState === WebSocket.OPEN,
            clients: this.clients.size,
            localServiceUrl: this.localServiceUrl,
            reconnectAttempts: this.reconnectAttempts
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

        // Close local service connection
        this.disconnectFromLocalService();
        
        console.log('[BusylightBridge] Shutdown complete');
    }
}

module.exports = BusylightBridgeServer;
