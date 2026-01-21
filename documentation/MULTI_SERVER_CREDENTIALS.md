# Multi-Server Credentials Management

## Overview

The 365Connect proxy server supports routing API calls to multiple Phantom PBX servers, each with their own unique credentials. This is accomplished through PhantomID-based credential mapping in the `.env` file.

## Architecture

### How It Works

1. **Client sends PhantomID**: The React app includes `phantomId` as a query parameter in all API calls
2. **Proxy receives request**: Node.js proxy server extracts the `phantomId` from the query string
3. **Dynamic credential lookup**: Proxy checks for server-specific credentials in environment variables
4. **Route to correct server**: Request is forwarded to `https://server1-{phantomId}.phantomapi.net` with appropriate credentials
5. **Response returned**: API response is returned to the client

### Request Flow

```
React App
  ↓
  GET /api/phantom/SomeEndpoint?phantomId=388
  ↓
Proxy Server (server.js)
  ↓
  • Extract phantomId: 388
  • Check for PHANTOM_API_USERNAME_388
  • Check for PHANTOM_API_KEY_388
  • If found: Use specific credentials
  • If not found: Use default PHANTOM_API_USERNAME and PHANTOM_API_KEY
  ↓
  POST https://server1-388.phantomapi.net/api/SomeEndpoint
  Authorization: Basic {base64(username:apiKey)}
  ↓
Phantom PBX Server 388
  ↓
Response returned to React App
```

## Configuration

### .env File Structure

The `.env` file uses a naming convention to store credentials and optional base URLs for multiple servers:

```bash
# ==================== Default Credentials ====================
# Used as fallback when server-specific credentials are not found

PHANTOM_API_USERNAME=ghost2
PHANTOM_API_KEY=aibiuFiquaeCuuve9Vohcheedee6ka

# ==================== Server-Specific Configuration ====================
# Format: PHANTOM_API_USERNAME_{PHANTOM_ID}
#         PHANTOM_API_KEY_{PHANTOM_ID}
#         PHANTOM_API_BASE_URL_{PHANTOM_ID} (optional)

# Server 388 - Standard pattern
PHANTOM_API_USERNAME_388=ghost2
PHANTOM_API_KEY_388=aibiuFiquaeCuuve9Vohcheedee6ka
# Base URL optional - uses default pattern: https://server1-388.phantomapi.net

# Server 375 - Custom domain
PHANTOM_API_USERNAME_375=admin375
PHANTOM_API_KEY_375=SecretKey375Example
PHANTOM_API_BASE_URL_375=https://phantom-pbx-375.customdomain.com

# Server 420 - Different subdomain pattern
PHANTOM_API_USERNAME_420=ghost420
PHANTOM_API_KEY_420=AnotherSecretKey420
PHANTOM_API_BASE_URL_420=https://pbx-420.phantomapi.net

# Add more servers as needed...
```

### Credential Lookup Logic

The proxy server follows this priority:

1. **Try server-specific credentials first**:
   - `PHANTOM_API_USERNAME_{phantomId}`
   - `PHANTOM_API_KEY_{phantomId}`

2. **Try server-specific base URL**:
   - `PHANTOM_API_BASE_URL_{phantomId}`

3. **Fall back to defaults**:
   - Credentials: `PHANTOM_API_USERNAME` and `PHANTOM_API_KEY`
   - Base URL: Pattern `https://server1-{phantomId}.phantomapi.net`
 and Custom URL
```
Request: GET /api/phantom/AgentfromPhone?phantomId=375
Credentials Used: PHANTOM_API_USERNAME_375 + PHANTOM_API_KEY_375
Base URL: PHANTOM_API_BASE_URL_375 (https://phantom-pbx-375.customdomain.com)
Target: https://phantom-pbx-375.customdomain.com/api/AgentfromPhone
```

#### Scenario 2: Server with Specific Credentials, Default Pattern
```
Request: GET /api/phantom/AgentfromPhone?phantomId=388
Credentials Used: PHANTOM_API_USERNAME_388 + PHANTOM_API_KEY_388
Base URL: Default pattern
Target: https://server1-388.phantomapi.net/api/AgentfromPhone
```

#### Scenario 3: Server Using All Defaults
```
Request: GET /api/phantom/AgentfromPhone?phantomId=999
Credentials Used: PHANTOM_API_USERNAME + PHANTOM_API_KEY (fallback)
Base URL: Default pattern
```onfiguration to .env

