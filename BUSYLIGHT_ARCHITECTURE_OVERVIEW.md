# Connect365 Busylight Bridge - Architecture Overview

## Executive Summary

The Connect365 Busylight Bridge is a **reverse-connection architecture** that enables a cloud-hosted Progressive Web Application (PWA) to control USB Busylight devices physically connected to users' PCs. This solution overcomes browser security limitations that prevent direct access to local USB hardware from web applications.

**Key Innovation**: Desktop clients initiate persistent WebSocket connections TO the cloud server (reverse connection), allowing the server to route commands from the PWA to the appropriate desktop bridge based on user identity.  This will allow multiple agent connections to same Pantom server to allow each device to have seperate status notifications from same architecture.

**Simplified Architecture**: Since the PWA is served from the same domain as the API server (`https://server1-XXXX.phantomapi.net`), there are no CORS (Cross-Origin Resource Sharing) restrictions. The PWA makes direct API calls to `/api/busylight` on the same server without requiring any middleware or proxy layers.

---

## Architecture Components

### Component Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        User's Web Browser                           │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  PWA Application (https://server1-XXXX.phantomapi.net)       │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │  BusylightManager (pwa/js/busylight-manager.js)         │  │  │
│  │  │  - Manages call state → light state mapping             │  │  │
│  │  │  - HTTP requests to /api/busylight (same-origin)        │  │  │
│  │  │  - Includes x-connect365-username header                │  │  │
│  │  │  - No CORS issues (same domain as server)               │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS Request (Same-Origin)
                              │ GET https://server1-XXXX.phantomapi.net/api/busylight?action=light&red=100&...
                              │ Header: x-connect365-username: 100/1001
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   Cloud Server (Node.js/Express)                    │
│                   server1-XXXX.phantomapi.net                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Express Server (server.js)                                   │  │
│  │  - Port 443/8088: HTTPS API + Static PWA files               │  │
│  │  - Route: /api/busylight → Bridge Server                      │  │
│  │  - No CORS middleware needed (same-origin)                    │  │
│  └───────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Bridge Server (bridge-server.js)                             │  │
│  │  - Port 8089: WebSocket server for bridge connections        │  │
│  │  - Tracks bridges by uniqueId (username)                      │  │
│  │  - Routes requests using request correlation                  │  │
│  │  - Maps: uniqueId → WebSocket connection                      │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ WebSocket (Reverse Connection)
                              │ wss://server1-XXXX.phantomapi.net:8089/ws
                              │ Bridge initiates and maintains connection
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         User's PC                                   │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Desktop Bridge (Electron App)                                │  │
│  │  busylight-bridge/electron/main.js                            │  │
│  │  - System tray application                                    │  │
│  │  - Port 19774: Local HTTP (legacy/fallback)                   │  │
│  │  - Registers as: uniqueId = "100/1001"                        │  │
│  │  - Receives API requests via WebSocket                        │  │
│  │  - Forwards to Kuando Hub                                     │  │
│  │  - Sends responses back to server                             │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                              │ HTTP (localhost)                      │
│                              │ http://localhost:8989/api/...         │
│                              ▼                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Kuando Hub (Vendor Software)                                 │  │
│  │  - Port 8989                                                   │  │
│  │  - USB device driver/API                                       │  │
│  │  - Endpoints: /light, /blink, /alert, /off                    │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                              │ USB                                   │
│                              ▼                                       │
│                      [Busylight Device]                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Component Breakdown

### 1. Kuando Hub (Third-Party Software)

**Location**: User's PC  
**Port**: 8989  
**URL**: `http://localhost:8989`  
**Vendor**: Plenom/Kuando  

**Purpose**: Provides the low-level driver and HTTP API for Busylight USB devices.

**Key Endpoints**:
- `GET /api/light?red=0-100&green=0-100&blue=0-100` - Set solid color
- `GET /api/blink?red=X&green=X&blue=X&ontime=X&offtime=X` - Flash pattern
- `GET /api/alert?red=X&green=X&blue=X&sound=1-7&volume=0-100` - Alert with sound
- `GET /api/off` - Turn light off
- `GET /api/currentpresence` - Get current state
- `GET /api/devices` - List connected devices

**Installation**: Must be installed separately by the user from Plenom website.

**Location**: User's PC (system tray)  
**Source**: 
- Electron version: `Connect365/busylight-bridge/electron/main.js`
- Native .NET version: `Connect365/busylight-bridge/native-windows/`

**Executable**: Packaged as Windows installer  
**Auto-Start**: Optional (configured in settings)

