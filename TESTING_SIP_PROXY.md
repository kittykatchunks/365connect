# Testing the SIP WebSocket Proxy Fix

## Quick Start

1. **Restart the server**:
   ```bash
   npm start
   ```

2. **Verify server logs show**:
   ```
   ✓ HTTPS Server running on https://connect365.servehttp.com:443
     SIP WebSocket proxy: /api/sip-ws/{phantomId} → wss://server1-{phantomId}.phantomapi.net:8089/ws
   ```

3. **Open the PWA in browser**:
   - Navigate to `https://connect365.servehttp.com`
   - Open browser DevTools (F12)
   - Go to Settings tab

4. **Clear any cached settings** (if needed):
   ```javascript
   // In browser console:
   localStorage.clear()
   sessionStorage.clear()
   location.reload()
   ```

5. **Enter your settings**:
   - PhantomID: `388` (or your actual ID)
   - SIP Username: `141` (or your actual username)
   - SIP Password: (your password)
   - Click "Save Settings"

6. **Check browser console for**:
   ```
   ✅ API credentials loaded from server config
   Using proxy: Yes
   ✅ WebSocket server URL updated: wss://connect365.servehttp.com/api/sip-ws/388
   ```

7. **Click "Register" button**

8. **Monitor both browser console and server logs**:

   **Browser should show**:
   ```
   sip.Transport | Connecting wss://connect365.servehttp.com/api/sip-ws/388
   sip.Transport | Transitioned from Disconnected to Connecting
   sip.Transport | Connected
   ```

   **Server should show**:
   ```
   [SIP Proxy] New client connection for Phantom ID: 388
   [SIP Proxy] Connecting to: wss://server1-388.phantomapi.net:8089/ws
   [SIP Proxy] Connected to Phantom server: wss://server1-388.phantomapi.net:8089/ws
   ```

## What Should Happen

### Success Indicators:
- ✅ Browser connects to `/api/sip-ws/388`
- ✅ Server proxy connects to Phantom API
- ✅ SIP registration succeeds
- ✅ Phone status shows "Registered"
- ✅ No WebSocket error 1006 in logs

### If It Fails:

1. **Check server is running**:
   - Server logs should show "HTTPS Server running"
   - Check port 443 is not blocked

2. **Check PhantomID is correct**:
   - Look for "Phantom ID: XXX" in server logs
   - Verify it matches your account

3. **Check Phantom server is accessible**:
   ```bash
   node test-phantom-ws.js
   ```

4. **Check browser console for errors**:
   - Look for WebSocket connection errors
   - Check for SSL/certificate errors
   - Look for CORS errors

5. **Check server logs for proxy errors**:
   - Look for "[SIP Proxy] Backend error"
   - Check for connection refused errors

## Testing Checklist

- [ ] Server starts without errors
- [ ] Server logs show SIP WebSocket proxy endpoint
- [ ] Browser can access PWA at HTTPS URL
- [ ] Settings page loads correctly
- [ ] Can save PhantomID in settings
- [ ] API config endpoint returns proxied URL
- [ ] Browser console shows "Using proxy: Yes"
- [ ] Register button attempts connection
- [ ] Browser connects to `/api/sip-ws/{id}` (check Network tab)
- [ ] Server logs show proxy connection to Phantom API
- [ ] SIP registration succeeds
- [ ] Phone status shows "Registered"
- [ ] Can make/receive test calls

## Troubleshooting Commands

### Check configuration:
```bash
# In browser console:
console.log('PhantomID:', localStorage.getItem('PhantomID'))
console.log('wssServer:', localStorage.getItem('wssServer'))
console.log('SipUsername:', localStorage.getItem('SipUsername'))
```

### Test API config endpoint:
```bash
curl https://connect365.servehttp.com/api/config?phantomId=388
```

Expected response:
```json
{
  "phantomId": "388",
  "wssServerUrl": "wss://connect365.servehttp.com/api/sip-ws/388",
  "sipDomain": "server1-388.phantomapi.net",
  "usingProxy": true
}
```

### Check WebSocket in browser:
```javascript
// In browser console:
const ws = new WebSocket('wss://connect365.servehttp.com/api/sip-ws/388')
ws.onopen = () => console.log('✅ Connected')
ws.onerror = (e) => console.error('❌ Error:', e)
ws.onclose = (e) => console.log('Closed:', e.code, e.reason)
```

### Monitor server logs:
```bash
# Watch logs in real-time
tail -f logs/https-access.log
tail -f logs/error.log
```

## Reverting Changes

If you need to revert to direct connection:

1. **Set environment variable**:
   ```bash
   USE_SIP_PROXY=false npm start
   ```

2. **Or edit .env file**:
   ```
   USE_SIP_PROXY=false
   ```

3. **Clear browser cache**:
   ```javascript
   localStorage.removeItem('wssServer')
   location.reload()
   ```

## Success Criteria

The fix is successful when:
1. ✅ No error 1006 in browser console
2. ✅ WebSocket stays connected (no disconnects)
3. ✅ SIP registration completes successfully
4. ✅ Phone status shows "Registered"
5. ✅ Can make and receive calls normally
6. ✅ Server logs show stable proxy connections
