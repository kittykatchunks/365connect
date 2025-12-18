# Autocab365Connect Node.js Serving Layer

This project serves the Autocab365Connect PWA using a Node.js Express server. It provides static file serving, API proxying for Phantom API, and basic monitoring endpoints.

## Quick Start

1. Copy `.env.example` to `.env` and set your PhantomID and desired port:
   ```
   PHANTOM_API_BASE_URL=https://server1-<PhantomID>.phantomapi.net
   PORT=3000
   NODE_ENV=production
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Start the server:
   ```
   npm start
   ```
4. Access the app at [http://localhost:3000](http://localhost:3000)

## Features
- Serves PWA static files from `/pwa`
- Proxies `/api/phantom/*` to Phantom API (remote)
- Provides `/api/config` endpoint for SIP/WebSocket config
- Health check endpoint: `/health`
- Security middleware: helmet, CORS, compression, rate limiting
- Logging for requests and proxy errors

## Notes
- **Busylight**: Connects directly to `http://localhost` on your machine. No proxy needed.
- **SIP/WebRTC**: Browser connects directly to Asterisk PBX (WebSocket, not proxied).
- **localStorage**: Used for UI preferences, recent calls, contacts cache (client-side only).

## Production
- For production, consider using PM2 (see `ecosystem.config.js`) or Docker (see `Dockerfile`).

## Troubleshooting
- If you see errors, check your `.env` settings and ensure the Phantom API server is reachable.
- Use the `/health` endpoint to verify backend connectivity.

---
This server is a lightweight serving layer. All business logic, authentication, and SIP/media flows remain in the browser and remote servers.