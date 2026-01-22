require('dotenv').config();
const express = require('express');
const https = require('https');
const http = require('http');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const BusylightBridgeServer = require('./bridge-server.cjs');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Create write streams for logs
const httpLogStream = fs.createWriteStream(path.join(logsDir, 'http-access.log'), { flags: 'a' });
const httpsLogStream = fs.createWriteStream(path.join(logsDir, 'https-access.log'), { flags: 'a' });
const errorLogStream = fs.createWriteStream(path.join(logsDir, 'error.log'), { flags: 'a' });

// Custom logger function with enhanced console output
function logRequest(stream, protocol, req, res) {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl || req.url;
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'] || '-';
  const host = req.headers.host || '-';
  
  // Enhanced console logging at request start
  console.log(`\n${'='.repeat(80)}`);
  console.log(`[${protocol} REQUEST] ${timestamp}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`  Method:      ${method}`);
  console.log(`  Input URL:   ${protocol.toLowerCase()}://${host}${url}`);
  console.log(`  Path:        ${url}`);
  console.log(`  Client IP:   ${ip}`);
  console.log(`  User-Agent:  ${userAgent.substring(0, 60)}${userAgent.length > 60 ? '...' : ''}`);
  
  // Identify request type
  let requestType = 'STATIC FILE';
  if (url.startsWith('/api/phantom')) {
    requestType = 'PHANTOM API PROXY';
  } else if (url.startsWith('/api/busylight')) {
    requestType = 'BUSYLIGHT PROXY';
  } else if (url.startsWith('/api/')) {
    requestType = 'API ENDPOINT';
  } else if (url === '/' || url.startsWith('/index')) {
    requestType = 'SPA ROOT';
  }
  console.log(`  Type:        ${requestType}`);
  console.log(`${'-'.repeat(80)}`);
  
  // Log when response finishes
  res.on('finish', () => {
    const statusCode = res.statusCode;
    const contentLength = res.get('content-length') || '-';
    const responseTime = res.locals.startTime ? Date.now() - res.locals.startTime : '-';
    
    const logLine = `[${timestamp}] ${protocol} ${ip} "${method} ${url}" ${statusCode} ${contentLength} "${userAgent}" ${responseTime}ms\n`;
    
    // Write to file
    stream.write(logLine);
    
    // Enhanced console output
    const statusColor = statusCode >= 500 ? '❌' : statusCode >= 400 ? '⚠️' : statusCode >= 300 ? '↪️' : '✅';
    console.log(`  ${statusColor} Response:   ${statusCode} ${http.STATUS_CODES[statusCode] || ''}`);
    console.log(`  Duration:    ${responseTime}ms`);
    console.log(`  Size:        ${contentLength} bytes`);
    console.log(`${'='.repeat(80)}\n`);
  });
}

// Response time middleware - stores start time for later calculation
function responseTimeMiddleware(req, res, next) {
  res.locals.startTime = Date.now();
  next();
}

const app = express();

// Add response time middleware first
app.use(responseTimeMiddleware);

const HTTP_PORT = process.env.HTTP_PORT || 80;
const HTTPS_PORT = process.env.HTTPS_PORT || 443;
const PROXY_PORT = process.env.PHANTOM_API_PORT || 443;
const PHANTOM_API_BASE_URL = process.env.PHANTOM_API_BASE_URL || 'https://server1-000.phantomapi.net';

// Initialize Busylight Bridge Server
const busylightBridge = new BusylightBridgeServer({
  localServiceUrl: process.env.BUSYLIGHT_WS_URL || 'ws://localhost:19774/ws',
  localServiceHost: process.env.BUSYLIGHT_HTTP_HOST || 'http://localhost:19774'
});

// Let's Encrypt certificate paths
const LETSENCRYPT_CERT = './certs/fullchain.pem';
const LETSENCRYPT_KEY = './certs/privkey.pem';

// Fallback to custom certs
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || './certs/privkey.pem';
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || './certs/fullchain.pem';

// HTTPS logging middleware (will be used by HTTPS server)
app.use((req, res, next) => {
  // Only log to HTTPS stream when on HTTPS (will be set by server)
  if (req.protocol === 'https' || req.secure) {
    logRequest(httpsLogStream, 'HTTPS', req, res);
  }
  next();
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: [
        "'self'",
        "wss://*.phantomapi.net:*",
        "https://*.phantomapi.net:*",
        "ws://localhost:*",
        "http://localhost:*"
      ],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      fontSrc: ["'self'", "data:"],
      mediaSrc: ["'self'", "blob:"],
      workerSrc: ["'self'", "blob:"],
      manifestSrc: ["'self'"]
    }
  }
}));

