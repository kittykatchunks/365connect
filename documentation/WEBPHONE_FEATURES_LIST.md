# Connect365 WebPhone Features List

This document provides a comprehensive list of all features available in the Connect365 WebRTC SIP Phone application, extracted from the official user guide.

## Core Communication Features

### Making & Receiving Calls

- **Outbound Calling** - Make calls using dialpad, contacts, or call history
- **Incoming Call Handling** - Answer or reject incoming calls
- **Multiple Call Lines** - Support for 3 simultaneous call lines
- **Call Waiting** - Handle multiple incoming calls with audio alerts and visual indicators
- **Line Key Management** - Visual line keys showing call states (idle, ringing, active, on hold)
- **Automatic Hold** - Automatically places calls on hold when switching between lines
- **Call Direction Indicators** - Visual display showing inbound (↓) or outbound (↑) calls

### Call Controls & Management

- **Mute/Unmute** - Control microphone during active calls
- **Hold/Resume** - Put calls on hold and resume them
- **Call Transfer** - Both blind and attended transfer options
- **Transfer Method Preferences** - Set default transfer method (blind or attended)
- **BLF-based Transfer** - Transfer calls by clicking BLF buttons
- **Hang Up** - End active calls
- **DTMF Support** - In-band DTMF tone support via RFC4733

### Agent Features

- **Agent Login/Logout** - Log in with agent number and optional passcode
- **Agent Status Display** - Real-time display of agent state (logged in, paused, not logged in)
- **Queue Management** - Join and leave call queues
- **Queue Groups** - Quick login to multiple queues simultaneously
- **Agent Pause/Resume** - Pause to become unavailable for queue calls
- **Pause Reasons** - Select reason when pausing (if configured)
- **Pause on Active Call** - Ability to pause while on an active call
- **API and DTMF Login** - Automatic fallback from API to DTMF-based agent login

## Contact & History Management

### Contacts

- **Contact Storage** - Store contacts with first name, last name, company name, and phone number
- **Add Contacts** - Create new contact entries
- **Edit Contacts** - Modify existing contact information
- **Delete Contacts** - Remove contacts individually
- **Contact Search** - Search contacts by name or number
- **Quick Dial from Contacts** - One-click calling from contact list
- **Contact Matching** - Automatic contact name display for incoming calls

### Call History

- **Call History Tracking** - View recent calls with complete information
- **Call Direction Display** - See inbound, outbound, and missed call indicators
- **Call Duration** - View duration of completed calls
- **Date & Time Stamps** - Timestamp for each call
- **Call History Filters** - Filter by all calls, missed, incoming, or outgoing
- **Quick Callback** - One-click callback from call history entries
- **Contact Integration** - Call history shows contact names when available

## Advanced Features

### BLF (Busy Lamp Field) Monitoring

- **Extension Monitoring** - Monitor status of other extensions in real-time
- **Speed Dial Buttons** - Quick dial buttons without presence monitoring
- **BLF States** - Visual indicators for available (green), busy (red), ringing (flashing red), hold (yellow), and inactive (grey)
- **Configurable BLF Buttons** - Right-click configuration of BLF button slots
- **BLF-based Dialing** - Click to dial extensions when not on a call
- **BLF-based Transfer** - Click during calls to transfer to monitored extensions
- **Transfer Method Override** - Set per-BLF button transfer method over-ride of default preference
- **Hold State Monitoring** - Monitor extensions on hold (requires PBX configuration)
- **Multiple BLF Panels** - Support for multiple button panels

### Voicemail

- **Voicemail Indicator** - Visual indicator showing new message count
- **Flashing Notification** - Flashing icon when new messages are waiting
- **Quick Access** - One-click dialing of voicemail access code
- **Configurable Access Code** - Set custom voicemail retrieval number (default \*97)

### Company Numbers (CLI Selection)

- **Multiple CLI Support** - Manage multiple outbound caller ID numbers
- **CLI Selector Dropdown** - Easy switching between company numbers
- **Automatic CLI Update** - Dials codes to update PBX with selected CLI
- **Agent Login Sync** - Automatic CLI sync when agent logs in
- **CLI Display** - Shows currently active outbound number

### Queue Monitor

