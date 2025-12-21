# Busylight Bridge - Testing Guide

## Prerequisites

Before testing, ensure:
1. ✅ Node.js server is running (`node server.js`)
2. ✅ Local Busylight Bridge application is running on 127.0.0.1:19774
3. ✅ Kuando Busylight USB device is connected
4. ✅ PWA is accessible via browser

---

## Test Suite

### Test 1: Server Startup

**Objective**: Verify bridge server initializes correctly

**Steps**:
1. Start server: `node server.js`

**Expected Output**:
```
[BusylightBridge] Bridge server initialized
[BusylightBridge] Local service URL: ws://127.0.0.1:19774/ws
[BusylightBridge] Local service host: http://127.0.0.1:19774
✓ HTTPS Server running on https://connect365.servehttp.com:443
  Busylight Bridge: /api/busylight → ws://127.0.0.1:19774/ws
  Busylight WebSocket: /api/busylight-ws (Client connections)
  Busylight Status: /api/busylight-status
```

**Pass Criteria**: ✅ No errors, all endpoints listed

---

### Test 2: Bridge Status Endpoint

**Objective**: Verify status endpoint works before any clients connect

**Steps**:
1. Open terminal/PowerShell
2. Run: `curl https://connect365.servehttp.com/api/busylight-status`

**Expected Output**:
```json
{
  "connected": false,
  "clients": 0,
  "localServiceUrl": "ws://127.0.0.1:19774/ws",
  "reconnectAttempts": 0
}
```

**Pass Criteria**: 
- ✅ Returns JSON
- ✅ `connected: false` (no clients yet)
- ✅ `clients: 0`

---

### Test 3: Local Service Availability

**Objective**: Verify local Busylight service is reachable

**Steps**:
1. Open terminal/PowerShell
2. Run: `curl http://127.0.0.1:19774/kuando?action=currentpresence`

**Expected Output**:
```json
{
  "status": "ok",
  "devices": [
    {
      "productId": "XXXX",
      "connected": true
    }
  ]
}
```

**Pass Criteria**: 
- ✅ Service responds
- ✅ At least one device listed
- ✅ Status is "ok"

---

### Test 4: First Client Connection

**Objective**: Verify first client triggers local service connection

**Steps**:
1. Open PWA in browser
2. Open browser console (F12)
3. Go to Settings
4. Check "Enable Busylight"
5. Click Save

**Expected Browser Console**:
```
[Busylight] Settings loaded:
  Enabled: true
  Bridge URL: /api/busylight
  WebSocket URL: wss://connect365.servehttp.com/api/busylight-ws
  Use WebSocket: true
[Busylight] Initializing Busylight Bridge service...
[Busylight] Attempting WebSocket connection to wss://...
[Busylight] WebSocket connection established
[Busylight] Connected via WebSocket
[Busylight] WebSocket message received: {type: "bridge_status", connected: true, ...}
```

**Expected Server Console**:
```
[BusylightBridge] New client WebSocket connection: client_xxx
[BusylightBridge] Client registered: client_xxx
[BusylightBridge] First client connected, establishing local service connection...
[BusylightBridge] Connecting to local service at ws://127.0.0.1:19774/ws...
[BusylightBridge] ✓ Connected to local Busylight service
[BusylightBridge] Broadcast message to 1 client(s)
```

**Pass Criteria**: 
- ✅ WebSocket connection established
- ✅ Bridge connects to local service
- ✅ No errors in console

**Verify Bridge Status**:
```bash
curl https://connect365.servehttp.com/api/busylight-status
```

**Expected**:
```json
{
  "connected": true,
  "clients": 1,
  "localServiceUrl": "ws://127.0.0.1:19774/ws",
  "reconnectAttempts": 0
}
```

---

### Test 5: Light Commands

**Objective**: Verify commands are forwarded correctly

**Steps**:
1. With busylight enabled and connected (from Test 4)
2. Watch the USB Busylight device
3. In browser console, test different states:

```javascript
// Test green (idle)
App.managers.busylight.setState('idle');

// Test blue (registered)
App.managers.busylight.setState('registered');

// Test red (active)
App.managers.busylight.setState('active');

// Test flashing red (ringing)
App.managers.busylight.setState('ringing');

// Test flashing yellow (hold)
App.managers.busylight.setState('hold');

// Test off
App.managers.busylight.turnOff();
```

