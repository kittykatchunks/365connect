# Connect365 - Todo List

## 🚀 High Priority

### Features/Changes Before Release
- [X] Ensure when put on hold that the screen also turns same color as button
- [X] When connecting and API call to check if logged in, if company numbers tab is enabled, retrieve current CLIP outgoing and compare to company numbers - display as currently selected company on dial UI page for company numbers selector
- [X] When unregistered and reconnecting, check returned value for pause state and ensure UI reflects this if agent is still logged in after re-registering
- [X] BLF not recognising changes to connected/disconnected states of programmed devices, F5 does refresh state
- [X] Reword the statement appearing when webpage is accessed initially (settings required etc.)
- [X] Review and complete localisation (e.g. languages)
- [X] If on another tab and an incoming call starts then the tab to maybe flash to alert the user, also check if answering with the windows notification of a call that the dial screen is automatically shown if on another tab

### UI improvements/Features
- [X] Poll every two minutes to try to subscribe to notfications for BLF keys
- [X] Option to override the default BLF transfer option for each individual BLF key.  To enable things like attended transfer to a speeddial with mobile number whilst still having blind transfer to agents etc.
    - [X] Creation of another tickbox in Modals used for creation/editing BLF buttons
    - [X] Selecting tickbox will use allow user to manually set the transfer method for the specific BLF key
    - [X] Label for tickbox should be 'Override default transfer method for this key'
    - [X] If tickbox is selected a dropdown should appear with two options available 'Blind'/'Attended' it should default to the opposite of the current selected default transfer method in settings
- [X] Ensure that manually creating Company Number entries that the Company ID is unique, maybe be good idea to automatically autofill the field in the Modal with the lowest available not used Company ID 
- [X] Remove unnecessary fields of 'created at' and 'updated at' currently being stored in Company Numbers in local storage
- [ ] Option to import/export parts of the local storage into file that can be used on other installations of the PWA (to make life easier for installtions)
    - [ ] Addition of Import/Export buttons in Settings under Diagnostics menu
    - [ ] When selecting Export button should export ALL exportable data to file
    - [ ] Local storage fields of BlfButtons, CompanyNumbers, contacts and tabVisibilitySettings to be exported
    - [ ] When selecting import a Modal should appear with the seperate Data parts available (user selectable) to Import
    - [ ] The modal should have all 4 tickbox options selected by default they should be named simply as BLF Buttons, Contacts, Company Numbers, Tabs Available
    - [ ] This data WILL overwrite existing data so probably good idea to warn with options to Continue/Cancel
- [ ] Find best way of increasing amount of BLF key available, may look at option in settings when BLF enabled to have dropdown with 20(default)/40/60 keys option.  Then maybe have a next/previous (or just next cycled around) to replace curreently shown with next 20 keys
- [ ] Create API call for Company Numbers from the Phantom server
    - [ ] This API call should only be enabled if Company Numbers tab is enabled in Settings
    - [ ] The API call will be https://server1-XXXX.phantomapi.net:{port number}/api/companyNumbers
    - [ ] On each loading of PWA the API should initiate call, there should also be option to refresh manually in Company Numbers tab (between delete all and the import/export buttons)
    - [ ] If API call fails or returns nothing then an info toast should be displayed stating 'No company numbers available on Phantom'
    - [ ] If API call results in successful retrieval of data then this should be compared to any currently stored data in local storage
    - [ ] If comparison shows data to be identical then toast success notification should be displayed with message 'Your company numbers is the latest version'
    - [ ] If comparison shows differences then a warning message should be displayed stating 'All Company Numbers will be overwritten with new retrieved version, are you sure you wish to continue' with Okay/Cancel options available
    - [ ] If Okay selected, existing data removed from local storage and replaced with download data from API call
    - [ ] If Cancel selected, then ignore the data downloaded and continue as is

### Issues Outstanding
- [ ] Possible issue with voicemail notications working correctly (voicemail status not showing changes immediately)

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
- [ ] Add queue monitoring tab
- [ ] 3 line capability
- [ ] Add multi-language support expansion
- [X] Add contact import/export

## 🐛 Known Issues

- [ ] `npm start` fails in production mode - investigate NODE_ENV handling
- [ ] Busylight bridge installer build failing - check dependencies
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
- [X] Add call parking
- [ ] Add conference calling
- [ ] Add call queuing
- [ ] Add call statistics
- [ ] Add browser extension for click-to-call

---

**Last Updated:** January 5, 2026
**Project:** Autocab365Connect PWA
**Maintainer:** James