- **Real-time Queue Statistics** - Live updates via Socket.IO connection
- **Multiple Queue Monitoring** - Monitor multiple queues simultaneously
- **Queue Groups Support** - Add multiple queues using queue groups
- **SLA Tracking** - Track missed call percentage and average wait time against thresholds
- **Visual SLA Alerts** - Color-coded alerts (green/yellow/red) for SLA compliance
- **Tab Alert Notifications** - Flashing tab icon for warning/breach states
- **Queue Sorting** - Automatic sorting by alert priority (breach > warning > normal)
- **Configurable Thresholds** - Set custom warning and breach thresholds per queue
- **Queue Statistics Display**:
  - Total agents (AGTS)
  - Free agents (FREE)
  - Busy agents (BUSY)
  - Paused agents (PAUSE)
  - Waiting calls (WAIT)
  - Answered percentage (ANS)
  - Missed percentage (MISS)
  - Average wait time (AWT)
  - Total calls (TOT)
- **Connection Status** - Visual indicator showing Socket.IO connection state
- **Edit/Delete Queues** - Manage monitored queues and thresholds

## Settings & Configuration

### Connection Settings

- **Phantom ID Configuration** - Auto-generates server URLs from 3-4 digit ID
- **SIP Username** - Configure device/extension number
- **SIP Password** - Secure credential storage
- **Voicemail Access Number** - Configure VM retrieval number
- **Auto-reconnection** - Automatic reconnection with exponential backoff
- **Multi-server Support** - Support for multiple server configurations

### Interface Settings

- **Theme Selection** - Auto (system preference), Light, or Dark mode
- **Language Selection** - Multiple language support (English, Spanish, Finnish, French, Dutch, Portuguese and regional variants) - Auto selection based from browser locale, but can be over-ridden through the settings
- **BLF Panel Toggle** - Show/hide BLF button panels
- **On-screen Notifications** - Enable/disable toast notifications
- **Visible Tabs Control**:
  - Contacts tab
  - Activity tab
  - Company Numbers tab
  - Queue Monitor tab

### Call Settings

- **Auto Answer** - Automatically answer all incoming calls (\*11 also works for auto-answer incoming queue/group calls only)
- **Incoming Call Notifications** - Browser/desktop notifications for incoming calls (including answer by clicking notification)
- **Auto-focus on Answer** - Automatically bring app to foreground when answering
- **Notification Test** - Test notification functionality
- **Permission Status Display** - Shows notification permission state
- **Default Transfer Method** - Set preferred transfer type (blind vs attended)

### Audio Settings

- **Device Selection**:
  - Speaker selection
  - Microphone selection
  - Ringer selection (separate from speaker)
- **Audio Testing**:
  - Speaker test with play button
  - Microphone level meter (real-time)
  - Ringer test with play button
- **Ringtone Selection** - Choose from 5 built-in ringtones
- **Custom Ringtone Upload**:
  - Support for MP3 and WAV files
  - Maximum 60 seconds duration
  - Maximum 5MB file size
  - Automatic conversion and validation
- **Device Refresh** - Update device lists when hardware changes
- **Microphone Permission** - Grant/check microphone access

### Queue Settings

- **Queue Groups Creation** - Create and name queue groups
- **Queue Group Management** - Add/edit/delete queue groups
- **Queue Selection** - Select which queues belong to each group
- **Queue Group Usage**:
  - Quick queue login
  - Batch SLA configuration in Queue Monitor
- **Unique Naming** - Enforce unique queue group names
- **Exclusive Membership** - Each queue can only belong to one group

### Busylight Settings

- **Busylight Integration** - Support for Kuando Busylight hardware devices
- **Bridge Connection** - Connect via Busylight Bridge Client software
- **Status Colors**:
  - Off - Disconnected from server
  - White - Connected, no agent logged in
  - Green - Idle/available
  - Green (flashing) - Idle with voicemail
  - Red - Busy on a call
  - Red (flashing + sound) - Incoming call ringing
  - Red (flashing) - Call waiting
  - Yellow - Call on hold
- **Ring Sound Selection** - Multiple sound options (OpenOffice, Quiet, Funky, Fairy Tale, Kuando Train, Telephone variants)
- **Volume Control** - Adjustable ring volume (0-100%)
- **Voicemail Notification** - Optional flashing for new voicemail messages
- **Connection Test** - Test busylight connectivity
- **Multi-line Support** - Reflects status of currently selected line

### Advanced Settings

- **Verbose Logging** - Detailed console logging for debugging
- **SIP Message Logging** - Raw SIP protocol message logging
- **Data Import** - Restore settings and data from backup
- **Data Export** - Create backup JSON file with:
  - BLF buttons
  - Contacts
  - Company Numbers
  - Queue groups
  - Queue SLA monitoring settings
