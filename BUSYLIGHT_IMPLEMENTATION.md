# Busylight Implementation Guide

## Overview
The Busylight integration has been fully implemented to provide visual call status indicators using a Kuando Busylight device connected to the local system.

## Features

### State Indicators
The busylight responds to the following states with specific colors and patterns:

1. **Offline/Not Registered** - Gray (solid)
   - When SIP is not registered to the server
   
2. **Registered but NOT Logged In** - Blue (solid)
   - When SIP is registered but agent is not logged in
   
3. **Logged In and Idle** - Green (solid)
   - When agent is logged in and no active calls
   
4. **Incoming Call (Ringing)** - Red (flashing at 500ms intervals)
   - When an incoming call is ringing
   - Flashing pattern stops when call is answered or terminated
   
5. **Active Call** - Red (solid)
   - When on an active call
   
6. **On Hold** - Yellow (slowly flashing at 1.5 second intervals)
   - When a call is placed on hold

## Configuration

### Enable/Disable Busylight
1. Navigate to **Settings** tab
2. Find the **Busylight** section
3. Check/uncheck **"Enable Busylight"** checkbox
4. Click **"Save Settings"** button
5. The busylight will automatically initialize when enabled

### Busylight URL
- Default: `http://127.0.0.1:8989`
- The busylight requires a local server application running on your system
- The application communicates with the busylight via HTTP API

## Technical Implementation

### Class: BusylightManager
Located in: `pwa/js/busylight-manager.js`

#### Key Methods

**`initialize()`**
- Sets up event listeners for SIP and agent events
- Connects to busylight hardware
- Sets initial state based on current system status

**`setState(state)`**
- Sets the busylight to a specific state
- Handles solid colors and flashing patterns automatically
- States: `offline`, `registered`, `idle`, `ringing`, `active`, `hold`

**`setEnabled(enabled)`**
- Enables or disables the busylight
- Automatically initializes connection when enabled
- Safely disconnects when disabled

### Event Listeners

The BusylightManager listens to the following events from SipSessionManager:

- `registered` - Fired when SIP registration succeeds
- `unregistered` - Fired when SIP unregisters
- `registrationFailed` - Fired when SIP registration fails
- `incomingCall` - Fired when an incoming call arrives
- `sessionAnswered` - Fired when a call is answered
- `sessionEstablished` - Fired when call media is established
- `sessionTerminated` - Fired when a call ends
- `sessionHeld` - Fired when a call is put on hold or resumed

### Integration with Agent Manager

The BusylightManager also responds to agent login/logout:

- When an agent logs in, the light changes from blue (registered) to green (idle)
- When an agent logs out, the light returns to blue (registered only)

This integration happens in `pwa/js/agent-buttons.js`:
```javascript
// On login
if (window.App?.managers?.busylight) {
    window.App.managers.busylight.onAgentLoggedIn();
}

// On logout
if (window.App?.managers?.busylight) {
    window.App.managers.busylight.onAgentLoggedOut();
}
```

## Flashing Patterns

### Ringing (Fast Flash)
- Color: Red
- Interval: 500ms on/off
- Purpose: Alert user to incoming call

### Hold (Slow Flash)
- Color: Yellow
- Interval: 1500ms on/off
- Purpose: Remind user that call is on hold

## API Endpoints

The busylight communicates with a local HTTP server:

- `GET /api/light/on` - Turn light on
- `GET /api/light/off` - Turn light off
- `GET /api/light/color?red={0-100}&green={0-100}&blue={0-100}` - Set specific color
- `GET /api/status` - Check device status

## Troubleshooting

### Busylight Not Working

1. **Check if busylight is enabled in settings**
   - Settings > Busylight > Enable Busylight checkbox

2. **Verify busylight server is running**
   - The busylight requires a local server application
   - Check that the server is accessible at the configured URL

3. **Check browser console for errors**
   - Press F12 to open developer tools
   - Look for `[Busylight]` prefixed messages
   - Connection errors will show "Connection failed" messages

4. **Test connection**
   - The busylight will show "Connected successfully" in console when working
   - Failed connections log "Connection failed" with error details

### Busylight Stuck in One State

1. **Check current state**
   - Console shows state changes: `[Busylight] Setting state to: {state}`

2. **Verify event listeners are attached**
   - Console shows: `[Busylight] Attaching SIP event listeners`

3. **Check SIP registration**
   - Ensure phone is registered to SIP server
   - Status shown in dial view

## Testing

### Manual Testing Steps

1. **Test Registration States**
   - Start unregistered → Light should be gray
   - Register to SIP → Light should turn blue
   - Login as agent → Light should turn green

2. **Test Call States**
   - Receive incoming call → Light should flash red
   - Answer call → Light should be solid red
   - Put call on hold → Light should flash yellow slowly
   - Resume call → Light should be solid red
   - End call → Light should return to green (if logged in)

3. **Test Agent States**
   - Logout as agent → Light should turn blue
   - Login as agent → Light should turn green

## Settings Storage

Settings are stored in localStorage:
- `BusylightEnabled` - "1" for enabled, "0" for disabled
- `BusylightUrl` - Base URL for busylight API (default: http://127.0.0.1:8989)

## Files Modified

1. **`pwa/js/busylight-manager.js`** - Complete rewrite
   - Added event listener setup
   - Added state management with flashing patterns
   - Added agent login/logout handlers
   - Added proper initialization and cleanup

2. **`pwa/js/agent-buttons.js`** - Integration added
   - Calls busylight methods on agent login/logout

3. **`pwa/js/app-startup.js`** - Initialization updated
   - Busylight initializes during app startup
   - Event listeners properly configured
   - Removed duplicate state setting (busylight manages its own state)

4. **`pwa/js/phone.js`** - Settings integration
   - Updated saveSettings() to properly enable/disable busylight

## Dependencies

- **SipSessionManager** - For SIP events
- **AgentButtonsManager** - For agent login/logout events
- **LocalDB** - For persistent settings storage
- **Fetch API** - For HTTP communication with busylight device

## Future Enhancements

Possible future improvements:
1. Add more color customization options in settings
2. Add pattern customization (flash speed, etc.)
3. Add sound/vibration patterns for different states
4. Support for multiple busylight devices
5. Add busylight status indicator in UI
6. Add test button in settings to preview colors

## Notes

- The busylight only functions when the setting is enabled
- All state changes are logged to console with `[Busylight]` prefix
- The busylight automatically reconnects if connection is lost
- Flashing is implemented using JavaScript intervals (not device firmware)
- The system gracefully handles busylight connection failures
