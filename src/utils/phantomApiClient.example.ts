// ============================================
// Example: Using Phantom API Client
// ============================================
// This file demonstrates how to use the phantomApiClient
// utilities in your services and components

import { phantomApiCall, phantomApiGet, phantomApiPost } from '@/utils';

/**
 * Example: Fetch agent status from Phantom API
 */
export async function fetchAgentStatus(agentNumber: string) {
  try {
    const response = await phantomApiGet(
      `https://server1-388.phantomapi.net/api/agents/${agentNumber}/status`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch agent status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[AgentService] Failed to fetch status:', error);
    throw error;
  }
}

/**
 * Example: Update agent state
 */
export async function updateAgentState(agentNumber: string, state: string) {
  try {
    const response = await phantomApiPost(
      `https://server1-388.phantomapi.net/api/agents/${agentNumber}/state`,
      { state }
    );

    if (!response.ok) {
      throw new Error(`Failed to update agent state: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[AgentService] Failed to update state:', error);
    throw error;
  }
}

/**
 * Example: Using phantomApiCall directly for custom requests
 */
export async function customPhantomRequest() {
  const response = await phantomApiCall(
    'https://server1-388.phantomapi.net/api/custom-endpoint',
    {
      method: 'PATCH',
      headers: {
        'X-Custom-Header': 'value',
      },
      body: JSON.stringify({ data: 'example' }),
    }
  );

  return response;
}

/**
 * Example: Using in a React component
 */
/*
import { usePhantomAPI } from '@/contexts';
import { phantomApiGet } from '@/utils';

function MyComponent() {
  const { apiKey, refreshAPIKey } = usePhantomAPI();
  
  const fetchData = async () => {
    // API key is automatically injected by phantomApiGet
    const response = await phantomApiGet('/api/endpoint');
    const data = await response.json();
    // Use data...
  };
  
  // Manual refresh if needed
  const handleRefresh = async () => {
    await refreshAPIKey();
    // After refresh, new key is automatically used
  };
  
  return (
    <div>
      <button onClick={fetchData}>Fetch Data</button>
      <button onClick={handleRefresh}>Refresh API Key</button>
      {apiKey ? 'API Key Loaded' : 'No API Key'}
    </div>
  );
}
*/
