# Busylight Bridge - Quick Start Guide

## Implementation Summary

The Busylight Bridge system has been completely refactored to provide better connection management and proper separation of concerns.

## New Files Created

### 1. `bridge-server.js`
**Purpose**: WebSocket bridge server that manages connections between PWA clients and the local Busylight service.

**Key Features**:
- Manages WebSocket connection to `ws://127.0.0.1:19774/ws`
- Tracks connected PWA clients
- Automatically connects/disconnects based on client presence
- HTTP-to-WebSocket proxy for API requests
- Automatic reconnection with exponential backoff
- CORS handling for cross-origin requests

**Class**: `BusylightBridgeServer`

**Methods**:
- `connectToLocalService()` - Establishes connection to local service
- `disconnectFromLocalService()` - Closes connection to local service
- `registerClient(ws, clientId)` - Registers a new PWA client
- `unregisterClient(clientId)` - Removes a client
- `handleClientMessage(clientId, message)` - Forwards client messages to local service
- `broadcastToClients(message)` - Sends messages to all connected clients
- `createHttpMiddleware()` - Express middleware for HTTP proxy
- `getStatus()` - Returns connection status
- `shutdown()` - Cleanup all connections

### 2. `BUSYLIGHT_BRIDGE_ARCHITECTURE.md`
Complete documentation of the architecture, data flow, API reference, and troubleshooting guide.

## Modified Files

### 1. `server.js`

**Changes**:
- ✅ Import `BusylightBridgeServer` and `WebSocket` (ws)
- ✅ Removed old `BUSYLIGHT_BRIDGE_URL` environment variable
- ✅ Instantiate `BusylightBridgeServer` with configuration
- ✅ Replaced old busylight proxy with bridge HTTP middleware
- ✅ Added `/api/busylight-status` endpoint
- ✅ Set up WebSocket server for client connections
- ✅ Updated WebSocket upgrade handling for both HTTPS and HTTP servers
- ✅ Added graceful shutdown for bridge server
- ✅ Updated startup log messages

**New Endpoints**:
- `GET /api/busylight/*` - HTTP proxy to local service
- `WS /api/busylight-ws` - WebSocket endpoint for PWA clients
- `GET /api/busylight-status` - Bridge status information

### 2. `pwa/js/busylight-manager.js`

