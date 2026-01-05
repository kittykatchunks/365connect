/**
 * LineManager - Manages 3-line system for multi-call handling
 * 
 * Responsibilities:
 * - Track state of 3 lines (idle, ringing, active, hold)
 * - Maintain selected line (which line is displayed in UI)
 * - Update line key UI elements with visual states
 * - Coordinate with SipSessionManager for call operations
 * - Ensure UI reflects selected line's call details
 */

class LineManager {
    constructor() {
        this.lines = [1, 2, 3];
        
        // Line state storage: lineNumber -> {sessionId, state, callerInfo, duration, onHold, muted}
        this.lineStates = new Map();
        
        // Currently selected line (null = no selection, UI shows idle)
        this.selectedLine = null;
        
        // Reference to SipSessionManager (set during initialization)
        this.sipManager = null;
        
        // Duration update intervals for each line
        this.durationIntervals = new Map();
        
        // Initialize all lines to idle state
        this.lines.forEach(lineNumber => {
            this.lineStates.set(lineNumber, {
                sessionId: null,
                state: 'idle',
                callerInfo: null,
                duration: 0,
                onHold: false,
                muted: false,
                direction: null
            });
        });
        
        console.log('📞 LineManager initialized with 3 lines');
    }
    
    /**
     * Initialize with SIP manager reference and set up event listeners
     */
    initialize(sipManager) {
        this.sipManager = sipManager;
        
        // Listen to SIP session events
        this.sipManager.on('sessionCreated', (sessionData) => this.handleSessionCreated(sessionData));
        this.sipManager.on('sessionStateChanged', (data) => this.handleSessionStateChanged(data));
        this.sipManager.on('sessionTerminated', (sessionData) => this.handleSessionTerminated(sessionData));
        this.sipManager.on('sessionModified', (data) => this.handleSessionModified(data));
        this.sipManager.on('incomingCall', (sessionData) => this.handleIncomingCall(sessionData));
        
        // Set up line key click handlers
        this.setupLineKeyHandlers();
        
        console.log('📞 LineManager initialized with SipSessionManager');
    }
    
    /**
     * Set up click handlers for line keys
     */
    setupLineKeyHandlers() {
        this.lines.forEach(lineNumber => {
            const lineKeyElement = document.getElementById(`lineKey${lineNumber}`);
            if (lineKeyElement) {
                lineKeyElement.addEventListener('click', () => this.selectLine(lineNumber));
            }
        });
        
        console.log('📞 Line key click handlers registered');
    }
    
    /**
     * Handle new session creation
     */
    handleSessionCreated(sessionData) {
        const { id: sessionId, lineNumber, direction, target, callerID } = sessionData;
        
        console.log(`📞 LineManager: Session created on line ${lineNumber}`, {
            sessionId,
            direction,
            target: target || callerID
        });
        
        // Update line state
        const lineState = this.lineStates.get(lineNumber);
        if (lineState) {
            lineState.sessionId = sessionId;
            lineState.state = direction === 'incoming' ? 'ringing' : 'calling';
            lineState.callerInfo = {
                number: direction === 'incoming' ? callerID : target,
                name: direction === 'incoming' ? callerID : target,
                direction: direction
            };
            lineState.direction = direction;
            lineState.duration = 0;
            lineState.onHold = false;
            lineState.muted = false;
            
            this.updateLineKeyUI(lineNumber);
            
            // Only auto-select for outgoing calls
            // For incoming calls, user must manually select the line key
            if (direction === 'outgoing') {
                this.selectLine(lineNumber);
            }
        }
    }
    
    /**
     * Handle session state changes
     */
    handleSessionStateChanged({ sessionId, state }) {
        const lineNumber = this.findLineBySessionId(sessionId);
        if (!lineNumber) return;
        
        console.log(`📞 LineManager: Session state changed on line ${lineNumber}:`, state);
        
        const lineState = this.lineStates.get(lineNumber);
        if (!lineState) return;
        
        // Map SIP state to line state
        switch (state) {
            case 'Established':
            case 'active':
            case 'confirmed':
                lineState.state = 'active';
                // Start duration tracking if not already started
                if (!this.durationIntervals.has(lineNumber)) {
                    this.startDurationTracking(lineNumber);
                }
                break;
            case 'initiating':
            case 'calling':
                lineState.state = 'calling';
                break;
            case 'ringing':
                lineState.state = 'ringing';
                break;
        }
        
        this.updateLineKeyUI(lineNumber);
        
        // If this is the selected line, update main display
        if (this.selectedLine === lineNumber) {
            this.updateMainDisplay();
        }
    }
    
