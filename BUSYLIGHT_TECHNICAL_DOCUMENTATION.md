# Connect365 Busylight Integration - Technical Documentation

## Document Overview

This document provides a comprehensive technical overview of the Connect365 Busylight integration solution for company developers to continue development. The solution enables real-time visual presence indication using Plenom Kuando Busylight devices, synchronized with the Connect365 PWA telephony application or any web-based application.

### IMPORTANT NOTES (please read before continuing)

There are two seperate possible changes that would possibly enhance the solution, but I have had no time to research fully.  I believe that the development team would be much better placed to answer the following
    - I blinkered myself in respect of the reverse proxy part of this solution because I was already testing with a express server that I was using to add CORS headers to API requests to allow me to access 'NoAuth' API's on phantom (these are used by physical devices which don't bother with CORS).  This meant it was easy to add reverse proxy to the main functionality of the express server.  However I never looked at any other solution to achieve this functionality
    - The .NET desktop application utilises manufacturer software that also is required to be installed on desktop.  I know it is very possible to directly access the USB device and I believe development documentation is available to do this.  It would have both pros/cons to do this.  Without any experience of development I can not provide a answer as to if it would be worthwhile. The only observations I have are
        **PROS**
            - One less point of failure
            - Less chance of missed API requests to device, as no need to forward request locally
            - No propriatary software from manufacturer required
        **CONS**
            - Obviously more development time required
            - We would have to maintain software for connection to a hardware device that we do not control development for
            - Utilising the propriatary software HTTP API connection allows them to keep the device hardware update capabilities as well as a few features to personalise the Busylight device

**Version:** 1.0.2  
**Last Updated:** January 12, 2026  
**Target Audience:** Developers extending and then maintaining the Busylight integration with web-based app.

---

## Table of Contents

