require('dotenv').config();
const express = require('express');
const https = require('https');
const http = require('http');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Create write streams for logs
const httpLogStream = fs.createWriteStream(path.join(logsDir, 'http-access.log'), { flags: 'a' });
const httpsLogStream = fs.createWriteStream(path.join(logsDir, 'https-access.log'), { flags: 'a' });
const errorLogStream = fs.createWriteStream(path.join(logsDir, 'error.log'), { flags: 'a' });

// Custom logger function
function logRequest(stream, protocol, req, res) {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl || req.url;
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'] || '-';
  
  // Log when response finishes
  res.on('finish', () => {
    const statusCode = res.statusCode;
    const contentLength = res.get('content-length') || '-';
    const responseTime = res.get('x-response-time') || '-';
    
    const logLine = `[${timestamp}] ${protocol} ${ip} "${method} ${url}" ${statusCode} ${contentLength} "${userAgent}" ${responseTime}ms\n`;
    
    // Write to file
    stream.write(logLine);
    
    // Also log to console
    console.log(`[${protocol}] ${method} ${url} - ${statusCode}`);
  });
}

// Response time middleware
function responseTimeMiddleware(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    res.set('x-response-time', duration);
  });
  next();
}

const app = express();

// Add response time middleware first
app.use(responseTimeMiddleware);

const HTTP_PORT = 80;
const HTTPS_PORT = 443;
const PROXY_PORT = process.env.PHANTOM_API_PORT || 443;
const PHANTOM_API_BASE_URL = process.env.PHANTOM_API_BASE_URL || 'https://server1-000.phantomapi.net';
// const BUSYLIGHT_WS_BRIDGE_URL = process.env.BUSYLIGHT_WS_BRIDGE_URL || 'ws://127.0.0.1:19774/ws';
const BUSYLIGHT_BRIDGE_URL = process.env.BUSYLIGHT_BRIDGE_URL || 'http://127.0.0.1:19774';

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
  contentSecurityPolicy: false, // Adjust based on your PWA needs
}));

