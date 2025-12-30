/* ====================================================================================== */
/* AUTOCAB365 PWA - CALL HISTORY MANAGER */
/* Manages call history with max 500 entries, date grouping, and callback functionality */
/* Version: 1.0.0 */
/* ====================================================================================== */

class CallHistoryManager extends EventTarget {
    constructor() {
        super();
        
        this.maxEntries = 500;
        this.history = []; // Array of call records
        this.storageKey = 'AutocabCallHistory';
        
        // Load existing history from storage
        this.loadHistory();
        
        console.log('📞 CallHistoryManager initialized with', this.history.length, 'entries');
    }

    // Add a new call to history
    addCall(callData) {
        const callRecord = {
            id: this.generateCallId(),
            number: callData.number || t('unknown', 'Unknown'),
            name: callData.name || null,
            direction: callData.direction, // 'incoming' or 'outgoing'
            timestamp: callData.timestamp || Date.now(),
            duration: callData.duration || 0, // Duration in seconds
            status: callData.status || 'completed', // 'completed', 'missed', 'cancelled'
            date: this.formatDate(callData.timestamp || Date.now())
        };

        // Add to beginning of array (most recent first)
        this.history.unshift(callRecord);

        // Maintain maximum entries
        if (this.history.length > this.maxEntries) {
            this.history = this.history.slice(0, this.maxEntries);
        }

        // Save to storage
        this.saveHistory();

        // Emit event for UI updates
        this.dispatchEvent(new CustomEvent('callAdded', { 
            detail: { call: callRecord, totalCount: this.history.length }
        }));

        console.log('📞 Call added to history:', callRecord);
        return callRecord;
    }

    // Get all call history
    getHistory() {
        return [...this.history]; // Return copy to prevent direct manipulation
    }

    // Get history grouped by date
    getGroupedHistory() {
        const grouped = new Map();
        
        this.history.forEach(call => {
            const date = this.formatDate(call.timestamp);
            if (!grouped.has(date)) {
                grouped.set(date, []);
            }
            grouped.get(date).push(call);
        });

        return grouped;
    }

    // Get calls for a specific date
    getCallsForDate(date) {
        return this.history.filter(call => call.date === date);
    }

    // Search calls by number or name
    searchCalls(query) {
        if (!query || query.trim() === '') {
            return this.getHistory();
        }

        const searchTerm = query.toLowerCase().trim();
        return this.history.filter(call => {
            const numberMatch = call.number.toLowerCase().includes(searchTerm);
            const nameMatch = call.name && call.name.toLowerCase().includes(searchTerm);
            return numberMatch || nameMatch;
        });
    }

    // Clear all history
    clearHistory() {
        this.history = [];
        this.saveHistory();
        this.dispatchEvent(new CustomEvent('historyCleared'));
        console.log('📞 Call history cleared');
    }

    // Remove a specific call
    removeCall(callId) {
        const index = this.history.findIndex(call => call.id === callId);
        if (index !== -1) {
            const removedCall = this.history.splice(index, 1)[0];
            this.saveHistory();
            this.dispatchEvent(new CustomEvent('callRemoved', { detail: removedCall }));
            console.log('📞 Call removed from history:', removedCall);
            return true;
        }
        return false;
    }

    // Remove duplicate entries (useful for cleanup)
    removeDuplicates() {
        const seen = new Set();
        const uniqueHistory = [];
        
        for (const call of this.history) {
            // Create a key based on number, direction, and timestamp (within 1 second)
            const timestamp = Math.floor(call.timestamp / 1000) * 1000; // Round to nearest second
            const key = `${call.number}-${call.direction}-${timestamp}`;
            
            if (!seen.has(key)) {
                seen.add(key);
                uniqueHistory.push(call);
            }
        }
        
        const duplicatesRemoved = this.history.length - uniqueHistory.length;
        if (duplicatesRemoved > 0) {
            this.history = uniqueHistory;
            this.saveHistory();
            console.log(`📞 Removed ${duplicatesRemoved} duplicate entries from call history`);
            this.dispatchEvent(new CustomEvent('duplicatesRemoved', { detail: { count: duplicatesRemoved } }));
        }
        
        return duplicatesRemoved;
    }

