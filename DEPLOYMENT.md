# Deployment Guide

## Why is the `dist/` folder empty?

The `dist/` folder contains **build output** and is excluded from Git (listed in `.gitignore`). This is intentional and follows best practices:

- Build artifacts should not be committed to version control
- Each deployment should build from source
- Ensures consistent builds across environments
- Reduces repository size

## Deployment Steps

### First-Time Setup on New Server/Location

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd Connect365

# 2. Install dependencies
npm install

# 3. Build the application
npm run build

# 4. Start production server
npm run serve:prod
```

### Updating Existing Deployment

```bash
# 1. Pull latest changes
git pull

# 2. Update dependencies (if package.json changed)
npm install

# 3. Rebuild application
npm run build

# 4. Restart server
npm run serve:prod
```

## Quick Deployment Script

Create a deployment script for easier updates:

**Windows PowerShell (`deploy.ps1`):**
```powershell
Write-Host "Starting deployment..." -ForegroundColor Green
git pull
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Building application..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Deployment complete! Starting server..." -ForegroundColor Green
npm run serve:prod
```

**Linux/Mac (`deploy.sh`):**
```bash
#!/bin/bash
set -e

echo "Starting deployment..."
git pull

echo "Installing dependencies..."
npm install

echo "Building application..."
npm run build

echo "Deployment complete! Starting server..."
npm run serve:prod
```

## Production Server Setup

### Using PM2 (Process Manager)

PM2 keeps your server running and auto-restarts on crashes:

```bash
# Install PM2 globally
npm install -g pm2

# Start application with PM2
pm2 start npm --name "connect365" -- run serve:prod

# Save PM2 process list
pm2 save

# Setup PM2 to start on system boot
pm2 startup

# View logs
pm2 logs connect365

# Restart after deployment
pm2 restart connect365
```

### Deployment with PM2

```bash
git pull
npm install
npm run build
pm2 restart connect365
```

## CI/CD Pipeline (GitHub Actions)

For automated deployments, create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build application
        run: npm run build
        
      - name: Deploy to server
        uses: appleboy/scp-action@master
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          source: "dist/,package.json,server.js"
          target: "/var/www/connect365"
```

## Environment-Specific Builds

If you need different builds for different environments:

```bash
# Development build (with source maps)
npm run build:dev

# Production build (optimized)
npm run build
```

## Troubleshooting

### "Cannot GET /" after deployment
- Ensure you built the application: `npm run build`
- Check NODE_ENV is set to production
- Verify dist/ folder exists and contains files

### Changes not appearing
1. Rebuild: `npm run build`
2. Hard refresh browser: Ctrl+Shift+R
3. Unregister service worker in DevTools
4. Restart server

### Build fails on deployment server
- Check Node.js version: `node --version` (requires 14+)
- Clear npm cache: `npm cache clean --force`
- Delete node_modules: `rm -rf node_modules && npm install`

## Important Notes

✅ **Always build after pulling changes**  
✅ **Never commit the `dist/` folder to Git**  
✅ **Each deployment location needs its own build**  
✅ **Keep source files in `/pwa` directory**  
✅ **Build output goes to `/dist` directory**

## File Structure

```
Connect365/
├── pwa/                    # SOURCE FILES (commit these)
│   ├── js/
│   ├── css/
│   ├── index.html
│   └── ...
├── dist/                   # BUILD OUTPUT (don't commit)
│   ├── app.[hash].js
│   ├── styles.[hash].css
│   ├── index.html
│   └── ...
├── server.js               # Server (commit)
├── webpack.config.js       # Build config (commit)
├── package.json            # Dependencies (commit)
└── .gitignore              # Excludes dist/ (commit)
```

## What to Commit vs. What to Build

### Commit to Git:
- Source files in `/pwa`
- `server.js`
- `webpack.config.js`
- `package.json`
- `package-lock.json`
- Documentation files

### Build on Each Deployment:
- `/dist` folder contents
- Generated bundles with hashes
- Processed HTML

This approach ensures:
- Clean version control
- Consistent builds
- No merge conflicts in build artifacts
- Smaller repository size