    /**
     * Handle incoming call (for call waiting tone)
     */
    handleIncomingCall(sessionData) {
        const { lineNumber } = sessionData;
        
        console.log(`📞 LineManager: Incoming call on line ${lineNumber}`);
        
        // Play call waiting tone if there's already an active call
        const hasActiveCalls = Array.from(this.lineStates.values()).some(
            ls => ls.state === 'active' || ls.state === 'hold'
        );
        
        if (hasActiveCalls) {
            // Play call waiting tone
            this.playCallWaitingTone();
        }
        
        // Line key will show ringing state automatically from handleSessionCreated
    }
    
    /**
     * Handle session termination
     */
    handleSessionTerminated(sessionData) {
        const { id: sessionId, lineNumber } = sessionData;
        
        console.log(`📞 LineManager: Session terminated on line ${lineNumber}`);
        
        // Stop duration tracking
        this.stopDurationTracking(lineNumber);
        
        // Clear line state
        const lineState = this.lineStates.get(lineNumber);
        if (lineState) {
            lineState.sessionId = null;
            lineState.state = 'idle';
            lineState.callerInfo = null;
            lineState.duration = 0;
            lineState.onHold = false;
            lineState.muted = false;
            lineState.direction = null;
            
            this.updateLineKeyUI(lineNumber);
        }
        
        // If this was the selected line, clear selection and show idle UI
        if (this.selectedLine === lineNumber) {
            this.selectedLine = null;
            this.updateMainDisplay();
            this.updateCallControls();
        }
    }
    
    /**
     * Handle session modifications (mute, hold, etc.)
     */
    handleSessionModified({ sessionId, action }) {
        const lineNumber = this.findLineBySessionId(sessionId);
        if (!lineNumber) return;
        
        console.log(`📞 LineManager: Session modified on line ${lineNumber}:`, action);
        
        const lineState = this.lineStates.get(lineNumber);
        if (!lineState) return;
        
        switch (action) {
            case 'hold':
                lineState.onHold = true;
                lineState.state = 'hold';
                break;
            case 'unhold':
                lineState.onHold = false;
                lineState.state = 'active';
                break;
            case 'mute':
                lineState.muted = true;
                break;
            case 'unmute':
                lineState.muted = false;
                break;
        }
        
        this.updateLineKeyUI(lineNumber);
        
        // If this is the selected line, update main display
        if (this.selectedLine === lineNumber) {
            this.updateMainDisplay();
            this.updateCallControls();
        }
    }
    
    /**
     * Select a line (make it active in the UI)
     * Each line is treated as a completely independent UI interface
     */
    selectLine(lineNumber) {
        if (!this.lines.includes(lineNumber)) {
            console.error(`Invalid line number: ${lineNumber}`);
            return;
        }
        
        const lineState = this.lineStates.get(lineNumber);
        if (!lineState) return;
        
        // If clicking the already selected line, just refresh the UI (don't toggle anything)
        if (this.selectedLine === lineNumber) {
            console.log(`📞 LineManager: Reselecting line ${lineNumber} - refreshing UI only`);
            this.updateLineKeySelections();
            this.updateMainDisplay();
            this.updateCallControls();
            return;
        }
        
        // If switching from a different line to this line...
        if (this.selectedLine && this.selectedLine !== lineNumber) {
            const previousLineState = this.lineStates.get(this.selectedLine);
            
            // Auto-hold the previous line ONLY if it's in active state (not already on hold)
            // Check both state='active' AND onHold=false to prevent toggling held calls
            if (previousLineState && 
                previousLineState.state === 'active' && 
                !previousLineState.onHold && 
                previousLineState.sessionId) {
                
                console.log(`📞 LineManager: Auto-holding active line ${this.selectedLine} when switching to line ${lineNumber}`);
                
                // Explicitly put on hold (don't toggle)
                if (this.sipManager) {
                    this.sipManager.holdSession(previousLineState.sessionId)
                        .catch(error => {
                            console.error('Failed to auto-hold previous line:', error);
                        });
                }
            } else if (previousLineState) {
                console.log(`📞 LineManager: Previous line ${this.selectedLine} state: ${previousLineState.state}, onHold: ${previousLineState.onHold} - not auto-holding`);
            }
        }
        
        // Now switch to the new line
        this.selectedLine = lineNumber;
        
        // Update SipSessionManager's selected line
        if (this.sipManager) {
            this.sipManager.selectedLine = lineNumber;
        }
        
        console.log(`📞 LineManager: Selected line ${lineNumber}`, {
            state: lineState.state,
            sessionId: lineState.sessionId
        });
        
        // Update UI to show this line's state (completely independent interface)
        this.updateLineKeySelections();
        this.updateMainDisplay();
        this.updateCallControls();
    }
    
