# Busylight Implementation - React App

## Overview

The Busylight functionality has been fully implemented in the React application (`src/`) to match the PWA implementation. It provides automatic status indication via Plenom Kuando Busylight USB devices.

## Architecture

### Components

1. **`useBusylight` Hook** (`src/hooks/useBusylight.ts`)
   - Core busylight logic
   - HTTP API communication with bridge server
   - State management and color control
   - Connection monitoring

2. **`BusylightContext` Provider** (`src/contexts/BusylightContext.tsx`)
   - Integrates busylight with SIP state
   - Automatic state evaluation
   - Subscribes to SIP registration, calls, and voicemail changes

3. **Settings UI** (`src/components/settings/SettingsView.tsx`)
   - Enable/disable toggle
   - Ring sound selection
   - Volume control
   - Voicemail notification toggle
   - Test connection button

4. **Settings Store** (`src/stores/settingsStore.ts`)
   - Persists busylight settings to localStorage
   - Actions for updating configuration

## State Machine

The busylight automatically transitions through these states based on your activity:

| State | Color | Behavior | Trigger |
|-------|-------|----------|---------|
| **DISCONNECTED** | OFF | Light off | SIP not registered |
| **CONNECTED** | White | Solid | Registered but no agent login |
| **IDLE** | Green | Solid | Logged in, no calls |
| **IDLENOTIFY** | Green | Slow flash (1s on/off) | Idle + voicemail waiting |
| **RINGING** | Red | Alert with sound | Incoming call |
| **RINGWAITING** | Red | Alert (silent) | Incoming call while on active call |
| **BUSY** | Red | Solid | Active call |
| **HOLD** | Yellow | Solid | Call on hold |

## State Priority Rules

1. **Primary scenarios** (override all):
   - Not registered → DISCONNECTED
   - Registered but no agent → CONNECTED
   - Ringing + active calls → RINGWAITING
   - Ringing only → RINGING

2. **Secondary scenarios** (when no primary match):
   - Active calls → BUSY
   - Hold → HOLD
   - Idle + voicemail → IDLENOTIFY
   - Idle → IDLE

## API Communication

### Bridge Server Architecture

```
React App → server.js (/api/busylight) → bridge-server.js → WebSocket → Bridge Client → Kuando Service
```

### HTTP Endpoints

All requests go through `/api/busylight?action=<action>&bridgeId=<username>`

**Actions:**
- `currentpresence` - Check connection status
- `light` - Set solid color (params: red, green, blue)
- `off` - Turn off light
- `alert` - Alert with color and sound (params: red, green, blue, sound, volume)

**Headers:**
- `x-connect365-username` - Routes to specific user's bridge

### Request Flow

1. React app makes HTTP GET request to `/api/busylight`
2. Server.js receives and passes to bridge-server middleware
3. bridge-server translates HTTP to WebSocket message
4. WebSocket message sent to connected bridge client
5. Bridge client forwards to local Kuando service
6. Response flows back through same path

## Configuration

### Settings Store

Settings are persisted in localStorage under `autocab365_settings`:

```typescript
busylight: {
  enabled: boolean;        // Enable/disable busylight
  ringSound: string;       // Sound name (OpenOffice, Funky, etc.)
  ringVolume: number;      // Volume 0-100
  voicemailNotify: boolean; // Enable IDLENOTIFY state
}
```

### Available Ring Sounds

1. OpenOffice
2. Quiet
3. Funky (default)
4. FairyTale
5. KuandoTrain
6. TelephoneNordic
7. TelephoneOriginal
8. TelephonePickMeUp

## Integration

### App.tsx Provider Hierarchy

```tsx
<PhantomAPIProvider>
  <SIPProvider>
    <BusylightProvider>
      <App />
    </BusylightProvider>
  </SIPProvider>
</PhantomAPIProvider>
```

The BusylightProvider must be inside SIPProvider to access SIP state.

### Automatic State Updates

