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
const BusylightBridgeServer = require('./bridge-server');

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
      imgSrc: ["'self'", "data:", "blob:"],
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
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(compression());

// Parse JSON bodies for API endpoints
app.use(express.json());

// Determine static folder based on environment
const staticFolder = process.env.NODE_ENV === 'production' 
  ? path.join(__dirname, 'dist')
  : path.join(__dirname, 'pwa');

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

app.use('/api/phantom', createProxyMiddleware({
  target: 'https://server1-000.phantomapi.net:443',  // Default fallback
  changeOrigin: true,
  pathRewrite: (path, req) => {
    // Strip phantomId query parameter and rewrite path
    const url = new URL(path, 'http://dummy-base');
    url.searchParams.delete('phantomId');
    const cleanPath = url.pathname + (url.search || '');
    return cleanPath.replace(/^\/api\/phantom/, '/api');
  },
  router: (req) => {
    // Extract phantomId from query string
    const phantomId = req.query.phantomId || '000';
    console.log(`[PROXY ROUTER] phantomId: ${phantomId}`);
    const apiPort = process.env.PHANTOM_API_PORT || 443;
    const target = `https://server1-${phantomId}.phantomapi.net:${apiPort}`;
    console.log(`[PROXY ROUTER] Routing to: ${target}`);
    return target;
  },
  onProxyReq: (proxyReq, req, res) => {
    const phantomId = req.query.phantomId || '000';
    const apiUsername = process.env.PHANTOM_API_USERNAME;
    const apiKey = process.env.PHANTOM_API_KEY;
    const host = req.headers.host || 'unknown';
    
    // Add Basic Auth header
    if (apiUsername && apiKey) {
      const authString = Buffer.from(`${apiUsername}:${apiKey}`).toString('base64');
      proxyReq.setHeader('Authorization', `Basic ${authString}`);
    }
    
    // Get the actual path being called after rewrite
    const originalPath = req.originalUrl;
    const url = new URL(originalPath, 'http://dummy-base');
    url.searchParams.delete('phantomId');
    const cleanPath = url.pathname + (url.search || '');
    const rewrittenPath = cleanPath.replace(/^\/api\/phantom/, '/api');
    const targetUrl = `https://server1-${phantomId}.phantomapi.net:${PROXY_PORT}${rewrittenPath}`;
    
    console.log(`  🔄 PROXY TRANSLATION:`);
    console.log(`     Input:  https://${host}${originalPath}`);
    console.log(`     Output: ${targetUrl}`);
    console.log(`     PhantomID: ${phantomId}`);
    console.log(`     Auth: ${apiUsername && apiKey ? '✅ Basic Auth (' + apiUsername + ')' : '⚠️ Missing credentials'}`);
    
    // Log remaining query params if present
    if (url.search && url.search !== '?') {
      console.log(`     Query Params:`);
      for (const [key, value] of url.searchParams) {
        console.log(`       • ${key} = ${value}`);
      }
    }
    
    // Log request body if present
    if (req.body && Object.keys(req.body).length > 0) {
      console.log(`     Body: ${JSON.stringify(req.body)}`);
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    let responseBody = '';
    const statusIcon = proxyRes.statusCode >= 400 ? '❌' : '✅';
    
    console.log(`  ${statusIcon} PROXY RESPONSE:`);
    console.log(`     Status: ${proxyRes.statusCode} ${proxyRes.statusMessage}`);
    console.log(`     Content-Type: ${proxyRes.headers['content-type'] || 'unknown'}`);
    
    proxyRes.on('data', (chunk) => {
      responseBody += chunk.toString();
    });
    
    proxyRes.on('end', () => {
      if (responseBody.length > 0) {
        try {
          const parsed = JSON.parse(responseBody);
          const preview = JSON.stringify(parsed).substring(0, 200);
          console.log(`     Body Preview: ${preview}${responseBody.length > 200 ? '...' : ''}`);
        } catch {
          const preview = responseBody.substring(0, 200);
          console.log(`     Body Preview: ${preview}${responseBody.length > 200 ? '...' : ''}`);
        }
      }
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

// Handle OPTIONS preflight for proxy routes explicitly
app.options('/api/phantom-noauth/*', cors());
app.options('/api/phantom/*', cors());
app.options('/api/busylight/*', cors());

// NoAuth Phantom API Proxy (Port 19773 - No Authentication)
app.use('/api/phantom-noauth', createProxyMiddleware({
  target: 'https://server1-000.phantomapi.net:19773',  // Default fallback
  changeOrigin: true,
  pathRewrite: (path, req) => {
    // Strip phantomId query parameter and rewrite path
    const url = new URL(path, 'http://dummy-base');
    url.searchParams.delete('phantomId');
    const cleanPath = url.pathname + (url.search || '');
    return cleanPath.replace(/^\/api\/phantom-noauth/, '/api');
  },
  router: (req) => {
    // Extract phantomId from query string
    const phantomId = req.query.phantomId || '000';
    console.log(`[NOAUTH PROXY ROUTER] phantomId: ${phantomId}`);
    const noAuthPort = process.env.PHANTOM_NOAUTH_PORT || 19773;
    const target = `https://server1-${phantomId}.phantomapi.net:${noAuthPort}`;
    console.log(`[NOAUTH PROXY ROUTER] Routing to: ${target}`);
    return target;
  },
  onProxyReq: (proxyReq, req, res) => {
    const phantomId = req.query.phantomId || '000';
    const host = req.headers.host || 'unknown';
    const noAuthPort = process.env.PHANTOM_NOAUTH_PORT || 19773;
    
    // Get the actual path being called after rewrite (with phantomId stripped)
    const originalPath = req.originalUrl;
    const url = new URL(originalPath, 'http://dummy-base');
    url.searchParams.delete('phantomId');
    const cleanPath = url.pathname + (url.search || '');
    const rewrittenPath = cleanPath.replace(/^\/api\/phantom-noauth/, '/api');
    const targetUrl = `https://server1-${phantomId}.phantomapi.net:${noAuthPort}${rewrittenPath}`;
    
    console.log(`  🔄 NOAUTH PROXY TRANSLATION:`);
    console.log(`     Input:  https://${host}${originalPath}`);
    console.log(`     Output: ${targetUrl}`);
    console.log(`     PhantomID: ${phantomId}`);
    console.log(`     Auth: ❌ None (NoAuth endpoint)`);
    
    // Log remaining query params if present (phantomId already removed)
    if (url.search && url.search !== '?') {
      console.log(`     Query Params:`);
      for (const [key, value] of url.searchParams) {
        console.log(`       • ${key} = ${value}`);
      }
    }
    
    // Log request body if present
    if (req.body && Object.keys(req.body).length > 0) {
      console.log(`     Body: ${JSON.stringify(req.body)}`);
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    let responseBody = '';
    const statusIcon = proxyRes.statusCode >= 400 ? '❌' : '✅';
    
    console.log(`  ${statusIcon} NOAUTH PROXY RESPONSE:`);
    console.log(`     Status: ${proxyRes.statusCode} ${proxyRes.statusMessage}`);
    console.log(`     Content-Type: ${proxyRes.headers['content-type'] || 'unknown'}`);
    
    proxyRes.on('data', (chunk) => {
      responseBody += chunk.toString();
    });
    
    proxyRes.on('end', () => {
      if (responseBody.length > 0) {
        try {
          const parsed = JSON.parse(responseBody);
          const preview = JSON.stringify(parsed).substring(0, 200);
          console.log(`     Body Preview: ${preview}${responseBody.length > 200 ? '...' : ''}`);
        } catch {
          const preview = responseBody.substring(0, 200);
          console.log(`     Body Preview: ${preview}${responseBody.length > 200 ? '...' : ''}`);
        }
      }
    });
    
    delete proxyRes.headers['www-authenticate'];
  },
  onError: (err, req, res) => {
    console.log(`  ❌ NOAUTH PROXY ERROR:`);
    console.log(`     URL: ${req.originalUrl}`);
    console.log(`     Error: ${err.message}`);
    console.log(`     Code: ${err.code || 'UNKNOWN'}`);
    if (err.code === 'ECONNREFUSED') {
      console.log(`     💡 Hint: Target server may be down or unreachable`);
    }
    res.status(502).json({ error: 'Proxy error', message: err.message });
  }
}));

// Busylight Bridge HTTP middleware
app.use('/api/busylight', busylightBridge.createHttpMiddleware());

// Busylight Bridge status endpoint
app.get('/api/busylight-status', (req, res) => {
  res.json(busylightBridge.getStatus());
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

// Health check endpoint
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
