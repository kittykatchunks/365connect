# Busylight Routing Implementation - uniqueId Based

## Overview
Implemented unique identifier routing system using Connect365 Username to ensure busylight commands reach the correct bridge when multiple devices are connected to the proxy server.

## Implementation Date
December 24, 2025

## Architecture

### Flow Diagram
```
PWA (busylight-manager.js)
    ↓ HTTP Request with x-connect365-username header
Bridge Server (bridge-server.js) 
    ↓ Routes to correct bridge via uniqueId
Busylight Bridge (main.js)
    ↓ Validates targetUser matches local config
Kuando Hub / Device
```

## Components Modified

### 1. Busylight Bridge (busylight-bridge/main.js)

#### Configuration
- Added `connect365Username` field to config (e.g., "100/1001")
- Stored in config.json alongside server URL

#### Registration
- Bridge now sends `uniqueId` in `bridge_register` WebSocket message
- uniqueId set to Connect365 Username from configuration
- Example registration message:
```javascript
{
    type: 'bridge_register',
    uniqueId: '100/1001',
    version: '1.0.0',
    kuandoConnected: true,
    connect365Username: '100/1001'
}
```

#### Request Validation
- Incoming API requests checked for `targetUser` field
- If bridge has username configured and `targetUser` doesn't match, request is ignored
- Ensures commands only reach intended device

#### Response Headers
- All API responses include `connect365Username` field
- Confirms which bridge handled the request

#### Configuration UI
- Updated configuration dialog with two-step process:
  1. Server URL (e.g., "server1-XXXX.phantomapi.net")
  2. Connect365 Username with hint: "Go to Connect365, then select Connections in the SETTINGS tab"
  3. Example shown: "e.g., 100/1001"

### 2. Bridge Server (bridge-server.js)

#### Connection Management
- Changed from generic bridgeId to uniqueId-based registration
- Two-phase connection process:
  1. Initial connection with temporary connectionId
  2. Registration with uniqueId from `bridge_register` message
  
#### Bridge Storage
- Primary Map: `bridges` - Maps uniqueId → bridge info
- Secondary Map: `bridgesByConnectionId` - Maps connectionId → uniqueId
- Only one bridge allowed per uniqueId (replaces old connection if duplicate)

#### Routing Logic
```javascript
// Extract targetUser from request
const targetUser = req.headers['x-connect365-username'] || req.query.bridgeId || null;

// Route to specific bridge or first available
const result = await this.sendToBridge(targetUser, action, params);
```

#### Request Messages
- API requests sent to bridges include `targetUser` field for validation
- Example:
```javascript
{
    type: 'api_request',
    requestId: 'abc123...',
    action: 'light',
    params: { red: 100, green: 0, blue: 0 },
    targetUser: '100/1001'
}
```

### 3. PWA Busylight Manager (pwa/js/busylight-manager.js)

#### Username Retrieval
- Added `getConnect365Username()` method
- Retrieves from connection settings: `localDB.getItem('CurrentUser')`
- Fallback to `window.App.settings.currentUser`

#### Request Headers
- Added `buildRequestHeaders()` method
- Includes `x-connect365-username` header in all requests
- Example:
```javascript
headers: {
    'x-connect365-username': '100/1001'
}
```

#### Updated Methods
All API request methods now include headers:
- `checkConnection()`
- `getDevices()`
- `apiRequest()`

## API Flow Examples

### Example 1: Light Command from PWA

1. **PWA → Server**
```http
GET /api/busylight?action=light&red=100&green=0&blue=0
Headers:
  x-connect365-username: 100/1001
```

2. **Server Processing**
- Extracts username from header: `100/1001`
- Looks up bridge in `bridges` Map
- If found, routes to that specific bridge

3. **Server → Bridge**
```json
{
  "type": "api_request",
  "requestId": "a1b2c3d4...",
  "action": "light",
  "params": { "red": 100, "green": 0, "blue": 0 },
  "targetUser": "100/1001"
}
```

4. **Bridge Processing**
- Validates `targetUser` matches local `config.connect365Username`
- If match, forwards to Kuando Hub
- If no match, ignores request

5. **Bridge → Server**
```json
{
  "type": "api_response",
  "requestId": "a1b2c3d4...",
  "success": true,
  "data": { ... },
  "connect365Username": "100/1001"
}
```

6. **Server → PWA**
```json
{
  "success": true,
  "data": { ... }
}
```