1. [Solution Architecture](#solution-architecture)
2. [Component Overview](#component-overview)
3. [Busylight Bridge (C# Desktop Application)](#busylight-bridge-c-desktop-application)
4. [Reverse Proxy Bridge Server (Node.js)](#reverse-proxy-bridge-server-nodejs)
5. [BusylightManager Class (PWA JavaScript)](#busylightmanager-class-pwa-javascript)
6. [Communication Flow](#communication-flow)
7. [State Management](#state-management)
8. [Installation and Deployment](#installation-and-deployment)

---

## Solution Architecture

The Busylight integration consists of three primary components working together to bridge the browser-based Connect365 PWA with physical Busylight devices connected to user workstations:

```
┌────────────────────────────────────────────────────────────────┐
│                    CONNECT365 PWA (Browser)                    │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │          BusylightManager Class (JavaScript)             │  │
│  │  - Monitors SIP/call state                               │  │
│  │  - Makes HTTP API requests to /api/busylight             │  │
│  │  - Includes bridgeId (username) for routing              │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────┬────────────────────────────────────┘
                            │ HTTP Requests
                            │ (with x-connect365-username header)
                            ▼
┌────────────────────────────────────────────────────────────────┐
│              CONNECT365 SERVER (Node.js/Express)               │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │       BusylightBridgeServer Class (bridge-server.js)     │  │
│  │  - Accepts incoming WebSocket connections from bridges   │  │
│  │  - Routes HTTP requests to correct bridge via username   │  │
│  │  - Manages request/response correlation                  │  │
│  │  - Provides /api/busylight HTTP middleware               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  WebSocket Server: wss://server:8089/ws                        │
└───────────────────────────┬────────────────────────────────────┘
                            │ WebSocket (Reverse Connection)
                            │ Bridge connects to server
                            ▼
┌────────────────────────────────────────────────────────────────┐
│           USER PC (Windows Desktop Application)                │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │      BusylightBridge.exe (C# .NET Application)           │  │
│  │                                                          │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │ RemoteServerClient: Connects to server via WSS     │  │  │
│  │  │ - Maintains persistent WebSocket connection        │  │  │
│  │  │ - Sends bridge_register with Connect365 username   │  │  │
│  │  │ - Receives api_request messages                    │  │  │
│  │  │ - Responds with api_response messages              │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │                         │                                │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │ LocalServer: HTTP server on localhost:19774        │  │  │
│  │  │ - Proxies requests to Kuando Hub                   │  │  │
│  │  │ - Provides health check endpoint                   │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                   │
│                            │ HTTP Requests                     │
│                            ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │      Kuando Hub / HTTP Service (localhost:8989)          │  │
│  │  - Communicates with physical Busylight device           │  │
│  │  - Controls LED colors, sounds, alerts                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                   │
│                            ▼                                   │
│                  [Busylight USB Device]                        │
└────────────────────────────────────────────────────────────────┘
```

### Key Architecture Principles

1. **Reverse Connection Model**: The desktop bridge application initiates and maintains the connection to the server, solving firewall and NAT traversal issues
2. **Username-Based Routing**: Each bridge registers with the user's Connect365 username, enabling multi-user support on shared servers
3. **Request/Response Correlation**: Unique request IDs ensure responses match the correct originating HTTP request
4. **Local Device Abstraction**: The bridge abstracts the Kuando Hub API, providing a consistent interface regardless of Kuando software version

---

## Component Overview

### 1. Busylight Bridge (Desktop Application)
- **Technology**: C# .NET 8.0, Windows Forms
- **Location**: `busylight-bridge/BusylightBridge/`
- **Purpose**: Runs on user PCs to control local Busylight devices and maintain connection to server
- **Key Features**:
  - System tray application with auto-start capability
  - WebSocket client connecting to remote server
  - Local HTTP server for Kuando Hub communication
  - Automatic reconnection and health monitoring

### 2. Reverse Proxy Bridge Server
- **Technology**: Node.js, WebSocket (ws library)
- **Location**: `bridge-server.js`
- **Purpose**: Central routing hub between PWA HTTP requests and desktop bridge clients
- **Key Features**:
  - WebSocket server accepting bridge connections
  - HTTP middleware for Express.js
  - Request/response correlation with timeouts
  - Multi-bridge management with username routing

### 3. BusylightManager Class
- **Technology**: JavaScript (ES6+)
- **Location**: `pwa/js/busylight-manager.js`
- **Purpose**: PWA-side manager for presence state evaluation and API communication
- **Key Features**:
  - Real-time call state monitoring
  - Automatic state evaluation (IDLE, BUSY, RINGING, etc.)
  - HTTP API client with automatic reconnection
  - Voicemail notification support

---

## Busylight Bridge (C# Desktop Application)

### Architecture

The Busylight Bridge is a Windows desktop application that runs in the system tray and consists of several key components:

#### Core Components

**Program.cs** - Application entry point and orchestration
- Initializes all components
- Manages application lifecycle
- Coordinates health checks via timer

**RemoteServerClient.cs** - WebSocket client for server connection
- Connects to server at `wss://server:8089/ws`
- Sends registration message with Connect365 username
- Handles incoming API requests and sends responses
- Implements automatic reconnection with exponential backoff

**LocalServer.cs** - Local HTTP server
- Listens on `http://localhost:19774` (configurable)
- Proxies requests to Kuando Hub at `http://localhost:8989`
- Provides `/health` endpoint for status checks
- Handles CORS for cross-origin requests

**TrayIconManager.cs** - System tray icon and menu
- Shows connection status with colored icons
- Provides settings, reconnect, and exit menu options
- Displays notifications for connection events

**Configuration.cs** - Application settings
- Stores Connect365 username, server URL, and ports
- Persists settings to user's AppData folder
- Provides defaults for first-run experience

**SettingsForm.cs** - Settings dialog
- Allows user to configure server URL and username
- Tests connections before saving
- Shows Kuando Hub connection status

### Communication Protocol

#### Registration Message (Bridge → Server)
```json
{
  "type": "bridge_register",
  "uniqueId": "SIP endpoint device id (e.g. 141)",
  "connect365Username": "SIP endpoint device id (e.g. 141)",
  "version": "1.0.2",
  "kuandoConnected": true,
  "timestamp": "2026-01-12T10:30:00Z"
}
```

#### API Request Message (Server → Bridge)
```json
{
  "type": "api_request",
  "requestId": "a1b2c3d4e5f6...",
  "action": "light",
  "params": {
    "red": 100,
    "green": 0,
    "blue": 0
  },
  "targetUser": "SIP endpoint device id (e.g. 141)"
}
```

#### API Response Message (Bridge → Server)
```json
{
  "type": "api_response",
  "requestId": "a1b2c3d4e5f6...",
  "success": true,
  "data": {
    "status": "ok",
    "action": "light"
  }
}
```

### Actions Supported

The bridge forwards requests to the Kuando Hub API and supports these actions:

| Action | Description | Parameters |
|--------|-------------|------------|
| `status` | Get current device status | None |
| `devices` | List connected devices | None |
| `light` | Set solid color | `red`, `green`, `blue` (0-100) |
| `off` | Turn off device | None |
| `alert` | Play sound and flash | `red`, `green`, `blue`, `sound` (1-7), `volume` (0-100) |
| `health` | Check bridge health | None |

### Kuando Hub Communication

The bridge communicates with Kuando Hub via HTTP query parameters:

```
GET http://localhost:8989?action=light&red=100&green=0&blue=0
GET http://localhost:8989?action=alert&red=100&green=0&blue=0&sound=3&volume=50
GET http://localhost:8989?action=busylightoff
GET http://localhost:8989?action=currentpresence
GET http://localhost:8989?action=busylightdevices
```

### Auto-Start Configuration

The bridge can be configured to start automatically with Windows:

**AutoStartManager.cs** - Windows startup integration
- Creates registry entry in `HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run`
- Registry key: `BusylightBridge`
- Registry value: Path to executable with `--minimized` flag

### Error Handling and Notifications

- **Kuando Hub Unavailable**: Shows notification if Kuando Hub is not running (5-minute cooldown)
- **Server Connection Lost**: Automatically attempts reconnection with exponential backoff (Manual reconnection option is made available upon disconnection)
- **Device Disconnected**: Monitors Kuando connection status and notifies user

---

## Reverse Proxy Bridge Server (Node.js)

### Overview

The `BusylightBridgeServer` class (in `bridge-server.js`) acts as a central routing hub that accepts incoming WebSocket connections from desktop bridge clients and routes HTTP API requests from the PWA to the correct bridge based on username.

### Key Features

#### 1. WebSocket Server for Bridge Connections

The server accepts incoming WebSocket connections from bridge clients:

```javascript
const bridgeServer = new BusylightBridgeServer();

// In Express setup
wss.on('connection', (ws, req) => {
    const connectionId = crypto.randomBytes(16).toString('hex');
    bridgeServer.registerBridge(ws, connectionId);
});
```

#### 2. HTTP Middleware for PWA Requests

The server provides Express middleware to handle HTTP requests:

```javascript
app.use('/api/busylight', bridgeServer.createHttpMiddleware());
```

The middleware:
- Extracts target username from `x-connect365-username` header or `bridgeId` query parameter
- Routes request to the appropriate connected bridge
- Waits for response with 30-second timeout
- Returns response to PWA

#### 3. Bridge Management

**Bridge Registration**:
- Assigns temporary `connectionId` when bridge connects
- Waits for `bridge_register` message with `uniqueId` (username)
- Moves bridge from temporary storage to registered bridges map
- Validates uniqueId and handles duplicate registrations

**Data Structures**:
```javascript
this.bridges = new Map(); // uniqueId -> { ws, info, pendingRequests }
this.bridgesByConnectionId = new Map(); // connectionId -> { ws, uniqueId, ... }
this.pendingRequests = new Map(); // requestId -> { resolve, reject, timeout }
```

#### 4. Request/Response Correlation

Each HTTP request generates a unique `requestId`:
```javascript
const requestId = crypto.randomBytes(16).toString('hex');
```

The server:
1. Creates a Promise for the request
2. Stores it in `pendingRequests` map
3. Sends request to bridge with `requestId`
4. Waits for bridge to respond with matching `requestId`
5. Resolves/rejects the Promise when response arrives or timeout occurs

#### 5. Username-Based Routing

The server routes requests based on Connect365 username:

```javascript
// Extract from header or query parameter
let targetUser = req.headers['x-connect365-username'] || 
                 req.query.bridgeId || 
                 null;

// Route to specific bridge
const result = await this.sendToBridge(targetUser, action, params);
```

If no username specified, routes to first available bridge.

### API Translation

The server translates PWA HTTP requests to WebSocket messages:

**HTTP Request**:
```http
GET /api/busylight?action=light&red=100&green=0&blue=0&bridgeId=john.doe
Headers: x-connect365-username: SIP endpoint device id (e.g. 141)
```

**Translated to WebSocket**:
```json
{
  "type": "api_request",
  "requestId": "abc123...",
  "action": "light",
  "params": {
    "red": "100",
    "green": "0",
    "blue": "0"
  },
  "targetUser": "SIP endpoint device id (e.g. 141)"
}
```

### Action Mapping

Some actions are mapped from Kuando API names to bridge names:

| PWA/Kuando Action | Bridge Action |
|-------------------|---------------|
| `busylightdevices` | `devices` |
| `currentpresence` | `status` |
| All others | Same |

### Error Handling

The server provides detailed error responses:

**No Bridges Connected**:
```json
{
  "error": "Busylight service unavailable",
  "message": "No Busylight Bridge clients are currently connected...",
  "connected": false,
  "bridges": 0
}
```
Status: 503

**Bridge Not Found**:
```json
{
  "error": "Bridge not found",
  "message": "No bridge connected for user: john.doe",
  "targetUser": "john.doe",
  "availableBridges": ["jane.smith", "bob.jones"]
}
```
Status: 404

**Request Timeout**:
```json
{
  "error": "Bridge communication error",
  "message": "Request timeout for bridge john.doe",
  "success": false
}
```
Status: 502

### Status Endpoint

The server provides a status method for monitoring:

```javascript
bridgeServer.getStatus();
```

Returns:
```json
{
  "bridges": 2,
  "bridgeList": [
    {
      "uniqueId": "SIP endpoint device id (e.g. 141)",
      "connect365Username": "SIP endpoint device id (e.g. 141)",
      "connectedAt": "2026-01-12T10:00:00Z",
      "registeredAt": "2026-01-12T10:00:05Z",
      "lastSeen": "2026-01-12T10:30:00Z",
      "connected": true,
      "info": { "version": "1.0.2", "kuandoConnected": true }
    }
  ],
  "unregisteredBridges": 0,
  "pendingRequests": 0,
  "clients": 1
}
```

---

## BusylightManager Class (PWA JavaScript)

The `BusylightManager` class is the PWA-side component that monitors call state and controls the Busylight device via HTTP API requests to the server.

### Initialization

```javascript
const busylightManager = new BusylightManager();
await busylightManager.initialize();
```

The manager:
1. Loads settings from localStorage
2. Checks bridge connection
3. Runs test color sequence (red → green → white)
4. Updates to current state based on SIP/call status
5. Starts connection monitoring (15-second interval)

### State Configuration

The manager defines states with their corresponding visual indicators:

```javascript
this.stateConfig = {
    'DISCONNECTED': { 
        color: null, 
        flash: false, 
        alert: false 
    },
    'CONNECTED': { 
        color: { red: 100, green: 100, blue: 100 }, 
        flash: false, 
        alert: false 
    },
    'IDLE': { 
        color: { red: 0, green: 100, blue: 0 }, 
        flash: false, 
        alert: false 
    },
    'IDLENOTIFY': { 
        color: { red: 0, green: 100, blue: 0 }, 
        flash: 'slow', 
        alert: false 
    },
    'BUSY': { 
        color: { red: 100, green: 0, blue: 0 }, 
        flash: false, 
        alert: false 
    },
    'RINGING': { 
        color: { red: 100, green: 0, blue: 0 }, 
        flash: false, 
        alert: true 
    },
    'RINGWAITING': { 
        color: { red: 100, green: 0, blue: 0 }, 
        flash: false, 
        alert: 'silent' 
    },
    'HOLD': { 
        color: { red: 100, green: 100, blue: 0 }, 
        flash: false, 
        alert: false 
    }
};
```

### Settings

Settings are stored in localStorage via `window.localDB`:

| Setting | Key | Type | Default | Description |
|---------|-----|------|---------|-------------|
| Enabled | `BusylightEnabled` | boolean | false | Enable/disable busylight |
| Alert Sound | `BusylightRingSound` | number (1-7) | 3 | Alert sound number |
| Alert Volume | `BusylightRingVolume` | number | 50 | Alert volume (0/25/50/75/100) |
| Voicemail Notify | `BusylightVoicemailNotify` | boolean | false | Enable IDLENOTIFY state |
| Active VM Notify | `activeVmNotify` | boolean | false | Has voicemail waiting |

### Methods Available

Below is a complete reference of all public methods available in the `BusylightManager` class, their parameters, usage, and outputs.

---

#### `constructor()`
Creates a new BusylightManager instance.

**Parameters**: None

**Usage**:
```javascript
const manager = new BusylightManager();
```

**Outputs**: 
- Initializes all internal properties
- Loads settings from localStorage
- Sets up state configuration

---

#### `async initialize()`
Initializes the busylight manager, checks connection, runs test sequence, and starts monitoring.

**Parameters**: None

**Returns**: `Promise<boolean>` - True if connected successfully, false otherwise

**Usage**:
```javascript
await busylightManager.initialize();
```

**Outputs**:
- Logs: `[Busylight] Initializing...`
- Logs: `[Busylight] Connected successfully` or `[Busylight] Failed initial connection`
- Sets `this.connected` to true/false
- Runs test color sequence if connected
- Updates to current state
- Starts monitoring interval

**Side Effects**:
- Attaches event listeners to SIP and line managers
- Creates monitoring interval

---

#### `async checkConnection()`
Performs a health check to verify bridge connectivity.

**Parameters**: None

**Returns**: `Promise<boolean>` - True if bridge is reachable, false otherwise

**Usage**:
```javascript
const isConnected = await busylightManager.checkConnection();
if (isConnected) {
    console.log('Bridge is online');
}
```

**Outputs**:
- Makes HTTP GET request to `/api/busylight?action=currentpresence`
- Includes `x-connect365-username` header with SIP username
- Returns true if response.ok (status 200-299)
- Returns false on error or timeout (3 seconds)

---

#### `async testConnection()`
Runs a visual test sequence to verify device functionality.

**Parameters**: None

**Returns**: `Promise<void>`

**Usage**:
```javascript
await busylightManager.testConnection();
```

**Outputs**:
- Logs: `[Busylight] Testing connection...`
- Flashes colors: Red (300ms) → Green (300ms) → White (300ms)
- Turns off device
- Logs: `[Busylight] Test completed`

**API Calls**:
```javascript
apiRequest('light', { red: 100, green: 0, blue: 0 })
apiRequest('light', { red: 0, green: 100, blue: 0 })
apiRequest('light', { red: 100, green: 100, blue: 100 })
apiRequest('off')
```

---

#### `async updateState()`
Evaluates the current system state and applies it to the device.

**Parameters**: None

**Returns**: `Promise<void>`

**Usage**:
```javascript
// Called automatically on SIP/call events
await busylightManager.updateState();
```

**Outputs**:
- Calls `evaluateState()` to determine new state
- If state changed: logs `[Busylight] State change: OLD → NEW`
- Calls `applyState(newState)`
- Updates `this.currentState`

**Example Log**:
```
[Busylight] State change: IDLE → RINGING
```

---

#### `evaluateState()`
Evaluates which state should be active based on SIP/call/agent status.

**Parameters**: None

**Returns**: `string` - State name (e.g., 'IDLE', 'BUSY', 'RINGING')

**Usage**:
```javascript
const currentState = busylightManager.evaluateState();
console.log('Current state:', currentState);
```

**Outputs**: Returns one of:
- `'DISCONNECTED'` - Not registered to SIP server
- `'CONNECTED'` - Registered but no agent logged in
- `'IDLE'` - Agent logged in, no active calls, no voicemail
- `'IDLENOTIFY'` - Agent logged in, no active calls, HAS voicemail
- `'RINGING'` - Incoming call ringing (no other active calls)
- `'RINGWAITING'` - Incoming call ringing while on another call
- `'BUSY'` - Active call on selected line
- `'HOLD'` - Active call on hold on selected line

**State Evaluation Logic**:

**Primary Scenarios** (highest priority, regardless of selected line):
1. Not registered → `DISCONNECTED`
2. Registered but agent not logged in → `CONNECTED`
3. No active calls → `IDLE` or `IDLENOTIFY` (if voicemail)
4. Has active call(s) AND incoming call → `RINGWAITING`
5. No active calls but incoming call → `RINGING`

**Secondary Scenarios** (selected line specific):
6. Selected line is ringing → `RINGING`
7. Selected line has active call → `BUSY`
8. Selected line has call on hold → `HOLD`
9. Selected line is idle → `IDLE` or `IDLENOTIFY`

---

#### `async applyState(state)`
Applies the specified state to the busylight device.

**Parameters**:
- `state` (string) - State name to apply

**Returns**: `Promise<void>`

**Usage**:
```javascript
await busylightManager.applyState('BUSY');
```

**Outputs**:

For each state, makes appropriate API calls:

| State | Action | API Call |
|-------|--------|----------|
| `DISCONNECTED` | Turn off | `apiRequest('off')` |
| `CONNECTED` | White solid | `apiRequest('light', {red:100, green:100, blue:100})` |
| `IDLE` | Green solid | `apiRequest('light', {red:0, green:100, blue:0})` |
| `IDLENOTIFY` | Green slow flash | `startSlowFlash({red:0, green:100, blue:0})` |
| `BUSY` | Red solid | `apiRequest('light', {red:100, green:0, blue:0})` |
| `RINGING` | Red alert with sound | `apiRequest('alert', {red:100, green:0, blue:0, sound:3, volume:50})` |
| `RINGWAITING` | Red alert silent | `apiRequest('alert', {red:100, green:0, blue:0, sound:3, volume:0})` |
| `HOLD` | Yellow solid | `apiRequest('light', {red:100, green:100, blue:0})` |

**Side Effects**:
- Stops any active slow flash
- Starts slow flash for IDLENOTIFY state

---

#### `startSlowFlash(color)`
Starts a slow flashing pattern (1000ms ON / 1000ms OFF).

**Parameters**:
- `color` (object) - Color definition `{ red, green, blue }`

**Returns**: `void`

**Usage**:
```javascript
busylightManager.startSlowFlash({ red: 0, green: 100, blue: 0 });
```

**Outputs**:
- Logs: `[Busylight] Starting slow flash (1000ms ON/OFF)`
- Sets `this.isSlowFlashing = true`
- Creates interval at `this.slowFlashInterval`
- Alternates between `apiRequest('light', color)` and `apiRequest('off')` every 1000ms

**Side Effects**:
- Creates interval that runs until stopped or disabled

---

#### `stopSlowFlash()`
Stops the slow flashing pattern.

**Parameters**: None

**Returns**: `void`

**Usage**:
```javascript
busylightManager.stopSlowFlash();
```

**Outputs**:
- Clears interval at `this.slowFlashInterval`
- Sets `this.isSlowFlashing = false`

---

#### `async apiRequest(action, params = {})`
Makes an HTTP API request to the bridge.

**Parameters**:
- `action` (string) - API action name
- `params` (object) - Action parameters (optional)

**Returns**: `Promise<boolean>` - True if successful, false otherwise

**Usage**:
```javascript
// Turn on red light
await busylightManager.apiRequest('light', { 
    red: 100, 
    green: 0, 
    blue: 0 
});

// Turn off
await busylightManager.apiRequest('off');

// Play alert
await busylightManager.apiRequest('alert', { 
    red: 100, 
    green: 0, 
    blue: 0,
    sound: 3,
    volume: 50
});
```

**Outputs**:
- Builds URL: `/api/busylight?action={action}&bridgeId={username}&{params}`
- Adds header: `x-connect365-username: {username}`
- Makes HTTP GET request with 2-second timeout
- Returns true if status 200-299
- Returns false and logs error on failure
- Resets `retryAttempts` to 0 on success

**Example URL**:
```
/api/busylight?action=light&bridgeId=john.doe&red=100&green=0&blue=0
```

---

#### `buildApiUrl(action, params = {})`
Constructs the API URL with query parameters.

**Parameters**:
- `action` (string) - API action name
- `params` (object) - Additional query parameters

**Returns**: `string` - Complete URL with query string

**Usage**:
```javascript
const url = busylightManager.buildApiUrl('light', { 
    red: 100, 
    green: 0, 
    blue: 0 
});
console.log(url);
// Output: /api/busylight?action=light&bridgeId=john.doe&red=100&green=0&blue=0
```

**Outputs**:
- Base: `/api/busylight`
- Adds: `action={action}`
- Adds: `bridgeId={username}` (if available)
- Adds: All parameters from `params` object

---

#### `getSipUsername()`
Gets the SIP username for bridge routing (cached).

**Parameters**: None

**Returns**: `string|null` - SIP username or null if not available

**Usage**:
```javascript
const username = busylightManager.getSipUsername();
console.log('Username:', username);
// Output: SIP endpoint device id (e.g. 141)
```

**Outputs**:
- Returns cached value if already retrieved
- Looks up from `window.localDB.getItem('SipUsername')`
- Falls back to `window.App.settings.SipUsername`
- Caches result (including null) to avoid repeated lookups
- Returns null and caches if not found

**Caching**:
- `this._cachedSipUsername` - Cached value
- `this._sipUsernameCached` - Whether cache is valid

---

#### `invalidateSipUsernameCache()`
Clears the cached SIP username.

**Parameters**: None

**Returns**: `void`

**Usage**:
```javascript
// Call when user changes SIP username
busylightManager.invalidateSipUsernameCache();
```

**Outputs**:
- Sets `this._sipUsernameCached = false`
- Sets `this._cachedSipUsername = null`

---

#### `buildRequestHeaders()`
Builds HTTP headers for API requests.

**Parameters**: None

**Returns**: `object` - Headers object

**Usage**:
```javascript
const headers = busylightManager.buildRequestHeaders();
// Output: { 'x-connect365-username': 'SIP endpoint device id (e.g. 141)' }
```

**Outputs**:
- Returns object with `x-connect365-username` header if username available
- Returns empty object if no username

---

#### `startMonitoring()`
Starts periodic connection monitoring.

**Parameters**: None

**Returns**: `void`

**Usage**:
```javascript
busylightManager.startMonitoring();
```

**Outputs**:
- Logs: `[Busylight] Starting monitoring (15000ms)`
- Creates interval at `this.monitoringInterval`
- Runs every 15 seconds (configurable via `this.monitoringIntervalMs`)
- Checks connection via `checkConnection()`
- Updates `this.connected` status
- Shows notification on reconnection
- Shows error toast on disconnection
- Automatically stops if disabled

**Side Effects**:
- Creates persistent interval until stopped

---

#### `stopMonitoring()`
Stops connection monitoring.

**Parameters**: None

**Returns**: `void`

**Usage**:
```javascript
busylightManager.stopMonitoring();
```

**Outputs**:
- Clears interval at `this.monitoringInterval`
- Sets `this.monitoringInterval = null`

---

#### `async disconnect()`
Disconnects and cleans up resources.

**Parameters**: None

**Returns**: `Promise<void>`

**Usage**:
```javascript
await busylightManager.disconnect();
```

**Outputs**:
- Logs: `[Busylight] Disconnecting...`
- Calls `stopMonitoring()`
- Calls `stopSlowFlash()`
- Turns off device if connected: `apiRequest('off')`
- Sets `this.connected = false`
- Resets `this.retryAttempts = 0`

---

#### `async setEnabled(enabled)`
Enables or disables the busylight functionality.

**Parameters**:
- `enabled` (boolean) - True to enable, false to disable

**Returns**: `Promise<void>`

**Usage**:
```javascript
// Enable
await busylightManager.setEnabled(true);

// Disable
await busylightManager.setEnabled(false);
```

**Outputs**:

**When Enabling**:
- Logs: `[Busylight] Enabling from settings...`
- Checks connection
- If connected:
  - Runs test sequence
  - Updates to current state
  - Starts monitoring
- If not connected:
  - Logs warning
  - Starts monitoring (will retry)

**When Disabling**:
- Logs: `[Busylight] Disabling from settings...`
- Logs: `[Busylight] Turning off device...`
- Turns off device
- Calls `disconnect()`

**Side Effects**:
- Saves enabled state to localStorage
- Updates `this.enabled`

---

#### `async onVoicemailUpdate(count)`
Updates voicemail notification status.

**Parameters**:
- `count` (number) - Number of voicemail messages

**Returns**: `Promise<void>`

**Usage**:
```javascript
// User has 3 voicemails
await busylightManager.onVoicemailUpdate(3);

// User has no voicemails
await busylightManager.onVoicemailUpdate(0);
```

**Outputs**:
- Sets `this.hasVoicemail = (count > 0)`
- Saves to localStorage via `setVoicemailState()`
- Logs: `[Busylight] Voicemail status: has voicemail` or `no voicemail`
- Calls `updateState()` if status changed

**Side Effects**:
- May trigger state change from IDLE to IDLENOTIFY or vice versa

---

#### `updateAlertSettings(alertNumber, alertVolume)`
Updates alert sound and volume settings.

**Parameters**:
- `alertNumber` (number) - Alert sound number (1-7)
- `alertVolume` (number) - Alert volume (0, 25, 50, 75, 100)

**Returns**: `void`

**Usage**:
```javascript
// Set alert to sound #3 at volume 50
busylightManager.updateAlertSettings(3, 50);
```

**Outputs**:
- Sets `this.alertNumber = alertNumber`
- Sets `this.alertVolume = alertVolume`
- Saves to localStorage via `saveSettings()`
- Logs: `[Busylight] Alert settings updated: Number=3, Volume=50`

---

#### `getStatus()`
Gets the current status of the busylight manager.

**Parameters**: None

**Returns**: `object` - Status object with all current settings and state

**Usage**:
```javascript
const status = busylightManager.getStatus();
console.log(status);
```

**Outputs**:
```javascript
{
    enabled: true,
    connected: true,
    state: 'BUSY',
    hasVoicemail: false,
    voicemailNotifyEnabled: true,
    isSlowFlashing: false,
    alertNumber: 3,
    alertVolume: 50,
    username: 'SIP endpoint device id (e.g. 141)'
}
```

---

#### `loadSettings()`
Loads settings from localStorage.

**Parameters**: None

**Returns**: `void`

**Usage**:
```javascript
busylightManager.loadSettings();
```

**Outputs**:
- Loads `BusylightEnabled` → `this.enabled`
- Loads `BusylightRingSound` → `this.alertNumber`
- Loads `BusylightRingVolume` → `this.alertVolume`
- Loads `BusylightVoicemailNotify` → `this.voicemailNotifyEnabled`
- Logs: `[Busylight] Settings loaded: { ... }`

---

#### `saveSettings()`
Saves settings to localStorage.

**Parameters**: None

**Returns**: `void`

**Usage**:
```javascript
busylightManager.saveSettings();
```

**Outputs**:
- Saves `this.enabled` → `BusylightEnabled`
- Saves `this.alertNumber` → `BusylightRingSound`
- Saves `this.alertVolume` → `BusylightRingVolume`

---

#### `getVoicemailState()`
Gets voicemail notification state from localStorage.

**Parameters**: None

**Returns**: `boolean` - True if has voicemail, false otherwise

**Usage**:
```javascript
const hasVoicemail = busylightManager.getVoicemailState();
```

**Outputs**:
- Returns `true` if `activeVmNotify` is `'1'`
- Returns `false` otherwise

---

#### `setVoicemailState(hasVoicemail)`
Saves voicemail notification state to localStorage.

**Parameters**:
- `hasVoicemail` (boolean) - Whether user has voicemail

**Returns**: `void`

**Usage**:
```javascript
busylightManager.setVoicemailState(true);
```

**Outputs**:
- Saves `'1'` to `activeVmNotify` if true
- Saves `'0'` to `activeVmNotify` if false

---

#### `shouldUseIdleNotify()`
Determines if IDLENOTIFY state should be used instead of IDLE.

**Parameters**: None

**Returns**: `boolean` - True if IDLENOTIFY should be used

**Usage**:
```javascript
if (busylightManager.shouldUseIdleNotify()) {
    console.log('Show voicemail notification');
}
```

**Outputs**:
- Returns `true` if:
  - `this.voicemailNotifyEnabled` is true AND
  - `this.hasVoicemail` is true
- Returns `false` otherwise

---

#### `setupEventListeners()`
Sets up event listeners for SIP and call events.

**Parameters**: None

**Returns**: `void`

**Usage**:
```javascript
// Called automatically during initialize()
busylightManager.setupEventListeners();
```

**Outputs**:
- Logs: `[Busylight] Setting up event listeners...`
- Waits for managers to be available
- Calls `attachListeners()` when ready

---

#### `attachListeners()`
Attaches event listeners to SIP and line managers.

**Parameters**: None

**Returns**: `void`

**Usage**:
```javascript
// Called automatically after managers initialize
busylightManager.attachListeners();
```

**Outputs**:
- Logs: `[Busylight] Attaching event listeners`
- Attaches listeners for:
  - `registered` → `updateState()`
  - `unregistered` → `updateState()`
  - `registrationFailed` → `updateState()`
  - `incomingCall` → `updateState()`
  - `sessionAnswered` → `updateState()`
  - `sessionEstablished` → `updateState()`
  - `sessionTerminated` → `updateState()`
  - `sessionHeld` → `updateState()`
  - `lineStateChanged` → `updateState()` (if lineKeyManager available)
  - `lineChanged` → `updateState()` (if lineKeyManager available)

---

#### `sleep(ms)`
Helper for creating delays.

**Parameters**:
- `ms` (number) - Milliseconds to sleep

**Returns**: `Promise<void>` - Resolves after specified time

**Usage**:
```javascript
await busylightManager.sleep(1000); // Wait 1 second
```

**Outputs**:
- Creates Promise that resolves after `ms` milliseconds

---

### Debug Functions

Two global debug functions are available in the browser console:

#### `window.testBusylight()`
Displays current busylight status in console.

**Usage**:
```javascript
testBusylight();
```

**Output Example**:
```
🔍 Busylight Status
  Enabled: true
  Connected: true
  State: BUSY
  Has Voicemail: false
  Voicemail Notify Enabled: true
  Slow Flashing: false
  Alert Number: 3
  Alert Volume: 50
  Username: SIP endpoint device id (e.g. 141)
  Connection Test: ✅ Connected
```

---

## Communication Flow

### Complete Request Flow

1. **PWA Detects State Change**
   - User answers call → SIP manager fires `sessionAnswered` event
   - BusylightManager's event listener calls `updateState()`

2. **State Evaluation**
   - `evaluateState()` checks all conditions
   - Determines new state is `BUSY`

3. **State Application**
   - `applyState('BUSY')` called
   - Looks up state config: `{ color: { red: 100, green: 0, blue: 0 }, flash: false, alert: false }`
   - Calls `apiRequest('light', { red: 100, green: 0, blue: 0 })`

4. **API Request Construction**
   - `buildApiUrl()` creates: `/api/busylight?action=light&bridgeId=john.doe&red=100&green=0&blue=0`
   - `buildRequestHeaders()` adds: `{ 'x-connect365-username': 'SIP endpoint device id (e.g. 141)' }`
   - Makes HTTP GET request

5. **Server Receives Request**
   - Express middleware at `/api/busylight` handles request
   - Extracts `targetUser` from header: `'SIP endpoint device id (e.g. 141)'`
   - Finds bridge in `this.bridges.get('SIP endpoint device id (e.g. 141)')`
   - Generates `requestId`: `'a1b2c3d4e5f6...'`

6. **Server Sends to Bridge**
   - Creates pending request Promise
   - Sends WebSocket message to bridge:
   ```json
   {
     "type": "api_request",
     "requestId": "a1b2c3d4e5f6...",
     "action": "light",
     "params": { "red": "100", "green": "0", "blue": "0" },
     "targetUser": "SIP endpoint device id (e.g. 141)"
   }
   ```

7. **Bridge Processes Request**
   - `RemoteServerClient` receives message
   - Validates `targetUser` matches local username
   - Forwards to `LocalServer`
   - `LocalServer` proxies to Kuando Hub:
   ```
   GET http://localhost:8989?action=light&red=100&green=0&blue=0
   ```

8. **Kuando Hub Controls Device**
   - Kuando Hub receives request
   - Communicates with USB Busylight device
   - Sets LED to red color
   - Returns response: `{ "status": "ok" }`

9. **Bridge Responds**
   - `LocalServer` receives Kuando Hub response
   - `RemoteServerClient` sends response via WebSocket:
   ```json
   {
     "type": "api_response",
     "requestId": "a1b2c3d4e5f6...",
     "success": true,
     "data": { "status": "ok", "action": "light" }
   }
   ```

10. **Server Receives Response**
    - Matches `requestId` to pending request
    - Clears timeout
    - Resolves Promise with response data
    - Removes from `pendingRequests` map

11. **Server Responds to PWA**
    - HTTP middleware receives resolved Promise
    - Sends HTTP response:
    ```json
    { "success": true, "status": "ok", "action": "light" }
    ```

12. **PWA Receives Response**
    - `apiRequest()` receives response
    - Returns `true` (success)
    - Logs completion

**Total Round-Trip Time**: Typically 50-200ms

---

## State Management

### State Priority Rules

The `evaluateState()` method implements a priority-based state evaluation system:

#### Primary Scenarios (Highest Priority)

These scenarios apply regardless of which line is selected:

1. **DISCONNECTED** - Not registered to SIP server
   - Condition: `!sipManager.isRegistered()`
   - Visual: Device OFF
   - Priority: Highest

2. **CONNECTED** - Registered but agent not logged in
   - Condition: `isRegistered && !agentManager.isLoggedIn`
   - Visual: White solid light
   - Priority: 2nd

3. **IDLE / IDLENOTIFY** - No active calls
   - Condition: `activeLines.length === 0`
   - Visual: Green solid or Green slow flash (if voicemail)
   - Priority: 3rd

4. **RINGWAITING** - Incoming call while on other call(s)
   - Condition: `activeLinesNotRinging.length > 0 && ringingLines.length > 0`
   - Visual: Red alert (silent - volume 0)
   - Priority: 4th
   - Purpose: Alert user to waiting call without disrupting current call

5. **RINGING** - Incoming call, no other active calls
   - Condition: `activeLinesNotRinging.length === 0 && ringingLines.length > 0`
   - Visual: Red alert with sound
   - Priority: 5th

#### Secondary Scenarios (Selected Line)

If primary scenarios don't match, check the currently selected line:

6. **RINGING** - Selected line is ringing
   - Condition: `selectedLineState.state === 'ringing'`
   - Visual: Red alert with sound

7. **BUSY** - Selected line has active call
   - Condition: `selectedLineState.state === 'active'`
   - Visual: Red solid light

8. **HOLD** - Selected line has call on hold
   - Condition: `selectedLineState.state === 'hold'`
   - Visual: Yellow solid light

9. **IDLE / IDLENOTIFY** - Selected line is idle
   - Condition: `selectedLineState.state === 'idle'`
   - Visual: Green solid or Green slow flash (if voicemail)

### Voicemail Notification

The IDLENOTIFY state provides visual indication of waiting voicemail:

- **Condition**: `voicemailNotifyEnabled` is true AND `hasVoicemail` is true
- **Visual**: Green slow flash (1000ms ON / 1000ms OFF)
- **Purpose**: Alert user to voicemail without being intrusive

The voicemail state is:
- Persisted to localStorage: `activeVmNotify` ('0' or '1')
- Updated via `onVoicemailUpdate(count)` method
- Checked via `shouldUseIdleNotify()` method

### State Change Detection

State changes are detected automatically:

- SIP events: registration, calls, hold
- Line key events: line state changes, line selection
- Agent events: login/logout
- Voicemail events: count updates

Every event triggers `updateState()`, which:
1. Calls `evaluateState()` to determine new state
2. Compares to `currentState`
3. If different, calls `applyState(newState)`
4. Logs state change

---

## Installation and Deployment

### Prerequisites

**Desktop Bridge**:
- Windows 10/11 (64-bit)
- .NET 8.0 Runtime
- Kuando Hub or Kuando HTTP Service installed
- Busylight device connected via USB

**Server**:
- Node.js 18+ with Express.js
- WebSocket library (`ws`)
- SSL certificate for WSS (recommended)

**PWA**:
- Modern browser with fetch API support
- localStorage enabled

### Bridge Deployment

1. **Build the Bridge**:
   ```bash
   cd busylight-bridge
   .\build.ps1
   ```
   Output: `busylight-bridge/BusylightBridge/bin/Release/net8.0-windows/publish/`

2. **Create Installer** (Optional):
   ```bash
   cd installer
   makensis installer.nsi
   ```
   Output: `BusylightBridgeSetup.exe`

3. **Manual Installation**:
   - Copy publish folder to: `C:\Program Files\Connect365\BusylightBridge\`
   - Create shortcut in Start Menu
   - Run `BusylightBridge.exe`

4. **Configure Bridge**:
   - Right-click tray icon → Settings
   - Enter server URL (e.g., `server1-{phantomID}.phantomapi.net`)
   - Enter Connect365 username (e.g., `SIP endpoint device id (e.g. 141)`)
   - Enable auto-start (optional)
   - Click Save

### Server Deployment

1. **Install Dependencies**:
   ```bash
   npm install ws
   ```

2. **Integrate Bridge Server**:
   ```javascript
   // In server.js
   const BusylightBridgeServer = require('./bridge-server.js');
   const bridgeServer = new BusylightBridgeServer();

   // Create WebSocket server
   const wss = new WebSocket.Server({ 
       server: httpsServer, // Or httpServer
       path: '/ws'
   });

   wss.on('connection', (ws, req) => {
       const connectionId = crypto.randomBytes(16).toString('hex');
       bridgeServer.registerBridge(ws, connectionId);
   });

   // Add HTTP middleware
   app.use('/api/busylight', bridgeServer.createHttpMiddleware());
   ```

3. **Start Server**:
   ```bash
   node server.js
   ```

### PWA Deployment

1. **Include Manager**:
   ```html
   <script src="js/busylight-manager.js"></script>
   ```

2. **Initialize in App**:
   ```javascript
   // In app-startup.js or main app initialization
   const busylightManager = new BusylightManager();

   // Initialize when app is ready
   document.addEventListener('DOMContentLoaded', async () => {
       await busylightManager.initialize();
       
       // Store reference for global access
       window.App.managers.busylight = busylightManager;
   });
   ```

3. **Settings Integration**:
   ```javascript
   // Enable/disable busylight
   $('#busylight-enabled-checkbox').on('change', async function() {
       const enabled = $(this).is(':checked');
       await busylightManager.setEnabled(enabled);
   });

   // Alert settings
   $('#busylight-alert-number').on('change', function() {
       const alertNumber = parseInt($(this).val());
       const alertVolume = parseInt($('#busylight-alert-volume').val());
       busylightManager.updateAlertSettings(alertNumber, alertVolume);
   });
   ```

4. **Voicemail Integration**:
   ```javascript
   // When voicemail count updates
   function onVoicemailCountUpdate(count) {
       if (window.App?.managers?.busylight) {
           window.App.managers.busylight.onVoicemailUpdate(count);
       }
   }
   ```

### Verification

**Test Bridge Connection**:
1. Check tray icon shows green status
2. Open browser console
3. Run: `testBusylight()`
4. Verify output shows "Connected: true"

**Test State Changes**:
1. Make test call
2. Observe busylight turns red
3. Put call on hold
4. Observe busylight turns yellow
5. End call
6. Observe busylight returns to green

**Test Multi-User**:
1. Deploy multiple bridges with different usernames
2. Check server logs show multiple registered bridges
3. Make API request with specific bridgeId
4. Verify correct bridge receives request

---

## Troubleshooting

### Common Issues

**Bridge Shows "Not Connected to Server"**:
- Check server URL is correct
- Verify firewall allows outbound WSS/WS connections
- Check server WebSocket is running
- Try toggling between WSS (8089) and WS (8088)

**Bridge Shows "Kuando Not Connected"**:
- Verify Kuando Hub or HTTP Service is running
- Check Busylight device is plugged in
- Open http://localhost:8989?action=busylightdevices in browser
- Should show device list

**PWA Shows "Bridge Not Found"**:
- Verify Connect365 username matches bridge registration
- Check `bridgeId` parameter in API requests
- Inspect `x-connect365-username` header
- Check server logs for available bridges

**Busylight Doesn't Change**:
- Check busylight is enabled in PWA settings
- Run `testBusylight()` in console to verify connection
- Check browser console for API errors
- Verify SIP manager is firing events correctly

### Debug Commands

**Browser Console**:
```javascript
// Check status
testBusylight()

// Get detailed status
window.App.managers.busylight.getStatus()

// Force state update
await window.App.managers.busylight.updateState()

// Test connection
await window.App.managers.busylight.checkConnection()

// Test device
await window.App.managers.busylight.testConnection()

// Manual API request
await window.App.managers.busylight.apiRequest('light', {red:100, green:0, blue:0})
```

**Server Monitoring**:
```javascript
// Get bridge status (add endpoint in server.js)
app.get('/api/busylight/status', (req, res) => {
    res.json(bridgeServer.getStatus());
});
```

**Bridge Logs**:
- Logs are shown in application (accessible from tray menu → About)
- Check for WebSocket connection errors
- Check for Kuando Hub communication errors

---

## Development Notes

### Future Enhancements

**Potential improvements for future development**:

1. **Multi-Device Support**
   - Support multiple Busylight devices per user
   - Per-line device assignment
   - Device priority/fallback

2. **Custom State Configuration**
   - User-defined colors for each state
   - Configurable flash patterns
   - Custom sound mappings

3. **Advanced Alerting**
   - Different alerts for internal vs external calls
   - VIP caller alerts
   - Queue-specific alerts

4. **Analytics**
   - Track device usage
   - Monitor connection reliability
   - State duration metrics

5. **Alternative Devices**
   - Support for other presence devices
   - Generic USB HID device support
   - RGB LED control

6. **Cloud Bridge**
   - Browser-based WebUSB support (Chrome/Edge)
   - Eliminate need for desktop application
   - Direct device control from PWA

### API Extensions

To add new actions:

1. **Define action in bridge** (`LocalServer.cs`):
   ```csharp
   if (action == "newaction") {
       var result = await ForwardToKuandoAsync("newaction", params);
       return result;
   }
   ```

2. **Add to bridge-server** (no changes needed - passes through)

3. **Add method in BusylightManager**:
   ```javascript
   async performNewAction(param1, param2) {
       return await this.apiRequest('newaction', { param1, param2 });
   }
   ```

4. **Document in this file**

### Security Considerations

**Current Implementation**:
- No authentication on bridge WebSocket connection
- Username-based routing relies on header/parameter
- Local Kuando Hub has no authentication

**Recommendations for Production**:
- Add authentication tokens to bridge registration
- Implement JWT or API key for PWA requests
- Encrypt sensitive data in bridge configuration
- Use WSS (secure WebSocket) in production
- Implement rate limiting on API endpoints

---

## Conclusion

The Connect365 Busylight integration provides a robust, scalable solution for synchronizing physical presence devices with telephony state. The three-component architecture (Bridge, Server, Manager) enables:

- **Firewall-friendly**: Reverse connection model
- **Multi-user**: Username-based routing
- **Reliable**: Automatic reconnection and error handling
- **Extensible**: Clean API for future enhancements
- **User-friendly**: System tray application, minimal configuration

For questions or support, contact me on teams (james frayne) or refer to additional documentation in the repository (isn't this a tablet you put up your bum - here all week).

---

**Document Version**: 1.0  
**Last Updated**: January 12, 2026  
**Maintained By**: Currently No-One
