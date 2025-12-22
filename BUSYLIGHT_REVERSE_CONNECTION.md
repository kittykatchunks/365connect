# Busylight Bridge - Reverse Connection Architecture

## Overview

The Busylight Bridge now uses a **reverse connection architecture** where the local bridge client initiates connections to the remote server, eliminating the need for inbound firewall rules or port forwarding.

## Architecture Changes

### Previous Architecture (Outbound from Server)
- Server attempted to connect TO bridge: `ws://localhost:19774/ws`
- Required local network access or complex networking setup
- Failed when bridges were behind firewalls or NATs

### New Architecture (Inbound to Server)
- **Bridge initiates connection TO server:** `ws://{domain}:8088/ws`
- Server accepts incoming connections on port 8088
- Works through firewalls and NATs (outbound connections allowed by default)
- Multiple bridges can connect to one server

## Configuration

### Busylight Bridge Client

1. **Server URL Configuration:**
   - Right-click tray icon → "Configure Server..."
   - Enter domain only (e.g., `connect365.servehttp.com`)
   - Connection will be made to `ws://{domain}:8088/ws`

2. **Configuration File:**
   - Location: `%APPDATA%/Busylight Bridge/config.json`
   - New field: `serverUrl` - domain name of the server

3. **Default Config:**
   ```json
   {
     "bridgePort": 19774,
     "kuandoHubUrl": "http://localhost:8989",
     "serverUrl": "connect365.servehttp.com",
     "autoStart": false,
     "minimizeToTray": true,
     "showNotifications": true
   }
   ```

### Server Configuration

1. **Port 8088 WebSocket Server:**
   - Dedicated WebSocket server listening on `0.0.0.0:8088`
   - Path: `/ws`
   - Accepts incoming bridge connections

2. **Firewall Requirements:**
   - **Port 8088** must be open for incoming TCP/WebSocket connections
   - This is the ONLY port that needs to be opened

## Communication Flow

### 1. Bridge Connection
```
Bridge Client → ws://{server}:8088/ws → Server
```

1. Bridge starts and reads `serverUrl` from config
2. Initiates WebSocket connection to `ws://{serverUrl}:8088/ws`
3. Server accepts connection and assigns bridge ID
4. Bridge sends registration message with version and status
5. Connection maintained with automatic reconnection

### 2. API Request Flow
```
PWA → HTTPS → Server → WebSocket → Bridge → Kuando Hub → Response
```

1. PWA makes HTTP request: `GET /api/busylight/health`
2. Server receives request in Express middleware
3. Server generates unique `requestId`
4. Server sends API request through WebSocket to bridge:
   ```json
   {
     "type": "api_request",
     "requestId": "abc123...",
     "action": "health",
     "params": {}
   }
   ```
5. Bridge receives message, forwards to Kuando Hub
6. Bridge sends response back through WebSocket:
   ```json
   {
     "type": "api_response",
     "requestId": "abc123...",
     "success": true,
     "data": { "bridge": "online", ... }
   }
   ```
7. Server correlates response using `requestId`
8. Server returns HTTP response to PWA

## Features

### Bridge Client (main.js)
- ✅ **Outbound WebSocket connection** to server
- ✅ **Automatic reconnection** with exponential backoff
- ✅ **Server URL configuration** via tray menu
- ✅ **Request handler** - processes incoming API requests
- ✅ **Backward compatibility** - local HTTP/WebSocket server still available
- ✅ **Status display** - shows server connection status in tray

### Server (server.js & bridge-server.js)
- ✅ **Dedicated WebSocket server** on port 8088
- ✅ **Bridge registration** and tracking
- ✅ **Request/response correlation** using unique IDs
- ✅ **Multiple bridge support** - can handle multiple connected bridges
- ✅ **HTTP to WebSocket proxy** - seamless API routing
- ✅ **Timeout handling** - 30-second request timeout
- ✅ **Status endpoint** - `/api/busylight-status` shows connected bridges

## API Actions Supported

All existing busylight actions work through the new architecture:

| Action | Description | Parameters |
|--------|-------------|------------|
| `health` | Get bridge and Kuando Hub status | - |
| `devices` | List connected Busylight devices | - |
| `status` | Get current presence/light status | - |
| `light` | Set solid color | `red`, `green`, `blue` |
| `off` | Turn off light | - |
| `alert` | Flash light with optional sound | `red`, `green`, `blue`, `sound` |
| `ringing` | Incoming call alert (red flash) | `sound` (optional) |
| `busy` | On call status (solid red) | - |
| `available` | Available status (solid green) | - |
| `hold` | On hold status (yellow flash) | - |