#### Why a Native Desktop Application is Required

The Desktop Bridge **cannot** be a web application or browser-based solution for several critical reasons:

**1. Browser Security Restrictions**
- Web browsers **block** all access to `localhost` and local network endpoints from HTTPS pages (Mixed Content Policy)
- The PWA (served over HTTPS) cannot make HTTP requests to `http://localhost:8989` (Kuando Hub)
- Even if CORS headers were configured, browsers would still block these requests for security

**2. USB Device Access**
- Browsers have **no native USB API** for arbitrary USB devices (only limited support for specific device classes)
- Kuando Busylight requires specialized USB HID (Human Interface Device) protocols
- The Kuando Hub software is the only interface to the USB hardware
- A native application is required to communicate with Kuando Hub's localhost API

**3. System Integration Requirements**
- **System Tray Icon**: Browsers cannot create persistent system tray icons
- **Auto-Start on Boot**: Web apps cannot register for Windows startup
- **Background Operation**: Browser tabs can be closed; native apps run independently
- **Always-On Service**: The bridge must maintain a persistent WebSocket connection even when the PWA is closed

**4. Persistent WebSocket Connection**
- The bridge maintains an **outbound** WebSocket connection to the cloud server
- This connection must persist across browser sessions, PC sleep/wake cycles, and network changes
- Web apps lose all state when the browser/tab closes
- Native apps run as background services independent of browser state

**5. Network Access Flexibility**
- Native apps can make HTTP requests to `localhost` without restrictions
- Can bind to local ports (19774) for legacy/fallback support
- Can implement custom networking protocols and error handling
- Not subject to browser timeout limitations or request throttling

**Technology Choice: Electron vs Native .NET**

| Feature | Electron | Native .NET |
|---------|----------|-------------|
| Development | JavaScript/Node.js | C# |
| Bundle Size | ~150MB (includes Chromium) | ~5-10MB |
| RAM Usage | ~100MB | ~30-50MB |
| Startup Time | ~2-3 seconds | <1 second |
| Cross-Platform | Yes (Windows, Mac, Linux) | Windows only (without extra work) |
| Dependencies | Node.js bundled | .NET Runtime required |
| WebSocket Support | `ws` npm package | Built-in `System.Net.WebSockets` |
| HTTP Requests | `node-fetch` / `axios` | Built-in `HttpClient` |
| System Tray | `electron` API | Built-in `System.Windows.Forms.NotifyIcon` |

**Current Implementation**: Both versions are available, allowing users to choose based on their preference for bundle size vs development ecosystem familiarity./main.js`  
**Executable**: Packaged as Windows installer  
**Auto-Start**: Optional (configured in settings)  

**Primary Functions**:

1. **Reverse WebSocket Connection**
   - Initiates persistent connection to cloud server
   - Protocol: `wss://server1-XXXX.phantomapi.net:8089/ws`
   - Falls back to `ws://` on port 8088 if SSL fails
   - Unlimited reconnection attempts (5-second interval)

2. **Bridge Registration**
   - Sends registration message on connection:
     ```json
     {
       "type": "bridge_register",
       "uniqueId": "100/1001",  //phantom device id
       "connect365Username": "100/1001", //phantom device id
       "info": {
         "version": "1.0.0",
         "platform": "win32"
       }
     }
     ```
   - `uniqueId` is the Connect365 username (SIP username)
   - Server uses this to route requests from PWA

3. **Request Processing**
   - Listens for WebSocket messages from server
   - Validates `targetUser` matches configured username
   - Forwards API requests to Kuando Hub
   - Static File Serving**
   - Serves PWA files (HTML, CSS, JavaScript) from `/pwa/` directory
   - All static assets delivered over HTTPS from same domain
   - Eliminates CORS issues entirely (same-origin policy satisfied)

2. **HTTP API Endpoint**
   - Route: `/api/busylight`
   - Method: GET
   - Query params: `action`, `bridgeId`, and action-specific params
   - Headers: `x-connect365-username` (for routing)
   - **No CORS middleware required** - PWA and API share the same origin

3. **Direct Bridge Integration**
   ```javascript
   // Line ~285 in server.js
   app.use('/api/busylight', busylightBridge.createHttpMiddleware());
   ```
   - No proxy or middleware layer needed
   - Direct routing to Bridge Server
   - Same-origin requests bypass all CORS restrictions

4  - Exit option

**Configuration File**: `%APPDATA%/busylight-bridge/config.json`

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