### Example 2: Multiple Bridges

Scenario: Two bridges connected with usernames "100/1001" and "200/2001"

**Bridge 1 Registration:**
```json
{ "type": "bridge_register", "uniqueId": "100/1001" }
```
- Stored as: `bridges.set('100/1001', bridgeInfo)`

**Bridge 2 Registration:**
```json
{ "type": "bridge_register", "uniqueId": "200/2001" }
```
- Stored as: `bridges.set('200/2001', bridgeInfo)`

**Request Routing:**
- Request with header `x-connect365-username: 100/1001` → Routes to Bridge 1
- Request with header `x-connect365-username: 200/2001` → Routes to Bridge 2
- Request without header → Routes to first available bridge

## Error Handling

### Bridge Not Found
If username specified but bridge not connected:
```json
{
  "error": "Bridge not found",
  "message": "No bridge connected for user: 100/1001",
  "targetUser": "100/1001",
  "availableBridges": ["200/2001"]
}
```

### Duplicate Connection
If bridge with same uniqueId connects:
- Old connection is closed
- New connection replaces it
- Logs warning: "Bridge with uniqueId already registered. Replacing old connection."

### No Username Configured
Bridge without username can still connect but:
- Registration rejected with error message
- Prompted to configure Connect365 Username

## Status & Monitoring

### Bridge Status Display
Shows in tray menu "Show Status":
```
Bridge Status: Running
Kuando Hub: Connected
Remote Server: Connected
Connected

Connect365 Username: 100/1001

Devices:
  • Busylight Alpha

Server URL: wss://server1-XXXX.phantomapi.net:8089/ws
```

### Server Status Endpoint
`GET /api/busylight-status` returns:
```json
{
  "bridges": 2,
  "bridgeList": [
    {
      "uniqueId": "100/1001",
      "connect365Username": "100/1001",
      "connectedAt": "2025-12-24T...",
      "registeredAt": "2025-12-24T...",
      "info": { "version": "1.0.0", ... }
    },
    {
      "uniqueId": "200/2001",
      "connect365Username": "200/2001",
      ...
    }
  ],
  "pendingRequests": 0,
  "clients": 1
}
```

## Configuration

### Bridge Configuration File
Location: `%APPDATA%/busylight-bridge/config.json`

```json
{
  "bridgePort": 19774,
  "kuandoHubUrl": "http://localhost:8989",
  "serverUrl": "server1-XXXX.phantomapi.net",
  "connect365Username": "100/1001",
  "autoStart": true,
  "minimizeToTray": true,
  "showNotifications": true
}
```

### PWA Configuration
Location: localStorage via `localDB`

Keys used:
- `CurrentUser`: "100/1001" (from connection settings)
- `BusylightEnabled`: "1"
- `BusylightBridgeId`: "" (legacy, can be empty)

## Benefits

1. **Multiple Devices**: Support unlimited bridges on same server
2. **Correct Routing**: Commands reach intended device based on username
3. **Security**: Bridges validate targetUser before executing
4. **Debugging**: Clear identification of which bridge handles which user
5. **Scalability**: Linear scaling with number of connected bridges

## Testing

### Test Commands
```javascript
// In PWA console
window.testBusylight()
// Shows: Connect365 Username: 100/1001

// Check server status
fetch('/api/busylight-status').then(r => r.json()).then(console.log)
// Shows all connected bridges with uniqueIds
```

### Verification Checklist
- [ ] Bridge shows username in config dialog
- [ ] Bridge registration logged with uniqueId
- [ ] Server shows uniqueId in bridge list
- [ ] PWA includes x-connect365-username header
- [ ] Commands reach correct bridge
- [ ] Wrong targetUser commands ignored
- [ ] Multiple bridges work independently

## Migration Notes

### From Old System
Old system used generic bridgeId or "first available" routing.

**Changes needed:**
1. Configure Connect365 Username in each bridge
2. Ensure PWA has CurrentUser set in connection settings
3. Server automatically handles new registration format

### Backward Compatibility
- Old bridges without uniqueId will fail registration
- Registration error message guides user to configure
- No data loss, just requires configuration update

## Future Enhancements

1. **Admin UI**: Web interface to view all connected bridges
2. **Health Checks**: Periodic ping/pong with bridges
3. **Load Balancing**: If user has multiple bridges (future)
4. **Metrics**: Track request counts per bridge
5. **Audit Log**: Log all commands sent to each bridge
