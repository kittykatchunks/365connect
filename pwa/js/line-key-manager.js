/**
 * LineKeyManager - Manages multi-line call state for Connect365 PWA
 * Tracks up to 3 simultaneous SIP sessions across separate line keys
 * 
 * @class LineKeyManager
 * @author Connect365
 * @date January 7, 2026
 */

class LineKeyManager {
    constructor() {
        // Configuration
        this.maxLines = 3;
        this.selectedLine = 1; // Default to Line 1 on startup
        
        // Line state tracking
        // Map: lineNumber -> { sessionId, state, startTime, callerInfo }
        this.lines = new Map();
        
        // Initialize all lines as idle
        for (let i = 1; i <= this.maxLines; i++) {
            this.lines.set(i, {
                sessionId: null,
                state: 'idle',
                startTime: null,
                callerInfo: null
            });
        }
        
        // Line state constants
        this.states = {
            IDLE: 'idle',           // No call, line available
            RINGING: 'ringing',     // Incoming call ringing
            ACTIVE: 'active',       // Active call in progress
            HOLD: 'hold',           // Call on hold
            DIALING: 'dialing'      // Outgoing call connecting
        };
        
        // Event listeners
        this.listeners = new Map();
        
        console.log('✅ LineKeyManager initialized:', {
            maxLines: this.maxLines,
            selectedLine: this.selectedLine,
            initialState: 'all lines idle'
        });
    }
    
    // ==================== Event Management ====================
    
    /**
     * Register event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
        return () => this.off(event, callback);
    }
    
    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
    }
    
    /**
     * Emit event to all listeners
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in LineKeyManager listener for ${event}:`, error);
                }
            });
        }
    }
    
    // ==================== Line Selection ====================
    
    /**
     * Get currently selected line number
     * @returns {number} Selected line number (1-3)
     */
    getSelectedLine() {
        return this.selectedLine;
    }
    
    /**
     * Select a specific line (auto-holds previous line if needed)
     * @param {number} lineNumber - Line to select (1-3)
     * @returns {boolean} Success status
     */
    selectLine(lineNumber) {
        if (lineNumber < 1 || lineNumber > this.maxLines) {
            console.error(`Invalid line number: ${lineNumber}`);
            return false;
        }
        
        if (this.selectedLine === lineNumber) {
            console.log(`Line ${lineNumber} already selected`);
            return true;
        }
        
        const previousLine = this.selectedLine;
        this.selectedLine = lineNumber;
        
        console.log(`📞 Line switched: ${previousLine} → ${lineNumber}`);
        
        // Emit line change event (SipSessionManager will handle auto-hold)
        this.emit('lineChanged', {
            previousLine: previousLine,
            currentLine: lineNumber,
            lineState: this.getLineState(lineNumber)
        });
        
        return true;
    }
    
    // ==================== Line State Management ====================
    
    /**
     * Get state of a specific line
     * @param {number} lineNumber - Line number (1-3)
     * @returns {Object} Line state object
     */
    getLineState(lineNumber) {
        if (!this.lines.has(lineNumber)) {
            return null;
        }
        return { ...this.lines.get(lineNumber) };
    }
    
    /**
     * Update line state
     * @param {number} lineNumber - Line number (1-3)
     * @param {string} state - New state (idle|ringing|active|hold|dialing)
     * @param {string|null} sessionId - Associated session ID
     * @param {Object|null} callerInfo - Caller information
     */
    updateLineState(lineNumber, state, sessionId = null, callerInfo = null) {
        if (!this.lines.has(lineNumber)) {
            console.error(`Invalid line number: ${lineNumber}`);
            return;
        }
        
        const line = this.lines.get(lineNumber);
        const previousState = line.state;
        
        line.state = state;
        line.sessionId = sessionId;
        
        // Set start time when call becomes active
        if (state === this.states.ACTIVE && !line.startTime) {
            line.startTime = Date.now();
        }
        
        // Clear start time when returning to idle
        if (state === this.states.IDLE) {
            line.startTime = null;
            line.sessionId = null;
            line.callerInfo = null;
        } else if (callerInfo) {
            line.callerInfo = callerInfo;
        }
        
        console.log(`📊 Line ${lineNumber} state updated: ${previousState} → ${state}`, {
            sessionId: sessionId || 'none',
            caller: callerInfo?.remoteIdentity || 'unknown'
        });
        
        // Emit state change event
        this.emit('lineStateChanged', {
            lineNumber: lineNumber,
            previousState: previousState,
            currentState: state,
            sessionId: sessionId,
            callerInfo: callerInfo
        });
    }
    
    /**
     * Clear a line (return to idle state)
     * @param {number} lineNumber - Line number (1-3)
     */
    clearLine(lineNumber) {
        this.updateLineState(lineNumber, this.states.IDLE, null, null);
    }
    
    // ==================== Line Availability ====================
    
