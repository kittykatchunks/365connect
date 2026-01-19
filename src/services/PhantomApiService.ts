/**
 * PhantomApiService - React API client for Phantom PBX API
 * 
 * Communicates with Phantom API via Node.js proxy server
 * All authentication is handled server-side via Basic Auth
 * 
 * ARCHITECTURE:
 * - Development: Uses DEV_CORS_PROXY_URL (external proxy)
 * - Production: Uses local /api/phantom/ proxy endpoint
 * - Server handles authentication, URL routing, and CORS
 * 
 * USAGE:
 *   const api = new PhantomApiService();
 *   await api.initialize('375');
 *   
 *   // Authenticated API call
 *   const result = await api.post('AgentfromPhone', { phone: '1001' });
 *   
 *   // NoAuth API call (port 19773)
 *   const result = await api.postNoAuth('SomeEndpoint', { data: 'value' });
 *   
 *   // GET request
 *   const result = await api.get('ping');
 */

import { isVerboseLoggingEnabled } from '@/utils';

// ==================== Types ====================

export interface PhantomApiConfig {
  phantomId: string;
  baseUrl: string;
  noAuthBaseUrl: string;
  timeout: number;
  isDevelopment: boolean;
}

export interface PhantomApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  status?: number;
  error?: string;
  headers?: Headers;
}

export interface PhantomApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  data?: unknown;
  useNoAuth?: boolean;
}

type PhantomApiEventType = 
  | 'initialized'
  | 'request'
  | 'response'
  | 'error'
  | 'configUpdated'
  | 'connectionTest';

type PhantomApiEventCallback = (data: unknown) => void;

// ==================== Phantom API Service ====================

export class PhantomApiService {
  private config: PhantomApiConfig | null = null;
  private listeners: Map<PhantomApiEventType, Set<PhantomApiEventCallback>> = new Map();
  private verboseLogging: boolean = false;

  constructor() {
    this.verboseLogging = isVerboseLoggingEnabled();
    
    if (this.verboseLogging) {
      console.log('[PhantomApiService] Service initialized');
    }
  }

  // ==================== Event Management ====================