## Testing

### 1. Test Bridge Connection
```powershell
# On bridge PC - check connection
curl http://localhost:19774/health

# On server - check bridge status
curl https://connect365.servehttp.com/api/busylight-status
```

### 2. Test API Request Flow
```powershell
# Make API request through server
curl https://connect365.servehttp.com/api/busylight/health

# Should route through WebSocket to bridge and return:
{
  "bridge": "online",
  "kuandoHub": "connected",
  "devices": 1,
  "clients": 0,
  "serverConnected": true,
  "version": "1.0.0"
}
```

### 3. Test Light Control
```powershell
# Set green light
curl -X POST https://connect365.servehttp.com/api/busylight/light `
  -H "Content-Type: application/json" `
  -d '{"red": 0, "green": 100, "blue": 0}'

# Turn off
curl -X POST https://connect365.servehttp.com/api/busylight/off
```

## Troubleshooting

### Bridge Can't Connect to Server

**Check:**
1. Server URL configured correctly in bridge
2. Server is running and port 8088 is open
3. No firewall blocking outbound connections from bridge PC
4. DNS resolves server domain correctly

**Logs:**
- Bridge logs: Check console output when running bridge
- Server logs: Check `logs/error.log` for connection issues

### API Requests Timeout

**Check:**
1. Bridge is connected (check `/api/busylight-status`)
2. Kuando Hub is running on bridge PC
3. Request timeout (default 30 seconds) is sufficient

**Common Issues:**
- Bridge disconnected - automatic reconnection should resolve
- Kuando Hub not running - start kuandoHUB software
- Network latency - may need to increase timeout

### Multiple Bridges

Currently, the server routes requests to the **first available bridge**. Future enhancements:
- Bridge selection based on user session
- Load balancing across multiple bridges
- Bridge groups/pools

## Backward Compatibility

The bridge maintains **backward compatibility**:

1. **Local HTTP API** still available:
   - `http://localhost:19774/kuando?action=...`
   - `http://localhost:19774/api/devices`
   - All REST endpoints

2. **Local WebSocket** still available:
   - `ws://localhost:19774/ws`
   - For direct local connections

3. **Existing PWA code** works without changes:
   - API calls to `/api/busylight/*` automatically routed

## Security Considerations

1. **No Authentication (Current):**
   - Any bridge can connect to server
   - Consider implementing:
     - API keys
     - Client certificates
     - Token-based authentication

2. **Encryption:**
   - Use `wss://` instead of `ws://` for encrypted connections
   - Requires SSL certificate on port 8088

3. **Rate Limiting:**
   - Consider adding rate limits for bridge connections
   - Prevent DoS attacks

## Next Steps

1. **SSL/TLS Support:**
   - Implement `wss://` for encrypted bridge connections
   - Requires SSL certificate configuration

2. **Authentication:**
   - Add API key or token-based authentication
   - Bridge registration with credentials

3. **Bridge Selection:**
   - Route requests to specific bridges based on user context
   - Session affinity for multi-bridge scenarios

4. **Monitoring:**
   - Dashboard showing connected bridges
   - Bridge health metrics
   - Request success/failure rates

5. **Configuration UI:**
   - Web-based configuration for bridge settings
   - Easier than tray menu dialogs

## Files Changed

1. **busylight-bridge/main.js**
   - Added `serverUrl` configuration
   - Implemented WebSocket client connection
   - Added message handlers for incoming API requests
   - Updated tray menu with server configuration

2. **server.js**
   - Added dedicated WebSocket server on port 8088
   - Updated bridge initialization

3. **bridge-server.js**
   - Complete refactor from outbound to inbound connections
   - Added `registerBridge()` method
   - Implemented request/response correlation
   - Updated HTTP middleware to route through WebSocket
   - Added bridge status tracking

## Summary

✅ **Reverse connection architecture implemented**
✅ **Port 8088 open for incoming bridge connections**
✅ **Automatic reconnection with retry logic**
✅ **Request/response correlation system**
✅ **Multiple bridge support**
✅ **Backward compatibility maintained**
✅ **All existing API actions supported**

The Busylight Bridge now successfully connects FROM the local PC TO the remote server, eliminating the need for complex networking configurations!
