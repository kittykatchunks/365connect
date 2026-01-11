# Connect365

**Version:** 0.2.002

Connect365 is a browser-based WebRTC SIP softphone Progressive Web App (PWA) designed for Autocab365 systems, powered by Phantom PBX. It provides a full-featured telephony experience with advanced features like Kuando Busylight integration, multi-language support, call history, contacts management, and BLF (Busy Lamp Field) monitoring.

## 🌟 Features

### Core Telephony
- **WebRTC SIP Client** - Browser-based softphone using SIP.js 0.21.2
- **Direct PBX Connection** - WebSocket connection to Asterisk/Phantom PBX (wss://your-pbx:8089/ws)
- **Call Controls** - Make/receive calls, hold, transfer (Blind/Attended), mute
- **Audio Management** - Input/output device selection, volume controls, audio quality settings
- **DTMF Support** - In-call dialpad for IVR navigation
- **Call Timer** - Real-time call duration tracking

### Advanced Features
- **Kuando Busylight Integration** - Hardware presence indicator support via bridge applications
  - Native Windows bridge (C# .NET 8) - Lightweight, ~30MB footprint
  - Remote bridge routing via WebSocket server
- **BLF (Busy Lamp Field)** - Monitor extension status and click-to-dial
- **Line Keys** - Programmable speed dial buttons
- **Call History** - Comprehensive call logging with 
- **Contacts Management** - Built-in contact database with comprehensive searching
- **Company Numbers** - Database of CLIP Company numbers allowing quick easy access change this for outgoing calls 
- **Multi-Language Support** - English, Spanish (ES/419), French (FR/CA), Dutch, Portuguese (PT/BR)
- **Progressive Web App** - Installable, offline-capable, works like a native app
- **Dark/Light Mode** - Automatic theme based on system preferences

### Server Infrastructure
- **Express Server** - Node.js serving layer with security middleware
- **Phantom API Proxy** - Secure proxying to Phantom PBX API
- **Busylight Bridge Server** - WebSocket server for remote busylight routing (port 8089)
- **HTTP/HTTPS Support** - Configurable with SSL certificate support
- **CORS & Security** - Helmet, rate limiting, compression
- **Detailed Logging** - Separate logs for HTTP/HTTPS/errors

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Phantom PBX with WebRTC enabled
- SIP account credentials
- (Optional) Kuando Busylight device and bridge application

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Connect365
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   
   Create a `.env` file in the root directory:
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=production
   
   # Phantom API
   PHANTOM_API_BASE_URL=https://server1-<YourPhantomID>.phantomapi.net
   
   # SSL (Optional - for HTTPS)
   SSL_KEY_PATH=./certs/key.pem
   SSL_CERT_PATH=./certs/cert.pem
   
   # Busylight Bridge (Optional)
   BRIDGE_WSS_PORT=8089
   ```

4. **Start the server**
   ```bash
   # Production mode
   npm start
   
   # Development mode (with nodemon)
   npm run dev
   ```

5. **Access the application**
   - HTTP: `http://localhost:3000`
   - HTTPS: `https://localhost:3000` (if SSL configured)

### First-Time Setup in Browser

1. Open the application in your browser
2. Navigate to Settings (⚙️ icon)
3. Configure your SIP account:
   - **Display Name:** Your name
   - **Username:** Your SIP extension
   - **Password:** Your SIP password
   - **Server:** Your PBX WebSocket URL (wss://your-pbx:8089)
4. Click "REGISTER" to connect
5. Grant microphone permissions when prompted

## 📦 Project Structure

```
Connect365/
├── server.js                    # Main Express server
├── bridge-server.js             # Busylight bridge WebSocket server
├── package.json                 # Dependencies and scripts
├── webpack.config.js            # Webpack build configuration
├── .env                         # Environment configuration (create this)
│
├── pwa/                         # Progressive Web App source
│   ├── index.html              # Main application HTML
│   ├── manifest.json           # PWA manifest
│   ├── sw.js                   # Service worker
│   ├── css/
│   │   └── phone.css          # Application styles
│   ├── js/                     # Application JavaScript modules
│   │   ├── app-startup.js     # Application initialization
│   │   ├── phone.js           # Main phone UI controller
│   │   ├── sip-session-manager.js    # SIP/WebRTC logic
│   │   ├── busylight-manager.js      # Busylight integration
│   │   ├── contacts-manager.js       # Contacts database
│   │   ├── call-history-manager.js   # Call history
│   │   ├── blf-button-manager.js     # BLF monitoring
│   │   └── ...                        # Other modules
│   ├── lang/                   # Translation files
│   ├── lib/                    # Third-party libraries
│   ├── icons/                  # PWA icons
│   ├── images/                 # Application images
│   └── media/                  # Audio files (ringtones, etc.)
│
├── busylight-bridge/            # Busylight bridge applications
│   ├── native-windows/         # C# .NET 8 native Windows app
│   │   ├── BusylightBridge/   # C# source code
│   │   ├── installer/         # NSIS installer scripts
│   │   ├── build.ps1          # Build script
│   │   └── README.md          # Native bridge documentation
│   └── electron/               # Electron cross-platform app
│       ├── main.js            # Electron main process
│       ├── package.json       # Electron dependencies
│       └── README.md          # Electron bridge documentation
│
├── certs/                       # SSL certificates (optional)
├── logs/                        # Server logs (auto-created)
│   ├── http-access.log
│   ├── https-access.log
│   └── error.log
│
└── Documentation files:
    ├── README.md                # This file
    ├── BUILD_GUIDE.md          # Webpack build instructions
    ├── BUSYLIGHT_COMPATIBILITY_UPDATE.md
    ├── BUSYLIGHT_REFACTOR_PROPOSAL.md
    ├── PHANTOM_API_README.md
    ├── PWA_FEATURES_DOCUMENTATION.md
    ├── TESTING_SIP_PROXY.md
    ├── TODO.md
    ├── UI_USAGE_SCENARIOS.md
    └── WEBSOCKET_FIX_SUMMARY.md
```

## 🔨 Development

### Build System

The project uses Webpack for bundling and optimization:

```bash
# Development build (with source maps)
npm run build:dev

# Production build (minified & optimized)
npm run build

# Watch mode (auto-rebuild on changes)
npm run watch
```

**Build output:** `/dist` folder (~5.1MB total)

### Server Modes

```bash
# Development (serves from /pwa source)
npm run serve:dev

# Production (serves from /dist build)
npm run serve:prod
```

### Serving Endpoints

- **`/`** - PWA application
- **`/api/phantom/*`** - Proxied Phantom API requests
- **`/api/busylight/*`** - Busylight bridge proxy (if bridge URL configured)
- **`/api/config`** - Client configuration endpoint
- **`/health`** - Health check endpoint
- **WebSocket `/ws/busylight-bridge`** (port 8089) - Busylight bridge connections

## 🔌 Busylight Integration

Connect365 supports Kuando Busylight devices for presence indication. Two bridge applications are available:

### Native Windows Bridge (Recommended)
- **Technology:** C# .NET 8, WinForms
- **Size:** ~15-30MB installed
- **Memory:** ~30-50MB RAM
- **Location:** `busylight-bridge/native-windows/`
- **Features:** System tray app, auto-start, native Windows integration

**Quick Start:**
```powershell
cd busylight-bridge/native-windows
.\build.ps1
# Run installer from publish/ folder
```

### Electron Bridge (Cross-Platform)
- **Technology:** Electron, Node.js
- **Size:** ~150-200MB installed
- **Memory:** ~100-200MB RAM
- **Location:** `busylight-bridge/electron/`
- **Features:** Cross-platform, system tray, auto-start

**Quick Start:**
```bash
cd busylight-bridge/electron
npm install
npm start
```

Both bridges:
- Connect to Kuando HTTP service (port 8989)
- Provide WebSocket connection to server (port 8089)
- Route requests using Connect365 username for multi-user support

See respective README files for detailed setup instructions.

## 🌐 Deployment

### Production Checklist
- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Configure SSL certificates for HTTPS
- [ ] Update CORS settings in `server.js` for your domain
- [ ] Build production assets: `npm run build`
- [ ] Use process manager (PM2) or systemd service
- [ ] Configure firewall (ports 3000, 8089)
- [ ] Set up reverse proxy (nginx/Apache) if needed
- [ ] Enable logging and monitoring

### Using PM2
```bash
npm install -g pm2
pm2 start server.js --name connect365
pm2 save
pm2 startup
```

### Docker Support
(See `Dockerfile` if available, or create one based on Node.js 18 Alpine)

## 🔧 Configuration

### SIP Settings (in-app)
- Display Name, Username, Password
- Server address (WebSocket URL)
- Advanced: STUN/TURN servers, codec preferences

### Audio Settings (in-app)
- Input/output device selection
- Ring device selection
- Volume controls
- Echo cancellation, noise suppression

### Busylight Settings (in-app)
- Bridge mode (local/remote)
- Remote server URL
- Status color customization
- Test controls

## 🗂️ Data Storage

All user data is stored locally in browser localStorage:
- SIP credentials (consider security implications)
- Call history
- Contacts
- UI preferences
- Language selection
- Audio device preferences

**Privacy:** No data is sent to external servers except:
- SIP signaling to your PBX
- Phantom API calls (proxied through server)
- Busylight bridge commands (WebSocket)

## 🐛 Troubleshooting

### Cannot Register to SIP
- Verify WebSocket URL format: `wss://your-server:8089`
- Check credentials
- Ensure PBX allows WebRTC connections
- Check browser console for errors
- Verify CORS settings on PBX

### No Audio in Calls
- Grant microphone permissions
- Check audio device selection in Settings
- Verify device is not in use by another application
- Check browser audio settings

### Busylight Not Working
- Ensure Kuando HTTP service is running (port 8989)
- Verify bridge application is running
- Check bridge connection status in app
- For remote mode, verify server WebSocket port 8089 is accessible

### Build Errors
- Clear node_modules: `rm -rf node_modules && npm install`
- Clear webpack cache: `rm -rf .cache dist`
- Check Node.js version: `node --version` (requires 18+)

## 📄 License

See [LICENSE](LICENSE) file for details.

## 🙏 Credits

- **SIP.js** - SIP over WebSocket library
- **jQuery & jQuery UI** - UI framework
- **Moment.js** - Date/time formatting
- **Font Awesome** - Icons
- **Croppie** - Image cropping for avatars

## 📞 Support

For issues, feature requests, or questions:
- Check documentation files in the repository
- Review [TODO.md](TODO.md) for known issues and planned features
- Consult PBX administrator for SIP configuration issues

---

**Connect365** - Professional browser-based telephony for Autocab365 systems.