    /**
     * Get the currently selected line number
     */
    getSelectedLine() {
        return this.selectedLine;
    }
    
    /**
     * Get session ID for selected line
     */
    getSelectedSessionId() {
        if (!this.selectedLine) return null;
        
        const lineState = this.lineStates.get(this.selectedLine);
        return lineState ? lineState.sessionId : null;
    }
    
    /**
     * Get line state for a specific line
     */
    getLineState(lineNumber) {
        return this.lineStates.get(lineNumber);
    }
    
    /**
     * Find line number by session ID
     */
    findLineBySessionId(sessionId) {
        for (const [lineNumber, lineState] of this.lineStates.entries()) {
            if (lineState.sessionId === sessionId) {
                return lineNumber;
            }
        }
        return null;
    }
    
    /**
     * Get first available (idle) line
     */
    getFirstAvailableLine() {
        for (const lineNumber of this.lines) {
            const lineState = this.lineStates.get(lineNumber);
            if (lineState && lineState.state === 'idle') {
                return lineNumber;
            }
        }
        return null;
    }
    
    /**
     * Check if any lines are available
     */
    hasAvailableLines() {
        return this.getFirstAvailableLine() !== null;
    }
    
    /**
     * Update line key UI element with current state
     */
    updateLineKeyUI(lineNumber) {
        const lineKeyElement = document.getElementById(`lineKey${lineNumber}`);
        if (!lineKeyElement) return;
        
        const lineState = this.lineStates.get(lineNumber);
        if (!lineState) return;
        
        // Remove all state classes
        lineKeyElement.classList.remove('line-idle', 'line-ringing', 'line-active', 'line-hold', 'line-calling');
        
        // Add current state class
        lineKeyElement.classList.add(`line-${lineState.state}`);
        
        // Update line info text
        const lineInfoElement = lineKeyElement.querySelector('.line-info');
        if (lineInfoElement) {
            switch (lineState.state) {
                case 'idle':
                    lineInfoElement.textContent = 'Idle';
                    break;
                case 'ringing':
                    lineInfoElement.textContent = lineState.callerInfo ? lineState.callerInfo.number : 'Ringing...';
                    break;
                case 'calling':
                    lineInfoElement.textContent = lineState.callerInfo ? lineState.callerInfo.number : 'Calling...';
                    break;
                case 'active':
                    lineInfoElement.textContent = lineState.callerInfo ? lineState.callerInfo.number : 'Active';
                    break;
                case 'hold':
                    lineInfoElement.textContent = lineState.callerInfo ? `${lineState.callerInfo.number} (Hold)` : 'On Hold';
                    break;
            }
        }
    }
    
    /**
     * Update line key selection highlights
     */
    updateLineKeySelections() {
        this.lines.forEach(lineNumber => {
            const lineKeyElement = document.getElementById(`lineKey${lineNumber}`);
            if (lineKeyElement) {
                if (lineNumber === this.selectedLine) {
                    lineKeyElement.classList.add('line-selected');
                } else {
                    lineKeyElement.classList.remove('line-selected');
                }
            }
        });
    }
    
    /**
     * Update main display (Device/Agent box) with selected line's info
     * Each line gets a completely independent display state
     */
    updateMainDisplay() {
        // Get current line state (or null if no line selected)
        const lineState = this.selectedLine ? this.lineStates.get(this.selectedLine) : null;
        
        console.log(`📞 updateMainDisplay: line ${this.selectedLine}, state: ${lineState?.state || 'none'}`);
        
        // If no line selected or line is idle, show dial interface
        if (!lineState || lineState.state === 'idle') {
            this.showIdleDisplay();
            return;
        }
        
        // Show call display for this line's specific state
        this.showCallDisplay(lineState);
    }
    
