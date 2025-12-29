# Quick Test Commands

# Test Development Mode (serves from /pwa)
$env:NODE_ENV="development"
node server.js

# Test Production Mode (serves from /dist - requires build first)
npm run build
$env:NODE_ENV="production"
node server.js

# Or use the npm scripts:
npm run serve:dev
npm run serve:prod
