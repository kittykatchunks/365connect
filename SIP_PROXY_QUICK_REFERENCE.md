# SIP WebSocket Proxy - Quick Reference

## The Problem
❌ **Before**: Browser → `wss://server1-388.phantomapi.net:8089/ws` → **Error 1006** (SSL certificate issues)

## The Solution
✅ **After**: Browser → `wss://your-server/api/sip-ws/388` → Your Server → `wss://server1-388.phantomapi.net:8089/ws` → Success!

## How It Works

```
┌─────────────────┐                ┌─────────────────┐                ┌─────────────────────┐
│                 │   WSS (Valid    │                 │   WSS (Relaxed │                     │
│  Browser Client │   SSL Cert)     │  Your Server    │   SSL Check)   │  Phantom API Server │
│                 ├────────────────►│  Proxy          ├───────────────►│                     │
│  (SIP.js)       │                 │  (Node.js)      │                │  server1-388        │
│                 │◄────────────────┤                 │◄───────────────┤  .phantomapi.net    │
└─────────────────┘                └─────────────────┘                └─────────────────────┘
        │                                   │                                   │
        │  Uses your valid SSL cert         │  Bypasses SSL cert check          │
        │  No browser errors               │  Full message proxy                │
        └──────────────────────────────────┴───────────────────────────────────┘
```

## Key Changes

### Server (server.js)

**New Proxy Endpoint**: `/api/sip-ws/{phantomId}`
- Accepts browser WebSocket connections
- Extracts PhantomID from URL
- Creates backend connection to Phantom API with relaxed SSL
- Proxies all messages bidirectionally

**Updated Config Endpoint**: `/api/config?phantomId=XXX`
- Returns proxied WebSocket URL by default
- Browser automatically uses proxy
- Can disable with `USE_SIP_PROXY=false`

### Client (api-phantom.js)

**Auto-Configuration**:
- Fetches WebSocket URL from server
- Stores in localStorage
- No manual configuration needed

## Quick Commands

### Start Server with Proxy (Default)
```bash
npm start
```

### Start Server WITHOUT Proxy
```bash
USE_SIP_PROXY=false npm start
```

### Test Phantom Server Connectivity
```bash
node test-phantom-ws.js
```

### Check Current Configuration
```bash
curl https://your-server/api/config?phantomId=388
```

### Clear Browser Cache
```javascript
// In browser console:
localStorage.clear()
location.reload()
```

## Verification

### ✅ Proxy is Working When You See:

**Browser Console**:
```
✅ API credentials loaded from server config
Using proxy: Yes
WebSocket server URL updated: wss://connect365.servehttp.com/api/sip-ws/388
sip.Transport | Connected
```

**Server Logs**:
```
[SIP Proxy] New client connection for Phantom ID: 388
[SIP Proxy] Connected to Phantom server
```

### ❌ Still Having Issues?

**Check**:
1. Server is running on HTTPS with valid certificates
2. PhantomID is correct (should match your account)
3. Firewall allows outbound connections to port 8089
4. Browser can reach your server via HTTPS
5. No CORS or mixed content errors in browser

**Debug**:
```bash
# Test direct connection
node test-phantom-ws.js

# Check server logs
tail -f logs/https-access.log
tail -f logs/error.log

# Check browser network tab
# Look for /api/sip-ws/ connections
# Check for 101 Switching Protocols response
```

## Environment Variables

Add to `.env` file:

```bash
# Disable SIP proxy (use direct connection)
USE_SIP_PROXY=false

# Alternative settings
HTTP_PORT=80
HTTPS_PORT=443
PHANTOM_API_PORT=443
PHANTOM_API_BASE_URL=https://server1-000.phantomapi.net
```

## Files Changed

1. `server.js` - Added WebSocket proxy
2. `api-phantom.js` - Auto-fetch WebSocket URL
3. `test-phantom-ws.js` - Diagnostic tool (new)
4. `SIP_WEBSOCKET_PROXY_FIX.md` - Full documentation (new)
5. `TESTING_SIP_PROXY.md` - Testing guide (new)

## Support

If issues persist:
1. Check `SIP_WEBSOCKET_PROXY_FIX.md` for detailed troubleshooting
2. Review `TESTING_SIP_PROXY.md` for test procedures
3. Run `node test-phantom-ws.js` for connectivity diagnostics
4. Check server and browser console logs