    // Get statistics
    getStatistics() {
        const stats = {
            total: this.history.length,
            incoming: 0,
            outgoing: 0,
            missed: 0,
            completed: 0,
            totalDuration: 0,
            averageDuration: 0
        };

        this.history.forEach(call => {
            if (call.direction === 'incoming') stats.incoming++;
            if (call.direction === 'outgoing') stats.outgoing++;
            if (call.status === 'missed') stats.missed++;
            if (call.status === 'completed') stats.completed++;
            stats.totalDuration += call.duration;
        });

        stats.averageDuration = stats.total > 0 ? Math.round(stats.totalDuration / stats.total) : 0;

        return stats;
    }

    // Format call duration
    formatDuration(seconds) {
        if (seconds < 60) {
            return `${seconds}s`;
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return `${minutes}m ${remainingSeconds}s`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return `${hours}h ${minutes}m`;
        }
    }

    // Format timestamp for display
    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Format timestamp with date for display in call items
    formatTimeWithDate(timestamp) {
        const date = new Date(timestamp);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        if (this.isSameDay(date, today)) {
            return `${timeString} Today`;
        } else if (this.isSameDay(date, yesterday)) {
            return `${timeString} Yesterday`;
        } else {
            const dateString = date.toLocaleDateString([], { 
                month: 'short', 
                day: 'numeric',
                year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
            });
            return `${timeString} ${dateString}`;
        }
    }