**Changes**:
- ✅ Dynamic WebSocket URL based on protocol (ws:// or wss://)
- ✅ Updated `loadSettings()` to remove hardcoded WebSocket URL
- ✅ Updated `saveSettings()` to remove WebSocket URL storage
- ✅ Enhanced `handleWebSocketMessage()` to handle bridge status messages
- ✅ Updated configuration dialog to reflect new architecture
- ✅ Updated error messages for better user guidance

**New Behavior**:
- WebSocket URL is now `wss://hostname/api/busylight-ws` (secure) or `ws://hostname/api/busylight-ws`
- Automatically adapts to HTTPS or HTTP based on page protocol
- Better status messages from bridge server
- Clearer error handling when local service is unavailable

## How It Works

### Connection Flow

1. **PWA Opens with Busylight Enabled**:
   ```
   PWA → WebSocket connect → wss://server/api/busylight-ws
   Bridge Server → (First client) → WebSocket connect → ws://127.0.0.1:19774/ws
   Bridge Server → Send status to PWA
   ```

2. **Sending a Command** (e.g., set red light):
   ```
   PWA → Send {"action":"light","red":100,"green":0,"blue":0}
   Bridge Server → Forward to local service
   Local Service → Update USB device → Send response
   Bridge Server → Broadcast response to all PWA clients
   ```

3. **PWA Closes or Disables Busylight**:
   ```
   PWA → Close WebSocket
   Bridge Server → Unregister client
   Bridge Server → (Last client) → Disconnect from local service
   ```

### Connection Lifecycle

```
┌─────────────┐
│  No Clients │ ← Bridge not connected to local service
└─────┬───────┘
      │ First client connects
      ▼
┌──────────────┐
│  Connecting  │ ← Bridge establishing connection to local service
└─────┬────────┘
      │ Connection successful
      ▼
┌──────────────┐
│   Connected  │ ← Bridge connected, forwarding messages
└─────┬────────┘
      │ Last client disconnects
      ▼
┌─────────────┐
│  No Clients │ ← Bridge disconnects from local service
└─────────────┘
```

## Testing the Implementation

### 1. Start the Server
```bash
node server.js
```

Expected output:
```
[BusylightBridge] Bridge server initialized
[BusylightBridge] Local service URL: ws://127.0.0.1:19774/ws
✓ HTTPS Server running on https://connect365.servehttp.com:443
  Busylight Bridge: /api/busylight → ws://127.0.0.1:19774/ws
  Busylight WebSocket: /api/busylight-ws (Client connections)
```

### 2. Start Local Busylight Service
Ensure your local Busylight Bridge application is running on port 19774.

### 3. Open PWA and Enable Busylight
1. Open PWA in browser
2. Go to Settings
3. Check "Enable Busylight"
4. Save settings

Expected logs:
```
[Busylight] Initializing Busylight Bridge service...
[Busylight] WebSocket URL: wss://connect365.servehttp.com/api/busylight-ws
[Busylight] Attempting WebSocket connection...
[Busylight] WebSocket connection established
[BusylightBridge] Client registered: client_xxx
[BusylightBridge] First client connected, establishing local service connection...
[BusylightBridge] ✓ Connected to local Busylight service
```

### 4. Test State Changes
Make a call or change agent status. The busylight should update accordingly.

### 5. Disable Busylight
Uncheck "Enable Busylight" in settings.

Expected logs:
```
[Busylight] Disconnecting...
[BusylightBridge] Client disconnected: client_xxx
[BusylightBridge] No more clients, disconnecting from local service...
```

## Configuration

### Environment Variables (.env)
```bash
# Optional: Override default local service URLs
BUSYLIGHT_WS_URL=ws://127.0.0.1:19774/ws
BUSYLIGHT_HTTP_HOST=http://127.0.0.1:19774
```

### No Client Configuration Needed
The PWA client automatically determines the correct WebSocket URL based on:
- Current page protocol (http/https)
- Current page hostname
- Fixed path: `/api/busylight-ws`

Example URLs:
- `https://connect365.servehttp.com` → `wss://connect365.servehttp.com/api/busylight-ws`
- `http://localhost:8080` → `ws://localhost:8080/api/busylight-ws`

## Troubleshooting

### Check Bridge Status
```bash
curl https://connect365.servehttp.com/api/busylight-status
```

Expected response:
```json
{
  "connected": true,
  "clients": 1,
  "localServiceUrl": "ws://127.0.0.1:19774/ws",
  "reconnectAttempts": 0
}
```

### Common Issues

**Issue**: "Busylight service unavailable" in PWA  
**Solution**: 
1. Check if local service is running on port 19774
2. Verify bridge server logs show connection attempt
3. Try HTTP test: `curl http://127.0.0.1:19774/kuando?action=currentpresence`

**Issue**: WebSocket connection fails  
**Solution**:
1. Check browser console for WebSocket errors
2. Verify server WebSocket upgrade is working
3. Check for proxy/firewall blocking WebSocket
4. HTTP fallback should still work

**Issue**: Multiple clients cause issues  
**Solution**:
- Bridge handles multiple clients automatically
- Each client gets independent WebSocket connection
- Commands are broadcast to all clients
- This is expected behavior

## Dependencies

### Server-Side (already installed)
- `ws` - WebSocket server implementation
- `http-proxy-middleware` - No longer used for busylight (kept for Phantom API)
- `express` - Web server framework

### Client-Side (built-in)
- Browser WebSocket API
- Fetch API for HTTP fallback

## Key Improvements

✅ **Better Connection Management**: Bridge only connects when clients are present  
✅ **Proper Resource Cleanup**: Automatic disconnection when no clients  
✅ **Clear Separation of Concerns**: Bridge, server, and client have distinct responsibilities  
✅ **Real-time Bidirectional Communication**: WebSocket for instant updates  
✅ **Robust Error Handling**: Automatic reconnection with backoff  
✅ **CORS Handled**: Proper headers for cross-origin requests  
✅ **Scalable**: Supports multiple simultaneous PWA clients  
✅ **Easy Monitoring**: Status endpoint and comprehensive logging  
✅ **Secure**: Can use WSS over HTTPS  

## API Quick Reference

### Client → Bridge Commands
```javascript
// Set color
ws.send(JSON.stringify({
  action: "light",
  red: 100,
  green: 0,
  blue: 0
}));

// Alert with sound
ws.send(JSON.stringify({
  action: "alert",
  red: 100,
  green: 0,
  blue: 0,
  sound: 3,
  volume: 50
}));

// Blink
ws.send(JSON.stringify({
  action: "blink",
  red: 100,
  green: 0,
  blue: 0,
  ontime: 5,
  offtime: 5
}));

// Turn off
ws.send(JSON.stringify({
  action: "off"
}));
```

### Bridge → Client Messages
```javascript
// Bridge status
{
  type: "bridge_status",
  connected: true,
  message: "Connected to local Busylight service"
}

// Error
{
  type: "error",
  message: "Not connected to local Busylight service"
}

// Response
{
  type: "response",
  // ... response data from local service
}
```

## Next Steps

1. Test with actual USB Busylight device
2. Verify all call states work correctly (idle, ringing, active, hold)
3. Test with multiple browser tabs/windows open
4. Test reconnection after local service restart
5. Monitor logs for any unexpected behavior
6. Consider adding authentication if exposing publicly

## Support

For issues or questions:
1. Check server logs: `bridge-server.js` console output
2. Check client logs: Browser console
3. Verify local service: Test `ws://127.0.0.1:19774/ws` connection
4. Check bridge status: `GET /api/busylight-status`
5. Review architecture doc: `BUSYLIGHT_BRIDGE_ARCHITECTURE.md`
