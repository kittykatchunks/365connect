# Debug Utilities Usage Guide

## Overview
The React application now includes comprehensive diagnostic utilities matching the PWA version's debugging capabilities. These tools help troubleshoot SIP/WebRTC connection issues.

## Quick Access (Development Mode)

In the browser console, debug utilities are available via `window.__debug`:

```javascript
// Run full WebRTC diagnostics
await window.__debug.diagnoseWebRTC()

// Display SIP configuration
window.__debug.debugSipConfig()

// Test server connectivity
await window.__debug.testServerConnectivity()

// Get configuration object
window.__debug.getSipConfig()

// Check WebRTC support
window.__debug.validateWebRTC()
```

## Detailed Function Reference

### 1. `diagnoseWebRTCConnection()`

**Purpose:** Comprehensive WebRTC connection diagnostics

**Returns:** `Promise<DiagnosticReport>`

**What it tests:**
- ✅ WebRTC support (getUserMedia, RTCPeerConnection, WebSocket)
- ✅ SIP configuration validation
- ✅ WebSocket connection to SIP server
- ✅ Media device access (microphone)
- ✅ ICE server connectivity (STUN servers)

**Example output:**
```javascript
await window.__debug.diagnoseWebRTC()

// Console output:
=== WebRTC Connection Diagnostics ===
WebRTC Support: {
  hasGetUserMedia: true,
  hasRTCPeerConnection: true,
  hasWebSocket: true,
  hasMediaDevices: true,
  browserInfo: "Mozilla/5.0..."
}
SIP Configuration: {
  server: "wss://server1-388.phantomapi.net:8089/ws",
  domain: "server1-388.phantomapi.net",
  username: "1234",
  hasPassword: true,
  authConfigured: true
}
✅ SIP WebSocket connection test: SUCCESS
✅ Media access test: SUCCESS
✅ ICE candidate gathered: candidate:...
=== Diagnostic Report Complete ===
```

### 2. `debugSipConfiguration()`

**Purpose:** Display current SIP configuration in console

**Returns:** `SipConfiguration` object

**What it shows:**
- Phantom ID
- Server URL
- Domain
- Username (visible)
- Password (hidden, shows "*** (set)" if configured)
- Authentication status
- Debug settings (SIP messages, verbose logging)

**Example output:**
```javascript
window.__debug.debugSipConfig()

// Console output:
=== SIP Configuration Debug ===
┌──────────────────┬───────────────────────────────────┐
│ Phantom ID       │ 388                               │
│ Server           │ wss://server1-388.phantomapi.net:8089/ws │
│ Domain           │ server1-388.phantomapi.net        │
│ Username         │ 1234                              │
│ Password         │ *** (set)                         │
│ Auth Configured  │ ✅                                 │
│ SIP Messages     │ ✅                                 │
│ Verbose Logging  │ ✅                                 │
└──────────────────┴───────────────────────────────────┘
✅ SIP server URL looks correct
=== End Configuration Debug ===
```

**Validation checks:**
- ❌ Detects if server points to localhost/development servers
- ✅ Confirms configuration completeness

### 3. `testServerConnectivity()`

**Purpose:** Test WebSocket connection to configured SIP server

**Returns:** `Promise<WebSocketTestResult>`

**What it tests:**
- WebSocket connection establishment
- SIP protocol negotiation
- Connection timeout (10 seconds)

**Example output:**
```javascript
await window.__debug.testServerConnectivity()

// Console output:
🔍 Testing SIP server connectivity...
Testing connection to: wss://server1-388.phantomapi.net:8089/ws
✅ SIP WebSocket connection test: SUCCESS
Protocol negotiated: sip

// Returns:
{
  success: true,
  protocol: "sip",
  serverUrl: "wss://server1-388.phantomapi.net:8089/ws"
}
```

### 4. `getSipConfig()`

**Purpose:** Get SIP configuration as a JavaScript object

**Returns:** `SipConfiguration` object

**Use case:** Programmatic access to configuration without console logging

**Example:**
```javascript
const config = window.__debug.getSipConfig()

console.log(config.username)  // "1234"
console.log(config.hasPassword)  // true
console.log(config.authConfigured)  // true
```

### 5. `validateWebRTC()`

**Purpose:** Check browser WebRTC support

**Returns:** `WebRTCSupport` object

**What it checks:**
- `getUserMedia` API availability
- `RTCPeerConnection` support
- `WebSocket` support
- `mediaDevices` API availability
- Browser user agent string

