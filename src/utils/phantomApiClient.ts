// ============================================
// Phantom API Client - HTTP Client with Dynamic Key
// ============================================

import { isVerboseLoggingEnabled } from './index';

let currentApiKey: string | null = null;
let refreshCallback: (() => Promise<void>) | null = null;

/**
 * Set the current API key to be used in requests
 */
export const setPhantomAPIKey = (key: string) => {
  const verboseLogging = isVerboseLoggingEnabled();
  
  if (verboseLogging) {
    console.log('[PhantomAPIClient] 🔑 API key updated');
  }
  
  currentApiKey = key;
};

/**
 * Set callback function to refresh API key when unauthorized
 */
export const setPhantomAPIRefreshCallback = (callback: () => Promise<void>) => {
  refreshCallback = callback;
};

/**
 * Get the current API key (for debugging/testing)
 */
export const getPhantomAPIKey = (): string | null => {
  return currentApiKey;
};

/**
 * Make an API call to Phantom API with automatic key injection
 * Will auto-retry once if 401/403 received
 */
export const phantomApiCall = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const verboseLogging = isVerboseLoggingEnabled();
  
  if (verboseLogging) {
    console.log('[PhantomAPIClient] 📤 API Request:', {
      endpoint,
      method: options.method || 'GET',
      hasApiKey: !!currentApiKey
    });
  }

  // Build headers with API key
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Merge existing headers
  if (options.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      if (typeof value === 'string') {
        headers[key] = value;
      }
    });
  }

  // Add API key header if available
  if (currentApiKey) {
    headers['X-API-Key'] = currentApiKey;
  } else if (verboseLogging) {
    console.warn('[PhantomAPIClient] ⚠️ No API key available for request');
  }

  // Make initial request
  let response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (verboseLogging) {
    console.log('[PhantomAPIClient] 📥 API Response:', {
      status: response.status,
      statusText: response.statusText,
      endpoint
    });
  }

  // Handle unauthorized - try refresh and retry once
  if ((response.status === 401 || response.status === 403) && refreshCallback) {
    if (verboseLogging) {
      console.warn('[PhantomAPIClient] 🔑 Unauthorized response, attempting key refresh...');
    }

    try {
      await refreshCallback();

      // Retry with fresh key
      const retryHeaders: Record<string, string> = { ...headers };
      if (currentApiKey) {
        retryHeaders['X-API-Key'] = currentApiKey;
      }

      response = await fetch(endpoint, {
        ...options,
        headers: retryHeaders,
      });

      if (verboseLogging) {
        console.log('[PhantomAPIClient] 🔄 Retry after refresh:', {
          status: response.status,
          statusText: response.statusText
        });
      }
    } catch (refreshError) {
      if (verboseLogging) {
        console.error('[PhantomAPIClient] ❌ Key refresh failed:', refreshError);
      }
      // Continue with original unauthorized response
    }
  }

  return response;
};

/**
 * Helper for GET requests
 */
export const phantomApiGet = async (endpoint: string): Promise<Response> => {
  return phantomApiCall(endpoint, { method: 'GET' });
};

/**
 * Helper for POST requests
 */
export const phantomApiPost = async (
  endpoint: string,
  body: unknown
): Promise<Response> => {
  return phantomApiCall(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  });
};

/**
 * Helper for PUT requests
 */
export const phantomApiPut = async (
  endpoint: string,
  body: unknown
): Promise<Response> => {
  return phantomApiCall(endpoint, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
};

/**
 * Helper for DELETE requests
 */
export const phantomApiDelete = async (endpoint: string): Promise<Response> => {
  return phantomApiCall(endpoint, { method: 'DELETE' });
};