**Key Configuration Fields**:
- `serverUrl`: Cloud server domain (without protocol/port)
- `connect365Username`: Phantom device ID (used for routing)
- `kuandoHubUrl`: Local Kuando Hub API endpoint
- `bridgePort`: Local HTTP server port (fallback)
- `autoStart`: Launch on Windows startup

---

### 3. Cloud Server (Node.js/Express)

**Location**: `server1-XXXX.phantomapi.net`  
**Source Files**:
- `Connect365/server.js` - Main Express application
- `Connect365/bridge-server.js` - Bridge management logic

**Ports**:
- **8088**: HTTP/HTTPS API (PWA requests)
- **8089**: WebSocket server (bridge connections)

#### 3.1 Express Server (`server.js`)

**Primary Responsibilities**:

1. **HTTP API Endpoint**
   - Route: `/api/busylight`
   - Method: GET
   - Query params: `action`, `bridgeId`, and action-specific params
   - Headers: `x-connect365-username` (for routing)

2. **Middleware Integration**
   ```javascript
   // Line ~285 in server.js
   app.use('/api/busylight', busylightBridge.createHttpMiddleware());
   ```

3. **Status Endpoint**
   - Route: `/api/busylight-status`
   - Returns: Connected bridges count, bridge list

#### 3.2 Bridge Server (`bridge-server.js`)

**Class**: `BusylightBridgeServer`

**Core Data Structures**:

```javascript
this.bridges = new Map(); 
// uniqueId → { ws, uniqueId, connectionId, info, pendingRequests, lastSeen }

this.bridgesByConnectionId = new Map(); 
// connectionId → { ws, uniqueId, connectedAt, registered }

this.pendingRequests = new Map(); 
// requestId → { uniqueId, action, params, resolve, reject, timeout, sentAt }
```server1-XXXX.phantomapi.net`  
**Source**: `Connect365/pwa/js/busylight-manager.js`  

**Class**: `BusylightManager`

**Same-Origin Architecture**:
- PWA served from: `https://server1-XXXX.phantomapi.net/`
- API endpoint: `https://server1-XXXX.phantomapi.net/api/busylight`
- **Same domain** = No CORS restrictions
- No preflight OPTIONS requests needed
- No CORS headers required
- Simplified error handling
1. **`registerBridge(ws, connectionId)`**
   - Accepts incoming WebSocket connections
   - Stores temporary connection
   - Waits for `bridge_register` message with `uniqueId`
   - Sets up message handlers

2. **`handleBridgeMessage(connectionId, message)`**
   - Processes messages from bridges:
     - `bridge_register`: Complete registration with uniqueId
     - `api_response`: Match response to pending request
     - `pong`: Keepalive acknowledgment

3. **`sendToBridge(uniqueId, action, params)`**
   - Routes API request to specific bridge
   - Generates unique `requestId`
   - Returns Promise that resolves when response received
   - 30-second timeout
   - Auto-selects first bridge if no `uniqueId` specified

4. **`createHttpMiddleware()`**
   - Creates Express middleware for `/api/busylight`
   - Extracts `action`, `params`, `bridgeId`
   - Calls `sendToBridge()`
   - Returns HTTP response with result

**Request Correlation Algorithm**:
```javascript
const requestId = crypto.randomBytes(16).toString('hex');

// Store pending request
this.pendingRequests.set(requestId, {
  uniqueId: '100/1001',
  action: 'light',
  params: { red: 100, green: 0, blue: 0 },
  resolve: (response) => { /* resolve promise */ },
  reject: (error) => { /* reject promise */ },
  timeout: setTimeout(() => { /* timeout after 30s */ }, 30000),
  sentAt: new Date()
});

// Send to bridge
bridge.ws.send(JSON.stringify({
  type: 'api_request',
  requestId: requestId,
  action: 'light',
  params: { red: 100, green: 0, blue: 0 },
  targetUser: '100/1001'
}));

// When response arrives with matching requestId, resolve promise
```

---

### 4. PWA Client (Browser Application)

**Location**: User's web browser  
**URL**: `https://connect365.servehttp.com`  
**Source**: `Connect365/pwa/js/busylight-manager.js`  

**Class**: `BusylightManager`

**Initialization** (in `app-startup.js`):
```javascript
App.managers.busylight = new BusylightManager();
await App.managers.busylight.initialize();
```

**Core Functionality**:

