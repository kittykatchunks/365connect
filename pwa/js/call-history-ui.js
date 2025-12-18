/* ====================================================================================== */
/* AUTOCAB365 PWA - CALL HISTORY UI INTEGRATION */
/* Handles UI interactions for call history functionality */
/* Version: 1.0.0 */
/* ====================================================================================== */

// Track initialization to prevent duplicates
let callHistoryUIInitialized = false;

// Initialize call history UI when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (!callHistoryUIInitialized) {
        initializeCallHistoryUI();
    }
});

// Also initialize after managers are ready
document.addEventListener('managersInitialized', function() {
    if (!callHistoryUIInitialized) {
        setTimeout(initializeCallHistoryUI, 100);
    }
});

function initializeCallHistoryUI() {
    if (callHistoryUIInitialized) {
        console.log('📞 Call history UI already initialized, skipping...');
        return;
    }
    
    if (!window.App || !window.App.managers || !window.App.managers.callHistory) {
        console.log('📞 Call history manager not ready, retrying...');
        setTimeout(initializeCallHistoryUI, 500);
        return;
    }
    
    const callHistory = window.App.managers.callHistory;
    const ui = window.App.managers.ui;
    
    console.log('📞 Initializing call history UI...');
    callHistoryUIInitialized = true;
    
    // Initialize event listeners for the history manager
    callHistory.initializeEventListeners();
    
    // Set up button event listeners
    setupHistoryButtons(callHistory, ui);
    
    // Set up search functionality
    setupHistorySearch(callHistory);
    
    // Set up view change listeners
    setupViewChangeListeners(callHistory, ui);
    
    // Listen for call history events
    setupHistoryEventListeners(callHistory);
    
    console.log('✅ Call history UI initialized');
}

