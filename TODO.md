# Connect365 - Todo List

## 🚀 High Priority

### Features/Changes Before Release
- [ ] Ensure when put on hold that the screen also turns same color as button
- [ ] When connecting and API call to check if logged in, if company numbers tab is enabled, retrieve current CLIP outgoing and compare to company numbers - display as currently selected company on dial UI page for company numbers selector
- [ ] When unregistered and reconnecting, check returned value for pause state and ensure UI reflects this if agent is still logged in after re-registering
- [ ] BLF not recognising changes to connected/disconnected states of programmed devices, F5 does refresh state

### PWA & Installation
- [x] Fix duplicate service worker registration
- [x] Fix manifest.json error handling
- [x] Add Apple Touch Icons
- [ ] Test PWA installation on Edge, Chrome, Safari
- [ ] Add PWA screenshots to manifest.json
- [ ] Test offline functionality
- [ ] Add PWA update notification when new version available

### Busylight Integration
- [ ] Test busylight-bridge connection with actual hardware
- [ ] Document busylight setup process for end users
- [ ] Add busylight status indicator in UI
- [ ] Test auto-reconnect when bridge comes online
- [ ] Add busylight settings validation

### Build & Deployment
- [ ] Fix build:installer errors in busylight-bridge
- [ ] Test production build (NODE_ENV=production)
- [ ] Create automated deployment script
- [ ] Add version bumping automation
- [ ] Document deployment process

## 📋 Medium Priority

### SIP & Calling Features
- [ ] Test SIP registration with different servers
- [ ] Improve error messages for SIP connection failures
- [ ] Add call quality indicators
- [ ] Test call transfer (blind and attended)
- [ ] Add call recording UI indicators
- [ ] Test voicemail MWI (Message Waiting Indicator)

### UI/UX Improvements
- [ ] Test dark/light/auto theme switching
- [ ] Add loading states for async operations
- [ ] Improve mobile responsiveness
- [ ] Add tooltips for complex features
- [ ] Test keyboard shortcuts
- [ ] Add accessibility (ARIA) labels

### BLF (Busy Lamp Field)
- [ ] Test BLF with multiple extensions
- [ ] Add BLF status change animations
- [ ] Improve BLF button layout
- [ ] Test BLF with different SIP servers

### Audio Management
- [ ] Test audio device switching during calls
- [ ] Add audio device availability detection
- [ ] Test ringtone playback on different devices
- [ ] Add volume controls for ringer/speaker/mic

## 🔧 Low Priority

### Code Quality
- [ ] Add JSDoc comments to all public functions
- [ ] Refactor large functions (>100 lines)
- [ ] Add unit tests for core managers
- [ ] Set up ESLint configuration
- [ ] Add TypeScript definitions (optional)

### Documentation
- [ ] Update BUILD_GUIDE.md with latest process
- [ ] Add API documentation for Phantom integration
- [ ] Create user manual
- [ ] Add troubleshooting guide
- [ ] Document browser compatibility

### Features - Future
- [ ] Add video calling support
- [ ] Add screen sharing
- [ ] Add chat/messaging
- [ ] Add call analytics dashboard
- [ ] Add multi-language support expansion
- [ ] Add contact import/export
- [ ] Add call history export

## 🐛 Known Issues

- [ ] `npm start` fails in production mode - investigate NODE_ENV handling
- [ ] Busylight bridge installer build failing - check dependencies
- [ ] API config fetch returns ERR_NAME_NOT_RESOLVED for servehttp.com
- [ ] Service worker shows TypeScript fetch error in console

## 🔐 Security

- [ ] Review Content Security Policy (CSP) headers
- [ ] Audit all external dependencies
- [ ] Add rate limiting to API endpoints
- [ ] Review CORS configuration
- [ ] Add input sanitization for user data
- [ ] Test against XSS vulnerabilities

## 📱 Testing

### Browser Testing
- [ ] Edge (Windows)
- [ ] Chrome (Windows, Mac, Linux)
- [ ] Firefox (Windows, Mac, Linux)
- [ ] Safari (Mac, iOS)
- [ ] Mobile browsers (iOS Safari, Chrome Android)

### Device Testing
- [ ] Desktop (1920x1080, 1366x768)
- [ ] Tablet (iPad, Android tablets)
- [ ] Mobile (iPhone, Android phones)
- [ ] Different audio devices (USB, Bluetooth, built-in)

## 📦 Release Checklist

- [ ] Update VERSION file
- [ ] Update CHANGELOG.md
- [ ] Run all tests
- [ ] Test PWA installation
- [ ] Test production build
- [ ] Update documentation
- [ ] Create release notes
- [ ] Tag release in Git
- [ ] Deploy to production
- [ ] Verify deployment

## 💡 Ideas / Enhancements

- [ ] Add presence status (Available, Busy, Away, DND)
- [ ] Add call parking
- [ ] Add conference calling
- [ ] Add call queuing
- [ ] Add custom ringtones per contact
- [ ] Add call statistics
- [ ] Add integration with CRM systems
- [ ] Add browser extension for click-to-call

---

**Last Updated:** January 5, 2026
**Project:** Autocab365Connect PWA
**Maintainer:** James
