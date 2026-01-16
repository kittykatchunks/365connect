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

// ==================== Type Guards ====================

const SessionStateEnum = SIP.SessionState;

function isSessionEstablished(state: unknown): boolean {
  const validStates = [
    SessionStateEnum.Established,
    'Established',
    'established',  // React app uses lowercase
    'active',
    'confirmed'
  ];
  return validStates.includes(state as string);
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

  // ==================== UserAgent Management ====================

  async createUserAgent(config: Partial<SIPConfig> = {}): Promise<void> {
    try {
      // Update configuration
      this.configure(config);
      
      if (!this.config?.server || !this.config?.username || !this.config?.password) {
        throw new Error('Missing required SIP configuration: server, username, and password are required.');
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
      const remoteIdentity = invitation.remoteIdentity.displayName || remoteNumber;
      
      if (verboseLogging) {
        console.log('[SIPService] Caller info extracted:', {
          remoteNumber,
          remoteIdentity
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
      sessionData.state = state as unknown as SessionState;
      this.emit('sessionStateChanged', { sessionId, state: state as unknown as string });

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
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) {
      throw new Error('Session not found');
    }

    try {
      const { session } = sessionData;
      
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
      }

      this.handleSessionTerminated(sessionData, reason);

    } catch (error) {
      console.error('Failed to terminate session:', error);
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
    const session = sessionId 
      ? this.sessions.get(sessionId) 
      : this.getCurrentSession();
    
    if (!session) {
      throw new Error('No session to hold');
    }

    if (!isSessionEstablished(session.session.state)) {
      throw new Error('Cannot hold: session not established');
    }

    try {
      // Use Session.hold() method from SIP.js
      const holdableSession = session.session as SIP.Session & { 
        sessionDescriptionHandler?: { 
          hold?: () => Promise<void>;
          localMediaStream?: MediaStream;
        } 
      };
      
      // SIP.js doesn't have a direct hold method, so we use reinvite with inactive media
      const sdh = holdableSession.sessionDescriptionHandler;
      if (sdh?.localMediaStream) {
        sdh.localMediaStream.getAudioTracks().forEach(track => {
          track.enabled = false;
        });
      }
      
      session.onHold = true;
      session.state = 'hold';
      
      this.emit('sessionModified', { sessionId: session.id, action: 'hold' });
    } catch (error) {
      console.error('Failed to hold session:', error);
      throw error;
    }
  }

  async unholdCall(sessionId?: string): Promise<void> {
    const session = sessionId 
      ? this.sessions.get(sessionId) 
      : this.getCurrentSession();
    
    if (!session) {
      throw new Error('No session to unhold');
    }

    try {
      const holdableSession = session.session as SIP.Session & { 
        sessionDescriptionHandler?: { 
          unhold?: () => Promise<void>;
          localMediaStream?: MediaStream;
        } 
      };
      
      const sdh = holdableSession.sessionDescriptionHandler;
      if (sdh?.localMediaStream) {
        sdh.localMediaStream.getAudioTracks().forEach(track => {
          track.enabled = true;
        });
      }
      
      session.onHold = false;
      session.state = 'established';
      
      this.emit('sessionModified', { sessionId: session.id, action: 'unhold' });
    } catch (error) {
      console.error('Failed to unhold session:', error);
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

    try {
      const sdh = session.session.sessionDescriptionHandler;
      const localStream = (sdh as unknown as { localMediaStream?: MediaStream })?.localMediaStream;
      
      if (verboseLogging) {
        console.log('[SIPService] Media stream info:', {
          hasSDH: !!sdh,
          hasLocalStream: !!localStream,
          audioTracks: localStream?.getAudioTracks().length
        });
      }
      
      if (localStream) {
        localStream.getAudioTracks().forEach(track => {
          track.enabled = false;
        });
        session.muted = true;
        
        if (verboseLogging) {
          console.log('[SIPService] ✅ Session muted, emitting event');
        }
        
        this.emit('sessionMuted', { sessionId: session.id, muted: true });
      } else {
        console.warn('[SIPService] ⚠️ No local stream found for muting');
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

    try {
      const sdh = session.session.sessionDescriptionHandler;
      const localStream = (sdh as unknown as { localMediaStream?: MediaStream })?.localMediaStream;
      
      if (verboseLogging) {
        console.log('[SIPService] Media stream info:', {
          hasSDH: !!sdh,
          hasLocalStream: !!localStream,
          audioTracks: localStream?.getAudioTracks().length
        });
      }
      
      if (localStream) {
        localStream.getAudioTracks().forEach(track => {
          track.enabled = true;
        });
        session.muted = false;
        
        if (verboseLogging) {
          console.log('[SIPService] ✅ Session unmuted, emitting event');
        }
        
        this.emit('sessionMuted', { sessionId: session.id, muted: false });
      } else {
        console.warn('[SIPService] ⚠️ No local stream found for unmuting');
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
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData || !isSessionEstablished(sessionData.session.state)) {
      throw new Error('Cannot transfer: session not established');
    }

    try {
      const domain = this.config?.domain || this.config?.server?.replace(/^wss?:\/\//, '').split(':')[0];
      const referTarget = SIP.UserAgent.makeURI(`sip:${target}@${domain}`);
      
      if (!referTarget) {
        throw new Error('Invalid transfer target');
      }

      await sessionData.session.refer(referTarget, {
        requestDelegate: {
          onAccept: () => {
            console.log('Blind transfer accepted');
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
            console.warn('Blind transfer rejected:', response);
            this.emit('transferCompleted', { 
              sessionId, 
              target, 
              type: 'blind', 
              success: false,
              reason: 'Transfer rejected'
            });
          }
        }
      });

      this.emit('transferInitiated', { sessionId, target, type: 'blind' });
    } catch (error) {
      console.error('Blind transfer failed:', error);
      throw error;
    }
  }

  async attendedTransfer(originalSessionId: string, target: string): Promise<SIP.Session> {
    const originalSession = this.sessions.get(originalSessionId);
    if (!originalSession || !isSessionEstablished(originalSession.session.state)) {
      throw new Error('Cannot transfer: session not established');
    }

    if (!this.userAgent) {
      throw new Error('UserAgent not available');
    }

    // Create target URI
    const domain = this.config?.domain || this.config?.server?.replace(/^wss?:\/\//, '').split(':')[0];
    const targetURI = SIP.UserAgent.makeURI(`sip:${target}@${domain}`);
    
    if (!targetURI) {
      throw new Error('Invalid transfer target');
    }

    // Create new session to transfer target
    const transferSession = new SIP.Inviter(this.userAgent, targetURI, {
      sessionDescriptionHandlerOptions: {
        constraints: { audio: true, video: false }
      }
    });

    // Set up delegate for transfer session events
    transferSession.delegate = {
      onBye: () => {
        console.log('Transfer session ended');
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
        onProgress: () => {
          this.emit('attendedTransferProgress', {
            originalSessionId,
            transferSessionId: transferSession.id,
            status: 'ringing'
          });
        },
        onAccept: () => {
          this.emit('attendedTransferAnswered', {
            originalSessionId,
            transferSessionId: transferSession.id,
            status: 'answered',
            transferSession
          });
        },
        onReject: () => {
          this.emit('attendedTransferRejected', {
            originalSessionId,
            transferSessionId: transferSession.id,
            status: 'rejected',
            reason: 'Call rejected'
          });
        }
      }
    });

    this.emit('attendedTransferInitiated', {
      originalSessionId,
      transferSessionId: transferSession.id,
      status: 'trying',
      target,
      transferSession
    });

    return transferSession;
  }

  async completeAttendedTransfer(originalSessionId: string, transferSession: SIP.Session): Promise<void> {
    const originalSession = this.sessions.get(originalSessionId);
    if (!originalSession) {
      throw new Error('Original session not found');
    }

    // Get the dialog from the transfer session
    const referTarget = SIP.UserAgent.makeURI(
      (transferSession as unknown as { remoteIdentity?: { uri?: { toString(): string } } })
        ?.remoteIdentity?.uri?.toString() || ''
    );
    
    if (!referTarget) {
      throw new Error('Cannot get transfer target');
    }

    // Send REFER with Replaces header
    await originalSession.session.refer(referTarget, {
      requestDelegate: {
        onAccept: () => {
          console.log('Attended transfer completed');
          this.emit('transferCompleted', {
            sessionId: originalSessionId,
            target: referTarget.toString(),
            type: 'attended',
            success: true
          });
        },
        onReject: (response) => {
          console.warn('Attended transfer failed:', response);
          this.emit('transferCompleted', {
            sessionId: originalSessionId,
            target: referTarget.toString(),
            type: 'attended',
            success: false,
            reason: 'Transfer failed'
          });
        }
      }
    });
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

  unsubscribeBLF(extension: string): void {
    const blfData = this.blfSubscriptions.get(extension);
    if (!blfData) {
      return;
    }

    try {
      blfData.subscription.unsubscribe();
      this.blfSubscriptions.delete(extension);
    } catch (error) {
      console.error(`Error unsubscribing from BLF for extension ${extension}:`, error);
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
    console.log('SIP WebSocket transport connected');
    this.transportState = 'connected';
    this.emit('transportStateChanged', 'connected');
    this.emit('transportConnected', undefined);

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
    console.log('SIP WebSocket transport disconnected', error?.message);
    this.transportState = 'disconnected';
    this.emit('transportStateChanged', 'disconnected');

    // Clear subscriptions
    this.blfSubscriptions.clear();

    if (error) {
      this.emit('transportError', error);
    }
    
    this.emit('transportDisconnected', error || null);
  }

  // ==================== Stop/Cleanup ====================

  async stop(): Promise<void> {
    if (!this.userAgent) return;

    try {
      if (this.registrationState === 'registered') {
        await this.unregister();
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
