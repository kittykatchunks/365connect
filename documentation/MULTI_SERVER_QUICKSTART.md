# Multi-Server Setup - Quick Reference

## ✅ Implementation Complete

Your proxy server now supports routing API calls to multiple Phantom PBX servers with different credentials.

## 🎯 How It Works

The proxy server looks for server-specific credentials using this pattern:

```
PhantomID: 388
├─ Checks: PHANTOM_API_USERNAME_388
├─ Checks: PHANTOM_API_KEY_388
├─ If found: Uses specific credentials
└─ If not found: Falls back to PHANTOM_API_USERNAME and PHANTOM_API_KEY
```

## 📝 Adding a New Server

### 1. Add credentials to .env file:

```bash
# Server 375 example - Standard pattern
PHANTOM_API_USERNAME_375=admin375
PHANTOM_API_KEY_375=SecretKey375Example

# Optional: Override base URL if not using standard pattern
# PHANTOM_API_BASE_URL_375=https://custom-server-375.example.com

# Optional: Server-specific React API key (for dynamic key refresh)
# REACT_APP_PHANTOM_API_KEY_375=SecretKey375Example
```

### 2. Restart the proxy server:

```bash
# Development
npm run dev

# Production
NODE_ENV=production node server.js
```

### 3. Done! ✅

The proxy will automatically:
- Route requests with `phantomId=375` to the appropriate server URL
- Use custom base URL if `PHANTOM_API_BASE_URL_375` is set
- Otherwise use pattern: `https://server1-375.phantomapi.net`
- Use the specific credentials for authentication
- Log which credentials and base URL are being used

## 🔍 Testing

### Check Logs

When a request comes in, you'll see:

```
🔄 PROXY TRANSLATION:
   Input:  https://connect365.example.com/api/phantom/AgentfromPhone?phantomId=388
   Base URL Source: Default Pattern (or Specific if custom URL set)  ← Shows base URL source
   Output: https://server1-388.phantomapi.net/api/AgentfromPhone
   PhantomID: 388
   Credentials Source: Specific (PHANTOM_API_USERNAME_388)  ← This confirms server-specific creds
   Auth: ✅ Basic Auth (ghost2)
```

### Manual Test

```bash
# Test server 388
curl "https://yourserver.com/api/phantom/ping?phantomId=388"

# Test server 375
curl "https://yourserver.com/api/phantom/ping?phantomId=375"
```

## 📋 Current Configuration

Your current `.env` file has:

```bash
# Default credentials (fallback)
PHANTOM_API_USERNAME=ghost2
PHANTOM_API_KEY=aibiuFiquaeCuuve9Vohcheedee6ka

# Server 388 (your primary server)
PHANTOM_API_USERNAME_388=ghost2
PHANTOM_API_KEY_388=aibiuFiquaeCuuve9Vohcheedee6ka
```

## 🎨 Example: Adding Multiple Servers

```bash (standard pattern)
PHANTOM_API_USERNAME_388=ghost2
PHANTOM_API_KEY_388=aibiuFiquaeCuuve9Vohcheedee6ka
# Uses default pattern: https://server1-388.phantomapi.net

# Server 375 - Secondary (custom domain)
PHANTOM_API_USERNAME_375=admin375
PHANTOM_API_KEY_375=SecretKey375Example
PHANTOM_API_BASE_URL_375=https://phantom-pbx-375.customdomain.com
REACT_APP_PHANTOM_API_KEY_375=SecretKey375Example

# Server 420 - Test (different subdomain pattern)
PHANTOM_API_USERNAME_420=testuser420
PHANTOM_API_KEY_420=TestKey420Example
PHANTOM_API_BASE_URL_420=https://pbx-420.phantomapi.net
REACT_APP_PHANTOM_API_KEY_420=TestKey420Example

# Server 999 - Demo (on completely different domain)
PHANTOM_API_USERNAME_999=demo999
PHANTOM_API_KEY_999=DemoKey999Example
PHANTOM_API_BASE_URL_999=https://demo-pbx.example.com
REACT_APP_PHANTOM_API_KEY_999=DemoKey999Example
```