```bash
# Server 456 - Complete configuration
PHANTOM_API_USERNAME_456=newuser456
PHANTOM_API_KEY_456=NewApiKey456

# Optional: Add custom base URL if server doesn't follow standard pattern
PHANTOM_API_BASE_URL_456=https://custom-pbx-456.example.com
## Adding a New Server

To add support for a new Phantom PBX server:

### Step 1: Add Credentials to .env

```bash
# Server 456
PHANTOM_API_USERNAME_456=newuser456
PHANTOM_API_KEY_456=NewApiKey456
```

### Step 2: Restart Proxy Serverthe appropriate server URL
- Use custom base URL if `PHANTOM_API_BASE_URL_456` is set
- Otherwise use pattern: `https://server1-456.phantomapi.net`
- Use `PHANTOM_API_USERNAME_456` and `PHANTOM_API_KEY_456` for authentication
- Log credential and base URL
# Development mode
npm run dev

# Production mode
NODE_ENV=production node server.js
```

### Step 3: Test Connection

The proxy server will automatically:
- Route requests with `phantomId=456` to `https://server1-456.phantomapi.net`
- Use `PHANTOM_API_USERNAME_456` and `PHANTOM_API_KEY_456` for authentication
- Log credential selection in the console

## Logging and Debugging

### Verbose Logging

The proxy server logs detailed information about credential selection:

```Base URL Source: Default Pattern
     Credentials Source: Specific (PHANTOM_API_USERNAME_388)
     Auth: ✅ Basic Auth (ghost2)
     Authorization Header: Basic Z2hvc3QyOmFpYml1Rml...
     Credentials: ghost2:aibi***
```

### Base URL Source Indicators

- **Default Pattern**: Using auto-generated URL `https://server1-{ID}.phantomapi.net`
- **Specific**: Using custom URL from `PHANTOM_API_BASE_URL_{ID}   PhantomID: 388
     Credentials Source: Specific (PHANTOM_API_USERNAME_388)
     Auth: ✅ Basic Auth (ghost2)
     Authorization Header: Basic Z2hvc3QyOmFpYml1Rml...
     Credentials: ghost2:aibi***
```

### Credential Source Indicators

- **Specific**: Server has dedicated credentials (`PHANTOM_API_USERNAME_{ID}`)
- **Default**: Using fallback credentials (`PHANTOM_API_USERNAME`)

### Missing Credentials Warning

If credentials are not found for a server:

```
     Auth: ⚠️ Missing credentials for server 388
     Checked: PHANTOM_API_USERNAME_388, PHANTOM_API_KEY_388
     Fallback: PHANTOM_API_USERNAME, PHANTOM_API_KEY
     Username: undefined
     API Key: undefined
```

## Security Best Practices

### 1. Environment Variable Protection

- **Never commit `.env` to version control**
- Use `.env.example` as a template
- Add `.env` to `.gitignore`

### 2. Credential Management

- Use strong, unique API keys for each server
- Rotate credentials periodically
- Audit access logs regularly

### 3. Production Deployment

```bash
# Set environment variables directly (more secure than .env file)
export PHANTOM_API_USERNAME_388=ghost2
export PHANTOM_API_KEY_388=aibiuFiquaeCuuve9Vohcheedee6ka
export PHANTOM_API_USERNAME_375=admin375
export PHANTOM_API_KEY_375=SecretKey375Example

# Start production server
NODE_ENV=production node server.js
```

### 4. Docker/Container Deployments

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    environment:
      - PHANTOM_API_USERNAME_388=${PHANTOM_API_USERNAME_388}
      - PHANTOM_API_KEY_388=${PHANTOM_API_KEY_388}
      - PHANTOM_API_USERNAME_375=${PHANTOM_API_USERNAME_375}
      - PHANTOM_API_KEY_375=${PHANTOM_API_KEY_375}
```

## Client-Side Usage

### PhantomApiService

The React app's `PhantomApiService` automatically includes `phantomId` in all requests:

```typescript
// Initialize with PhantomID
const api = new PhantomApiService();
await api.initialize('388');

// Make API call - phantomId automatically included in query string
const result = await api.post('AgentfromPhone', { phone: '1001' });
// Request URL: /api/phantom/AgentfromPhone?phantomId=388
```

### Dynamic Server Switching

Users can switch between servers without restarting the app:

```typescript
// User changes PhantomID in settings
localStorage.setItem('PhantomID', '375');

// Reinitialize API service
await api.initialize('375');

// All subsequent calls route to server 375
const result = await api.post('AgentfromPhone', { phone: '2001' });
// Request URL: /api/phantom/AgentfromPhone?phantomId=375
```

## Base URL Generation

Base URLs are **automatically generated** from PhantomID:

```javascript
// Pattern: https://server1-{phantomId}.phantomapi.net
const phantomId = '388';
const baseUrl = `https://server1-${phantomId}.phantomapi.net`;
// Result: https://server1-388.phantomapi.net
```

**No need to specify base URLs per server** - they follow the standard naming convention.

## NoAuth Endpoints (Port 19773)

NoAuth endpoints currently use the same credential lookup pattern but don't send authentication:

```javascript
// NoAuth request
GET /api/phantom-noauth/SomeEndpoint?phantomId=388

