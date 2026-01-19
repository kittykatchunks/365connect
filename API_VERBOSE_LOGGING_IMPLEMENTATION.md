# API Verbose Logging Implementation

## Overview
Enhanced verbose logging for all API calls throughout the application to display complete request and response details when verbose logging is enabled in Settings > Advanced Settings.

## Changes Summary

### 1. React/TypeScript API Service
**File:** `src/services/PhantomApiService.ts`

#### Request Logging (Lines ~280-290)
Added comprehensive request logging that includes:
- **URL**: Full request URL
- **Endpoint**: API endpoint name
- **Method**: HTTP method (GET, POST, PUT, DELETE)
- **useNoAuth**: Whether NoAuth endpoint is being used
- **PhantomID**: The Phantom system identifier
- **Headers**: Complete request headers including Content-Type and Accept
- **Request Body**: Full payload being sent (for POST/PUT requests)
- **Timeout**: Request timeout value in milliseconds

#### Response Logging (Lines ~345-355)
Enhanced response logging that includes:
- **Status**: HTTP status code
- **Status Text**: HTTP status message
- **OK**: Boolean indicating success (true/false)
- **Content-Type**: Response content type header
- **Response Headers**: All response headers as key-value pairs
- **Response Data**: Complete response payload

#### Error Logging (Lines ~380-395)
Improved error logging that includes:
- **Endpoint**: API endpoint that failed
- **URL**: Full request URL
- **Method**: HTTP method used
- **Request Data**: Original request payload
- **Error Name**: JavaScript error name (e.g., AbortError, TypeError)
- **Error Message**: Human-readable error message
- **Error Stack**: Full stack trace for debugging

### 2. PWA/Legacy API Manager
**File:** `pwa/js/api-phantom.js`

#### Initialization Logging (Lines ~107-117)
Added verbose logging for API manager configuration:
- **PhantomID**: System identifier
- **Base URL**: API base URL
- **Has Credentials**: Whether authentication credentials are configured

#### Request Logging (Lines ~221-234)
Enhanced request logging matching React implementation:
- Full URL (with PhantomID masked for security)
- HTTP method
- API endpoint name
- Complete request headers
- Request body/payload
- Authentication status
- Timeout configuration

#### Response Logging (Lines ~271-282)
Comprehensive response logging:
- HTTP status code and text
- Response OK status
- Content-Type header
- All response headers
- Complete response data

#### Error Logging (Lines ~292-307)
Detailed error logging:
- API endpoint
- Request URL
- HTTP method
- Request data
- Error name, message, and stack trace

## Usage

### Enable Verbose Logging
1. Open Settings (gear icon)
2. Navigate to Advanced Settings
3. Toggle "Verbose Logging" ON
4. All API calls will now log detailed information to the browser console

### Disable Verbose Logging
1. Open Settings
2. Navigate to Advanced Settings
3. Toggle "Verbose Logging" OFF
4. Only essential API logs will be shown

## Log Format

### Request Example
```
[PhantomApiService] 📤 POST Request: {
  url: "/api/phantom/AgentfromPhone?phantomId=375",
  endpoint: "AgentfromPhone",
  method: "POST",
  useNoAuth: false,
  phantomId: "375",
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json"
  },
  requestBody: {
    phone: "1001"
  },
  timeout: "30000ms"
}
```

### Response Example
```
[PhantomApiService] 📥 POST Response: {
  status: 200,
  statusText: "OK",
  ok: true,
  contentType: "application/json; charset=utf-8",
  responseHeaders: {
    "content-type": "application/json; charset=utf-8",
    "content-length": "156",
    "date": "Sun, 19 Jan 2026 12:00:00 GMT"
  },
  responseData: {
    agent: {
      name: "John Doe",
      status: "available",
      extension: "1001"
    }
  }
}
```

### Error Example
```
[PhantomApiService] ❌ POST Error: {
  endpoint: "AgentfromPhone",
  url: "/api/phantom/AgentfromPhone?phantomId=375",
  method: "POST",
  requestData: { phone: "1001" },
  errorName: "TypeError",
  errorMessage: "Failed to fetch",
  errorStack: "TypeError: Failed to fetch\n    at PhantomApiService.request..."
}
```

## Benefits

1. **Debugging**: Easily trace API request/response flow
2. **Development**: Quickly identify payload issues
3. **Troubleshooting**: Complete context for API failures
4. **Security**: Masked sensitive data (PhantomID) in logs
5. **Performance**: Identify slow requests with timeout values
6. **Integration**: Verify data format and headers

## Implementation Details

### Logging Control
- All verbose logging is gated by `isVerboseLoggingEnabled()` utility function
- Checks localStorage for 'VerboseLogging' setting
- React app: Uses `@/utils` helper function
- PWA legacy: Uses `window.localDB.getItem()` directly

### Consistency
- Both React and PWA implementations use identical log formats
- Consistent emoji indicators: 📤 (request), 📥 (response), ❌ (error)
- Component name prefix: `[PhantomApiService]` or `[PhantomApiManager]`

### Server-Side Logging
The proxy server (`server.js`) already has comprehensive logging built-in for all proxied API calls. This includes:
- Request URL translation (client URL → Phantom API URL)
- PhantomID routing
- Authentication status
- Request/response body previews
- Error details with troubleshooting hints

## Testing

To verify verbose logging:

1. Enable verbose logging in Settings
2. Open browser Developer Tools Console
3. Perform an action that triggers an API call (e.g., login agent, pause agent)
4. Observe detailed request/response logs in console
5. Verify all data fields are present and readable

## Related Files

- `src/services/PhantomApiService.ts` - React API service
- `pwa/js/api-phantom.js` - Legacy PWA API manager
- `src/utils/agentApi.ts` - Agent API helper functions (already has verbose logging)
- `src/hooks/useBusylight.ts` - Busylight hardware API calls
- `src/utils/index.ts` - Verbose logging utility function
- `server.js` - Node.js proxy server (has built-in detailed logging)

## Completion Status

✅ **COMPLETE** - All API calls now include comprehensive verbose logging when enabled in settings:
- ✅ Phantom API Service (React/TypeScript)
- ✅ Phantom API Manager (PWA/Legacy)
- ✅ Agent API helpers
- ✅ Busylight API calls
- ✅ Server-side proxy logging (always enabled)