app.use(cors({
  origin: '*', // Restrict to your domain in production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(compression());



// Serve static files from /pwa with PWA-specific caching
app.use(express.static(path.join(__dirname, 'pwa'), {
  maxAge: '1y',
  setHeaders: (res, filePath) => {
    // Don't cache service worker
    if (filePath.endsWith('service-worker.js')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Expires', '0');
    }
    // Don't cache manifest
    if (filePath.endsWith('manifest.json')) {
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Content-Type', 'application/manifest+json');
    }
  }
}));

app.use('/api/phantom', createProxyMiddleware({
  target: 'https://server1-000.phantomapi.net:443',  // Default fallback
  changeOrigin: true,
  pathRewrite: {
    '^/api/phantom': '/api',
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
    
    if (apiUsername && apiKey) {
      const authString = Buffer.from(`${apiUsername}:${apiKey}`).toString('base64');
      proxyReq.setHeader('Authorization', `Basic ${authString}`);
      console.log(`[AUTH]    Added Basic Auth for user: ${apiUsername}`);
    } else {
      console.warn(`[AUTH]    Missing PHANTOM_API_USERNAME or PHANTOM_API_KEY in .env file`);
    }
    
    console.log(`\n========== PROXY REQUEST ==========`);
    console.log(`[TIME]    ${new Date().toISOString()}`);
    console.log(`[METHOD]  ${req.method}`);
    console.log(`[FROM]    ${req.originalUrl}`);
    console.log(`[TO]      https://server1-${phantomId}.phantomapi.net:${PROXY_PORT}/api`);
    console.log(`[HEADERS] ${JSON.stringify(req.headers, null, 2)}`);
    
    // Log request body if present
    if (req.body && Object.keys(req.body).length > 0) {
      console.log(`[BODY]    ${JSON.stringify(req.body, null, 2)}`);
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    let responseBody = '';
    
    proxyRes.on('data', (chunk) => {
      responseBody += chunk.toString();
    });
    
    proxyRes.on('end', () => {
      console.log(`\n========== PROXY RESPONSE ==========`);
      console.log(`[TIME]    ${new Date().toISOString()}`);
      console.log(`[STATUS]  ${proxyRes.statusCode} ${proxyRes.statusMessage}`);
      console.log(`[HEADERS] ${JSON.stringify(proxyRes.headers, null, 2)}`);
      try {
        const parsed = JSON.parse(responseBody);
        console.log(`[BODY]    ${JSON.stringify(parsed, null, 2)}`);
      } catch {
        console.log(`[BODY]    ${responseBody.substring(0, 500)}${responseBody.length > 500 ? '...' : ''}`);
      }
      console.log(`====================================\n`);
    });
    
    delete proxyRes.headers['www-authenticate'];
  },
  onError: (err, req, res) => {
    console.log(`\n========== PROXY ERROR ==========`);
    console.log(`[TIME]    ${new Date().toISOString()}`);
    console.log(`[URL]     ${req.originalUrl}`);
    console.log(`[ERROR]   ${err.message}`);
    console.log(`[STACK]   ${err.stack}`);
    console.log(`==================================\n`);
    res.status(502).json({ error: 'Proxy error', message: err.message });
  }
}));

// Busylight Bridge HTTP proxy with WebSocket support
const busylightProxy = createProxyMiddleware({
  target: BUSYLIGHT_BRIDGE_URL,
  changeOrigin: true,
  ws: true, // Enable WebSocket proxying
  pathRewrite: {
    '^/api/busylight': '/kuando',
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`\n========== BUSYLIGHT PROXY REQUEST ==========`);
    console.log(`[TIME]    ${new Date().toISOString()}`);
    console.log(`[METHOD]  ${req.method}`);
    console.log(`[FROM]    ${req.originalUrl}`);
    console.log(`[TO]      ${BUSYLIGHT_BRIDGE_URL}/kuando`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`[BUSYLIGHT] Response: ${proxyRes.statusCode}`);
  },
  onError: (err, req, res) => {
    console.log(`\n========== BUSYLIGHT PROXY ERROR ==========`);
    console.log(`[TIME]    ${new Date().toISOString()}`);
    console.log(`[URL]     ${req.originalUrl}`);
    console.log(`[ERROR]   ${err.message}`);
    console.log(`===========================================\n`);
    res.status(502).json({ error: 'Busylight Bridge unreachable', message: err.message });
  }
});

app.use('/api/busylight', busylightProxy);

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

// Fallback: serve index.html for SPA routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'pwa', 'index.html'));
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
  
  // Enable WebSocket upgrade handling for proxies
  httpsServer.on('upgrade', (req, socket, head) => {
    console.log(`[WebSocket] Upgrade request: ${req.url}`);
    if (req.url.startsWith('/api/busylight')) {
      busylightProxy.upgrade(req, socket, head);
    } else {
      socket.destroy();
    }
  });
  
  httpsServer.listen(HTTPS_PORT, () => {
    console.log(`✓ HTTPS Server running on https://connect365.servehttp.com:${HTTPS_PORT}`);
    console.log(`  Certificate source: ${certSource}`);
    console.log(`  Phantom API proxy: /api/phantom → https://server1-{phantomId}.phantomapi.net:${PROXY_PORT}/api`);
    //console.log(`  Busylight Bridge proxy: /api/busylight → ${BUSYLIGHT_BRIDGE_URL}/kuando`);
    console.log(`  WebSocket support: ENABLED for Busylight Bridge`);
  });
  
  // Start HTTP server for busylight-bridge proxy (no redirect for busylight endpoints)
  const httpApp = express();
  
  // Add response time middleware
  httpApp.use(responseTimeMiddleware);
  
  // HTTP logging middleware
  httpApp.use((req, res, next) => {
    logRequest(httpLogStream, 'HTTP', req, res);
    next();
  });
  
  // Allow busylight proxy on HTTP (WebSocket needs non-secure connection)
  httpApp.use('/api/busylight', busylightProxy);
  
  // Redirect all other HTTP traffic to HTTPS
  httpApp.use((req, res) => {
    res.writeHead(301, { 
      Location: `https://${req.headers.host}${req.url}` 
    });
    res.end();
  });
  
  const httpServer = http.createServer(httpApp);
  
  // Enable WebSocket upgrade handling for busylight proxy on HTTP
  httpServer.on('upgrade', (req, socket, head) => {
    console.log(`[HTTP WebSocket] Upgrade request: ${req.url}`);
    if (req.url.startsWith('/api/busylight')) {
      busylightProxy.upgrade(req, socket, head);
    } else {
      socket.destroy();
    }
  });
  
  httpServer.listen(HTTP_PORT, () => {
    console.log(`✓ HTTP Server running on port ${HTTP_PORT}`);
    console.log(`  Busylight Bridge proxy: http://server1-XXXX.phantomapi.net/api/busylight → ${BUSYLIGHT_BRIDGE_URL}/kuando`);
    console.log(`  WebSocket support: ENABLED for Busylight Bridge (http://127.0.0.1:19774/kuando)`);
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
  httpLogStream.end();
  httpsLogStream.end();
  errorLogStream.end();
  process.exit(0);
});
