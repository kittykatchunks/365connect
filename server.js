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
const WebSocket = require('ws');

const app = express();
const HTTP_PORT = 80;
const HTTPS_PORT = 443;
const PROXY_PORT = process.env.PHANTOM_API_PORT || 19773;
const PHANTOM_API_BASE_URL = process.env.PHANTOM_API_BASE_URL || 'https://server1-000.phantomapi.net';
const BUSYLIGHT_BRIDGE_URL = process.env.BUSYLIGHT_BRIDGE_URL || 'http://localhost:19774';

// Let's Encrypt certificate paths
const LETSENCRYPT_CERT = './certs/fullchain.pem';
const LETSENCRYPT_KEY = './certs/privkey.pem';

// Fallback to custom certs
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || './certs/privkey.pem';
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || './certs/fullchain.pem';

// Simple logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
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

// Basic rate limiting (100 requests per 15 minutes per IP)
/*
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
}));
*/

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.protocol} ${req.method} ${req.originalUrl}`);
  console.log(`Host: ${req.get('host')}`);
  console.log(`User-Agent: ${req.get('user-agent')}`);
  next();
});

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
    const apiPort = process.env.PHANTOM_API_PORT || 19773;
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

// Busylight Bridge HTTP proxy
app.use('/api/busylight', createProxyMiddleware({
  target: BUSYLIGHT_BRIDGE_URL,
  changeOrigin: true,
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
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
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
}));

// Configuration endpoint for SIP/WebSocket
app.get('/api/config', (req, res) => {
  const phantomId = req.query.phantomId || '000';
  const domain = `server1-${phantomId}.phantomapi.net`;
  const wssPort = 8089;
  const wssPath = '/ws';
  const sipPort = 5061;
  const sipServer = domain;
  const apiPort = process.env.PHANTOM_API_PORT || 19773;
  
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
  
  // WebSocket proxy for Busylight Bridge
  httpsServer.on('upgrade', (request, socket, head) => {
    if (request.url.startsWith('/api/busylight/ws')) {
      console.log(`[BUSYLIGHT WS] Upgrade request from ${request.headers.origin}`);
      
      // Create WebSocket connection to local bridge
      const bridgeWs = new WebSocket('ws://localhost:19774/ws');
      
      bridgeWs.on('open', () => {
        console.log('[BUSYLIGHT WS] Connected to local bridge');
        
        // Complete the upgrade
        socket.write(
          'HTTP/1.1 101 Switching Protocols\r\n' +
          'Upgrade: websocket\r\n' +
          'Connection: Upgrade\r\n' +
          `Sec-WebSocket-Accept: ${generateWebSocketAccept(request.headers['sec-websocket-key'])}\r\n` +
          '\r\n'
        );
        
        // Proxy messages between client and bridge
        socket.on('data', (data) => {
          if (bridgeWs.readyState === WebSocket.OPEN) {
            bridgeWs.send(data);
          }
        });
        
        bridgeWs.on('message', (data) => {
          socket.write(data);
        });
        
        bridgeWs.on('close', () => {
          console.log('[BUSYLIGHT WS] Bridge connection closed');
          socket.end();
        });
        
        socket.on('close', () => {
          console.log('[BUSYLIGHT WS] Client connection closed');
          bridgeWs.close();
        });
      });
      
      bridgeWs.on('error', (err) => {
        console.error('[BUSYLIGHT WS] Bridge connection error:', err.message);
        socket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
        socket.end();
      });
    }
  });
  
  httpsServer.listen(HTTPS_PORT, () => {
    console.log(`✓ HTTPS Server running on https://connect365.servehttp.com:${HTTPS_PORT}`);
    console.log(`  Certificate source: ${certSource}`);
    console.log(`  Busylight Bridge proxy: /api/busylight → ${BUSYLIGHT_BRIDGE_URL}`);
    console.log(`  Busylight WebSocket proxy: wss://connect365.servehttp.com/api/busylight/ws → ws://localhost:19774/ws`);
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

// Helper function to generate WebSocket accept key
function generateWebSocketAccept(key) {
  const crypto = require('crypto');
  const magicString = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
  return crypto
    .createHash('sha1')
    .update(key + magicString)
    .digest('base64');
}

// Error handling
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});
