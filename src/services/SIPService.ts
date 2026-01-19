/**
 * SIPService - Core SIP/WebRTC functionality for React app
 * Ported from sip-session-manager.js
 */

import * as SIP from 'sip.js';
import type {
  SIPConfig,
  SessionData,
  SessionState,
  RegistrationState,
  TransportState,
  LineNumber,
  BLFSubscription,
  BLFPresenceState,
  CallStats,
  SIPEventType,
  SIPEventCallback,
  SIPEventMap,
  SessionCreateOptions,
} from '../types/sip';
import { isValidDTMFTone, mapDialogStateToBLF } from '../types/sip';
import { isVerboseLoggingEnabled } from '../utils';
import { lookupContactByNumber } from '../utils/contactLookup';
import type { Contact } from '../types/contact';

// ==================== Type Guards ====================

const SessionStateEnum = SIP.SessionState;

function isSessionEstablished(state: unknown): boolean {
  const verboseLogging = isVerboseLoggingEnabled();
  
  // Check against SIP.js enum directly (enum value, not string)
  if (state === SessionStateEnum.Established) {
    return true;
  }
  
  // Also check string representations for compatibility
  const validStateStrings = [
    'Established',
    'established',  // React app uses lowercase
    'active',
    'confirmed'
  ];
  
  const isValid = typeof state === 'string' && validStateStrings.includes(state);
  
  if (verboseLogging && !isValid) {
    console.log('[SIPService] isSessionEstablished check:', {
      state,
      stateType: typeof state,
      expectedEnum: SessionStateEnum.Established,
      isEnumMatch: state === SessionStateEnum.Established,
      isStringMatch: typeof state === 'string' && validStateStrings.includes(state)
    });
  }
  
  return isValid;
}

/**
 * Map SIP.js SessionState enum to custom SessionState type
 * @param sipState - SIP.js SessionState enum value
 * @returns Custom SessionState string
 */
function mapSIPSessionState(sipState: SIP.SessionState): SessionState {
  const verboseLogging = isVerboseLoggingEnabled();
  
  switch (sipState) {
    case SIP.SessionState.Initial:
      return 'initiating';
    case SIP.SessionState.Establishing:
      return 'connecting';
    case SIP.SessionState.Established:
      return 'established';
    case SIP.SessionState.Terminating:
      return 'terminated';
    case SIP.SessionState.Terminated:
      return 'terminated';
    default:
      if (verboseLogging) {
        console.warn('[SIPService] Unknown SIP.js SessionState:', sipState);
      }
      return 'failed';
  }
}

// ==================== SIP Service Class ====================

export class SIPService {
  // SIP.js objects
  private userAgent: SIP.UserAgent | null = null;
  private registerer: SIP.Registerer | null = null;
  
  // Session management
  private sessions: Map<string, SessionData & { session: SIP.Session }> = new Map();
  private activeLines: Map<LineNumber, string> = new Map();
  private selectedLine: LineNumber | null = null;
  
  // BLF subscriptions
  private blfSubscriptions: Map<string, BLFSubscription & { subscription: SIP.Subscriber }> = new Map();
  
  // State
  private config: SIPConfig | null = null;
  private registrationState: RegistrationState = 'unregistered';
  private transportState: TransportState = 'disconnected';
  
  // Contacts for caller ID lookup
  private contacts: Contact[] = [];
  
  // Counters
  private sessionCounter = 0;
  
  // Statistics
  private stats: CallStats = {
    totalCalls: 0,
    incomingCalls: 0,
    outgoingCalls: 0,
    missedCalls: 0,
    totalDuration: 0
  };
  
  // Reconnection tracking
  private wasReconnecting = false;
  
  // Event system
  private listeners: Map<SIPEventType, Set<SIPEventCallback>> = new Map();
  
  // Duration tracking intervals
  private durationIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();

  // ==================== Constructor ====================
  
  constructor() {
    // Bind methods for callbacks
    this.handleTransportConnect = this.handleTransportConnect.bind(this);
    this.handleTransportDisconnect = this.handleTransportDisconnect.bind(this);
    this.handleIncomingInvitation = this.handleIncomingInvitation.bind(this);
  }

  // ==================== Event System ====================