app.use(cors({
  origin: '*', // Restrict to your domain in production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-connect365-username']
}));

app.use(compression());

// Determine static folder based on environment
const staticFolder = path.join(__dirname, 'dist');

console.log(`[SERVER] Serving static files from: ${staticFolder}`);
console.log(`[SERVER] Environment: ${process.env.NODE_ENV || 'development'}`);

// Serve static files with smart caching strategy
app.use(express.static(staticFolder, {
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    // Never cache service worker or manifest
    if (filePath.endsWith('sw.js') || filePath.endsWith('service-worker.js')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      return;
    }
    
    if (filePath.endsWith('manifest.json')) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      res.setHeader('Content-Type', 'application/manifest+json');
      return;
    }
    
    // Don't cache HTML files - always get fresh
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      return;
    }
    
    // Immutable assets (versioned/hashed files) - cache forever
    if (filePath.match(/\.(js|css)\?v=/) || filePath.match(/\.[a-f0-9]{8,}\.(js|css|png|jpg|webp|woff2?)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return;
    }
    
    // Libraries in lib/ folder - cache for 1 week (these rarely change)
    if (filePath.includes('/lib/') || filePath.includes('\\lib\\')) {
      res.setHeader('Cache-Control', 'public, max-age=604800'); // 1 week
      return;
    }
    
    // Application JS/CSS - cache but revalidate (for development)
    if (filePath.match(/\.(js|css)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate'); // 1 hour
      return;
    }
    
    // Images, fonts - cache for 1 week
    if (filePath.match(/\.(png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|eot)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=604800'); // 1 week
      return;
    }
    
    // Default: short cache with revalidation
    res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate'); // 5 minutes
  }
}));

// ============================================================================
// DIRECT API ENDPOINTS - Must be registered BEFORE proxy middleware
// ============================================================================

// Phantom API current key endpoint
app.get('/api/phantom/current-key', (req, res) => {
  const phantomId = req.query.phantomId || '000';
  
  console.log(`[API] GET /api/phantom/current-key - PhantomID: ${phantomId}`);
  
  // Check for server-specific credentials first, then fall back to default
  const specificUsernameKey = `PHANTOM_API_USERNAME_${phantomId}`;
  const specificKeyKey = `PHANTOM_API_KEY_${phantomId}`;
  
  const apiUsername = process.env[specificUsernameKey] || process.env.PHANTOM_API_USERNAME;
  const apiKey = process.env[specificKeyKey] || process.env.PHANTOM_API_KEY;
  const isUsingSpecificCredentials = !!(process.env[specificUsernameKey] && process.env[specificKeyKey]);
  
  console.log(`[API] Credentials source: ${isUsingSpecificCredentials ? `Specific (${specificKeyKey})` : 'Default (PHANTOM_API_KEY)'}`);
  console.log(`[API] Username: ${apiUsername || 'undefined'}`);
  console.log(`[API] API Key: ${apiKey ? apiKey.substring(0, 8) + '***' : 'undefined'}`);
  
  if (!apiUsername || !apiKey) {
    console.warn(`[API] ⚠️ Missing credentials for PhantomID ${phantomId}`);
    return res.status(404).json({ 
      error: 'API key not configured',
      message: `No credentials found for PhantomID ${phantomId}`,
      phantomId,
      checked: [specificUsernameKey, specificKeyKey, 'PHANTOM_API_USERNAME', 'PHANTOM_API_KEY']
    });
  }
  
  res.json({
    apiKey,
    username: apiUsername,
    phantomId,
    lastModified: Date.now(),
    timestamp: new Date().toISOString(),
    source: isUsingSpecificCredentials ? 'server-specific' : 'default'
  });
});