// Routes to:
https://server1-388.phantomapi.net:19773/api/SomeEndpoint
// No Authorization header sent
```

## Troubleshooting

### Problem: "Missing credentials for server XXX"

**Solution**: Add credentials to `.env`:
```bash
PHANTOM_API_USERNAME_XXX=your_username
PHANTOM_API_KEY_XXX=your_api_key
```

### Problem: "401 Unauthorized"

**Possible causes**:
1. Incorrect username or API key
2. Credentials not properly set in `.env`
3. Server restart required after changing `.env`

**Solution**:
1. Verify credentials are correct for that specific server
2. Restart proxy server: `npm run dev` or restart production process
3. Check logs for "Credentials Source" to confirm which credentials are being used

### Problem: "502 Proxy Error - ECONNREFUSED"

**Cause**: Target server is down or unreachable

**Solution**:
1. Verify PhantomID is correct
2. Test server connectivity: `curl https://server1-388.phantomapi.net/api/ping`
3. Check firewall rules and network access

### Problem: Credentials not updating after changing .env

**Cause**: Server caching environment variables

**Solution**: Restart the Node.js server:
```bash
# Kill existing process
pkill -f "node server.js"

# Restart server
NODE_ENV=producBASE_URL_{ID}` | No | Server-specific base URL | `PHANTOM_API_BASE_URL_388=https://custom.com` |
| `PHANTOM_API_tion node server.js
```

## Environment Variable Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `PHANTOM_API_USERNAME` | Yes | Default username for all servers | `ghost2` |
| `PHANTOM_API_KEY` | Yes | Default API key for all servers | `aibiuFiquaeCuuve9Vohcheedee6ka` |
| `PHANTOM_API_USERNAME_{ID}` | No | Server-specific username | `PHANTOM_API_USERNAME_388=ghost2` |
| `PHANTOM_API_KEY_{ID}` | No | Server-specific API key | `PHANTOM_API_KEY_388=secretkey` |
| `PHANTOM_API_PORT` | No | HTTPS port (default: 443) | `443` |
| `PHANTOM_NOAUTH_PORT` | No | NoAuth port (default: 19773) | `19773` |

## Testing Multi-Server Setup

### Test Script

Create a test script to verify multi-server routing:

```javascript
// test-multi-server.js
const axios = require('axios');

const servers = [
  { id: '388', username: 'ghost2' },
  { id: '375', username: 'admin375' },
  { id: '420', username: 'ghost420' }
];

async function testServer(phantomId) {
  try {
    const response = await axios.get(
      `https://connect365.example.com/api/phantom/ping?phantomId=${phantomId}`
    );
    console.log(`✅ Server ${phantomId}: OK`);
    return true;
  } catch (error) {
    console.error(`❌ Server ${phantomId}: ${error.message}`);
    return false;
  }
}

async function testAll() {
  console.log('Testing multi-server routing...\n');
  for (const server of servers) {
    await testServer(server.id);
  }
}

testAll();
```

Run the test:
```bash
node test-multi-server.js
```

## Migration from Single-Server Setup

If you're currently using a single-server setup:

### Before (Single Server)
```bash
PHANTOM_API_USERNAME=ghost2
PHANTOM_API_KEY=aibiuFiquaeCuuve9Vohcheedee6ka
```

### After (Multi-Server)
```bash
# Keep default credentials for backward compatibility
PHANTOM_API_USERNAME=ghost2
PHANTOM_API_KEY=aibiuFiquaeCuuve9Vohcheedee6ka

# Add server-specific credentials
PHANTOM_API_USERNAME_388=ghost2
PHANTOM_API_KEY_388=aibiuFiquaeCuuve9Vohcheedee6ka

PHANTOM_API_USERNAME_375=admin375
PHANTOM_API_KEY_375=SecretKey375Example
```

**No code changes required** - the proxy server automatically handles the credential lookup!

## Summary

✅ *Dynamic Base URL Support](./DYNAMIC_BASE_URL_SUPPORT.md) - Custom base URLs per server
- [*Server-specific credentials**: Use `PHANTOM_API_USERNAME_{ID}` and `PHANTOM_API_KEY_{ID}`  
✅ **Automatic fallback**: Falls back to default credentials if specific ones not found  
✅ **No client changes**: React app continues sending `phantomId` as query parameter  
✅ **Dynamic routing**: Proxy automatically routes to correct server with correct credentials  
✅ **Verbose logging**: Detailed logs show which credentials are being used  
✅ **Backward compatible**: Existing single-server setups continue to work  

## Related Documentation

- [PhantomApiService Usage Guide](./PhantomApiService.USAGE.md)
- [Dynamic API Key Implementation](./DYNAMIC_API_KEY_IMPLEMENTATION.md)
- [API Verbose Logging](./API_VERBOSE_LOGGING_IMPLEMENTATION.md)
