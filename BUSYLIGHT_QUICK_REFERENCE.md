# Busylight Quick Reference

## State Color Chart

| State | Color | Pattern | When It Happens |
|-------|-------|---------|----------------|
| Offline | Gray | Solid | Not registered to SIP server |
| Registered | Blue | Solid | Registered but agent not logged in |
| Idle | Green | Solid | Agent logged in, no active calls |
| Ringing | Red | Fast Flash (500ms) | Incoming call ringing |
| Active | Red | Solid | On an active call |
| Hold | Yellow | Slow Flash (1.5s) | Call on hold |

## Quick Setup

1. Enable busylight in Settings → Check "Enable Busylight"
2. Click "Save Settings"
3. Verify connection in browser console (F12)

## Common Console Messages

```
✅ Success Messages:
[Busylight] Connected successfully
[Busylight] Setting state to: {state}
[Busylight] Starting flash pattern

⚠️ Warning Messages:
[Busylight] Disabled in settings
[Busylight] Connection failed: {error}

ℹ️ Info Messages:
[Busylight] Initializing...
[Busylight] Setting up event listeners...
[Busylight] SIP registered
[Busylight] Agent logged in
```

## Test Sequence

### Basic Flow
1. **Unregistered** → Gray light
2. **Click Register** → Blue light (registered)
3. **Agent Login** → Green light (idle)
4. **Incoming Call** → Red flashing
5. **Answer Call** → Red solid
6. **Put on Hold** → Yellow flashing
7. **Resume Call** → Red solid
8. **End Call** → Green light (back to idle)
9. **Agent Logout** → Blue light (registered only)
10. **Unregister** → Gray light

## Webhook Events Used

The busylight responds to these SIP.js events:
- `registered`
- `unregistered`
- `incomingCall`
- `sessionAnswered`
- `sessionEstablished`
- `sessionTerminated`
- `sessionHeld`

## Debug Commands

Open browser console (F12) and try:

```javascript
// Check busylight status
App.managers.busylight.getStatus()

// Manually set state (for testing)
App.managers.busylight.setState('ringing')
App.managers.busylight.setState('hold')
App.managers.busylight.setState('active')

// Test connection
App.managers.busylight.initialize()

// Force disconnect
App.managers.busylight.disconnect()

// Toggle on/off
App.managers.busylight.toggle()
```

## API Requirements

Your busylight server must support:
- `GET http://127.0.0.1:8989/api/light/on`
- `GET http://127.0.0.1:8989/api/light/off`
- `GET http://127.0.0.1:8989/api/light/color?red=X&green=Y&blue=Z`
- `GET http://127.0.0.1:8989/api/status`

Where X, Y, Z are 0-100 percentage values.

## Settings Location

Settings → Busylight section:
- [x] Enable Busylight
- Busylight URL: http://127.0.0.1:8989

## Troubleshooting One-Liner

If busylight isn't working:
1. Check Settings → Enable Busylight
2. Verify local busylight server is running
3. Check console (F12) for connection errors
4. Try `App.managers.busylight.initialize()` in console
