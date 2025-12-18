/* ====================================================================================== */
/* AUTOCAB365 PWA - PHANTOM API MANAGER */
/* Provides API access to the Phantom server */
/* Version: 0.3.29 */
/* ====================================================================================== */

/*
USAGE EXAMPLES:

1. Basic GET request:
   const result = await App.managers.api.get('ping');
   if (result.success) {
       console.log('API response:', result.data);
   }

2. POST request with data:
   const data = { username: 'test', action: 'login' };
   const result = await App.managers.api.post('authenticate', data);

3. Custom request:
   const result = await App.managers.api.request('PUT', 'update-status', { status: 'busy' });

4. Debug functions (available in browser console):
   debugPhantomApiConfiguration()  - Check API configuration
   testPhantomApiConnection()     - Test API connectivity
   examplePhantomApiRequest()     - Make example API call

5. Event listeners:
   App.managers.api.on('error', (error) => console.log('API Error:', error));
   App.managers.api.on('response', (data) => console.log('API Response:', data));

NOTE: API automatically uses PhantomID from settings to generate server URLs.
URL format: https://server1-{PhantomID}.phantomapi.net:19773/api/{api_name}
*/

class PhantomApiManager extends EventTarget {
    constructor() {
        super();
        
        this.config = {
            baseUrl: null,
            phantomId: null,
            timeout: 30000 // 30 seconds default timeout
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
    initialize(phantomId = null) {
        try {
            // Get PhantomID from parameter or localStorage
            this.config.phantomId = phantomId || this.getPhantomId();
            
            if (!this.config.phantomId) {
                console.warn('PhantomApiManager: No PhantomID available');
                return false;
            }

            // Generate base URL from PhantomID
            this.config.baseUrl = this.generateApiUrl(this.config.phantomId);
            
            console.log('PhantomApiManager configured:', {
                phantomId: this.config.phantomId,
                baseUrl: this.config.baseUrl
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
        const port = 19773;
        const basePath = '/api';
        
        return `https://${domain}:${port}${basePath}`;
    }

    // Check if API is configured and ready
    isReady() {
        return this.config.baseUrl !== null && this.config.phantomId !== null;
    }

    // Build proxy URL for Node.js server
    buildProxyUrl(apiName) {
        // Always use the local proxy endpoint with PhantomID
        const baseUrl = `/api/phantom/${apiName}`;
        // Add PhantomID as query parameter if available
        if (this.config.phantomId) {
            return `${baseUrl}?phantomId=${this.config.phantomId}`;
        }
        return baseUrl;
    }

    // Make HTTP request to API via proxy
    async request(method, apiName, data = null, options = {}) {
        try {
            // Ensure API is initialized
            if (!this.isReady() && !this.initialize()) {
                throw new Error('API not configured - PhantomID required');
            }

            // Build URL (always use proxy)
            const url = this.buildProxyUrl(apiName);

            // Prepare request options
            const requestOptions = {
                method: method.toUpperCase(),
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    ...options.headers
                },
                timeout: options.timeout || this.config.timeout
            };

            // Add body for POST/PUT requests
            if (data && (method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT')) {
                requestOptions.body = JSON.stringify(data);
            }

            console.log(`PhantomAPI ${method.toUpperCase()} request (via proxy):`, {
                url,
                data,
                options: requestOptions
            });

            // Emit request event
            this.emit('request', {
                method: method.toUpperCase(),
                url,
                apiName,
                data
            });

            // Make the request with timeout
            const response = await this.fetchWithTimeout(url, requestOptions);

            // Handle response
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            // Parse JSON response
            let responseData;
            try {
                responseData = await response.json();
            } catch (parseError) {
                console.warn('Failed to parse JSON response, returning text:', parseError);
                responseData = await response.text();
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

    // Fetch with timeout support
    async fetchWithTimeout(url, options) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error(`Request timeout after ${options.timeout}ms`);
            }
            throw error;
        }
    }

    // Convenience method for GET requests
    async get(apiName, options = {}) {
        return await this.request('GET', apiName, null, options);
    }

    // Convenience method for POST requests
    async post(apiName, data = null, options = {}) {
        return await this.request('POST', apiName, data, options);
    }

    // Convenience method for PUT requests
    async put(apiName, data = null, options = {}) {
        return await this.request('PUT', apiName, data, options);
    }

    // Convenience method for DELETE requests
    async delete(apiName, options = {}) {
        return await this.request('DELETE', apiName, null, options);
    }

    // Convenience method for POST requests with Basic Authentication
    async postWithBasicAuth(apiName, data = null, username, password, options = {}) {
        const authString = btoa(`${username}:${password}`);
        const authOptions = {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Basic ${authString}`
            }
        };
        return await this.request('POST', apiName, data, authOptions);
    }

    // POST request with no auth to test CORS - uses proxy to avoid CORS issues
    async postSimpleNoAuth(apiName, data = null, options = {}) {
        try {
            // Ensure API is initialized
            if (!this.isReady() && !this.initialize()) {
                throw new Error('API not configured - PhantomID required');
            }

            // Build proxy URL with only PhantomID as query parameter
            let url = `/api/phantom/${apiName}`;
            if (this.config.phantomId) {
                url += `?phantomId=${this.config.phantomId}`;
            }

            console.log(`PhantomAPI Simple POST request (via proxy):`, {
                fullUrl: url,
                apiName,
                phantomId: this.config.phantomId,
                bodyData: data
            });

            // Emit request event
            this.emit('request', {
                method: 'POST',
                url,
                apiName,
                data
            });

            // POST request with JSON body through proxy
            const requestOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: data ? JSON.stringify(data) : null,
                cache: 'no-cache'
            };

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

            // Parse response
            let responseData;
            const contentType = response.headers.get('content-type') || '';
            
            if (contentType.includes('application/json')) {
                try {
                    responseData = await response.json();
                } catch (parseError) {
                    console.warn('Failed to parse JSON response despite content-type, returning text:', parseError);
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

            console.log(`PhantomAPI Simple POST response:`, responseData);

            // Emit success event
            this.emit('response', {
                method: 'POST',
                url,
                apiName,
                data: responseData,
                status: response.status
            });

            return responseData; // Return data directly to match existing API

        } catch (error) {
            console.error(`PhantomAPI Simple POST error:`, error);
            
            // Handle timeout error specifically
            if (error.name === 'AbortError') {
                error.message = `Request timeout after ${options.timeout || this.config.timeout}ms`;
            }
            
            // Emit error event
            this.emit('error', {
                type: 'request',
                method: 'POST',
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

    // POST request with Basic Auth through proxy
    async postWithBasicAuthSimple(apiName, data = null, username, password, options = {}) {
        try {
            // Ensure API is initialized
            if (!this.isReady() && !this.initialize()) {
                throw new Error('API not configured - PhantomID required');
            }

            // Build proxy URL with PhantomID and auth as query parameters
            let url = `/api/phantom/${apiName}`;
            const params = new URLSearchParams();
            
            // Add PhantomID
            if (this.config.phantomId) {
                params.append('phantomId', this.config.phantomId);
            }
            
            // Add basic auth to URL (as query params to avoid Authorization header)
            if (username && password) {
                params.append('auth_user', username);
                params.append('auth_pass', password);
            }

            if (params.toString()) {
                url += '?' + params.toString();
            }

            console.log(`PhantomAPI POST with Basic Auth (via proxy):`, {
                url: url.replace(/auth_pass=[^&]+/, 'auth_pass=***'), // Hide password in logs
                bodyData: data
            });

            // Emit request event
            this.emit('request', {
                method: 'POST',
                url,
                apiName,
                data
            });

            // POST request with JSON body through proxy
            const requestOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: data ? JSON.stringify(data) : null,
                cache: 'no-cache'
            };

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

            // Parse response
            let responseData;
            const contentType = response.headers.get('content-type') || '';
            
            if (contentType.includes('application/json')) {
                try {
                    responseData = await response.json();
                } catch (parseError) {
                    console.warn('Failed to parse JSON response despite content-type, returning text:', parseError);
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

            console.log(`PhantomAPI Simple POST response:`, responseData);

            // Emit success event
            this.emit('response', {
                method: 'POST',
                url,
                apiName,
                data: responseData,
                status: response.status
            });

            return responseData; // Return data directly to match existing API

        } catch (error) {
            console.error(`PhantomAPI Simple POST error:`, error);
            
            // Handle timeout error specifically
            if (error.name === 'AbortError') {
                error.message = `Request timeout after ${options.timeout || this.config.timeout}ms`;
            }
            
            // Emit error event
            this.emit('error', {
                type: 'request',
                method: 'POST',
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
            listeners: Array.from(this.listeners.keys())
        });
    }
}

// Export for use in global App object
if (typeof window !== 'undefined') {
    window.PhantomApiManager = PhantomApiManager;
}
