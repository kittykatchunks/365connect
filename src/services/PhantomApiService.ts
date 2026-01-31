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

export interface QueueListItem {
  /** Queue name/label */
  label: string;
  /** Queue number/extension */
  name: string;
  /** Additional queue information (not fully typed) */
  [key: string]: unknown;
}

export interface QueueListResponse {
  response: string;
  aaData: QueueListItem[];
}

export interface WallBoardCounter {
  name: string;
  val: string | number;
}

export interface WallBoardCounters {
  [key: string]: WallBoardCounter | number;
}

export interface WallBoardStatsResponse {
  pausereasons?: Record<string, string>;
  agents?: Record<string, unknown>;
  agentstotal?: Record<string, number>;
  calls?: unknown;
  counters: WallBoardCounters;
  block?: unknown;
  version?: unknown;
  refresh?: number;
  alarms?: unknown;
}

// ==================== Agent Login/Logout Types ====================

export interface AgentLogonRequest {
  /** Agent number from login modal */
  agent: string;
  /** SIP username from connection settings */
  phone: string;
  /** Optional comma-separated list of queues to join */
  queues?: string;
}

export interface AgentLogoffRequest {
  /** Agent number to log off */
  agent: string;
}

export type AgentApiResponse = 'success' | 'failure';

// Response wrapper type - Phantom API returns { response: 'success' } or { response: 'failure' }
export interface AgentApiResponseWrapper {
  response: AgentApiResponse;
}

export interface QueueMemberItem {
  /** Queue number/extension */
  queue: string;
  /** Queue display name/label */
  queuelabel: string;
  /** Agent number */
  agent: string;
  /** Agent display name */
  agentname: string;
}

export interface QueueMemberListRequest {
  /** Agent number to query */
  agent: string;
}

export interface QueueMemberListResponse {
  /** Array of queue memberships */
  aaData: QueueMemberItem[];
  /** Response status */
  response: 'success' | 'failure';
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
  
  // JWT Token caching - stored for app session lifetime
  private webToken: string | null = null;
  private tokenFetchPromise: Promise<string | null> | null = null;

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

  // ==================== JWT Token Management ====================

  /**
   * Get cached web token or fetch a new one
   * Token is cached for the entire app session lifetime
   * Handles concurrent requests by reusing the same fetch promise
   */
  async getWebToken(): Promise<string | null> {
    // Return cached token if available (stored for app session lifetime)
    if (this.webToken) {
      if (this.verboseLogging) {
        console.log('[PhantomApiService] 🔑 Using cached web token (session-lifetime)');
      }
      return this.webToken;
    }

    // Prevent multiple simultaneous fetches - reuse existing promise
    if (this.tokenFetchPromise) {
      if (this.verboseLogging) {
        console.log('[PhantomApiService] 🔄 Token fetch already in progress, waiting...');
      }
      return this.tokenFetchPromise;
    }

    // Start new fetch
    this.tokenFetchPromise = this.fetchWebToken();
    
    try {
      const token = await this.tokenFetchPromise;
      return token;
    } finally {
      this.tokenFetchPromise = null;
    }
  }

