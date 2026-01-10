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
- [X] On initial installation after the activeAccordianPanel is set, but I would also like to be on the 'Settings' tab as well with the Panel open ready for text entry
- [X] Rename the 'Diagnostics/Debugging' menu title under 'Settings' tab to 'Advanced'.  Add new language prompts for this name change and remove the old one
- [X] Hide the 'Verbose Logging' tickbox, label and the explaintion of the option.  It is under 'Advanced' Menu under 'Settings' tab
- [X] Internationalisation for the following is still required, complete the following internationalisations
    - [X] In 'Advanced' accordian panel the import and export buttons as well a text on panel
    - [X] Button and text in no-contacts-message
    - [X] Text in the no-history-message
    - [X] Button and text in the no-company-numbers-message
    - [X] The 'Select Company CLI' option box title on 'Dial' tab
- [X] Investigate why when closing the PWA and restarting PC, when I select the PWA to open again it appears to be a fresh installation and has no stored local storage info

### UI improvements/Features
- [X] Poll every two minutes to try to subscribe to notfications for BLF keys
- [X] Option to override the default BLF transfer option for each individual BLF key.  To enable things like attended transfer to a speeddial with mobile number whilst still having blind transfer to agents etc.
    - [X] Creation of another tickbox in Modals used for creation/editing BLF buttons
    - [X] Selecting tickbox will use allow user to manually set the transfer method for the specific BLF key
    - [X] Label for tickbox should be 'Override default transfer method for this key'
    - [X] If tickbox is selected a dropdown should appear with two options available 'Blind'/'Attended' it should default to the opposite of the current selected default transfer method in settings
- [X] Ensure that manually creating Company Number entries that the Company ID is unique, maybe be good idea to automatically autofill the field in the Modal with the lowest available not used Company ID 
- [X] Remove unnecessary fields of 'created at' and 'updated at' currently being stored in Company Numbers in local storage
- [X] Option to import/export parts of the local storage into file that can be used on other installations of the PWA (to make life easier for installations)
    - [X] Addition of Import/Export buttons in Settings under Diagnostics menu
    - [X] When selecting Export button should export ALL exportable data to file
    - [X] Local storage fields of BlfButtons, CompanyNumbers, contacts and tabVisibilitySettings to be exported
    - [X] When selecting import a Modal should appear with the seperate Data parts available (user selectable) to Import
    - [X] The modal should have all 4 tickbox options selected by default they should be named simply as BLF Buttons, Contacts, Company Numbers, Tabs Available
    - [X] This data WILL overwrite existing data so probably good idea to warn with options to Continue/Cancel
- [ ] Find best way of increasing amount of BLF key available, may look at option in settings when BLF enabled to have dropdown with 20(default)/40/60 keys option.  Then maybe have a next/previous (or just next cycled around) to replace curreently shown with next 20 keys
- [X] I wish to rename the fields that we store each Company Number as to id -> company_id, number -> cid name can stay as is
- [ ] Create API call for Company Numbers from the Phantom server
    - This API call should only be enabled if Company Numbers tab is enabled in Settings
    - The API call will be https://server1-XXXX.phantomapi.net:{port number}/api/companyNumbers
    - The returned data will be JSON object 'company_numbers' within the object each entry will have three parts named 'company_id','cid' and 'name'.  This entries should reflect the naming convention used by local storage CompanyNumbers
    - On each loading of PWA the API should initiate call, there should also be option to refresh manually in Company Numbers tab (between delete all and the import/export buttons)
    - If API call fails or returns nothing then an info toast should be displayed stating 'No company numbers available on Phantom'
    - If API call results in successful retrieval of data then this should be compared to any currently stored data in local storage.  The comparison should be per entry (e.g. the order of the entries do not need to match as long as firstly total entries are compared first (no need to go further with comparison if total entries are different as they cannot be identical). After totals checked as long as each entry is identical then it should show as identical) e.g. each entries fields company_id,name,cid must be identical in both json and CompanyNumbers in local storage to be identical
    - If comparison shows data to be identical then toast success notification should be displayed with message 'Your company numbers is the latest version'
    - If comparison shows differences then a warning message should be displayed stating 'All Company Numbers will be overwritten with new retrieved version, are you sure you wish to continue' with Okay/Cancel options available
    - If Okay selected, existing data removed from local storage and replaced with downloaded data from API call
    - If Cancel selected, then ignore the data downloaded and continue as is
    - Dont forget to internationalise the toast notifications

### Phantom development requests
- [ ] Dependent of R&D review of security implications.  Assuming that PWA will be hosted on Phantom server, preferrably at https://server1-XXXX.phantomapi.net:19773/pwa that a .env file entry containing the phantom WEB API key could be updated automatically upon change of WEB API via the Phantom UI thus allow the PWA to make API requests without having to expose more functions to NoAuth
- [ ] API for retrieval of table company_numbers from mysql database (phantom)
    - API name I wish to use is 'companyNumbers'
    - Returned data should be JSON object called 'company_numbers' with each entry within database returned with current name:value from database
- [ ] 

### Issues Outstanding
- [ ] Possible issue with voicemail notications working correctly (voicemail status not showing changes immediately)

### PWA & Installation
- [x] Fix duplicate service worker registration
- [x] Fix manifest.json error handling
- [x] Add Apple Touch Icons
- [ ] Test PWA installation on Edge, Chrome, Safari
- [ ] Add PWA screenshots to manifest.json
- [ ] Test offline functionality
- [X] Add PWA update notification when new version available

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
- [ ] Add call quality indicators
- [ ] Test call transfer (blind and attended)
- [ ] Test voicemail MWI (Message Waiting Indicator)

### UI/UX Improvements
- [ ] Test dark/light/auto theme switching
- [ ] Test keyboard usage ('+', '*', Numeric, Enter and Escape keys) for all possible call lifetime functionalities (idle on dial screen, during transfer modal display etc.)
- [ ] Add accessibility (ARIA) labels

### BLF (Busy Lamp Field)
- [ ] Test 1

### Audio Management
- [ ] Test audio device switching during calls
- [ ] Add audio device availability detection
- [ ] Test ringtone playback on different devices
- [ ] Add volume control for ringer

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
- [ ] Add 'Queue Monitor' optional Tab that will contain feature to monitor SLA's for selected Phantom queues
- [X] 3 line capability
- [X] Add multi-language support expansion
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

- [ ] Idea 1

---

**Last Updated:** January 10, 2026
**Project:** Autocab365Connect PWA
**Maintainer:** James Frayne