    /**
     * Check if a line is available (idle)
     * @param {number} lineNumber - Line number (1-3)
     * @returns {boolean} True if line is idle
     */
    isLineAvailable(lineNumber) {
        const line = this.lines.get(lineNumber);
        return line && line.state === this.states.IDLE;
    }
    
    /**
     * Get first available (idle) line number
     * @returns {number|null} Line number or null if all busy
     */
    getAvailableLine() {
        for (let i = 1; i <= this.maxLines; i++) {
            if (this.isLineAvailable(i)) {
                return i;
            }
        }
        return null;
    }
    
    /**
     * Check if all lines are busy
     * @returns {boolean} True if no lines available
     */
    areAllLinesBusy() {
        return this.getAvailableLine() === null;
    }
    
    /**
     * Get count of active lines (not idle)
     * @returns {number} Number of lines in use
     */
    getActiveLineCount() {
        let count = 0;
        for (let i = 1; i <= this.maxLines; i++) {
            if (!this.isLineAvailable(i)) {
                count++;
            }
        }
        return count;
    }
    
    // ==================== Session Mapping ====================
    
    /**
     * Get line number associated with a session ID
     * @param {string} sessionId - SIP session ID
     * @returns {number|null} Line number or null if not found
     */
    getLineBySession(sessionId) {
        if (!sessionId) return null;
        
        for (let [lineNumber, lineData] of this.lines.entries()) {
            if (lineData.sessionId === sessionId) {
                return lineNumber;
            }
        }
        return null;
    }
    
    /**
     * Get session ID for a specific line
     * @param {number} lineNumber - Line number (1-3)
     * @returns {string|null} Session ID or null
     */
    getSessionByLine(lineNumber) {
        const line = this.lines.get(lineNumber);
        return line ? line.sessionId : null;
    }
    
    /**
     * Get all active lines with their details
     * @returns {Array} Array of line objects
     */
    getActiveLines() {
        const activeLines = [];
        for (let i = 1; i <= this.maxLines; i++) {
            const line = this.lines.get(i);
            if (line.state !== this.states.IDLE) {
                activeLines.push({
                    lineNumber: i,
                    ...line
                });
            }
        }
        return activeLines;
    }
    
    /**
     * Get all ringing lines
     * @returns {Array} Array of line numbers
     */
    getRingingLines() {
        const ringing = [];
        for (let i = 1; i <= this.maxLines; i++) {
            const line = this.lines.get(i);
            if (line.state === this.states.RINGING) {
                ringing.push(i);
            }
        }
        return ringing;
    }
    
    // ==================== Line Information ====================
    
    /**
     * Get formatted line information for display
     * @param {number} lineNumber - Line number (1-3)
     * @returns {Object} Display information
     */
    getLineDisplayInfo(lineNumber) {
        const line = this.lines.get(lineNumber);
        if (!line) return null;
        
        const info = {
            lineNumber: lineNumber,
            state: line.state,
            label: `Line ${lineNumber}`,
            statusText: this.getStateLabel(line.state),
            duration: null,
            callerDisplay: null
        };
        
        // Calculate duration for active/hold calls
        if (line.startTime && (line.state === this.states.ACTIVE || line.state === this.states.HOLD)) {
            const elapsed = Math.floor((Date.now() - line.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            info.duration = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        // Caller information
        if (line.callerInfo) {
            info.callerDisplay = line.callerInfo.displayName || line.callerInfo.remoteNumber || 'Unknown';
        }
        
        return info;
    }
    
    /**
     * Get human-readable state label
     * @param {string} state - State constant
     * @returns {string} Display label
     */
    getStateLabel(state) {
        const labels = {
            'idle': 'Idle',
            'ringing': 'Ringing',
            'active': 'Active',
            'hold': 'On Hold',
            'dialing': 'Dialing...'
        };
        return labels[state] || state;
    }
    
    // ==================== Validation ====================
    
    /**
     * Validate line number is within range
     * @param {number} lineNumber - Line number to validate
     * @returns {boolean} True if valid
     */
    isValidLineNumber(lineNumber) {
        return lineNumber >= 1 && lineNumber <= this.maxLines;
    }
    
    // ==================== Debug ====================
    
    /**
     * Get complete state for debugging
     * @returns {Object} Complete state snapshot
     */
    getDebugState() {
        const state = {
            selectedLine: this.selectedLine,
            lines: {}
        };
        
        for (let i = 1; i <= this.maxLines; i++) {
            state.lines[`line${i}`] = this.getLineDisplayInfo(i);
        }
        
        return state;
    }
    
    /**
     * Log current state to console
     */
    logState() {
        console.log('📊 LineKeyManager State:', this.getDebugState());
    }
}

// Export for use in other modules and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LineKeyManager;
}

// Also expose to global window object for browser usage
if (typeof window !== 'undefined') {
    window.LineKeyManager = LineKeyManager;
}