1. **Settings Management**
   - Loads from `localStorage` via `window.localDB`
   - // Uses window.location.origin - same domain as PWA
     // Result: https://server1-XXXX.phantomapi.net/api/busylight?action=...
     const url = new URL('/api/busylight', window.location.origin);
     url.searchParams.set('action', action);
     
     // Add routing parameter
     const username = this.getConnect365Username();
     if (username) {
       url.searchParams.set('bridgeId', username);
     }
     
     // Add action params
     for (const [key, value] of Object.entries(params)) {
       url.searchParams.set(key, value.toString());
     }
     
     return url.toString();
     // Example result: 
     // https://server1-XXXX.phantomapi.net/api/busylight?action=light&red=100&green=0&blue=0&bridgeId=100/1001
   
   
   buildRequestHeaders() {
     const headers = {};
     const username = this.getConnect365Username();
     if (username) {
       headers['x-connect365-username'] = username;
     }
     return headers;
     // No CORS-related headers needed - same-origin requestams.set('bridgeId', username);
     }
     
     // Add action params
     for (const [key, value] of Object.entries(params)) {
       url.searchParams.set(key, value.toString());
     }
     
     return url.toString();
   
   
   buildRequestHeaders() {
     const headers = {};
     const username = this.getConnect365Username();
     if (username) {
       headers['x-connect365-username'] = username;
     }
     return headers;
   }
   ```

5. **Username Retrieval**
   ```javascript
   getConnect365Username() {
     // Try localStorage first
     if (window.localDB) {
       const username = window.localDB.getItem('SipUsername', '');
       if (username) return username;
     }
     
     // Fallback to global App settings
     if (window.App?.settings?.SipUsername) {
       return window.App.settings.SipUsername;
     }
     
     return null; // Auto-select first bridge
   }
   ```

**State Management**:

The `BusylightManager` maintains state mappings:

```javascript
this.stateColors = {
  'offline': null,                                    // OFF
  'registered': { red: 100, green: 100, blue: 100 }, // WHITE
  'idle': { red: 0, green: 100, blue: 0 },           // GREEN
  'idle_voicemail': { red: 0, green: 100, blue: 0 }, // GREEN (flashing)
  'ringing': { red: 100, green: 0, blue: 0 },        // RED (alert)
  'active': { red: 100, green: 0, blue: 0 },         // RED
  'hold': { red: 100, green: 100, blue: 0 }          // YELLOW (flashing)
};

this.flashIntervals = {
  'ringing': { ontime: 5, offtime: 5 },        // 0.5s on/off
  'hold': { ontime: 15, offtime: 15 },         // 1.5s on/off
  'idle_voicemail': { ontime: 15, offtime: 15 } // 1.5s on/off
};
```

**Event Listeners**:

The `BusylightManager` listens to `SipSessionManager` events:

| Event | Trigger | Action |
|-------|---------|--------|
| `registered` | SIP registration complete | Set WHITE |
| `unregistered` | SIP unregistered | Turn OFF |
| `sessionCreated` (incoming) | Incoming call | RED alert with sound |
| `sessionAnswered` | Call answered | RED solid |
| `sessionHeld` | Call placed on hold | YELLOW flashing |
| `sessionResumed` | Call resumed from hold | RED solid |
| `sessionTerminated` | Call ended | Return to idle state |
| `voicemailCountChanged` | New voicemail | GREEN flashing |

**Implementation Example**:
```javascript
attachSipListeners() {
  const sipManager = window.App.managers.sip;
  
  sipManager.on('sessionCreated', (data) => {
    if (data.direction === 'incoming') {
      this.setState('ringing');
    }
  });
  
  sipManager.on('sessionAnswered', () => {
    this.setState('active');
  });
  
  sipManager.on('sessionTerminated', () => {
    this.setState('idle');
  });
  
  // ... additional listeners
}
```

---

## Complete Request Flow Example

### Scenario: User Receives Incoming Call

**Step 1: SIP Event Triggered**
```javascript
// In SipSessionManager
this.emit('sessionCreated', {
  lineNumber: 1,
  direction: 'incoming',
  remoteNumber: '+1234567890',
  sessionId: 'session-123'
});
```

**Step 2: Busylight Manager Handles Event**
```javascript
// BusylightManager.attachSipListeners()
sipManager.on('sessionCreated', (data) => {
  if (data.direction === 'incoming') {
    this.setState('ringing'); // Triggers red alert
  }Same-origin request - no CORS issues
// URL: https://server1-XXXX.phantomapi.net/api/busylight?action=alert&red=100&green=0&blue=0&sound=3&volume=50&bridgeId=100/1001
// Headers: { 'x-connect365-username': '100/1001' }
const response = await fetch(url, {
  method: 'GET',
  headers: buildRequestHeaders(),
  signal: AbortSignal.timeout(2000)
});
// No CORS preflight (OPTIONS) request
// Browser allows request because origin matches
```

**Step 5: Express Server Receives Request**
```javascript
// server.js - Direct routing to Bridge Server
app.use('/api/busylight', busylightBridge.createHttpMiddleware());

// No CORS middleware needed:
// ❌ app.use(cors()) - NOT REQUIRED
// ❌ Response headers like Access-Control-Allow-Origin - NOT REQUIRED
// ✅ Same-origin policy satisfied automatically
      sound: this.ringSound,
      volume: this.ringVolume
    });
  }
}
```

**Step 4: API Request Built**
```javascript
// URL: /api/busylight?action=alert&red=100&green=0&blue=0&sound=3&volume=50&bridgeId=100/1001
// Headers: { 'x-connect365-username': '100/1001' }
const response = await fetch(url, {
  method: 'GET',
  headers: buildRequestHeaders(),
  signal: AbortSignal.timeout(2000)
});
```

**Step 5: Express Server Receives Request**
```javascript
// server.js - Busylight middleware
app.use('/api/busylight', busylightBridge.createHttpMiddleware());