// Configuration endpoint for SIP/WebSocket
app.get('/api/config', (req, res) => {
  const phantomId = req.query.phantomId || '000';
  const domain = `server1-${phantomId}.phantomapi.net`;
  const wssPort = 8089;
  const wssPath = '/ws';
  const sipPort = 5061;
  const sipServer = domain;
  const apiPort = process.env.PHANTOM_API_PORT || 443;
  
  res.json({
    phantomId,
    wssServerUrl: `wss://${domain}:${wssPort}${wssPath}`,
    wssPort,
    wssPath,
    sipDomain: domain,
    sipServer,
    sipPort,
    phantomApiBase: `https://${domain}:${apiPort}/api`,
    apiUsername: process.env.PHANTOM_API_USERNAME,
    apiKey: process.env.PHANTOM_API_KEY
  });
});

// Test WebSocket connectivity to Phantom server
app.get('/api/phantom/test-ws', (req, res) => {
  const phantomId = req.query.phantomId || '000';
  const domain = `server1-${phantomId}.phantomapi.net`;
  const wsUrl = `wss://${domain}:8089/ws`;
  
  console.log(`[API] Testing WebSocket connection to: ${wsUrl}`);
  
  try {
    const ws = new WebSocket(wsUrl, ['sip']);
    let connected = false;
    
    const timeout = setTimeout(() => {
      if (!connected) {
        ws.close();
        res.json({
          success: false,
          url: wsUrl,
          error: 'Connection timeout (5s)',
          message: 'WebSocket connection timed out. Server may be unreachable or blocking connections.'
        });
      }
    }, 5000);
    
    ws.on('open', () => {
      connected = true;
      clearTimeout(timeout);
      console.log(`[API] ✅ WebSocket connection successful: ${wsUrl}`);
      ws.close();
      res.json({
        success: true,
        url: wsUrl,
        message: 'WebSocket connection successful'
      });
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      console.error(`[API] ❌ WebSocket connection error: ${error.message}`);
      if (!connected) {
        res.json({
          success: false,
          url: wsUrl,
          error: error.message,
          code: error.code
        });
      }
    });
  } catch (error) {
    console.error(`[API] ❌ WebSocket test failed: ${error.message}`);
    res.json({
      success: false,
      url: wsUrl,
      error: error.message
    });
  }
});

// Health check endpoint for network status monitoring
app.get('/api/health', async (req, res) => {
  const hasDefaultKey = !!process.env.PHANTOM_API_KEY;
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    apiKeyConfigured: hasDefaultKey,
    multiServerSupport: true
  });
});

// Legacy health check endpoint (deprecated, use /api/health instead)
app.get('/health', async (req, res) => {
  try {
    const url = PHANTOM_API_BASE_URL + '/api/ping';
    https.get(url, (apiRes) => {
      let data = '';
      apiRes.on('data', chunk => { data += chunk; });
      apiRes.on('end', () => {
        if (apiRes.statusCode === 200) {
          res.status(200).json({ status: 'ok', data });
        } else {
          res.status(503).json({ status: 'unreachable', code: apiRes.statusCode, data });
        }
      });
    }).on('error', (err) => {
      res.status(503).json({ status: 'unreachable', error: err.message });
    });
  } catch (err) {
    res.status(503).json({ status: 'unreachable', error: err.message });
  }
});

// ============================================================================
// PROXY MIDDLEWARE - Catch-all for /api/phantom/* and /api/phantom-noauth/*
// ============================================================================

