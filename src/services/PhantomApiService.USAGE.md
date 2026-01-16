# PhantomApiService Usage Guide

## Overview

**PhantomApiService** is the React/TypeScript API client for communicating with the Phantom PBX API. It handles authenticated and non-authenticated requests with automatic environment detection.

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   React App     │──HTTP──▶│  Node.js Proxy   │──HTTPS─▶│  Phantom API    │
│ PhantomApiSvc   │         │   (server.js)    │         │ server1-375.net │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                    │
                                    │ Adds Basic Auth
                                    │ Routes by PhantomID
                                    │ Handles CORS
```

### Environment Modes

#### **Development Mode** (`NODE_ENV=development`)
- React app → `https://connect365.servehttp.com/api/phantom/`
- External CORS proxy handles authentication
- Configured via `VITE_DEV_CORS_PROXY_URL` env variable

#### **Production Mode** (`NODE_ENV=production`)
- React app → `/api/phantom/` (local server)
- Local Node.js proxy at `server.js` adds authentication
- Direct connection to Phantom API

### API Ports

- **Port 443** (HTTPS): Authenticated API calls - requires Basic Auth
- **Port 19773**: NoAuth API calls - no authentication required

---

## Installation

The service is already integrated into the project:

```typescript
import { phantomApiService } from '@/services';
// or
import { PhantomApiService } from '@/services';
```

---

## Quick Start

### 1. Initialize the Service

```typescript
import { phantomApiService } from '@/services';

// Initialize with PhantomID (usually on app startup)
await phantomApiService.initialize('375');

// Check if ready
if (phantomApiService.isReady()) {
  console.log('API ready!');
}
```

### 2. Make API Calls

#### **Authenticated POST Request**
```typescript
const result = await phantomApiService.post('AgentfromPhone', {
  phone: '1001'
});

if (result.success) {
  console.log('Agent data:', result.data);
} else {
  console.error('Error:', result.error);
}
```

#### **Authenticated GET Request**
```typescript
const result = await phantomApiService.get('ping');

if (result.success) {
  console.log('Ping response:', result.data);
}
```

#### **NoAuth Request (Port 19773)**
```typescript
const result = await phantomApiService.postNoAuth('SomeEndpoint', {
  data: 'value'
});
```

---

## API Reference

### Methods

#### **initialize(phantomId?: string): Promise<boolean>**
Initialize the service with a PhantomID. If not provided, reads from localStorage.

```typescript
await phantomApiService.initialize('375');
```

#### **get<T>(endpoint: string, options?): Promise<PhantomApiResponse<T>>**
Make authenticated GET request.

```typescript
const result = await phantomApiService.get<PingResponse>('ping');
```

#### **post<T>(endpoint: string, data?: any, options?): Promise<PhantomApiResponse<T>>**
Make authenticated POST request.

```typescript
const result = await phantomApiService.post<AgentData>('AgentfromPhone', {
  phone: '1001'
});
```

#### **put<T>(endpoint: string, data?: any, options?): Promise<PhantomApiResponse<T>>**
Make authenticated PUT request.

```typescript
const result = await phantomApiService.put('UpdateAgent', {
  id: 123,
  status: 'available'
});
```

#### **delete<T>(endpoint: string, options?): Promise<PhantomApiResponse<T>>**
Make authenticated DELETE request.

```typescript
const result = await phantomApiService.delete('RemoveAgent/123');
```

#### **getNoAuth<T>(endpoint: string, options?): Promise<PhantomApiResponse<T>>**
Make NoAuth GET request (port 19773).

```typescript
const result = await phantomApiService.getNoAuth('PublicEndpoint');
```

#### **postNoAuth<T>(endpoint: string, data?: any, options?): Promise<PhantomApiResponse<T>>**
Make NoAuth POST request (port 19773).

```typescript
const result = await phantomApiService.postNoAuth('PublicData', {
  value: 'test'
});
```

#### **testConnection(): Promise<PhantomApiResponse>**
Test API connectivity with a ping request.

