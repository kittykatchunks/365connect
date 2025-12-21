# Busylight Bridge

A lightweight Electron system tray application that bridges web-hosted PWAs to locally connected Kuando Busylight devices, bypassing CORS restrictions.

## Why This Exists

Web browsers enforce CORS (Cross-Origin Resource Sharing) restrictions that prevent web pages from making requests to `localhost` services on different ports. This means a PWA hosted at `https://yourapp.com` cannot directly communicate with the Kuando HTTP service running at `http://localhost:8989`.

This bridge runs locally and provides:
- CORS-enabled HTTP endpoints
- WebSocket support for real-time updates
- System tray integration with status indicators
- Auto-start with Windows option

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Web Browser                                                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  PWA (https://connect365.servehttp.com)                   │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  BusylightManager                                   │  │  │
│  │  │  - Connects to ws://127.0.0.1:19774/ws              │  │  │
│  │  │  - Falls back to http://127.0.0.1:19774/kuando      │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Busylight Bridge (System Tray App)                             │
│  http://127.0.0.1:19774                                         │
│  - Adds CORS headers                                            │
│  - Provides WebSocket server                                    │
│  - Forwards requests to Kuando HTTP                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Kuando HTTP / kuandoHUB                                        │
│  http://127.0.0.1:8989                                          │
│  - Controls physical Busylight device                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Kuando Busylight (USB)                                         │
│  - Omega, Alpha, etc.                                           │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **Kuando Busylight** device connected via USB
2. **kuandoHUB** or **Kuando HTTP** software installed and running
   - Download from: https://www.plenom.com/support/download/
   - The HTTP service should be running on port 8989

## Installation

### Option 1: Download Installer (Recommended)
Download the latest installer from the releases page and run it.

### Option 2: Build from Source

```bash
# Clone or download this folder
cd busylight-bridge

# Install dependencies
npm install

# Create icon files
node create-icons.js

# Run in development mode
npm run dev

# Build installer
npm run build:installer

# Build portable exe
npm run build:portable
```

## API Reference

### HTTP Endpoints

All endpoints are served from `http://127.0.0.1:19774`

#### Health Check
```
GET /health
```
Returns bridge and Kuando Hub status.

#### Kuando Proxy (Compatible with Kuando HTTP API)
```
GET /kuando?action=<action>&param1=value1&param2=value2
```

Supported actions:
- `currentpresence` - Get current presence status
- `busylightdevices` - List connected devices
- `light&red=0&green=100&blue=0` - Set solid color (0-100 scale)
- `off` - Turn off light
- `alert&red=100&green=0&blue=0&sound=1` - Set flashing with optional sound

#### REST Endpoints
```
GET  /api/devices          - List connected devices
GET  /api/status           - Get current status
POST /api/light            - Set color: { red, green, blue }
POST /api/off              - Turn off light
POST /api/alert            - Set alert: { red, green, blue, sound }
```

### WebSocket

Connect to `ws://127.0.0.1:19774/ws`

#### Send Commands
```json
{ "action": "light", "red": 100, "green": 0, "blue": 0 }
{ "action": "off" }
{ "action": "ringing", "sound": true }
{ "action": "busy" }
{ "action": "available" }
{ "action": "hold" }
{ "action": "devices" }
{ "action": "status" }
```

#### Receive Messages
```json
{ "type": "connected", "clientId": "abc123", "kuandoHub": true }
{ "type": "response", "action": "light", "success": true }
{ "type": "kuandoStatus", "connected": false }
{ "type": "error", "error": "message" }
```

## Configuration

Configuration is stored in:
- Windows: `%APPDATA%/busylight-bridge/config.json`

Default configuration:
```json
{
    "bridgePort": 19774,
    "kuandoHubUrl": "http://127.0.0.1:8989",
    "autoStart": true,
    "minimizeToTray": true,
    "showNotifications": true
}
```

## PWA Integration

Update your BusylightManager to connect through the bridge instead of directly to Kuando HTTP:

```javascript
// Change from:
this.baseUrl = "http://localhost:8989";

// To:
this.baseUrl = "http://localhost:19774/kuando";
```

Or use the WebSocket connection for better real-time performance.

## Troubleshooting

### Bridge shows "Disconnected"
1. Ensure kuandoHUB or Kuando HTTP is installed and running
2. Check that it's listening on port 8989
3. Verify Busylight device is connected and recognized

### PWA cannot connect to bridge
1. Check that Busylight Bridge is running (look for tray icon)
2. Ensure no firewall is blocking port 19774
3. Check browser console for CORS errors

### Multiple instances
The app uses a single-instance lock. If you try to start a second instance, it will focus the first one instead.

## Building for Distribution

```bash
# Build Windows installer
npm run build:installer

# Build portable executable
npm run build:portable
```

Output files will be in the `dist/` folder.

## License

MIT
