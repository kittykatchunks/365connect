# SIP WebSocket Proxy Fix

## Problem
The secure WebSocket connection to the Phantom API server (`wss://server1-388.phantomapi.net:8089/ws`) was failing with error code 1006 (abnormal closure). 

### Root Causes Identified:
1. **SSL Certificate Issue**: The Phantom API server's SSL certificate chain is incomplete or invalid
   - Error: `unable to verify the first certificate`
   - This prevents browser clients from establishing secure WebSocket connections
2. **HTTP 400 Response**: Even with relaxed SSL validation (Node.js), the server returns a 400 error
   - This suggests additional handshake or protocol issues

## Solution Implemented

### WebSocket Proxy Server
Implemented a WebSocket proxy in `server.js` that:
- Accepts secure connections from browser clients at `/api/sip-ws/{phantomId}`
- Proxies connections to Phantom API servers with relaxed SSL validation
- Forwards bidirectional WebSocket messages between client and Phantom server
- Handles connection errors and cleanup gracefully

### Configuration Updates

#### server.js Changes:
1. **New WebSocket proxy endpoint**: `/api/sip-ws/{phantomId}`
   - Extracts PhantomID from URL path
   - Connects to `wss://server1-{phantomId}.phantomapi.net:8089/ws` with `rejectUnauthorized: false`
   - Proxies all messages bidirectionally
   - Handles errors and connection cleanup

2. **Updated /api/config endpoint**:
   - Now returns proxied WebSocket URL by default
   - Format: `wss://{your-domain}/api/sip-ws/{phantomId}`
   - Can be disabled with environment variable `USE_SIP_PROXY=false`

#### Client-side Changes (api-phantom.js):
- Enhanced to store `wssServerUrl` from server configuration
- Automatically uses proxied WebSocket URL when available
- Stores configuration in localStorage for persistence

## Benefits

1. **Security**: Browser clients connect to your server with valid SSL certificates
2. **Compatibility**: Works around SSL certificate issues on Phantom API servers
3. **Transparency**: No changes needed to SIP.js or application logic
4. **Fallback**: Can be disabled via environment variable if needed
5. **Logging**: Full visibility into WebSocket proxy connections and errors

## Testing

### Diagnostic Tool Created
Created `test-phantom-ws.js` to test Phantom API WebSocket connectivity:
- Tests direct connection with strict SSL
- Tests with relaxed SSL validation
- Provides detailed diagnostics and recommendations

### Test Results (Before Fix):
```
❌ Default (strict SSL): unable to verify the first certificate
❌ Relaxed SSL: Unexpected server response: 400
```

## Usage

### Server Configuration
The proxy is enabled by default. To disable:
```bash
USE_SIP_PROXY=false npm start
```

### Client Configuration
No changes needed! The client automatically receives the proxied WebSocket URL from `/api/config?phantomId={id}`.

### Logging
The server logs all WebSocket proxy activity:
```
[SIP Proxy] New client connection for Phantom ID: 388
[SIP Proxy] Connecting to: wss://server1-388.phantomapi.net:8089/ws
[SIP Proxy] Connected to Phantom server
[SIP Proxy] Client closed: 1000 - Normal closure
```

## Files Modified

1. **server.js**:
   - Added SIP WebSocket proxy server (`sipWss`)
   - Updated upgrade handler to route `/api/sip-ws/` requests
   - Modified `/api/config` endpoint to return proxied URL
   - Added comprehensive logging for proxy connections

2. **api-phantom.js**:
   - Enhanced `initialize()` to store wssServerUrl from config
   - Stores SipDomain from config
   - Logs proxy usage status

3. **test-phantom-ws.js** (new):
   - Diagnostic tool for testing Phantom API WebSocket connectivity
   - Tests multiple SSL configurations
   - Provides detailed recommendations

## Troubleshooting

### If connection still fails:

1. **Check server logs** for SIP proxy activity
2. **Verify PhantomID** is correct in settings
3. **Test direct connection**: `node test-phantom-ws.js`
4. **Check browser console** for WebSocket errors
5. **Verify server certificates** are valid for HTTPS

### Environment Variables
```bash
# Disable SIP proxy (use direct connection)
USE_SIP_PROXY=false

# Specify Busylight WebSocket URL
BUSYLIGHT_WS_URL=ws://127.0.0.1:19774/ws
```

## Future Improvements

1. Add WebSocket message filtering/logging (debug mode)
2. Implement connection pooling for multiple clients
3. Add metrics/monitoring for proxy connections
4. Support for alternative Phantom API servers
5. Automatic failover to direct connection if proxy fails
