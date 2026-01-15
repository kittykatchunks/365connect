/**
 * React App Production Server
 * Serves the built React app over HTTPS on port 444
 * 
 * Usage:
 *   NODE_ENV=production node server.js
 * 
 * Certificate paths can be customized via environment variables:
 *   SSL_CERT_PATH - Path to fullchain.pem
 *   SSL_KEY_PATH  - Path to privkey.pem
 */

const express = require('express');
const https = require('https');
const http = require('http');
const path = require('path');
const fs = require('fs');
const compression = require('compression');

const app = express();

// Configuration
const HTTPS_PORT = process.env.HTTPS_PORT || 444;
const HTTP_PORT = process.env.HTTP_PORT || 8080;

// SSL Certificate paths - same as main server.js (relative to project root)
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || path.join(__dirname, '..', 'certs', 'fullchain.pem');
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || path.join(__dirname, '..', 'certs', 'privkey.pem');

// Enable compression
app.use(compression());

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Serve static files from dist folder
const distPath = path.join(__dirname, 'dist');
console.log(`[Server] Serving static files from: ${distPath}`);

app.use(express.static(distPath, {
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    // Service worker - never cache
    if (filePath.endsWith('sw.js') || filePath.endsWith('service-worker.js')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return;
    }
    
    // Manifest - short cache
    if (filePath.endsWith('manifest.json') || filePath.endsWith('manifest.webmanifest')) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      res.setHeader('Content-Type', 'application/manifest+json');
      return;
    }
    
    // HTML - no cache
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      return;
    }
    
    // Hashed assets (Vite build output) - cache forever
    if (filePath.match(/\.[a-f0-9]{8,}\.(js|css)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return;
    }
    
    // Images and fonts - cache for 1 week
    if (filePath.match(/\.(png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|eot|mp3|wav)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=604800');
      return;
    }
    
    // Default - short cache
    res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
  }
}));

// SPA fallback - serve index.html for all non-file routes
app.get('*', (req, res) => {
  const ext = path.extname(req.path);
  
  // If requesting a file that wasn't found, return 404
  if (ext && ext !== '.html') {
    return res.status(404).send('File not found');
  }
  
  // Serve index.html for SPA routes
  res.sendFile(path.join(distPath, 'index.html'));
});

// Determine SSL certificates - use same certs as main server.js
let sslOptions = null;

if (fs.existsSync(SSL_CERT_PATH) && fs.existsSync(SSL_KEY_PATH)) {
  sslOptions = {
    cert: fs.readFileSync(SSL_CERT_PATH),
    key: fs.readFileSync(SSL_KEY_PATH)
  };
  console.log(`✓ Using SSL certificates from: ${SSL_CERT_PATH}`);
}

// Start server
if (sslOptions) {
  const httpsServer = https.createServer(sslOptions, app);
  
  httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  365Connect React App - Production Server`);
    console.log(`${'='.repeat(60)}`);
    console.log(`  HTTPS Server: https://0.0.0.0:${HTTPS_PORT}`);
    console.log(`  Static Files: ${distPath}`);
    console.log(`${'='.repeat(60)}\n`);
  });
  
  // Optional: HTTP redirect to HTTPS
  const httpApp = express();
  httpApp.use((req, res) => {
    const host = req.headers.host?.replace(`:${HTTP_PORT}`, `:${HTTPS_PORT}`) || `localhost:${HTTPS_PORT}`;
    res.redirect(301, `https://${host}${req.url}`);
  });
  
  http.createServer(httpApp).listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`  HTTP Redirect: http://0.0.0.0:${HTTP_PORT} → https`);
  });
  
} else {
  console.warn('\n⚠ SSL certificates not found!');
  console.warn('  Checked path:');
  console.warn(`    - ${SSL_CERT_PATH}`);
  console.warn(`    - ${SSL_KEY_PATH}`);
  console.warn('\n  Running HTTP-only mode (PWA features require HTTPS)\n');
  
  app.listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  365Connect React App - Development Server (HTTP)`);
    console.log(`${'='.repeat(60)}`);
    console.log(`  HTTP Server: http://0.0.0.0:${HTTP_PORT}`);
    console.log(`  Static Files: ${distPath}`);
    console.log(`${'='.repeat(60)}\n`);
  });
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down...');
  process.exit(0);
});