function setupHistoryButtons(callHistory, ui) {
    // Clear history button
    const clearButton = document.getElementById('clearHistory');
    if (clearButton) {
        clearButton.addEventListener('click', function() {
            const historyCount = callHistory.history.length;
            
            if (historyCount === 0) {
                if (typeof showErrorNotification === 'function') {
                    showErrorNotification(t('noHistory', 'No History'), t('noCallHistoryToDelete', 'No call history to delete'));
                }
                return;
            }
            
            const confirmed = confirm(
                `⚠️ ${t('warning', 'WARNING')}: ${t('deleteAllCallHistory', 'Delete ALL Call History')}?\n\n` +
                `${t('thisWillPermanentlyDeleteAll', 'This will permanently delete all')} ${historyCount} ${t('callRecord', 'call record')}${historyCount !== 1 ? t('s', 's') : ''} ${t('fromYourHistory', 'from your history')}.\n\n` +
                `${t('thisActionCannotBeUndone', 'This action CANNOT be undone')}!\n\n` +
                `${t('areYouAbsolutelySure', 'Are you absolutely sure you want to continue')}?`
            );
            
            if (confirmed) {
                // Double confirmation for safety
                const doubleConfirmed = confirm(
                    `${t('finalConfirmation', 'FINAL CONFIRMATION')}\n\n` +
                    `${t('youAreAboutToDelete', 'You are about to delete')} ${historyCount} ${t('callRecord', 'call record')}${historyCount !== 1 ? t('s', 's') : ''}.\n\n` +
                    `${t('clickOkToPermanentlyDelete', 'Click OK to permanently delete all call history, or Cancel to abort')}.`
                );
                
                if (doubleConfirmed) {
                    callHistory.clearHistory();
                    callHistory.refreshHistoryDisplay();
                    updateHistoryStatistics(callHistory);
                    
                    if (typeof showSuccessNotification === 'function') {
                        showSuccessNotification(t('historyCleared', 'History Cleared'), `${t('allCallHistoryDeleted', 'All call history deleted')} (${historyCount} ${t('record', 'record')}${historyCount !== 1 ? t('s', 's') : ''})`);
                    }
                }
            }
        });
    }
    
    // Export history button
    const exportButton = document.getElementById('exportHistory');
    if (exportButton) {
        exportButton.addEventListener('click', function() {
            try {
                const historyData = callHistory.exportHistory();
                const dataStr = JSON.stringify(historyData, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                
                const link = document.createElement('a');
                link.href = URL.createObjectURL(dataBlob);
                link.download = `autocab365-call-history-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                if (typeof showSuccessNotification === 'function') {
                    showSuccessNotification(t('exportComplete', 'Export Complete'), t('callHistoryHasBeenDownloaded', 'Call history has been downloaded'));
                }
            } catch (error) {
                console.error('📞 Error exporting history:', error);
                if (typeof showErrorNotification === 'function') {
                    showErrorNotification(t('exportFailed', 'Export Failed'), t('couldNotExportCallHistory', 'Could not export call history'));
                }
            }
        });
    }
    
    // Refresh history button
    const refreshButton = document.getElementById('refreshHistory');
    if (refreshButton) {
        refreshButton.addEventListener('click', function() {
            callHistory.refreshHistoryDisplay();
            updateHistoryStatistics(callHistory);
            
            if (typeof showSuccessNotification === 'function') {
                showSuccessNotification(t('historyRefreshed', 'History Refreshed'), t('callHistoryHasBeenUpdated', 'Call history has been updated'));
            }
        });
    }
}

function setupHistorySearch(callHistory) {
    const searchInput = document.getElementById('historySearchInput');
    const clearSearchButton = document.getElementById('clearHistorySearch');
    
    if (searchInput) {
        let searchTimeout;
        
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            const query = this.value.trim();
            
            // Show/hide clear button
            if (clearSearchButton) {
                clearSearchButton.style.display = query ? 'block' : 'none';
            }
            
            // Debounce search
            searchTimeout = setTimeout(() => {
                performHistorySearch(callHistory, query);
            }, 300);
        });
        
        // Handle Enter key
        searchInput.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                clearTimeout(searchTimeout);
                performHistorySearch(callHistory, this.value.trim());
            }
        });
    }
    
    if (clearSearchButton) {
        clearSearchButton.addEventListener('click', function() {
            if (searchInput) {
                searchInput.value = '';
                this.style.display = 'none';
                performHistorySearch(callHistory, '');
            }
        });
    }
}

function performHistorySearch(callHistory, query) {
    const historyContainer = document.getElementById('historyContainer');
    if (!historyContainer) return;
    
    try {
        const results = callHistory.searchCalls(query);
        
        if (results.length === 0 && query) {
            historyContainer.innerHTML = `
                <div class="no-history-message">
                    <i class="fa fa-search"></i>
                    <h3>No Results Found</h3>
                    <p>No calls found matching "${query}". Try a different search term.</p>
                </div>
            `;
        } else {
            // Generate HTML for filtered results
            const html = generateFilteredHistoryHTML(results);
            historyContainer.innerHTML = html;
        }
    } catch (error) {
        console.error('📞 Error searching call history:', error);
    }
}

function generateFilteredHistoryHTML(calls) {
    if (calls.length === 0) {
        return `
            <div class="no-history-message">
                <i class="fa fa-phone-square"></i>
                <h3>No Call History</h3>
                <p>Your call history will appear here after you make or receive calls.</p>
            </div>
        `;
    }
    
    // Group calls by date
    const grouped = new Map();
    calls.forEach(call => {
        const date = formatDateForDisplay(call.timestamp);
        if (!grouped.has(date)) {
            grouped.set(date, []);
        }
        grouped.get(date).push(call);
    });
    
    let html = '';
    for (const [date, dateCalls] of grouped) {
        html += `<div class="history-date-group">`;
        html += `<div class="history-date-header">${date}</div>`;
        
        dateCalls.forEach(call => {
            html += generateCallItemHTML(call);
        });
        
        html += `</div>`;
    }
    
    return html;
}

function generateCallItemHTML(call) {
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
    const duration = call.duration > 0 ? formatDuration(call.duration) : '';
    const timeWithDate = formatTimeWithDate(call.timestamp);
    
    return `
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
}

// Global variable to prevent multiple simultaneous callbacks
let callbackInProgress = false;

function setupViewChangeListeners(callHistory, ui) {
    // Listen for navigation tab clicks
    document.addEventListener('click', function(event) {
        const navTab = event.target.closest('.nav-tab');
        if (navTab && navTab.dataset.view === 'activity') {
            setTimeout(() => {
                callHistory.refreshHistoryDisplay();
                updateHistoryStatistics(callHistory);
            }, 100);
        }
        
        // Handle callback button clicks from dynamically generated history items
        const callbackButton = event.target.closest('.callback-button');
        if (callbackButton) {
            event.preventDefault();
            event.stopPropagation();
            
            // Prevent multiple simultaneous callbacks
            if (callbackInProgress) {
                console.log('📞 Callback already in progress, ignoring click');
                return;
            }
            
            const number = callbackButton.dataset.number;
            if (number) {
                callbackInProgress = true;
                console.log('📞 Callback button clicked for number:', number);
                
                // Disable the button temporarily
                callbackButton.disabled = true;
                callbackButton.style.opacity = '0.5';
                
                try {
                    // Switch to dial tab using multiple methods to ensure it works
                    if (window.App && window.App.managers && window.App.managers.ui && typeof window.App.managers.ui.setCurrentView === 'function') {
                        window.App.managers.ui.setCurrentView('dial');
                        console.log('📞 Switched to dial tab using UI manager');
                    } else {
                        // Fallback: simulate clicking the dial tab
                        const dialTab = document.getElementById('navDial');
                        if (dialTab) {
                            dialTab.click();
                            console.log('📞 Switched to dial tab by simulating click');
                        }
                    }
                    
                    // Set the number in the dial input and focus it
                    setTimeout(() => {
                        const dialInput = document.getElementById('dialInput');
                        if (dialInput) {
                            dialInput.value = number;
                            dialInput.focus();
                            console.log('📞 Set dial input to:', number);
                            
                            // Trigger input event to update any dependent UI
                            dialInput.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                        
                        // Auto-dial the number
                        if (window.App && window.App.managers && window.App.managers.sip) {
                            setTimeout(() => {
                                window.App.managers.sip.makeCall(number)
                                    .then(() => {
                                        console.log('📞 Successfully initiated callback to:', number);
                                    })
                                    .catch((error) => {
                                        console.error('📞 Failed to initiate callback:', error);
                                    })
                                    .finally(() => {
                                        // Reset callback state after 2 seconds
                                        setTimeout(() => {
                                            callbackInProgress = false;
                                            callbackButton.disabled = false;
                                            callbackButton.style.opacity = '1';
                                        }, 2000);
                                    });
                            }, 300); // Small delay to ensure UI is fully updated
                        } else {
                            // Reset if SIP manager not available
                            setTimeout(() => {
                                callbackInProgress = false;
                                callbackButton.disabled = false;
                                callbackButton.style.opacity = '1';
                            }, 1000);
                        }
                    }, 150); // Slightly longer delay to ensure tab switch is complete
                } catch (error) {
                    console.error('📞 Error during callback:', error);
                    callbackInProgress = false;
                    callbackButton.disabled = false;
                    callbackButton.style.opacity = '1';
                }
            }
        }
    });
}

function setupHistoryEventListeners(callHistory) {
    // Listen for call added events
    callHistory.addEventListener('callAdded', function(event) {
        const { call, totalCount } = event.detail;
        console.log('📞 New call added to history:', call);
        
        // Update statistics if activity view is active
        const activityArea = document.getElementById('activityArea');
        if (activityArea && !activityArea.classList.contains('hidden')) {
            updateHistoryStatistics(callHistory);
        }
    });
    
    // Listen for history cleared events
    callHistory.addEventListener('historyCleared', function() {
        console.log('📞 Call history cleared');
        updateHistoryStatistics(callHistory);
    });
    
    // Listen for call removed events
    callHistory.addEventListener('callRemoved', function(event) {
        console.log('📞 Call removed from history:', event.detail);
        updateHistoryStatistics(callHistory);
    });
}

function updateHistoryStatistics(callHistory) {
    const stats = callHistory.getStatistics();
    
    // Update stat displays
    const totalElement = document.getElementById('totalCalls');
    const incomingElement = document.getElementById('incomingCalls');
    const outgoingElement = document.getElementById('outgoingCalls');
    const missedElement = document.getElementById('missedCalls');
    
    if (totalElement) totalElement.textContent = stats.total;
    if (incomingElement) incomingElement.textContent = stats.incoming;
    if (outgoingElement) outgoingElement.textContent = stats.outgoing;
    if (missedElement) missedElement.textContent = stats.missed;
}

// Utility functions
function formatDuration(seconds) {
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

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatTimeWithDate(timestamp) {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    if (isSameDay(date, today)) {
        return `${timeString} Today`;
    } else if (isSameDay(date, yesterday)) {
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

function formatDateForDisplay(timestamp) {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (isSameDay(date, today)) {
        return 'Today';
    } else if (isSameDay(date, yesterday)) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString([], { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }
}

function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

// Make functions available globally for debugging
window.CallHistoryUI = {
    updateHistoryStatistics,
    performHistorySearch,
    generateFilteredHistoryHTML
};