// Middleware extracts:
// - action: 'alert'
// - params: { red: 100, green: 0, blue: 0, sound: 3, volume: 50 }
// - uniqueId: '100/1001' (from header or query param)
```

**Step 6: Bridge Server Routes to Desktop**
```javascript
// bridge-server.js
const result = await busylightBridge.sendToBridge('100/1001', 'alert', {
  red: 100,
  green: 0,
  blue: 0,
  sound: 3,
  volume: 50
});

// Internally:
// 1. Finds bridge with uniqueId='100/1001' in this.bridges Map
// 2. Generates requestId: 'a3f9e8c2d1b5...'
// 3. Creates Promise with 30s timeout
// 4. Sends WebSocket message to desktop bridge
```

**Step 7: Desktop Bridge Receives Message**
```javascript
// electron/main.js - handleServerMessage()
async function handleServerMessage(message) {
  const { type, requestId, action, params, targetUser } = message;
  
  // Validate this is for this user
  if (config.connect365Username !== targetUser) {
    console.log(`Ignoring request for ${targetUser}`);
    return;
  }
  
  // Process alert action
  const result = await forwardToKuando('alert', {
    red: 100,
    green: 0,
    blue: 0,
    sound: 3,
    volume: 50
  });
  
  // Send response back to server
  serverWs.send(JSON.stringify({
    type: 'api_response',
    requestId: 'a3f9e8c2d1b5...',
    connect365Username: '100/1001',
    success: true,
    data: result
  }));
}
```

**Step 8: Forward to Kuando Hub**
```javascript
async function forwardToKuando(action, params) {
  const url = `${config.kuandoHubUrl}/api/${action}?` + 
              new URLSearchParams(params).toString();
  
  // URL: http://localhost:8989/api/alert?red=100&green=0&blue=0&sound=3&volume=50
  
  const response = await fetch(url);
  return response.json();
}
```

**Step 9: Physical Device Activates**
- Kuando Hub sends USB commands to device
- Busylight flashes RED at 500ms intervals
- Plays sound #3 at 50% volume

**Step 10: Response Flows Back**
```
Desktop Bridge → WebSocket → Server → Bridge Server → Express → PWA
```

**Step 11: Bridge Server Matches Response**
```javascript
// bridge-server.js - handleBridgeMessage()
case 'api_response':
  const { requestId, success, data } = message;
  
  // Find pending request
  const pending = this.pendingRequests.get(requestId);
  if (pending) {
    clearTimeout(pending.timeout);
    
    if (success) {
      pending.resolve({ success: true, data });
    } else {
      pending.reject(new Error(data?.error || 'Request failed'));
    }
    
    this.pendingRequests.delete(requestId);
  }
  break;
```

**Step 12: HTTP Response to PWA**
```javascript
// PWA receives response
{
  "success": true,
  "data": { /* Kuando Hub response */ }
}