```typescript
const result = await phantomApiService.testConnection();
if (result.success) {
  console.log('API is reachable');
}
```

#### **isReady(): boolean**
Check if the service is initialized and ready.

```typescript
if (phantomApiService.isReady()) {
  // Make API calls
}
```

#### **getConfig(): PhantomApiConfig | null**
Get current configuration.

```typescript
const config = phantomApiService.getConfig();
console.log('PhantomID:', config?.phantomId);
```

#### **debug(): void**
Log current state for troubleshooting.

```typescript
phantomApiService.debug();
```

### Options

All request methods accept an optional `options` object:

```typescript
{
  timeout?: number;  // Request timeout in milliseconds (default: 30000)
}
```

Example:
```typescript
const result = await phantomApiService.get('ping', { timeout: 5000 });
```

---

## Response Format

All API methods return a `PhantomApiResponse<T>`:

```typescript
interface PhantomApiResponse<T = any> {
  success: boolean;      // true if request succeeded
  data: T | null;        // Response data (parsed JSON)
  status?: number;       // HTTP status code
  error?: string;        // Error message if failed
  headers?: Headers;     // Response headers
}
```

### Success Response
```typescript
{
  success: true,
  data: { /* parsed JSON response */ },
  status: 200,
  headers: Headers { ... }
}
```

### Error Response
```typescript
{
  success: false,
  data: null,
  error: "HTTP 404: Not Found"
}
```

---

## Event System

The service emits events for monitoring:

```typescript
// Listen for events
phantomApiService.on('initialized', (config) => {
  console.log('API initialized:', config);
});

phantomApiService.on('request', (data) => {
  console.log('API request:', data);
});

phantomApiService.on('response', (data) => {
  console.log('API response:', data);
});

phantomApiService.on('error', (error) => {
  console.error('API error:', error);
});

// Remove listener
phantomApiService.off('error', errorHandler);
```

### Available Events

- `initialized` - Service initialized with config
- `request` - Before each API request
- `response` - After successful response
- `error` - On request or initialization error
- `configUpdated` - Configuration changed

---

## React Hook Integration

### Create a Custom Hook

```typescript
// hooks/usePhantomApi.ts
import { useEffect, useState } from 'react';
import { phantomApiService } from '@/services';

export function usePhantomApi() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const ready = await phantomApiService.initialize();
      setIsReady(ready);
      if (!ready) {
        setError('Failed to initialize API');
      }
    };

    init();

    // Listen for errors
    const errorHandler = (err: any) => {
      setError(err.message);
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
```

### Use in Component

```typescript
import { usePhantomApi } from '@/hooks/usePhantomApi';

function MyComponent() {
  const { isReady, error, api } = usePhantomApi();

  const fetchAgent = async () => {
    if (!isReady) return;

    const result = await api.post('AgentfromPhone', {
      phone: '1001'
    });

    if (result.success) {
      console.log('Agent:', result.data);
    }
  };

  if (error) return <div>Error: {error}</div>;
  if (!isReady) return <div>Loading API...</div>;

  return <button onClick={fetchAgent}>Fetch Agent</button>;
}
```

---

## TypeScript Types

Define your API response types:

```typescript
// types/api.ts
export interface AgentData {
  id: number;
  phone: string;
  name: string;
  status: string;
}

export interface PingResponse {
  message: string;
  timestamp: number;
}

// Use in requests
const result = await phantomApiService.post<AgentData>('AgentfromPhone', {
  phone: '1001'
});

if (result.success && result.data) {
  // result.data is typed as AgentData
  console.log(result.data.name);
}
```

---

## Error Handling

### Basic Error Handling
```typescript
const result = await phantomApiService.post('AgentfromPhone', {
  phone: '1001'
});

if (!result.success) {
  console.error('API Error:', result.error);
  // Handle error
}
```

