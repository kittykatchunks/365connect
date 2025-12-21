/* ====================================================================================== */
/* AUTOCAB365 PWA - PHANTOM API MANAGER */
/* Provides authenticated API access to the Phantom server */
/* ====================================================================================== */

/*
USAGE EXAMPLES:

1. GET request:
   const result = await App.managers.api.get('ping');
   if (result.success) console.log('Response:', result.data);

2. POST request:
   const result = await App.managers.api.post('AgentfromPhone', { phone: '1001' });
   
3. PUT/DELETE requests:
   const result = await App.managers.api.put('endpoint', data);
   const result = await App.managers.api.delete('endpoint');

4. Event listeners:
   App.managers.api.on('error', (error) => console.log('API Error:', error));
   App.managers.api.on('response', (data) => console.log('API Response:', data));

CONFIGURATION:
- useProxy: true = Use Node.js proxy (for dev/CORS issues) - Default
- useProxy: false = Direct HTTPS API calls (for production deployment)
- Authentication: All requests use Basic Auth with credentials from .env
*/

class PhantomApiManager extends EventTarget {
    constructor() {
        super();
        
        this.config = {
            baseUrl: null,
            phantomId: null,
            timeout: 30000, // 30 seconds default timeout
            apiUsername: null,
            apiKey: null,
            useProxy: true // Set to false for direct API access (production deployment)
        };
        
        // Event listeners
        this.listeners = new Map();
        
        console.log('PhantomApiManager initialized');
    }