// BusylightManager updates state
this.currentState = 'ringing';
this.connected = true;
this.retryAttempts = 0;
```

**Total Round-Trip Time**: ~100-500ms

---

## Multi-User Support

The architecture supports multiple simultaneous users with different desktop bridges:

### User A:
- Username: `100/1001`
- Bridge on PC: `192.168.1.10`
- PWA Browser: `Chrome on 192.168.1.10`
- Bridge registered as: `uniqueId = "100/1001"`

### User B:
- Username: `200/2001`
- Bridge on PC: `192.168.1.20`
- PWA Browser: `Chrome on 192.168.1.20`
- Bridge registered as: `uniqueId = "200/2001"`

### Server State:
```javascript
bridges = Map {
  "100/1001" => { ws: WebSocket, uniqueId: "100/1001", ... },
  "200/2001" => { ws: WebSocket, uniqueId: "200/2001", ... }
}
```

### Routing:
- User A's PWA sends: `x-connect365-username: 100/1001` → Routes to Bridge A
- User B's PWA sends: `x-connect365-username: 200/2001` → Routes to Bridge B

**Isolation**: Each bridge only processes requests matching its configured `connect365Username`.

---

## Security Considerations

### 1. Same-Origin Security
- PWA authenticates with server using SIP credentials
- Bridge authenticates using configured username
- Server validates username matches SIP registration

### 2. Encryption
- PWA → Server: HTTPS/WSS
- Server → Bridge: WSS (WebSocket Secure)
- Bridge → Kuando: HTTP (localhost only)

### 3. Authorization
- Desktop bridge validates `targetUser` in every request
- Server tracks which username is associated with each bridge
- No cross-user command execution

### 4. Request Validation
- Server validates action names (whitelist)
- Parameter validation in desktop bridge
- Timeout protection (30s max)

---

## Fault Tolerance & Reliability

### Desktop Bridge Resilience

**Reconnection Strategy**:
```javascript
const MAX_RECONNECT_ATTEMPTS = 999999; // Effectively unlimited
const RECONNECT_DELAY_MS = 5000; // 5 seconds

async function attemptReconnect() {
  reconnectAttempts++;
  console.log(`[Bridge] Reconnection attempt ${reconnectAttempts}...`);
  
  // Try secure connection first
  try {
    await connectToServer();
    console.log('[Bridge] Reconnected successfully');
    reconnectAttempts = 0;
    return;
  } catch (err) {
    console.error('[Bridge] Reconnection failed:', err.message);
  }
  
  // Schedule next attempt
  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    reconnectTimeout = setTimeout(attemptReconnect, RECONNECT_DELAY_MS);
  }
}
```

**Protocol Fallback**:
1. Try `wss://server:8089/ws` (secure WebSocket)
2. If fails, try `ws://server:8088/ws` (insecure WebSocket)
3. Store successful protocol for future connections

**Connection Monitoring**:
- Ping/pong keepalive every 30 seconds
- Server tracks `lastSeen` timestamp
- Bridge updates system tray icon based on connection state

### PWA Client Resilience

**Retry Logic**:
```javascript
async handleRequestFailure() {
  if (this.retryAttempts >= this.maxRetryAttempts) {
    this.connected = false;
    this.showConnectionError();
    return false;
  }
  
  this.retryAttempts++;
  console.log(`[Busylight] Retry ${this.retryAttempts}/${this.maxRetryAttempts}`);
  
  // Exponential backoff: 500ms, 1000ms, 1500ms, 2000ms, 2500ms
  await this.sleep(500 * this.retryAttempts);
  
  return false;
}
```

**Graceful Degradation**:
- If busylight unavailable, app continues functioning
- Visual indicator in settings shows connection status
- No impact on call handling if busylight offline

### Server Reliability

**Request Timeout Protection**:
```javascript
const timeout = setTimeout(() => {
  this.pendingRequests.delete(requestId);
  reject(new Error(`Request timeout for bridge ${uniqueId}`));
}, this.requestTimeout) (Local PC)
   ```bash
   # From user's PC
   curl http://localhost:8989/api/devices
   ```
   - Should return list of connected USB devices
   - If fails, Kuando Hub not running or device not connected
   - Kuando Hub must be installed separately

2. **Check Desktop Bridge** (Local PC)
   - Look for system tray icon
   - Icon color indicates connection state:
     - Green: Connected to server and Kuando Hub
     - Yellow: Connected to server, Kuando Hub unavailable
     - Red: Disconnected from server
   - Right-click → "Test Light" to verify local functionality
   - Check bridge is configured with correct server URL

3. **Check Server Connection**
   ```bash
   curl https://server1-XXXX.phantomapi.net/api/busylight-status
   ```
   - Should show connected bridges
   - Verify your username appears in bridge list
   - If empty, bridge not connected to server

4. **Check PWA Connection** (Browser)
   - Open: `https://server1-XXXX.phantomapi.net`
   - Navigate to Settings → Busylight
   - Verify "Enable Busylight" is checked
   - Open browser Developer Tools (F12) → Console
   - Look for error messages related to busylight API calls
   - Verify requests are going to same domain (no CORS errors)

