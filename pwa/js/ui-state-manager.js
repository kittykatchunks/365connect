/* ====================================================================================== */
/* AUTOCAB365 PWA - UI STATE MANAGER */
/* Manages UI state, notifications, and view switching */
/* Version: 0.1.001 */
/* ====================================================================================== */

class UIStateManager extends EventTarget {
    constructor() {
        super();
        
        this.state = {
            currentView: 'dial',
            searchQuery: '',
            selectedBuddy: null,
            connectionState: 'disconnected',
            buddies: [],
            calls: new Map(),
            theme: 'auto' // Default to auto
        };
        
        this.notifications = [];
        this.notificationContainer = null;
        this.activeCalls = new Map(); // Initialize the active calls map
        
        // Initialize theme system
        this.initializeTheme();
        
        console.log('UIStateManager initialized');
        this.createNotificationContainer();
    }
    
    init() {
        // Create notification container if it doesn't exist
        this.createNotificationContainer();
        
        // Setup view switching
        this.setupViewSwitching();
        
        // Listen for storage changes
        this.setupStorageListener();
        
        // Setup SIP event listeners
        this.setupSipEventListeners();
        
        // Start time updates for status display
        this.startTimeUpdates();
        
        // Also start time updates after DOM is fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => this.startTimeUpdates(), 100);
            });
        } else {
            // DOM already loaded, start immediately
            setTimeout(() => this.startTimeUpdates(), 100);
        }
    }
    
    createNotificationContainer() {
        let container = document.getElementById('notificationContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notificationContainer';
            container.className = 'notification-container';
            document.body.appendChild(container);
            console.log('✓ Notification container created and added to DOM');
        } else {
            console.log('✓ Using existing notification container');
            // Ensure container has the correct class
            if (!container.classList.contains('notification-container')) {
                container.classList.add('notification-container');
            }
        }
        this.notificationContainer = container;
    }
    
    setupViewSwitching() {
        // This will be called when views need to be switched
        this.on('viewChangeRequested', (event) => {
            this.switchToView(event.detail.view);
        });
    }
    
    setupStorageListener() {
        // Listen for localStorage changes from other tabs
        window.addEventListener('storage', (e) => {
            if (e.key) {
                this.emit('storageChanged', { key: e.key, newValue: e.newValue, oldValue: e.oldValue });
            }
        });
    }
    
    setupSipEventListeners() {
        // Listen for SIP configuration changes to update display name
        if (window.App && window.App.managers && window.App.managers.sip) {
            window.App.managers.sip.on('configChanged', () => {
                this.updateSipStatusDisplay();
            });
        } else {
            // If managers aren't available yet, set up a listener for when they become available
            window.addEventListener('managersInitialized', () => {
                if (window.App && window.App.managers && window.App.managers.sip) {
                    window.App.managers.sip.on('configChanged', () => {
                        this.updateSipStatusDisplay();
                    });
                }
            });
        }
    }
    
    setCurrentView(view) {
        const previousView = this.currentView;
        this.currentView = view;
        
        console.log(`Switching view: ${previousView} -> ${view}`);
        
        // Stop microphone monitoring when leaving settings view
        if (previousView === 'settings' && view !== 'settings') {
            if (window.App?.managers?.audio) {
                window.App.managers.audio.stopMicrophoneLevelMonitoring();
            }
        }
        
        // Update body class for CSS targeting
        document.body.className = document.body.className.replace(/view-\w+/g, '');
        document.body.classList.add(`view-${view}`);
        
        // Hide all content areas first
        document.querySelectorAll('.content-area').forEach(area => {
            area.classList.remove('active');
            area.classList.add('hidden');
        });
        
        // Hide all conditional containers first
        const searchContainer = document.getElementById('searchContainer');
        const agentKeysContainer = document.getElementById('agentKeysContainer');
        const contactsControlsContainer = document.getElementById('contactsControlsContainer');
        
        if (searchContainer) {
            searchContainer.classList.add('hidden');
            searchContainer.style.display = 'none';
        }
        if (agentKeysContainer) {
            agentKeysContainer.classList.add('hidden');
            agentKeysContainer.style.display = 'none';
        }
        if (contactsControlsContainer) {
            contactsControlsContainer.classList.add('hidden');
            contactsControlsContainer.style.display = 'none';
        }
        
        // Remove active class from all nav tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Show the selected view and activate its tab
        let targetArea = null;
        let targetTab = null;
        
        switch (view) {
            case 'contacts':
                targetArea = document.getElementById('contactArea');
                targetTab = document.getElementById('navContacts');
                // Show contacts controls for contacts
                if (contactsControlsContainer) {
                    contactsControlsContainer.classList.remove('hidden');
                    contactsControlsContainer.style.display = 'block';
                }
                // Refresh contacts when switching to contacts tab
                setTimeout(() => {
                    if (App.managers?.contacts && typeof App.managers.contacts.renderContacts === 'function') {
                        App.managers.contacts.renderContacts();
                    }
                }, 100);
                break;
                
            case 'dial':
                targetArea = document.getElementById('dialArea');
                targetTab = document.getElementById('navDial');
                // Show agent keys for dial
                if (agentKeysContainer) {
                    agentKeysContainer.classList.remove('hidden');
                    agentKeysContainer.style.display = 'block';
                }
                break;
                
            case 'activity':
                targetArea = document.getElementById('activityArea');
                targetTab = document.getElementById('navActivity');
                // Load activity when switching to activity tab
                setTimeout(() => {
                    if (typeof refreshActivityFeed === 'function') {
                        refreshActivityFeed();
                    }
                }, 100);
                break;

            case 'blank1':
                targetArea = document.getElementById('blank1Area');
                targetTab = document.getElementById('navBlank1');
                // Blank tabs are disabled, no functionality
                if (targetTab && targetTab.classList.contains('disabled')) {
                    return; // Exit early for disabled tabs
                }
                break;
                
            case 'blank2':
                targetArea = document.getElementById('blank2Area');
                targetTab = document.getElementById('navBlank2');
                // Blank tabs are disabled, no functionality
                if (targetTab && targetTab.classList.contains('disabled')) {
                    return; // Exit early for disabled tabs
                }
                break;
                
            case 'settings':
                targetArea = document.getElementById('settingsArea');
                targetTab = document.getElementById('navSettings');
                // No special containers for settings
                // Load settings into form when switching to settings
                setTimeout(() => {
                    if (typeof loadSettingsIntoForm === 'function') {
                        loadSettingsIntoForm();
                    }
                    // Start microphone level monitoring for settings view
                    if (window.App?.managers?.audio) {
                        window.App.managers.audio.startMicrophoneLevelMonitoring();
                    }
                }, 200);
                break;
        }
        
        if (targetArea) {
            targetArea.classList.remove('hidden');
            targetArea.classList.add('active');
            console.log('✓ Showing area:', targetArea.id);
        } else {
            console.error('Target area not found for view:', view);
        }
        
        if (targetTab) {
            targetTab.classList.add('active');
            console.log('✓ Activating tab:', targetTab.id);
        } else {
            console.error('Target tab not found for view:', view);
        }
        
        // Log container visibility
        console.log('Container visibility:', {
            search: searchContainer?.style.display || 'none',
            agent: agentKeysContainer?.style.display || 'none',
            view: view
        });
        
        this.emit('viewChanged', { current: view, previous: previousView });
    }
    
    switchToView(view) {
        this.setCurrentView(view);
    }
    
    addCall(lineNumber, callData) {
        this.activeCalls.set(lineNumber, callData);
        console.log(`UI Call added on line ${lineNumber}`);
        this.emit('callAdded', { lineNumber, callData });
    }
    
    removeCall(lineNumber) {
        const callData = this.activeCalls.get(lineNumber);
        this.activeCalls.delete(lineNumber);
        console.log(`UI Call removed from line ${lineNumber}`);
        this.emit('callRemoved', { lineNumber, callData });
    }
    
    updateCallState(lineNumber, state) {
        const callData = this.activeCalls.get(lineNumber);
        if (callData) {
            callData.state = state;
            console.log(`UI Call state updated on line ${lineNumber}: ${state}`);
            this.emit('callStateChanged', { lineNumber, state, callData });
        }
    }
    
    setConnectionState(state) {
        const previousState = this.connectionState;
        this.connectionState = state;
        console.log(`UI Connection state: ${previousState} -> ${state}`);
        
        // Update connection indicator
        this.updateConnectionIndicator(state);
        
        this.emit('connectionStateChanged', { current: state, previous: previousState });
    }
    
    updateConnectionIndicator(state) {
        const indicator = document.getElementById('connectionIndicator');
        const text = document.getElementById('connectionText');
        
        if (indicator) {
            indicator.className = `connection-indicator connection-${state}`;
        }
        
        if (text) {
            const t = window.languageManager?.t || ((key, def) => def);
            const stateText = {
                'registered': t('connected', 'Connected'),
                'disconnected': t('disconnected', 'Disconnected'),
                'failed': t('failed', 'Failed'),
                'connecting': t('connecting', 'Connecting...')
            };
            text.textContent = stateText[state] || state;
        }
        
        // Update SIP status display
        this.updateSipStatusDisplay();
    }
    
    // SIP Status Display Management
    updateSipStatusDisplay() {
        const extension = document.getElementById('sipExtension');
        const agentStatus = document.getElementById('agentStatus');
        
        // Update device (extension) - only show when registered, clear when unregistered/disconnected
        if (extension && window.localDB) {
            if (this.connectionState === 'registered') {
                // Try to get display name from SIP manager first, fallback to storage
                let displayText = '';
                if (window.App && window.App.managers && window.App.managers.sip) {
                    displayText = window.App.managers.sip.getDisplayName();
                } else {
                    // Fallback to stored profileName, or generate from username if SIP manager not available
                    const storedProfileName = window.localDB.getItem('profileName', null);
                    if (storedProfileName) {
                        displayText = storedProfileName;
                    } else {
                        const sipUsername = window.localDB.getItem('SipUsername', '');
                        displayText = sipUsername ? `${sipUsername}-365Connect` : '';
                    }
                }
                extension.textContent = displayText;
                console.log(`Device updated: ${displayText} (state: ${this.connectionState})`);
            } else {
                extension.textContent = '--';
                console.log(`Device cleared (state: ${this.connectionState})`);
            }
        }
        
        // Update agent status
        if (agentStatus && window.App?.managers?.agent) {
            const agentMgr = window.App.managers.agent;
            const storedAgentName = window.localDB.getItem('currentAgentName', null);
            const storedAgentNumber = window.localDB.getItem('currentAgentNumber', null);
            const t = window.languageManager?.t || ((key, def) => def);
            let statusText = t('logged_out', 'Logged Out');
            let statusClass = 'agent-logged-out';
            
            if (agentMgr.isLoggedIn) {
                statusText = agentMgr.isPaused ? t('paused', 'Paused') : `${storedAgentNumber} - ${storedAgentName}`;
                statusClass = agentMgr.isPaused ? 'agent-paused' : 'agent-logged-in';
            }
            
            agentStatus.textContent = statusText;
            agentStatus.className = `status-value ${statusClass}`;
        }
        
        // Update time and date
        // this.updateTimeAndDate();
    }
    
    updateTimeAndDate() {
        const currentTime = document.getElementById('currentTime');
        const currentDate = document.getElementById('currentDate');
        
        if (currentTime || currentDate) {
            const now = new Date();
            
            if (currentTime) {
                try {
                    const timeOptions = { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: false
                    };
                    const timeString = now.toLocaleTimeString(navigator.language, timeOptions);
                    currentTime.textContent = timeString;
                } catch (error) {
                    console.error('Error formatting time:', error);
                    // Fallback to simple format
                    currentTime.textContent = now.toTimeString().substr(0, 5);
                }
            }
            
            if (currentDate) {
                try {
                    const dateOptions = { 
                        day: '2-digit', 
                        month: 'short', 
                        year: '2-digit'
                    };
                    const dateString = now.toLocaleDateString(navigator.language, dateOptions);
                    currentDate.textContent = dateString;
                } catch (error) {
                    console.error('Error formatting date:', error);
                    // Fallback to simple format
                    currentDate.textContent = now.toLocaleDateString();
                }
            }
        } else {
            // Elements not found, might need to retry later
            if (!this.timeElementCheckRetry) {
                this.timeElementCheckRetry = true;
                setTimeout(() => {
                    this.timeElementCheckRetry = false;
                    this.updateTimeAndDate();
                }, 500);
            }
        }
    }
    
    startTimeUpdates() {
        // Update time immediately
        this.updateTimeAndDate();
        
        // Clear any existing interval
        if (this.timeUpdateInterval) {
            clearInterval(this.timeUpdateInterval);
        }
        
        // Update time every minute
        this.timeUpdateInterval = setInterval(() => {
            try {
                this.updateTimeAndDate();
            } catch (error) {
                console.error('Error updating time and date:', error);
            }
        }, 60000); // Update every minute
        
        console.log('✓ Time updates started - updating every minute');
    }
    
    stopTimeUpdates() {
        if (this.timeUpdateInterval) {
            clearInterval(this.timeUpdateInterval);
            this.timeUpdateInterval = null;
        }
    }
    
    // Debug method to manually restart time updates
    restartTimeUpdates() {
        console.log('Manually restarting time updates...');
        this.stopTimeUpdates();
        this.startTimeUpdates();
    }
    
    // Helper method to check if a call is in an established state
    isCallEstablished(state) {
        // Check for various forms of established state
        // state can be a SIP.SessionState enum or string
        const stateStr = state?.toString() || '';
        const validStates = [
            'Established',
            'established', 
            'answered',
            'active',
            'confirmed'
        ];
        return validStates.some(validState => 
            stateStr === validState || 
            stateStr.includes(validState) ||
            state === validState
        );
    }
    
    updateCallStatus(callData) {
        const callStatusRow = document.getElementById('callStatusRow');
        const dialInputRow = document.getElementById('dialInputRow');
        const callerNumber = document.getElementById('callerNumber');
        const callerName = document.getElementById('callerName');
        const callDirection = document.getElementById('callDirection');
        const callDuration = document.getElementById('callDuration');
        const callInfoDisplay = document.querySelector('.call-info-display');
        
        if (!callData || Object.keys(callData).length === 0) {
            // No active call - hide call status, show dial input
            if (callStatusRow) {
                callStatusRow.classList.add('hidden');
                // Remove call state classes
                if (callInfoDisplay) {
                    callInfoDisplay.classList.remove('call-ringing', 'call-dialing', 'call-connected', 'call-on-hold');
                }
            }
            if (dialInputRow) {
                dialInputRow.classList.remove('hidden');
            }
            return;
        }
        
        // Active call - show call status, hide dial input
        if (callStatusRow) {
            callStatusRow.classList.remove('hidden');
        }
        if (dialInputRow) {
            dialInputRow.classList.add('hidden');
        }
        
        // Update caller number - handle both incoming and outgoing calls
        if (callerNumber) {
            let displayNumber = 'Unknown';
            let displayName = '';
            
            if (callData.direction === 'incoming') {
                // For incoming calls, use callerID or target
                displayNumber = callData.callerID || callData.target || 'Unknown';
                // Try to extract name if callerID contains both name and number
                if (callData.callerID && callData.target && callData.callerID !== callData.target) {
                    displayName = callData.callerID;
                    displayNumber = callData.target;
                }
                // Fallback to remoteIdentity if available
                if (!displayNumber || displayNumber === 'Unknown') {
                    if (callData.remoteIdentity) {
                        displayNumber = callData.remoteIdentity.uri?.user || callData.remoteIdentity.displayName || 'Unknown';
                        displayName = callData.remoteIdentity.displayName;
                    }
                }
            } else if (callData.direction === 'outgoing') {
                // For outgoing calls, show the target number
                displayNumber = callData.target || 'Unknown';
            }
            
            // Don't update if we only have 'Unknown' and there's already a valid number showing
            if (displayNumber !== 'Unknown' || !callerNumber.textContent || callerNumber.textContent === 'Unknown') {
                callerNumber.textContent = displayNumber;
            }
            
            // Update caller name - only show if available and different from number
            if (callerName) {
                // Use extracted displayName or fall back to remoteIdentity
                if (!displayName && callData.remoteIdentity?.displayName) {
                    displayName = callData.remoteIdentity.displayName;
                }
                
                if (displayName && displayName !== displayNumber && displayName !== callerNumber?.textContent) {
                    callerName.textContent = displayName;
                    callerName.classList.remove('hidden');
                } else if (!displayName) {
                    // Don't clear existing name, just hide if no new name available
                    // callerName.classList.add('hidden');
                }
            }
        }
        
        // Update call direction based on state
        if (callDirection) {
            let directionText = 'Unknown';
            let callStateClass = '';
            
            // Check if call is on hold first (highest priority for display)
            if (callData.onHold) {
                directionText = 'On Hold';
                callStateClass = 'call-on-hold';
            }
            // Determine the call state and direction text
            // Check for established/active states (including SIP.SessionState.Established constant)
            else if (this.isCallEstablished(callData.state)) {
                const t = window.languageManager?.t || ((key, def) => def);
                directionText = t('connected', 'Connected');
                callStateClass = 'call-connected';
            } else if (callData.state === 'Initial' || callData.state === 'Establishing') {
                // Call is being set up
                if (callData.direction === 'incoming') {
                    directionText = 'Ringing';
                    callStateClass = 'call-ringing';
                } else if (callData.direction === 'outgoing') {
                    directionText = 'Dialing';
                    callStateClass = 'call-dialing';
                }
            } else if (callData.direction === 'incoming') {
                directionText = 'Ringing';
                callStateClass = 'call-ringing';
            } else if (callData.direction === 'outgoing') {
                directionText = 'Dialing';
                callStateClass = 'call-dialing';
            } else if (callData.direction) {
                // Fallback to basic direction
                directionText = callData.direction === 'incoming' ? 'Incoming' : 'Outgoing';
            }
            
            callDirection.textContent = directionText;
            
            // Update background color based on call state
            if (callInfoDisplay) {
                callInfoDisplay.classList.remove('call-ringing', 'call-dialing', 'call-connected', 'call-on-hold');
                if (callStateClass) {
                    callInfoDisplay.classList.add(callStateClass);
                }
            }
        }
        
        // Call duration will be updated by a timer elsewhere
    }
    
    startCallTimer(startTime) {
        // Clear any existing timer
        if (this.callTimer) {
            clearInterval(this.callTimer);
        }
        
        const callDuration = document.getElementById('callDuration');
        if (!callDuration) return;
        
        this.callTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            callDuration.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }
    
    stopCallTimer() {
        if (this.callTimer) {
            clearInterval(this.callTimer);
            this.callTimer = null;
        }
        
        const callDuration = document.getElementById('callDuration');
        if (callDuration) {
            callDuration.textContent = '00:00';
        }
    }
    
    addNotification(notification) {
        console.log('🔔 Adding UI Notification:', notification);
        
        // Check if onscreen notifications are enabled (always show errors and forced notifications)
        const onscreenEnabled = window.localDB ? 
            window.localDB.getItem('OnscreenNotifications', '1') === '1' : true;
        
        const shouldShowToast = onscreenEnabled || notification.type === 'error' || notification.forceShow === true;
        
        if (!shouldShowToast) {
            console.log(`Toast notification suppressed (type: ${notification.type}, onscreen disabled, forceShow: ${notification.forceShow})`);
            return null;
        }
        
        // Ensure notification container exists
        if (!this.notificationContainer) {
            console.warn('⚠️ Notification container not found, creating...');
            this.createNotificationContainer();
        }
        
        // Create notification element
        const notificationElement = this.createNotificationElement(notification);
        
        // Add to container
        if (this.notificationContainer) {
            this.notificationContainer.appendChild(notificationElement);
            console.log('✓ Notification element added to DOM');
            
            // Debug logging
            console.log('Container children count:', this.notificationContainer.children.length);
            console.log('Container visibility:', {
                display: this.notificationContainer.style.display,
                visibility: this.notificationContainer.style.visibility,
                opacity: this.notificationContainer.style.opacity,
                zIndex: this.notificationContainer.style.zIndex
            });
        } else {
            console.error('❌ Failed to add notification - container missing');
            return null;
        }
        
        // Auto-remove after duration
        if (notification.duration && notification.duration > 0) {
            setTimeout(() => {
                this.removeNotification(notificationElement);
            }, notification.duration);
        }
        
        // Store in array
        this.notifications.push({
            id: Date.now(),
            element: notificationElement,
            ...notification
        });
        
        this.emit('notificationAdded', notification);
        
        return notificationElement;
    }
    
    createNotificationElement(notification) {
        // Create main notification element
        const element = document.createElement('div');
        element.className = `notification notification-${notification.type || 'info'}`;
        
        // Get notification styling details
        const iconClass = this.getNotificationIcon(notification.type);
        
        // Build content structure using CSS classes
        let content = '';
        
        // Add notification icon and content wrapper
        if (iconClass) {
            content += `<div class="notification-content-with-icon">`;
            // Add icon with data attribute for color (will be styled via CSS)
            content += `<i class="fa ${iconClass} notification-icon notification-icon-${notification.type}"></i>`;
            content += `<div class="notification-text">`;
        } else {
            content += `<div class="notification-text">`;
        }
        
        // Add title
        if (notification.title) {
            content += `<div class="notification-title">${notification.title}</div>`;
        }
        
        // Add message
        if (notification.message) {
            content += `<div class="notification-message">${notification.message}</div>`;
        }
        
        // Add action buttons if provided
        if (notification.actions && notification.actions.length > 0) {
            content += '<div class="notification-actions">';
            notification.actions.forEach((action, index) => {
                const buttonId = `notif-action-${Date.now()}-${index}`;
                content += `<button id="${buttonId}" class="notification-action ${action.class || 'btn-primary'}">${action.text}</button>`;
            });
            content += '</div>';
        }
        
        // Close content wrappers
        if (iconClass) {
            content += `</div></div>`;
        } else {
            content += `</div>`;
        }
        
        // Add close button (no onclick, will add listener below)
        content += `<button class="notification-close" title="Close" data-action="close">&times;</button>`;
        
        // Set innerHTML
        element.innerHTML = content;
        
        // Add event listener for close button (CSP-compliant)
        const closeBtn = element.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                element.remove();
            });
        }
        
        // Add event listeners for action buttons
        if (notification.actions && notification.actions.length > 0) {
            const timestamp = Date.now();
            setTimeout(() => {
                notification.actions.forEach((action, index) => {
                    const buttonId = `notif-action-${timestamp}-${index}`;
                    const button = document.getElementById(buttonId);
                    if (button && action.action) {
                        button.addEventListener('click', (e) => {
                            e.stopPropagation();
                            if (typeof action.action === 'function') {
                                action.action();
                            }
                            // Auto-close notification after action
                            if (action.closeAfterAction !== false) {
                                this.removeNotification(element);
                            }
                        });
                    }
                });
            }, 50);
        }
        
        console.log('✓ Notification element created:', {
            type: notification.type,
            title: notification.title,
            hasActions: !!(notification.actions && notification.actions.length > 0)
        });
        
        return element;
    }
    
    getNotificationColor(type) {
        const colors = {
            'success': '#28a745',
            'error': '#dc3545',
            'warning': '#ffc107',
            'info': '#17a2b8',
            'primary': '#007bff'
        };
        return colors[type] || colors['info'];
    }
    
    getNotificationIcon(type) {
        const icons = {
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-triangle',
            'warning': 'fa-exclamation-circle',
            'info': 'fa-info-circle',
            'primary': 'fa-bell'
        };
        return icons[type] || icons['info'];
    }
    
    removeNotification(element) {
        if (element && element.parentNode) {
            // Add removing class for exit animation (CSP-compliant)
            element.classList.add('notification-removing');
            setTimeout(() => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            }, 300);
        }
    }
    
    clearAllNotifications() {
        this.notifications.forEach(notification => {
            this.removeNotification(notification.element);
        });
        this.notifications = [];
    }
    
    showNotification(title, message, type = 'info', duration = 2000) {
        this.addNotification({
            title,
            message,
            type,
            duration
        });
    }
    
    updateState(newState) {
        this.state = { ...this.state, ...newState };
        this.emit('stateChanged', this.state);
    }
    
    toggleTheme() {
        this.cycleTheme();
    }
    
    setSearchQuery(query) {
        this.searchQuery = query;
        console.log('UI Search query:', query);
        this.emit('searchQueryChanged', { query });
    }
    
    initializeTheme() {
        // Get saved theme preference
        const savedTheme = this.getItem('selectedTheme', 'auto');
        console.log('🎨 Initializing theme system with saved preference:', savedTheme);
        
        this.state.theme = savedTheme;
        this.applyTheme(savedTheme);
        this.updateThemeButton(savedTheme);
        
        // Listen for system theme changes if in auto mode
        if (savedTheme === 'auto') {
            this.setupSystemThemeListener();
        }
    }
    
    loadTheme() {
        // Legacy method - now just calls initializeTheme
        this.initializeTheme();
    }
    
    setTheme(theme) {
        console.log('🎨 Setting theme to:', theme);
        
        if (!['light', 'dark', 'auto'].includes(theme)) {
            console.warn('Invalid theme:', theme, 'defaulting to auto');
            theme = 'auto';
        }
        
        this.state.theme = theme;
        this.setItem('selectedTheme', theme);
        
        this.applyTheme(theme);
        this.updateThemeButton(theme);
        
        // Setup or remove system theme listener based on theme
        if (theme === 'auto') {
            this.setupSystemThemeListener();
        } else {
            this.removeSystemThemeListener();
        }
        
        this.emit('themeChanged', theme);
        console.log('✅ Theme applied:', theme);
    }
    
    applyTheme(theme) {
        const body = document.body;
        const html = document.documentElement;
        
        // Remove all existing theme classes
        body.classList.remove('theme-light', 'theme-dark', 'theme-auto');
        html.classList.remove('theme-light', 'theme-dark', 'theme-auto');
        body.removeAttribute('data-theme');
        html.removeAttribute('data-theme');
        
        let effectiveTheme = theme;
        
        // Handle auto theme
        if (theme === 'auto') {
            effectiveTheme = this.getSystemTheme();
            console.log('🔄 Auto theme detected system preference:', effectiveTheme);
        }
        
        // Apply theme classes and attributes
        body.classList.add(`theme-${theme}`); // Original preference
        html.classList.add(`theme-${theme}`);
        body.setAttribute('data-theme', effectiveTheme); // Effective theme for CSS
        html.setAttribute('data-theme', effectiveTheme);
        
        // Update CSS custom properties for theme
        this.updateThemeProperties(effectiveTheme);
        
        console.log(`🎨 Applied theme: ${theme} (effective: ${effectiveTheme})`);
    }
    
    updateThemeProperties(effectiveTheme) {
        const root = document.documentElement;
        
        if (effectiveTheme === 'dark') {
            root.style.setProperty('--background-color', '#1a202c');
            root.style.setProperty('--surface-color', '#2d3748');
            root.style.setProperty('--surface-color-hover', '#4a5568');
            root.style.setProperty('--text-color', '#ffffff');
            root.style.setProperty('--text-color-secondary', '#a0aec0');
            root.style.setProperty('--text-color-muted', '#718096');
            root.style.setProperty('--border-color', '#4a5568');
            root.style.setProperty('--primary-color', '#4299e1');
            root.style.setProperty('--success-color', '#48bb78');
            root.style.setProperty('--warning-color', '#ed8936');
            root.style.setProperty('--danger-color', '#f56565');
        } else {
            root.style.setProperty('--background-color', '#ffffff');
            root.style.setProperty('--surface-color', '#f7fafc');
            root.style.setProperty('--surface-color-hover', '#edf2f7');
            root.style.setProperty('--text-color', '#1a202c');
            root.style.setProperty('--text-color-secondary', '#4a5568');
            root.style.setProperty('--text-color-muted', '#718096');
            root.style.setProperty('--border-color', '#e2e8f0');
            root.style.setProperty('--primary-color', '#3182ce');
            root.style.setProperty('--success-color', '#38a169');
            root.style.setProperty('--warning-color', '#d69e2e');
            root.style.setProperty('--danger-color', '#e53e3e');
        }
    }
    
    getSystemTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    }
    
    setupSystemThemeListener() {
        if (!window.matchMedia) return;
        
        // Remove existing listener if any
        this.removeSystemThemeListener();
        
        this.systemThemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        this.systemThemeListener = (e) => {
            if (this.state.theme === 'auto') {
                const newTheme = e.matches ? 'dark' : 'light';
                console.log('🔄 System theme changed to:', newTheme);
                this.applyTheme('auto'); // Re-apply auto theme with new system preference
            }
        };
        
        this.systemThemeMediaQuery.addEventListener('change', this.systemThemeListener);
        console.log('👂 System theme listener setup');
    }
    
    removeSystemThemeListener() {
        if (this.systemThemeMediaQuery && this.systemThemeListener) {
            this.systemThemeMediaQuery.removeEventListener('change', this.systemThemeListener);
            this.systemThemeMediaQuery = null;
            this.systemThemeListener = null;
            console.log('🚫 System theme listener removed');
        }
    }
    
    updateThemeButton(theme) {
        const themeBtn = document.getElementById('themeBtn');
        if (!themeBtn) return;
        
        const icon = themeBtn.querySelector('i');
        const text = themeBtn.querySelector('.btn-text');
        
        let iconClass, buttonText;
        
        switch (theme) {
            case 'light':
                iconClass = 'fa fa-sun-o';
                buttonText = 'Light';
                break;
            case 'dark':
                iconClass = 'fa fa-moon-o';
                buttonText = 'Dark';
                break;
            case 'auto':
            default:
                iconClass = 'fa fa-adjust';
                buttonText = 'Auto';
                break;
        }
        
        if (icon) icon.className = iconClass;
        if (text) text.textContent = buttonText;
        
        // Update button title
        themeBtn.title = `Current theme: ${theme}`;
        
        console.log('🔘 Theme button updated:', theme, iconClass);
    }
    
    cycleTheme() {
        const themes = ['auto', 'light', 'dark'];
        const currentIndex = themes.indexOf(this.state.theme);
        const nextIndex = (currentIndex + 1) % themes.length;
        const nextTheme = themes[nextIndex];
        
        console.log('🔄 Cycling theme:', this.state.theme, '->', nextTheme);
        this.setTheme(nextTheme);
        
        // Show notification about theme change
        this.addNotification({
            type: 'info',
            title: 'Theme Changed',
            message: `Theme set to ${nextTheme}`,
            duration: 2000
        });
    }
    
    // Utility methods for database access
    getItem(key, defaultValue = null) {
        try {
            if (window.localDB && typeof window.localDB.getItem === 'function') {
                return window.localDB.getItem(key, defaultValue);
            } else {
                const item = localStorage.getItem(key);
                return item !== null ? item : defaultValue;
            }
        } catch (error) {
            console.error('getItem error:', error);
            return defaultValue;
        }
    }
    
    setItem(key, value) {
        try {
            if (window.localDB && typeof window.localDB.setItem === 'function') {
                return window.localDB.setItem(key, value);
            } else {
                localStorage.setItem(key, value);
                return true;
            }
        } catch (error) {
            console.error('setItem error:', error);
            return false;
        }
    }
    
    setSearchQuery(query) {
        this.searchQuery = query;
        console.log('UI Search query:', query);
        this.emit('searchQueryChanged', { query });
    }
    
    addCall(lineNumber, callData) {
        this.activeCalls.set(lineNumber, callData);
        console.log(`UI Call added on line ${lineNumber}`);
        this.emit('callAdded', { lineNumber, callData });
    }
    
    removeCall(lineNumber) {
        const callData = this.activeCalls.get(lineNumber);
        this.activeCalls.delete(lineNumber);
        console.log(`UI Call removed from line ${lineNumber}`);
        this.emit('callRemoved', { lineNumber, callData });
    }
    
    updateCallState(lineNumber, state) {
        const callData = this.activeCalls.get(lineNumber);
        if (callData) {
            callData.state = state;
            console.log(`UI Call state updated on line ${lineNumber}: ${state}`);
            this.emit('callStateChanged', { lineNumber, state, callData });
        }
    }
    
    // Duplicate code removed - using first instance of notification methods above
    
    addBuddy(buddy) {
        const existingIndex = this.buddies.findIndex(b => b.identity === buddy.identity);
        if (existingIndex >= 0) {
            this.buddies[existingIndex] = buddy;
        } else {
            this.buddies.push(buddy);
        }
        
        this.emit('buddyAdded', { buddy });
        this.updateBuddyList();
    }
    
    removeBuddy(identity) {
        const index = this.buddies.findIndex(b => b.identity === identity);
        if (index >= 0) {
            const buddy = this.buddies.splice(index, 1)[0];
            this.emit('buddyRemoved', { buddy });
            this.updateBuddyList();
        }
    }
    
    updateBuddyPresence(target, state, blfState) {
        const buddy = this.buddies.find(b => b.SubscribeUser === target || b.number === target);
        if (buddy) {
            buddy.presence = state;
            buddy.devState = this.mapBlfToDevState(blfState);
            
            console.log(`Buddy presence updated: ${target} -> ${state} (${blfState})`);
            this.emit('buddyPresenceChanged', { buddy, state, blfState });
            this.updateBuddyList();
        }
    }
    
    mapBlfToDevState(blfState) {
        const stateMap = {
            'idle': 'dotOnline',
            'busy': 'dotBusy',
            'ringing': 'dotRinging',
            'unknown': 'dotOffline'
        };
        return stateMap[blfState] || 'dotOffline';
    }
    
    updateBuddyList() {
        // Update the contact list UI
        const contactArea = document.getElementById('contactArea');
        if (contactArea && this.currentView === 'contacts') {
            this.renderContactList();
        }
    }
    
    renderContactList() {
        const contactArea = document.querySelector('#contactArea .contactArea');
        if (!contactArea) return;
        
        contactArea.innerHTML = '';
        
        if (this.buddies.length === 0) {
            const noContacts = document.querySelector('.no-contacts-message');
            if (noContacts) {
                noContacts.classList.remove('hidden');
            }
            return;
        }
        
        // Hide no contacts message
        const noContacts = document.querySelector('.no-contacts-message');
        if (noContacts) {
            noContacts.classList.add('hidden');
        }
        
        // Filter buddies based on search query
        const filteredBuddies = this.buddies.filter(buddy => {
            if (!this.searchQuery) return true;
            const query = this.searchQuery.toLowerCase();
            return (
                buddy.callerID.toLowerCase().includes(query) ||
                buddy.number.toLowerCase().includes(query)
            );
        });
        
        // Create contact elements
        filteredBuddies.forEach(buddy => {
            const contactElement = this.createContactElement(buddy);
            contactArea.appendChild(contactElement);
        });
    }
    
    createContactElement(buddy) {
        const element = document.createElement('div');
        element.className = 'contact-item';
        
        // Determine status class for styling
        const statusClass = `contact-status-${buddy.devState || 'offline'}`;
        
        element.innerHTML = `
            <div class="contact-status ${statusClass}"></div>
            <div class="contact-info">
                <div class="contact-name">${buddy.callerID}</div>
                <div class="contact-number">${buddy.number}</div>
            </div>
            <button class="contact-call-btn btn-sm btn-primary" data-number="${buddy.number}">
                <i class="fa fa-phone"></i>
            </button>
        `;
        
        // Add click handler for call button (CSP-compliant)
        const callBtn = element.querySelector('.contact-call-btn');
        if (callBtn) {
            callBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const number = callBtn.getAttribute('data-number');
                if (number && typeof makeCall === 'function') {
                    makeCall(number);
                }
            });
        }
        
        // Add click handler for contact details
        element.addEventListener('click', (e) => {
            if (!e.target.closest('.contact-call-btn')) {
                this.emit('buddySelected', { current: buddy });
            }
        });
        
        return element;
    }
    
    // Event emitter compatibility methods
    on(event, callback) {
        this.addEventListener(event, callback);
    }
    
    off(event, callback) {
        this.removeEventListener(event, callback);
    }
    
    emit(event, data) {
        this.dispatchEvent(new CustomEvent(event, { detail: data }));
    }
    
    destroy() {
        this.activeCalls.clear();
        this.clearAllNotifications();
        
        // Remove notification container
        if (this.notificationContainer && this.notificationContainer.parentNode) {
            this.notificationContainer.parentNode.removeChild(this.notificationContainer);
        }
        
        console.log('UI State Manager destroyed');
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .notification {
        position: relative;
    }
    
    .notification button {
        border: none;
        border-radius: 3px;
        cursor: pointer;
        font-size: 12px;
    }
    
    .btn-primary {
        background-color: var(--primary-color, #007bff);
        color: white;
    }
    
    .btn-success {
        background-color: var(--success-color, #28a745);
        color: white;
    }
    
    .btn-danger {
        background-color: var(--danger-color, #dc3545);
        color: white;
    }
`;
document.head.appendChild(style);

// Export for use in other files
window.UIStateManager = UIStateManager;

console.log('✓ UI State Manager loaded');