    /**
     * Show idle display (dial input visible, call info hidden)
     * This is a fresh dial interface ready for making a call
     */
    showIdleDisplay() {
        const dialInputRow = document.getElementById('dialInputRow');
        const callStatusRow = document.getElementById('callStatusRow');
        const dialInput = document.getElementById('dialInput');
        
        // Show dial input, hide call status
        if (dialInputRow) {
            dialInputRow.classList.remove('hidden');
        }
        
        if (callStatusRow) {
            callStatusRow.classList.add('hidden');
        }
        
        // Clear the dial input to show fresh interface
        if (dialInput) {
            dialInput.value = '';
        }
        
        console.log(`📞 LineManager: Showing idle display (line ${this.selectedLine || 'none'})`);
    }
    
    /**
     * Show call display with line's call information
     */
    showCallDisplay(lineState) {
        const dialInputRow = document.getElementById('dialInputRow');
        const callStatusRow = document.getElementById('callStatusRow');
        
        if (dialInputRow) {
            dialInputRow.classList.add('hidden');
        }
        
        if (callStatusRow) {
            callStatusRow.classList.remove('hidden');
            
            // Update call info
            const callerNumber = document.getElementById('callerNumber');
            const callerName = document.getElementById('callerName');
            const callDirection = document.getElementById('callDirection');
            const callDuration = document.getElementById('callDuration');
            
            if (callerNumber && lineState.callerInfo) {
                callerNumber.textContent = lineState.callerInfo.number || '--';
            }
            
            if (callerName && lineState.callerInfo && lineState.callerInfo.name) {
                callerName.textContent = lineState.callerInfo.name;
                callerName.classList.remove('hidden');
            } else if (callerName) {
                callerName.classList.add('hidden');
            }
            
            if (callDirection) {
                const directionText = lineState.direction === 'incoming' ? 'Incoming' : 'Outgoing';
                const stateText = lineState.state === 'hold' ? ' (On Hold)' : '';
                callDirection.textContent = directionText + stateText;
            }
            
            if (callDuration) {
                callDuration.textContent = this.formatDuration(lineState.duration);
            }
        }
        
        console.log(`📞 LineManager: Showing call display for line ${this.selectedLine}`);
    }
    
    /**
     * Update call control buttons based on selected line state
     * Each line gets a completely independent UI state
     */
    updateCallControls() {
        const callControls = document.getElementById('callControls');
        const callBtn = document.getElementById('callBtn');
        const hangupBtn = document.getElementById('hangupBtn');
        const muteBtn = document.getElementById('muteBtn');
        const holdBtn = document.getElementById('holdBtn');
        const transferBtn = document.getElementById('transferBtn');
        const dialpadBtn = document.getElementById('dialpadBtn');
        
        // Get current line state (or null if no line selected)
        const lineState = this.selectedLine ? this.lineStates.get(this.selectedLine) : null;
        
        // IDLE STATE: Show dial interface (Call and End Call buttons visible, call controls hidden)
        if (!lineState || lineState.state === 'idle') {
            if (callControls) callControls.classList.add('hidden');
            if (callBtn) {
                callBtn.classList.remove('hidden');
                const callBtnLabel = callBtn.querySelector('span');
                if (callBtnLabel) {
                    callBtnLabel.textContent = 'CALL';
                    callBtnLabel.setAttribute('data-translate', 'call');
                }
            }
            if (hangupBtn) hangupBtn.classList.remove('hidden');
            if (dialpadBtn) dialpadBtn.classList.remove('hidden');
            console.log(`📞 updateCallControls: IDLE state (line ${this.selectedLine || 'none'})`);
            return;
        }
        
        // RINGING STATE: Show Answer and Hangup buttons
        if (lineState.state === 'ringing') {
            if (callControls) callControls.classList.add('hidden');
            if (callBtn) {
                callBtn.classList.remove('hidden');
                const callBtnLabel = callBtn.querySelector('span');
                if (callBtnLabel) {
                    callBtnLabel.textContent = 'ANSWER';
                    callBtnLabel.setAttribute('data-translate', 'answer');
                }
            }
            if (hangupBtn) hangupBtn.classList.remove('hidden');
            if (dialpadBtn) dialpadBtn.classList.add('hidden');
            console.log(`📞 updateCallControls: RINGING state (line ${this.selectedLine})`);
            return;
        }
        
        // CALLING STATE: Show Hangup button only
        if (lineState.state === 'calling') {
            if (callControls) callControls.classList.add('hidden');
            if (callBtn) callBtn.classList.add('hidden');
            if (hangupBtn) hangupBtn.classList.remove('hidden');
            if (dialpadBtn) dialpadBtn.classList.add('hidden');
            console.log(`📞 updateCallControls: CALLING state (line ${this.selectedLine})`);
            return;
        }
        
        // ACTIVE or HOLD STATE: Show call controls (mute, hold, transfer, dialpad)
        if (lineState.state === 'active' || lineState.state === 'hold') {
            if (callControls) callControls.classList.remove('hidden');
            if (callBtn) callBtn.classList.add('hidden');
            if (hangupBtn) hangupBtn.classList.add('hidden');
            if (dialpadBtn) dialpadBtn.classList.remove('hidden');
            
            // Update mute button
            if (muteBtn) {
                const muteBtnLabel = muteBtn.querySelector('.btn-label');
                const muteBtnIcon = muteBtn.querySelector('i');
                if (lineState.muted) {
                    if (muteBtnLabel) muteBtnLabel.setAttribute('data-translate', 'unmute_button');
                    if (muteBtnIcon) muteBtnIcon.className = 'fa fa-microphone-slash';
                } else {
                    if (muteBtnLabel) muteBtnLabel.setAttribute('data-translate', 'mute_button');
                    if (muteBtnIcon) muteBtnIcon.className = 'fa fa-microphone';
                }
            }
            
            // Update hold button
            if (holdBtn) {
                const holdBtnLabel = holdBtn.querySelector('.btn-label');
                const holdBtnIcon = holdBtn.querySelector('i');
                if (lineState.onHold) {
                    if (holdBtnLabel) holdBtnLabel.setAttribute('data-translate', 'resume_button');
                    if (holdBtnIcon) holdBtnIcon.className = 'fa fa-play';
                    holdBtn.classList.remove('active');
                } else {
                    if (holdBtnLabel) holdBtnLabel.setAttribute('data-translate', 'hold_button');
                    if (holdBtnIcon) holdBtnIcon.className = 'fa fa-pause';
                    holdBtn.classList.remove('active');
                }
            }
            
            console.log(`📞 updateCallControls: ${lineState.state.toUpperCase()} state (line ${this.selectedLine})`);
            return;
        }
    }
    
