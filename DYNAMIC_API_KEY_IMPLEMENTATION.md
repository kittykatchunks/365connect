# Dynamic API Key Management - Implementation Guide

## Overview

This implementation provides automatic, dynamic API key management for the Phantom API integration. The system polls the server for API key updates and automatically applies them to all API calls without requiring page reloads or user intervention.

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────┐
│   .env File     │────────▶│  Node.js Server  │◀────────│  React App  │
│                 │         │   (server.cjs)   │         │             │
│ PHANTOM_API_KEY │         │                  │         │  Context +  │
│                 │         │  /api/phantom/   │         │   Client    │
└─────────────────┘         │   current-key    │         └─────────────┘
                            └──────────────────┘
                                     │
                                     ▼
                            ┌──────────────────┐
                            │  Phantom API     │
                            │  (with API key)  │
                            └──────────────────┘
```

## Components

### 1. Environment Configuration (`.env`)

**File**: `c:\Users\james\Visual Studio Code\365connect\.env`

```bash
# Dynamic API Key for React app (update this to refresh all connected clients)
REACT_APP_PHANTOM_API_KEY=aibiuFiquaeCuuve9Vohcheedee6ka
```

**To update the API key:**
1. Edit the `REACT_APP_PHANTOM_API_KEY` value in `.env`
2. Restart the server (production) or wait for auto-reload (development)
3. Connected React apps will detect the change within 5 minutes (default poll interval)

### 2. Server-Side API Endpoint (`server.cjs`)

**Endpoint**: `GET /api/phantom/current-key`

**Features:**
- Reads API key from environment variables
- Tracks last modification timestamp
- Auto-reloads from `.env` in development mode
- Returns API key with metadata

**Response Format:**
```json
{
  "apiKey": "aibiuFiquaeCuuve9Vohcheedee6ka",
  "lastModified": 1737331200000,
  "timestamp": 1737331200000
}
```

**Health Check**: `GET /api/health`
```json
{
  "status": "ok",
  "timestamp": 1737331200000,
  "apiKeyConfigured": true
}
```

### 3. React Context (`PhantomAPIContext.tsx`)

**Location**: `src/contexts/PhantomAPIContext.tsx`

**Purpose**: Manages API key state and automatic refresh polling

**Features:**
- Fetches API key from server on mount
- Polls for updates at configurable intervals (default: 5 minutes)
- Only updates when server timestamp changes (efficient)
- Provides refresh callback for manual updates
- Full verbose logging support

**Usage:**
```tsx
import { PhantomAPIProvider, usePhantomAPI } from '@/contexts';

// Wrap your app
<PhantomAPIProvider pollInterval={5}>
  <YourApp />
</PhantomAPIProvider>

// In components
function MyComponent() {
  const { apiKey, isRefreshing, lastRefresh, refreshAPIKey } = usePhantomAPI();
  
  // Manual refresh if needed
  const handleRefresh = () => refreshAPIKey();
  
  return <div>{apiKey ? 'Connected' : 'Loading...'}</div>;
}
```

### 4. API Client Utility (`phantomApiClient.ts`)

**Location**: `src/utils/phantomApiClient.ts`

**Purpose**: HTTP client that automatically injects API key into requests

**Features:**
- Automatic API key injection in `X-API-Key` header
- Auto-retry on 401/403 with key refresh
- Helper methods for GET, POST, PUT, DELETE
- Verbose logging support

**API:**

```typescript
// Import
import { 
  phantomApiCall, 
  phantomApiGet, 
  phantomApiPost,
  setPhantomAPIKey,
  setPhantomAPIRefreshCallback 
} from '@/utils';

// Basic usage
const response = await phantomApiGet('https://api.example.com/endpoint');
const data = await response.json();

// POST request
const result = await phantomApiPost('https://api.example.com/data', {
  field: 'value'
});

// Custom request
const response = await phantomApiCall('/api/endpoint', {
  method: 'PATCH',
  headers: { 'X-Custom': 'header' },
  body: JSON.stringify({ data: 'example' })
});
```

## Integration

### App.tsx Setup

The `PhantomAPIProvider` wraps the entire application and the `PhantomAPIInitializer` component connects the context to the API client:

```tsx
// App.tsx
import { PhantomAPIProvider, usePhantomAPI } from '@/contexts';
import { setPhantomAPIKey, setPhantomAPIRefreshCallback } from '@/utils';

function App() {
  return (
    <PhantomAPIProvider pollInterval={5}>
      <PhantomAPIInitializer>
        <SIPProvider>
          <MainApp />
        </SIPProvider>
      </PhantomAPIInitializer>
    </PhantomAPIProvider>
  );
}

function PhantomAPIInitializer({ children }) {
  const { apiKey, refreshAPIKey } = usePhantomAPI();

  useEffect(() => {
    if (apiKey) {
      setPhantomAPIKey(apiKey);
      setPhantomAPIRefreshCallback(refreshAPIKey);
    }
  }, [apiKey, refreshAPIKey]);

  return <>{children}</>;
}
```

## Configuration

### Poll Interval

Control how often the React app checks for API key updates:

```tsx
// Check every 5 minutes (default)
<PhantomAPIProvider pollInterval={5}>

// Check every 1 minute (aggressive)
<PhantomAPIProvider pollInterval={1}>

// Check every 15 minutes (conservative)
<PhantomAPIProvider pollInterval={15}>