- **Reset All Settings** - Factory reset to default state
- **Selective Import/Export** - Choose which data categories to backup/restore

## Progressive Web App (PWA) Features

### Installation & Deployment

- **PWA Installation** - Install as standalone app on desktop and mobile
- **Offline Capability** - Service worker with cached resources
- **App Manifest** - Native app-like experience
- **Browser Compatibility** - Supports Chrome, Edge, Safari, Firefox

### User Experience

- **Responsive Design** - Mobile and desktop optimized layouts
- **Touch-friendly Interface** - Optimized for touch devices
- **Keyboard Support** - Full keyboard navigation and shortcuts
- **Auto-focus Behavior** - Intelligent focus management for incoming calls

## Notifications & Alerts

### Call Notifications

- **Desktop Notifications** - Browser notifications for incoming calls (requires permission)
- **Clickable Notifications** - Answer calls directly from notification
- **Caller ID Display** - Show caller name or number in notifications
- **Call Waiting Beeps** - Audio alert for call waiting
- **Visual Tab Alerts** - Flashing Dial tab for call waiting calls
- **No Tray Notifications for Call Waiting** - Differentiates first call from waiting calls

### System Notifications

- **Toast Notifications** - In-app notifications for events (can be toggled)
- **Connection Status** - Visual indicators for server connection state
- **Registration Status** - Display of SIP registration state
- **Queue Monitor Alerts** - Tab flashing for SLA breaches
- **Network Status** - Toast notifications for connectivity changes

## Internationalization (i18n)

### Language Support

- **English** (en)
- **Spanish** (es)
- **Spanish Latin America** (es-419)
- **Finnish** (fi-FI)
- **French** (fr)
- **French Canadian** (fr-CA)
- **Dutch** (nl)
- **Portuguese** (pt)
- **Portuguese Brazilian** (pt-BR)

### Language Features

- **Automatic Language Detection** - Detects from URL, localStorage, parent app, or browser
- **Language Persistence** - Saves language preference
- **Dynamic Translation** - Real-time language switching without reload
- **Fallback to English** - Graceful fallback for missing translations

## Help & Documentation

### Integrated User Manual

- **Comprehensive User Guide** - Full feature documentation accessible within the app
- **Multi-language Support** - User manual automatically displays in the same language as the app
- **Synchronized Language Switching** - Manual language changes instantly when app language is changed
- **HTML-based Documentation** - Rich formatted guide with navigation, search, and examples
- **Searchable Content** - Built-in search functionality to quickly find topics
- **Sidebar Navigation** - Organized sections with quick links to all features
- **Visual Examples** - Screenshots and visual indicators throughout documentation
- **Mobile Responsive** - User guide optimized for all device sizes
- **Theme Integration** - Manual respects app theme (light/dark mode)
- **Offline Access** - User guide available even without internet connection (PWA feature)
- **Direct Topic Links** - URL-based navigation to specific help topics
- **Quick Links** - Fast access to common tasks and troubleshooting
- **Contextual Help** - Covers all features, settings, and troubleshooting scenarios

## Call Progress & Audio

### Audio Handling

- **WebRTC Audio** - High-quality WebRTC audio streams
- **Codec Support** - Opus, uLaw (G.711μ), aLaw (G.711a)
- **Media Encryption** - DTLS-SRTP mandatory
- **Echo Cancellation** - Built-in echo cancellation
- **Noise Suppression** - Audio processing for clarity

### Call Progress Tones

- **Call Progress Indication** - Audio feedback for call states
- **Locale-aware Tones** - Call progress tones automatically adjust based on app locale/language setting
- **Standardised Regional Tones** - Uses ITU-T standardised tone frequencies and cadences for each region
- **Ringback Tone** - Heard when dialing outbound calls (region-specific)
- **Busy Tone** - Indication when called party is busy (region-specific)
- **Error Tones** - Audio indication of call failures
- **Automatic Tone Selection** - Tones match expected patterns for user's country/region

## WebRTC & SIP Features

### WebRTC Implementation

- **Secure WebSocket (WSS)** - Encrypted signaling transport
- **SIP over WebSocket** - Standards-compliant SIP.js implementation
- **Session Management** - Support for multiple concurrent sessions
- **Session States** - Tracking of connecting, established, terminated states
- **ICE/STUN/TURN** - NAT traversal support
- **WebRTC Capability Detection** - Validates browser WebRTC support