**Expected Behavior**:
- ✅ USB device changes color for each command
- ✅ Flashing patterns work (ringing, hold)
- ✅ No errors in console
- ✅ Server logs show message forwarding

**Expected Server Log** (for each command):
```
[BusylightBridge] Message from client client_xxx: {"action":"light",...}
[BusylightBridge] Forwarding message to local service
```

**Pass Criteria**: 
- ✅ All color states work
- ✅ Flashing patterns work
- ✅ Device responds correctly

---

### Test 6: Multiple Clients

**Objective**: Verify multiple clients can connect simultaneously

**Steps**:
1. Keep first browser window open (from Test 4)
2. Open a second browser window/tab
3. Navigate to PWA
4. Enable busylight in second window

**Expected Server Console**:
```
[BusylightBridge] New client WebSocket connection: client_yyy
[BusylightBridge] Client registered: client_yyy
[BusylightBridge] Remaining clients: 2
```

**Verify Bridge Status**:
```bash
curl https://connect365.servehttp.com/api/busylight-status
```

**Expected**:
```json
{
  "connected": true,
  "clients": 2,
  ...
}
```

**Test Command Broadcasting**:
1. In first browser, change state:
```javascript
App.managers.busylight.setState('active');
```

2. Watch both browser consoles - both should receive message
3. Watch USB device - should change to red

**Pass Criteria**: 
- ✅ Two clients connected
- ✅ Both receive broadcast messages
- ✅ Commands work from either client
- ✅ Device responds to commands

---

### Test 7: Client Disconnect (Not Last)

**Objective**: Verify bridge stays connected when clients remain

**Steps**:
1. With 2 clients connected (from Test 6)
2. Close the second browser window
3. Watch server console

**Expected Server Console**:
```
[BusylightBridge] Client disconnected: client_yyy
[BusylightBridge] Client unregistered: client_yyy. Remaining clients: 1
```

**Verify Bridge Status**:
```bash
curl https://connect365.servehttp.com/api/busylight-status
```

**Expected**:
```json
{
  "connected": true,
  "clients": 1,
  ...
}
```

**Pass Criteria**: 
- ✅ Client removed
- ✅ Bridge still connected to local service
- ✅ Remaining client still works

---

### Test 8: Last Client Disconnect

**Objective**: Verify bridge disconnects when last client leaves

**Steps**:
1. With 1 client remaining (from Test 7)
2. Disable busylight in settings OR close browser
3. Watch server console

**Expected Server Console**:
```
[BusylightBridge] Client disconnected: client_xxx
[BusylightBridge] Client unregistered: client_xxx. Remaining clients: 0
[BusylightBridge] No more clients, disconnecting from local service...
[BusylightBridge] Disconnecting from local service...
[BusylightBridge] Local service connection closed: 1000 - 
```

**Verify Bridge Status**:
```bash
curl https://connect365.servehttp.com/api/busylight-status
```

**Expected**:
```json
{
  "connected": false,
  "clients": 0,
  ...
}
```

**Pass Criteria**: 
- ✅ All clients removed
- ✅ Bridge disconnects from local service
- ✅ Status shows disconnected

---

### Test 9: HTTP Fallback

**Objective**: Verify HTTP commands work when WebSocket unavailable

**Steps**:
1. Open browser console
2. Temporarily disable WebSocket:
```javascript
App.managers.busylight.websocket = null;
App.managers.busylight.connectionMode = 'http';
```

3. Test command:
```javascript
App.managers.busylight.setColorRGB(0, 100, 0);  // Green
```

**Expected Behavior**:
- ✅ Command sent via HTTP GET request
- ✅ Request goes to `/api/busylight?action=light&red=0&green=100&blue=0`
- ✅ Bridge processes HTTP request
- ✅ Device changes color

**Expected Server Log**:
```
[BusylightBridge] HTTP → WebSocket translation:
  Input:  GET /api/busylight?action=light&red=0&green=100&blue=0
  Output: http://127.0.0.1:19774/kuando?action=light&red=0&green=100&blue=0
[BusylightBridge] Response status: 200
```