## 🔒 Security Notes

1. **Never commit `.env`** to version control
2. Use `.env.example` as a template for team members
3. `.env` is already in `.gitignore`
4. Rotate credentials periodically

## 🚀 Production Deployment

### Option 1: Use .env file

```bash
NODE_ENV=production node server.js
# Automatically loads credentials from .env
```

### Option 2: Set environment variables directly (more secure)

```bash
export PHANTOM_API_USERNAME_388=ghost2
export PHANTOM_API_KEY_388=aibiuFiquaeCuuve9Vohcheedee6ka
export PHANTOM_API_USERNAME_375=admin375
export PHANTOM_API_KEY_375=SecretKey375Example

NODE_ENV=production node server.js
```

### Option 3: Docker/Container

```yaml
# docker-compose.yml
services:
  app:
    environment:
      - PHANTOM_API_USERNAME_388=${PHANTOM_API_USERNAME_388}
      - PHANTOM_API_KEY_388=${PHANTOM_API_KEY_388}
      - PHANTOM_API_USERNAME_375=${PHANTOM_API_USERNAME_375}
      - PHANTOM_API_KEY_375=${PHANTOM_API_KEY_375}
```

## ⚡ What Changed

### server.js (Proxy Server)

The `onProxyReq` handler now:

1. Extracts `phantomId` from query string
2. Checks for `PHANTOM_API_USERNAME_{phantomId}`
3. Checks for `PHANTOM_API_KEY_{phantomId}`
4. Falls back to default credentials if not found
5. Logs which credential source is used

### .env File

Added server-specific credential support:
- Default credentials remain for backward compatibility
- New pattern: `PHANTOM_API_USERNAME_{ID}` and `PHANTOM_API_KEY_{ID}`
- Example credentials for server 388 added

### No Client Changes Required! ✅

The React app (`PhantomApiService`) already sends `phantomId` as a query parameter, so no code changes are needed on the client side.

## 📚 Full Documentation

See [MULTI_SERVER_CREDENTIALS.md](./MULTI_SERVER_CREDENTIALS.md) for complete details including:
- Architecture diagrams
- Request flow
- Troubleshooting guide
- Security best practices
- Testing procedures

## ❓ Common Questions

**Q: Do I need to restart the server when I add new credentials?**  
A: Yes, restart the Node.js server after modifying `.env`.

**Q: What happens if I don't have specific credentials for a server?**  
A: The proxy falls back to the default `PHANTOM_API_USERNAME` and `PHANTOM_API_KEY`.

**Q: Can I use the same credentials for multiple servers?**  
A: Yes, you can set the same username/key for multiple servers if they share credentials.

**Q: How do I know which credentials are being used?**  
A: Check the proxy logs - they show "Credentials Source: Specific" or "Credentials Source: Default".

**Q: What if my server doesn't follow the server1-{id}.phantomapi.net pattern?**  
A: Set `PHANTOM_API_BASE_URL_{ID}` to override the base URL for that specific server.

**Q: Can I use a completely different domain for a server?**  
A: Yes! Set `PHANTOM_API_BASE_URL_{ID}=https://my-custom-pbx.example.com`

**Q: Can each server have its own React API key?**  
A: Yes! Set `REACT_APP_PHANTOM_API_KEY_{ID}` for server-specific keys. The React app automatically fetches the correct key based on PhantomID.

**Q: Do I need to change anything in the React app?**  
A: No! The client already sends `phantomId` with every request. This is a server-only change.

## 🎉 Ready for Release

Your proxy server is now ready to handle muand base URL lookup
- ✅ `server.cjs` - Added multi-server React API key support
- ✅ `src/contexts/PhantomAPIContext.tsx` - Passes phantomId when fetching API key
- ✅ `.env` - Added multi-server credential, base URL, and React API key structure
- ✅ `.env.example` - Template for new deployments
- ✅ Documentation updated - Complete guide for your team
- ✅ `server.js` - Added dynamic credential lookup
- ✅ `.env` - Added multi-server credential structure
- ✅ `.env.example` - Template for new deployments
- ✅ Documentation created - Complete guide for your team
