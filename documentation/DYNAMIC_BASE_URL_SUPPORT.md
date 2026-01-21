# Dynamic Base URL Support - Quick Reference

## Overview

The proxy server now supports **custom base URLs per PhantomID**, allowing you to route to servers that don't follow the standard `server1-{id}.phantomapi.net` naming pattern.

## Usage

### Standard Pattern (No Configuration Needed)

If your server follows the standard pattern, no base URL configuration is needed:

```bash
# Only credentials needed
PHANTOM_API_USERNAME_388=ghost2
PHANTOM_API_KEY_388=aibiuFiquaeCuuve9Vohcheedee6ka

# Automatically routes to: https://server1-388.phantomapi.net
```

### Custom Base URL

Override the base URL for servers with different domains or naming patterns:

```bash
# Custom domain
PHANTOM_API_USERNAME_375=admin375
PHANTOM_API_KEY_375=SecretKey375Example
PHANTOM_API_BASE_URL_375=https://phantom-pbx-375.customdomain.com

# Routes to: https://phantom-pbx-375.customdomain.com
```

## Configuration Format

```bash
PHANTOM_API_BASE_URL_{PHANTOM_ID}=https://your-custom-url.com
```

## Examples

### Example 1: Different Subdomain Pattern

```bash
# Instead of server1-420.phantomapi.net
PHANTOM_API_BASE_URL_420=https://pbx-420.phantomapi.net
```

### Example 2: Completely Different Domain

```bash
# Server on different domain
PHANTOM_API_BASE_URL_999=https://demo-pbx.example.com
```

### Example 3: Internal Server

```bash
# Internal/private server
PHANTOM_API_BASE_URL_100=https://internal-pbx.company.local
```

### Example 4: Cloud Provider

```bash
# Server on cloud infrastructure
PHANTOM_API_BASE_URL_555=https://pbx-555.us-east-1.aws.example.com
```

## Priority Logic

```
Request with phantomId=388
  ↓
Check: PHANTOM_API_BASE_URL_388
  ↓
  ├─ Found? → Use custom URL
  │            https://custom-server-388.example.com
  │
  └─ Not found? → Use default pattern
                  https://server1-388.phantomapi.net
```

## Logging

The proxy logs show which base URL source is being used:

```
[PROXY ROUTER] phantomId: 375
[PROXY ROUTER] Routing to: https://phantom-pbx-375.customdomain.com
[PROXY ROUTER] Base URL Source: Specific (PHANTOM_API_BASE_URL_375)
```

Or for default pattern:

```
[PROXY ROUTER] phantomId: 388
[PROXY ROUTER] Routing to: https://server1-388.phantomapi.net
[PROXY ROUTER] Base URL Source: Default Pattern
```

## Complete Server Configuration

Here's a complete example for a server with custom base URL:

```bash
# Server 375 - Complete configuration
PHANTOM_API_USERNAME_375=admin375
PHANTOM_API_KEY_375=SecretKey375Example
PHANTOM_API_BASE_URL_375=https://phantom-pbx-375.customdomain.com

# API calls with phantomId=375 will:
# 1. Use credentials: admin375:SecretKey375Example
# 2. Route to: https://phantom-pbx-375.customdomain.com/api/{endpoint}
# 3. NoAuth calls: https://phantom-pbx-375.customdomain.com:19773/api/{endpoint}
```

## NoAuth Endpoint Support

Custom base URLs work for both authenticated and NoAuth endpoints:

```bash
# Authenticated endpoint
https://phantom-pbx-375.customdomain.com/api/AgentfromPhone

# NoAuth endpoint (port 19773)
https://phantom-pbx-375.customdomain.com:19773/api/SomeNoAuthEndpoint
```

## When to Use Custom Base URLs

Use `PHANTOM_API_BASE_URL_{ID}` when:

- ✅ Server is on a different domain
- ✅ Server uses a different subdomain pattern
- ✅ Server is on internal/private network
- ✅ Server is hosted on cloud with custom DNS
- ✅ Server is behind a load balancer with custom URL
- ✅ Testing against staging/development servers

## Migration from Hardcoded URLs

### Before (Hardcoded in code)

```javascript
// Bad - hardcoded in application code
const baseUrl = 'https://custom-pbx.example.com';
```

### After (Environment variable)

```bash
# Good - configured in .env
PHANTOM_API_BASE_URL_375=https://custom-pbx.example.com
```

## Testing

Test your custom base URL configuration:

```bash
# 1. Add to .env:
PHANTOM_API_USERNAME_375=testuser
PHANTOM_API_KEY_375=testkey
PHANTOM_API_BASE_URL_375=https://test-pbx.example.com

# 2. Restart server:
npm run dev

# 3. Make request:
curl "https://yourserver.com/api/phantom/ping?phantomId=375"

# 4. Check logs for:
#    [PROXY ROUTER] Base URL Source: Specific (PHANTOM_API_BASE_URL_375)
```

## Troubleshooting

### Issue: Still routing to default pattern

**Check:**
1. Environment variable is set correctly: `PHANTOM_API_BASE_URL_{ID}`
2. Server was restarted after adding variable
3. No typo in PhantomID number

### Issue: "ECONNREFUSED" error

**Check:**
1. Custom base URL is reachable: `curl https://your-custom-url.com/api/ping`
2. Firewall/network allows connection
3. SSL certificate is valid (or use `secure: false` in dev)

### Issue: Not sure which URL is being used

**Check logs:**
```
[PROXY ROUTER] Base URL Source: ...
```
Shows whether using "Specific" or "Default Pattern"

## Summary

| Configuration | Result |
|---------------|--------|
| No `PHANTOM_API_BASE_URL_{ID}` | Uses pattern: `https://server1-{id}.phantomapi.net` |
| `PHANTOM_API_BASE_URL_375=https://custom.com` | Routes to: `https://custom.com` |
| Both configured | Specific URL takes priority over pattern |

## Environment Variable Reference

| Variable | Example | Description |
|----------|---------|-------------|
| `PHANTOM_API_BASE_URL_{ID}` | `PHANTOM_API_BASE_URL_375=https://pbx.example.com` | Custom base URL for server {ID} |
| `PHANTOM_API_USERNAME_{ID}` | `PHANTOM_API_USERNAME_375=admin` | Username for server {ID} |
| `PHANTOM_API_KEY_{ID}` | `PHANTOM_API_KEY_375=secretkey` | API key for server {ID} |
| `PHANTOM_NOAUTH_PORT` | `19773` | NoAuth port (same for all servers) |

All three can be used together for complete server configuration!