The BusylightContext subscribes to:
- `registrationState` - SIP registration status
- `sessions` - Active call sessions
- `selectedLine` - Currently selected line
- `voicemailMWI` - Voicemail message waiting indicator

When any of these change, it re-evaluates the appropriate busylight state and updates the device.

## Verbose Logging

When verbose logging is enabled in settings, the busylight hook logs:
- API requests with full URL and parameters
- API responses with status codes
- State changes and evaluations
- Connection checks
- All errors with context

**Enable via:** Settings → Advanced → Verbose Logging

## Bridge Client Requirements

The React app requires a bridge client running on the PC with the Busylight device:

1. **Connects to:** `wss://connect365.servehttp.com:8089/ws`
2. **Sends:** `bridge_register` message with `uniqueId` (Connect365 username)
3. **Listens for:** `api_request` messages
4. **Forwards to:** Local Kuando service at `http://localhost:19774`
5. **Responds with:** `api_response` messages

## Testing

### Test Connection Button

In Settings → Busylight, click "Test Connection" to run a color sequence:
1. Red (300ms)
2. Green (300ms)
3. White (300ms)
4. Off

This verifies the bridge connection is working.

### Debug Console

```typescript
// In browser console:
import { useBusylightContext } from '@/contexts';

// Within a React component:
const busylight = useBusylightContext();
console.log('Connected:', busylight.isConnected);
console.log('Current State:', busylight.currentState);
await busylight.testConnection();
```

## Troubleshooting

### Busylight Not Responding

1. **Check bridge connection:**
   - Verify bridge client is running
   - Check WebSocket connection to port 8089
   - Confirm username in settings matches bridge registration

2. **Check server logs:**
   - Look for bridge registration messages
   - Verify API requests are routing correctly
   - Check for WebSocket errors

3. **Enable verbose logging:**
   - Settings → Advanced → Verbose Logging
   - Open browser console
   - Trigger state changes and observe logs

4. **Check bridge server status:**
   - Visit `https://connect365.servehttp.com/api/busylight-status`
   - Verify your username appears in `bridgeList`
   - Check `connected: true` for your bridge

### Light Stuck in Wrong State

- Disable and re-enable busylight in settings
- This runs the test sequence and resets to current state

### Connection Monitoring

The hook automatically monitors the bridge connection every 15 seconds:
- Reconnects if bridge comes back online
- Stops flashing on disconnect
- Shows console warnings on connection loss

## File Changes Summary

### New Files
- `src/contexts/BusylightContext.tsx` - Integration context

### Modified Files
- `src/hooks/useBusylight.ts` - Complete rewrite to match PWA API
- `src/contexts/index.ts` - Export BusylightProvider
- `src/App.tsx` - Add BusylightProvider to component tree
- `src/components/settings/SettingsView.tsx` - Enhanced settings UI
- `src/stores/settingsStore.ts` - Added voicemailNotify action

### Unchanged (Reference)
- `src/types/settings.ts` - BusylightSettings interface
- `src/stores/settingsStore.ts` - Basic actions already existed

## Environment Variables

No additional environment variables needed. Bridge configuration is in server.js:

```javascript
BUSYLIGHT_WS_URL=ws://localhost:19774/ws
BUSYLIGHT_HTTP_HOST=http://localhost:19774
```

## Next Steps

1. **Create bridge client application** - The desktop app that connects bridges to the server
2. **Test with real hardware** - Verify with actual Kuando Busylight device
3. **Add connection status indicator** - Show bridge connection in UI
4. **Add troubleshooting view** - Debug panel with connection details

## Implementation Complete ✅

All busylight functionality from the PWA has been successfully ported to the React application with:
- ✅ HTTP API communication
- ✅ Automatic state evaluation
- ✅ SIP integration
- ✅ Settings UI
- ✅ Verbose logging
- ✅ Connection monitoring
- ✅ Test functionality
- ✅ Voicemail notification