  /**
   * Fetch a fresh web token from the API
   */
  private async fetchWebToken(): Promise<string | null> {
    try {
      const phantomId = this.getPhantomId();
      
      if (!phantomId) {
        console.error('[PhantomApiService] ❌ Cannot fetch web token - no PhantomID');
        return null;
      }

      if (this.verboseLogging) {
        console.log('[PhantomApiService] 🔑 Fetching new web token for PhantomID:', phantomId);
      }

      // Use the proxy endpoint for JWT fetch
      const isDevelopment = this.isDevelopmentMode();
      const proxyUrl = isDevelopment 
        ? (import.meta.env.VITE_DEV_CORS_PROXY_URL || 'https://connect365.servehttp.com')
        : '';
      
      const jwtUrl = `${proxyUrl}/api/phantom/JWTWebToken?phantomId=${phantomId}`;
      
      if (this.verboseLogging) {
        console.log('[PhantomApiService] 📤 JWT request URL:', jwtUrl);
      }

      const response = await fetch(jwtUrl);

      if (!response.ok) {
        throw new Error(`JWT fetch failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (this.verboseLogging) {
        console.log('[PhantomApiService] 📥 JWT response:', {
          hasWBtoken: !!data.WBtoken,
          hasWebtoken: !!data.webtoken,
          hasToken: !!data.token,
          hasJwt: !!data.jwt
        });
      }

      // Extract token from various possible field names
      const token = data.WBtoken || data.webtoken || data.token || data.jwt;

      if (!token) {
        console.error('[PhantomApiService] ❌ No token found in JWT response');
        return null;
      }

      // Cache the token for app session lifetime
      this.webToken = token;

      if (this.verboseLogging) {
        console.log('[PhantomApiService] ✅ Web token cached for session lifetime', {
          tokenLength: token.length
        });
      }

      return token;

    } catch (error) {
      console.error('[PhantomApiService] ❌ Error fetching web token:', error);
      // Clear any stale token on error
      this.webToken = null;
      return null;
    }
  }

  /**
   * Clear the cached web token (useful for logout or token invalidation)
   */
  clearWebToken(): void {
    if (this.verboseLogging) {
      console.log('[PhantomApiService] 🗑️ Clearing cached web token');
    }
    this.webToken = null;
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

  // ==================== Queue Management Methods ====================

  /**
   * Fetch list of available queues from the QueueList API
   * Endpoint: /api/QueueList
   * Returns queue name (label) and queue number (name)
   */
  async fetchQueueList(): Promise<PhantomApiResponse<QueueListResponse>> {
    if (this.verboseLogging) {
      console.log('[PhantomApiService] 📋 Fetching queue list from API...');
    }

    try {
      const response = await this.get<QueueListResponse>('QueueList');
      
      if (this.verboseLogging) {
        console.log('[PhantomApiService] ✅ Queue list response:', response);
        if (response.success && response.data) {
          console.log('[PhantomApiService] 📊 Found queues:', response.data.aaData?.length || 0);
        }
      }

      return response;
    } catch (error) {
      if (this.verboseLogging) {
        console.error('[PhantomApiService] ❌ Failed to fetch queue list:', error);
      }
      throw error;
    }
  }

  /**
   * Fetch wallboard statistics including queue metrics
   * Endpoint: /api/WallBoardStats
   * Returns counters with per-queue statistics
   */
  async fetchWallBoardStats(): Promise<PhantomApiResponse<WallBoardStatsResponse>> {
    if (this.verboseLogging) {
      console.log('[PhantomApiService] 📊 Fetching wallboard stats from API...');
    }

    try {
      const response = await this.get<WallBoardStatsResponse>('WallBoardStats');
      
      if (this.verboseLogging) {
        console.log('[PhantomApiService] ✅ Wallboard stats response:', response);
        if (response.success && response.data?.counters) {
          const counterCount = Object.keys(response.data.counters).length;
          console.log('[PhantomApiService] 📈 Received counters:', counterCount);
        }
      }

      return response;
    } catch (error) {
      if (this.verboseLogging) {
        console.error('[PhantomApiService] ❌ Failed to fetch wallboard stats:', error);
      }
      throw error;
    }
  }

  // ==================== Agent Login/Logout Methods ====================

  /**
   * Login agent via API (Primary method)
   * Endpoint: /api/GhostLogon (Basic Auth)
   * @param agent - Agent number from login modal
   * @param phone - SIP username from connection settings
   * @param queues - Optional comma-separated list of queues to join
   * @returns 'success' or 'failure'
   */
  async agentLogon(agent: string, phone: string, queues?: string): Promise<{ success: boolean; response: AgentApiResponse }> {
    if (this.verboseLogging) {
      console.log('[PhantomApiService] 🔐 Agent login via API...', {
        agent,
        phone,
        queues: queues || '(none specified)'
      });
    }

    try {
      const requestData: AgentLogonRequest = {
        agent,
        phone,
        queues: queues || ''
      };

      if (this.verboseLogging) {
        console.log('[PhantomApiService] 📤 GhostLogon request:', requestData);
      }

      const response = await this.post<AgentApiResponse | AgentApiResponseWrapper>('GhostLogon', requestData);

      if (this.verboseLogging) {
        console.log('[PhantomApiService] 📥 GhostLogon response:', response);
      }

      // Handle both formats: 'success' string or { response: 'success' } object
      const isSuccess = response.success && (
        response.data === 'success' || 
        (typeof response.data === 'object' && response.data !== null && (response.data as AgentApiResponseWrapper).response === 'success')
      );

      if (isSuccess) {
        if (this.verboseLogging) {
          console.log('[PhantomApiService] ✅ Agent login API successful');
        }
        return { success: true, response: 'success' };
      } else {
        if (this.verboseLogging) {
          console.warn('[PhantomApiService] ⚠️ Agent login API returned failure or unexpected response:', response.data);
        }
        return { success: false, response: 'failure' };
      }
    } catch (error) {
      if (this.verboseLogging) {
        console.error('[PhantomApiService] ❌ Agent login API error:', error);
      }
      return { success: false, response: 'failure' };
    }
  }

  /**
   * Logout agent via API (Primary method)
   * Endpoint: /api/GhostLogoff (Basic Auth)
   * @param agent - Agent number to log off
   * @returns 'success' or 'failure'
   */
  async agentLogoff(agent: string): Promise<{ success: boolean; response: AgentApiResponse }> {
    if (this.verboseLogging) {
      console.log('[PhantomApiService] 🚪 Agent logout via API...', { agent });
    }

    try {
      const requestData: AgentLogoffRequest = { agent };

      if (this.verboseLogging) {
        console.log('[PhantomApiService] 📤 GhostLogoff request:', requestData);
      }

      const response = await this.post<AgentApiResponse | AgentApiResponseWrapper>('GhostLogoff', requestData);

      if (this.verboseLogging) {
        console.log('[PhantomApiService] 📥 GhostLogoff response:', response);
      }

      // Handle both formats: 'success' string or { response: 'success' } object
      const isSuccess = response.success && (
        response.data === 'success' || 
        (typeof response.data === 'object' && response.data !== null && (response.data as AgentApiResponseWrapper).response === 'success')
      );

      if (isSuccess) {
        if (this.verboseLogging) {
          console.log('[PhantomApiService] ✅ Agent logout API successful');
        }
        return { success: true, response: 'success' };
      } else {
        if (this.verboseLogging) {
          console.warn('[PhantomApiService] ⚠️ Agent logout API returned failure or unexpected response:', response.data);
        }
        return { success: false, response: 'failure' };
      }
    } catch (error) {
      if (this.verboseLogging) {
        console.error('[PhantomApiService] ❌ Agent logout API error:', error);
      }
      return { success: false, response: 'failure' };
    }
  }

  /**
   * Get list of queues that an agent is currently logged into
   * Endpoint: /api/QueueMemberList (Basic Auth)
   * @param agent - Agent number to query
   * @returns Array of queue memberships or empty array on failure
   */
  async getQueueMemberList(agent: string): Promise<{ success: boolean; queues: QueueMemberItem[] }> {
    if (this.verboseLogging) {
      console.log('[PhantomApiService] 📋 Fetching queue member list for agent:', agent);
    }

    try {
      const requestData: QueueMemberListRequest = { agent };

      if (this.verboseLogging) {
        console.log('[PhantomApiService] 📤 QueueMemberList request:', requestData);
      }

      const response = await this.post<QueueMemberListResponse>('QueueMemberList', requestData);

      if (this.verboseLogging) {
        console.log('[PhantomApiService] 📥 QueueMemberList response:', response);
      }

      if (response.success && response.data?.response === 'success' && response.data?.aaData) {
        const queues = response.data.aaData;
        
        if (this.verboseLogging) {
          console.log('[PhantomApiService] ✅ QueueMemberList successful, found queues:', queues.length);
          queues.forEach((q) => {
            console.log(`[PhantomApiService]   📌 Queue: ${q.queue} (${q.queuelabel}) - Agent: ${q.agent} (${q.agentname})`);
          });
        }
        
        return { success: true, queues };
      } else {
        if (this.verboseLogging) {
          console.warn('[PhantomApiService] ⚠️ QueueMemberList returned failure or no data:', response.data);
        }
        return { success: false, queues: [] };
      }
    } catch (error) {
      if (this.verboseLogging) {
        console.error('[PhantomApiService] ❌ QueueMemberList API error:', error);
      }
      return { success: false, queues: [] };
    }
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