5. **Check Username Configuration**
   - Desktop Bridge config: `%APPDATA%/busylight-bridge/config.json`
   - Verify `connect365Username` matches your SIP username exactly
   - PWA should use same username (stored in `localStorage.SipUsername`)
   - Username is used for routing requests to correct bridge

6. **Network Diagnostics**
   ```bash
   # Check if bridge can reach server
   # From user's PC:
   curl wss://server1-XXXX.phantomapi.net:8089/ws
   
   # Check if PWA can reach API (from browser console):
   fetch('https://server1-XXXX.phantomapi.net/api/busylight?action=health')
     .then(r => r.json())
     .then(console.log);
   ```
     - Green: Connected to server and Kuando Hub
     - Yellow: Connected to server, Kuando Hub unavailable
     - Red: Disconnected from server

### Problem: CORS Errors (Should Not Occur)

**Note**: With the PWA served from `server1-XXXX.phantomapi.net`, CORS errors should **never** occur.

**If you see CORS errors**:
- Verify PWA is being served from same domain as API
- Check browser's Network tab for actual request URL
- Ensure request URL starts with `https://server1-XXXX.phantomapi.net/`
- If requests go to different domain, static file serving configuration may be incorrect

**Common Mistake**:
```javascript
// WRONG - Hardcoded different domain
const url = 'https://connect365.servehttp.com/api/busylight';

// CORRECT - Use relative path or window.location.origin
const url = '/api/busylight'; // Relative
const url = `${window.location.origin}/api/busylight`; // Absolute same-origin
```
   - Right-click → "Test Light" to verify local functionality

3. **Check Server Connection**
   ```
   curl https://connect365.servehttp.com/api/busylight-status
   ```
   - Should show connected bridges
   - Verify your username appears in bridge list

4. **Check PWA Settings**
   - Open Settings → Busylight
   - Verify "Enable Busylight" is checked
   - Check browser console for error messages

5. **Check Username Configuration**
   - Desktop Bridge config: `%APPDATA%/busylight-bridge/config.json`
   - Verify `connect365Username` matches your SIP username
   - PWA should use same username (stored in `localStorage.SipUsername`)

### Problem: Delayed Response

**Potential Causes**:
1. Network latency between PWA → Server → Bridge
2. Kuando Hub slow to respond (USB communication delay)
3. Server request queue backlog

**Investigation**:
- Check browser Network tab: PWA → Server timing
- Check server logs: Request receive → Response send timing
- Check desktop bridge logs: Request receive → Kuando Hub response timing

### Problem: Multiple Bridges for Same User

**Symptoms**:
- Erratic behavior (commands go to wrong PC)
- `/api/busylight-status` shows duplicate usernames

**Resolution**:
- Server automatically closes old connection when new bridge registers with same `uniqueId`
- Close duplicate bridge instances
- Verify `connect365Username` is unique per user

---

## Development & Debugging

### Enable Debug Logging

**Desktop Bridge**:
```javascript
// In electron/main.js
console.log('[Bridge] Debug:', message);
// Logs to: stdout (visible in terminal if launched manually)
```

**Server**:
```javascript
// In bridge-server.js
console.log(`[BusylightBridge] Debug:`, data);
// Logs to: server console/log file
```

**PWA**:
```javascript
// Browser console
window.testBusylight(); // Runs diagnostic
```PWA files to same server as API (`server1-XXXX.phantomapi.net`)
- [ ] Ensure Express serves static files from `/pwa/` directory:
  ```javascript
  app.use(express.static(path.join(__dirname, 'pwa')));
  ```
- [ ] Verify HTTPS is enabled (required for security and WebSockets)
- [ ] Confirm PWA accessible at: `https://server1-XXXX.phantomapi.net/`
- [ ] Test API endpoint: `https://server1-XXXX.phantomapi.net/api/busylight-status`
- [ ] Verify both URLs use same domain (no CORS issues)
- [ ] Test from browser: Navigate to Settings → Busylight
- [ ] Enable busylight in settings
- [ ] Verify connection status shows "Connected"
- [ ] Test with incoming call
- [ ] Check browser console - should see no CORS errors
// Initialize test
const manager = window.App.managers.busylight;

// Test connection
await manager.checkConnection();

