import { io, Socket } from 'socket.io-client';
import { isVerboseLoggingEnabled } from './index';

/**
 * Fetch JWT token from Phantom API
 * @param phantomId The PhantomID to fetch token for (e.g., '833')
 * @returns Promise that resolves with the JWT token
 */
export async function fetchPhantomJWT(phantomId: string): Promise<string> {
    const verboseLogging = isVerboseLoggingEnabled();
    const tokenUrl = `https://connect365.servehttp.com/api/phantom/JWTWebToken?phantomId=${phantomId}`;

    if (verboseLogging) {
        console.log('[SocketTest] 📤 Requesting JWT token from:', tokenUrl);
    }

    try {
        const response = await fetch(tokenUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const text = await response.text();
            if (verboseLogging) {
                console.error('[SocketTest] ❌ JWT error response:', {
                    status: response.status,
                    statusText: response.statusText,
                    body: text.substring(0, 500)
                });
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Get response as text first to debug
        const responseText = await response.text();
        
        if (verboseLogging) {
            console.log('[SocketTest] 📥 JWT raw response:', responseText.substring(0, 200));
        }

        const data = JSON.parse(responseText);

        if (verboseLogging) {
            console.log('[SocketTest] 📥 JWT Response:', data);
        }

        const token = data.token || data.webtoken || data.jwt || data.WBtoken;
        
        if (!token) {
            throw new Error('No token found in response');
        }

        if (verboseLogging) {
            console.log('[SocketTest] ✅ JWT token received:', token.substring(0, 20) + '...');
        }

        return token;
    } catch (error) {
        if (verboseLogging) {
            console.error('[SocketTest] ❌ JWT fetch failed:', error);
        }
        throw error;
    }
}

/**
 * Test Socket.IO connection to Phantom API server
 * @param url The server URL to connect to
 * @param token Optional JWT token for authentication
 * @returns Promise that resolves with the socket instance or rejects with an error
 */
export async function testSocketIOConnection(url: string, token?: string): Promise<Socket> {
    const verboseLogging = isVerboseLoggingEnabled();

    if (verboseLogging) {
        console.log('[SocketTest] 🔌 Attempting Socket.IO connection to:', url);
        if (token) {
            console.log('[SocketTest] 🔐 Using JWT authentication');
        }
    }

    return new Promise((resolve, reject) => {
        const socketOptions: any = {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 3,
            reconnectionDelay: 1000,
            timeout: 10000,
        };

        // Add authentication if token provided
        if (token) {
            socketOptions.auth = { token };
            socketOptions.extraHeaders = {
                'Authorization': `Bearer ${token}`
            };
        }

        const socket = io(url, socketOptions);

        // Connection successful
        socket.on('connect', () => {
            if (verboseLogging) {
                console.log('[SocketTest] ✅ Connected successfully!', {
                    id: socket.id,
                    connected: socket.connected,
                    transport: socket.io.engine.transport.name
                });
            }
            resolve(socket);
        });
        
        // Listen for common Socket.IO events
        socket.on('pong', (...args) => {
            if (verboseLogging) {
                console.log('[SocketTest] 📨 PONG received:', args);
            }
        });
        
        socket.on('message', (...args) => {
            if (verboseLogging) {
                console.log('[SocketTest] 📨 MESSAGE received:', args);
            }
        });
        
        socket.on('welcome', (...args) => {
            if (verboseLogging) {
                console.log('[SocketTest] 📨 WELCOME received:', args);
            }
        });
        
        socket.on('init', (...args) => {
            if (verboseLogging) {
                console.log('[SocketTest] 📨 INIT received:', args);
            }
        });
        
        socket.on('authenticated', (...args) => {
            if (verboseLogging) {
                console.log('[SocketTest] 📨 AUTHENTICATED received:', args);
            }
        });
        
        socket.on('error', (...args) => {
            if (verboseLogging) {
                console.log('[SocketTest] 📨 ERROR received:', args);
            }
        });
        
        socket.on('unauthorized', (...args) => {
            if (verboseLogging) {
                console.log('[SocketTest] 📨 UNAUTHORIZED received:', args);
            }
        });

        // Connection error
        socket.on('connect_error', (error) => {
            if (verboseLogging) {
                console.error('[SocketTest] ❌ Connection error:', {
                    message: error.message,
                    description: error.message,
                    type: error.name
                });
            }
            reject(error);
        });

        // Connection timeout
        socket.on('connect_timeout', () => {
            const timeoutError = new Error('Connection timeout');
            if (verboseLogging) {
                console.error('[SocketTest] ⏱️ Connection timeout');
            }
            reject(timeoutError);
        });

        // Disconnection
        socket.on('disconnect', (reason) => {
            if (verboseLogging) {
                console.log('[SocketTest] 🔌 Disconnected:', reason);
            }
        });

        // Reconnection attempt
        socket.on('reconnect_attempt', (attempt) => {
            if (verboseLogging) {
                console.log(`[SocketTest] 🔄 Reconnection attempt ${attempt}`);
            }
        });

        // Reconnection failed
        socket.on('reconnect_failed', () => {
            const error = new Error('Reconnection failed after all attempts');
            if (verboseLogging) {
                console.error('[SocketTest] ❌ Reconnection failed');
            }
            reject(error);
        });
    });
}

/**
 * Test connection and listen for events
 * @param url The server URL to connect to
 * @param withAuth Whether to use JWT authentication
 */
export async function testSocketWithEvents(url: string, withAuth: boolean = true): Promise<void> {
    const verboseLogging = isVerboseLoggingEnabled();

    try {
        let token: string | undefined;

        // Fetch JWT token if authentication is enabled
        if (withAuth) {
            // Extract PhantomID from URL (e.g., server1-833 -> 833)
            const match = url.match(/server1-(\d+)/);
            const phantomId = match ? match[1] : '000';
            token = await fetchPhantomJWT(phantomId);
        }

        const socket = await testSocketIOConnection(url, token);

        if (verboseLogging) {
            console.log('[SocketTest] 📡 Listening for events...');
        }

        // Send auth event with webtoken immediately after connection
        if (token) {
            socket.emit('auth', token);
            if (verboseLogging) {
                console.log('[SocketTest] 📤 Sent auth event with token');
            }
        }

        // Listen for any events
        socket.onAny((eventName, ...args) => {
            if (verboseLogging) {
                console.log('[SocketTest] 📨 Received event:', eventName, args);
            }
        });

        return new Promise((resolve) => {
            // Keep connection open for 30 seconds to observe events
            setTimeout(() => {
                if (verboseLogging) {
                    console.log('[SocketTest] ⏹️ Test complete, closing connection');
                }
                socket.disconnect();
                resolve();
            }, 30000);
        });

    } catch (error) {
        if (verboseLogging) {
            console.error('[SocketTest] ❌ Test failed:', error);
        }
        throw error;
    }
}

/**
 * Quick test function to call from browser console
 */
export function quickSocketTest(withAuth: boolean = true) {
    const url = 'https://server1-833.phantomapi.net:3000';
    console.log('Testing Socket.IO connection to:', url);
    console.log('Authentication:', withAuth ? 'Enabled' : 'Disabled');
    
    testSocketWithEvents(url, withAuth)
        .then(() => console.log('✅ Socket test completed'))
        .catch((error) => console.error('❌ Socket test failed:', error));
}

// Make it available globally for console testing
if (typeof window !== 'undefined') {
    (window as any).quickSocketTest = quickSocketTest;
    (window as any).testSocketIO = testSocketIOConnection;
}