### SIP Features

- **SIP Registration** - Automatic registration with PBX
- **Registration Status** - Visual display of registration state
- **Re-registration** - Automatic periodic re-registration
- **SIP Authentication** - Digest authentication support
- **Custom SIP Headers** - Support for custom headers
- **SIP MESSAGE Support** - For SMS/chat functionality (infrastructure ready)

## Debug & Troubleshooting

### Debug Tools

- **Verbose Logging** - Comprehensive logging throughout application
- **SIP Message Tracing** - Log all SIP protocol messages
- **WebRTC Connection Diagnostics** - Test WebSocket and WebRTC connections
- **Configuration Debugging** - Trace server URL generation
- **Console Output** - Structured logging with component prefixes

### Error Recovery

- **Tab Error Recovery** - Detect and recover from tab crashes
- **Automatic Reconnection** - Exponential backoff reconnection logic
- **Session Recovery** - Attempt to recover active sessions
- **Connection Status Display** - Visual feedback of connection issues
- **Call Cleanup** - Proper cleanup of media streams and timers on disconnect

## Data Management

### Local Storage

- **Settings Persistence** - All settings saved locally
- **Contacts Storage** - Contact list stored in browser
- **Call History Storage** - Persistent call history
- **BLF Configuration Storage** - Saved BLF button configurations
- **Queue Groups Storage** - Persistent queue group definitions
- **Theme Preference** - Saved theme selection

### Data Privacy

- **Local Storage Only** - No server-side user data storage
- **Credential Security** - Secure local storage of passwords
- **Data Export** - User-controlled data backup
- **Data Wipe** - Complete data removal with reset function

## API Integration

### Phantom API

- **Dynamic API Key Support** - Configure API key per Phantom ID
- **API-based Agent Login** - Primary method for agent authentication
- **Queue Management API** - API calls for queue join/leave
- **Agent Pause API** - API-based pause/resume operations
- **Fallback to DTMF** - Automatic fallback when API unavailable
- **Multiple Server Support** - Different API keys per server/PhantomID

### WebSocket Integration

- **Socket.IO Support** - Real-time updates via WebSocket
- **Queue Monitor Socket** - Live queue statistics streaming
- **Connection State Management** - Automatic reconnection on disconnect
- **Event-driven Updates** - Real-time UI updates from server events

## Auto-answer Features

### App-level Auto-answer

- **Global Auto-answer** - Automatically answer all incoming calls
- **Toggle in Settings** - Enable/disable in Call Settings

### Phantom \*11 Auto-answer

- **Selective Auto-answer** - Auto-answer queue and group calls only
- **DDI/Internal Rings** - Normal ringing for DDI and internal calls
- **PBX-controlled** - Managed via Phantom PBX \*11 feature code

## Feature Summary by Tab

### Phone Tab

- Dialpad
- Agent control buttons (Login, Queue, Pause)
- Agent status display
- Line keys with call states
- CLIP selector
- Active call controls
- BLF button panels
- Voicemail indicator
- Connection status

### Contacts Tab

- Contact list with search
- Add contact
- Edit contact
- Delete contact
- Quick dial from contacts

### Activity Tab

- Call history with filters
- Call direction indicators
- Call duration display
- Quick callback buttons
- Search/filter functionality

### Company Numbers Tab

- Company number list
- Add/edit/delete numbers
- Number descriptions

### Queue Monitor Tab

- Real-time queue statistics grid
- SLA alert indicators
- Add/edit/delete monitored queues
- Queue group support
- Connection status
- Auto-sorting by alert priority

### Settings Tab

- Connection settings
- Interface settings
- Call settings
- Queues settings
- Audio settings
- Busylight settings
- Advanced settings

## Requirements & Compatibility

### Browser Support

- Google Chrome 70+
- Microsoft Edge 79+
- Safari 14+
- Firefox 70+
- WebRTC support required
- Microphone permission required

### Network Requirements

- Internet connection
- WebSocket access (port 8089)
- WSS protocol support
- Firewall configuration for WebRTC media

### Optional Hardware

- Kuando Busylight devices (requires bridge software)
- Headsets with microphone
- Multiple audio devices support

---

**Document Version:** 1.0  
**Last Updated:** February 3, 2026  
**Source:** Connect365 User Guide