// Test colors
await manager.apiRequest('light', { red: 100, green: 0, blue: 0 }); // Red
await manager.apiRequest('light', { red: 0, green: 100, blue: 0 }); // Green
await manager.apiRequest('light', { red: 100, green: 100, blue: 0 }); // Yellow
await manager.apiRequest('off'); // Off
```

**Test Desktop Bridge Directly**:
```bash
# Test local HTTP server
curl "http://localhost:19774/health"
curl "http://localhost:19774/kuando?action=light&red=100&green=0&blue=0"
```

**Test Kuando Hub Directly**:
```bash
curl "http://localhost:8989/api/devices"
curl "http://localhost:8989/api/light?red=100&green=0&blue=0"
```

---

## Performance Characteristics

### Latency Measurements

| Stage | Typical Time | Notes |
### Key Architectural Strengths:

**1. Same-Origin Simplicity**
- PWA and API served from same domain eliminates CORS complexity
- No middleware or proxy layers required
- Simplified security model and debugging
- Reduced latency (no additional proxy hops)

**2. Native Desktop Bridge Necessity**
- Browsers cannot access localhost from HTTPS pages (security restriction)
- Native application required to communicate with Kuando Hub
- Persistent WebSocket connection independent of browser state
- System-level integration (tray icon, auto-start, background operation)

**3. Reverse Connection Security**
- Desktop bridge initiates outbound connection (firewall-friendly)
- No inbound ports required on user's PC
- HTTPS/WSS encryption throughout
- Username-based routing provides user isolation

**4. Scalability & Reliability**
- Stateless routing supports unlimited concurrent users
- Automatic reconnection with unlimited retry attempts
- Request correlation ensures reliable command delivery
- 30-second timeout protection prevents hung requests

**5. Developer-Friendly Architecture**
- Clean separation of concerns (PWA, Server, Bridge, Device)
- Comprehensive logging at each layer
- Choice of Electron or .NET for desktop bridge
- Well-defined API contract between components

### Why Native Desktop Bridge is Essential:

The desktop bridge **cannot** be replaced with a browser-based solution because:
1. Browsers block HTTPS → HTTP localhost requests (Mixed Content Policy)
2. No browser USB API for Kuando Busylight devices
3. Requires persistent connection independent of browser sessions
4. Needs system-level integration (tray, auto-start, background service)
5. Must communicate with Kuando Hub on localhost:8989
| Kuando Hub → USB | 10-30ms | USB communication |
| **Total Round Trip** | **100-500ms** | End-to-end |

### Throughput

- **Concurrent Users**: Unlimited (one bridge per user)
- **Requests per Second**: ~50 per bridge (Kuando Hub limitation)
- **Pending Requests**: No hard limit (Map-based storage)
- **WebSocket Connections**: Limited by server resources (typically thousands)

### Resource Usage

**Desktop Bridge**:
- RAM: ~50-100 MB
- CPU: <1% idle, ~2-5% during active commands
- Network: Minimal (WebSocket keepalive + commands)

**Server**:
- RAM: ~100 MB + ~1 MB per connected bridge
- CPU: <1% idle, scales with request volume
- Network: Minimal (WebSocket + HTTP API)

---

## Future Enhancements

### Potential Improvements

1. **Authentication Token**
   - Replace username-based routing with JWT tokens
   - Include token in WebSocket handshake
   - Validate token on every request

2. **Bridge Auto-Discovery**
   - PWA can query server for available bridges
   - Support multiple bridges per user (failover)
   - Dynamic bridge selection based on availability

3. **Command Queueing**
   - Queue commands when bridge offline
   - Replay when connection restored
   - Persistent queue in database

4. **Real-time Bridge Status**
   - WebSocket connection from PWA to server
   - Server pushes bridge status changes
   - Instant UI updates on connect/disconnect

5. **Enhanced Monitoring**
   - Prometheus metrics endpoint
   - Grafana dashboards
   - Alert on bridge disconnections

---

## Conclusion

The Connect365 Busylight Bridge architecture successfully bridges the gap between cloud-based web applications and local USB hardware through a secure, scalable reverse-connection design. The username-based routing enables seamless multi-user support, while the request correlation system ensures reliable command delivery even over unreliable networks.

Key strengths:
- **Security**: HTTPS/WSS throughout, no inbound ports required
- **Reliability**: Automatic reconnection, retry logic, timeout protection
- **Scalability**: Stateless routing, concurrent multi-user support
- **Maintainability**: Clean separation of concerns, comprehensive logging

For questions or issues, please contact the development team or refer to the detailed documentation in the codebase.

---

**Document Version**: 1.0  
**Last Updated**: January 7, 2026  
