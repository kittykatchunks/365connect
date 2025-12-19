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

const app = express();
const HTTP_PORT = 80;
const HTTPS_PORT = 443;
const PROXY_PORT = 19773;
const PHANTOM_API_BASE_URL = process.env.PHANTOM_API_BASE_URL || 'https://server1-000.phantomapi.net';

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
  target: 'https://server1-000.phantomapi.net:19773',  // Default fallback
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
  https.createServer(sslOptions, app).listen(HTTPS_PORT, () => {
    console.log(`✓ HTTPS Server running on https://connect365.servehttp.com:${HTTPS_PORT}`);
    console.log(`  Certificate source: ${certSource}`);
  });
  
  // Start HTTP redirect server
  http.createServer((req, res) => {
    res.writeHead(301, { 
      Location: `https://${req.headers.host}${req.url}` 
    });
    res.end();
  }).listen(HTTP_PORT, () => {
    console.log(`✓ HTTP redirect server running on port ${HTTP_PORT} → HTTPS`);
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
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});