### Try-Catch Pattern
```typescript
try {
  const result = await phantomApiService.post('AgentfromPhone', {
    phone: '1001'
  });
  
  if (result.success) {
    // Success
  } else {
    // API returned error
    throw new Error(result.error);
  }
} catch (error) {
  console.error('Request failed:', error);
}
```

### Global Error Handler
```typescript
phantomApiService.on('error', (error) => {
  // Global error handling
  console.error('API Error:', error);
  
  // Show user notification
  showNotification({
    type: 'error',
    message: error.message
  });
});
```

---

## Environment Variables

### `.env` File (Server)
```bash
# Required
PHANTOM_ID=375
PHANTOM_API_BASE_URL=https://server1-375.phantomapi.net
PHANTOM_API_USERNAME=ghost2
PHANTOM_API_KEY=tah4Aesh9zaeka4Eigheez3aoshail
PHANTOM_API_PORT=443
PHANTOM_NOAUTH_PORT=19773

# Development only
NODE_ENV=development
DEV_CORS_PROXY_URL=https://connect365.servehttp.com
```

### `.env` File (Vite/React)
```bash
# Development CORS proxy
VITE_DEV_CORS_PROXY_URL=https://connect365.servehttp.com
```

---

## Testing

### Test Connection
```typescript
const result = await phantomApiService.testConnection();
console.log('Connection test:', result.success ? 'PASSED' : 'FAILED');
```

### Debug Info
```typescript
phantomApiService.debug();
// Outputs:
// {
//   config: { phantomId: '375', baseUrl: '...', ... },
//   isReady: true,
//   isDevelopment: true,
//   listeners: ['request', 'response', 'error']
// }
```

---

## Verbose Logging

Enable verbose logging in settings to see detailed API activity:

```typescript
// All API requests and responses will be logged to console
localStorage.setItem('VerboseLogging', 'true');
```

Console output example:
```
[PhantomApiService] 📤 POST Request: {
  url: "https://connect365.servehttp.com/api/phantom/AgentfromPhone?phantomId=375",
  endpoint: "AgentfromPhone",
  data: { phone: "1001" }
}

[PhantomApiService] 📥 POST Response: {
  status: 200,
  data: { id: 123, name: "Agent 1001", ... }
}
```

---

## Migration from PWA

If migrating from the PWA's `PhantomApiManager`:

### Before (PWA)
```javascript
const result = await App.managers.api.post('AgentfromPhone', {
  phone: '1001'
});
```

### After (React)
```typescript
import { phantomApiService } from '@/services';

const result = await phantomApiService.post('AgentfromPhone', {
  phone: '1001'
});
```

The API is nearly identical for easy migration!

---

## Troubleshooting

### "API not configured" Error
- Ensure `initialize()` is called before making requests
- Check that PhantomID is stored in localStorage
- Verify `.env` variables are set correctly

### CORS Errors in Development
- Ensure `VITE_DEV_CORS_PROXY_URL` is set in `.env`
- Check that proxy server is running and accessible
- Verify `server.js` proxy middleware is configured

### Timeout Errors
- Increase timeout: `{ timeout: 60000 }` (60 seconds)
- Check network connectivity to Phantom API
- Verify PhantomID generates correct server URL

### Authentication Errors
- Verify `PHANTOM_API_USERNAME` and `PHANTOM_API_KEY` in `.env`
- Check server logs for authentication issues
- Ensure credentials match Phantom API requirements

---

## Best Practices

1. **Initialize Once**: Call `initialize()` at app startup, not before every request
2. **Type Your Responses**: Define TypeScript interfaces for API responses
3. **Handle Errors**: Always check `result.success` before using `result.data`
4. **Use Events**: Monitor API activity with event listeners
5. **Enable Logging**: Turn on verbose logging during development
6. **Test Connection**: Use `testConnection()` to verify API availability
7. **Timeout Wisely**: Set appropriate timeouts for different endpoints

---

## Support

For issues or questions:
- Check verbose logging output
- Run `phantomApiService.debug()` for diagnostics
- Review server logs in `logs/` directory
- Consult `.env.example` for configuration reference
