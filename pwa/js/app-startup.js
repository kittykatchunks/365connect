/* ====================================================================================== */
/* AUTOCAB365CONNECT PWA - APPLICATION STARTUP */
/* Handles application initialization and dependency management */
/* Version: 0.1.001 */
/* ====================================================================================== */

class ApplicationStartup {
    constructor() {
        // Provide temporary fallback translation function
        if (typeof window.t === 'undefined') {
            window.t = (key, defaultValue = null) => defaultValue || key;
        }
        
        this.loadingSteps = [
            () => this.getTranslatedText('checking_dependencies', 'Checking dependencies...'),
            () => this.getTranslatedText('initializing_localdb', 'Initializing LocalDB...'),
            () => this.getTranslatedText('loading_language_files', 'Loading language files...'),
            () => this.getTranslatedText('loading_configuration', 'Loading configuration...'),
            () => this.getTranslatedText('creating_managers', 'Creating managers...'),
            () => this.getTranslatedText('setting_up_ui', 'Setting up UI...'),
            () => this.getTranslatedText('finalizing', 'Finalizing...')
        ];
        this.currentStep = 0;
        this.initialized = false;
    }
    
    getTranslatedText(key, defaultValue) {
        // Safely get translated text, using fallback if translation system not ready
        if (typeof window.t === 'function') {
            return window.t(key, defaultValue);
        }
        return defaultValue || key;
    }
    
    async initialize() {
        console.log('🏁 Starting Autocab365 PWA initialization...');
        
        try {
            this.showLoadingScreen();
            
            // Step 1: Check dependencies
            this.updateLoadingStatus(0);
            await this.checkDependencies();
            
            // Step 2: Initialize LocalDB
            this.updateLoadingStatus(1);
            await this.initializeLocalDB();
            
            // Step 3: Load language files
            this.updateLoadingStatus(2);
            await this.initializeLanguage();
            
            // Step 4: Load configuration
            this.updateLoadingStatus(3);
            await this.loadConfiguration();
            
            // Step 5: Create managers
            this.updateLoadingStatus(4);
            await this.createManagers();
            
            // Step 6: Set up UI
            this.updateLoadingStatus(5);
            await this.setupUI();
            
            // Step 7: Finalize
            this.updateLoadingStatus(6);
            await this.finalize();
            
            this.hideLoadingScreen();
            this.initialized = true;
            
            console.log('🎉 Autocab365 PWA initialized successfully');
            WebHooks.onInit();
            
        } catch (error) {
            console.error('💥 Application initialization failed:', error);
            this.showInitializationError(error);
        }
    }
    
    showLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
        }
    }
    
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }
    
    updateLoadingStatus(stepIndex) {
        this.currentStep = stepIndex;
        const statusElement = document.getElementById('loadingStatus');
        const progressBar = document.getElementById('loadingBar');
        
        if (statusElement && this.loadingSteps[stepIndex]) {
            const message = typeof this.loadingSteps[stepIndex] === 'function' ? 
                this.loadingSteps[stepIndex]() : this.loadingSteps[stepIndex];
            statusElement.textContent = message;
        }
        
        if (progressBar) {
            const progress = ((stepIndex + 1) / this.loadingSteps.length) * 100;
            progressBar.style.width = `${progress}%`;
        }
    }
    
    async checkDependencies() {
        const requiredDependencies = {
            'jQuery': () => typeof window.$ !== 'undefined',
            'SIP.js': () => typeof window.SIP !== 'undefined',
            'Moment.js': () => typeof window.moment !== 'undefined'
        };
        
        const missingDeps = [];
        
        for (const [name, checkFn] of Object.entries(requiredDependencies)) {
            if (!checkFn()) {
                missingDeps.push(name);
            }
        }
        
        if (missingDeps.length > 0) {
            throw new Error(`Missing required dependencies: ${missingDeps.join(', ')}`);
        }
        
                console.log('✅ All managers initialized successfully');
        
        // Setup voicemail MWI after managers are initialized
        setTimeout(() => {
            if (window.setupVoicemailMWI) {
                window.setupVoicemailMWI();
            }
        }, 1000);
    }
    
    async initializeLocalDB() {
        // Wait for LocalDB to be available
        let attempts = 0;
        const maxAttempts = 20;
        
        while (!window.localDB && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.localDB) {
            throw new Error('LocalDB failed to initialize after 2 seconds');
        }
        
        // Test LocalDB functionality
        const testKey = 'startup_test';
        const testValue = Date.now().toString();
        
        if (!window.localDB.setItem(testKey, testValue)) {
            throw new Error('LocalDB write test failed');
        }
        
        if (window.localDB.getItem(testKey) !== testValue) {
            throw new Error('LocalDB read test failed');
        }
        
        window.localDB.removeItem(testKey);
        console.log('✅ LocalDB initialized and tested');
    }
    
    async initializeLanguage() {
        console.log('Loading language system...');
        
        // Language Manager should be available from the included script
        if (typeof LanguageManager === 'undefined') {
            console.warn('⚠️ Language Manager not available, creating fallback...');
            // Create minimal fallback translation functions
            window.t = (key, defaultValue = null) => defaultValue || key;
            window.translate = window.t;
            return;
        }
        
        try {
            // Create and initialize language manager if not already done
            if (!window.languageManager) {
                window.languageManager = new LanguageManager();
                await window.languageManager.initialize();
                
                // Add to App managers
                if (window.App && window.App.managers) {
                    window.App.managers.language = window.languageManager;
                }
                
                // Create global translation functions
                window.t = window.languageManager.t;
                window.translate = window.languageManager.translate;
            }
            
            console.log('✅ Language system initialized');
            
        } catch (error) {
            console.error('❌ Language initialization failed:', error);
            // Create fallback translation functions
            window.t = (key, defaultValue = null) => defaultValue || key;
            window.translate = window.t;
        }
    }
    
    async loadConfiguration() {
        console.log('Loading application configuration...');
        
        // Load application configuration
        if (typeof loadApplicationConfig === 'function') {
            loadApplicationConfig();
        }
    }
    
    async createManagers() {
        console.log('🎨 Creating UI State Manager...');
        App.managers.ui = new UIStateManager();
        console.log('✅ UI State Manager created');
        
        console.log('📞 Creating SIP Session Manager...');
        App.managers.sip = new SipSessionManager();
        console.log('✅ SIP Session Manager created');
                console.log('📱 Creating Line Key Manager...');
        App.managers.lineKeys = new LineKeyManager();
        console.log('✅ Line Key Manager created');
        
        // Link LineKeyManager to SipSessionManager
        App.managers.sip.setLineKeyManager(App.managers.lineKeys);
        console.log('✅ Line Key Manager linked to SIP Manager');
                console.log('� Creating Busylight Manager...');
        App.managers.busylight = new BusylightManager();
        // Initialize busylight after creation
        try {
            await App.managers.busylight.initialize();
            console.log('✅ Busylight Manager created and initialized');
        } catch (error) {
            console.warn('⚠️ Busylight initialization warning:', error.message);
            console.log('✅ Busylight Manager created (connection will retry when enabled)');
        }
        
        console.log('🔊 Creating Audio Settings Manager...');
        App.managers.audio = new AudioSettingsManager();
        console.log('✅ Audio Settings Manager created');
        
        console.log('🌐 Creating Phantom API Manager...');
        App.managers.api = new PhantomApiManager();
        console.log('✅ Phantom API Manager created');
        
        console.log('📞 Creating Call History Manager...');
        App.managers.callHistory = new CallHistoryManager();
        console.log('✅ Call History Manager created');
        
        console.log('📋 Creating Contacts Manager...');
        App.managers.contacts = new ContactsManager();
        console.log('✅ Contacts Manager created');
        
        console.log('🏢 Creating Company Numbers Manager...');
        App.managers.companyNumbers = new CompanyNumbersManager();
        console.log('✅ Company Numbers Manager created');
        
        // Set up manager event communication
        this.setupManagerEventListeners();
        
        // Set up line key UI handlers
        this.setupLineKeyHandlers();
        
        console.log('✅ All managers created and linked successfully');
    }
    
    async setupUI() {
        // Wait for UI manager to be ready
        if (App.managers.ui) {
            await new Promise(resolve => {
                if (App.managers.ui.notificationContainer) {
                    resolve();
                } else {
                    setTimeout(resolve, 200);
                }
            });
        }
        
        // Initialize theme system
        if (typeof initializeTheme === 'function') {
            initializeTheme();
        }
        
        // Set default view
        if (App.managers.ui && typeof App.managers.ui.setCurrentView === 'function') {
            App.managers.ui.setCurrentView('dial');
        }
        
        // Initialize container visibility
        if (typeof initializeContainerVisibility === 'function') {
            initializeContainerVisibility();
        }
        
        // Set up UI event handlers
        if (typeof setupUIEventHandlers === 'function') {
            setupUIEventHandlers();
        }
        
        console.log('✅ UI setup completed');
    }
    
    async finalize() {
        // Clear dial input on app startup
        if (typeof clearDialInput === 'function') {
            try {
                clearDialInput();
                console.log('✅ Dial input cleared on startup');
            } catch (error) {
                console.warn('⚠️ Failed to clear dial input:', error);
            }
        }

        // Initialize last dialed number from storage
        if (typeof getLastDialedNumber === 'function') {
            try {
                const lastNumber = getLastDialedNumber();
                if (lastNumber) {
                    console.log('✅ Last dialed number loaded:', lastNumber);
                }
            } catch (error) {
                console.warn('⚠️ Failed to load last dialed number:', error);
            }
        }

        // Load settings into form
        if (typeof loadSettingsIntoForm === 'function') {
            try {
                loadSettingsIntoForm();
            } catch (error) {
                console.warn('⚠️ Failed to load settings into form:', error);
            }
        }
        
        // Initialize API manager
        if (App.managers.api) {
            try {
                await App.managers.api.initialize();
                console.log('✅ Phantom API initialized');
            } catch (error) {
                console.warn('⚠️ Failed to initialize Phantom API:', error);
            }
        }
        
        // Initialize Audio Settings manager
        if (App.managers.audio) {
            try {
                await App.managers.audio.initialize();
                console.log('✅ Audio Settings Manager initialized');
            } catch (error) {
                console.warn('⚠️ Failed to initialize Audio Settings Manager:', error);
            }
        }
        
        // Initialize Contacts manager
        if (App.managers.contacts) {
            try {
                await App.managers.contacts.initialize();
                console.log('✅ Contacts Manager initialized');
            } catch (error) {
                console.warn('⚠️ Failed to initialize Contacts Manager:', error);
            }
        }
        
        // Initialize Company Numbers manager
        if (App.managers.companyNumbers) {
            try {
                await App.managers.companyNumbers.initialize();
                console.log('✅ Company Numbers Manager initialized');
            } catch (error) {
                console.warn('⚠️ Failed to initialize Company Numbers Manager:', error);
            }
        }
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Request notification permissions for incoming calls
        await this.requestNotificationPermissions();
        
        // Initialize register button state
        if (typeof updateRegisterButton === 'function') {
            updateRegisterButton('unregistered');
            console.log('✅ Register button initialized');
        }
        
        // Mark as initialized
        App.initialized = true;
        
        // Dispatch initialization complete event
        document.dispatchEvent(new CustomEvent('managersInitialized'));
    }

    setupManagerEventListeners() {
        const { sip, ui, busylight, api, callHistory } = App.managers;
        
        // SIP Events -> UI Updates  
        sip.on('sessionCreated', (sessionData) => {
            ui.addCall(sessionData.lineNumber, sessionData);
            if (typeof updateCallControls === 'function') updateCallControls(true);
            this.updateCallControls(); // Update buttons for the new session
            
            if (sessionData.direction === 'incoming') {
                if (typeof showIncomingCallNotification === 'function') {
                    showIncomingCallNotification(sessionData);
                }
                // Busylight handles incoming calls via its own event listener
            }
        });
        
        sip.on('sessionAnswered', (sessionData) => {
            ui.updateCallState(sessionData.lineNumber, 'active');
            if (typeof startCallTimer === 'function') startCallTimer(sessionData);
            this.updateCallControls(); // Update buttons when call is answered
            // Busylight handles call answered via its own event listener
        });
        
        sip.on('sessionStateChanged', (data) => {
            // Update call controls whenever any session state changes
            this.updateCallControls();
            this.updateLineKeyUI();
        });
        
        sip.on('sessionTerminated', (sessionData) => {
            ui.removeCall(sessionData.lineNumber);
            if (typeof stopCallTimer === 'function') stopCallTimer(sessionData.id);
            
            // Stop tab flashing when call is terminated
            if (window.TabAlertManager) {
                window.TabAlertManager.stopFlashing();
            }
            
            const activeSessions = sip.getActiveSessions();
            if (activeSessions.length === 0) {
                if (typeof updateCallControls === 'function') updateCallControls(false);
            }
            // Busylight handles call termination via its own event listener
        });
        
        sip.on('registered', () => {
            // Note: setConnectionState is handled via registrationStateChanged event
            if (typeof updateRegistrationButton === 'function') updateRegistrationButton(true);
            if (typeof subscribeToAllBuddies === 'function') subscribeToAllBuddies();
            // Note: Notification is handled via connectionStateChanged event listener
            // Busylight handles registration via its own event listener
        });
        
        sip.on('unregistered', () => {
            // Note: setConnectionState and notification are handled via registrationStateChanged event
            if (typeof updateRegistrationButton === 'function') updateRegistrationButton(false);
            // Busylight handles unregistration via its own event listener
        });
        
        sip.on('registrationFailed', (error) => {
            ui.setConnectionState('failed');
            // Note: Notification with retry actions is handled in phone.js to avoid duplicates
            if (typeof updateRegistrationButton === 'function') updateRegistrationButton(false);
        });
        
        // API Events -> Notifications
        api.on('initialized', (config) => {
            console.log('Phantom API initialized:', config);
        });
        
        api.on('error', (errorData) => {
            console.error('Phantom API error:', errorData);
            if (typeof showErrorNotification === 'function') {
                showErrorNotification('API Error', errorData.message || 'API request failed');
            }
        });
        
        api.on('connectionTest', (result) => {
            if (result.success) {
                console.log('Phantom API connection test passed');
                if (typeof showSuccessNotification === 'function') {
                    showSuccessNotification('API Connected', 'Phantom API connection successful');
                }
            } else {
                console.warn('Phantom API connection test failed:', result.error);
            }
        });
        
        // Call History Integration
        if (callHistory) {
            // Track which sessions have been logged to prevent duplicates
            const loggedSessions = new Set();
            
            // Simple approach: Log each ring cycle independently
            // Missed rings = separate missed entries
            // Answered call = one answered entry
            
            const handleCallTermination = (sessionData) => {
                // Prevent duplicate logging for the same session
                if (loggedSessions.has(sessionData.id)) {
                    console.log('📞 Session already logged, skipping:', sessionData.id);
                    return;
                }
                
                // Mark this session as logged
                loggedSessions.add(sessionData.id);
                
                // Clean up old logged sessions (keep last 100)
                if (loggedSessions.size > 100) {
                    const oldestSessions = Array.from(loggedSessions).slice(0, loggedSessions.size - 100);
                    oldestSessions.forEach(id => loggedSessions.delete(id));
                }
                
                // Debug: Log the session data to understand structure
                console.log('📞 Processing call termination for history:', {
                    id: sessionData.id,
                    direction: sessionData.direction,
                    callerID: sessionData.callerID,
                    target: sessionData.target,
                    duration: sessionData.duration,
                    session: sessionData.session ? {
                        remoteIdentity: sessionData.session.remoteIdentity
                    } : 'No session object'
                });
                
                // Extract proper number and name based on call direction
                let number, name;
                
                if (sessionData.direction === 'incoming') {
                    // For incoming calls, try multiple sources for the number
                    if (sessionData.session?.remoteIdentity?.uri?.user) {
                        number = sessionData.session.remoteIdentity.uri.user;
                    } else if (sessionData.callerID && sessionData.callerID !== 'Unknown') {
                        number = sessionData.callerID;
                    } else if (sessionData.target) {
                        number = sessionData.target;
                    } else {
                        number = 'Unknown';
                    }
                    
                    // Extract display name if available
                    name = sessionData.session?.remoteIdentity?.displayName || null;
                    
                } else {
                    // For outgoing calls, use target
                    number = sessionData.target || 'Unknown';
                    name = null; // Outgoing calls typically don't have display names
                    
                    // Clean up the number if it has sip: prefix
                    if (typeof number === 'string' && number.startsWith('sip:')) {
                        number = number.replace('sip:', '').split('@')[0];
                    }
                }
                
                // Calculate call duration and status
                const startTime = sessionData.startTime ? sessionData.startTime.getTime() : Date.now();
                const endTime = Date.now();
                let duration = 0;
                let status = 'completed';
                
                // Check if call was answered by looking at session state and duration
                if (sessionData.duration > 0) {
                    duration = sessionData.duration;
                    status = 'completed';
                } else if (sessionData.direction === 'incoming') {
                    // Incoming call with no duration = missed
                    status = 'missed';
                } else if (sessionData.direction === 'outgoing') {
                    // Outgoing call with no duration = cancelled
                    status = 'cancelled';
                }
                
                const historyEntry = {
                    number: number,
                    name: name,
                    direction: sessionData.direction,
                    timestamp: startTime,
                    duration: duration,
                    status: status
                };
                
                console.log('📞 Adding call to history:', historyEntry);
                callHistory.addCall(historyEntry);
                
                // Update UI if we're on the activity tab
                if (ui.state && ui.state.currentView === 'activity') {
                    setTimeout(() => {
                        callHistory.refreshHistoryDisplay();
                        callHistory.updateStatistics();
                    }, 100);
                }
            };
            
            // Single event listener for session termination
            sip.on('sessionTerminated', handleCallTermination);
            
            // Initialize history display when view changes to activity
            if (ui.addEventListener) {
                ui.addEventListener('viewChanged', (event) => {
                    if (event.detail && event.detail.view === 'activity') {
                        setTimeout(() => {
                            callHistory.refreshHistoryDisplay();
                            callHistory.updateStatistics();
                        }, 100);
                    }
                });
            }
            
            console.log('✅ Call history integration established');
        }
        
        console.log('✅ Manager event listeners established');
    }

    setupLineKeyHandlers() {
        const { lineKeys, sip } = App.managers;
        
        console.log('📱 Setting up line key event handlers...');
        
        // Set up click handlers for line keys
        for (let i = 1; i <= 3; i++) {
            const lineKeyElement = document.getElementById(`lineKey${i}`);
            if (lineKeyElement) {
                lineKeyElement.addEventListener('click', () => {
                    console.log(`📞 Line ${i} clicked`);
                    lineKeys.selectLine(i);
                    this.updateLineKeyUI();
                });
            }
        }
        
        // Listen to line state changes from LineKeyManager
        lineKeys.on('lineStateChanged', (data) => {
            console.log('📊 Line state changed:', data);
            this.updateLineKeyUI();
            this.updateCallDisplayForSelectedLine();
        });
        
        // Listen to line selection changes
        lineKeys.on('lineChanged', (data) => {
            console.log('📞 Line selection changed:', data);
            
            // Auto-hold the previous line if it has an active call
            if (data.previousLine && sip) {
                const previousSession = sip.getSessionByLine(data.previousLine);
                console.log(`🔍 Checking previous line ${data.previousLine} for auto-hold:`, previousSession ? {
                    id: previousSession.id,
                    state: previousSession.state,
                    onHold: previousSession.onHold
                } : 'no session');
                
                if (previousSession && 
                    (previousSession.state === 'active' || previousSession.state === 'established') && 
                    !previousSession.onHold) {
                    console.log(`🔄 Auto-holding line ${data.previousLine}, session ${previousSession.id}`);
                    sip.holdSession(previousSession.id).then(() => {
                        console.log(`✅ Successfully auto-held line ${data.previousLine}`);
                        this.updateCallControls();
                        this.updateLineKeyUI();
                    }).catch(err => {
                        console.error('❌ Failed to auto-hold previous line:', err);
                    });
                } else if (previousSession) {
                    console.log(`⏭️ Skipping auto-hold: state=${previousSession.state}, onHold=${previousSession.onHold}`);
                }
            }
            
            this.updateLineKeyUI();
            this.updateCallDisplayForSelectedLine();
            this.updateCallControls();
        });
        
        // Listen to call waiting tone event from SIP manager
        if (sip) {
            sip.on('callWaitingTone', (data) => {
                console.log('🔔 Call waiting tone triggered for line:', data.lineNumber);
                this.playCallWaitingTone();
            });
        }
        
        // Initial UI update
        this.updateLineKeyUI();
        
        console.log('✅ Line key handlers established');
    }
    
    updateLineKeyUI() {
        const lineKeys = App.managers.lineKeys;
        if (!lineKeys) return;
        
        const selectedLine = lineKeys.getSelectedLine();
        
        for (let i = 1; i <= 3; i++) {
            const lineKeyElement = document.getElementById(`lineKey${i}`);
            if (!lineKeyElement) continue;
            
            const lineInfo = lineKeys.getLineDisplayInfo(i);
            if (!lineInfo) continue;
            
            // Update selected state
            if (i === selectedLine) {
                lineKeyElement.classList.add('selected');
            } else {
                lineKeyElement.classList.remove('selected');
            }
            
            // Remove all state classes
            lineKeyElement.classList.remove('state-idle', 'state-ringing', 'state-active', 'state-hold', 'state-dialing');
            
            // Add current state class
            lineKeyElement.classList.add(`state-${lineInfo.state}`);
            
            // Update info text
            const infoElement = lineKeyElement.querySelector('.line-key-info');
            if (infoElement) {
                if (lineInfo.state === 'idle') {
                    infoElement.textContent = lineInfo.statusText;
                } else if (lineInfo.callerDisplay) {
                    // Always show caller info (not timer)
                    infoElement.textContent = lineInfo.callerDisplay.substring(0, 15); // Truncate long names
                } else {
                    infoElement.textContent = lineInfo.statusText;
                }
            }
        }
    }
    
    updateCallDisplayForSelectedLine() {
        const lineKeys = App.managers.lineKeys;
        const sip = App.managers.sip;
        if (!lineKeys || !sip) return;
        
        const selectedLine = lineKeys.getSelectedLine();
        const sessionData = sip.getSessionByLine(selectedLine);
        
        console.log('🖥️ updateCallDisplayForSelectedLine - Line:', selectedLine, 'Session:', sessionData ? {
            id: sessionData.id,
            state: sessionData.state,
            onHold: sessionData.onHold
        } : 'none');
        
        const dialInputRow = document.getElementById('dialInputRow');
        const callStatusRow = document.getElementById('callStatusRow');
        
        if (sessionData && sessionData.state !== 'terminated') {
            // Show call info, hide dial input
            console.log('🖥️ Showing call status, hiding dial input');
            if (dialInputRow) {
                dialInputRow.classList.add('hidden');
                dialInputRow.style.display = ''; // Clear inline styles
                console.log('🖥️ dialInputRow hidden:', dialInputRow.classList.contains('hidden'), 'computed style:', window.getComputedStyle(dialInputRow).display);
            }
            if (callStatusRow) {
                callStatusRow.classList.remove('hidden');
                callStatusRow.style.display = ''; // Clear inline styles
                console.log('🖥️ callStatusRow visible:', !callStatusRow.classList.contains('hidden'), 'computed style:', window.getComputedStyle(callStatusRow).display);
            }
            
            // Update call info
            const callerNumber = document.getElementById('callerNumber');
            const callerName = document.getElementById('callerName');
            const callDirection = document.getElementById('callDirection');
            const callDuration = document.getElementById('callDuration');
            
            if (callerNumber) {
                callerNumber.textContent = sessionData.remoteNumber || sessionData.target || 'Unknown';
            }
            
            if (callerName) {
                if (sessionData.remoteIdentity && sessionData.remoteIdentity !== sessionData.remoteNumber) {
                    callerName.textContent = sessionData.remoteIdentity;
                    callerName.classList.remove('hidden');
                } else {
                    callerName.classList.add('hidden');
                }
            }
            
            if (callDirection) {
                const directionText = sessionData.direction === 'incoming' ? 'Incoming' : 'Outgoing';
                callDirection.textContent = directionText;
            }
            
            // Duration will be updated by timer
            
        } else {
            // Show dial input, hide call info
            console.log('🖥️ Hiding call status, showing dial input');
            if (dialInputRow) {
                dialInputRow.classList.remove('hidden');
                dialInputRow.style.display = ''; // Clear inline styles
                console.log('🖥️ dialInputRow visible:', !dialInputRow.classList.contains('hidden'), 'computed style:', window.getComputedStyle(dialInputRow).display);
            }
            if (callStatusRow) {
                callStatusRow.classList.add('hidden');
                callStatusRow.style.display = ''; // Clear inline styles
                console.log('🖥️ callStatusRow hidden:', callStatusRow.classList.contains('hidden'), 'computed style:', window.getComputedStyle(callStatusRow).display);
                
                // Clear call info text to prevent stale data
                const callerNumber = document.getElementById('callerNumber');
                const callerName = document.getElementById('callerName');
                const callDirection = document.getElementById('callDirection');
                const callDuration = document.getElementById('callDuration');
                if (callerNumber) callerNumber.textContent = '--';
                if (callerName) {
                    callerName.textContent = '--';
                    callerName.classList.add('hidden');
                }
                if (callDirection) callDirection.textContent = '--';
                if (callDuration) callDuration.textContent = '00:00';
                console.log('🖥️ Call info cleared');
            }
        }
    }
    
    updateCallControls() {
        const lineKeys = App.managers.lineKeys;
        const sip = App.managers.sip;
        if (!lineKeys || !sip) return;
        
        const selectedLine = lineKeys.getSelectedLine();
        const sessionData = sip.getSessionByLine(selectedLine);
        
        console.log('🎛️ updateCallControls for line', selectedLine, 'sessionData:', sessionData ? {
            id: sessionData.id,
            state: sessionData.state,
            onHold: sessionData.onHold,
            muted: sessionData.muted
        } : 'null');
        
        // Get UI elements
        const callControls = document.getElementById('callControls');
        const dialActions = document.querySelector('.dial-actions');
        const callBtn = document.getElementById('callBtn');
        const hangupBtn = document.getElementById('hangupBtn');
        const muteBtn = document.getElementById('muteBtn');
        const holdBtn = document.getElementById('holdBtn');
        const transferBtn = document.getElementById('transferBtn');
        const endCallBtn = document.getElementById('endCallBtn');
        
        // Default: hide call controls, show dial actions
        if (callControls) callControls.classList.add('hidden');
        if (dialActions) {
            dialActions.classList.remove('hidden');
            dialActions.style.display = ''; // Clear any inline styles from phone.js showCallControls()
        }
        
        // Always reset CALL button to default state first
        console.log('🎛️ Resetting buttons - callBtn:', !!callBtn, 'hangupBtn:', !!hangupBtn);
        if (callBtn) {
            callBtn.classList.remove('hidden');
            callBtn.style.display = ''; // Clear any inline styles
            // Use innerHTML to reset button content (preserves icon and bypasses translation system)
            callBtn.innerHTML = '<i class="fa fa-phone"></i> <span data-translate="call">CALL</span>';
            console.log('🎛️ CALL button reset to CALL');
            callBtn.onclick = null; // Reset to default
        } else {
            console.log('❌ callBtn element not found!');
        }
        if (hangupBtn) {
            hangupBtn.classList.remove('hidden');
            hangupBtn.style.display = ''; // Clear any inline styles
        }
        
        if (!sessionData) {
            // No session on this line - CALL/END buttons already shown above
            console.log('🎛️ No session - showing CALL/END buttons');
            return;
        }
        
        // Handle different call states
        console.log('🔍 Session state:', sessionData.state, 'for line', selectedLine);
        
        switch (sessionData.state) {
            case 'ringing':
                // Incoming call - show dial actions but change to ANSWER/END
                console.log('🎛️ Processing RINGING state - should show ANSWER/END');
                if (dialActions) {
                    dialActions.classList.remove('hidden');
                    dialActions.style.display = ''; // Clear inline styles
                }
                if (callBtn) {
                    callBtn.classList.remove('hidden');
                    callBtn.style.display = ''; // Force visible
                    const callBtnLabel = callBtn.querySelector('span');
                    if (callBtnLabel) {
                        callBtnLabel.textContent = 'ANSWER';
                        console.log('✅ Set button text to ANSWER');
                    }
                    callBtn.onclick = () => {
                        console.log('📞 ANSWER button clicked for session:', sessionData.id);
                        sip.answerSession(sessionData.id);
                    };
                }
                if (hangupBtn) {
                    hangupBtn.classList.remove('hidden');
                    hangupBtn.style.display = ''; // Force visible
                }
                if (callControls) callControls.classList.add('hidden');
                console.log('🎛️ Ringing - ANSWER/END buttons should now be visible');
                break;
                
            case 'dialing':
            case 'connecting':
                // Outgoing call connecting - show only END button
                if (dialActions) dialActions.classList.remove('hidden');
                if (callBtn) callBtn.classList.add('hidden');
                if (hangupBtn) hangupBtn.classList.remove('hidden');
                if (callControls) callControls.classList.add('hidden');
                console.log('🎛️ Dialing/Connecting - showing END button only');
                break;
                
            case 'active':
            case 'established':
                // Active call (including on hold) - show call controls (MUTE/HOLD/TRANSFER/END)
                if (dialActions) dialActions.classList.add('hidden');
                if (callControls) callControls.classList.remove('hidden');
                
                // Update mute button state
                if (muteBtn) {
                    if (sessionData.muted) {
                        muteBtn.classList.add('active');
                    } else {
                        muteBtn.classList.remove('active');
                    }
                }
                
                // Update hold button state
                if (holdBtn) {
                    holdBtn.classList.remove('active'); // Remove active class entirely
                    if (sessionData.onHold) {
                        holdBtn.classList.add('on-hold');
                        const holdLabel = holdBtn.querySelector('.btn-label');
                        if (holdLabel) holdLabel.textContent = 'RESUME';
                    } else {
                        holdBtn.classList.remove('on-hold');
                        const holdLabel = holdBtn.querySelector('.btn-label');
                        if (holdLabel) holdLabel.textContent = 'HOLD';
                    }
                }
                console.log('🎛️ Active/Established - showing MUTE/HOLD/TRANSFER/END buttons', sessionData.onHold ? '(ON HOLD)' : '(ACTIVE)');
                break;
                
            default:
                // Any other state - show CALL/END buttons
                if (dialActions) dialActions.classList.remove('hidden');
                if (callBtn) {
                    callBtn.classList.remove('hidden');
                    const callBtnLabel = callBtn.querySelector('span');
                    if (callBtnLabel) callBtnLabel.textContent = 'CALL';
                    callBtn.onclick = null; // Reset to default handler
                }
                if (hangupBtn) hangupBtn.classList.remove('hidden');
                if (callControls) callControls.classList.add('hidden');
                console.log('🎛️ Other state:', sessionData.state, '- showing CALL/END buttons');
        }
    }
    
    playCallWaitingTone() {
        // Create audio context if needed
        if (!window.audioContext) {
            window.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        const ctx = window.audioContext;
        const now = ctx.currentTime;
        
        // Play two short beeps
        for (let i = 0; i < 2; i++) {
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            oscillator.frequency.value = 440; // A4 note
            oscillator.type = 'sine';
            
            const startTime = now + (i * 0.5); // 0.5s apart
            gainNode.gain.setValueAtTime(0.3, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
            
            oscillator.start(startTime);
            oscillator.stop(startTime + 0.3);
        }
        
        console.log('🔔 Call waiting tone played');
    }

    async requestNotificationPermissions() {
        console.log('🔔 Requesting notification permissions...');
        
        try {
            // Check if notifications are supported
            if (!('Notification' in window)) {
                console.log('⚠️ This browser does not support desktop notifications');
                return;
            }
            
            // Check if permission is already granted
            if (Notification.permission === 'granted') {
                console.log('✅ Notification permission already granted');
                return;
            }
            
            // Don't request if explicitly denied
            if (Notification.permission === 'denied') {
                console.log('❌ Notification permission denied by user');
                return;
            }
            
            // Request permission
            const permission = await Notification.requestPermission();
            
            switch (permission) {
                case 'granted':
                    console.log('✅ Notification permission granted');
                    if (App.managers?.ui) {
                        App.managers.ui.addNotification({
                            type: 'success',
                            title: t('notifications_enabled', 'Notifications Enabled'),
                            message: 'You will now receive desktop notifications for incoming calls',
                            duration: 5000
                        });
                    }
                    break;
                    
                case 'denied':
                    console.log('❌ Notification permission denied');
                    if (App.managers?.ui) {
                        App.managers.ui.addNotification({
                            type: 'warning',
                            title: t('notifications_disabled', 'Notifications Disabled'),
                            message: 'Desktop notifications for incoming calls are disabled. You can enable them in browser settings.',
                            duration: 8000
                        });
                    }
                    break;
                    
                default:
                    console.log('⚠️ Notification permission not determined');
                    break;
            }
            
        } catch (error) {
            console.error('❌ Error requesting notification permissions:', error);
        }
    }           
    
    setupEventListeners() {
        // Global keyboard handler for dial pad input
        document.addEventListener('keydown', (event) => {
            // Check if we're on the dial tab
            const dialArea = document.getElementById('dialArea');
            if (!dialArea || dialArea.classList.contains('hidden')) {
                return; // Not on dial tab
            }
            
            // Check if a modal is open
            const modals = document.querySelectorAll('.modal, .settings-modal, [role="dialog"]');
            const modalOpen = Array.from(modals).some(modal => {
                const style = window.getComputedStyle(modal);
                return style.display !== 'none' && !modal.classList.contains('hidden');
            });
            
            if (modalOpen) {
                return; // Modal is open, don't intercept
            }
            
            // Check if user is typing in an input/textarea (but not the dialInput itself)
            const activeElement = document.activeElement;
            const dialInput = document.getElementById('dialInput');
            
            if (activeElement && activeElement !== dialInput) {
                const tagName = activeElement.tagName.toLowerCase();
                if (tagName === 'input' || tagName === 'textarea' || activeElement.isContentEditable) {
                    return; // User is typing elsewhere
                }
            }
            
            // Check if the key is a dial pad character: 0-9, *, #, +
            const key = event.key;
            const dialPadChars = /^[0-9*#+]$/;
            
            if (dialPadChars.test(key)) {
                event.preventDefault(); // Prevent default action
                
                // Get or focus the dial input
                if (!dialInput) return;
                
                // Add the character to the dial input
                const cursorPosition = dialInput.selectionStart || dialInput.value.length;
                const currentValue = dialInput.value;
                const newValue = currentValue.slice(0, cursorPosition) + key + currentValue.slice(cursorPosition);
                
                dialInput.value = newValue;
                dialInput.focus();
                
                // Set cursor position after the inserted character
                const newCursorPosition = cursorPosition + 1;
                dialInput.setSelectionRange(newCursorPosition, newCursorPosition);
                
                // Trigger input event for any listeners
                dialInput.dispatchEvent(new Event('input', { bubbles: true }));
                
                console.log('⌨️ Dial pad key pressed:', key);
            }
        });
        
        // PWA install prompt handling
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('💾 PWA install prompt available');
            e.preventDefault();
            
            setTimeout(() => {
                if (App.managers?.ui) {
                    App.managers.ui.addNotification({
                        type: 'info',
                        title: t('install_app', 'Install App'),
                        message: 'Install Autocab365 PWA for better performance',
                        duration: 10000,
                        actions: [{
                            text: 'Install',
                            class: 'btn-primary',
                            action: () => {
                                e.prompt();
                                e.userChoice.then((choiceResult) => {
                                    console.log('PWA install choice:', choiceResult.outcome);
                                });
                            }
                        }]
                    });
                }
            }, 2000);
        });
        
        // Handle online/offline events
        window.addEventListener('online', () => {
            console.log('📶 Application is back online');
            if (App.managers?.ui) {
                App.managers.ui.addNotification({
                    type: 'success',
                    title: t('back_online', 'Back Online'),
                    message: 'Internet connection restored',
                    duration: 3000
                });
            }
        });
        
        window.addEventListener('offline', () => {
            console.log('📵 Application is offline');
            if (App.managers?.ui) {
                App.managers.ui.addNotification({
                    type: 'warning',
                    title: t('offline_mode', 'Offline Mode'),
                    message: 'No internet connection. Some features may be limited.',
                    duration: 5000
                });
            }
        });
        
        // Global error handlers
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            if (App.managers?.ui) {
                App.managers.ui.addNotification({
                    type: 'error',
                    title: t('application_error', 'Application Error'),
                    message: 'An unexpected error occurred. Check console for details.',
                    duration: 7000
                });
            }
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            
            // Check if it's an audio-related error and handle it gracefully
            const reason = event.reason;
            if (reason && (reason.name === 'NotSupportedError' || reason.message?.includes('no supported source'))) {
                console.warn('Audio loading error handled:', reason.message);
                event.preventDefault(); // Prevent the error from showing in console as unhandled
                return;
            }
            
            if (App.managers?.ui) {
                App.managers.ui.addNotification({
                    type: 'error',
                    title: t('promise_error', 'Promise Error'),
                    message: 'An unexpected error occurred in a background operation.',
                    duration: 7000
                });
            }
        });
    }
    
    showInitializationError(error) {
        // Hide loading screen
        this.hideLoadingScreen();
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'initialization-error';
        errorDiv.innerHTML = `
            <div class="error-content">
                <div class="error-icon">⚠️</div>
                <h1>Initialization Failed</h1>
                <p>The Autocab365 PWA failed to start properly.</p>
                <div class="error-details">
                    <strong>Error:</strong> ${error.message}
                </div>
                <div class="error-actions">
                    <button onclick="location.reload()" class="btn-primary">
                        🔄 Reload Application
                    </button>
                    <button onclick="this.showDiagnostics()" class="btn-secondary">
                        🔍 Show Diagnostics
                    </button>
                </div>
                <p class="error-help">
                    If this problem persists, please check the browser console (F12) for more details.
                </p>
            </div>
        `;
        
        document.body.appendChild(errorDiv);
    }
    
    showDiagnostics() {
        const diagnostics = {
            'Dependencies': {
                'jQuery': typeof window.$,
                'SIP.js': typeof window.SIP,
                'LocalDB': typeof window.localDB,
                'Moment.js': typeof window.moment
            },
            'Environment': {
                'Online': navigator.onLine,
                'Storage Available': (() => {
                    try {
                        window.localDB.setItem('test', 'test');
                        window.localDB.removeItem('test');
                        return true;
                    } catch(e) {
                        return false;
                    }
                })(),
                'Service Worker': 'serviceWorker' in navigator,
                'User Agent': navigator.userAgent
            }
        };
        
        console.group('🔍 Application Diagnostics');
        Object.entries(diagnostics).forEach(([category, items]) => {
            console.group(category);
            Object.entries(items).forEach(([key, value]) => {
                console.log(`${key}:`, value);
            });
            console.groupEnd();
        });
        console.groupEnd();
        
        alert('Diagnostics logged to console. Press F12 to view.');
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    const startup = new ApplicationStartup();
    startup.initialize();
});

// Make startup available globally for debugging
window.ApplicationStartup = ApplicationStartup;