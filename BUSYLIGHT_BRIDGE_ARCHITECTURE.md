# Busylight Bridge Architecture

## Overview

The Busylight Bridge system provides a seamless connection between the Connect365 PWA application (running in a web browser) and the local Busylight service (running on the user's PC). This document explains the architecture, components, and data flow.

## Architecture Components

### 1. Local Busylight Service (PC Application)
- **Location**: User's local PC
- **Address**: `http://127.0.0.1:19774` (HTTP) and `ws://127.0.0.1:19774/ws` (WebSocket)
- **Purpose**: Direct communication with USB Busylight devices
- **API Endpoints**: `/kuando` path for HTTP commands

### 2. Bridge Server (`bridge-server.js`)
- **Location**: Connect365 server (Node.js)
- **Purpose**: Intermediary between PWA clients and local Busylight service
- **Features**:
  - Manages WebSocket connections to local service
  - Tracks connected PWA clients
  - Proxies HTTP requests to local service
  - Handles automatic reconnection
  - Manages connection lifecycle based on client presence

### 3. Express Server (`server.js`)
- **Location**: Connect365 server (Node.js)
- **Purpose**: Main web server and routing
- **Endpoints**:
  - `/api/busylight` - HTTP proxy to local service
  - `/api/busylight-ws` - WebSocket endpoint for PWA clients
  - `/api/busylight-status` - Bridge status information

### 4. PWA Client (`busylight-manager.js`)
- **Location**: User's web browser
- **Purpose**: Manages busylight state based on call status
- **Features**:
  - WebSocket connection to bridge server
  - HTTP fallback for commands
  - Automatic reconnection
  - State management (offline, registered, idle, ringing, active, hold)

## Data Flow

### Connection Flow

```
[PWA Client] → [Express Server] → [Bridge Server] → [Local Service] → [USB Device]
  (Browser)      (server.js)       (bridge-server)   (127.0.0.1)      (Hardware)
```

#### 1. PWA Opens/Refreshes (Busylight Enabled)

```
1. PWA loads busylight-manager.js
2. Checks localStorage for BusylightEnabled setting
3. If enabled:
   a. Establishes WebSocket to wss://server/api/busylight-ws
   b. Bridge server receives client connection
   c. If first client, bridge connects to ws://127.0.0.1:19774/ws
   d. Bridge sends status to client
   e. Client confirms connection and updates UI
```

#### 2. Setting Busylight Color (WebSocket)

```
1. PWA calls busylightManager.setState('active')
2. Determines RGB values (e.g., red: 100, green: 0, blue: 0)
3. Sends WebSocket message:
   {
     "action": "light",
     "red": 100,
     "green": 0,
     "blue": 0
   }
4. Bridge server receives message
5. Bridge forwards to local service via ws://127.0.0.1:19774/ws
6. Local service updates USB device
7. Local service sends confirmation back through chain
```

#### 3. Setting Busylight Color (HTTP Fallback)

```
1. PWA calls busylightManager.setState('active')
2. WebSocket unavailable, uses HTTP
3. Sends GET request:
   GET /api/busylight?action=light&red=100&green=0&blue=0
4. Express routes to bridge middleware
5. Bridge translates to:
   GET http://127.0.0.1:19774/kuando?action=light&red=100&green=0&blue=0
6. Local service processes and responds
7. Response proxied back to PWA
```

#### 4. Disabling Busylight in Settings

```
1. User unchecks "Enable Busylight" in settings
2. PWA calls busylightManager.setEnabled(false)
3. Manager closes WebSocket connection
4. Bridge server detects client disconnect
5. If no more clients, bridge disconnects from local service
6. All connections cleaned up
```

#### 5. Re-enabling Busylight

```
1. User checks "Enable Busylight" in settings
2. PWA calls busylightManager.setEnabled(true)
3. Manager establishes new WebSocket connection
4. Bridge re-establishes connection to local service
5. Manager tests connection with color sequence
6. Updates busylight to current call state
```

## State Management

### Busylight States and Colors

| State | Color | Pattern | Trigger |
|-------|-------|---------|---------|
| Offline | Gray (50,50,50) | Solid | SIP not registered |
| Registered | Blue (0,0,100) | Solid | SIP registered, not logged in |
| Idle | Green (0,100,0) | Solid | Logged in, no calls |
| Ringing | Red (100,0,0) | Fast flash (500ms) | Incoming call |
| Active | Red (100,0,0) | Solid | Active call |
| Hold | Yellow (100,100,0) | Slow flash (1500ms) | Call on hold |

### Connection States

#### Bridge Server States
- **No Clients**: Not connected to local service
- **Clients Connected**: Actively maintaining connection to local service
- **Reconnecting**: Attempting to restore connection after failure
- **Max Retries Reached**: Stopped reconnection attempts

#### PWA Client States
- **Disabled**: Busylight feature turned off
- **Connecting**: Establishing WebSocket connection
- **Connected (WebSocket)**: Active WebSocket to bridge
- **Connected (HTTP)**: Using HTTP fallback
- **Disconnected**: No connection, showing error

## Configuration

### Environment Variables (.env)

```bash
# Busylight Bridge Configuration
BUSYLIGHT_WS_URL=ws://127.0.0.1:19774/ws
BUSYLIGHT_HTTP_HOST=http://127.0.0.1:19774
```

### Client Settings (localStorage)

```javascript
BusylightEnabled: "1" or "0"
BusylightBridgeUrl: "/api/busylight"
BusylightUseWebSocket: "1" or "0"
```

## API Reference

### Bridge Server Endpoints

#### WebSocket: `/api/busylight-ws`
- **Protocol**: WSS (HTTPS) or WS (HTTP)
- **Purpose**: Real-time bidirectional communication
- **Messages**:
  - Client → Bridge: Command messages (light, alert, blink, off)
  - Bridge → Client: Status updates, responses, errors

#### HTTP: `/api/busylight/*`
- **Method**: GET
- **Purpose**: HTTP fallback for commands
- **Query Parameters**: action, red, green, blue, sound, volume, ontime, offtime
- **Example**: `/api/busylight?action=light&red=100&green=0&blue=0`

#### Status: `/api/busylight-status`
- **Method**: GET
- **Purpose**: Check bridge connection status
- **Response**:
  ```json
  {
    "connected": true,
    "clients": 2,
    "localServiceUrl": "ws://127.0.0.1:19774/ws",
    "reconnectAttempts": 0
  }
  ```

### Local Service Endpoints

#### WebSocket: `ws://127.0.0.1:19774/ws`
- **Purpose**: Real-time device communication
- **Messages**: JSON commands and responses

#### HTTP: `http://127.0.0.1:19774/kuando`
- **Purpose**: HTTP command interface
- **Actions**:
  - `?action=light&red=X&green=Y&blue=Z` - Set solid color
  - `?action=alert&red=X&green=Y&blue=Z&sound=N&volume=V` - Alert with sound
  - `?action=blink&red=X&green=Y&blue=Z&ontime=N&offtime=M` - Blinking pattern
  - `?action=off` - Turn off light
  - `?action=currentpresence` - Get device status

## Error Handling

### Connection Failures

1. **Local Service Not Running**
   - Bridge cannot connect to `ws://127.0.0.1:19774/ws`
   - Clients receive "bridge_status" message with `connected: false`
   - HTTP requests return 503 Service Unavailable
   - PWA shows error dialog to user

2. **WebSocket Connection Lost**
   - Bridge attempts automatic reconnection (max 5 attempts)
   - Exponential backoff: 3s, 6s, 9s, 12s, 15s
   - After max retries, bridge stops trying
   - Clients can still use HTTP fallback

3. **Client Disconnects**
   - Bridge removes client from tracking
   - If last client, bridge disconnects from local service
   - Resources cleaned up automatically

### CORS Handling

The bridge server adds CORS headers to all HTTP responses:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

## Monitoring and Debugging

### Server-Side Logs

```javascript
// Bridge initialization
[BusylightBridge] Bridge server initialized
[BusylightBridge] Local service URL: ws://127.0.0.1:19774/ws

// Client connection
[BusylightBridge] Client registered: client_1234567890_abc
[BusylightBridge] First client connected, establishing local service connection...

// Local service connection
[BusylightBridge] Connecting to local service...
[BusylightBridge] ✓ Connected to local Busylight service

// Message forwarding
[BusylightBridge] Message from client: {"action":"light",...}
[BusylightBridge] Forwarding message to local service
[BusylightBridge] Broadcast message to 2 client(s)

// Disconnection
[BusylightBridge] Client disconnected: client_1234567890_abc
[BusylightBridge] No more clients, disconnecting from local service...
```

### Client-Side Logs

```javascript
// Initialization
[Busylight] Initializing Busylight Bridge service...
[Busylight] WebSocket URL: wss://server/api/busylight-ws

// Connection
[Busylight] Attempting WebSocket connection...
[Busylight] WebSocket connection established
[Busylight] Connected via WebSocket

// State changes
[Busylight] Setting state to: active
[Busylight] Setting color: RGB(100, 0, 0)

// Disconnection
[Busylight] Disconnecting...
[Busylight] Disconnected
```

## Security Considerations

1. **Local Service Access**: Only accessible from localhost (127.0.0.1)
2. **Bridge Server**: Acts as security boundary between internet and local PC
3. **WebSocket Authentication**: Can be enhanced with JWT tokens if needed
4. **CORS**: Currently allows all origins (`*`) - consider restricting in production
5. **No Sensitive Data**: Only color/state commands transmitted

## Performance

### Connection Management
- WebSocket connections are lightweight and persistent
- Bridge only connects to local service when clients are present
- Automatic cleanup when no clients connected
- Efficient message broadcasting to multiple clients

### Scalability
- Single bridge instance can handle multiple PWA clients
- Each client maintains independent WebSocket connection
- Bridge multiplexes commands to single local service connection
- Low latency for real-time status updates

## Troubleshooting

### Issue: PWA shows "Busylight service unavailable"
**Cause**: Local Busylight service not running or not accessible  
**Solution**: 
1. Start the Busylight Bridge application on local PC
2. Verify it's listening on port 19774
3. Check firewall settings
4. Verify no other application is using port 19774

### Issue: Connection works but light doesn't change
**Cause**: No USB device connected  
**Solution**:
1. Connect Kuando Busylight USB device
2. Check device drivers installed
3. Verify device permissions (Linux/Mac)

### Issue: WebSocket connection fails, HTTP works
**Cause**: WebSocket upgrade failing or proxy misconfiguration  
**Solution**:
1. Check server WebSocket upgrade handling
2. Verify nginx/proxy configuration allows WebSocket
3. Check for middleware blocking upgrade requests
4. Try HTTP-only mode as fallback

### Issue: Bridge keeps reconnecting
**Cause**: Local service unstable or crashing  
**Solution**:
1. Check local service logs
2. Restart local service
3. Update local service to latest version
4. Check USB device connection

## Future Enhancements

1. **Authentication**: Add JWT token authentication for WebSocket connections
2. **Encryption**: End-to-end encryption for commands (if needed)
3. **Multi-Device**: Support for multiple Busylight devices per user
4. **Device Selection**: Allow user to choose which device to control
5. **Status Persistence**: Remember last state across reconnections
6. **Advanced Patterns**: More complex light patterns and animations
7. **Health Monitoring**: Periodic health checks and automatic recovery
8. **Rate Limiting**: Prevent command flooding to USB device

## Summary

The new Busylight Bridge architecture provides:
- ✅ Seamless connection management between PWA and local service
- ✅ Automatic connection/disconnection based on settings
- ✅ Real-time WebSocket communication with HTTP fallback
- ✅ Proper CORS handling for cross-origin requests
- ✅ Efficient resource usage (connects only when needed)
- ✅ Robust error handling and reconnection logic
- ✅ Clean separation of concerns between components
- ✅ Easy monitoring and debugging
