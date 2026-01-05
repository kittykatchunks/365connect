class SipSessionManager {
    constructor() {
        this.userAgent = null;
        this.sessions = new Map(); // sessionId -> session data
        this.subscriptions = new Map(); // subscriptionId -> subscription data
        this.registrationState = 'unregistered'; // 'unregistered', 'registering', 'registered', 'failed'
        this.transportState = 'disconnected'; // 'disconnected', 'connecting', 'connected'
        
        // Configuration
        this.config = {
            server: null,
            username: null,
            password: null,
            domain: null,
            displayName: null,
            autoAnswer: false,
            recordCalls: false,
            busylightEnabled: false
        };
        
        // Event listeners
        this.listeners = new Map();
        
        // Session counters
        this.sessionCounter = 0;
        this.lineCounter = 0;
        
        // Active line tracking
        this.activeLines = new Map(); // lineNumber -> sessionId
        this.selectedLine = null;
        
        // Call statistics
        this.stats = {
            totalCalls: 0,
            incomingCalls: 0,
            outgoingCalls: 0,
            missedCalls: 0,
            totalDuration: 0
        };
        
        // Bind methods
        this.on = this.on.bind(this);
        this.off = this.off.bind(this);
        this.emit = this.emit.bind(this);
    }

    // Event Management
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
        return () => this.off(event, callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in SIP listener for ${event}:`, error);
                }
            });
        }
        
        // Also trigger global web hooks if they exist
        this.triggerWebHook(event, data);
    }

    triggerWebHook(event, data) {
        const webhookMap = {
            'transportError': 'web_hook_on_transportError',
            'registered': 'web_hook_on_register',
            'registrationFailed': 'web_hook_on_registrationFailed',
            'unregistered': 'web_hook_on_unregistered',
            'sessionCreated': 'web_hook_on_invite',
            'sessionAnswered': 'web_hook_on_answer',
            'sessionTerminated': 'web_hook_on_terminate',
            'sessionModified': 'web_hook_on_modify',
            'dtmfReceived': 'web_hook_on_dtmf',
            'messageReceived': 'web_hook_on_message',
            'notifyReceived': 'web_hook_on_notify'
        };
        
        const webhookName = webhookMap[event];
        if (webhookName && typeof window[webhookName] === 'function') {
            window[webhookName](data);
        }
    }

    // Configuration Management
    configure(config) {
        /*console.log('🔧 SipSessionManager.configure() called with:', {
            server: config.server || '(not provided)',
            username: config.username || '(not provided)',
            domain: config.domain || '(not provided)'
        }); */
        //console.log('🔧 Before merge - this.config.server:', this.config.server);
        
        this.config = { ...this.config, ...config };
        
        // Auto-generate display name if username is provided and displayName is not explicitly set
        if (this.config.username && !config.displayName) {
            this.config.displayName = `${this.config.username}-365Connect`;
            
            // Store the display name as profileName in localStorage
            if (window.localDB) {
                window.localDB.setItem('profileName', this.config.displayName);
            }
        }
        
        //console.log('🔧 After merge - this.config.server:', this.config.server);
        //console.log('🔧 Full merged config:', this.config);
        
        this.emit('configChanged', this.config);
    }

    // UserAgent Management
    async createUserAgent(config = {}) {
        try {
            /*console.log('🔧 createUserAgent called with config:', {
                server: config.server || '(not provided)',
                username: config.username || '(not provided)',
                password: config.password ? '***' : '(not provided)',
                domain: config.domain || '(not provided)'
            });*/

            // Update configuration
            this.configure(config);
            
            // Validate and log configuration for debugging
            /*console.log('SIP Configuration validation:', {
                server: this.config.server || '(empty)',
                username: this.config.username ? `${this.config.username.length} chars` : '(empty)',
                password: this.config.password ? `${this.config.password.length} chars` : '(empty)',
                domain: this.config.domain || '(empty)',
                usernameLength: this.config.username ? this.config.username.length : 0,
                passwordLength: this.config.password ? this.config.password.length : 0
            }); */

            if (!this.config.server || this.config.server.trim() === '' || !this.config.username || !this.config.password) {
                console.error('🚨 Missing SIP configuration:', {
                    server: this.config.server || '(empty)',
                    username: this.config.username ? '***' : '(empty)',
                    password: this.config.password ? '***' : '(empty)'
                });
                throw new Error('Missing required SIP configuration: server, username, and password are required. Please check your settings.');
            }

            // Validate server is not localhost development server
/*             if (this.config.server.includes('localhost:5500') || 
                this.config.server.includes('127.0.0.1:5500') ||
                this.config.server.includes('localhost:3000') ||
                this.config.server === 'localhost' ||
                this.config.server === '127.0.0.1') {
                throw new Error('Invalid SIP server: Cannot connect to development server. Please configure a proper SIP server URL in Settings.');
            } */

            // Validate server is a proper URL or hostname
/*             if (this.config.server.includes('/index.html') || 
                this.config.server.includes('.html')) {
                throw new Error('Invalid SIP server: Server URL cannot contain HTML file paths. Please configure a proper SIP server hostname or WSS URL.');
            } */

            // Handle different server URL formats
            let serverUrl;
            if (this.config.server.startsWith('wss://') || this.config.server.startsWith('ws://')) {
                // Server is already a full WebSocket URL
                serverUrl = this.config.server;
            } else {
                // Server is just hostname/IP, construct WebSocket URL
                serverUrl = `wss://${this.config.server}:8089/ws`;
            }

            //console.log('🔧 WebSocket URL Construction Details:');
            //console.log('   Input server config:', this.config.server);
            //console.log('   Constructed serverUrl:', serverUrl);
            //console.log('   Expected format: wss://server1-388.phantomapi.net:8089/ws');
            //console.log('   URLs match expected:', serverUrl === 'wss://server1-388.phantomapi.net:8089/ws');
            
            // Validate the WebSocket URL format
            if (!serverUrl.startsWith('wss://') && !serverUrl.startsWith('ws://')) {
                throw new Error(`Invalid WebSocket URL format: ${serverUrl}. Must start with wss:// or ws://`);
            }
            
            // Set domain if not provided
            const sipDomain = this.config.domain || this.config.server.replace(/^wss?:\/\//, '').split(':')[0];
            
            /*console.log('WebSocket Connection Details:', {
                url: serverUrl,
                domain: sipDomain,
                protocol: 'sip',
                expectedHeaders: [
                    'Sec-WebSocket-Protocol: sip',
                    'Upgrade: websocket',
                    'Connection: Upgrade'
                ]
            }); */

            // Create SIP UserAgent options with all advanced features from phone.js
            const options = {
                logConfiguration: false,
                uri: SIP.UserAgent.makeURI(`sip:${this.config.username}@${sipDomain}`),
                transportOptions: {
                    server: serverUrl,
                    traceSip: this.config.traceSip !== undefined ? this.config.traceSip : false,
                    connectionTimeout: this.config.connectionTimeout || 20
                },
                sessionDescriptionHandlerFactoryOptions: {
                    peerConnectionConfiguration: {
                        bundlePolicy: this.config.bundlePolicy || "balanced",
                        iceTransportPolicy: "all",
                        rtcpMuxPolicy: "require",
                        // Ensure WebRTC-specific configuration
                        sdpSemantics: "unified-plan"
                    },
                    iceGatheringTimeout: this.config.iceGatheringTimeout || 500,
                    iceStopWaitingOnServerReflexive: this.config.iceStopWaitingOnServerReflexive || true,
                    constraints: {
                        audio: true,
                        video: false
                    },
                    // Additional WebRTC session options
                    alwaysAcquireMediaFirst: true,
                    offerOptions: {
                        offerToReceiveAudio: true,
                        offerToReceiveVideo: false
                    }
                },
                contactName: this.config.contactName || this.config.username,
                displayName: this.config.displayName || `${this.config.username}-365Connect`,
                authorizationUsername: this.config.username,
                authorizationPassword: this.config.password,
                hackIpInContact: this.config.hackIpInContact || true,
                userAgentString: this.config.userAgentString || "Autocab365Connect PWA v0.1.001",
                autoStart: false,
                autoStop: true,
                register: false,
                noAnswerTimeout: this.config.noAnswerTimeout || 60,
                contactParams: {},
                delegate: {
                    onConnect: () => this.handleTransportConnect(),
                    onDisconnect: (error) => this.handleTransportDisconnect(error),
                    onInvite: (invitation) => this.handleIncomingInvitation(invitation),
                    onMessage: (message) => this.handleIncomingMessage(message),
                    onNotify: (notification) => this.handleIncomingNotify(notification)
                }
            };

            // Add ICE servers if configured
            if (this.config.iceServers && Array.isArray(this.config.iceServers)) {
                options.sessionDescriptionHandlerFactoryOptions.peerConnectionConfiguration.iceServers = this.config.iceServers;
            } else {
                // Enhanced STUN/TURN servers for better WebRTC connectivity
                options.sessionDescriptionHandlerFactoryOptions.peerConnectionConfiguration.iceServers = [
                    { urls: "stun:stun.l.google.com:19302" },
                    { urls: "stun:stun1.l.google.com:19302" },
                    { urls: "stun:stun2.l.google.com:19302" }
                ];
            }

            // Add contact parameters (permanent)
            if (this.config.contactParams && typeof this.config.contactParams === 'object') {
                options.contactParams = { ...this.config.contactParams };
            }

            // Add transport to contact if configured
            // Use "ws" instead of "wss" to match server expectations (Asterisk returns ws even for wss connections)
            if (this.config.wssInTransport) {
                options.contactParams.transport = "ws";  // Changed from "wss" to match server response
            }

            // Debug: Log the exact options being passed to SIP.UserAgent
            /*console.log('🔍 SIP UserAgent Options:', {
                uri: options.uri.toString(),
                transportOptions: options.transportOptions,
                userAgentString: options.userAgentString,
                autoStart: options.autoStart
            });*/

            // Create UserAgent with enhanced WebSocket handling
            this.userAgent = new SIP.UserAgent(options);
            
            // Add properties matching the working version exactly
            this.userAgent.isRegistered = () => {
                return this.userAgent && this.userAgent.registerer && 
                       this.userAgent.registerer.state === SIP.RegistererState.Registered;
            };
            
            // Match working version properties (important for compatibility)
            this.userAgent.sessions = this.userAgent._sessions;
            this.userAgent.registrationCompleted = false;
            this.userAgent.registering = false;
            this.userAgent.isReRegister = false;  // Critical flag from working version
            
            // Enhanced transport logging for WebSocket connections
            if (this.userAgent.transport) {
                /*console.log('Transport created:', {
                    type: 'WebSocket',
                    url: serverUrl,
                    state: this.userAgent.transport.state,
                    protocol: 'sip'
                }); */
            }
            
            // Make sessions accessible (phone.js compatibility)
            this.userAgent.sessions = this.userAgent._sessions;
            this.userAgent.registrationCompleted = false;
            this.userAgent.registering = false;
            
            // Transport reconnection settings
            this.userAgent.transport.ReconnectionAttempts = this.config.reconnectionAttempts || 5;
            this.userAgent.transport.attemptingReconnection = false;
            
            // BLF subscriptions array
            this.userAgent.BlfSubs = [];
            this.userAgent.lastVoicemailCount = 0;
            
            // Set up transport event handlers - BEFORE starting
            this.userAgent.transport.onConnect = () => this.handleTransportConnect();
            this.userAgent.transport.onDisconnect = (error) => this.handleTransportDisconnect(error);
            
            // Create registerer with advanced options
            await this.createRegisterer();
            
            // Start the transport connection (like the working version)
            //console.log('🔌 Starting UserAgent transport connection...');
            await this.userAgent.start();
            //console.log('✅ UserAgent transport start initiated');
            
            this.emit('userAgentCreated', this.userAgent);
            
            return this.userAgent;
            
        } catch (error) {
            console.error('Failed to create UserAgent:', error);
            this.emit('userAgentError', error);
            throw error;
        }
    }

    // Create registerer with all options from phone.js
    async createRegisterer() {
        //console.log('🔧 createRegisterer() called');
        /*console.log('🔍 UserAgent state:', {
            exists: !!this.userAgent,
            state: this.userAgent?.state,
            transport: !!this.userAgent?.transport,
            hasRegisterer: !!this.userAgent?.registerer
        }); */
        
        if (!this.userAgent) {
            throw new Error('UserAgent must be created first');
        }

        const registererOptions = {
            logConfiguration: false,
            expires: this.config.registerExpires || 300,
            extraHeaders: [],
            extraContactHeaderParams: [],
            refreshFrequency: 75 // Percentage of expiration time for re-register
        };

        // Add extra headers from configuration
        if (this.config.registerExtraHeaders && typeof this.config.registerExtraHeaders === 'object') {
            for (const [key, value] of Object.entries(this.config.registerExtraHeaders)) {
                if (value !== "") {
                    registererOptions.extraHeaders.push(`${key}: ${value}`);
                }
            }
        }

        // Add extra contact parameters
        if (this.config.registerExtraContactParams && typeof this.config.registerExtraContactParams === 'object') {
            for (const [key, value] of Object.entries(this.config.registerExtraContactParams)) {
                if (value === "") {
                    registererOptions.extraContactHeaderParams.push(key);
                } else {
                    registererOptions.extraContactHeaderParams.push(`${key}=${value}`);
                }
            }
        }

        //console.log('🔧 Creating Registerer with options:', registererOptions);
        
        try {
            this.userAgent.registerer = new SIP.Registerer(this.userAgent, registererOptions);
            
            //console.log('✅ Registerer created successfully');
            /*console.log('📋 Registerer properties:', {
                exists: !!this.userAgent.registerer,
                hasConfiguration: !!this.userAgent.registerer.configuration,
                state: this.userAgent.registerer.state,
                configuration: this.userAgent.registerer.configuration
            });*/
            
        } catch (error) {
            console.error('🚨 FAILED to create Registerer:', error);
            throw error;
        }
        
        // Set up registerer state change listener with enhanced debugging
        this.userAgent.registerer.stateChange.addListener((newState) => {
            //console.log("🔄 Registration State Changed:", newState);
            //console.log("   Previous state:", this.registrationState);
            //console.log("   UserAgent.registering:", this.userAgent.registering);
            //console.log("   UserAgent.registrationCompleted:", this.userAgent.registrationCompleted);
            //console.log("   Stack trace:", new Error().stack);
            
            switch (newState) {
                case SIP.RegistererState.Initial:
                    this.registrationState = 'unregistered';
                    //console.log("📍 State: Initial");
                    break;
                case SIP.RegistererState.Registered:
                    this.registrationState = 'registered';
                    //console.log("✅ State: Registered - calling handleRegistrationSuccess");
                    this.handleRegistrationSuccess();
                    break;
                case SIP.RegistererState.Unregistered:
                    //console.log("❌ State: Unregistered - WHY?");
                    //console.log("   Previous state was:", this.registrationState);
                    //console.log("   Did we ever reach 'Registered' state? NO");
                    //console.log("   This suggests 200 OK was rejected by SIP.js internally");
                    this.registrationState = 'unregistered';
                    this.handleUnregistration();
                    break;
                case SIP.RegistererState.Terminated:
                    this.registrationState = 'failed';
                    //console.log("💀 State: Terminated");
                    break;
            }
            
            this.emit('registrationStateChanged', this.registrationState);
        });

        //console.log("Registerer created successfully");
    }

    // Registration Management
    async register() {
        if (!this.userAgent) {
            throw new Error('UserAgent not created');
        }

        if (this.userAgent.registering) {
            //console.log('Registration already in progress');
            return;
        }

        if (this.userAgent.isRegistered()) {
            //console.log('Already registered');
            return;
        }

        try {
            this.registrationState = 'registering';
            this.userAgent.registering = true;
            this.emit('registrationStateChanged', 'registering');
            
            // Don't use requestDelegate - it conflicts with SIP.js 0.20.0 internal handling
            const registerOptions = {};
            
            //console.log('📤 Sending Registration...');
            //console.log('📋 Register Options:', registerOptions);
            //console.log('🔍 Registerer State:', this.userAgent.registerer?.state);
            //console.log('🔍 Registerer Keys:', this.userAgent.registerer ? Object.keys(this.userAgent.registerer) : 'none');
            
            // Debug registerer properties to understand SIP.js v0.20.0 structure
            /*console.log('� Registerer Debug Info:', {
                registererExists: !!this.userAgent.registerer,
                registererState: this.userAgent.registerer?.state,
                registererType: typeof this.userAgent.registerer,
                registererKeys: this.userAgent.registerer ? Object.keys(this.userAgent.registerer) : [],
                configurationExists: !!this.userAgent.registerer?.configuration,
                configurationKeys: this.userAgent.registerer?.configuration ? Object.keys(this.userAgent.registerer.configuration) : []
            });
            
            // Access registerer configuration through direct properties (SIP.js 0.20.0)
            //console.log('📋 Registerer Configuration:', {
                expires: this.userAgent.registerer.expires,
                refreshFrequency: this.userAgent.registerer.refreshFrequency,
                options: this.userAgent.registerer.options,
                state: this.userAgent.registerer._state
            }); */
            
            //console.log('🚀 About to call registerer.register()...');
            await this.userAgent.registerer.register(registerOptions);
            //console.log('✅ registerer.register() call completed');
            
            // Check registration state after a brief delay
            //setTimeout(() => {
                //console.log('⏰ Registration status check (2s after register call):');
                //console.log('   Registerer state:', this.userAgent.registerer?.state);
                //console.log('   UserAgent registering:', this.userAgent.registering);
                //console.log('   UserAgent registrationCompleted:', this.userAgent.registrationCompleted);
                //console.log('   Manager registrationState:', this.registrationState);
            //}, 2000);
            
        } catch (error) {
            this.registrationState = 'failed';
            this.userAgent.registering = false;
            this.emit('registrationStateChanged', 'failed');
            this.emit('registrationFailed', error);
            console.error('SIP registration failed:', error);
            throw error;
        }
    }

    async unregister(skipUnsubscribe = false) {
        if (!this.userAgent || !this.userAgent.isRegistered()) {
            //console.log('Not registered, nothing to unregister');
            return;
        }

        try {
            if (!skipUnsubscribe) {
                //console.log('Unsubscribing from all subscriptions...');
                await this.unsubscribeAll();
            }
            
            // Terminate all active sessions
            await this.terminateAllSessions();
            
            //console.log('Unregistering...');
            await this.userAgent.registerer.unregister();
            
            // Reset states
            this.userAgent.transport.attemptingReconnection = false;
            this.userAgent.registering = false;
            this.userAgent.isReRegister = false;
            
            this.registrationState = 'unregistered';
            this.emit('registrationStateChanged', 'unregistered');
            this.emit('unregistered');
            
            //console.log('SIP unregistration successful');
            
        } catch (error) {
            console.error('SIP unregistration error:', error);
            this.emit('unregistrationError', error);
        }
    }
    
    handleRegistrationSuccess() {
        //console.log('Registration successful');
        
        this.userAgent.registrationCompleted = true;
        this.userAgent.registering = false;
        
        if (!this.userAgent.isReRegister) {
            //console.log('Initial registration completed');
            
            this.emit('registered', this.userAgent);
            
            // Update profileName to match current username if needed
            if (window.localDB && this.config.username) {
                const expectedProfileName = `${this.config.username}-365Connect`;
                const currentProfileName = window.localDB.getItem('profileName', '');
                if (currentProfileName !== expectedProfileName) {
                    window.localDB.setItem('profileName', expectedProfileName);
                    this.config.displayName = expectedProfileName;
                    console.log('✅ ProfileName updated during registration to:', expectedProfileName);
                }
            }
            
            // Update device name display when successfully registered
            if (typeof window.updateDeviceNameDisplay === 'function') {
                window.updateDeviceNameDisplay();
            }
            
            // Check agent login status after successful registration
            this.checkAgentLoginStatus();
            
            // Auto-subscribe to BLF if enabled
            if (this.config.enableBLF) {
                setTimeout(() => {
                    this.subscribeAll();
                }, 500);
            }
        } else {
            //console.log('Re-registration completed');
            
            // Also update device name on re-registration
            if (typeof window.updateDeviceNameDisplay === 'function') {
                window.updateDeviceNameDisplay();
            }
        }
        
        this.userAgent.isReRegister = true;
    }
    
    async checkAgentLoginStatus() {
        try {
            console.log('Checking agent login status after registration...');
            
            // Get the API manager
            const apiManager = window.App?.managers?.api;
            if (!apiManager) {
                console.warn('API manager not available, skipping agent status check');
                return;
            }
            
            // Get current device extension
            const deviceExtension = this.config.username;
            if (!deviceExtension) {
                console.warn('No device extension available for agent status check');
                return;
            }
            
            // Call AgentfromPhone API
            const result = await apiManager.postWithBasicAuthSimple('AgentfromPhone', {
                phone: deviceExtension
            });
            
            console.log('Agent login status check response:', result);
            
            // Check if agent is logged in (num field is not null)
            if (result && result.num !== null && result.num !== undefined && result.num !== '') {
                console.log(`Agent is logged in - Number: ${result.num}, Name: ${result.name || 'N/A'}`);
                
                // Update agent status display via agent buttons manager
                if (window.App?.managers?.agent) {
                    window.App.managers.agent.updateStateFromAPI(result);
                } else {
                    console.warn('Agent buttons manager not available, will update when initialized');
                    // Store the result for later pickup
                    window._pendingAgentStatus = result;
                }
            } else {
                console.log('Agent is not logged in (num is null)');
                // GUI stays in logged out state - no action needed
            }
            
        } catch (error) {
            console.error('Error checking agent login status:', error);
            // Don't throw - this is a non-critical check
        }
    }
    
    handleRegistrationFailed(response, statusCode) {
        console.error('🚨 Registration Failed - Details:', {
            statusCode: statusCode,
            response: response,
            reasonPhrase: response?.message?.reasonPhrase || 'Unknown',
            headers: response?.message?.headers || {},
            serverResponse: response?.message || 'No message details'
        });
        
        // Provide specific guidance based on status code
        switch(statusCode) {
            case 503:
                console.error('💡 503 Service Unavailable - Possible causes:');
                console.error('   • SIP server is down or overloaded');
                console.error('   • Account not provisioned on server');
                console.error('   • Server maintenance in progress');
                console.error('   • Check with server administrator');
                break;
            case 401:
                console.error('💡 401 Unauthorized - Authentication failed');
                console.error('   • Check username and password');
                break;
            case 403:
                console.error('💡 403 Forbidden - Account access denied');
                break;
            case 404:
                console.error('💡 404 Not Found - Domain or user not found');
                break;
        }
        
        this.registrationState = 'failed';
        this.userAgent.registering = false;
        
        this.emit('registrationStateChanged', 'failed');
        this.emit('registrationFailed', { response, statusCode });
    }
    
    handleUnregistration() {
        //console.log('🚨 handleUnregistration called');
        //console.log('   registrationCompleted:', this.userAgent.registrationCompleted);
        //console.log('   Was this expected?', this.userAgent.registrationCompleted ? 'YES' : 'NO - this might be the problem!');
        //console.log('   Call stack:', new Error().stack);
        
        if (this.userAgent.registrationCompleted) {
            //console.log('✅ Expected unregistration (was previously registered)');
            this.emit('unregistered');
        } else {
            //console.log('⚠️ UNEXPECTED unregistration - was never fully registered!');
        }
        
        this.userAgent.registrationCompleted = false;
        this.userAgent.registering = false;
    }

    // BLF (Busy Lamp Field) Subscription Management
    blfSubscriptions = new Map();
    
    subscribeBLF(extension, buddy) {
        if (!this.userAgent || !this.userAgent.isRegistered()) {
            console.warn('Cannot subscribe to BLF - not registered');
            return;
        }
        
        // Check if already subscribed
        if (this.blfSubscriptions.has(extension)) {
            //console.log(`Already subscribed to BLF for extension ${extension}`);
            return this.blfSubscriptions.get(extension);
        }
        
        const target = SIP.UserAgent.makeURI(`sip:${extension}@${this.config.domain}`);
        if (!target) {
            console.error(`Invalid BLF target for extension ${extension}`, {
                extension,
                domain: this.config.domain,
                fullTarget: `sip:${extension}@${this.config.domain}`
            });
            return null;
        }
        
        try {
            const subscription = new SIP.Subscriber(this.userAgent, target, 'dialog');
            
            // Set up delegate for event handling
            subscription.delegate = {
                onNotify: (notification) => {
                    // Accept the notification
                    notification.accept();
                    // Handle the BLF notification
                    this.handleBLFNotification(extension, buddy, notification);
                }
            };
            
            // Monitor subscription state changes
            subscription.stateChange.addListener((newState) => {
                switch (newState) {
                    case SIP.SubscriptionState.Subscribed:
                        //console.log(`BLF subscription accepted for extension ${extension}`);
                        this.emit('blfSubscribed', { extension, buddy });
                        break;
                    case SIP.SubscriptionState.Terminated:
                        //console.log(`BLF subscription terminated for extension ${extension}`);
                        this.blfSubscriptions.delete(extension);
                        this.emit('blfUnsubscribed', { extension, buddy });
                        break;
                    default:
                        // Log state changes for debugging
                        console.log(`BLF subscription state changed for extension ${extension}: ${newState}`);
                        break;
                }
            });
            
            // Subscribe
            subscription.subscribe();
            
            // Store subscription
            this.blfSubscriptions.set(extension, {
                subscription,
                extension,
                buddy,
                state: 'unknown' // Initial state until we get first NOTIFY
            });
            
            //console.log(`Subscribing to BLF for extension ${extension}`);
            return subscription;
            
        } catch (error) {
            console.error(`Failed to create BLF subscription for extension ${extension}:`, error);
            this.emit('blfSubscriptionFailed', { extension, buddy, error });
            return null;
        }
    }
    
    handleBLFNotification(extension, buddy, notification) {
        try {
            const contentType = notification.request.getHeader('Content-Type');
            const body = notification.request.body;
            
            if (!body) {
                console.warn(`Empty BLF notification body for extension ${extension}`);
                return;
            }
            
            let dialogState = 'terminated'; // Default to available/idle if no dialog found
            let remoteTarget = null;
            
            // Parse dialog-info XML
            if (contentType && contentType.toLowerCase().includes('application/dialog-info+xml')) {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(body, 'text/xml');
                
                const dialogs = xmlDoc.getElementsByTagName('dialog');
                if (dialogs.length > 0) {
                    const dialog = dialogs[0];
                    const state = dialog.getElementsByTagName('state')[0];
                    
                    if (state) {
                        dialogState = state.textContent.trim();
                    }
                    
                    // Get remote target if available
                    const remoteEl = dialog.getElementsByTagName('remote')[0];
                    if (remoteEl) {
                        const targetEl = remoteEl.getElementsByTagName('target')[0];
                        if (targetEl) {
                            remoteTarget = targetEl.getAttribute('uri');
                        }
                    }
                } else {
                    // No dialog element means extension is idle
                    dialogState = 'terminated';
                }
            }
            
            console.log(`📱 BLF notification for ${extension}: ${dialogState}${remoteTarget ? ` (remote: ${remoteTarget})` : ''}`);
            
            // Update BLF state
            const blfData = this.blfSubscriptions.get(extension);
            if (blfData) {
                const previousState = blfData.state;
                blfData.state = dialogState;
                blfData.remoteTarget = remoteTarget;
                
                if (previousState !== dialogState) {
                    console.log(`📱 BLF state changed for ${extension}: ${previousState} → ${dialogState}`);
                }
            }
            
            // Emit BLF state change
            console.log(`📡 SIP Manager emitting blfStateChanged event for ${extension}:`, {
                extension,
                buddy,
                state: dialogState,
                remoteTarget
            });
            
            this.emit('blfStateChanged', {
                extension,
                buddy,
                state: dialogState,
                remoteTarget
            });
            
            console.log(`📡 BLF event emitted, listener count:`, this.listeners.get('blfStateChanged')?.size || 0);
            
            //console.log(`BLF state for extension ${extension}: ${dialogState}`);
            
        } catch (error) {
            console.error(`Error handling BLF notification for extension ${extension}:`, error);
        }
    }
    
    unsubscribeBLF(extension) {
        const blfData = this.blfSubscriptions.get(extension);
        if (!blfData) {
            //console.log(`No BLF subscription found for extension ${extension}`);
            return;
        }
        
        try {
            blfData.subscription.unsubscribe();
            this.blfSubscriptions.delete(extension);
            //console.log(`Unsubscribed from BLF for extension ${extension}`);
        } catch (error) {
            console.error(`Error unsubscribing from BLF for extension ${extension}:`, error);
        }
    }
    
    unsubscribeAllBLF() {
        //console.log(`Unsubscribing from ${this.blfSubscriptions.size} BLF subscriptions`);
        
        for (const [extension] of this.blfSubscriptions) {
            this.unsubscribeBLF(extension);
        }
    }
    
    getBLFState(extension) {
        const blfData = this.blfSubscriptions.get(extension);
        return blfData ? blfData.state : null;
    }
    
    getAllBLFStates() {
        const states = {};
        for (const [extension, data] of this.blfSubscriptions) {
            states[extension] = {
                state: data.state,
                buddy: data.buddy,
                remoteTarget: data.remoteTarget
            };
        }
        return states;
    }

    // Session Management
    async createOutgoingSession(target, options = {}) {
        if (!this.userAgent || !this.userAgent.isRegistered()) {
            throw new Error('Not registered');
        }

        try {
            const sessionId = this.generateSessionId();
            const lineNumber = this.assignLineNumber();
            
            // Check if line is available
            if (lineNumber === null) {
                throw new Error('All lines are occupied. Please end or hold a call first.');
            }
            
            // Create target URI
            let targetURI;
            if (typeof target === 'string') {
                targetURI = SIP.UserAgent.makeURI(`sip:${target}@${this.config.domain}`);
            } else {
                targetURI = target;
            }

            // Get selected audio devices for proper constraints
            let selectedDevices = { microphone: 'default' };
            if (window.App && window.App.managers && window.App.managers.audio) {
                selectedDevices = window.App.managers.audio.getSelectedDevices();
                //console.log('Using selected microphone for outgoing call:', selectedDevices.microphone);
            }

            // Build audio constraints with selected microphone
            const audioConstraints = {
                audio: selectedDevices.microphone !== 'default' ? {
                    deviceId: { exact: selectedDevices.microphone }
                } : true,
                video: options.video || false
            };

            // Create inviter with proper audio constraints and ICE options
            const inviter = new SIP.Inviter(this.userAgent, targetURI, {
                sessionDescriptionHandlerOptions: {
                    constraints: audioConstraints,
                    iceGatheringTimeout: this.config.iceGatheringTimeout || 500,
                    iceStopWaitingOnServerReflexive: this.config.iceStopWaitingOnServerReflexive || true
                },
                extraHeaders: options.extraHeaders || []
            });

            // Create session data
            const sessionData = {
                id: sessionId,
                lineNumber: lineNumber,
                session: inviter,
                direction: 'outgoing',
                target: target,
                state: 'initiating',
                startTime: new Date(),
                duration: 0,
                onHold: false,
                muted: false,
                recording: this.config.recordCalls,
                ...options
            };

            // Set up session event handlers
            this.setupSessionHandlers(sessionData);

            // Store session
            this.sessions.set(sessionId, sessionData);
            this.activeLines.set(lineNumber, sessionId);
            this.selectedLine = lineNumber;

            // Start the session
            await inviter.invite();

            // Update statistics
            this.stats.totalCalls++;
            this.stats.outgoingCalls++;

            this.emit('sessionCreated', sessionData);
            this.emit('sessionStateChanged', { sessionId, state: 'initiating' });

            return sessionData;

        } catch (error) {
            console.error('Failed to create outgoing session:', error);
            this.emit('sessionError', { target, error });
            throw error;
        }
    }

    handleIncomingInvitation(invitation) {
        try {
            const sessionId = this.generateSessionId();
            const lineNumber = this.assignLineNumber();
            
            // Check if line is available
            if (lineNumber === null) {
                console.warn('⚠️ All lines occupied - rejecting incoming call');
                invitation.reject();
                this.emit('incomingCallRejected', { 
                    reason: 'All lines occupied',
                    caller: invitation.remoteIdentity.displayName || invitation.remoteIdentity.uri.user
                });
                return;
            }

            // Create session data
            const sessionData = {
                id: sessionId,
                lineNumber: lineNumber,
                session: invitation,
                direction: 'incoming',
                target: invitation.remoteIdentity.uri.user,
                callerID: invitation.remoteIdentity.displayName || invitation.remoteIdentity.uri.user,
                state: 'ringing',
                startTime: new Date(),
                duration: 0,
                onHold: false,
                muted: false,
                recording: this.config.recordCalls
            };

            // Set up session event handlers
            this.setupSessionHandlers(sessionData);

            // Store session
            this.sessions.set(sessionId, sessionData);
            this.activeLines.set(lineNumber, sessionId);

            // Don't auto-answer if there are already active calls
            const activeSessions = this.getActiveSessions();
            const hasOtherActiveCalls = activeSessions.some(s => s.id !== sessionId);
            
            if (this.config.autoAnswer && !hasOtherActiveCalls) {
                setTimeout(() => {
                    this.answerSession(sessionId);
                }, 1500);
            }

            // Update statistics
            this.stats.totalCalls++;
            this.stats.incomingCalls++;

            this.emit('sessionCreated', sessionData);
            this.emit('incomingCall', sessionData);

        } catch (error) {
            console.error('Error handling incoming invitation:', error);
            this.emit('sessionError', { invitation, error });
        }
    }

    setupSessionHandlers(sessionData) {
        const { session, id: sessionId } = sessionData;

        // Session state changes
        session.stateChange.addListener((state) => {
            /*console.log('🔍 Session state change debug:', {
                sessionId: sessionId,
                newState: state,
                stateType: typeof state,
                sipEstablished: SIP.SessionState.Established,
                stateEquals: state === SIP.SessionState.Established,
                stringEquals: state === 'Established'
            }); */
            
            sessionData.state = state;
            this.emit('sessionStateChanged', { sessionId, state });

            switch (state) {
                case SIP.SessionState.Established:
                case 'Established':
                case 'active':
                case 'confirmed':
                    sessionData.answerTime = new Date();
                    this.setupAudioRouting(session);
                    this.emit('sessionAnswered', sessionData);
                    
                    // Handle attended transfer completion for consultation calls
                    if (sessionData.isConsultationCall && sessionData.originalSessionId) {
                        console.log('🔄 Consultation call established, completing attended transfer...');
                        this.completeAttendedTransfer(sessionData.originalSessionId, sessionId)
                            .catch(error => {
                                console.error('Failed to auto-complete attended transfer:', error);
                                // Let user manually complete if auto-completion fails
                            });
                    }
                    break;
                case SIP.SessionState.Terminated:
                case 'Terminated':
                case 'terminated':
                    this.handleSessionTerminated(sessionData);
                    break;
            }
        });

        // DTMF handling
        if (session.sessionDescriptionHandler) {
            session.sessionDescriptionHandler.on('dtmf', (tone) => {
                this.emit('dtmfReceived', { sessionId, tone });
            });
        }

        // Track session duration
        sessionData.durationInterval = setInterval(() => {
            if (sessionData.state === SIP.SessionState.Established) {
                sessionData.duration = Math.floor((new Date() - sessionData.answerTime) / 1000);
                this.emit('sessionDurationChanged', { sessionId, duration: sessionData.duration });
            }
        }, 1000);
    }

    setupAudioRouting(session) {
        //console.log('Setting up audio routing for established session');
        
        try {
            // Get the session description handler
            const sdh = session.sessionDescriptionHandler;
            if (!sdh) {
                console.warn('No session description handler found for audio routing');
                return;
            }

            // Get selected audio devices from audio manager
            let selectedDevices = { speaker: 'default', microphone: 'default' };
            if (window.App && window.App.managers && window.App.managers.audio) {
                selectedDevices = window.App.managers.audio.getSelectedDevices();
                //console.log('Using selected audio devices:', selectedDevices);
            } else {
                //console.log('Audio manager not available, using default devices');
            }

            // Set up audio output device (speaker) when remote stream is available
            const setupAudioOutput = () => {
                const remoteAudio = sdh.remoteMediaStream;
                if (remoteAudio) {
                    // Create or get existing audio element for remote stream
                    let audioElement = document.getElementById('sipAudio');
                    if (!audioElement) {
                        audioElement = document.createElement('audio');
                        audioElement.id = 'sipAudio';
                        audioElement.autoplay = true;
                        audioElement.style.display = 'none';
                        document.body.appendChild(audioElement);
                    }
                    
                    audioElement.srcObject = remoteAudio;
                    
                    // Set output device if supported and not default
                    if (audioElement.setSinkId && selectedDevices.speaker !== 'default') {
                        audioElement.setSinkId(selectedDevices.speaker)
                            .then(() => {
                                //console.log('✅ Audio output device set to:', selectedDevices.speaker);
                            })
                            .catch(error => {
                                console.error('❌ Failed to set audio output device:', error);
                            });
                    } else {
                        //console.log('Using default audio output device');
                    }
                } else {
                    console.warn('No remote media stream available for audio routing');
                }
            };

            // Set up audio input device (microphone) constraints
            const setupAudioInput = () => {
                const localStream = sdh.localMediaStream;
                if (localStream) {
                    //console.log('✅ Local audio stream configured');
                    
                    // The microphone device selection is handled during getUserMedia
                    // which should have been done during session creation with proper constraints
                } else {
                    console.warn('No local media stream available');
                }
            };

            // Set up audio routing
            setupAudioOutput();
            setupAudioInput();

        } catch (error) {
            console.error('❌ Error setting up audio routing:', error);
        }
    }

    async answerSession(sessionId, options = {}) {
        const sessionData = this.sessions.get(sessionId);
        if (!sessionData || sessionData.direction !== 'incoming') {
            throw new Error('Invalid session for answer');
        }

        try {
            // Get selected audio devices for answering
            let selectedDevices = { microphone: 'default' };
            if (window.App && window.App.managers && window.App.managers.audio) {
                selectedDevices = window.App.managers.audio.getSelectedDevices();
                //console.log('Using selected microphone for answering call:', selectedDevices.microphone);
            }

            // Build audio constraints with selected microphone
            const audioConstraints = {
                audio: selectedDevices.microphone !== 'default' ? {
                    deviceId: { exact: selectedDevices.microphone }
                } : true,
                video: options.video || false
            };

            await sessionData.session.accept({
                sessionDescriptionHandlerOptions: {
                    constraints: audioConstraints,
                    iceGatheringTimeout: this.config.iceGatheringTimeout || 500,
                    iceStopWaitingOnServerReflexive: this.config.iceStopWaitingOnServerReflexive || true
                }
            });

            this.selectedLine = sessionData.lineNumber;
            this.emit('sessionAnswered', sessionData);

        } catch (error) {
            console.error('Failed to answer session:', error);
            this.emit('sessionError', { sessionId, error });
            throw error;
        }
    }

    async terminateSession(sessionId, reason = 'User requested') {
        const sessionData = this.sessions.get(sessionId);
        if (!sessionData) {
            throw new Error('Session not found');
        }

        try {
            // Clear duration interval
            if (sessionData.durationInterval) {
                clearInterval(sessionData.durationInterval);
            }

            // Terminate the session
            switch (sessionData.session.state) {
                case SIP.SessionState.Initial:
                case SIP.SessionState.Establishing:
                    if (sessionData.direction === 'outgoing') {
                        await sessionData.session.cancel();
                    } else {
                        await sessionData.session.reject();
                    }
                    break;
                case SIP.SessionState.Established:
                    await sessionData.session.bye();
                    break;
            }

            this.handleSessionTerminated(sessionData, reason);

        } catch (error) {
            console.error('Failed to terminate session:', error);
            this.emit('sessionError', { sessionId, error });
        }
    }

    handleSessionTerminated(sessionData, reason = 'Normal termination') {
        const { id: sessionId, lineNumber } = sessionData;

        // Calculate final duration
        if (sessionData.answerTime) {
            sessionData.duration = Math.floor((new Date() - sessionData.answerTime) / 1000);
            this.stats.totalDuration += sessionData.duration;
        } else if (sessionData.direction === 'incoming') {
            this.stats.missedCalls++;
        }

        // Clear interval
        if (sessionData.durationInterval) {
            clearInterval(sessionData.durationInterval);
        }

        // Clean up audio elements
        this.cleanupAudioElements();

        // Remove from active sessions
        this.sessions.delete(sessionId);
        this.activeLines.delete(lineNumber);
        
        console.log(`📞 Released line ${lineNumber} from terminated session ${sessionId}`);

        // Clear selection if this was the selected line - don't auto-select another
        if (this.selectedLine === lineNumber) {
            this.selectedLine = null;
            console.log('📞 Cleared line selection - user must manually select a line');
        }

        this.emit('sessionTerminated', { ...sessionData, reason });
        this.emit('lineReleased', { lineNumber, sessionId });
    }

    cleanupAudioElements() {
        // Clean up SIP audio element when session ends
        const audioElement = document.getElementById('sipAudio');
        if (audioElement) {
            audioElement.srcObject = null;
            audioElement.pause();
            // Don't remove the element, just clear it for reuse
        }
    }

    async terminateAllSessions() {
        const sessionIds = Array.from(this.sessions.keys());
        const terminationPromises = sessionIds.map(id => 
            this.terminateSession(id, 'System shutdown')
        );
        
        await Promise.allSettled(terminationPromises);
    }

    // Session Control Methods
    // Hold/Unhold functionality - removed duplicate, using implementation at line 2214

    async muteSession(sessionId) {
        const sessionData = this.sessions.get(sessionId);
        if (!sessionData || sessionData.state !== SIP.SessionState.Established) {
            throw new Error('Cannot mute session');
        }

        try {
            const sdh = sessionData.session.sessionDescriptionHandler;
            if (sdh && sdh.localMediaStream) {
                sdh.localMediaStream.getAudioTracks().forEach(track => {
                    track.enabled = false;
                });
                sessionData.muted = true;
                this.emit('sessionModified', { sessionId, action: 'mute' });
            }
        } catch (error) {
            console.error('Failed to mute session:', error);
            throw error;
        }
    }

    async unmuteSession(sessionId) {
        const sessionData = this.sessions.get(sessionId);
        if (!sessionData || !sessionData.muted) {
            throw new Error('Cannot unmute session');
        }

        try {
            const sdh = sessionData.session.sessionDescriptionHandler;
            if (sdh && sdh.localMediaStream) {
                sdh.localMediaStream.getAudioTracks().forEach(track => {
                    track.enabled = true;
                });
                sessionData.muted = false;
                this.emit('sessionModified', { sessionId, action: 'unmute' });
            }
        } catch (error) {
            console.error('Failed to unmute session:', error);
            throw error;
        }
    }

    async sendDTMF(sessionId, tone) {
        //console.log(`📞 Attempting to send DTMF: ${tone} to session ${sessionId}`);
        
        // Validate inputs
        if (!sessionId) {
            const error = new Error('Session ID is required for DTMF');
            console.error('❌ DTMF Error:', error.message);
            throw error;
        }
        
        if (!tone || typeof tone !== 'string') {
            const error = new Error('Valid DTMF tone is required');
            console.error('❌ DTMF Error:', error.message);
            throw error;
        }
        
        // Validate DTMF tone
        const validTones = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '#'];
        if (!validTones.includes(tone)) {
            const error = new Error(`Invalid DTMF tone: ${tone}. Valid tones are: ${validTones.join(', ')}`);
            console.error('❌ DTMF Error:', error.message);
            throw error;
        }
        
        // Get session data
        const sessionData = this.sessions.get(sessionId);
        if (!sessionData) {
            const error = new Error(`Session not found: ${sessionId}`);
            console.error('❌ DTMF Error:', error.message);
            //console.log('📋 Available sessions:', Array.from(this.sessions.keys()));
            throw error;
        }
        
        // Validate session state - check for various possible established state values
        const validStates = [
            SIP.SessionState.Established,  // SIP.js enum value
            'Established',                 // String value
            'active',                      // Alternative state name  
            'confirmed'                    // Another possible state
        ];
        
        /*console.log('🔍 SIP Session state debug:', {
            currentState: sessionData.state,
            stateType: typeof sessionData.state,
            sipEstablished: SIP.SessionState.Established,
            validStates: validStates,
            sessionDirection: sessionData.direction
        }); */
        
        if (!validStates.includes(sessionData.state)) {
            const error = new Error(`Cannot send DTMF - session not in valid state. Current state: ${sessionData.state}`);
            console.error('❌ DTMF Error:', error.message);
            /*console.log('📋 Session details:', {
                id: sessionData.id,
                state: sessionData.state,
                direction: sessionData.direction,
                target: sessionData.target,
                validStates: validStates
            }); */
            throw error;
        }
        
        // Validate session has SIP session object
        if (!sessionData.session) {
            const error = new Error('Session object not available');
            console.error('❌ DTMF Error:', error.message);
            throw error;
        }
        
        try {
            //console.log(`🎵 Sending DTMF tone ${tone} via SIP.js`);
            
            // Try RFC 4733 (in-band DTMF) first
            if (sessionData.session.sessionDescriptionHandler && 
                typeof sessionData.session.sessionDescriptionHandler.sendDtmf === 'function') {
                //console.log('📞 Using RFC 4733 (in-band DTMF) via SessionDescriptionHandler');
                await sessionData.session.sessionDescriptionHandler.sendDtmf(tone);
                //console.log(`✅ RFC 4733 DTMF sent successfully: ${tone}`);
            }
            // Fallback to session.dtmf method if available
            else if (typeof sessionData.session.dtmf === 'function') {
                //console.log('📞 Using session.dtmf() fallback method');
                await sessionData.session.dtmf(tone);
                //console.log(`✅ Session DTMF sent successfully: ${tone}`);
            }
            else {
                const error = new Error('No DTMF method available on session');
                console.error('❌ DTMF Error:', error.message);
                throw error;
            }
            
            //console.log(`✅ DTMF ${tone} sent successfully to session ${sessionId}`);
            this.emit('dtmfSent', { sessionId, tone });
            
        } catch (error) {
            console.error('❌ SIP.js DTMF transmission failed:', {
                tone: tone,
                sessionId: sessionId,
                error: error.message,
                stack: error.stack,
                sessionState: sessionData.state,
                sessionType: sessionData.session.constructor.name
            });
            
            // Check for specific SIP.js DTMF errors
            if (error.message && error.message.includes('RFC4733')) {
                console.error('💡 RFC4733 DTMF error - server may not support in-band DTMF');
            } else if (error.message && error.message.includes('transport')) {
                console.error('💡 Transport error - check WebSocket connection');
            } else if (error.message && error.message.includes('session')) {
                console.error('💡 Session error - call may have been terminated');
            }
            
            throw error;
        }
    }

    // Subscription Management
    async subscribe(target, event = 'dialog', options = {}) {
        if (!this.userAgent || !this.userAgent.isRegistered()) {
            throw new Error('Not registered');
        }

        try {
            const subscriptionId = this.generateSubscriptionId();
            
            // Create target URI
            const targetURI = SIP.UserAgent.makeURI(`sip:${target}@${this.config.domain}`);
            
            // Create subscriber
            const subscriber = new SIP.Subscriber(this.userAgent, targetURI, event, {
                expires: options.expires || 3600,
                extraHeaders: options.extraHeaders || []
            });

            // Set up notification handler
            subscriber.delegate = {
                onNotify: (notification) => {
                    this.handleSubscriptionNotify(subscriptionId, notification);
                }
            };

            // Store subscription
            const subscriptionData = {
                id: subscriptionId,
                target: target,
                event: event,
                subscriber: subscriber,
                state: 'subscribing',
                ...options
            };

            this.subscriptions.set(subscriptionId, subscriptionData);

            // Start subscription
            await subscriber.subscribe();
            
            subscriptionData.state = 'active';
            this.emit('subscriptionCreated', subscriptionData);

            return subscriptionData;

        } catch (error) {
            console.error('Failed to create subscription:', error);
            this.emit('subscriptionError', { target, error });
            throw error;
        }
    }

    handleSubscriptionNotify(subscriptionId, notification) {
        const subscriptionData = this.subscriptions.get(subscriptionId);
        if (!subscriptionData) return;

        notification.accept();

        this.emit('notifyReceived', {
            subscriptionId,
            target: subscriptionData.target,
            event: subscriptionData.event,
            notification: notification
        });
    }

    async unsubscribe(subscriptionId) {
        const subscriptionData = this.subscriptions.get(subscriptionId);
        if (!subscriptionData) return;

        try {
            await subscriptionData.subscriber.unsubscribe();
            this.subscriptions.delete(subscriptionId);
            this.emit('subscriptionTerminated', subscriptionData);
        } catch (error) {
            console.error('Failed to unsubscribe:', error);
        }
    }

    async unsubscribeAll() {
        // Unsubscribe from general subscriptions
        const subscriptionIds = Array.from(this.subscriptions.keys());
        const unsubscribePromises = subscriptionIds.map(id => this.unsubscribe(id));
        
        // Also unsubscribe from all BLF subscriptions
        this.unsubscribeAllBLF();
        
        await Promise.allSettled(unsubscribePromises);
    }

    // Message Handling
    handleIncomingMessage(message) {
        this.emit('messageReceived', {
            from: message.remoteIdentity,
            to: message.localIdentity,
            body: message.body,
            contentType: message.contentType
        });
    }

    handleIncomingNotify(notification) {
        // Handle general NOTIFY messages that aren't subscription-related
        // In SIP.js 0.21.2, notification properties are accessed through the request
        try {
            const request = notification.request;
            
            // Extract headers and body from the SIP request
            const fromHeader = request.getHeader('From');
            const toHeader = request.getHeader('To'); 
            const eventHeader = request.getHeader('Event');
            const contentTypeHeader = request.getHeader('Content-Type');
            const body = request.body;
            
            // Parse From and To headers to extract identities
            let fromIdentity = null;
            let toIdentity = null;
            
            if (fromHeader) {
                const fromMatch = fromHeader.match(/<sip:([^>]+)>/);
                fromIdentity = fromMatch ? fromMatch[1] : fromHeader;
            }
            
            if (toHeader) {
                const toMatch = toHeader.match(/<sip:([^>]+)>/);
                toIdentity = toMatch ? toMatch[1] : toHeader;
            }
            
            // For message-summary events, parse the voicemail count
            let voicemailData = null;
            if (eventHeader && eventHeader.toLowerCase().includes('message-summary') && body) {
                voicemailData = this.parseMessageSummary(body);
            }
            
            // Accept the NOTIFY request
            notification.accept();
            
            this.emit('notifyReceived', {
                from: fromIdentity,
                to: toIdentity,
                body: body,
                contentType: contentTypeHeader,
                event: eventHeader,
                voicemailData: voicemailData,
                notification: notification
            });
            
        } catch (error) {
            console.error('Error handling incoming NOTIFY:', error);
            // Still try to accept the notification to avoid server errors
            try {
                notification.accept();
            } catch (acceptError) {
                console.error('Error accepting NOTIFY:', acceptError);
            }
        }
    }
    
    // Parse message-summary body to extract voicemail information
    parseMessageSummary(body) {
        try {
            const lines = body.split('\n');
            const summary = {};
            
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (trimmedLine.startsWith('Messages-Waiting:')) {
                    summary.messagesWaiting = trimmedLine.split(':')[1].trim().toLowerCase() === 'yes';
                } else if (trimmedLine.startsWith('Voice-Message:')) {
                    // Parse format like "3/0 (0/0)" where first number is new messages
                    const voiceMatch = trimmedLine.match(/Voice-Message:\s*(\d+)\/(\d+)/);
                    if (voiceMatch) {
                        summary.newVoiceMessages = parseInt(voiceMatch[1], 10);
                        summary.oldVoiceMessages = parseInt(voiceMatch[2], 10);
                        summary.totalVoiceMessages = summary.newVoiceMessages + summary.oldVoiceMessages;
                    }
                }
            }
            
            return summary;
        } catch (error) {
            console.error('Error parsing message-summary:', error);
            return null;
        }
    }

    // Transport Event Handlers
    handleTransportConnect() {
        //console.log('✅ SIP WebSocket transport connected successfully');
        //console.log('WebSocket connection established to:', this.config.server);
        //console.log('Transport protocol: SIP over WebSocket (WSS)');
        
        this.transportState = 'connected';
        this.emit('transportStateChanged', 'connected');
        this.emit('transportConnected');
        
        // Reset reconnection attempts (critical for working version compatibility)
        if (this.userAgent) {
            this.userAgent.isReRegister = false;
            this.userAgent.transport.attemptingReconnection = false;
            this.userAgent.transport.ReconnectionAttempts = this.config.reconnectionAttempts || 5;
            
            //console.log('🔄 Transport connection state reset:');
            //console.log('   isReRegister:', this.userAgent.isReRegister);
            //console.log('   attemptingReconnection:', this.userAgent.transport.attemptingReconnection);
            //console.log('   ReconnectionAttempts:', this.userAgent.transport.ReconnectionAttempts);
        }
        
        // Auto-start registration (matching working phone.js pattern)
        if (this.userAgent && 
            !this.userAgent.transport.attemptingReconnection && 
            !this.userAgent.registering) {
            
            // Use 500ms delay like the working version
            setTimeout(() => {
                if (this.userAgent && !this.userAgent.isRegistered() && !this.userAgent.registering) {
                    //console.log('🚀 Auto-starting registration after transport connect (500ms delay)');
                    this.register().catch(error => {
                        console.error('❌ Auto-registration failed:', error);
                    });
                }
            }, 500);
        }
    }

    handleTransportDisconnect(error) {
        //console.log('❌ SIP WebSocket transport disconnected');
        if (error) {
            //console.log('Disconnect reason:', error.message || error);
        }
        
        this.transportState = 'disconnected';
        this.emit('transportStateChanged', 'disconnected');
        
        // Clear subscription state since they're no longer valid after disconnect
        this.subscriptions.clear();
        this.blfSubscriptions.clear();
        
        if (this.userAgent) {
            this.userAgent.isReRegister = false;
            this.userAgent.registering = false;
        }
        
        if (error) {
            this.handleTransportError(error);
        } else {
            this.emit('transportDisconnected', null);
        }
    }
    
    handleTransportError(error) {
        console.error('SIP transport error:', error);
        
        // Enhanced error logging for WebRTC debugging
        if (error) {
            console.error('Transport error details:', {
                message: error.message,
                type: error.constructor.name,
                stack: error.stack,
                config: {
                    server: this.config.server,
                    domain: this.config.domain,
                    wssInTransport: this.config.wssInTransport
                }
            });
            
            // Check if it's a WebSocket connection error
            if (error.message && error.message.includes('WebSocket')) {
                console.error('WebSocket connection failed - check server URL and WebRTC configuration');
            }
            
            // Check if it's a WebRTC-related error
            if (error.message && (error.message.includes('RTC') || error.message.includes('ICE'))) {
                console.error('WebRTC connection failed - check ICE servers and network configuration');
            }
        }
        
        this.transportState = 'disconnected';
        this.emit('transportError', error);
        this.emit('transportDisconnected', error);
        
        if (this.userAgent) {
            this.userAgent.isReRegister = false;
            
            // Try to unregister cleanly
            try {
                this.userAgent.registerer.unregister();
            } catch (e) {
                console.warn('Failed to unregister after transport error:', e);
            }
        }
        
        // Start reconnection process
        this.reconnectTransport();
    }
    
    reconnectTransport() {
        if (!this.userAgent || !this.userAgent.transport) {
            //console.log('No transport to reconnect');
            return;
        }
        
        if (this.userAgent.transport.isConnected()) {
            //console.log('Transport already connected, no need to reconnect');
            return;
        }
        
        this.userAgent.registering = false; // Transport down means not registered
        
        const timeout = (this.config.reconnectionTimeout || 10) * 1000;
        const attemptsLeft = this.userAgent.transport.ReconnectionAttempts || 0;
        
        //console.log(`Scheduling reconnection in ${timeout/1000}s. Attempts remaining: ${attemptsLeft}`);
        
        this.userAgent.transport.ReconnectionAttempts = Math.max(0, attemptsLeft - 1);
        
        if (attemptsLeft <= 0) {
            console.warn('Max reconnection attempts reached');
            this.emit('transportError', new Error('Max reconnection attempts reached'));
            return;
        }
        
        setTimeout(() => {
            if (!this.userAgent || this.userAgent.transport.isConnected()) {
                return;
            }
            
            //console.log('Attempting to reconnect transport...');
            this.userAgent.transport.attemptingReconnection = true;
            
            this.userAgent.start().catch(error => {
                console.error('Reconnection attempt failed:', error);
                this.handleTransportError(error);
            });
            
        }, timeout);
    }
    
    // Start UserAgent and connect transport
    async start() {
        if (!this.userAgent) {
            throw new Error('UserAgent not created');
        }
        
        try {
            //console.log('Starting UserAgent and connecting to WebSocket...');
            this.transportState = 'connecting';
            this.emit('transportStateChanged', 'connecting');
            
            await this.userAgent.start();
            
        } catch (error) {
            console.error('Failed to start UserAgent:', error);
            this.handleTransportError(error);
            throw error;
        }
    }
    
    // Stop UserAgent
    async stop() {
        if (!this.userAgent) return;
        
        try {
            //console.log('Stopping UserAgent...');
            
            // Clean unregistration
            if (this.userAgent.isRegistered()) {
                await this.unregister(false);
            }
            
            await this.userAgent.stop();
            
            this.transportState = 'disconnected';
            this.registrationState = 'unregistered';
            
            this.emit('transportStateChanged', 'disconnected');
            this.emit('registrationStateChanged', 'unregistered');
            
        } catch (error) {
            console.error('Error stopping UserAgent:', error);
        }
    }

    // Helper function to check if session is in established/active state
    isSessionEstablished(sessionState) {
        const validStates = [
            SIP.SessionState.Established,  // SIP.js enum value
            'Established',                 // String value
            'active',                      // Alternative state name  
            'confirmed'                    // Another possible state
        ];
        return validStates.includes(sessionState);
    }

    // Utility Methods
    generateSessionId() {
        return `session_${++this.sessionCounter}_${Date.now()}`;
    }

    generateSubscriptionId() {
        return `subscription_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    assignLineNumber() {
        // Find first available line (1, 2, or 3)
        for (let lineNumber = 1; lineNumber <= 3; lineNumber++) {
            if (!this.activeLines.has(lineNumber)) {
                return lineNumber;
            }
        }
        // All lines occupied - return null
        console.warn('⚠️ All 3 lines are occupied');
        return null;
    }

    // State Getters
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }

    getSessionByLine(lineNumber) {
        const sessionId = this.activeLines.get(lineNumber);
        return sessionId ? this.sessions.get(sessionId) : null;
    }

    getAllSessions() {
        return Array.from(this.sessions.values());
    }

    getActiveSessions() {
        return this.getAllSessions().filter(session => 
            this.isSessionEstablished(session.state)
        );
    }

    getSubscription(subscriptionId) {
        return this.subscriptions.get(subscriptionId);
    }

    getAllSubscriptions() {
        return Array.from(this.subscriptions.values());
    }

    isRegistered() {
        return this.userAgent && this.userAgent.isRegistered();
    }

    getStats() {
        return { ...this.stats };
    }

    getConfig() {
        return { ...this.config };
    }
    
    getDisplayName() {
        // First check if we have a stored profileName
        if (window.localDB) {
            const storedProfileName = window.localDB.getItem('profileName', null);
            if (storedProfileName) {
                return storedProfileName;
            }
        }
        
        // Fallback to config displayName or generate from username
        return this.config.displayName || (this.config.username ? `${this.config.username}-365Connect` : '');
    }
    
    setProfileName(profileName) {
        this.config.displayName = profileName;
        if (window.localDB) {
            window.localDB.setItem('profileName', profileName);
        }
        this.emit('configChanged', this.config);
    }

    // High-Level Call Management Functions (phone.js compatibility)
    async makeCall(target, options = {}) {
        try {
            //console.log(`Making call to ${target}`);
            
            // Validate target
            if (!target) {
                throw new Error('No target specified');
            }
            
            // Create outgoing session
            const sessionData = await this.createOutgoingSession(target, options);
            
            return sessionData;
            
        } catch (error) {
            console.error('Failed to make call:', error);
            throw error;
        }
    }
    
    // Convenience method for sending DTMF to current session
    async sendDTMFToCurrent(tone) {
        const currentSession = this.getCurrentSession();
        if (!currentSession) {
            throw new Error('No current session to send DTMF to');
        }
        
        return await this.sendDTMF(currentSession.id, tone);
    }

    // Send a sequence of DTMF tones with delays between each tone
    async sendDTMFSequence(sessionId, sequence, toneDuration = 150, pauseBetweenTones = 200, initialDelay = 500) {
        //console.log(`📞 Sending DTMF sequence: "${sequence}" to session ${sessionId} (initial delay: ${initialDelay}ms, inter-tone pause: ${pauseBetweenTones}ms)`);
        
        if (!sequence || typeof sequence !== 'string') {
            throw new Error('Valid DTMF sequence is required');
        }
        
        const validTones = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '#'];
        
        // Validate all characters in the sequence
        for (let i = 0; i < sequence.length; i++) {
            const tone = sequence[i];
            if (!validTones.includes(tone)) {
                throw new Error(`Invalid DTMF tone "${tone}" at position ${i + 1} in sequence "${sequence}". Valid tones are: ${validTones.join(', ')}`);
            }
        }
        
        try {
            // Initial delay before sending any DTMF - allows call to fully establish
            if (initialDelay > 0) {
                //console.log(`⏳ Waiting ${initialDelay}ms before starting DTMF sequence...`);
                await new Promise(resolve => setTimeout(resolve, initialDelay));
            }
            
            // Send each tone individually with delays
            for (let i = 0; i < sequence.length; i++) {
                const tone = sequence[i];
                //console.log(`🎵 Sending DTMF tone ${i + 1}/${sequence.length}: "${tone}"`);
                
                await this.sendDTMF(sessionId, tone);
                
                // Wait between tones (except after the last one)
                if (i < sequence.length - 1) {
                    //console.log(`⏳ Waiting ${pauseBetweenTones}ms before next tone...`);
                    await new Promise(resolve => setTimeout(resolve, pauseBetweenTones));
                }
            }
            
            //console.log(`✅ Successfully sent DTMF sequence: "${sequence}"`);
            return true;
            
        } catch (error) {
            console.error(`❌ Failed to send DTMF sequence: "${sequence}"`, error);
            throw error;
        }
    }

    // Convenience method for sending DTMF sequence to current session
    async sendDTMFSequenceToCurrent(sequence, toneDuration = 100, pauseBetweenTones = 50, initialDelay = 250) {
        const currentSession = this.getCurrentSession();
        if (!currentSession) {
            throw new Error('No current session to send DTMF sequence to');
        }
        
        return await this.sendDTMFSequence(currentSession.id, sequence, toneDuration, pauseBetweenTones, initialDelay);
    }

    async answerCall(sessionId) {
        try {
            //console.log(`Answering call ${sessionId}`);
            
            const sessionData = sessionId ? this.getSession(sessionId) : this.getIncomingSession();
            if (!sessionData) {
                throw new Error('No session to answer');
            }
            
            await this.answerSession(sessionData.id);
            
            return sessionData;
            
        } catch (error) {
            console.error('Failed to answer call:', error);
            throw error;
        }
    }
    
    async hangupCall(sessionId = null) {
        try {
            let sessionData;
            
            if (sessionId) {
                sessionData = this.getSession(sessionId);
            } else {
                // Hang up current session or first active session
                sessionData = this.getCurrentSession() || this.getFirstActiveSession();
            }
            
            if (!sessionData) {
                //console.log('No session to hang up');
                return;
            }
            
            //console.log(`Hanging up call ${sessionData.id}`);
            await this.terminateSession(sessionData.id);
            
            return sessionData;
            
        } catch (error) {
            console.error('Failed to hang up call:', error);
            throw error;
        }
    }
    

    async holdCall(sessionId, hold = true) {
        try {
            const sessionData = sessionId ? this.getSession(sessionId) : this.getCurrentSession();
            if (!sessionData) {
                throw new Error('No session to hold/unhold');
            }
            
            console.log(`${hold ? 'Holding' : 'Unholding'} call ${sessionData.id}`);
            
            if (hold) {
                await this.holdSession(sessionData.id);
            } else {
                await this.unholdSession(sessionData.id);
            }
            
            return sessionData;
            
        } catch (error) {
            console.error(`Failed to ${hold ? 'hold' : 'unhold'} call:`, error);
            throw error;
        }
    }
    
    async muteCall(sessionId, mute = true) {
        try {
            const sessionData = sessionId ? this.getSession(sessionId) : this.getCurrentSession();
            if (!sessionData) {
                throw new Error('No session to mute/unmute');
            }
            
            //console.log(`${mute ? 'Muting' : 'Unmuting'} call ${sessionData.id}`);
            
            if (mute) {
                await this.muteSession(sessionData.id);
            } else {
                await this.unmuteSession(sessionData.id);
            }
            
            return sessionData;
            
        } catch (error) {
            console.error(`Failed to ${mute ? 'mute' : 'unmute'} call:`, error);
            throw error;
        }
    }
    
    async toggleMute(sessionId = null) {
        try {
            const sessionData = sessionId ? this.getSession(sessionId) : this.getCurrentSession();
            if (!sessionData) {
                throw new Error('No session to toggle mute');
            }
            
            const newMuteState = !sessionData.muted;
            //console.log(`Toggling mute for call ${sessionData.id}: ${sessionData.muted} -> ${newMuteState}`);
            
            if (newMuteState) {
                await this.muteSession(sessionData.id);
            } else {
                await this.unmuteSession(sessionData.id);
            }
            
            return sessionData;
            
        } catch (error) {
            console.error('Failed to toggle mute:', error);
            throw error;
        }
    }
    
    async toggleHold(sessionId = null) {
        try {
            const sessionData = sessionId ? this.getSession(sessionId) : this.getCurrentSession();
            if (!sessionData) {
                throw new Error('No session to toggle hold');
            }
            
            const newHoldState = !sessionData.onHold;
            //console.log(`Toggling hold for call ${sessionData.id}: ${sessionData.onHold} -> ${newHoldState}`);
            
            if (newHoldState) {
                await this.holdSession(sessionData.id);
            } else {
                await this.unholdSession(sessionData.id);
            }
            
            return sessionData;
            
        } catch (error) {
            console.error('Failed to toggle hold:', error);
            throw error;
        }
    }
    
    async transferCall(sessionId, target, type = 'blind') {
        try {
            const sessionData = sessionId ? this.getSession(sessionId) : this.getCurrentSession();
            if (!sessionData) {
                throw new Error('No session to transfer');
            }
            
            //console.log(`Transferring call ${sessionData.id} to ${target} (${type})`);
            
            if (type === 'blind') {
                await this.blindTransfer(sessionData.id, target);
            } else if (type === 'attended') {
                await this.attendedTransfer(sessionData.id, target);
            } else {
                throw new Error(`Unknown transfer type: ${type}`);
            }
            
            return sessionData;
            
        } catch (error) {
            console.error('Failed to transfer call:', error);
            throw error;
        }
    }
    
    async blindTransfer(sessionId, target) {
        const sessionData = this.getSession(sessionId);
        if (!sessionData || !this.isSessionEstablished(sessionData.state)) {
            console.log('❌ Blind transfer session state check failed:', {
                hasSession: !!sessionData,
                currentState: sessionData?.state,
                isEstablished: sessionData ? this.isSessionEstablished(sessionData.state) : false
            });
            throw new Error('Cannot transfer: session not established');
        }
        
        try {
            const session = sessionData.session;
            
            // Initialize transfer data tracking (like old app)
            if (!session.data) session.data = {};
            if (!session.data.transfer) session.data.transfer = [];
            
            // Add transfer record
            session.data.transfer.push({ 
                type: "Blind", 
                to: target, 
                transferTime: new Date().toISOString(), 
                disposition: "refer",
                dispositionTime: new Date().toISOString(), 
                accept : {
                    complete: null,
                    eventTime: null,
                    disposition: ""
                }
            });
            const transferId = session.data.transfer.length - 1;
            
            // Create REFER request for blind transfer with proper response handling
            const referTarget = SIP.UserAgent.makeURI(`sip:${target}@${this.config.domain}`);
            console.log('🎯 Setting up REFER request for:', referTarget.toString());
            
            // Set up NOTIFY handler for transfer progress
            const originalNotifyHandler = session.delegate?.onNotify;
            session.delegate = session.delegate || {};
            
            session.delegate.onNotify = (notification) => {
                try {
                    console.log('🔔 NOTIFY handler called for transfer');
                    
                    // Call original handler if it exists
                    if (originalNotifyHandler) {
                        originalNotifyHandler.call(session.delegate, notification);
                    }
                    
                    // Handle transfer-related NOTIFY messages
                    const eventHeader = notification.request.getHeader('Event');
                    console.log('📧 Event header:', eventHeader);
                    if (eventHeader && eventHeader.toLowerCase().includes('refer')) {
                        const body = notification.request.body;
                        console.log('📞 Transfer NOTIFY received:', body);
                        
                        // Parse the SIP fragment in the body
                        if (body) {
                            if (body.includes('SIP/2.0 200 OK')) {
                                // Transfer completed successfully - now clean up the session
                                console.log("✅ Blind transfer completed successfully - cleaning up session");
                                
                                // Update transfer record with final status
                                session.data.transfer[transferId].accept.disposition = "200 OK - Transfer Completed";
                                session.data.reasonCode = 200;
                                session.data.reasonText = "Transfer Completed";
                                
                            // Clean up the session after successful transfer (like old app)
                            setTimeout(() => {
                                session.bye().catch(error => {
                                    console.warn("Could not BYE after blind transfer:", error);
                                });
                                
                                // Note: Don't call terminateSession() here as the session is already being cleaned up
                                // by the BYE response and session termination handlers
                            }, 100);                            } else if (body.includes('SIP/2.0 4') || body.includes('SIP/2.0 5') || body.includes('SIP/2.0 6')) {
                                // Transfer failed (4xx, 5xx, 6xx responses)
                                const errorMatch = body.match(/SIP\/2\.0 (\d+) (.+)/);
                                const errorCode = errorMatch ? errorMatch[1] : 'Unknown';
                                const errorReason = errorMatch ? errorMatch[2].trim() : 'Transfer failed';
                                
                                console.warn(`❌ Blind transfer failed: ${errorCode} ${errorReason}`);
                                
                                // Update transfer record
                                session.data.transfer[transferId].accept.complete = false;
                                session.data.transfer[transferId].accept.disposition = `${errorCode} ${errorReason}`;
                                session.data.transfer[transferId].accept.eventTime = new Date().toISOString();
                                
                                // Emit transfer failure event
                                this.emit('transferCompleted', { sessionId, target, type: 'blind', success: false, reason: errorReason });
                            }
                            // Ignore other responses like 100 Trying, 180 Ringing - these are intermediate
                        }
                    }
                } catch (error) {
                    console.error('❌ Error in NOTIFY handler:', error);
                }
            };

            const referOptions = {
                requestDelegate: {
                    onAccept: (response) => {
                        try {
                            console.log("✅ Blind transfer REFER accepted - transfer initiated");
                            console.log("📊 Response details:", response.message.statusCode, response.message.reasonPhrase);
                            
                            // Mark session as terminated by us (like old app) 
                            session.data.terminateby = "us";
                            session.data.reasonCode = 202;
                            session.data.reasonText = "Transfer";
                            
                            // Update transfer record for REFER acceptance
                            session.data.transfer[transferId].accept.complete = true;
                            session.data.transfer[transferId].accept.eventTime = new Date().toISOString();
                            session.data.transfer[transferId].accept.disposition = response.message.reasonPhrase;
                            
                            // Emit transfer initiated event to close modal immediately
                            this.emit('transferCompleted', { sessionId, target, type: 'blind', success: true });
                            
                            // The NOTIFY handler will handle final cleanup when transfer actually completes
                        } catch (error) {
                            console.error('❌ Error in onAccept callback:', error);
                        }
                    },
                    onReject: (response) => {
                        console.warn("❌ Blind transfer REFER rejected:", response);
                        
                        // Update transfer record
                        session.data.transfer[transferId].accept.complete = false;
                        session.data.transfer[transferId].accept.disposition = response.message.reasonPhrase;
                        session.data.transfer[transferId].accept.eventTime = new Date().toISOString();
                        
                        // Emit transfer failure event
                        this.emit('transferCompleted', { sessionId, target, type: 'blind', success: false, reason: response.message.reasonPhrase });
                        
                        // Session should still be up, so just allow them to try again
                        throw new Error(`Transfer rejected: ${response.message.reasonPhrase}`);
                    }
                }
            };
            
            console.log('🚀 About to send REFER request...');
            console.log('🔧 REFER options:', JSON.stringify(referOptions, null, 2));
            
            const result = await session.refer(referTarget, referOptions);
            console.log('📧 REFER result:', result);
            
            console.log(`📞 Blind transfer REFER sent to ${target}`);
            this.emit('transferInitiated', { sessionId, target, type: 'blind' });
            
        } catch (error) {
            console.error('Blind transfer failed:', error);
            throw error;
        }
    }
    
    async attendedTransfer(sessionId, target) {
        console.log('🔄 Starting attended transfer for session:', sessionId, 'to:', target);
        
        const sessionData = this.sessions.get(sessionId);
         if (!sessionData) {
            throw new Error('Session not found for attended transfer');
        }
        
        // Debug session state information
        console.log('🔍 Session state debug:', {
            sessionId: sessionId,
            hasSessionData: !!sessionData,
            hasSession: !!sessionData.session,
            sessionDataState: sessionData.state,
            sipSessionState: sessionData.session?.state,
            sessionStateString: sessionData.session?.state?.toString(),
            isEstablishedCheck: this.isSessionEstablished(sessionData.state),
            sipEstablishedEnum: SIP.SessionState.Established
        });
        
        // Check if session is established using both our tracked state and SIP session state
        const ourStateEstablished = this.isSessionEstablished(sessionData.state);
        const sipStateEstablished = sessionData.session ? this.isSessionEstablished(sessionData.session.state) : false;
        
        if (!sessionData.session || (!ourStateEstablished && !sipStateEstablished)) {
            console.log('❌ Session state check failed:', {
                hasSession: !!sessionData.session,
                ourState: sessionData.state,
                sipState: sessionData.session?.state,
                ourStateEstablished,
                sipStateEstablished
            });
            throw new Error('Cannot transfer: session not established');
        }

        const session = sessionData.session;
        
        try {
            // Validate target number
            if (!target || target.trim() === '') {
                throw new Error('Cannot transfer, no target number provided');
            }
            
            const dstNo = target.replace(/#/g, "%23");
            
            // Initialize transfer data tracking
            if (!session.data) session.data = {};
            if (!session.data.transfer) session.data.transfer = [];
            
            const transferRecord = {
                type: "Attended",
                to: dstNo,
                transferTime: new Date().toISOString(),
                disposition: "invite",
                dispositionTime: new Date().toISOString(),
                accept: {
                    complete: null,
                    eventTime: null,
                    disposition: ""
                }
            };
            
            session.data.transfer.push(transferRecord);
            const transferId = session.data.transfer.length - 1;
            
            // Get audio constraints (simplified from v1.0)
            const constraints = {
                audio: { deviceId: "default" },
                video: false
            };
            
            const spdOptions = {
                earlyMedia: true,
                sessionDescriptionHandlerOptions: {
                    constraints: constraints,
                    iceGatheringTimeout: this.config.iceGatheringTimeout || 500,
                    iceStopWaitingOnServerReflexive: this.config.iceStopWaitingOnServerReflexive || true
                }
            };
            
            // Create target URI and new session
            console.log("TRANSFER INVITE:", "sip:" + dstNo + "@" + this.config.domain);
            const targetURI = SIP.UserAgent.makeURI("sip:" + dstNo + "@" + this.config.domain);
            const transferSession = new SIP.Inviter(this.userAgent, targetURI, spdOptions);
            transferSession.data = {
                isTransferSession: true,
                originalSessionId: sessionId,
                transferId: transferId
            };
            
            // Set up transfer session delegates
            transferSession.delegate = {
                onBye: (sip) => {
                    console.log("Transfer session ended with BYE");
                    session.data.transfer[transferId].disposition = "bye";
                    session.data.transfer[transferId].dispositionTime = new Date().toISOString();
                    
                    // Check if transfer was already completed successfully
                    const wasCompleted = session.data.transfer[transferId]?.accept?.complete === true;
                    
                    if (!wasCompleted) {
                        // Only emit termination event if transfer wasn't completed
                        // (BYE after successful transfer is normal cleanup)
                        console.log("Transfer session BYE before completion - treating as failure");
                        this.emit('attendedTransferTerminated', {
                            originalSessionId: sessionId,
                            transferSessionId: transferSession.id || 'unknown',
                            reason: 'Transfer target hung up'
                        });
                    } else {
                        console.log("Transfer session BYE after completion - normal cleanup");
                    }
                },
                
                onSessionDescriptionHandler: (sdh, provisional) => {
                    if (sdh && sdh.peerConnection) {
                        // Set up audio handling for transfer session
                        sdh.peerConnection.ontrack = (event) => {
                            console.log('Transfer session audio track received');
                            // Audio will be handled by the browser's internal routing
                        };
                    }
                }
            };
            
            // Store reference to transfer session
            session.data.transferSession = transferSession;
            sessionData.transferSession = transferSession;
            
            // Set up invite options with detailed event handling
            const inviterOptions = {
                requestDelegate: {
                    onTrying: (sip) => {
                        console.log('Transfer call trying...');
                        session.data.transfer[transferId].disposition = "trying";
                        session.data.transfer[transferId].dispositionTime = new Date().toISOString();
                        
                        this.emit('attendedTransferProgress', {
                            originalSessionId: sessionId,
                            transferSessionId: transferSession.id || 'unknown',
                            status: 'trying'
                        });
                    },
                    
                    onProgress: (sip) => {
                        console.log('Transfer call ringing...');
                        session.data.transfer[transferId].disposition = "progress";
                        session.data.transfer[transferId].dispositionTime = new Date().toISOString();
                        
                        this.emit('attendedTransferProgress', {
                            originalSessionId: sessionId,
                            transferSessionId: transferSession.id || 'unknown',
                            status: 'ringing'
                        });
                    },
                    
                    onRedirect: (sip) => {
                        console.log("Transfer redirect received:", sip);
                    },
                    
                    onAccept: (sip) => {
                        console.log('Transfer call answered!');
                        session.data.transfer[transferId].disposition = "accepted";
                        session.data.transfer[transferId].dispositionTime = new Date().toISOString();
                        
                        this.emit('attendedTransferAnswered', {
                            originalSessionId: sessionId,
                            transferSessionId: transferSession.id || 'unknown',
                            transferSession: transferSession
                        });
                    },
                    
                    onReject: (sip) => {
                        console.log("Transfer call rejected:", sip.message ? sip.message.reasonPhrase : 'Unknown reason');
                        session.data.transfer[transferId].disposition = sip.message ? sip.message.reasonPhrase : 'rejected';
                        session.data.transfer[transferId].dispositionTime = new Date().toISOString();
                        
                        this.emit('attendedTransferRejected', {
                            originalSessionId: sessionId,
                            transferSessionId: transferSession.id || 'unknown',
                            reason: sip.message ? sip.message.reasonPhrase : 'Call rejected'
                        });
                    }
                }
            };
            
            // Send the INVITE
            await transferSession.invite(inviterOptions);
            
            console.log('✅ Attended transfer session created successfully');
            this.emit('attendedTransferInitiated', {
                originalSessionId: sessionId,
                transferSessionId: transferSession.id || 'unknown',
                target: dstNo,
                transferSession: transferSession
            });
            
            return transferSession;
            
        } catch (error) {
            console.error('❌ Attended transfer failed:', error);
            this.emit('sessionError', { sessionId, error });
            throw error;
        }
    }
    
    // Utility functions for call management
    getCurrentSession() {
        return this.sessions.get(this.selectedLine ? this.activeLines.get(this.selectedLine) : null);
    }
    
    getFirstActiveSession() {
        for (const [sessionId, sessionData] of this.sessions) {
            if (sessionData.state !== 'terminated' && sessionData.state !== 'failed') {
                return sessionData;
            }
        }
        return null;
    }
    
    getIncomingSession() {
        for (const [sessionId, sessionData] of this.sessions) {
            if (sessionData.direction === 'incoming' && 
                (sessionData.state === 'establishing' || 
                 sessionData.state === 'ringing' ||
                 sessionData.session.state === SIP.SessionState.Initial)) {
                return sessionData;
            }
        }
        return null;
    }
    
    isValidPhoneNumber(number) {
        if (!number || typeof number !== 'string') return false;
        
        // Remove spaces, dashes, parentheses
        const cleaned = number.replace(/[\s\-\(\)]/g, '');
        
        // Check if it's all digits (possibly with + at start)
        return /^\+?\d{3,15}$/.test(cleaned);
    }
    
    callBuddy(number) {
        return this.makeCall(number);
    }
    
    hasActiveSessions() {
        return this.sessions.size > 0;
    }

    // Line Management Methods
    getAvailableLine() {
        // Find first available line (1, 2, or 3)
        for (let lineNumber = 1; lineNumber <= 3; lineNumber++) {
            if (!this.activeLines.has(lineNumber)) {
                return lineNumber;
            }
        }
        return null; // All lines occupied
    }

    autoAssignLine(sessionId) {
        const availableLine = this.getAvailableLine();
        if (availableLine) {
            this.activeLines.set(availableLine, sessionId);
            const sessionData = this.sessions.get(sessionId);
            if (sessionData) {
                sessionData.lineNumber = availableLine;
                console.log(`📞 Session ${sessionId} assigned to line ${availableLine}`);
            }
            return availableLine;
        }
        console.warn('⚠️ No available lines for session assignment');
        return null;
    }

    selectLine(lineNumber) {
        if (lineNumber < 1 || lineNumber > 3) {
            console.error('❌ Invalid line number:', lineNumber);
            return false;
        }

        const sessionId = this.activeLines.get(lineNumber);
        if (!sessionId) {
            console.log(`📞 Line ${lineNumber} has no active session`);
            this.selectedLine = null;
            this.emit('lineSelected', { lineNumber, sessionId: null });
            return false;
        }

        this.selectedLine = lineNumber;
        console.log(`📞 Line ${lineNumber} selected (session: ${sessionId})`);
        this.emit('lineSelected', { lineNumber, sessionId });
        return true;
    }

    async holdCurrentAndSelectLine(targetLineNumber) {
        // Get current selected line session
        const currentLineNumber = this.selectedLine;
        const currentSessionId = currentLineNumber ? this.activeLines.get(currentLineNumber) : null;
        const currentSession = currentSessionId ? this.sessions.get(currentSessionId) : null;

        // If there's an active call on current line that's not already on hold, hold it
        if (currentSession && !currentSession.onHold && currentSession.state === SIP.SessionState.Established) {
            console.log(`📞 Auto-holding current line ${currentLineNumber} before switching to line ${targetLineNumber}`);
            try {
                await this.holdSession(currentSessionId);
            } catch (error) {
                console.error('❌ Failed to auto-hold current session:', error);
                // Continue anyway - user explicitly wants to switch lines
            }
        }

        // Select the target line
        return this.selectLine(targetLineNumber);
    }

    getLineSession(lineNumber) {
        const sessionId = this.activeLines.get(lineNumber);
        return sessionId ? this.sessions.get(sessionId) : null;
    }

    releaseLineAssignment(sessionId) {
        // Find and remove line assignment for this session
        for (const [lineNumber, sid] of this.activeLines.entries()) {
            if (sid === sessionId) {
                this.activeLines.delete(lineNumber);
                console.log(`📞 Released line ${lineNumber} from session ${sessionId}`);
                
                // If this was the selected line, clear selection
                if (this.selectedLine === lineNumber) {
                    this.selectedLine = null;
                }
                
                this.emit('lineReleased', { lineNumber, sessionId });
                return lineNumber;
            }
        }
        return null;
    }

    getLineStates() {
        const states = {};
        for (let lineNumber = 1; lineNumber <= 3; lineNumber++) {
            const sessionId = this.activeLines.get(lineNumber);
            const session = sessionId ? this.sessions.get(sessionId) : null;
            
            if (!session) {
                states[lineNumber] = 'idle';
            } else if (session.direction === 'incoming' && 
                       (session.state === 'establishing' || session.state === 'ringing')) {
                states[lineNumber] = 'ringing';
            } else if (session.onHold) {
                states[lineNumber] = 'hold';
            } else if (session.state === SIP.SessionState.Established) {
                states[lineNumber] = 'active';
            } else {
                states[lineNumber] = 'idle';
            }
        }
        return states;
    }

    // Debug function to analyze session DTMF capabilities
    debugSessionDtmf(sessionId) {
        const sessionData = this.sessions.get(sessionId);
        if (!sessionData) {
            console.error('❌ Session not found:', sessionId);
            return;
        }
        
        //console.log('🔍 DTMF Debug for session:', sessionId);
        //console.log('📋 Session type:', sessionData.session.constructor.name);
        //console.log('📋 Session state:', sessionData.session.state);
        //console.log('📋 Has dialog:', !!sessionData.session._dialog);
        //console.log('📋 Has SDH:', !!sessionData.session.sessionDescriptionHandler);
        
        // Check session methods
        const sessionMethods = Object.getOwnPropertyNames(sessionData.session)
            .filter(name => typeof sessionData.session[name] === 'function');
        //console.log('📋 Session methods:', sessionMethods);
        
        // Check session properties  
        const sessionProps = Object.getOwnPropertyNames(sessionData.session)
            .filter(name => typeof sessionData.session[name] !== 'function');
        //console.log('📋 Session properties:', sessionProps);
        
        // Check if session has DTMF-related methods
        const dtmfMethods = sessionMethods.filter(name => 
            name.toLowerCase().includes('dtmf') || name.toLowerCase().includes('info'));
        //console.log('📋 DTMF-related methods on session:', dtmfMethods);
        
        // Check SessionDescriptionHandler if available
        if (sessionData.session.sessionDescriptionHandler) {
            const sdh = sessionData.session.sessionDescriptionHandler;
            //console.log('📋 SDH type:', sdh.constructor.name);
            
            const sdhMethods = Object.getOwnPropertyNames(sdh)
                .filter(name => typeof sdh[name] === 'function');
            //console.log('📋 SDH methods:', sdhMethods);
            
            const sdhDtmfMethods = sdhMethods.filter(name => 
                name.toLowerCase().includes('dtmf'));
            //console.log('📋 DTMF-related methods on SDH:', sdhDtmfMethods);
        }
        
        // Check dialog if available
        if (sessionData.session._dialog) {
            const dialog = sessionData.session._dialog;
            //console.log('📋 Dialog type:', dialog.constructor.name);
            
            const dialogMethods = Object.getOwnPropertyNames(dialog)
                .filter(name => typeof dialog[name] === 'function');
            //console.log('📋 Dialog methods:', dialogMethods);
            
            const dialogDtmfMethods = dialogMethods.filter(name => 
                name.toLowerCase().includes('dtmf') || name.toLowerCase().includes('info'));
            //console.log('📋 DTMF-related methods on dialog:', dialogDtmfMethods);
        }
    }

    // Call Control Methods
    async muteSession(sessionId) {
        const sessionData = this.sessions.get(sessionId);
        if (!sessionData) {
            throw new Error('Session not found');
        }

        try {
            const session = sessionData.session;
            const sdh = session.sessionDescriptionHandler;
            
            if (sdh && sdh.localMediaStream) {
                const audioTracks = sdh.localMediaStream.getAudioTracks();
                audioTracks.forEach(track => {
                    track.enabled = false;
                });
                
                sessionData.muted = true;
                this.emit('sessionMuted', { sessionId, muted: true });
                //console.log('🔇 Session muted:', sessionId);
                return true;
            }
            
            throw new Error('No audio stream available for muting');
        } catch (error) {
            console.error('Failed to mute session:', error);
            this.emit('sessionError', { sessionId, error });
            throw error;
        }
    }

    async unmuteSession(sessionId) {
        const sessionData = this.sessions.get(sessionId);
        if (!sessionData) {
            throw new Error('Session not found');
        }

        try {
            const session = sessionData.session;
            const sdh = session.sessionDescriptionHandler;
            
            if (sdh && sdh.localMediaStream) {
                const audioTracks = sdh.localMediaStream.getAudioTracks();
                audioTracks.forEach(track => {
                    track.enabled = true;
                });
                
                sessionData.muted = false;
                this.emit('sessionMuted', { sessionId, muted: false });
                //console.log('🔊 Session unmuted:', sessionId);
                return true;
            }
            
            throw new Error('No audio stream available for unmuting');
        } catch (error) {
            console.error('Failed to unmute session:', error);
            this.emit('sessionError', { sessionId, error });
            throw error;
        }
    }

    async holdSession(sessionId) {
        const sessionData = this.sessions.get(sessionId);
        if (!sessionData) {
            throw new Error('Session not found');
        }

        if (sessionData.onHold) {
            console.log('Session is already on hold:', sessionId);
            return;
        }

        try {
            // Use the correct SIP.js v0.20.0 approach for holding
            const options = {
                sessionDescriptionHandlerOptions: {
                    hold: true,
                    constraints: {
                        audio: false,  // Mute audio for hold
                        video: false
                    },
                    iceGatheringTimeout: this.config.iceGatheringTimeout || 500,
                    iceStopWaitingOnServerReflexive: this.config.iceStopWaitingOnServerReflexive || true
                }
            };

            await sessionData.session.invite(options);
            sessionData.onHold = true;
            this.emit('sessionHeld', { sessionId, onHold: true });
            console.log('⏸️ Session put on hold:', sessionId);
        } catch (error) {
            console.error('Failed to hold session:', error);
            this.emit('sessionError', { sessionId, error });
            throw error;
        }
    }

    async unholdSession(sessionId) {
        const sessionData = this.sessions.get(sessionId);
        if (!sessionData) {
            throw new Error('Session not found');
        }

        if (!sessionData.onHold) {
            console.log('Session is not on hold:', sessionId);
            return;
        }

        try {
            // Use the correct SIP.js v0.20.0 approach for unholding
            const options = {
                sessionDescriptionHandlerOptions: {
                    hold: false,
                    constraints: {
                        audio: true,  // Restore audio for unhold
                        video: false
                    },
                    iceGatheringTimeout: this.config.iceGatheringTimeout || 500,
                    iceStopWaitingOnServerReflexive: this.config.iceStopWaitingOnServerReflexive || true
                }
            };

            await sessionData.session.invite(options);
            sessionData.onHold = false;
            this.emit('sessionHeld', { sessionId, onHold: false });
            console.log('▶️ Session resumed from hold:', sessionId);
        } catch (error) {
            console.error('Failed to unhold session:', error);
            this.emit('sessionError', { sessionId, error });
            throw error;
        }
    }

    async toggleMute(sessionId = null) {
        const targetSessionId = sessionId || this.getActiveSessionId();
        if (!targetSessionId) {
            throw new Error('No active session to mute/unmute');
        }

        const sessionData = this.sessions.get(targetSessionId);
        if (!sessionData) {
            throw new Error('Session not found');
        }

        if (sessionData.muted) {
            await this.unmuteSession(targetSessionId);
        } else {
            await this.muteSession(targetSessionId);
        }
    }

    async toggleHold(sessionId = null) {
        const targetSessionId = sessionId || this.getActiveSessionId();
        if (!targetSessionId) {
            throw new Error('No active session to hold/unhold');
        }

        const sessionData = this.sessions.get(targetSessionId);
        if (!sessionData) {
            throw new Error('Session not found');
        }

        console.log('🔄 Toggle hold - Current hold state:', sessionData.onHold, 'for session:', targetSessionId);

        if (sessionData.onHold) {
            console.log('📞 Session is on hold, calling unholdSession');
            await this.unholdSession(targetSessionId);
        } else {
            console.log('📞 Session is not on hold, calling holdSession');
            await this.holdSession(targetSessionId);
        }
    }

    getActiveSessionId() {
        for (const [sessionId, sessionData] of this.sessions) {
            if (sessionData.state === SIP.SessionState.Established || sessionData.state === 'Established') {
                return sessionId;
            }
        }
        return null;
    }



    async initiateAttendedTransfer(sessionId, target) {
        const sessionData = this.sessions.get(sessionId);
        if (!sessionData) {
            throw new Error('Session not found');
        }

        try {
            // Put original session on hold
            // await this.holdSession(sessionId);
            
            // Create new session to transfer target
            const transferSession = await this.createSession(target);
            
            // Store transfer relationship
            sessionData.transferTarget = transferSession.id;
            transferSession.isTransferTarget = true;
            transferSession.originalSession = sessionId;
            
            this.emit('attendedTransferInitiated', {
                originalSession: sessionId,
                transferSession: transferSession.id,
                target
            });
            
            //console.log('📞 Attended transfer initiated:', sessionId, '->', target);
            return transferSession;
            
        } catch (error) {
            console.error('Failed to initiate attended transfer:', error);
            this.emit('sessionError', { sessionId, error });
            throw error;
        }
    }

    async completeAttendedTransfer(originalSessionId, transferSessionId) {
        console.log('🔄 Completing attended transfer:', originalSessionId, '->', transferSessionId);
        
        const originalSessionData = this.sessions.get(originalSessionId);
        if (!originalSessionData) {
            throw new Error('Original session not found for transfer completion');
        }
        
        const originalSession = originalSessionData.session;
        if (!originalSession) {
            throw new Error('Original SIP session not found');
        }
        
        // Get transfer session (might not be in our sessions map if it's a raw SIP session)
        const transferSession = originalSessionData.transferSession;
        if (!transferSession) {
            throw new Error('Transfer session not found');
        }

        try {
            // Find the transfer record
            let transferId = -1;
            if (originalSession.data && originalSession.data.transfer) {
                transferId = originalSession.data.transfer.length - 1; // Get the latest transfer
            }
            
            const transferOptions = {
                requestDelegate: {
                    onAccept: (sip) => {
                        console.log("✅ Attended transfer completed successfully");
                        
                        // Update transfer record
                        if (transferId >= 0) {
                            originalSession.data.transfer[transferId].accept.complete = true;
                            originalSession.data.transfer[transferId].accept.disposition = sip.message ? sip.message.reasonPhrase : 'accepted';
                            originalSession.data.transfer[transferId].accept.eventTime = new Date().toISOString();
                        }
                        
                        // Mark original session for termination
                        originalSession.data.terminateby = "us";
                        originalSession.data.reasonCode = 202;
                        originalSession.data.reasonText = "Attended Transfer";
                        
                        this.emit('attendedTransferCompleted', {
                            originalSessionId: originalSessionId,
                            transferSessionId: transferSessionId,
                            success: true
                        });
                        
                        // End the original session as the transfer is complete
                        originalSession.bye().catch((error) => {
                            console.warn("Could not BYE original session after attended transfer:", error);
                        });
                        
                        // Clean up our session tracking
                        this.terminateSession(originalSessionId).catch((error) => {
                            console.warn("Error cleaning up original session:", error);
                        });
                    },
                    
                    onReject: (sip) => {
                        console.warn("❌ Attended transfer rejected:", sip.message ? sip.message.reasonPhrase : 'Unknown');
                        
                        // Update transfer record
                        if (transferId >= 0) {
                            originalSession.data.transfer[transferId].accept.complete = false;
                            originalSession.data.transfer[transferId].accept.disposition = sip.message ? sip.message.reasonPhrase : 'rejected';
                            originalSession.data.transfer[transferId].accept.eventTime = new Date().toISOString();
                        }
                        
                        this.emit('attendedTransferCompleted', {
                            originalSessionId: originalSessionId,
                            transferSessionId: transferSessionId,
                            success: false,
                            reason: sip.message ? sip.message.reasonPhrase : 'Transfer rejected'
                        });
                    }
                }
            };
            
            // Send REFER to complete the transfer
            console.log('📞 Sending REFER to complete attended transfer');
            await originalSession.refer(transferSession, transferOptions);
            
        } catch (error) {
            console.error('❌ Failed to complete attended transfer:', error);
            this.emit('sessionError', { sessionId: originalSessionId, error });
            throw error;
        }
    }
    
    async cancelAttendedTransfer(originalSessionId) {
        console.log('🚫 Cancelling attended transfer for session:', originalSessionId);
        
        const originalSessionData = this.sessions.get(originalSessionId);
        if (!originalSessionData) {
            throw new Error('Original session not found');
        }
        
        try {
            // Terminate transfer session if it exists
            if (originalSessionData.transferSession) {
                await originalSessionData.transferSession.cancel().catch((error) => {
                    console.warn("Failed to cancel transfer session:", error);
                    // Try BYE if cancel fails
                    return originalSessionData.transferSession.bye();
                });
            }
            
            // Update transfer record
            const originalSession = originalSessionData.session;
            if (originalSession && originalSession.data && originalSession.data.transfer) {
                const transferId = originalSession.data.transfer.length - 1;
                if (transferId >= 0) {
                    originalSession.data.transfer[transferId].accept.complete = false;
                    originalSession.data.transfer[transferId].accept.disposition = "cancelled";
                    originalSession.data.transfer[transferId].accept.eventTime = new Date().toISOString();
                }
            }
            
            // Clean up references
            delete originalSessionData.transferSession;
            if (originalSession && originalSession.data) {
                delete originalSession.data.transferSession;
            }
            
            // Resume the original call if it was on hold
            if (originalSessionData.onHold) {
                await this.unholdSession(originalSessionId);
            }
            
            this.emit('attendedTransferCancelled', {
                originalSessionId: originalSessionId
            });
            
            console.log('✅ Attended transfer cancelled successfully');
            
        } catch (error) {
            console.error('❌ Failed to cancel attended transfer:', error);
            this.emit('sessionError', { sessionId: originalSessionId, error });
            throw error;
        }
    }
    
    async terminateAttendedTransferSession(originalSessionId) {
        console.log('🔚 Terminating attended transfer session for:', originalSessionId);
        
        const originalSessionData = this.sessions.get(originalSessionId);
        if (!originalSessionData || !originalSessionData.transferSession) {
            throw new Error('Transfer session not found to terminate');
        }
        
        try {
            await originalSessionData.transferSession.bye();
            
            // Update transfer record
            const originalSession = originalSessionData.session;
            if (originalSession && originalSession.data && originalSession.data.transfer) {
                const transferId = originalSession.data.transfer.length - 1;
                if (transferId >= 0) {
                    originalSession.data.transfer[transferId].accept.complete = false;
                    originalSession.data.transfer[transferId].accept.disposition = "terminated";
                    originalSession.data.transfer[transferId].accept.eventTime = new Date().toISOString();
                }
            }
            
            // Clean up references
            delete originalSessionData.transferSession;
            if (originalSession && originalSession.data) {
                delete originalSession.data.transferSession;
            }
            
            this.emit('attendedTransferSessionTerminated', {
                originalSessionId: originalSessionId
            });
            
        } catch (error) {
            console.error('Failed to terminate attended transfer session:', error);
            throw error;
        }
    }

    // Convenience methods for current session
    async toggleMute(sessionId = null) {
        const session = sessionId ? this.sessions.get(sessionId) : this.getCurrentSession();
        if (!session) {
            throw new Error('No session available for mute toggle');
        }
        
        if (session.muted) {
            return await this.unmuteSession(session.id);
        } else {
            return await this.muteSession(session.id);
        }
    }

    async toggleHold(sessionId = null) {
        const session = sessionId ? this.sessions.get(sessionId) : this.getCurrentSession();
        if (!session) {
            throw new Error('No session available for hold toggle');
        }
        
        if (session.onHold) {
            return await this.unholdSession(session.id);
        } else {
            return await this.holdSession(session.id);
        }
    }

    // Cleanup
    destroy() {
        this.terminateAllSessions();
        this.unsubscribeAll();
        
        if (this.userAgent) {
            this.userAgent.stop();
        }
        
        this.listeners.clear();
        this.sessions.clear();
        this.subscriptions.clear();
        this.blfSubscriptions.clear();
        this.activeLines.clear();
    }
}

// Export for use in other files
window.SipSessionManager = SipSessionManager;

// Global debug functions for console access
window.debugDTMF = function() {
    if (window.App && window.App.managers && window.App.managers.sip) {
        const currentSession = window.App.managers.sip.getCurrentSession();
        if (currentSession) {
            window.App.managers.sip.debugSessionDtmf(currentSession.id);
        } else {
            //console.log('❌ No current session available');
            const allSessions = window.App.managers.sip.getAllSessions();
            //console.log('📋 Available sessions:', allSessions.map(s => ({ id: s.id, state: s.state })));
        }
    } else {
        //console.log('❌ SIP manager not available');
    }
};

/* window.testDTMF = function(tone = '1') {
    if (window.App && window.App.managers && window.App.managers.sip) {
        const currentSession = window.App.managers.sip.getCurrentSession();
        if (currentSession) {
            //console.log('🎵 Testing DTMF tone:', tone);
            window.App.managers.sip.sendDTMF(currentSession.id, tone)
                .then(() => console.log('✅ DTMF test successful'))
                .catch(error => console.error('❌ DTMF test failed:', error));
        } else {
            console.log('❌ No active session for DTMF test');
        }
    } else {
        console.log('❌ SIP manager not available');
    }
}; */
