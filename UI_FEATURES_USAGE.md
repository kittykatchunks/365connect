# Connect365 UI Features and Usage

## Core Communication Features


### Audio Management
- [ ] Input/output device selection
- [ ] Select independent device for ringer playback
- [ ] Visual indication of microphone input level
- [ ] 
- [ ] Multiple Ringtones to select
- [ ] 

## Contact & Directory Features

### Contact Management
- [ ] Contact list with search
- [ ] Contact groups/categories
- [ ] Import/export contacts (CSV, JSON)
- [ ] Contact profiles with photos
- [ ] Quick dial favorites
- [ ] Recent contacts

### Company Directory
- [ ] Company phone numbers list
- [ ] Department organization
- [ ] Direct dial support
- [ ] Extension dialing

## Call Management Features

### Call History/Activity
- [ ] Incoming/Outgoing/Missed call logging with duration
- [ ] Dial icon per item to allow easy callback
- [ ] Clear call history per individual or clear all options
- [ ] Call history ordered with title spans splitting list on date basis

### BLF (Busy Lamp Field)
- [ ] Displaying the BLF keys on main [DIAL] tab is a user selectable option
- [ ] Two types of key (BLF or Speeddial) are available to select per key 
- [ ] BLF offers visual status indicators for Phantom agents (available, ringing, busy)
- [ ] Click-to-call from BLF buttons
- [ ] 
- [ ] 
- [ ] 

## Hardware Integration

### Busylight Support
- [ ] Status indication (available, ringing, busy)
- [ ] Color customization
- [ ] Bridge server integration
- [ ] Multiple device support
- [ ] Auto-detection

## User Interface Features

### Theming
- [ ] Light/dark mode
- [ ] System theme detection

### Localization
- [ ] Multi-language support (automatic from browser locale or overide via settings option)
- [ ] Date/time formatting
- [ ] Number formatting
- [ ] Timezone handling

### PWA Features
- [ ] Offline mode support
- [ ] Install to device
- [ ] Push notifications for Updates
- [ ] Background sync
- [ ] Service worker caching

### Static Visual Elements
- [ ] Span at very top of page that diplays the following
    - [ ] Company logo (left justifed)
    - [ ] REGISTER button (right justified)
        - [ ] Button provides contextual info/actions based on the current state of connection to Phantom PBX
            - NOT CONNECTED
                - [ ] Coloured red and labelled REGISTER
                - [ ] When selected initates secure websocket connection and WebRTC/SIP registration to Phantom PBX
                - [ ] also initates API call to Phantom to establish if an agent is curently logged in on the system, if so the returned data (agent name, agent number and cid(CLIP) is stored for usage later)
                - [ ] also initates API call to Phantom to retrieve list (if available) to sync Company Numbers from Phantom database to complete comparison against list in local storage
                    - If API call fails or reutrns no info then simply toast notify message advising 'No company numbers are available to update from Phantom system'
                    - If comparison of list is same then simple toast notify message advising 'Your company numbers are up to date'
                    - If comparison of list is not the same then the currently stored list in local storage should be removed in full and replaced with retrieved data for API
                    - User should be advised that comapny numbers not up to date and given option to allow replacement of locally stored list with newly retireved list. Maybe have to use browser notification that states 'Updated Company Number list retieved do you wish to continue updating and overwrite your current list.  This cannot be undone' with ok or cancel buttons available
            - CONNECTING
                - [ ] Coloured yellow and labelled PROCESSING
            - CONNECTED
                - [ ] Coloured green and labelled UNREGISTER
                - [ ] When selected initates disconnection from SIP/WebRTC registration on Phantom PBX and then closes secure websocket connection
            - DISCONNECTING
                - [ ] Coloured yellow and labelled PROCESSING

### Tabulated UI
- [X] Interface simplified by utilisation of tabs to allow access to different application features
- [X] 2 static tabs (DIAL, SETTINGS)
- [~] 4 user selectable tabs via SETTINGS (detailed features/usage of these tabs further down document)
    - [X] CONTACTS - provides per user contacts storage
    - [X] ACTIVITY - provides per user recent call history
    - [X] COMPANY NUMBERS - provides per user/phantom supplied company number list to allow enduser CLIP selection for outgoing calls
    - [ ] QUEUE MONITOR - provides simplified display of queues requiring SLA monitoring

### DIAL Tab
- [ ] Three buttons to provide easy usage of Phantom specific functionality for agents
- [ ] All three buttons disabled when application is unregistered 
    - [ ] LOGIN - allows easy agent login via Modal popup to allow entry of agent number, and optional passcode.  Login/Cancel buttons to either complete or end the agent login process
- [ ] Provides core call controls to enduser for upto 3 simultaneous calls (Answer, End(Decline))
- [ ] Provides call handling controls to agent for selected active call (Mute, Hold, Transfer(Blind/Attended))



## Settings & Configuration

### Account Settings
- [ ] PhantomID configuration
- [ ] SIP credentials management
- [ ] Auto-provision from server
- [ ] Profile customization

### Call Settings
- [ ] Auto-answer options
- [ ] Call forwarding rules
- [ ] Do Not Disturb mode
- [ ] Ring settings

### Advanced Settings
- [ ] Network diagnostics
- [ ] Debug mode
- [ ] Data import/export
- [ ] Factory reset

## Security Features

### Authentication
- [ ] SIP authentication
- [ ] API key management
- [ ] Session management
- [ ] Auto-logout

### Privacy
- [ ] End-to-end encryption (SRTP)
- [ ] Secure storage (localStorage)
- [ ] Privacy mode
- [ ] Data retention controls

## Integration Features

### Phantom PBX Integration
- [ ] REST API integration
- [ ] Real-time events
- [ ] Call flow control
- [ ] Queue management

### External Systems
- [ ] Webhook support
- [ ] Custom events
- [ ] Third-party integrations

## Performance & Reliability

### Optimization
- [ ] Lazy loading
- [ ] Code splitting
- [ ] Asset caching
- [ ] Compression

### Monitoring
- [ ] Error logging
- [ ] Performance metrics
- [ ] Connection status
- [ ] Health checks

## Development Features

### Testing
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Load testing

### Documentation
- [ ] User guide
- [ ] API documentation
- [ ] Architecture diagrams
- [ ] Setup instructions

---

## Legend
- [ ] Not implemented
- [x] Implemented
- [~] Partially implemented
- [!] Broken/needs fix

## Version History
- **v1.0.0** - Initial feature set
