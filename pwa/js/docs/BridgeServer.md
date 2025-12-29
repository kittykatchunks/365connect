BusylightBridgeServer — bridge-server.js

Purpose
- Implements a WebSocket-based bridge for Busylight clients (Kuando/Kuando Busylight) and provides an HTTP-to-WebSocket proxy for the Connect365 PWA.
- Routes API calls from the PWA or HTTP endpoints to connected bridge clients, correlating requests and responses.

Class: `BusylightBridgeServer`
- Location: `bridge-server.js`
- Exports: `module.exports = BusylightBridgeServer`

Primary properties
- `bridges` (Map): uniqueId -> bridgeInfo { ws, uniqueId, connectionId, connectedAt, registeredAt, lastSeen, info, pendingRequests }
- `bridgesByConnectionId` (Map): temporary connections before registration (connectionId -> { ws, connectionId, connectedAt, registered })
- `clients` (Map): legacy PWA/clients connected via WebSocket
- `pendingRequests` (Map): tracks outgoing requests by generated `requestId` and their promise handlers
- `requestTimeout`: default request timeout (30s)

Key methods
- `registerBridge(ws, connectionId)`: accept new bridge WS, attach message/close/error handlers, send welcome message.
- `unregisterBridge(uniqueId)`: unregister and reject pending requests for that bridge.
- `handleBridgeMessage(connectionId, message)`: main handler for messages from bridges (types: `bridge_register`, `api_response`, `pong`, ...).
- `sendToBridge(uniqueId, action, params)`: send an `api_request` message to a bridge and return a Promise resolved/rejected on `api_response` (uses `requestId` correlation and timeouts).
- `registerClient(ws, clientId)` / `unregisterClient(clientId)`: manage PWA (legacy) clients.
- `handleClientMessage(clientId, message)`: receives client WS messages, maps client actions to bridge actions (e.g., `busylightdevices` → `devices`), forwards via `sendToBridge`, and replies to client.
- `createHttpMiddleware()`: Express middleware that translates HTTP requests under `/api/busylight` to bridge actions, forwards via `sendToBridge`, and returns JSON responses.
- `broadcastToClients(message)`: broadcast arbitrary messages to all connected client sockets.
- `getStatus()`: return current server status (bridges, bridgeList, pendingRequests, clients).
- `shutdown()`: gracefully close clients and bridge connections and clear pending requests.

Message types and flow
- Bridge → server
  - `bridge_register` (contains `uniqueId` or `connect365Username`, `version`, `kuandoConnected`): completes registration and moves a temporary connection to `bridges` map.
  - `api_response` (contains `requestId` and success/data or error): resolves the matching promise stored in `pendingRequests`.
  - `pong`: keepalive; updates `lastSeen`.

- Server → bridge
  - `api_request` { type: 'api_request', requestId, action, params, targetUser }
  - The bridge is expected to process the action and reply with `api_response` containing `requestId`.

HTTP mapping (middleware)
- Routes under `/api/busylight` are inspected and mapped to actions: `/devices` → `devices`, `/status` → `status`, `/light` → `light` (body used for params), `/alert`, `/ringing`, `/busy`, `/available`, `/hold`, etc.
- Uses header `x-connect365-username` or `bridgeId` query param to route to a specific bridge. If absent, uses the first connected bridge.
- Returns 503 if no bridges connected, 404 if specified target not connected.

Concurrency and correlation
- `sendToBridge()` generates a random `requestId` (crypto) and stores a promise in `this.pendingRequests` keyed by `requestId` with a timeout. When a matching `api_response` arrives, the promise resolves or rejects.

Error handling and timeouts
- If a bridge disconnects, pending requests for that bridge are rejected.
- Requests time out after `requestTimeout` and reject the caller.

Usage notes
- The server logs connection/registration status and expects bridges to register with a Connect365 username as their `uniqueId`.
- The module provides legacy client WS support (PWA can connect to server directly and send actions over WS), but the preferred path for HTTP clients is using the middleware.

Integration points
- PWA HTTP calls to `/api/busylight` (or equivalent JS that hits that route) are proxied to bridge clients.
- Bridges connect over WebSocket to this server (reverse connection mode) and register with `bridge_register`.

Caveats and maintainers notes
- The implementation assumes trust in `uniqueId` provided by bridges; consider authentication or token validation if needed.
- If multiple bridges register with same `uniqueId` the older connection is closed/replaced.
- Keep `requestTimeout` tuned to expected latency of bridge responses.

File location
- `bridge-server.js` (project root)

