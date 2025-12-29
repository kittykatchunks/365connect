# Connect365 Build Process

## Overview

The PWA is now equipped with a Webpack build process that bundles and optimizes your application for production.

## What Was Changed

### 1. **Caching Strategy Fixed** ✅
- Updated `server.js` with smart caching rules
- Service worker and manifest: no-cache
- HTML files: no-cache, must-revalidate
- Versioned/hashed assets: cache forever (immutable)
- Application JS/CSS: 1-hour cache with revalidation
- Libraries: 1-week cache
- Images/fonts: 1-week cache

### 2. **Webpack Build System** ✅
- Bundles 16 separate JS files into optimized chunks
- Minifies JavaScript and CSS in production
- Generates content-based hashes for cache busting
- Creates source maps for debugging
- Copies static assets (libraries, icons, media, etc.)

### 3. **Dual Mode Operation**
- **Development**: Serves from `/pwa` (original source files)
- **Production**: Serves from `/dist` (bundled & optimized)

## Build Commands

```bash
# Development build (faster, with source maps)
npm run build:dev

# Production build (optimized, minified)
npm run build

# Watch mode (rebuilds on file changes)
npm run watch
```

## Running the Server

```bash
# Development mode (serves from /pwa)
npm run serve:dev
# or
npm run dev

# Production mode (serves from /dist)
npm run serve:prod
# or
set NODE_ENV=production && npm start
```

## Build Output

The build creates a `/dist` folder with:

```
dist/
├── app.[hash].js          # Bundled application code (260KB)
├── app.[hash].js.map      # Source map for debugging
├── styles.[hash].css      # Bundled & minified CSS (66KB)
├── styles.[hash].css.map  # CSS source map
├── index.html            # Processed HTML with injected bundles
├── sw.js                 # Service worker (copied as-is)
├── manifest.json         # PWA manifest
├── favicon.ico
├── lib/                  # Libraries (jQuery, SIP.js, etc.)
├── icons/                # PWA icons
├── images/               # Image assets
├── media/                # Audio files
└── lang/                 # Translation files
```

**Total build size:** ~5.1 MB (mostly libraries and media)

## Performance Improvements

### Before (No Build)
- 16 separate HTTP requests for JS files
- No minification
- No code optimization
- ~550KB total unminified JS
- Sequential loading

### After (With Build)
- 1 main bundle + vendor chunks
- Minified & optimized
- ~260KB bundled JS
- Parallel loading with code splitting
- Content-based cache busting

## Development Workflow

### Quick Development (No Build)
```bash
npm run dev
```
Access at: `http://localhost` or `https://localhost`

The server will serve directly from `/pwa` - no build needed for development.

### Production Deployment

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Set environment to production:**
   ```bash
   # Windows PowerShell
   $env:NODE_ENV="production"
   npm start
   
   # Windows CMD
   set NODE_ENV=production && npm start
   
   # Linux/Mac
   NODE_ENV=production npm start
   ```

3. **Or use the production script:**
   ```bash
   npm run serve:prod
   ```

## File Organization

- **Source files:** `/pwa` (edit these)
- **Build output:** `/dist` (generated, don't edit)
- **Build config:** `webpack.config.js`
- **Server:** `server.js` (auto-detects NODE_ENV)

## Caching Headers Explained

| File Type | Cache Duration | Reasoning |
|-----------|---------------|-----------|
| Service Worker | No cache | Must always be fresh to update app |
| Manifest.json | No cache | Check for app updates |
| HTML files | No cache | Entry point should fetch latest |
| Hashed assets | 1 year (immutable) | Hash changes = new file |
| Libraries (/lib) | 1 week | Third-party libs rarely change |
| App JS/CSS | 1 hour | Balance between performance & updates |
| Images/Fonts | 1 week | Static assets |

## Troubleshooting

### Build fails with "Cannot find module"
```bash
npm install
```

### Changes not appearing
1. Clear browser cache (hard refresh: Ctrl+Shift+R)
2. Rebuild: `npm run build`
3. Unregister service worker in DevTools
4. Restart server

### Large bundle warning
The warning about large assets is expected:
- Icons are large PNG files (needed for PWA)
- To fix: optimize icons or use WebP format

### Source maps missing
Source maps are generated automatically:
- Production: separate `.map` files
- Development: inline source maps

## Next Steps

### Optional Improvements

1. **Optimize icons** - Convert large PNGs to WebP
2. **Code splitting** - Lazy load rarely-used features
3. **PWA precaching** - Update service worker with Workbox
4. **Bundle analysis** - Use webpack-bundle-analyzer
5. **Tree shaking** - Remove unused code (works automatically)

### Adding New JS Files

If you add new `.js` files to `/pwa/js/`, update `webpack.config.js`:

```javascript
entry: {
  app: [
    './pwa/js/your-new-file.js',
    // ... rest of files
  ]
}
```

Then rebuild: `npm run build`

## Notes

- The build process is **optional for development** - you can still run directly from `/pwa`
- The `.gitignore` now excludes `/dist` - don't commit build output
- Libraries in `/lib` are copied as-is (not bundled) - they're already minified
- Service worker is copied without processing - it must remain unbundled

## Environment Variables

The server respects `NODE_ENV`:
- `development` (default) → serves from `/pwa`
- `production` → serves from `/dist`

Set via:
```bash
# PowerShell
$env:NODE_ENV="production"

# CMD
set NODE_ENV=production

# Linux/Mac
export NODE_ENV=production
```