  on(event: PhantomApiEventType, callback: PhantomApiEventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: PhantomApiEventType, callback: PhantomApiEventCallback): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(callback);
      if (this.listeners.get(event)!.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  private emit(event: PhantomApiEventType, data: unknown): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[PhantomApiService] Error in ${event} listener:`, error);
        }
      });
    }
  }

  // ==================== Initialization ====================

  /**
   * Initialize the API service with PhantomID
   */
  async initialize(phantomId?: string): Promise<boolean> {
    try {
      // Get PhantomID from parameter or localStorage
      const id = phantomId || this.getPhantomId();
      
      if (!id) {
        console.warn('[PhantomApiService] No PhantomID available');
        return false;
      }

      // Determine environment
      const isDevelopment = this.isDevelopmentMode();
      
      // Build configuration
      this.config = {
        phantomId: id,
        baseUrl: this.buildBaseUrl(isDevelopment),
        noAuthBaseUrl: this.buildNoAuthBaseUrl(isDevelopment),
        timeout: 30000,
        isDevelopment
      };

      if (this.verboseLogging) {
        console.log('[PhantomApiService] 🔧 Configuration:', {
          phantomId: this.config.phantomId,
          baseUrl: this.config.baseUrl,
          noAuthBaseUrl: this.config.noAuthBaseUrl,
          isDevelopment: this.config.isDevelopment,
          mode: isDevelopment ? 'DEVELOPMENT (via proxy)' : 'PRODUCTION (direct)'
        });
      }

      this.emit('initialized', this.config);
      return true;

    } catch (error) {
      console.error('[PhantomApiService] ❌ Initialization error:', error);
      this.emit('error', { type: 'initialization', error });
      return false;
    }
  }

  /**
   * Check if API is ready to use
   */
  isReady(): boolean {
    return this.config !== null;
  }

  /**
   * Get current configuration
   */
  getConfig(): PhantomApiConfig | null {
    return this.config ? { ...this.config } : null;
  }

  // ==================== HTTP Request Methods ====================

  /**
   * Make authenticated GET request
   */
  async get<T = unknown>(endpoint: string, options?: { timeout?: number }): Promise<PhantomApiResponse<T>> {
    return this.request<T>({
      method: 'GET',
      endpoint,
      useNoAuth: false
    }, options);
  }

  /**
   * Make authenticated POST request
   */
  async post<T = unknown>(endpoint: string, data?: unknown, options?: { timeout?: number }): Promise<PhantomApiResponse<T>> {
    return this.request<T>({
      method: 'POST',
      endpoint,
      data,
      useNoAuth: false
    }, options);
  }

  /**
   * Make authenticated PUT request
   */
  async put<T = unknown>(endpoint: string, data?: unknown, options?: { timeout?: number }): Promise<PhantomApiResponse<T>> {
    return this.request<T>({
      method: 'PUT',
      endpoint,
      data,
      useNoAuth: false
    }, options);
  }

  /**
   * Make authenticated DELETE request
   */
  async delete<T = unknown>(endpoint: string, options?: { timeout?: number }): Promise<PhantomApiResponse<T>> {
    return this.request<T>({
      method: 'DELETE',
      endpoint,
      useNoAuth: false
    }, options);
  }

  /**
   * Make NoAuth GET request (port 19773)
   */
  async getNoAuth<T = unknown>(endpoint: string, options?: { timeout?: number }): Promise<PhantomApiResponse<T>> {
    return this.request<T>({
      method: 'GET',
      endpoint,
      useNoAuth: true
    }, options);
  }

  /**
   * Make NoAuth POST request (port 19773)
   */
  async postNoAuth<T = unknown>(endpoint: string, data?: unknown, options?: { timeout?: number }): Promise<PhantomApiResponse<T>> {
    return this.request<T>({
      method: 'POST',
      endpoint,
      data,
      useNoAuth: true
    }, options);
  }

  // ==================== Core Request Method ====================

  /**
   * Core request handler - all HTTP methods flow through here
   */
  private async request<T = unknown>(
    req: PhantomApiRequest,
    options?: { timeout?: number }
  ): Promise<PhantomApiResponse<T>> {
    try {
      // Ensure API is initialized
      if (!this.isReady()) {
        const initialized = await this.initialize();
        if (!initialized) {
          throw new Error('API not configured - PhantomID required');
        }
      }

      const config = this.config!;
      const timeout = options?.timeout || config.timeout;

      // Build full URL
      const url = this.buildRequestUrl(req.endpoint, req.useNoAuth || false);

      // Prepare fetch options
      const fetchOptions: RequestInit = {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        cache: 'no-cache'
      };

      // Add body for POST/PUT
      if (req.data && (req.method === 'POST' || req.method === 'PUT')) {
        fetchOptions.body = JSON.stringify(req.data);
      }

      if (this.verboseLogging) {
        console.log(`[PhantomApiService] 📤 ${req.method} Request:`, {
          url,
          endpoint: req.endpoint,
          method: req.method,
          useNoAuth: req.useNoAuth,
          phantomId: config.phantomId,
          headers: fetchOptions.headers,
          requestBody: req.data,
          timeout: `${timeout}ms`
        });
      }

      // Emit request event
      this.emit('request', {
        method: req.method,
        url,
        endpoint: req.endpoint,
        data: req.data,
        useNoAuth: req.useNoAuth
      });

      // Make request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Handle response
      if (!response.ok) {
        let errorText: string;
        try {
          errorText = await response.text();
        } catch (_e) {
          errorText = `HTTP ${response.status} - ${response.statusText}`;
        }
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // Parse response
      let responseData: T | null = null;
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        try {
          responseData = await response.json();
        } catch (_parseError) {
          console.warn('[PhantomApiService] Failed to parse JSON, returning text');
          responseData = (await response.text()) as T;
        }
      } else {
        // Try JSON first, fallback to text
        const responseText = await response.text();
        try {
          responseData = JSON.parse(responseText);
        } catch (_parseError) {
          responseData = responseText as T;
        }
      }

      if (this.verboseLogging) {
        console.log(`[PhantomApiService] 📥 ${req.method} Response:`, {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          contentType,
          responseHeaders: Object.fromEntries(response.headers.entries()),
          responseData: responseData
        });
      }

      // Emit success event
      this.emit('response', {
        method: req.method,
        url,
        endpoint: req.endpoint,
        data: responseData,
        status: response.status
      });

      return {
        success: true,
        data: responseData,
        status: response.status,
        headers: response.headers
      };

    } catch (error: unknown) {
      const err = error as Error;
      
      if (this.verboseLogging) {
        console.error(`[PhantomApiService] ❌ ${req.method} Error:`, {
          endpoint: req.endpoint,
          url: this.buildRequestUrl(req.endpoint, req.useNoAuth || false),
          method: req.method,
          requestData: req.data,
          errorName: err.name,
          errorMessage: err.message,
          errorStack: err.stack
        });
      } else {
        console.error(`[PhantomApiService] ❌ ${req.method} Error:`, error);
      }

      // Handle error message
      let errorMessage = err.message || 'Unknown error';
      
      // Handle timeout specifically - create new message instead of modifying readonly property
      if (err.name === 'AbortError') {
        errorMessage = `Request timeout after ${options?.timeout || this.config?.timeout || 30000}ms`;
      }

      // Emit error event
      this.emit('error', {
        type: 'request',
        method: req.method,
        endpoint: req.endpoint,
        error,
        message: errorMessage
      });

      return {
        success: false,
        error: errorMessage,
        data: null
      };
    }
  }

  // ==================== Utility Methods ====================

  /**
   * Test API connectivity
   */
  async testConnection(): Promise<PhantomApiResponse> {
    try {
      if (!this.isReady()) {
        return {
          success: false,
          error: 'API not configured',
          data: null
        };
      }

      if (this.verboseLogging) {
        console.log('[PhantomApiService] 🔍 Testing API connection...');
      }

      const result = await this.get('ping', { timeout: 5000 });

      if (result.success) {
        console.log('[PhantomApiService] ✅ API connection test successful');
        this.emit('connectionTest', { success: true, data: result.data });
        return {
          success: true,
          data: result.data
        };
      } else {
        console.warn('[PhantomApiService] ⚠️ API connection test failed:', result.error);
        return result;
      }

    } catch (error: unknown) {
      const err = error as Error;
      console.error('[PhantomApiService] ❌ Connection test error:', err);
      this.emit('connectionTest', { success: false, error: err.message });
      return {
        success: false,
        error: err.message,
        data: null
      };
    }
  }

  /**
   * Debug current state
   */
  debug(): void {
    console.log('[PhantomApiService] 🐛 Debug Info:', {
      config: this.config,
      isReady: this.isReady(),
      phantomId: this.getPhantomId(),
      isDevelopment: this.isDevelopmentMode(),
      listeners: Array.from(this.listeners.keys())
    });
  }

  // ==================== Private Helper Methods ====================

  /**
   * Get PhantomID from localStorage
   */
  private getPhantomId(): string | null {
    try {
      const phantomId = localStorage.getItem('PhantomID');
      if (phantomId && phantomId !== 'null' && phantomId !== 'undefined') {
        return phantomId;
      }
      return null;
    } catch (error) {
      console.error('[PhantomApiService] Error getting PhantomID:', error);
      return null;
    }
  }

  /**
   * Check if running in development mode
   */
  private isDevelopmentMode(): boolean {
    // Check Vite environment variable
    return import.meta.env.MODE === 'development' || import.meta.env.DEV === true;
  }

  /**
   * Build base URL for authenticated API calls
   */
  private buildBaseUrl(isDevelopment: boolean): string {
    if (isDevelopment) {
      // Use external CORS proxy in development
      const proxyUrl = import.meta.env.VITE_DEV_CORS_PROXY_URL || 'https://connect365.servehttp.com';
      return `${proxyUrl}/api/phantom`;
    } else {
      // Use local proxy endpoint in production
      return '/api/phantom';
    }
  }

  /**
   * Build base URL for NoAuth API calls (port 19773)
   */
  private buildNoAuthBaseUrl(isDevelopment: boolean): string {
    if (isDevelopment) {
      // Use external CORS proxy in development
      const proxyUrl = import.meta.env.VITE_DEV_CORS_PROXY_URL || 'https://connect365.servehttp.com';
      return `${proxyUrl}/api/phantom-noauth`;
    } else {
      // Use local proxy endpoint in production
      return '/api/phantom-noauth';
    }
  }

  /**
   * Build full request URL with PhantomID
   */
  private buildRequestUrl(endpoint: string, useNoAuth: boolean): string {
    if (!this.config) {
      throw new Error('API not initialized');
    }

    const baseUrl = useNoAuth ? this.config.noAuthBaseUrl : this.config.baseUrl;
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    
    // Add PhantomID as query parameter for proxy routing
    const separator = cleanEndpoint.includes('?') ? '&' : '?';
    return `${baseUrl}/${cleanEndpoint}${separator}phantomId=${this.config.phantomId}`;
  }
}

// ==================== Singleton Export ====================

/**
 * Singleton instance for global use
 */
export const phantomApiService = new PhantomApiService();

/**
 * Default export
 */
export default PhantomApiService;