app.use('/api/phantom', createProxyMiddleware({
  target: 'https://server1-000.phantomapi.net',
  changeOrigin: true,
  secure: false,
  pathRewrite: {
    '^/api/phantom': '/api',
  },
  router: (req) => {
    const phantomId = req.query.phantomId || '000';
    console.log(`[PROXY ROUTER] phantomId: ${phantomId}`);
    
    // Check for server-specific base URL first, then fall back to pattern
    const specificBaseUrlKey = `PHANTOM_API_BASE_URL_${phantomId}`;
    const customBaseUrl = process.env[specificBaseUrlKey];
    const authPort = process.env.PHANTOM_API_PORT || 443;
    
    // Strip any existing port from custom base URL before adding auth port
    let baseUrlWithoutPort = customBaseUrl;
    if (customBaseUrl) {
      // Remove port if present (e.g., https://server1-833.phantomapi.net:443 -> https://server1-833.phantomapi.net)
      baseUrlWithoutPort = customBaseUrl.replace(/:\d+$/, '');
    }
    
    const target = baseUrlWithoutPort 
      ? `${baseUrlWithoutPort}:${authPort}` 
      : `https://server1-${phantomId}.phantomapi.net:${authPort}`;
    const baseUrlSource = customBaseUrl ? `Specific (${specificBaseUrlKey})` : 'Default Pattern';
    
    console.log(`[PROXY ROUTER] Routing to: ${target}`);
    console.log(`[PROXY ROUTER] Base URL Source: ${baseUrlSource}`);
    return target;
  },
  onProxyReq: (proxyReq, req, res) => {
    const phantomId = req.query.phantomId || '000';
    
    // Get credentials - try server-specific first, then fall back to default
    const specificUsernameKey = `PHANTOM_API_USERNAME_${phantomId}`;
    const specificKeyKey = `PHANTOM_API_KEY_${phantomId}`;
    
    const apiUsername = process.env[specificUsernameKey] || process.env.PHANTOM_API_USERNAME;
    const apiKey = process.env[specificKeyKey] || process.env.PHANTOM_API_KEY;
    
    const isUsingSpecificCredentials = !!(process.env[specificUsernameKey] && process.env[specificKeyKey]);
    const host = req.headers.host || 'unknown';
    
    // Get the actual path being called after rewrite
    const originalPath = req.originalUrl;
    const rewrittenPath = originalPath.replace(/^\/api\/phantom/, '/api').replace(/\?phantomId=\d+/, '');
    
    // Get base URL (check for custom first)
    const specificBaseUrlKey = `PHANTOM_API_BASE_URL_${phantomId}`;
    const baseUrl = process.env[specificBaseUrlKey] || `https://server1-${phantomId}.phantomapi.net`;
    const targetUrl = `${baseUrl}${rewrittenPath}`;
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`  🔄 AUTH PROXY REQUEST DETAILS`);
    console.log(`${'='.repeat(80)}`);
    console.log(`     Method: ${req.method}`);
    console.log(`     Input:  https://${host}${originalPath}`);
    console.log(`     Output: ${targetUrl}`);
    console.log(`     PhantomID: ${phantomId}`);
    console.log(`     Credentials Source: ${isUsingSpecificCredentials ? `Specific (${specificUsernameKey})` : 'Default (PHANTOM_API_USERNAME)'}`);
    
    if (apiUsername && apiKey) {
      const authString = Buffer.from(`${apiUsername}:${apiKey}`).toString('base64');
      proxyReq.setHeader('Authorization', `Basic ${authString}`);
      console.log(`     Auth: ✅ Basic Auth (${apiUsername})`);
      console.log(`     Authorization Header: Basic ${authString.substring(0, 20)}...`);
      console.log(`     Credentials: ${apiUsername}:${apiKey.substring(0, 4)}***`);
    } else {
      console.warn(`     Auth: ⚠️ Missing credentials for server ${phantomId}`);
      console.warn(`     Checked: ${specificUsernameKey}, ${specificKeyKey}`);
      console.warn(`     Fallback: PHANTOM_API_USERNAME, PHANTOM_API_KEY`);
      console.warn(`     Username: ${apiUsername || 'undefined'}`);
      console.warn(`     API Key: ${apiKey ? 'set' : 'undefined'}`);
    }
    
    console.log(`\n     📋 Request Headers Sent to Phantom API:`);
    for (const [key, value] of Object.entries(proxyReq.getHeaders())) {
      console.log(`       • ${key}: ${value}`);
    }
    
    // Log query params if present
    const queryParams = new URLSearchParams(req.url.split('?')[1]);
    if (queryParams.toString()) {
      console.log(`\n     🔍 Query Parameters:`);
      for (const [key, value] of queryParams) {
        console.log(`       • ${key} = ${value}`);
      }
    }
    
    // Log request body for POST/PUT/PATCH
    if (req.body && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
      console.log(`\n     📦 Request Body:`);
      console.log(`${JSON.stringify(req.body, null, 2).split('\n').map(line => `       ${line}`).join('\n')}`);
    }
    console.log(`${'='.repeat(80)}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    let responseBody = '';
    const statusIcon = proxyRes.statusCode >= 400 ? '❌' : '✅';
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`  ${statusIcon} AUTH PROXY RESPONSE`);
    console.log(`${'='.repeat(80)}`);
    console.log(`     Status: ${proxyRes.statusCode} ${proxyRes.statusMessage}`);
    console.log(`     Content-Type: ${proxyRes.headers['content-type'] || 'unknown'}`);
    console.log(`     Content-Length: ${proxyRes.headers['content-length'] || 'unknown'}`);
    console.log(`\n     📋 Response Headers from Phantom API:`);
    for (const [key, value] of Object.entries(proxyRes.headers)) {
      console.log(`       • ${key}: ${value}`);
    }
    
    proxyRes.on('data', (chunk) => {
      responseBody += chunk.toString();
    });
    
    proxyRes.on('end', () => {
      if (responseBody.length > 0) {
        console.log(`\n     📦 Response Body (${responseBody.length} bytes):`);
        try {
          const parsed = JSON.parse(responseBody);
          console.log(JSON.stringify(parsed, null, 2).split('\n').map(line => `       ${line}`).join('\n'));
        } catch {
          // Not JSON, log raw text
          const lines = responseBody.split('\n');
          lines.slice(0, 20).forEach(line => {
            console.log(`       ${line}`);
          });
          if (lines.length > 20) {
            console.log(`       ... (${lines.length - 20} more lines)`);
          }
        }
      } else {
        console.log(`\n     📦 Response Body: (empty)`);
      }
      console.log(`${'='.repeat(80)}\n`);
    });
    
    delete proxyRes.headers['www-authenticate'];
  },
  onError: (err, req, res) => {
    console.log(`  ❌ PROXY ERROR:`);
    console.log(`     URL: ${req.originalUrl}`);
    console.log(`     Error: ${err.message}`);
    console.log(`     Code: ${err.code || 'UNKNOWN'}`);
    if (err.code === 'ECONNREFUSED') {
      console.log(`     💡 Hint: Target server may be down or unreachable`);
    }
    res.status(502).json({ error: 'Proxy error', message: err.message });
  }
}));


// NoAuth Phantom API Proxy (Port 19773 - No Authentication)
app.use('/api/phantom-noauth', createProxyMiddleware({
  target: 'https://server1-000.phantomapi.net:19773',
  changeOrigin: true,
  secure: false,
  logLevel: 'debug', // Enable debug logging
  pathRewrite: {
    '^/api/phantom-noauth': '/api',
  },
  router: (req) => {
    const phantomId = req.query.phantomId || '000';
    console.log(`\n🔶 [NOAUTH PROXY ROUTER] START`);
    console.log(`   phantomId: ${phantomId}`);
    
    // Check for server-specific base URL first, then fall back to pattern
    const specificBaseUrlKey = `PHANTOM_API_BASE_URL_${phantomId}`;
    const customBaseUrl = process.env[specificBaseUrlKey];
    const noAuthPort = process.env.PHANTOM_NOAUTH_PORT || 19773;
    
    // Strip any existing port from custom base URL before adding noauth port
    let baseUrlWithoutPort = customBaseUrl;
    if (customBaseUrl) {
      // Remove port if present (e.g., https://server1-833.phantomapi.net:443 -> https://server1-833.phantomapi.net)
      baseUrlWithoutPort = customBaseUrl.replace(/:\d+$/, '');
    }
    
    const target = baseUrlWithoutPort 
      ? `${baseUrlWithoutPort}:${noAuthPort}` 
      : `https://server1-${phantomId}.phantomapi.net:${noAuthPort}`;
    const baseUrlSource = customBaseUrl ? `Specific (${specificBaseUrlKey})` : 'Default Pattern';
    
    console.log(`   Target URL: ${target}`);
    console.log(`   Base URL Source: ${baseUrlSource}`);
    console.log(`🔶 [NOAUTH PROXY ROUTER] END - Target: ${target}\n`);
    return target;
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`\n🟢 [NOAUTH onProxyReq] START - Preparing request to send`);
    
    const phantomId = req.query.phantomId || '000';
    const host = req.headers.host || 'unknown';
    const noAuthPort = process.env.PHANTOM_NOAUTH_PORT || 19773;
    
    // Get the actual path being called after rewrite
    const originalPath = req.originalUrl;
    const rewrittenPath = originalPath.replace(/^\/api\/phantom-noauth/, '/api').replace(/\?phantomId=\d+/, '');
    
    // Get base URL (check for custom first)
    const specificBaseUrlKey = `PHANTOM_API_BASE_URL_${phantomId}`;
    const baseUrl = process.env[specificBaseUrlKey] || `https://server1-${phantomId}.phantomapi.net`;
    const targetUrl = `${baseUrl}:${noAuthPort}${rewrittenPath}`;
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`  🔄 NOAUTH PROXY REQUEST DETAILS`);
    console.log(`${'='.repeat(80)}`);
    console.log(`     Method: ${req.method}`);
    console.log(`     Input:  https://${host}${originalPath}`);
    console.log(`     Output: ${targetUrl}`);
    console.log(`     PhantomID: ${phantomId}`);
    console.log(`     Auth: ❌ None (NoAuth endpoint)`);
    console.log(`     Content-Type: ${req.headers['content-type'] || 'none'}`);
    console.log(`     Content-Length: ${req.headers['content-length'] || '0'}`);
    
    console.log(`\n     📋 Request Headers Sent to Phantom API:`);
    for (const [key, value] of Object.entries(proxyReq.getHeaders())) {
      console.log(`       • ${key}: ${value}`);
    }
    
    // Log query params if present
    const queryParams = new URLSearchParams(req.url.split('?')[1]);
    if (queryParams.toString()) {
      console.log(`\n     🔍 Query Parameters:`);
      for (const [key, value] of queryParams) {
        console.log(`       • ${key} = ${value}`);
      }
    }
    
    console.log(`${'='.repeat(80)}`);
    console.log(`🟢 [NOAUTH onProxyReq] END - Request sent to Phantom API\n`);
    console.log(`${'='.repeat(80)}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`\n🟣 [NOAUTH onProxyRes] START - Received response from Phantom API`);
    
    let responseBody = '';
    const statusIcon = proxyRes.statusCode >= 400 ? '❌' : '✅';
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`  ${statusIcon} NOAUTH PROXY RESPONSE`);
    console.log(`${'='.repeat(80)}`);
    console.log(`     Status: ${proxyRes.statusCode} ${proxyRes.statusMessage}`);
    console.log(`     Content-Type: ${proxyRes.headers['content-type'] || 'unknown'}`);
    console.log(`     Content-Length: ${proxyRes.headers['content-length'] || 'unknown'}`);
    console.log(`\n     📋 Response Headers from Phantom API:`);
    for (const [key, value] of Object.entries(proxyRes.headers)) {
      console.log(`       • ${key}: ${value}`);
    }
    
    proxyRes.on('data', (chunk) => {
      console.log(`🟣 [NOAUTH onProxyRes] Received data chunk: ${chunk.length} bytes`);
      responseBody += chunk.toString();
    });
    
    proxyRes.on('end', () => {
      console.log(`🟣 [NOAUTH onProxyRes] Response stream ended`);
      if (responseBody.length > 0) {
        console.log(`\n     📦 Response Body (${responseBody.length} bytes):`);
        try {
          const parsed = JSON.parse(responseBody);
          console.log(JSON.stringify(parsed, null, 2).split('\n').map(line => `       ${line}`).join('\n'));
        } catch {
          // Not JSON, log raw text
          const lines = responseBody.split('\n');
          lines.slice(0, 20).forEach(line => {
            console.log(`       ${line}`);
          });
          if (lines.length > 20) {
            console.log(`       ... (${lines.length - 20} more lines)`);
          }
        }
      } else {
        console.log(`\n     📦 Response Body: (empty)`);
      }
      console.log(`${'='.repeat(80)}`);
      console.log(`🟣 [NOAUTH onProxyRes] END - Sending response to client\n`);
    });
  },
  onError: (err, req, res) => {
    console.log(`\n🔴 [NOAUTH onError] ERROR OCCURRED!`);
    console.log(`${'!'.repeat(80)}`);
    console.log(`  ❌ NOAUTH PROXY ERROR:`);
    console.log(`     URL: ${req.originalUrl}`);
    console.log(`     Error: ${err.message}`);
    console.log(`     Code: ${err.code || 'UNKNOWN'}`);
    console.log(`     Stack: ${err.stack}`);
    if (err.code === 'ECONNREFUSED') {
      console.log(`     💡 Hint: Target server may be down or unreachable`);
    }
    if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
      console.log(`     💡 Hint: Request timed out - possible body parser issue or network problem`);
    }
    console.log(`${'!'.repeat(80)}`);
    console.log(`🔴 [NOAUTH onError] END\n`);
    
    if (!res.headersSent) {
      res.status(502).json({ error: 'Proxy error', message: err.message, code: err.code });
    }
  }
}));

// Busylight Bridge HTTP middleware
app.use('/api/busylight', busylightBridge.createHttpMiddleware());

// Busylight Bridge status endpoint
app.get('/api/busylight-status', (req, res) => {
  res.json(busylightBridge.getStatus());
});

// Fallback: serve index.html for SPA routes (but NOT for static files)
app.get('*', (req, res) => {
  const ext = path.extname(req.path);
  
  // If requesting a file with an extension (like .json, .js, .css, etc.), 
  // and it wasn't found by express.static, return 404
  if (ext && ext !== '.html') {
    return res.status(404).send('File not found');
  }
  
  // For HTML routes or routes without extension, serve index.html
  const indexPath = path.join(staticFolder, 'index.html');
  res.sendFile(indexPath);
});

// Determine which SSL certificates to use
let sslOptions = null;
let certSource = 'none';

// Priority 1: Let's Encrypt certificates
if (fs.existsSync(LETSENCRYPT_CERT) && fs.existsSync(LETSENCRYPT_KEY)) {
  sslOptions = {
    cert: fs.readFileSync(LETSENCRYPT_CERT),
    key: fs.readFileSync(LETSENCRYPT_KEY)
  };
  certSource = 'letsencrypt';
  console.log('✓ Using Let\'s Encrypt SSL certificates');
}
// Priority 2: Custom certificates
else if (fs.existsSync(SSL_CERT_PATH) && fs.existsSync(SSL_KEY_PATH)) {
  sslOptions = {
    key: fs.readFileSync(SSL_KEY_PATH),
    cert: fs.readFileSync(SSL_CERT_PATH)
  };
  certSource = 'custom';
  console.log('✓ Using custom SSL certificates');
}

// Start servers based on available certificates
if (sslOptions) {
  // Start HTTPS server
  const httpsServer = https.createServer(sslOptions, app);
  
  // Create WebSocket server for Busylight Bridge client connections (port 8089)
  // Use HTTPS server to enable WSS (secure WebSocket) connections
  const bridgeServer = https.createServer(sslOptions);
  const bridgeWss = new WebSocket.Server({ server: bridgeServer, path: '/ws' });
  
  bridgeWss.on('connection', (ws, request) => {
    const clientIp = request.socket.remoteAddress;
    const bridgeId = `bridge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[BusylightBridge] New bridge connection from ${clientIp}: ${bridgeId}`);
    busylightBridge.registerBridge(ws, bridgeId);
  });
  
  // Start bridge connection server on port 8089 with WSS support
  bridgeServer.listen(8089, () => {
    console.log(`✓ Bridge WebSocket Server running on wss://0.0.0.0:8089/ws`);
    console.log(`  Accepting incoming secure WebSocket (WSS) connections from Busylight Bridge clients`);
  });
  
  // Create WebSocket server for Busylight Bridge client connections (legacy/HTTPS)
  const wss = new WebSocket.Server({ noServer: true });
  
  wss.on('connection', (ws, request) => {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[BusylightBridge] New client WebSocket connection: ${clientId}`);
    busylightBridge.registerClient(ws, clientId);
  });
  
  // Enable WebSocket upgrade handling
  httpsServer.on('upgrade', (req, socket, head) => {
    console.log(`[WebSocket] Upgrade request: ${req.url}`);
    if (req.url.startsWith('/api/busylight/ws') || req.url === '/api/busylight-ws') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    } else {
      console.log('[WebSocket] Unknown upgrade path, destroying socket');
      socket.destroy();
    }
  });
  
  httpsServer.listen(HTTPS_PORT, () => {
    console.log(`✓ HTTPS Server running on https://connect365.servehttp.com:${HTTPS_PORT}`);
    console.log(`  Certificate source: ${certSource}`);
    console.log(`  Phantom API proxy: /api/phantom → https://server1-{phantomId}.phantomapi.net:${PROXY_PORT}/api`);
    console.log(`  Busylight Bridge: /api/busylight → ws://127.0.0.1:19774/ws (HTTP proxy to http://127.0.0.1:19774/kuando)`);
    console.log(`  Busylight WebSocket: /api/busylight-ws (Client connections)`);
    console.log(`  Busylight Status: /api/busylight-status`);
  });
  
  // Start HTTP server for busylight-bridge proxy (no redirect for busylight endpoints)
  const httpApp = express();
  
  // Add response time middleware
  httpApp.use(responseTimeMiddleware);
  
  // HTTP logging middleware with enhanced details
  httpApp.use((req, res, next) => {
    logRequest(httpLogStream, 'HTTP', req, res);
    
    // Log redirect decisions
    if (!req.url.startsWith('/api/busylight')) {
      console.log(`  ↪️  Will redirect to HTTPS`);
    }
    next();
  });
  
  // Allow busylight bridge on HTTP
  httpApp.use('/api/busylight', busylightBridge.createHttpMiddleware());
  httpApp.get('/api/busylight-status', (req, res) => {
    res.json(busylightBridge.getStatus());
  });
  
  // Redirect all other HTTP traffic to HTTPS
  httpApp.use((req, res) => {
    res.writeHead(301, { 
      Location: `https://${req.headers.host}${req.url}` 
    });
    res.end();
  });
  
  const httpServer = http.createServer(httpApp);
  
  // Create WebSocket server for HTTP as well
  const httpWss = new WebSocket.Server({ noServer: true });
  
  httpWss.on('connection', (ws, request) => {
    const clientId = `http_client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[BusylightBridge] New HTTP client WebSocket connection: ${clientId}`);
    busylightBridge.registerClient(ws, clientId);
  });
  
  // Enable WebSocket upgrade handling on HTTP
  httpServer.on('upgrade', (req, socket, head) => {
    console.log(`[HTTP WebSocket] Upgrade request: ${req.url}`);
    if (req.url.startsWith('/api/busylight/ws') || req.url === '/api/busylight-ws') {
      httpWss.handleUpgrade(req, socket, head, (ws) => {
        httpWss.emit('connection', ws, req);
      });
    } else {
      console.log('[HTTP WebSocket] Unknown upgrade path, destroying socket');
      socket.destroy();
    }
  });
  
  httpServer.listen(HTTP_PORT, () => {
    console.log(`✓ HTTP Server running on port ${HTTP_PORT}`);
    console.log(`  Busylight Bridge: /api/busylight → ws://127.0.0.1:19774/ws (HTTP proxy to http://127.0.0.1:19774/kuando)`);
    console.log(`  Busylight WebSocket: /api/busylight-ws (Client connections)`);
    console.log(`  All other traffic redirected to HTTPS`);
  });
  
} else {
  // No SSL certificates - run HTTP only
  console.warn('⚠ SSL certificates not found. Running in HTTP mode.');
  console.warn('  PWA features require HTTPS!');
  console.warn('  Checked paths:');
  console.warn(`    - ${LETSENCRYPT_CERT}`);
  console.warn(`    - ${SSL_CERT_PATH}`);
  
  app.listen(HTTP_PORT, () => {
    console.log(`✓ HTTP Server running on http://connect365.servehttp.com:${HTTP_PORT}`);
  });
}

// Error handling
process.on('uncaughtException', (err) => {
  const errorMsg = `[${new Date().toISOString()}] Uncaught Exception: ${err.message}\n${err.stack}\n`;
  console.error('Uncaught Exception:', err);
  errorLogStream.write(errorMsg);
});

process.on('unhandledRejection', (err) => {
  const errorMsg = `[${new Date().toISOString()}] Unhandled Rejection: ${err.message}\n${err.stack}\n`;
  console.error('Unhandled Rejection:', err);
  errorLogStream.write(errorMsg);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  busylightBridge.shutdown();
  httpLogStream.end();
  httpsLogStream.end();
  errorLogStream.end();
  process.exit(0);
});