**Pass Criteria**: 
- ✅ HTTP request succeeds
- ✅ Device responds
- ✅ No errors

---

### Test 10: Local Service Restart

**Objective**: Verify reconnection logic works

**Steps**:
1. Have client connected with busylight working
2. Stop local Busylight Bridge application
3. Watch server console for reconnection attempts
4. Restart local Busylight Bridge application
5. Wait for reconnection

**Expected Server Console**:
```
[BusylightBridge] Local service connection closed: 1006 - 
[BusylightBridge] Reconnection attempt 1/5
[BusylightBridge] Connecting to local service at ws://127.0.0.1:19774/ws...
[BusylightBridge] Connection timeout
[BusylightBridge] Reconnection attempt 2/5
... (waits 6 seconds)
[BusylightBridge] Reconnection attempt 3/5
... (waits 9 seconds)

[After restarting local service]
[BusylightBridge] ✓ Connected to local Busylight service
[BusylightBridge] Broadcast message to 1 client(s)
```

**Pass Criteria**: 
- ✅ Bridge detects disconnection
- ✅ Attempts reconnection with exponential backoff
- ✅ Successfully reconnects when service available
- ✅ Clients notified of reconnection

---

### Test 11: Local Service Not Running

**Objective**: Verify graceful handling when service unavailable

**Steps**:
1. Stop local Busylight Bridge application
2. Open PWA
3. Enable busylight in settings

**Expected Browser Console**:
```
[Busylight] WebSocket connection established
[Busylight] WebSocket message received: {type: "bridge_status", connected: false, ...}
```

**Expected Server Console**:
```
[BusylightBridge] Client registered: client_xxx
[BusylightBridge] First client connected, establishing local service connection...
[BusylightBridge] Connection timeout
[BusylightBridge] Reconnection attempt 1/5
... (continues up to 5 attempts)
```

**Test HTTP Command**:
```javascript
App.managers.busylight.setState('active');
```

**Expected Browser Console**:
```
[Busylight] Error: Busylight Bridge unreachable
```

**Pass Criteria**: 
- ✅ Client connects to bridge
- ✅ Bridge attempts to connect to local service
- ✅ Graceful error handling
- ✅ User sees appropriate error message
- ✅ No crashes or hangs

---

### Test 12: Call State Integration

**Objective**: Verify busylight responds to call states

**Steps**:
1. Ensure busylight is enabled and connected
2. Register SIP phone in PWA
3. Test each call state:

**a) SIP Registration**:
- Register phone
- Expected: Blue light (registered state)

**b) Agent Login**:
- Log in as agent
- Expected: Green light (idle state)

**c) Incoming Call**:
- Receive a call
- Expected: Flashing red light (ringing state)

**d) Answer Call**:
- Answer the call
- Expected: Solid red light (active state)

**e) Put on Hold**:
- Put call on hold
- Expected: Slowly flashing yellow light (hold state)

**f) Resume Call**:
- Resume from hold
- Expected: Solid red light (active state)

**g) End Call**:
- Hang up call
- Expected: Green light (idle state, still logged in)

**h) Agent Logout**:
- Log out as agent
- Expected: Blue light (registered state)

**i) SIP Unregister**:
- Unregister phone
- Expected: Gray light (offline state)

**Pass Criteria**: 
- ✅ All state transitions work correctly
- ✅ Light colors match expected states
- ✅ Flashing patterns work correctly
- ✅ Smooth transitions between states

---

### Test 13: Settings Toggle

**Objective**: Verify enable/disable toggle works

**Steps**:
1. Open PWA with busylight enabled
2. Go to Settings
3. Uncheck "Enable Busylight"
4. Click Save
5. Wait 2 seconds
6. Check "Enable Busylight"
7. Click Save

**Expected Behavior**:

**On Disable**:
```
[Busylight] Disconnecting...
[BusylightBridge] Client disconnected
```

**On Enable**:
```
[Busylight] Initializing...
[Busylight] WebSocket connection established
[BusylightBridge] Client registered
```

**Pass Criteria**: 
- ✅ Clean disconnect on disable
- ✅ Proper reconnection on enable
- ✅ Light reflects current state after re-enable

---

### Test 14: Network Issues

**Objective**: Verify handling of network interruptions