// Disable polling (manual refresh only)
<PhantomAPIProvider pollInterval={0}>
```

### Verbose Logging

Enable detailed logging in Settings > Advanced Settings > Verbose Logging

**Logs include:**
- API key fetch attempts
- Poll interval triggers
- Key update detection
- HTTP request/response details
- Refresh callbacks
- Error conditions

## Workflow

### Normal Operation

1. **App starts** → `PhantomAPIProvider` fetches API key from server
2. **Key received** → Stored in context, injected into API client
3. **API calls** → `phantomApiCall` automatically adds `X-API-Key` header
4. **Polling** → Every 5 minutes, check server for key updates
5. **Key unchanged** → No action taken
6. **Key changed** → New key stored and used for subsequent requests

### API Key Update

1. **Admin updates** `.env` file with new key
2. **Server restarts** (production) or reloads (development)
3. **React app polls** → Detects `lastModified` timestamp change
4. **Context updates** → New key propagated to API client
5. **All requests** → Automatically use new key

### Error Handling

**401/403 Unauthorized:**
1. Request receives 401/403 response
2. `phantomApiCall` triggers refresh callback
3. New key fetched from server
4. Request automatically retried once with new key
5. If still fails, original error returned

**Server unavailable:**
- Failed refresh attempts logged
- Existing key continues to be used
- Retry on next poll interval

**No API key configured:**
- HTTP 503 returned from server
- Error logged in verbose mode
- API calls proceed without key (may fail)

## Testing

### Manual Refresh

Add a refresh button to your UI:

```tsx
import { usePhantomAPI } from '@/contexts';

function DebugPanel() {
  const { apiKey, lastRefresh, refreshAPIKey } = usePhantomAPI();
  
  return (
    <div>
      <p>API Key: {apiKey ? '✓ Loaded' : '✗ Missing'}</p>
      <p>Last Refresh: {lastRefresh?.toLocaleTimeString()}</p>
      <button onClick={refreshAPIKey}>Refresh Now</button>
    </div>
  );
}
```

### API Key Rotation Test

1. Start the app with initial key
2. Make some API calls (should succeed)
3. Update `.env` with new key
4. Restart server
5. Wait 5 minutes or trigger manual refresh
6. Make API calls (should use new key)

### Verbose Logging Test

1. Enable verbose logging in Settings
2. Open browser console
3. Watch logs for:
   - `[PhantomAPI]` prefix for context operations
   - `[PhantomAPIClient]` prefix for API calls
   - Request/response details
   - Poll interval triggers

## Best Practices

### Security

- **Never commit** API keys to version control
- Keep `.env` file in `.gitignore`
- Use environment-specific keys (dev/staging/production)
- Rotate keys regularly
- Monitor for unauthorized access

### Performance

- Use default 5-minute poll interval for production
- Shorter intervals (1-2 min) for development if needed
- Disable polling if keys rarely change
- Use manual refresh for testing

### Error Handling

- Always handle API response errors
- Log failures in verbose mode
- Provide user feedback for authentication issues
- Implement retry logic for transient failures

### Development

- Use verbose logging during development
- Test key rotation scenarios
- Verify auto-retry on 401/403
- Check network tab for `X-API-Key` header

## Troubleshooting

### API Key Not Loading

**Symptom:** `apiKey` is `null` in context

**Check:**
1. Is `REACT_APP_PHANTOM_API_KEY` set in `.env`?
2. Did you run `require('dotenv').config()` in server?
3. Is server running and accessible?
4. Check server logs for errors
5. Verify `/api/phantom/current-key` endpoint responds

### Requests Missing API Key

**Symptom:** API returns 401, header missing

**Check:**
1. Is `PhantomAPIInitializer` in component tree?
2. Is `setPhantomAPIKey()` being called?
3. Are you using `phantomApiCall` helpers?
4. Check verbose logs for key injection

### Key Not Updating

**Symptom:** Old key still in use after update

**Check:**
1. Did you restart the server after `.env` change?
2. Wait for poll interval (5 min) or trigger manual refresh
3. Check `lastModified` timestamp in server response
4. Verify verbose logs show update detection

### 401 After Key Update

**Symptom:** Requests fail with 401 after rotation

**Check:**
1. Is new key valid on Phantom API?
2. Did server pick up new key from `.env`?
3. Did auto-retry execute (check verbose logs)?
4. Try manual refresh with `refreshAPIKey()`

## Migration Notes

### From Static Configuration

If you previously used hardcoded or static API keys:

1. Move key value to `.env` as `REACT_APP_PHANTOM_API_KEY`
2. Replace direct fetch calls with `phantomApiCall` helpers
3. Remove manual header injection code
4. Add `PhantomAPIProvider` to app root
5. Test that existing API calls still work

### Existing PhantomApiService

The new system works alongside existing services:

```typescript
// Old way
const response = await fetch(url, {
  headers: { 'X-API-Key': someKey }
});

// New way
const response = await phantomApiGet(url);
// Key automatically injected
```

## Future Enhancements

Possible improvements:

- **WebSocket push**: Real-time key updates instead of polling
- **JWT integration**: Use JWT tokens from `webphone-register.php`
- **Key expiration**: Proactive refresh before expiration
- **Multiple keys**: Support for different API key types
- **Key caching**: Local storage backup for offline scenarios
- **Admin UI**: Visual key management interface

---

**Last Updated:** January 20, 2026  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