    // Event Management
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
            if (this.listeners.get(event).size === 0) {
                this.listeners.delete(event);
            }
        }
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in ${event} listener:`, error);
                }
            });
        }
    }

    // Initialize API configuration
    async initialize(phantomId = null) {
        try {
            // Get PhantomID from parameter or localStorage
            this.config.phantomId = phantomId || this.getPhantomId();
            
            if (!this.config.phantomId) {
                console.warn('PhantomApiManager: No PhantomID available');
                return false;
            }

            // Generate base URL from PhantomID
            this.config.baseUrl = this.generateApiUrl(this.config.phantomId);
            
            // Fetch API credentials from server config endpoint
            try {
                const response = await fetch(`/api/config?phantomId=${this.config.phantomId}`);
                if (response.ok) {
                    const config = await response.json();
                    this.config.apiUsername = config.apiUsername;
                    this.config.apiKey = config.apiKey;
                    
                    // Store WebSocket server URL if available
                    if (config.wssServerUrl && window.localDB) {
                        window.localDB.setItem('wssServer', config.wssServerUrl);
                        console.log('✅ WebSocket server URL updated:', config.wssServerUrl);
                    }
                    
                    // Store SIP domain if available
                    if (config.sipDomain && window.localDB) {
                        window.localDB.setItem('SipDomain', config.sipDomain);
                    }
                    
                    console.log('✅ API credentials loaded from server config');
                    console.log('   Using proxy:', config.usingProxy ? 'Yes' : 'No (direct connection)');
                } else {
                    console.warn('Failed to fetch API credentials from server');
                }
            } catch (error) {
                console.warn('Error fetching API credentials:', error);
            }
            
            console.log('PhantomApiManager configured:', {
                phantomId: this.config.phantomId,
                baseUrl: this.config.baseUrl,
                hasCredentials: !!(this.config.apiUsername && this.config.apiKey)
            });
            
            this.emit('initialized', this.config);
            return true;
            
        } catch (error) {
            console.error('Error initializing PhantomApiManager:', error);
            this.emit('error', { type: 'initialization', error });
            return false;
        }
    }

    // Get PhantomID from localStorage or global variable
    getPhantomId() {
        try {
            // Try localStorage first
            if (window.localDB && window.localDB.getItem) {
                const phantomId = window.localDB.getItem('PhantomID');
                if (phantomId && phantomId !== 'null' && phantomId !== 'undefined') {
                    return phantomId;
                }
            }
            
            // Try global variable
            if (window.phantomID && window.phantomID !== 'null' && window.phantomID !== 'undefined') {
                return window.phantomID;
            }
            
            return null;
        } catch (error) {
            console.error('Error getting PhantomID:', error);
            return null;
        }
    }

    // Generate API URL from PhantomID
    generateApiUrl(phantomId) {
        if (!phantomId || phantomId === "" || phantomId === "null" || phantomId === "undefined") {
            return null;
        }
        
        const domain = `server1-${phantomId}.phantomapi.net`;
        const port = 443; // Phantom API standard HTTPS port
        const basePath = '/api';
        
        return `https://${domain}:${port}${basePath}`;
    }

    // Check if API is configured and ready
    isReady() {
        return this.config.baseUrl !== null && this.config.phantomId !== null;
    }

    // Build URL for API request (proxy or direct)
    buildUrl(apiName) {
        if (this.config.useProxy) {
            // Use local proxy endpoint with PhantomID as query parameter
            const proxyUrl = `/api/phantom/${apiName}`;
            return this.config.phantomId ? `${proxyUrl}?phantomId=${this.config.phantomId}` : proxyUrl;
        } else {
            // Direct API access (production)
            return `${this.config.baseUrl}/${apiName}`;
        }
    }

    // Make authenticated HTTP request to API (via proxy or direct)
    async request(method, apiName, data = null, options = {}) {
        try {
            // Ensure API is initialized
            if (!this.isReady()) {
                const initialized = await this.initialize();
                if (!initialized) {
                    throw new Error('API not configured - PhantomID required');
                }
            }

            // Build URL (proxy or direct based on config)
            const url = this.buildUrl(apiName);

            // Prepare request options
            const requestOptions = {
                method: method.toUpperCase(),
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    ...options.headers
                },
                cache: 'no-cache'
            };

            // Add Basic Auth header for direct API access (proxy handles auth automatically)
            if (!this.config.useProxy && this.config.apiUsername && this.config.apiKey) {
                const authString = btoa(`${this.config.apiUsername}:${this.config.apiKey}`);
                requestOptions.headers['Authorization'] = `Basic ${authString}`;
            }

            // Add body for POST/PUT requests
            if (data && (method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT')) {
                requestOptions.body = JSON.stringify(data);
            }

            console.log(`PhantomAPI ${method.toUpperCase()} request ${this.config.useProxy ? '(via proxy)' : '(direct)'}:`, {
                url: url.replace(/phantomId=[^&]+/, 'phantomId=***'), // Mask in logs
                method: method.toUpperCase(),
                hasAuth: !!(this.config.apiUsername && this.config.apiKey),
                bodyData: data
            });

            // Emit request event
            this.emit('request', {
                method: method.toUpperCase(),
                url,
                apiName,
                data
            });

            // Make the request with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), options.timeout || this.config.timeout);
            
            const response = await fetch(url, {
                ...requestOptions,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            // Handle response
            if (!response.ok) {
                let errorText;
                try {
                    errorText = await response.text();
                } catch (e) {
                    errorText = `HTTP ${response.status} - ${response.statusText}`;
                }
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            // Parse JSON response
            let responseData;
            const contentType = response.headers.get('content-type') || '';
            
            if (contentType.includes('application/json')) {
                try {
                    responseData = await response.json();
                } catch (parseError) {
                    console.warn('Failed to parse JSON response, returning text:', parseError);
                    responseData = await response.text();
                }
            } else {
                // Try JSON first, fallback to text
                const responseText = await response.text();
                try {
                    responseData = JSON.parse(responseText);
                } catch (parseError) {
                    responseData = responseText;
                }
            }

            console.log(`PhantomAPI ${method.toUpperCase()} response:`, responseData);

            // Emit success event
            this.emit('response', {
                method: method.toUpperCase(),
                url,
                apiName,
                data: responseData,
                status: response.status
            });

            return {
                success: true,
                data: responseData,
                status: response.status,
                headers: response.headers
            };

        } catch (error) {
            console.error(`PhantomAPI ${method.toUpperCase()} error:`, error);
            
            // Handle timeout error specifically
            if (error.name === 'AbortError') {
                error.message = `Request timeout after ${options.timeout || this.config.timeout}ms`;
            }

            // Emit error event
            this.emit('error', {
                type: 'request',
                method: method.toUpperCase(),
                apiName,
                error,
                message: error.message
            });

            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }

    // ==================== CONVENIENCE METHODS ====================
    
    // GET request
    async get(apiName, options = {}) {
        return await this.request('GET', apiName, null, options);
    }

    // POST request (most commonly used for Phantom API)
    async post(apiName, data = null, options = {}) {
        return await this.request('POST', apiName, data, options);
    }

    // PUT request
    async put(apiName, data = null, options = {}) {
        return await this.request('PUT', apiName, data, options);
    }

    // DELETE request
    async delete(apiName, options = {}) {
        return await this.request('DELETE', apiName, null, options);
    }

    // ==================== BACKWARD COMPATIBILITY METHODS ====================
    // These methods maintain backward compatibility with existing code
    // All authentication is now handled via proxy or direct API with .env credentials
    
    // Legacy method: postWithBasicAuth - now just calls post()
    async postWithBasicAuth(apiName, data = null, username, password, options = {}) {
        return await this.post(apiName, data, options);
    }

    // Legacy method: postSimpleNoAuth - now just calls post() with auth
    async postSimpleNoAuth(apiName, data = null, options = {}) {
        // This method returns data directly (not wrapped in success/data object)
        // to maintain backward compatibility with existing code
        const result = await this.post(apiName, data, options);
        return result.success ? result.data : result;
    }

    // Legacy method: postWithBasicAuthSimple - now just calls post()
    async postWithBasicAuthSimple(apiName, data = null, username, password, options = {}) {
        // This method returns data directly (not wrapped in success/data object)
        // to maintain backward compatibility with existing code
        const result = await this.post(apiName, data, options);
        return result.success ? result.data : result;
    }

    // ==================== CONFIGURATION METHODS ====================
    
    // Switch between proxy mode (dev) and direct API mode (production)
    setProxyMode(useProxy) {
        this.config.useProxy = useProxy;
        console.log(`PhantomAPI mode: ${useProxy ? 'PROXY (via Node.js)' : 'DIRECT (production)'}`);
        this.emit('configUpdated', this.config);
    }

    // Update configuration
    updateConfig(config) {
        Object.assign(this.config, config);
        console.log('PhantomApiManager config updated:', this.config);
        this.emit('configUpdated', this.config);
    }

    // Set timeout for requests
    setTimeout(timeout) {
        this.config.timeout = timeout;
        console.log(`PhantomApiManager timeout set to: ${timeout}ms`);
    }

    // Get current configuration
    getConfig() {
        return { ...this.config };
    }

    // Test API connectivity
    async testConnection() {
        try {
            if (!this.isReady()) {
                return {
                    success: false,
                    error: 'API not configured'
                };
            }

            console.log('Testing Phantom API connection...');
            
            // Try a simple endpoint test (you may need to adjust this based on available endpoints)
            const result = await this.get('ping', { timeout: 5000 });
            
            if (result.success) {
                console.log('Phantom API connection test successful');
                this.emit('connectionTest', { success: true, data: result.data });
                return {
                    success: true,
                    message: 'API connection successful',
                    data: result.data
                };
            } else {
                console.warn('Phantom API connection test failed:', result.error);
                return {
                    success: false,
                    error: result.error
                };
            }
            
        } catch (error) {
            console.error('Phantom API connection test error:', error);
            this.emit('connectionTest', { success: false, error: error.message });
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Debug method to log current state
    debug() {
        console.log('PhantomApiManager Debug Info:', {
            config: this.config,
            isReady: this.isReady(),
            phantomId: this.getPhantomId(),
            mode: this.config.useProxy ? 'PROXY' : 'DIRECT',
            hasCredentials: !!(this.config.apiUsername && this.config.apiKey),
            listeners: Array.from(this.listeners.keys())
        });
    }
}

// Export for use in global App object
if (typeof window !== 'undefined') {
    window.PhantomApiManager = PhantomApiManager;
}

/* ====================================================================================== */
/* REFACTORING NOTES - December 2025 */
/* ====================================================================================== */
/*
CHANGES MADE:
1. Consolidated all API methods into single request() method
2. All requests now use Basic Authentication (credentials from .env via server config)
3. Added useProxy flag to easily switch between proxy (dev) and direct (production) modes
4. Removed redundant code and duplicate methods
5. Simplified backward compatibility methods to just call main methods
6. All responses return standard JSON format

REMOVED/CONSOLIDATED:
- fetchWithTimeout() - functionality moved into request() method
- Duplicate POST methods (postSimpleNoAuth, postWithBasicAuthSimple) - now just wrappers
- No-auth request functions - all requests now authenticated
- Redundant error handling - centralized in request() method

TO SWITCH TO DIRECT API MODE (Production):
Set config.useProxy = false or call: App.managers.api.setProxyMode(false);

AUTHENTICATION:
- In proxy mode: Server adds Basic Auth from .env (PHANTOM_API_USERNAME, PHANTOM_API_KEY)
- In direct mode: Client adds Basic Auth from fetched credentials
- All API calls are now authenticated via HTTPS

*/