    // Format date for grouping
    formatDate(timestamp) {
        const date = new Date(timestamp);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (this.isSameDay(date, today)) {
            return t('today', 'Today');
        } else if (this.isSameDay(date, yesterday)) {
            return t('yesterday', 'Yesterday');
        } else {
            return date.toLocaleDateString([], { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        }
    }

    // Check if two dates are the same day
    isSameDay(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }

    // Generate unique call ID
    generateCallId() {
        return 'call_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Load history from localStorage
    loadHistory() {
        try {
            if (window.localDB && typeof window.localDB.getItem === 'function') {
                const stored = window.localDB.getItem(this.storageKey, '[]');
                this.history = JSON.parse(stored) || [];
            } else {
                const stored = localStorage.getItem(this.storageKey);
                this.history = stored ? JSON.parse(stored) : [];
            }
            
            // Validate and clean up data
            this.history = this.history.filter(call => 
                call && call.id && call.number && call.direction && call.timestamp
            );

            console.log('📞 Loaded', this.history.length, 'call history entries');
        } catch (error) {
            console.error('📞 Error loading call history:', error);
            this.history = [];
        }
    }

    // Save history to localStorage
    saveHistory() {
        try {
            const dataToSave = JSON.stringify(this.history);
            
            if (window.localDB && typeof window.localDB.setItem === 'function') {
                window.localDB.setItem(this.storageKey, dataToSave);
            } else {
                localStorage.setItem(this.storageKey, dataToSave);
            }
        } catch (error) {
            console.error('📞 Error saving call history:', error);
        }
    }

    // Generate HTML for call history list
    generateHistoryHTML() {
        if (this.history.length === 0) {
            return `
                <div class="no-history-message">
                    <i class="fa fa-phone-square"></i>
                    <h3>No Call History</h3>
                    <p>Your call history will appear here after you make or receive calls.</p>
                </div>
            `;
        }

        const grouped = this.getGroupedHistory();
        let html = '';

        for (const [date, calls] of grouped) {
            html += `<div class="history-date-group">`;
            html += `<div class="history-date-header">${date}</div>`;
            
            calls.forEach(call => {
                // Determine icon based on status and direction
                let directionIcon;
                if (call.status === 'missed') {
                    directionIcon = 'fa-times'; // X icon for missed calls
                } else if (call.direction === 'incoming') {
                    directionIcon = 'fa-arrow-down';
                } else {
                    directionIcon = 'fa-arrow-up';
                }
                
                const directionClass = call.direction === 'incoming' ? 'incoming' : 'outgoing';
                const statusClass = call.status === 'missed' ? 'missed' : 'completed';
                const displayName = call.name || call.number;
                const displayNumber = call.name ? call.number : '';
                const duration = call.duration > 0 ? this.formatDuration(call.duration) : '';
                const timeWithDate = this.formatTimeWithDate(call.timestamp);

                html += `
                    <div class="history-item ${directionClass} ${statusClass}" data-call-id="${call.id}">
                        <div class="call-direction">
                            <i class="fa ${directionIcon}"></i>
                        </div>
                        <div class="call-info">
                            <div class="call-name">${displayName}</div>
                            ${displayNumber ? `<div class="call-number">${displayNumber}</div>` : ''}
                            <div class="call-details">
                                <span class="call-time">${timeWithDate}</span>
                                ${duration ? `<span class="call-duration">${duration}</span>` : ''}
                                ${call.status === 'missed' ? '<span class="missed-indicator">Missed</span>' : ''}
                            </div>
                        </div>
                        <div class="call-actions">
                            <button class="callback-button" data-number="${call.number}" title="Call back">
                                <i class="fa fa-phone"></i>
                            </button>
                            <button class="remove-call-button" data-call-id="${call.id}" title="Remove from history">
                                <i class="fa fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
            
            html += `</div>`;
        }

        return html;
    }

    // Initialize event listeners for history UI
    initializeEventListeners() {
        // Only handle remove call button clicks here - callback buttons are handled elsewhere
        document.addEventListener('click', (event) => {
            // Handle remove call button clicks
            if (event.target.closest('.remove-call-button')) {
                const button = event.target.closest('.remove-call-button');
                const callId = button.dataset.callId;
                if (callId && confirm('Remove this call from history?')) {
                    this.removeCall(callId);
                    this.refreshHistoryDisplay();
                }
            }
        });
    }

    // Refresh the history display
    refreshHistoryDisplay() {
        const historyContainer = document.getElementById('historyContainer');
        if (historyContainer) {
            historyContainer.innerHTML = this.generateHistoryHTML();
        }
    }

    // Update statistics display
    updateStatistics() {
        const stats = this.getStatistics();
        
        const totalElement = document.getElementById('totalCalls');
        const incomingElement = document.getElementById('incomingCalls');
        const outgoingElement = document.getElementById('outgoingCalls');
        const missedElement = document.getElementById('missedCalls');
        
        if (totalElement) totalElement.textContent = stats.total;
        if (incomingElement) incomingElement.textContent = stats.incoming;
        if (outgoingElement) outgoingElement.textContent = stats.outgoing;
        if (missedElement) missedElement.textContent = stats.missed;
    }

    // Export history as JSON
    exportHistory() {
        return {
            version: '1.0.0',
            exportDate: new Date().toISOString(),
            totalEntries: this.history.length,
            statistics: this.getStatistics(),
            calls: this.history
        };
    }

    // Import history from JSON
    importHistory(data) {
        try {
            if (data && data.calls && Array.isArray(data.calls)) {
                this.history = data.calls.filter(call => 
                    call && call.id && call.number && call.direction && call.timestamp
                );
                
                // Maintain max entries
                if (this.history.length > this.maxEntries) {
                    this.history = this.history.slice(0, this.maxEntries);
                }
                
                this.saveHistory();
                this.dispatchEvent(new CustomEvent('historyImported', { 
                    detail: { count: this.history.length }
                }));
                
                console.log('📞 Imported', this.history.length, 'call history entries');
                return true;
            }
            return false;
        } catch (error) {
            console.error('📞 Error importing call history:', error);
            return false;
        }
    }
}

// Make CallHistoryManager available globally
window.CallHistoryManager = CallHistoryManager;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CallHistoryManager;
}