**Steps**:
1. Have client connected
2. Simulate network issue (e.g., pause Node.js process or disconnect network)
3. Watch client behavior
4. Restore network
5. Watch reconnection

**Expected Behavior**:
- ✅ Client detects disconnection
- ✅ Shows appropriate error state
- ✅ Automatically reconnects when network restored
- ✅ Resumes normal operation

**Pass Criteria**: 
- ✅ Graceful degradation during network issues
- ✅ Automatic recovery
- ✅ No manual intervention required

---

### Test 15: CORS and Security

**Objective**: Verify CORS headers are present

**Steps**:
1. Make HTTP request and check headers:
```bash
curl -i https://connect365.servehttp.com/api/busylight?action=currentpresence
```

**Expected Headers**:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

**Pass Criteria**: 
- ✅ CORS headers present
- ✅ Allows cross-origin requests
- ✅ OPTIONS requests handled

---

## Test Summary Template

```
TEST RESULTS - [Date]
==================================================

Test 1: Server Startup              [ PASS / FAIL ]
Test 2: Bridge Status               [ PASS / FAIL ]
Test 3: Local Service               [ PASS / FAIL ]
Test 4: First Client                [ PASS / FAIL ]
Test 5: Light Commands              [ PASS / FAIL ]
Test 6: Multiple Clients            [ PASS / FAIL ]
Test 7: Client Disconnect           [ PASS / FAIL ]
Test 8: Last Client Disconnect      [ PASS / FAIL ]
Test 9: HTTP Fallback               [ PASS / FAIL ]
Test 10: Service Restart            [ PASS / FAIL ]
Test 11: Service Not Running        [ PASS / FAIL ]
Test 12: Call State Integration     [ PASS / FAIL ]
Test 13: Settings Toggle            [ PASS / FAIL ]
Test 14: Network Issues             [ PASS / FAIL ]
Test 15: CORS and Security          [ PASS / FAIL ]

Overall Status: [ PASS / FAIL ]

Notes:
- [Add any observations or issues]
```

---

## Quick Smoke Test

For rapid verification after changes:

```bash
# 1. Check server starts
node server.js

# 2. Check status endpoint
curl https://connect365.servehttp.com/api/busylight-status

# 3. Open PWA, enable busylight, check:
#    - WebSocket connects
#    - Light changes color
#    - No console errors

# 4. Disable busylight, check:
#    - Clean disconnect
#    - Status shows 0 clients
```

---

## Debugging Commands

### Check bridge status:
```bash
curl https://connect365.servehttp.com/api/busylight-status
```

### Test local service directly:
```bash
curl http://127.0.0.1:19774/kuando?action=currentpresence
```

### Test WebSocket (using websocat tool):
```bash
websocat wss://connect365.servehttp.com/api/busylight-ws
```

### Check server logs:
```bash
tail -f logs/https-access.log
tail -f logs/error.log
```

### Monitor network traffic:
- Open browser DevTools → Network tab
- Filter: WS (for WebSocket) or XHR (for HTTP)
- Watch busylight traffic

---

## Known Issues and Workarounds

### Issue: WebSocket connection fails in Firefox
**Workaround**: Use HTTP fallback mode or try Chrome/Edge

### Issue: USB device not responding
**Check**:
1. Device properly connected
2. Drivers installed
3. Local service has device permissions
4. Try unplugging and replugging device

### Issue: Bridge shows connected but commands fail
**Check**:
1. Local service logs
2. USB device status
3. Try restart local service
4. Check for multiple instances

---

## Performance Benchmarks

### Connection Times
- Client → Bridge: < 100ms
- Bridge → Local Service: < 500ms
- Command → Device: < 100ms

### Resource Usage
- Memory per client: ~2MB
- CPU per client: < 1%
- Network per command: < 1KB

### Reconnection
- First attempt: 3 seconds
- Max attempts: 5
- Total max time: 45 seconds

---

## Support Resources

- **Architecture**: `BUSYLIGHT_BRIDGE_ARCHITECTURE.md`
- **Quick Start**: `BUSYLIGHT_BRIDGE_QUICKSTART.md`
- **Changes**: `BUSYLIGHT_IMPLEMENTATION_CHANGES.md`
- **Code**: `bridge-server.js`, `server.js`, `busylight-manager.js`