    /**
     * Start duration tracking for a line
     */
    startDurationTracking(lineNumber) {
        // Clear any existing interval
        this.stopDurationTracking(lineNumber);
        
        const interval = setInterval(() => {
            const lineState = this.lineStates.get(lineNumber);
            if (lineState && lineState.state === 'active') {
                lineState.duration++;
                
                // Update UI if this is the selected line
                if (this.selectedLine === lineNumber) {
                    const callDuration = document.getElementById('callDuration');
                    if (callDuration) {
                        callDuration.textContent = this.formatDuration(lineState.duration);
                    }
                }
            }
        }, 1000);
        
        this.durationIntervals.set(lineNumber, interval);
    }
    
    /**
     * Stop duration tracking for a line
     */
    stopDurationTracking(lineNumber) {
        const interval = this.durationIntervals.get(lineNumber);
        if (interval) {
            clearInterval(interval);
            this.durationIntervals.delete(lineNumber);
        }
    }
    
    /**
     * Format duration in MM:SS format
     */
    formatDuration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    /**
     * Play call waiting tone
     */
    playCallWaitingTone() {
        // Create a simple beep tone using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 440; // A4 note
            gainNode.gain.value = 0.1; // Quiet beep
            
            oscillator.start();
            
            // Beep pattern: beep, pause, beep
            setTimeout(() => {
                oscillator.stop();
                
                // Second beep
                const oscillator2 = audioContext.createOscillator();
                const gainNode2 = audioContext.createGain();
                
                oscillator2.connect(gainNode2);
                gainNode2.connect(audioContext.destination);
                
                oscillator2.frequency.value = 440;
                gainNode2.gain.value = 0.1;
                
                oscillator2.start();
                setTimeout(() => {
                    oscillator2.stop();
                }, 200);
            }, 400);
            
            console.log('📞 Call waiting tone played');
        } catch (error) {
            console.error('Failed to play call waiting tone:', error);
        }
    }
    
    /**
     * Clean up when LineManager is destroyed
     */
    destroy() {
        // Stop all duration tracking
        this.lines.forEach(lineNumber => this.stopDurationTracking(lineNumber));
        
        console.log('📞 LineManager destroyed');
    }
}

// Create global instance
window.LineManager = new LineManager();