  on<E extends SIPEventType>(event: E, callback: SIPEventCallback<SIPEventMap[E]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as SIPEventCallback);
    return () => this.off(event, callback);
  }

  off<E extends SIPEventType>(event: E, callback: SIPEventCallback<SIPEventMap[E]>): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(callback as SIPEventCallback);
    }
  }

  private emit<E extends SIPEventType>(event: E, data?: SIPEventMap[E]): void {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log(`[SIPService] 📢 emit('${event}'):`, {
        hasListeners: this.listeners.has(event),
        listenerCount: this.listeners.get(event)?.size || 0,
        dataPreview: data ? (typeof data === 'object' ? Object.keys(data) : data) : 'none'
      });
    }
    
    if (this.listeners.has(event)) {
      const listeners = this.listeners.get(event)!;
      
      if (verboseLogging) {
        console.log(`[SIPService] 🔄 Executing ${listeners.size} listener(s) for '${event}'`);
      }
      
      let index = 0;
      listeners.forEach((callback) => {
        try {
          callback(data);
          if (verboseLogging) {
            console.log(`[SIPService] ✅ Listener ${index + 1}/${listeners.size} executed successfully for '${event}'`);
          }
          index++;
        } catch (error) {
          console.error(`[SIPService] ❌ Error in listener for ${event}:`, error);
          index++;
        }
      });
    } else if (verboseLogging) {
      console.warn(`[SIPService] ⚠️ No listeners registered for event '${event}'`);
    }
  }

  // ==================== Configuration ====================

  configure(config: Partial<SIPConfig>): void {
    this.config = { ...this.config, ...config } as SIPConfig;
    
    // Auto-generate display name if not set
    if (this.config.username && !config.displayName) {
      this.config.displayName = `${this.config.username}-365Connect`;
    }
    
    this.emit('configChanged', this.config);
  }

  getConfig(): SIPConfig | null {
    return this.config ? { ...this.config } : null;
  }

  /**
   * Set contacts list for caller ID lookup
   * Should be called when contacts are loaded or updated
   */
  setContacts(contacts: Contact[]): void {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log('[SIPService] 📇 Contacts list updated:', {
        previousCount: this.contacts.length,
        newCount: contacts.length
      });
    }
    
    this.contacts = contacts;
  }

  // ==================== UserAgent Management ====================

  async createUserAgent(config: Partial<SIPConfig> = {}): Promise<void> {
    try {
      const verboseLogging = isVerboseLoggingEnabled();
      
      // Update configuration
      this.configure(config);
      
      if (!this.config?.server || !this.config?.username || !this.config?.password) {
        throw new Error('Missing required SIP configuration: server, username, and password are required.');
      }

      // Check SIP message logging setting from localStorage
      const sipMessagesEnabled = localStorage.getItem('settings-store');
      let enableSipLogging = false;
      if (sipMessagesEnabled) {
        try {
          const parsed = JSON.parse(sipMessagesEnabled);
          enableSipLogging = parsed?.state?.settings?.advanced?.sipMessagesEnabled === true;
        } catch (e) {
          // Ignore parse errors
        }
      }
      
      if (verboseLogging) {
        console.log('[SIPService] 🔧 createUserAgent - SIP message logging:', enableSipLogging);
      }

      // Handle different server URL formats
      let serverUrl: string;
      if (this.config.server.startsWith('wss://') || this.config.server.startsWith('ws://')) {
        serverUrl = this.config.server;
      } else {
        serverUrl = `wss://${this.config.server}:8089/ws`;
      }

      // Set domain if not provided
      const sipDomain = this.config.domain || this.config.server.replace(/^wss?:\/\//, '').split(':')[0];

      // Create SIP UserAgent options
      const uri = SIP.UserAgent.makeURI(`sip:${this.config.username}@${sipDomain}`);
      if (!uri) {
        throw new Error('Failed to create SIP URI');
      }

      const options: SIP.UserAgentOptions = {
        logConfiguration: false,
        logBuiltinEnabled: enableSipLogging,
        logLevel: enableSipLogging ? 'debug' : 'error',
        uri,
        transportOptions: {
          server: serverUrl,
          traceSip: this.config.traceSip ?? false,
          connectionTimeout: this.config.connectionTimeout ?? 20
        },
        sessionDescriptionHandlerFactoryOptions: {
          peerConnectionConfiguration: {
            bundlePolicy: this.config.bundlePolicy ?? 'balanced',
            iceTransportPolicy: 'all',
            rtcpMuxPolicy: 'require',
            iceServers: this.config.iceServers ?? [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' }
            ]
          },
          iceGatheringTimeout: this.config.iceGatheringTimeout ?? 500
        },
        contactName: this.config.contactName ?? this.config.username,
        displayName: this.config.displayName ?? `${this.config.username}-365Connect`,
        authorizationUsername: this.config.username,
        authorizationPassword: this.config.password,
        userAgentString: this.config.userAgentString ?? 'Autocab365Connect React v1.0.0',
        delegate: {
          onConnect: this.handleTransportConnect,
          onDisconnect: this.handleTransportDisconnect,
          onInvite: this.handleIncomingInvitation,
          onMessage: this.handleIncomingMessage.bind(this),
          onNotify: this.handleIncomingNotify.bind(this)
        }
      };

      // Create UserAgent
      this.userAgent = new SIP.UserAgent(options);
      
      // Create registerer
      await this.createRegisterer();
      
      // Start the transport connection
      await this.userAgent.start();
      
      this.emit('userAgentCreated', this.userAgent);

    } catch (error) {
      console.error('Failed to create UserAgent:', error);
      this.emit('userAgentError', error as Error);
      throw error;
    }
  }

  private async createRegisterer(): Promise<void> {
    if (!this.userAgent) {
      throw new Error('UserAgent must be created first');
    }

    const registererOptions: SIP.RegistererOptions = {
      logConfiguration: false,
      expires: this.config?.registerExpires ?? 300,
      extraHeaders: [],
      extraContactHeaderParams: []
    };

    // Add extra headers from configuration
    if (this.config?.registerExtraHeaders) {
      for (const [key, value] of Object.entries(this.config.registerExtraHeaders)) {
        if (value !== '') {
          registererOptions.extraHeaders!.push(`${key}: ${value}`);
        }
      }
    }

    this.registerer = new SIP.Registerer(this.userAgent, registererOptions);

    // Set up registerer state change listener
    this.registerer.stateChange.addListener((newState: SIP.RegistererState) => {
      switch (newState) {
        case SIP.RegistererState.Initial:
          this.registrationState = 'unregistered';
          break;
        case SIP.RegistererState.Registered:
          this.registrationState = 'registered';
          this.handleRegistrationSuccess();
          break;
        case SIP.RegistererState.Unregistered:
          this.registrationState = 'unregistered';
          this.handleUnregistration();
          break;
        case SIP.RegistererState.Terminated:
          this.registrationState = 'failed';
          break;
      }
      
      this.emit('registrationStateChanged', this.registrationState);
    });
  }

  // ==================== Registration Management ====================

  async register(): Promise<void> {
    if (!this.userAgent || !this.registerer) {
      throw new Error('UserAgent not created');
    }

    if (this.registrationState === 'registering') {
      console.log('Registration already in progress');
      return;
    }

    if (this.registrationState === 'registered') {
      console.log('Already registered');
      return;
    }

    try {
      this.registrationState = 'registering';
      this.emit('registrationStateChanged', 'registering');
      
      await this.registerer.register();

    } catch (error) {
      this.registrationState = 'failed';
      this.emit('registrationStateChanged', 'failed');
      this.emit('registrationFailed', { error: error as Error });
      console.error('SIP registration failed:', error);
      throw error;
    }
  }

  async unregister(): Promise<void> {
    if (!this.userAgent || !this.registerer) {
      console.log('Not registered, nothing to unregister');
      return;
    }

    try {
      // Unsubscribe from all BLF subscriptions
      await this.unsubscribeAllBLF();
      
      // Terminate all active sessions
      await this.terminateAllSessions();
      
      await this.registerer.unregister();
      
      this.registrationState = 'unregistered';
      this.emit('registrationStateChanged', 'unregistered');
      this.emit('unregistered', undefined);

    } catch (error) {
      console.error('SIP unregistration error:', error);
    }
  }

  private handleRegistrationSuccess(): void {
    console.log('Registration successful');
    this.emit('registered', this.userAgent);
    
    // Auto-subscribe to BLF if enabled
    if (this.config?.enableBLF) {
      setTimeout(() => {
        // BLF subscriptions would be triggered by the application
      }, 500);
    }
  }

  private handleUnregistration(): void {
    this.emit('unregistered', undefined);
  }

  // ==================== Session Management ====================

  async makeCall(target: string, options: SessionCreateOptions = {}): Promise<SessionData> {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log('[SIPService] 📞 makeCall called:', {
        target,
        options,
        isRegistered: this.registrationState === 'registered',
        userAgentExists: !!this.userAgent
      });
    }
    
    if (!this.userAgent || this.registrationState !== 'registered') {
      console.error('[SIPService] ❌ Cannot make call - not registered');
      throw new Error('Not registered');
    }

    // Validate target
    if (!target) {
      console.error('[SIPService] ❌ Cannot make call - no target specified');
      throw new Error('No target specified');
    }

    const sessionId = this.generateSessionId();
    const lineNumber = this.getAvailableLine();
    
    if (verboseLogging) {
      console.log('[SIPService] Generated session:', {
        sessionId,
        lineNumber,
        activeSessions: this.sessions.size
      });
    }
    
    if (lineNumber === null) {
      console.error('[SIPService] ❌ All lines busy');
      throw new Error('All lines busy. Please end or hold a call before making a new one.');
    }

    // Create target URI
    const domain = this.config?.domain || this.config?.server?.replace(/^wss?:\/\//, '').split(':')[0];
    const targetURI = SIP.UserAgent.makeURI(`sip:${target}@${domain}`);
    
    if (verboseLogging) {
      console.log('[SIPService] Target URI:', {
        domain,
        targetURI: targetURI?.toString()
      });
    }
    
    if (!targetURI) {
      console.error('[SIPService] ❌ Invalid target number');
      throw new Error('Invalid target number');
    }

    // Create inviter
    const inviter = new SIP.Inviter(this.userAgent, targetURI, {
      sessionDescriptionHandlerOptions: {
        constraints: {
          audio: true,
          video: options.video ?? false
        }
      },
      extraHeaders: options.extraHeaders ?? []
    });

    // Create session data
    const sessionData: SessionData & { session: SIP.Session } = {
      id: sessionId,
      lineNumber,
      session: inviter,
      direction: 'outgoing',
      target,
      remoteNumber: target,
      remoteIdentity: target,
      displayName: target,
      state: 'initiating',
      startTime: new Date(),
      answerTime: null,
      duration: 0,
      onHold: false,
      muted: false,
      recording: this.config?.recordCalls ?? false
    };

    // Set up session event handlers
    this.setupSessionHandlers(sessionData);

    // Store session
    this.sessions.set(sessionId, sessionData);
    this.activeLines.set(lineNumber, sessionId);
    this.selectedLine = lineNumber;
    
    if (verboseLogging) {
      console.log('[SIPService] ✅ Session stored:', {
        sessionId,
        lineNumber,
        state: sessionData.state,
        target: sessionData.target,
        totalSessions: this.sessions.size
      });
    }

    // Start the session
    if (verboseLogging) {
      console.log('[SIPService] 🔄 Sending INVITE...');
    }
    
    await inviter.invite();
    
    if (verboseLogging) {
      console.log('[SIPService] ✅ INVITE sent successfully');
    }

    // Update statistics
    this.stats.totalCalls++;
    this.stats.outgoingCalls++;

    // Emit without session object
    const { session: _session, ...publicSessionData } = sessionData;
    
    if (verboseLogging) {
      console.log('[SIPService] 📢 Emitting sessionCreated event:', {
        sessionId: publicSessionData.id,
        lineNumber: publicSessionData.lineNumber,
        state: publicSessionData.state,
        direction: publicSessionData.direction,
        target: publicSessionData.target
      });
    }
    
    this.emit('sessionCreated', publicSessionData);
    this.emit('sessionStateChanged', { sessionId, state: 'initiating' });
    
    if (verboseLogging) {
      console.log('[SIPService] ✅ makeCall completed, returning session data');
    }

    return publicSessionData;
  }

  private handleIncomingInvitation(invitation: SIP.Invitation): void {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log('[SIPService] 📞 handleIncomingInvitation called:', {
        from: invitation.remoteIdentity?.uri?.user,
        displayName: invitation.remoteIdentity?.displayName
      });
    }
    
    try {
      const sessionId = this.generateSessionId();
      const lineNumber = this.getAvailableLine();
      
      if (verboseLogging) {
        console.log('[SIPService] Session details:', {
          sessionId,
          lineNumber,
          totalSessions: this.sessions.size
        });
      }
      
      if (lineNumber === null) {
        // All lines busy - reject with 486 Busy Here
        console.warn('[SIPService] ❌ All lines busy - rejecting incoming call');
        invitation.reject({ statusCode: 486 });
        return;
      }

      // Extract caller information
      const remoteNumber = invitation.remoteIdentity.uri.user || '';
      const sipCallerIdName = invitation.remoteIdentity.displayName || '';
      
      if (verboseLogging) {
        console.log('[SIPService] 📞 Extracting caller info from SIP:', {
          remoteNumber,
          sipCallerIdName
        });
      }
      
      // Look up contact by phone number
      const contactLookup = lookupContactByNumber(remoteNumber, this.contacts, sipCallerIdName);
      
      if (verboseLogging) {
        console.log('[SIPService] 🔍 Contact lookup result:', {
          found: contactLookup.found,
          isContactMatch: contactLookup.isContactMatch,
          displayName: contactLookup.displayName,
          contactId: contactLookup.contact?.id
        });
      }
      
      // Use contact name if found, otherwise use SIP caller ID or number
      const displayName = contactLookup.displayName;
      const remoteIdentity = contactLookup.displayName;
      
      if (verboseLogging) {
        console.log('[SIPService] 📇 Final caller identification:', {
          remoteNumber,
          displayName,
          remoteIdentity,
          source: contactLookup.isContactMatch ? 'CONTACT' : (sipCallerIdName ? 'SIP_CALLER_ID' : 'PHONE_NUMBER')
        });
      }

      // Create session data
      const sessionData: SessionData & { session: SIP.Session } = {
        id: sessionId,
        lineNumber,
        session: invitation,
        direction: 'incoming',
        target: remoteNumber,
        remoteNumber,
        remoteIdentity,
        displayName: remoteIdentity,
        callerID: remoteIdentity,
        state: 'ringing',
        startTime: new Date(),
        answerTime: null,
        duration: 0,
        onHold: false,
        muted: false,
        recording: this.config?.recordCalls ?? false
      };

      // Set up session event handlers
      this.setupSessionHandlers(sessionData);

      // Store session
      this.sessions.set(sessionId, sessionData);
      this.activeLines.set(lineNumber, sessionId);
      
      if (verboseLogging) {
        console.log('[SIPService] ✅ Session stored:', {
          sessionId,
          lineNumber,
          state: sessionData.state,
          target: sessionData.target,
          totalSessions: this.sessions.size,
          activeLines: Array.from(this.activeLines.entries())
        });
      }

      // Auto-answer if configured and no other active calls
      const activeSessions = this.getActiveSessions();
      const hasOtherActiveCalls = activeSessions.some(s => s.id !== sessionId);
      
      if (this.config?.autoAnswer && !hasOtherActiveCalls) {
        if (verboseLogging) {
          console.log('[SIPService] 🤖 Auto-answer enabled, answering in 1.5s');
        }
        setTimeout(() => {
          this.answerCall(sessionId);
        }, 1500);
      }

      // Update statistics
      this.stats.totalCalls++;
      this.stats.incomingCalls++;

      // Emit without session object
      const { session: _session, ...publicSessionData } = sessionData;
      
      if (verboseLogging) {
        console.log('[SIPService] 📢 Emitting sessionCreated and incomingCall events:', {
          sessionId: publicSessionData.id,
          lineNumber: publicSessionData.lineNumber,
          state: publicSessionData.state,
          direction: publicSessionData.direction
        });
      }
      
      this.emit('sessionCreated', publicSessionData);
      this.emit('incomingCall', publicSessionData);
      
      if (verboseLogging) {
        console.log('[SIPService] ✅ Events emitted successfully');
      }

    } catch (error) {
      console.error('[SIPService] ❌ Error handling incoming invitation:', error);
    }
  }

  private setupSessionHandlers(sessionData: SessionData & { session: SIP.Session }): void {
    const { session, id: sessionId } = sessionData;

    // Session state changes
    session.stateChange.addListener((state: SIP.SessionState) => {
      // Map SIP.js SessionState enum to our custom SessionState type
      sessionData.state = mapSIPSessionState(state);
      this.emit('sessionStateChanged', { sessionId, state: sessionData.state });

      switch (state) {
        case SIP.SessionState.Established: {
          sessionData.answerTime = new Date();
          sessionData.state = 'established';
          this.setupAudioRouting(session);
          
          const { session: _s, ...answeredData } = sessionData;
          this.emit('sessionAnswered', answeredData);
          
          // Start duration tracking
          this.startDurationTracking(sessionId);
          break;
        }
          
        case SIP.SessionState.Terminated:
          this.handleSessionTerminated(sessionData);
          break;
      }
    });
  }

  private startDurationTracking(sessionId: string): void {
    const interval = setInterval(() => {
      const sessionData = this.sessions.get(sessionId);
      if (sessionData && sessionData.answerTime && isSessionEstablished(sessionData.session.state)) {
        sessionData.duration = Math.floor((Date.now() - sessionData.answerTime.getTime()) / 1000);
        this.emit('sessionDurationChanged', { sessionId, duration: sessionData.duration });
      }
    }, 1000);
    
    this.durationIntervals.set(sessionId, interval);
  }

  private stopDurationTracking(sessionId: string): void {
    const interval = this.durationIntervals.get(sessionId);
    if (interval) {
      clearInterval(interval);
      this.durationIntervals.delete(sessionId);
    }
  }

  private setupAudioRouting(session: SIP.Session): void {
    try {
      const sdh = session.sessionDescriptionHandler;
      if (!sdh) {
        console.warn('No session description handler found for audio routing');
        return;
      }

      // Get remote media stream and route to audio element
      const remoteStream = (sdh as unknown as { remoteMediaStream?: MediaStream }).remoteMediaStream;
      if (remoteStream) {
        let audioElement = document.getElementById('sipAudio') as HTMLAudioElement;
        if (!audioElement) {
          audioElement = document.createElement('audio');
          audioElement.id = 'sipAudio';
          audioElement.autoplay = true;
          audioElement.style.display = 'none';
          document.body.appendChild(audioElement);
        }
        
        audioElement.srcObject = remoteStream;
      }
    } catch (error) {
      console.error('Error setting up audio routing:', error);
    }
  }

  async answerCall(sessionId?: string): Promise<SessionData> {
    const session = sessionId 
      ? this.sessions.get(sessionId) 
      : this.getIncomingSession();
    
    if (!session || session.direction !== 'incoming') {
      throw new Error('No incoming session to answer');
    }

    const invitation = session.session as SIP.Invitation;
    
    await invitation.accept({
      sessionDescriptionHandlerOptions: {
        constraints: {
          audio: true,
          video: false
        }
      }
    });

    this.selectedLine = session.lineNumber;
    
    const { session: _session, ...publicData } = session;
    this.emit('sessionAnswered', publicData);
    
    return publicData;
  }

  async hangupCall(sessionId?: string): Promise<void> {
    let session: (SessionData & { session: SIP.Session }) | undefined;
    
    if (sessionId) {
      session = this.sessions.get(sessionId);
    } else {
      session = this.getCurrentSession() || this.getFirstActiveSession();
    }

    if (!session) {
      console.log('No session to hang up');
      return;
    }

    await this.terminateSession(session.id);
  }

  async terminateSession(sessionId: string, reason = 'User requested'): Promise<void> {
    const verboseLogging = isVerboseLoggingEnabled();
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) {
      throw new Error('Session not found');
    }

    try {
      const { session } = sessionData;
      
      if (verboseLogging) {
        console.log('[SIPService] 📴 terminateSession called:', {
          sessionId,
          state: session.state,
          direction: sessionData.direction,
          reason
        });
      }
      
      // Stop duration tracking immediately
      this.stopDurationTracking(sessionId);
      
      switch (session.state) {
        case SIP.SessionState.Initial:
        case SIP.SessionState.Establishing:
          if (sessionData.direction === 'outgoing') {
            await (session as SIP.Inviter).cancel();
          } else {
            await (session as SIP.Invitation).reject();
          }
          break;
        case SIP.SessionState.Established:
          await session.bye();
          break;
        case SIP.SessionState.Terminated:
          // Already terminated, just dispose
          if (verboseLogging) {
            console.log('[SIPService] ⚠️ Session already terminated, disposing');
          }
          break;
      }

      // Dispose the session to clean up resources (per SIP.js best practices)
      await session.dispose();
      
      if (verboseLogging) {
        console.log('[SIPService] ✅ Session disposed:', sessionId);
      }

      // NOTE: Don't call handleSessionTerminated here - the session.stateChange listener
      // in setupSessionHandlers will automatically call it when state becomes Terminated.
      // Calling it twice causes duplicate call history entries.

    } catch (error) {
      console.error('Failed to terminate session:', error);
      throw error;
    }
  }

  private handleSessionTerminated(
    sessionData: SessionData & { session: SIP.Session }, 
    reason = 'Normal termination'
  ): void {
    const { id: sessionId, lineNumber } = sessionData;

    // Calculate final duration
    if (sessionData.answerTime) {
      sessionData.duration = Math.floor((Date.now() - sessionData.answerTime.getTime()) / 1000);
      this.stats.totalDuration += sessionData.duration;
    } else if (sessionData.direction === 'incoming') {
      this.stats.missedCalls++;
    }

    // Stop duration tracking
    this.stopDurationTracking(sessionId);

    // Clean up audio elements
    this.cleanupAudioElements();

    // Remove from active sessions
    this.sessions.delete(sessionId);
    this.activeLines.delete(lineNumber);

    // Clear selection if this was the selected line
    if (this.selectedLine === lineNumber) {
      this.selectedLine = null;
    }

    const { session: _session, ...publicData } = sessionData;
    this.emit('sessionTerminated', { ...publicData, reason });
    this.emit('lineReleased', { lineNumber, sessionId });
  }

  private cleanupAudioElements(): void {
    const audioElement = document.getElementById('sipAudio') as HTMLAudioElement;
    if (audioElement) {
      audioElement.srcObject = null;
      audioElement.pause();
    }
  }

  async terminateAllSessions(): Promise<void> {
    const sessionIds = Array.from(this.sessions.keys());
    await Promise.allSettled(
      sessionIds.map(id => this.terminateSession(id, 'System shutdown'))
    );
  }

  // ==================== Call Control ====================

  async holdCall(sessionId?: string): Promise<void> {
    const verboseLogging = isVerboseLoggingEnabled();
    
    const session = sessionId 
      ? this.sessions.get(sessionId) 
      : this.getCurrentSession();
    
    if (verboseLogging) {
      console.log('[SIPService] ⏸️ holdCall called:', {
        sessionId,
        foundSession: !!session,
        currentHoldState: session?.onHold,
        sessionState: session?.state,
        sipSessionState: session?.session.state,
        direction: session?.direction
      });
    }
    
    if (!session) {
      console.error('[SIPService] ❌ No session to hold');
      throw new Error('No session to hold');
    }

    if (session.onHold) {
      if (verboseLogging) {
        console.log('[SIPService] ⚠️ Session already on hold');
      }
      return;
    }

    const isEstablished = isSessionEstablished(session.session.state);
    
    if (verboseLogging) {
      console.log('[SIPService] 🔍 Session state check:', {
        sipSessionState: session.session.state,
        isEstablished,
        canProceedWithHold: isEstablished
      });
    }

    if (!isEstablished) {
      console.error('[SIPService] ❌ Cannot hold: session not established, state:', session.session.state);
      throw new Error('Cannot hold: session not established');
    }

    try {
      if (verboseLogging) {
        console.log('[SIPService] 🔄 Sending re-INVITE with hold=true');
        console.log('[SIPService] 📋 Session details:', {
          sessionId: session.id,
          sessionType: session.session.constructor.name,
          direction: session.direction,
          hasSessionDescriptionHandler: !!session.session.sessionDescriptionHandler
        });
      }
      
      // Send re-INVITE with hold option
      // SIP.js SessionDescriptionHandler will automatically:
      // 1. Set media direction to 'sendonly' (we send, remote doesn't)
      // 2. Update SDP with proper hold attributes
      // 3. Handle media stream state changes
      const options = {
        sessionDescriptionHandlerOptions: {
          hold: true,
          iceGatheringTimeout: this.config?.iceGatheringTimeout ?? 500
        } as any  // Type assertion needed - hold is valid in SIP.js 0.21.2 but not in base interface
      };
      
      if (verboseLogging) {
        console.log('[SIPService] 📤 Sending re-INVITE with hold options:', {
          hold: true,
          note: 'SIP.js will automatically set media direction to sendonly/inactive'
        });
      }
      
      await session.session.invite(options);
      
      session.onHold = true;
      session.state = 'hold';
      
      if (verboseLogging) {
        console.log('[SIPService] ✅ Session put on hold, emitting event');
      }
      
      this.emit('sessionModified', { sessionId: session.id, action: 'hold' });
    } catch (error) {
      console.error('[SIPService] ❌ Failed to hold session:', error);
      throw error;
    }
  }

  async unholdCall(sessionId?: string): Promise<void> {
    const verboseLogging = isVerboseLoggingEnabled();
    
    const session = sessionId 
      ? this.sessions.get(sessionId) 
      : this.getCurrentSession();
    
    if (verboseLogging) {
      console.log('[SIPService] ▶️ unholdCall called:', {
        sessionId,
        foundSession: !!session,
        currentHoldState: session?.onHold,
        sessionState: session?.state,
        sipSessionState: session?.session.state,
        direction: session?.direction
      });
    }
    
    if (!session) {
      console.error('[SIPService] ❌ No session to unhold');
      throw new Error('No session to unhold');
    }

    if (!session.onHold) {
      if (verboseLogging) {
        console.log('[SIPService] ⚠️ Session not on hold');
      }
      return;
    }

    const isEstablished = isSessionEstablished(session.session.state);
    
    if (verboseLogging) {
      console.log('[SIPService] 🔍 Session state check:', {
        sipSessionState: session.session.state,
        isEstablished,
        canProceedWithUnhold: isEstablished
      });
    }

    if (!isEstablished) {
      console.error('[SIPService] ❌ Cannot unhold: session not established, state:', session.session.state);
      throw new Error('Cannot unhold: session not established');
    }

    try {
      if (verboseLogging) {
        console.log('[SIPService] 🔄 Sending re-INVITE with hold=false');
        console.log('[SIPService] 📋 Session details:', {
          sessionId: session.id,
          sessionType: session.session.constructor.name,
          direction: session.direction,
          hasSessionDescriptionHandler: !!session.session.sessionDescriptionHandler
        });
      }
      
      // Send re-INVITE with hold=false option
      // SIP.js SessionDescriptionHandler will automatically:
      // 1. Set media direction to 'sendrecv' (bidirectional audio)
      // 2. Update SDP with proper active attributes
      // 3. Handle media stream state changes
      const options = {
        sessionDescriptionHandlerOptions: {
          hold: false,
          iceGatheringTimeout: this.config?.iceGatheringTimeout ?? 500
        } as any  // Type assertion needed - hold is valid in SIP.js 0.21.2 but not in base interface
      };
      
      if (verboseLogging) {
        console.log('[SIPService] 📤 Sending re-INVITE with unhold options:', {
          hold: false,
          note: 'SIP.js will automatically set media direction to sendrecv'
        });
      }
      
      await session.session.invite(options);
      
      session.onHold = false;
      session.state = 'established';
      
      if (verboseLogging) {
        console.log('[SIPService] ✅ Session resumed, emitting event');
      }
      
      this.emit('sessionModified', { sessionId: session.id, action: 'unhold' });
    } catch (error) {
      console.error('[SIPService] ❌ Failed to unhold session:', error);
      throw error;
    }
  }

  async toggleHold(sessionId?: string): Promise<void> {
    const session = sessionId 
      ? this.sessions.get(sessionId) 
      : this.getCurrentSession();
    
    if (!session) {
      throw new Error('No session to toggle hold');
    }

    if (session.onHold) {
      await this.unholdCall(session.id);
    } else {
      await this.holdCall(session.id);
    }
  }

  async muteCall(sessionId?: string): Promise<void> {
    const verboseLogging = isVerboseLoggingEnabled();
    
    const session = sessionId 
      ? this.sessions.get(sessionId) 
      : this.getCurrentSession();
    
    if (verboseLogging) {
      console.log('[SIPService] 🔇 muteCall called:', {
        sessionId,
        foundSession: !!session,
        currentMuteState: session?.muted
      });
    }
    
    if (!session) {
      console.error('[SIPService] ❌ No session to mute');
      throw new Error('No session to mute');
    }

    if (session.muted) {
      if (verboseLogging) {
        console.log('[SIPService] ⚠️ Session already muted');
      }
      return;
    }

    try {
      const sdh = session.session.sessionDescriptionHandler;
      const localStream = (sdh as unknown as { localMediaStream?: MediaStream })?.localMediaStream;
      
      if (verboseLogging) {
        console.log('[SIPService] Media stream info:', {
          hasSDH: !!sdh,
          hasLocalStream: !!localStream,
          audioTracksCount: localStream?.getAudioTracks().length,
          audioTracks: localStream?.getAudioTracks().map(t => ({
            id: t.id,
            label: t.label,
            enabled: t.enabled,
            muted: t.muted,
            readyState: t.readyState
          }))
        });
      }
      
      if (localStream) {
        const audioTracks = localStream.getAudioTracks();
        
        if (audioTracks.length === 0) {
          console.error('[SIPService] ❌ No audio tracks found in local stream');
          throw new Error('No audio tracks found');
        }
        
        audioTracks.forEach(track => {
          if (verboseLogging) {
            console.log('[SIPService] 🔇 Disabling audio track:', track.id, 'current enabled:', track.enabled);
          }
          track.enabled = false;
          if (verboseLogging) {
            console.log('[SIPService] ✅ Audio track disabled:', track.id, 'new enabled:', track.enabled);
          }
        });
        
        session.muted = true;
        
        if (verboseLogging) {
          console.log('[SIPService] ✅ Session muted, emitting event');
        }
        
        this.emit('sessionMuted', { sessionId: session.id, muted: true });
      } else {
        console.error('[SIPService] ❌ No local stream found for muting');
        throw new Error('No local stream available');
      }
    } catch (error) {
      console.error('[SIPService] ❌ Failed to mute session:', error);
      throw error;
    }
  }

  async unmuteCall(sessionId?: string): Promise<void> {
    const verboseLogging = isVerboseLoggingEnabled();
    
    const session = sessionId 
      ? this.sessions.get(sessionId) 
      : this.getCurrentSession();
    
    if (verboseLogging) {
      console.log('[SIPService] 🔊 unmuteCall called:', {
        sessionId,
        foundSession: !!session,
        currentMuteState: session?.muted
      });
    }
    
    if (!session) {
      console.error('[SIPService] ❌ No session to unmute');
      throw new Error('No session to unmute');
    }

    if (!session.muted) {
      if (verboseLogging) {
        console.log('[SIPService] ⚠️ Session not muted');
      }
      return;
    }

    try {
      const sdh = session.session.sessionDescriptionHandler;
      const localStream = (sdh as unknown as { localMediaStream?: MediaStream })?.localMediaStream;
      
      if (verboseLogging) {
        console.log('[SIPService] Media stream info:', {
          hasSDH: !!sdh,
          hasLocalStream: !!localStream,
          audioTracksCount: localStream?.getAudioTracks().length,
          audioTracks: localStream?.getAudioTracks().map(t => ({
            id: t.id,
            label: t.label,
            enabled: t.enabled,
            muted: t.muted,
            readyState: t.readyState
          }))
        });
      }
      
      if (localStream) {
        const audioTracks = localStream.getAudioTracks();
        
        if (audioTracks.length === 0) {
          console.error('[SIPService] ❌ No audio tracks found in local stream');
          throw new Error('No audio tracks found');
        }
        
        audioTracks.forEach(track => {
          if (verboseLogging) {
            console.log('[SIPService] 🔊 Enabling audio track:', track.id, 'current enabled:', track.enabled);
          }
          track.enabled = true;
          if (verboseLogging) {
            console.log('[SIPService] ✅ Audio track enabled:', track.id, 'new enabled:', track.enabled);
          }
        });
        
        session.muted = false;
        
        if (verboseLogging) {
          console.log('[SIPService] ✅ Session unmuted, emitting event');
        }
        
        this.emit('sessionMuted', { sessionId: session.id, muted: false });
      } else {
        console.error('[SIPService] ❌ No local stream found for unmuting');
        throw new Error('No local stream available');
      }
    } catch (error) {
      console.error('[SIPService] ❌ Failed to unmute session:', error);
      throw error;
    }
  }

  async toggleMute(sessionId?: string): Promise<void> {
    const session = sessionId 
      ? this.sessions.get(sessionId) 
      : this.getCurrentSession();
    
    if (!session) {
      throw new Error('No session to toggle mute');
    }

    if (session.muted) {
      await this.unmuteCall(session.id);
    } else {
      await this.muteCall(session.id);
    }
  }

  // ==================== DTMF ====================

  async sendDTMF(sessionId: string, tone: string): Promise<void> {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log(`[SIPService] 📞 Attempting to send DTMF: ${tone} to session ${sessionId}`);
    }
    
    // Validate tone
    if (!isValidDTMFTone(tone)) {
      const error = new Error(`Invalid DTMF tone: ${tone}`);
      console.error('[SIPService] ❌ DTMF Error:', error.message);
      throw error;
    }
    
    if (verboseLogging) {
      console.log(`[SIPService] ✅ DTMF tone validated: ${tone}`);
    }

    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) {
      const error = new Error(`Session not found: ${sessionId}`);
      console.error('[SIPService] ❌ DTMF Error:', error.message);
      if (verboseLogging) {
        console.log('[SIPService] 📋 Available sessions:', Array.from(this.sessions.keys()));
      }
      throw error;
    }
    
    if (verboseLogging) {
      console.log('[SIPService] ✅ Session found:', sessionId);
      console.log('[SIPService] 🔍 Session details:', {
        sessionId: sessionData.id,
        stateInData: sessionData.state,
        sipJsState: sessionData.session.state,
        sipJsStateEnum: SIP.SessionState.Established,
        direction: sessionData.direction,
        hasSDH: !!sessionData.session.sessionDescriptionHandler
      });
    }

    // Check session state using the SIP.js session state directly
    if (!isSessionEstablished(sessionData.session.state)) {
      const error = new Error(`Cannot send DTMF - session not established. SIP.js state: ${sessionData.session.state}, Data state: ${sessionData.state}`);
      console.error('[SIPService] ❌ DTMF Error:', error.message);
      throw error;
    }
    
    if (verboseLogging) {
      console.log('[SIPService] ✅ Session state validated:', sessionData.session.state);
    }

    try {
      if (verboseLogging) {
        console.log(`[SIPService] 🎵 Sending DTMF tone ${tone} via SIP.js`);
      }
      
      // Access sessionDescriptionHandler directly like PWA
      const sdh = sessionData.session.sessionDescriptionHandler;
      if (!sdh) {
        throw new Error('No sessionDescriptionHandler available');
      }
      
      if (verboseLogging) {
        console.log('[SIPService] 📋 SessionDescriptionHandler found:', {
          hasSendDtmf: typeof (sdh as unknown as { sendDtmf?: unknown }).sendDtmf === 'function',
          sdhType: sdh.constructor.name
        });
      }
      
      // Try RFC 4733 (in-band DTMF) - cast to access sendDtmf method
      const dtmfSender = sdh as unknown as { sendDtmf?: (tone: string) => Promise<void> };
      
      if (typeof dtmfSender.sendDtmf === 'function') {
        if (verboseLogging) {
          console.log('[SIPService] 📞 Using RFC 4733 (in-band DTMF) via SessionDescriptionHandler');
        }
        await dtmfSender.sendDtmf(tone);
        if (verboseLogging) {
          console.log(`[SIPService] ✅ RFC 4733 DTMF sent successfully: ${tone}`);
        }
      } else {
        const error = new Error('No DTMF method available on session');
        console.error('[SIPService] ❌ DTMF Error:', error.message);
        console.error('[SIPService] SessionDescriptionHandler:', sdh);
        throw error;
      }

      if (verboseLogging) {
        console.log(`[SIPService] ✅ DTMF ${tone} sent successfully to session ${sessionId}`);
      }
      
      this.emit('dtmfSent', { sessionId, tone });
    } catch (error) {
      console.error('[SIPService] ❌ SIP.js DTMF transmission failed:', {
        tone,
        sessionId,
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        sessionState: sessionData.state,
        sipJsState: sessionData.session.state
      });
      throw error;
    }
  }

  async sendDTMFSequence(
    sessionId: string, 
    sequence: string, 
    pauseBetweenTones = 200,
    initialDelay = 500
  ): Promise<void> {
    if (!sequence) {
      throw new Error('Valid DTMF sequence is required');
    }

    // Validate all characters
    for (const tone of sequence) {
      if (!isValidDTMFTone(tone)) {
        throw new Error(`Invalid DTMF tone "${tone}" in sequence "${sequence}"`);
      }
    }

    // Initial delay
    if (initialDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, initialDelay));
    }

    // Send each tone
    for (let i = 0; i < sequence.length; i++) {
      await this.sendDTMF(sessionId, sequence[i]);
      
      // Wait between tones
      if (i < sequence.length - 1) {
        await new Promise(resolve => setTimeout(resolve, pauseBetweenTones));
      }
    }
  }

  // ==================== Transfer ====================

  async blindTransfer(sessionId: string, target: string): Promise<void> {
    // Check verbose logging setting
    const verboseLogging = window.localStorage?.getItem('VerboseLogging') === 'true';
    
    if (verboseLogging) {
      console.log('[SIPService] 🔄 blindTransfer called:', { sessionId, target });
    }

    const sessionData = this.sessions.get(sessionId);
    if (!sessionData || !isSessionEstablished(sessionData.session.state)) {
      console.error('[SIPService] ❌ Cannot transfer: session not established');
      throw new Error('Cannot transfer: session not established');
    }

    try {
      const domain = this.config?.domain || this.config?.server?.replace(/^wss?:\/\//, '').split(':')[0];
      const referTarget = SIP.UserAgent.makeURI(`sip:${target}@${domain}`);
      
      if (!referTarget) {
        console.error('[SIPService] ❌ Invalid transfer target');
        throw new Error('Invalid transfer target');
      }

      if (verboseLogging) {
        console.log('[SIPService] 📞 Sending REFER for blind transfer to:', referTarget.toString());
      }

      await sessionData.session.refer(referTarget, {
        requestDelegate: {
          onAccept: () => {
            if (verboseLogging) {
              console.log('[SIPService] ✅ Blind transfer accepted');
            }

            this.emit('transferCompleted', { 
              sessionId, 
              target, 
              type: 'blind', 
              success: true 
            });
            
            // Terminate the session after successful transfer
            setTimeout(() => {
              sessionData.session.bye().catch(console.warn);
            }, 100);
          },
          onReject: (response) => {
            const reason = response.message?.reasonPhrase || 'Transfer rejected';
            if (verboseLogging) {
              console.warn('[SIPService] ❌ Blind transfer rejected:', reason);
            }

            this.emit('transferCompleted', { 
              sessionId, 
              target, 
              type: 'blind', 
              success: false,
              reason: reason
            });
          }
        }
      });

      if (verboseLogging) {
        console.log('[SIPService] 📞 Blind transfer REFER sent to', target);
      }

      this.emit('transferInitiated', { sessionId, target, type: 'blind' });
    } catch (error) {
      console.error('[SIPService] ❌ Blind transfer failed:', error);
      throw error;
    }
  }

  async attendedTransfer(originalSessionId: string, target: string): Promise<SIP.Session> {
    // Check verbose logging setting
    const verboseLogging = window.localStorage?.getItem('VerboseLogging') === 'true';
    
    if (verboseLogging) {
      console.log('[SIPService] 🔄 attendedTransfer called:', { originalSessionId, target });
    }

    const originalSession = this.sessions.get(originalSessionId);
    if (!originalSession || !isSessionEstablished(originalSession.session.state)) {
      console.error('[SIPService] ❌ Cannot transfer: session not established');
      throw new Error('Cannot transfer: session not established');
    }

    if (!this.userAgent) {
      console.error('[SIPService] ❌ UserAgent not available');
      throw new Error('UserAgent not available');
    }

    // Create target URI
    const domain = this.config?.domain || this.config?.server?.replace(/^wss?:\/\//, '').split(':')[0];
    const targetURI = SIP.UserAgent.makeURI(`sip:${target}@${domain}`);
    
    if (!targetURI) {
      console.error('[SIPService] ❌ Invalid transfer target');
      throw new Error('Invalid transfer target');
    }

    if (verboseLogging) {
      console.log('[SIPService] 📞 Creating transfer session to:', targetURI.toString());
    }

    // Create new session to transfer target
    const transferSession = new SIP.Inviter(this.userAgent, targetURI, {
      sessionDescriptionHandlerOptions: {
        constraints: { audio: true, video: false }
      }
    });

    // Store reference to transfer session in original session data
    originalSession.transferSession = transferSession;

    // Set up delegate for transfer session events
    transferSession.delegate = {
      onBye: () => {
        if (verboseLogging) {
          console.log('[SIPService] 📞 Transfer session ended with BYE');
        }

        this.emit('attendedTransferTerminated', {
          originalSessionId,
          transferSessionId: transferSession.id,
          status: 'terminated',
          reason: 'Transfer target hung up'
        });
      }
    };

    // Send INVITE
    await transferSession.invite({
      requestDelegate: {
        onTrying: () => {
          if (verboseLogging) {
            console.log('[SIPService] 📞 Transfer call trying...');
          }

          this.emit('attendedTransferProgress', {
            originalSessionId,
            transferSessionId: transferSession.id,
            status: 'trying'
          });
        },

        onProgress: () => {
          if (verboseLogging) {
            console.log('[SIPService] 📞 Transfer call ringing...');
          }

          this.emit('attendedTransferProgress', {
            originalSessionId,
            transferSessionId: transferSession.id,
            status: 'ringing'
          });
        },

        onAccept: () => {
          if (verboseLogging) {
            console.log('[SIPService] 📞 Transfer call answered!');
          }

          this.emit('attendedTransferAnswered', {
            originalSessionId,
            transferSessionId: transferSession.id,
            status: 'answered',
            transferSession
          });
        },

        onReject: (sip) => {
          const reason = sip.message?.reasonPhrase || 'Call rejected';
          if (verboseLogging) {
            console.log('[SIPService] 📞 Transfer call rejected:', reason);
          }

          this.emit('attendedTransferRejected', {
            originalSessionId,
            transferSessionId: transferSession.id,
            status: 'rejected',
            reason: reason
          });
        }
      }
    });

    if (verboseLogging) {
      console.log('[SIPService] ✅ Attended transfer session created successfully');
    }

    this.emit('attendedTransferInitiated', {
      originalSessionId,
      transferSessionId: transferSession.id,
      status: 'trying',
      target,
      transferSession
    });

    return transferSession;
  }

  async completeAttendedTransfer(originalSessionId: string, transferSessionId: string): Promise<void> {
    // Check verbose logging setting
    const verboseLogging = window.localStorage?.getItem('VerboseLogging') === 'true';
    
    if (verboseLogging) {
      console.log('[SIPService] 🔄 completeAttendedTransfer called:', {
        originalSessionId,
        transferSessionId
      });
    }
    
    const originalSessionData = this.sessions.get(originalSessionId);
    if (!originalSessionData) {
      console.error('[SIPService] ❌ Original session not found for transfer completion');
      throw new Error('Original session not found for transfer completion');
    }

    const originalSession = originalSessionData.session;
    if (!originalSession) {
      console.error('[SIPService] ❌ Original SIP session not found');
      throw new Error('Original SIP session not found');
    }

    // Get transfer session from session data
    const transferSession = originalSessionData.transferSession;
    if (!transferSession) {
      console.error('[SIPService] ❌ Transfer session not found');
      throw new Error('Transfer session not found');
    }

    try {
      if (verboseLogging) {
        console.log('[SIPService] 📞 Sending REFER to complete attended transfer');
      }

      // Send REFER to complete the transfer
      await originalSession.refer(transferSession as SIP.Session, {
        requestDelegate: {
          onAccept: () => {
            if (verboseLogging) {
              console.log('[SIPService] ✅ Attended transfer completed successfully');
            }

            this.emit('attendedTransferCompleted', {
              originalSessionId: originalSessionId,
              transferSessionId: transferSessionId,
              success: true
            });

            // End the original session as the transfer is complete
            originalSession.bye().catch((error) => {
              console.warn('[SIPService] Could not BYE original session after attended transfer:', error);
            });

            // Clean up our session tracking
            this.terminateSession(originalSessionId).catch((error) => {
              console.warn('[SIPService] Error cleaning up original session:', error);
            });
          },

          onReject: (sip) => {
            const reason = sip.message?.reasonPhrase || 'Unknown';
            console.warn('[SIPService] ❌ Attended transfer rejected:', reason);

            this.emit('attendedTransferCompleted', {
              originalSessionId: originalSessionId,
              transferSessionId: transferSessionId,
              success: false,
              reason: reason
            });
          }
        }
      });
    } catch (error) {
      console.error('[SIPService] ❌ Failed to complete attended transfer:', error);
      this.emit('sessionError', { sessionId: originalSessionId, error: error as Error });
      throw error;
    }
  }

  async cancelAttendedTransfer(originalSessionId: string): Promise<void> {
    // Check verbose logging setting
    const verboseLogging = window.localStorage?.getItem('VerboseLogging') === 'true';
    
    if (verboseLogging) {
      console.log('[SIPService] 🚫 cancelAttendedTransfer called:', { originalSessionId });
    }

    const originalSessionData = this.sessions.get(originalSessionId);
    if (!originalSessionData) {
      console.error('[SIPService] ❌ Original session not found');
      throw new Error('Original session not found');
    }

    try {
      // Terminate transfer session if it exists
      if (originalSessionData.transferSession) {
        if (verboseLogging) {
          console.log('[SIPService] 📞 Terminating transfer session');
        }

        try {
          // Try to cancel first (for sessions not yet established)
          await (originalSessionData.transferSession as SIP.Inviter).cancel();
        } catch (error) {
          if (verboseLogging) {
            console.log('[SIPService] Cancel failed, trying BYE:', error);
          }
          // If cancel fails, try BYE (for established sessions)
          await (originalSessionData.transferSession as SIP.Session).bye();
        }
      }

      // Clean up references
      delete originalSessionData.transferSession;

      // Resume the original call if it was on hold
      if (originalSessionData.onHold) {
        if (verboseLogging) {
          console.log('[SIPService] 📞 Resuming original call from hold');
        }
        await this.unholdCall(originalSessionId);
      }

      this.emit('attendedTransferCancelled', {
        originalSessionId: originalSessionId
      });

      if (verboseLogging) {
        console.log('[SIPService] ✅ Attended transfer cancelled successfully');
      }

    } catch (error) {
      console.error('[SIPService] ❌ Failed to cancel attended transfer:', error);
      this.emit('sessionError', { sessionId: originalSessionId, error: error as Error });
      throw error;
    }
  }

  // ==================== BLF Subscriptions ====================

  subscribeBLF(extension: string, buddy?: string): SIP.Subscriber | null {
    if (!this.userAgent || this.registrationState !== 'registered') {
      console.warn('Cannot subscribe to BLF - not registered');
      return null;
    }

    if (this.blfSubscriptions.has(extension)) {
      console.log(`Already subscribed to BLF for extension ${extension}`);
      return this.blfSubscriptions.get(extension)!.subscription;
    }

    const domain = this.config?.domain || this.config?.server?.replace(/^wss?:\/\//, '').split(':')[0];
    const target = SIP.UserAgent.makeURI(`sip:${extension}@${domain}`);
    
    if (!target) {
      console.error(`Invalid BLF target for extension ${extension}`);
      return null;
    }

    try {
      const subscription = new SIP.Subscriber(this.userAgent, target, 'dialog');

      subscription.delegate = {
        onNotify: (notification) => {
          notification.accept();
          this.handleBLFNotification(extension, buddy, notification);
        }
      };

      subscription.stateChange.addListener((newState: SIP.SubscriptionState) => {
        switch (newState) {
          case SIP.SubscriptionState.Subscribed:
            console.log(`BLF subscription accepted for extension ${extension}`);
            this.emit('blfSubscribed', { extension, buddy });
            break;
          case SIP.SubscriptionState.Terminated:
            console.log(`BLF subscription terminated for extension ${extension}`);
            this.blfSubscriptions.delete(extension);
            this.emit('blfUnsubscribed', { extension, buddy });
            break;
        }
      });

      subscription.subscribe();

      this.blfSubscriptions.set(extension, {
        subscription,
        extension,
        buddy,
        state: 'unknown'
      });

      return subscription;

    } catch (error) {
      console.error(`Failed to create BLF subscription for extension ${extension}:`, error);
      this.emit('blfSubscriptionFailed', { extension, buddy, error: error as Error });
      return null;
    }
  }

  private handleBLFNotification(extension: string, buddy: string | undefined, notification: SIP.Notification): void {
    try {
      const contentType = notification.request.getHeader('Content-Type');
      const body = notification.request.body;

      if (!body) {
        return;
      }

      let dialogState: BLFPresenceState = 'available';
      let remoteTarget: string | null = null;

      // Parse dialog-info XML
      if (contentType?.toLowerCase().includes('application/dialog-info+xml')) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(body, 'text/xml');
        
        const dialogs = xmlDoc.getElementsByTagName('dialog');
        if (dialogs.length > 0) {
          const dialog = dialogs[0];
          const state = dialog.getElementsByTagName('state')[0];
          
          if (state) {
            dialogState = mapDialogStateToBLF(state.textContent?.trim() || 'terminated');
          }

          const remoteEl = dialog.getElementsByTagName('remote')[0];
          if (remoteEl) {
            const targetEl = remoteEl.getElementsByTagName('target')[0];
            if (targetEl) {
              remoteTarget = targetEl.getAttribute('uri');
            }
          }
        }
      }

      // Update subscription data
      const blfData = this.blfSubscriptions.get(extension);
      if (blfData) {
        blfData.state = dialogState;
        blfData.remoteTarget = remoteTarget;
      }

      // Emit state change
      this.emit('blfStateChanged', {
        extension,
        buddy,
        state: dialogState,
        remoteTarget
      });

    } catch (error) {
      console.error(`Error handling BLF notification for extension ${extension}:`, error);
    }
  }

  async unsubscribeBLF(extension: string): Promise<void> {
    const verboseLogging = isVerboseLoggingEnabled();
    const blfData = this.blfSubscriptions.get(extension);
    
    if (!blfData) {
      if (verboseLogging) {
        console.log(`[SIPService] ⚠️ BLF subscription not found for ${extension}`);
      }
      return;
    }

    try {
      if (verboseLogging) {
        console.log(`[SIPService] 📞 Unsubscribing and disposing BLF for ${extension}`);
      }
      
      // Unsubscribe (sends SIP SUBSCRIBE with Expires: 0)
      await blfData.subscription.unsubscribe();
      
      // Dispose to clean up resources (per SIP.js best practices)
      await blfData.subscription.dispose();
      
      // Remove from map
      this.blfSubscriptions.delete(extension);
      
      if (verboseLogging) {
        console.log(`[SIPService] ✅ BLF for ${extension} unsubscribed and disposed`);
      }
    } catch (error) {
      console.error(`[SIPService] ❌ Error unsubscribing from BLF for extension ${extension}:`, error);
      throw error;
    }
  }

  async unsubscribeAllBLF(): Promise<void> {
    for (const [extension] of this.blfSubscriptions) {
      this.unsubscribeBLF(extension);
    }
  }

  getBLFState(extension: string): BLFPresenceState | null {
    const blfData = this.blfSubscriptions.get(extension);
    return blfData ? blfData.state : null;
  }

  // ==================== Message Handling ====================

  private handleIncomingMessage(message: SIP.Message): void {
    const fromHeader = message.request.getHeader('From') || '';
    const toHeader = message.request.getHeader('To') || '';
    
    this.emit('messageReceived', {
      from: fromHeader,
      to: toHeader,
      body: message.request.body
    });
  }

  private handleIncomingNotify(notification: SIP.Notification): void {
    try {
      const request = notification.request;
      const body = request.body;
      const eventHeader = request.getHeader('Event');
      const contentTypeHeader = request.getHeader('Content-Type');

      notification.accept();

      this.emit('notifyReceived', {
        from: request.getHeader('From') || null,
        to: request.getHeader('To') || null,
        body,
        contentType: contentTypeHeader,
        event: eventHeader,
        voicemailData: eventHeader?.toLowerCase().includes('message-summary') 
          ? this.parseMessageSummary(body) 
          : null
      });

    } catch (error) {
      console.error('Error handling incoming NOTIFY:', error);
      try {
        notification.accept();
      } catch {
        // Ignore accept error
      }
    }
  }

  private parseMessageSummary(body: string): { messagesWaiting: boolean; newVoiceMessages: number; oldVoiceMessages: number; totalVoiceMessages: number } | null {
    try {
      const lines = body.split('\n');
      const summary = {
        messagesWaiting: false,
        newVoiceMessages: 0,
        oldVoiceMessages: 0,
        totalVoiceMessages: 0
      };

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('Messages-Waiting:')) {
          summary.messagesWaiting = trimmedLine.split(':')[1].trim().toLowerCase() === 'yes';
        } else if (trimmedLine.startsWith('Voice-Message:')) {
          const voiceMatch = trimmedLine.match(/Voice-Message:\s*(\d+)\/(\d+)/);
          if (voiceMatch) {
            summary.newVoiceMessages = parseInt(voiceMatch[1], 10);
            summary.oldVoiceMessages = parseInt(voiceMatch[2], 10);
            summary.totalVoiceMessages = summary.newVoiceMessages + summary.oldVoiceMessages;
          }
        }
      }

      return summary;
    } catch {
      return null;
    }
  }

  // ==================== Transport Handlers ====================

  private handleTransportConnect(): void {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log('[SIPService] ✅ SIP WebSocket transport connected');
    }
    
    this.transportState = 'connected';
    this.emit('transportStateChanged', 'connected');
    this.emit('transportConnected', undefined);
    
    // Show success toast if this was a reconnection
    if (this.wasReconnecting) {
      this.emit('reconnectionSuccess', undefined);
      this.wasReconnecting = false;
      
      if (verboseLogging) {
        console.log('[SIPService] Reconnection successful, emitting reconnectionSuccess event');
      }
    }

    // Auto-start registration
    if (this.userAgent && this.registrationState !== 'registered' && this.registrationState !== 'registering') {
      setTimeout(() => {
        this.register().catch(error => {
          console.error('Auto-registration failed:', error);
        });
      }, 500);
    }
  }

  private handleTransportDisconnect(error?: Error): void {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log('[SIPService] ❌ SIP WebSocket transport disconnected', error?.message);
    }
    
    this.transportState = 'disconnected';
    this.emit('transportStateChanged', 'disconnected');

    // Clear subscriptions
    this.blfSubscriptions.clear();
    
    // Mark as reconnecting if there was an error
    if (error) {
      this.wasReconnecting = true;
      this.emit('reconnectionAttempting', undefined);
      
      if (verboseLogging) {
        console.log('[SIPService] Transport disconnected with error, marked for reconnection');
      }
    }

    if (error) {
      this.emit('transportError', error);
    }
    
    this.emit('transportDisconnected', error || null);
  }

  // ==================== Stop/Cleanup ====================

  async stop(): Promise<void> {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (!this.userAgent) {
      if (verboseLogging) {
        console.log('[SIPService] 🔌 stop() called but UserAgent does not exist');
      }
      return;
    }

    if (verboseLogging) {
      console.log('[SIPService] 🔌 Stopping SIP service and cleaning up...');
    }

    try {
      // 1. Terminate all active sessions with dispose
      if (verboseLogging) {
        console.log('[SIPService] 📞 Disposing all active sessions:', this.sessions.size);
      }
      for (const [sessionId, sessionData] of this.sessions) {
        try {
          // Stop duration tracking
          this.stopDurationTracking(sessionId);
          
          // Dispose the SIP.js session
          await sessionData.session.dispose();
          
          if (verboseLogging) {
            console.log(`[SIPService] ✅ Session ${sessionId} disposed`);
          }
        } catch (error) {
          console.error(`[SIPService] ❌ Failed to dispose session ${sessionId}:`, error);
        }
      }
      this.sessions.clear();
      this.activeLines.clear();
      
      // 2. Unregister and dispose registerer
      if (this.registerer) {
        if (verboseLogging) {
          console.log('[SIPService] 📝 Disposing registerer');
        }
        
        try {
          if (this.registrationState === 'registered') {
            await this.registerer.unregister();
          }
          await this.registerer.dispose();
        } catch (error) {
          console.error('[SIPService] ❌ Failed to dispose registerer:', error);
        }
        
        this.registerer = null;
      }
      
      // 3. Dispose all BLF subscriptions
      if (verboseLogging) {
        console.log('[SIPService] 📞 Disposing BLF subscriptions:', this.blfSubscriptions.size);
      }
      for (const [extension, blfData] of this.blfSubscriptions) {
        try {
          await blfData.subscription.dispose();
          
          if (verboseLogging) {
            console.log(`[SIPService] ✅ BLF subscription ${extension} disposed`);
          }
        } catch (error) {
          console.error(`[SIPService] ❌ Failed to dispose BLF ${extension}:`, error);
        }
      }
      this.blfSubscriptions.clear();
      
      // 4. Stop and dispose UserAgent
      if (verboseLogging) {
        console.log('[SIPService] 🔌 Stopping UserAgent');
      }
      await this.userAgent.stop();
      
      if (verboseLogging) {
        console.log('[SIPService] 🔌 Disposing UserAgent transport');
      }
      await this.userAgent.transport.dispose();
      
      this.userAgent = null;
      
      // 5. Update state
      this.transportState = 'disconnected';
      this.registrationState = 'unregistered';
      this.selectedLine = null;
      
      // 6. Emit events
      this.emit('transportStateChanged', 'disconnected');
      this.emit('registrationStateChanged', 'unregistered');
      
      if (verboseLogging) {
        console.log('[SIPService] ✅ SIP service stopped and cleaned up successfully');
      }
    } catch (error) {
      console.error('[SIPService] ❌ Error stopping UserAgent:', error);
      throw error;
    }
  }

  // ==================== Utility Methods ====================

  private generateSessionId(): string {
    return `session_${++this.sessionCounter}_${Date.now()}`;
  }

  private getAvailableLine(): LineNumber | null {
    for (const lineNumber of [1, 2, 3] as LineNumber[]) {
      if (!this.activeLines.has(lineNumber)) {
        return lineNumber;
      }
    }
    return null;
  }

  // ==================== State Getters ====================

  getSession(sessionId: string): SessionData | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    const { session: _session, ...publicData } = session;
    return publicData;
  }

  getSessionByLine(lineNumber: LineNumber): SessionData | undefined {
    const sessionId = this.activeLines.get(lineNumber);
    return sessionId ? this.getSession(sessionId) : undefined;
  }

  getAllSessions(): SessionData[] {
    return Array.from(this.sessions.values()).map(({ session: _session, ...publicData }) => publicData);
  }

  getActiveSessions(): SessionData[] {
    return this.getAllSessions().filter(session => 
      isSessionEstablished(session.state) || session.state === 'hold'
    );
  }

  private getCurrentSession(): (SessionData & { session: SIP.Session }) | undefined {
    if (!this.selectedLine) return undefined;
    const sessionId = this.activeLines.get(this.selectedLine);
    return sessionId ? this.sessions.get(sessionId) : undefined;
  }

  private getFirstActiveSession(): (SessionData & { session: SIP.Session }) | undefined {
    for (const session of this.sessions.values()) {
      if (session.state !== 'terminated' && session.state !== 'failed') {
        return session;
      }
    }
    return undefined;
  }

  private getIncomingSession(): (SessionData & { session: SIP.Session }) | undefined {
    for (const session of this.sessions.values()) {
      if (session.direction === 'incoming' && session.state === 'ringing') {
        return session;
      }
    }
    return undefined;
  }

  isRegistered(): boolean {
    return this.registrationState === 'registered';
  }

  getRegistrationState(): RegistrationState {
    return this.registrationState;
  }

  getTransportState(): TransportState {
    return this.transportState;
  }

  getStats(): CallStats {
    return { ...this.stats };
  }

  getSelectedLine(): LineNumber | null {
    return this.selectedLine;
  }

  selectLine(lineNumber: LineNumber): void {
    this.selectedLine = lineNumber;
    const sessionId = this.activeLines.get(lineNumber) || null;
    this.emit('lineSelected', { lineNumber, sessionId });
  }

  hasActiveSessions(): boolean {
    return this.sessions.size > 0;
  }
}

// Export singleton instance
export const sipService = new SIPService();
export default sipService;
