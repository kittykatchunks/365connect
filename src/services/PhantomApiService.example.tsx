/**
 * Example Component - Demonstrates PhantomApiService usage
 * 
 * This is a reference implementation showing best practices
 * for using the Phantom API service in React components.
 */

import { useEffect, useState } from 'react';
import { phantomApiService } from '@/services';

// ==================== Types ====================

interface AgentData {
  id: number;
  phone: string;
  name: string;
  status: string;
  extension: string;
}

// ==================== Custom Hook ====================

function usePhantomApi() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      // Initialize with PhantomID from localStorage
      const ready = await phantomApiService.initialize();
      setIsReady(ready);
      
      if (!ready) {
        setError('Failed to initialize Phantom API');
      }
    };

    init();

    // Listen for API errors
    const errorHandler = (err: unknown) => {
      const error = err as { message?: string };
      setError(error.message || 'Unknown API error');
    };

    phantomApiService.on('error', errorHandler);

    return () => {
      phantomApiService.off('error', errorHandler);
    };
  }, []);

  return {
    isReady,
    error,
    api: phantomApiService
  };
}

// ==================== Example Component ====================

export function PhantomApiExample() {
  const { isReady, error: apiError, api } = usePhantomApi();
  const [agentData, setAgentData] = useState<AgentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Example: Fetch agent data
  const fetchAgentData = async (phone: string) => {
    if (!isReady) return;

    setLoading(true);
    setError(null);

    const result = await api.post<AgentData>('AgentfromPhone', { phone });

    if (result.success && result.data) {
      setAgentData(result.data);
    } else {
      setError(result.error || 'Failed to fetch agent data');
    }

    setLoading(false);
  };

  // Example: Test API connection
  const testConnection = async () => {
    if (!isReady) return;

    const result = await api.testConnection();
    
    if (result.success) {
      alert('API connection successful!');
    } else {
      alert(`API connection failed: ${result.error}`);
    }
  };

  // Example: Make NoAuth API call
  const fetchPublicData = async () => {
    if (!isReady) return;

    const result = await api.getNoAuth('PublicEndpoint');
    
    if (result.success) {
      console.log('Public data:', result.data);
    } else {
      console.error('Error:', result.error);
    }
  };

  // Render loading state
  if (!isReady) {
    return (
      <div className="p-4">
        <p>Loading Phantom API...</p>
        {apiError && <p className="text-red-500">Error: {apiError}</p>}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold">Phantom API Example</h2>

      {/* Connection Test */}
      <div className="border p-4 rounded">
        <h3 className="text-lg font-semibold mb-2">Connection Test</h3>
        <button
          onClick={testConnection}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Test API Connection
        </button>
      </div>

      {/* Fetch Agent Data */}
      <div className="border p-4 rounded">
        <h3 className="text-lg font-semibold mb-2">Fetch Agent Data</h3>
        <button
          onClick={() => fetchAgentData('1001')}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
        >
          {loading ? 'Loading...' : 'Fetch Agent 1001'}
        </button>

        {error && (
          <div className="mt-2 p-2 bg-red-100 text-red-700 rounded">
            Error: {error}
          </div>
        )}

        {agentData && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h4 className="font-semibold">Agent Data:</h4>
            <pre className="mt-2 text-sm">{JSON.stringify(agentData, null, 2)}</pre>
          </div>
        )}
      </div>

      {/* NoAuth Example */}
      <div className="border p-4 rounded">
        <h3 className="text-lg font-semibold mb-2">NoAuth API Call</h3>
        <button
          onClick={fetchPublicData}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          Fetch Public Data (NoAuth)
        </button>
        <p className="mt-2 text-sm text-gray-600">
          Check console for response
        </p>
      </div>

      {/* Debug Info */}
      <div className="border p-4 rounded">
        <h3 className="text-lg font-semibold mb-2">Debug</h3>
        <button
          onClick={() => api.debug()}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Log Debug Info
        </button>
        <p className="mt-2 text-sm text-gray-600">
          Logs current API state to console
        </p>
      </div>
    </div>
  );
}

// ==================== Usage Examples (TypeScript) ====================

// Example 1: Simple GET request
export async function exampleGet() {
  const result = await phantomApiService.get('ping');
  if (result.success) {
    console.log('Ping response:', result.data);
  }
}

// Example 2: POST with typed response
export async function examplePostTyped() {
  const result = await phantomApiService.post<AgentData>('AgentfromPhone', {
    phone: '1001'
  });

  if (result.success && result.data) {
    // result.data is typed as AgentData
    console.log(`Agent ${result.data.name} (${result.data.phone})`);
  }
}

// Example 3: NoAuth request
export async function exampleNoAuth() {
  const result = await phantomApiService.postNoAuth('PublicEndpoint', {
    action: 'getData'
  });

  if (result.success) {
    console.log('Public data:', result.data);
  }
}

// Example 4: Error handling
export async function exampleErrorHandling() {
  try {
    const result = await phantomApiService.post('AgentfromPhone', {
      phone: '1001'
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    // Process result.data
    console.log('Success:', result.data);
  } catch (err) {
    const error = err as Error;
    console.error('Request failed:', error.message);
    // Show user notification
  }
}

// Example 5: Custom timeout
export async function exampleWithTimeout() {
  const result = await phantomApiService.get('slowEndpoint', {
    timeout: 60000 // 60 seconds
  });

  if (result.success) {
    console.log('Response:', result.data);
  }
}

// Example 6: Event listeners
export function exampleEventListeners() {
  // Log all requests
  phantomApiService.on('request', (data) => {
    console.log('API Request:', data);
  });

  // Log all responses
  phantomApiService.on('response', (data) => {
    console.log('API Response:', data);
  });

  // Global error handler
  phantomApiService.on('error', (error) => {
    console.error('API Error:', error);
    // Show user notification
  });
}