**Example:**
```javascript
window.__debug.validateWebRTC()

// Returns:
{
  hasGetUserMedia: true,
  hasRTCPeerConnection: true,
  hasWebSocket: true,
  hasMediaDevices: true,
  browserInfo: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)..."
}
```

## Using in Code

### Import utilities in TypeScript/React:

```typescript
import { 
  diagnoseWebRTCConnection,
  debugSipConfiguration,
  testServerConnectivity,
  isSipMessagesEnabled,
  isVerboseLoggingEnabled 
} from '@/utils';

// In a component or service
const runDiagnostics = async () => {
  const report = await diagnoseWebRTCConnection();
  console.log('Diagnostic report:', report);
};

// Check logging settings
const sipLogging = isSipMessagesEnabled();
const verboseLogging = isVerboseLoggingEnabled();

if (verboseLogging) {
  console.log('[Component] Debug info:', data);
}
```

### Helper Functions

#### `isVerboseLoggingEnabled(): boolean`
Checks if verbose logging is enabled in settings.

```typescript
import { isVerboseLoggingEnabled } from '@/utils';

const verboseLogging = isVerboseLoggingEnabled();
if (verboseLogging) {
  console.log('[MyComponent] Detailed debug info');
}
```

#### `isSipMessagesEnabled(): boolean`
Checks if SIP message logging is enabled in settings.

```typescript
import { isSipMessagesEnabled } from '@/utils';

const sipLogging = isSipMessagesEnabled();
if (sipLogging) {
  console.log('[SIP] Protocol-level debug info');
}
```

## Troubleshooting Common Issues

### Issue: "No server configured"

**Run:**
```javascript
window.__debug.debugSipConfig()
```

**Fix:** Configure Phantom ID or server URL in Settings → Connection

---

### Issue: "WebSocket connection failed"

**Run:**
```javascript
await window.__debug.testServerConnectivity()
```

**Check:**
- Server URL format: `wss://server1-XXX.phantomapi.net:8089/ws`
- Firewall/proxy blocking WebSocket connections
- Server is online and accessible

---

### Issue: "Media access denied"

**Run:**
```javascript
await window.__debug.diagnoseWebRTC()
```

**Check:**
- Browser permissions (microphone access)
- HTTPS required for getUserMedia
- No other application using the microphone

---

### Issue: "ICE candidates not gathering"

**Run:**
```javascript
await window.__debug.diagnoseWebRTC()
```

**Check:**
- Network connectivity
- Firewall blocking STUN/TURN traffic
- VPN/proxy interfering with ICE

---

## Production vs Development

### Development Mode
- Full debug utilities exposed on `window.__debug`
- Verbose logging available
- SIP message logging available

### Production Mode
- Debug utilities NOT exposed to window
- Functions still importable in code
- Logging controlled by user settings

## TypeScript Types

All diagnostic functions are fully typed:

```typescript
interface DiagnosticReport {
  webrtcSupport: WebRTCSupport;
  sipConfiguration: SipConfiguration;
  websocketTest?: WebSocketTestResult;
  mediaTest?: MediaTestResult;
  iceTest?: IceTestResult;
}

interface SipConfiguration {
  phantomId?: string;
  server?: string;
  domain?: string;
  username?: string;
  hasPassword: boolean;
  sipMessagesEnabled: boolean;
  verboseLogging: boolean;
  authConfigured: boolean;
}

// ... and more
```

See `src/utils/diagnostics.ts` for complete type definitions.

## Comparison with PWA Version

| Feature | PWA | React | Status |
|---------|-----|-------|--------|
| `diagnoseWebRTCConnection()` | ✅ | ✅ | Implemented |
| `debugSipConfiguration()` | ✅ | ✅ | Implemented |
| `testServerConnectivity()` | ✅ | ✅ | Implemented |
| WebRTC support check | ✅ | ✅ | Implemented |
| Media access test | ✅ | ✅ | Implemented |
| ICE connectivity test | ✅ | ✅ | Implemented |
| Console table output | ✅ | ✅ | Implemented |
| TypeScript types | ❌ | ✅ | Enhanced |
| Global `window` access | ✅ | ✅ (dev only) | Safer |

The React implementation matches the PWA functionality while adding:
- ✅ Full TypeScript type safety
- ✅ Structured return types for programmatic use
- ✅ Dev-only window exposure (more secure)
- ✅ Better async/await patterns

## Support

For issues or questions about the debug utilities:
1. Check verbose logging is enabled: Settings → Advanced → Verbose Logging
2. Run diagnostics: `window.__debug.diagnoseWebRTC()`
3. Check browser console for detailed error messages
4. Review SIP configuration: `window.__debug.debugSipConfig()`
