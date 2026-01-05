/* ====================================================================================== */
// Attach event listeners for settings tab actions (CSP compliant)
document.addEventListener('DOMContentLoaded', function() {
    var saveBtn = document.getElementById('saveSettingsBtn');
    var resetBtn = document.getElementById('resetSettingsBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            if (typeof saveSettings === 'function') saveSettings();
        });
    }
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            if (typeof resetSettings === 'function') resetSettings();
        });
    }
});
/* AUTOCAB365CONNECT PWA - MAIN APPLICATION */
/* ====================================================================================== */

// Global application state
const App = {
    version: "0.1.001",
    initialized: false,
    managers: {
        sip: null,
        ui: null,
        busylight: null
    },
    config: {
        server: null,
        credentials: {},
        features: {},
        theme: 'auto'
    },
    timers: new Map(), // Call timers
    buddies: [], // Buddy list
    currentUser: null
};

// Global variables - consolidated
let dbStatsInterval = null;
const notificationQueue = [];

// Store last dialed number for redial functionality
let lastDialedNumber = '';

/* ====================================================================================== */
/* DIAL INPUT MANAGEMENT */
/* ====================================================================================== */

function clearDialInput() {
    const dialInput = document.getElementById('dialInput');
    if (dialInput) {
        dialInput.value = '';
        console.log('📞 Dial input cleared');
    }
}

function getLastDialedNumber() {
    // Try to get from localStorage first for persistence across sessions
    if (window.localDB) {
        const saved = window.localDB.getItem('LastDialedNumber', '');
        if (saved) {
            lastDialedNumber = saved;
        }
    }
    return lastDialedNumber;
}

function setLastDialedNumber(number) {
    if (number && number.trim()) {
        lastDialedNumber = number.trim();
        // Save to localStorage for persistence
        if (window.localDB) {
            window.localDB.setItem('LastDialedNumber', lastDialedNumber);
        }
        console.log('📞 Last dialed number saved:', lastDialedNumber);
    }
}

/* ====================================================================================== */
/* SIP FUNCTIONS */
/* ====================================================================================== */

async function makeCall() {
    if (!App.managers.sip) {
        console.error('SIP manager not available');
        showError(t('phoneSystemNotReady', 'Phone system not ready'));
        return;
    }
    
    // Check if there's an incoming call to answer
    const incomingSession = App.managers.sip.getIncomingSession();
    if (incomingSession) {
        console.log('Answering incoming call:', incomingSession.id);
        try {
            await App.managers.sip.answerCall(incomingSession.id);
            console.log('Incoming call answered successfully');
            return;
        } catch (error) {
            console.error('Failed to answer incoming call:', error);
            showError(t('failedToAnswerCall', 'Failed to answer call') + ': ' + error.message);
            return;
        }
    }
    
    // No incoming call, proceed with outgoing call
    const dialInput = document.getElementById('dialInput');
    if (!dialInput) {
        console.error('Dial input not found');
        return;
    }

    const number = dialInput.value.trim();
    
    // If input is empty, implement redial functionality
    if (!number) {
        const lastNumber = getLastDialedNumber();
        
        if (lastNumber) {
            // First click: populate input with last dialed number
            dialInput.value = lastNumber;
            console.log('📞 Redial: Populated input with last dialed number:', lastNumber);
            showInfo(`Press CALL again to redial ${lastNumber}`);
            return;
        } else {
            showError(t('pleaseEnterNumberToCall', 'Please enter a number to call'));
            return;
        }
    }

    if (!isValidPhoneNumber(number)) {
        showError(t('pleaseEnterValidPhoneNumber', 'Please enter a valid phone number'));
        return;
    }

    console.log('Making outgoing call to:', number);

    try {
        // Save this number as the last dialed before making the call
        setLastDialedNumber(number);
        
        await App.managers.sip.makeCall(number);
        console.log('Outgoing call initiated successfully');
        
        // Clear the input after successful call initiation
        clearDialInput();
        
    } catch (error) {
        console.error('Failed to make outgoing call:', error);
        showError('Failed to make call: ' + error.message);
    }
}

async function answerCall(sessionId) {
    console.log('Answering call:', sessionId);
    
    if (App.managers.sip) {
        try {
            await App.managers.sip.answerCall(sessionId);
        } catch (error) {
            console.error('Failed to answer call:', error);
            showError(t('failedToAnswerCall', 'Failed to answer call') + ': ' + error.message);
        }
    } else {
        console.error('SIP manager not available');
    }
}

async function hangupCall(sessionId = null) {
    console.log('Hanging up call:', sessionId);
    
    if (App.managers.sip) {
        try {
            await App.managers.sip.hangupCall(sessionId);
        } catch (error) {
            console.error('Failed to hangup call:', error);
        }
    } else {
        console.error('SIP manager not available');
    }
}

async function toggleMute(sessionId = null) {
    if (!App.managers.sip) {
        console.error('SIP manager not available');
        return;
    }
    
    try {
        await App.managers.sip.toggleMute(sessionId);
        
    } catch (error) {
        console.error('Failed to toggle mute:', error);
        showError('Failed to toggle mute: ' + error.message);
    }
}

async function toggleHold(sessionId = null) {
    console.log('🔄 Toggle hold called with sessionId:', sessionId);
    
    if (!App.managers.sip) {
        console.error('❌ SIP manager not available');
        return;
    }
    
    try {
        console.log('📞 Calling SIP manager toggleHold');
        await App.managers.sip.toggleHold(sessionId);
        console.log('✅ Hold toggle successful');
        
    } catch (error) {
        console.error('❌ Failed to toggle hold:', error);
        showError('Failed to toggle hold: ' + error.message);
    }
}

// Global flag to track if call was auto-held for transfer
let autoHeldForTransfer = false;

async function showTransferModal() {
    console.log('🔄 Opening transfer modal');
    const modal = document.getElementById('transferModal');
    const transferInput = document.getElementById('transferNumber');
    const transferActions = document.getElementById('transferActions');
    const attendedActions = document.getElementById('attendedActions');
    
    console.log('Modal elements found:', {
        modal: !!modal,
        transferInput: !!transferInput,
        transferActions: !!transferActions,
        attendedActions: !!attendedActions
    });
    
    // Automatically put call on hold when transfer modal opens
    if (App.managers.sip) {
        try {
            const activeSession = App.managers.sip.getCurrentSession();
            if (activeSession && !activeSession.onHold) {
                console.log('📞 Automatically putting call on hold for transfer');
                await App.managers.sip.toggleHold();
                autoHeldForTransfer = true; // Track that we auto-held the call
                console.log('✅ Call put on hold for transfer');
            } else {
                autoHeldForTransfer = false; // Call was already on hold
            }
        } catch (error) {
            console.error('❌ Failed to put call on hold for transfer:', error);
            autoHeldForTransfer = false;
        }
    }
    
    if (modal) {
        // Reset modal state
        if (transferInput) {
            transferInput.value = '';
        }
        if (transferActions) {
            transferActions.classList.remove('hidden');
        }
        if (attendedActions) {
            attendedActions.classList.add('hidden');
        }
        
        modal.classList.add('show');
        console.log('✅ Modal shown, focusing input');
        
        // Focus after a short delay to ensure modal is visible
        setTimeout(() => {
            if (transferInput) {
                // Force focus and selection
                transferInput.focus();
                transferInput.select();
                transferInput.click(); // Force interaction
                
                console.log('✅ Input focused and selected', {
                    focused: document.activeElement === transferInput,
                    value: transferInput.value,
                    disabled: transferInput.disabled,
                    readonly: transferInput.readOnly,
                    tabIndex: transferInput.tabIndex,
                    style: getComputedStyle(transferInput).pointerEvents
                });
            }
        }, 150);
    } else {
        console.error('❌ Transfer modal not found in DOM');
    }
}

async function hideTransferModal(transferCompleted = false) {
    const modal = document.getElementById('transferModal');
    if (modal) {
        modal.classList.remove('show');
        
        // Reset transfer modal UI state when closing
        const transferActions = document.getElementById('transferActions');
        const attendedActions = document.getElementById('attendedActions');
        const transferInputSection = document.querySelector('.transfer-input-section');
        const completeTransferBtn = document.getElementById('completeTransferBtn');
        const attendedStatusText = document.querySelector('.attended-status');
        
        if (transferActions) {
            transferActions.classList.remove('hidden');
        }
        if (attendedActions) {
            attendedActions.classList.add('hidden');
        }
        if (transferInputSection) {
            transferInputSection.classList.remove('hidden');
        }
        if (attendedStatusText) {
            attendedStatusText.textContent = 'Calling transfer target...';
        }
        if (completeTransferBtn) {
            completeTransferBtn.disabled = false;
            completeTransferBtn.style.opacity = '1';
            completeTransferBtn.style.cursor = 'pointer';
        }
        
        // Clear transfer session reference
        window.currentTransferSession = null;
        
        // If call was auto-held for transfer and transfer was cancelled (not completed), resume the call
        if (autoHeldForTransfer && !transferCompleted && App.managers.sip) {
            try {
                const activeSession = App.managers.sip.getCurrentSession();
                if (activeSession && activeSession.onHold) {
                    console.log('📞 Transfer cancelled, resuming call from hold');
                    await App.managers.sip.toggleHold();
                    console.log('✅ Call resumed after transfer cancellation');
                }
            } catch (error) {
                console.error('❌ Failed to resume call after transfer cancellation:', error);
            }
        }
        
        // Reset the flag
        autoHeldForTransfer = false;
    }
}

async function performBlindTransfer() {
    const transferNumber = document.getElementById('transferNumber').value.trim();
    if (!transferNumber) {
        showError('Please enter a number to transfer to');
        return;
    }
    
    if (!App.managers.sip) {
        console.error('SIP manager not available');
        return;
    }
    
    try {
        console.log('🚀 performBlindTransfer starting...');
        console.log('📊 SIP Manager check:', !!App.managers.sip);
        console.log('🔍 blindTransfer method exists:', typeof App.managers.sip.blindTransfer);
        
        const session = App.managers.sip.getCurrentSession();
        console.log('📞 Current session:', session ? session.id : 'none');
        if (!session) {
            console.error('No active session for transfer');
            showError('No active call to transfer');
            return;
        }

        // Show immediate feedback
        showInfo(`Initiating blind transfer to ${transferNumber}...`);

        console.log('🎯 About to call blindTransfer method...');
        // Start the blind transfer - the response handlers will manage completion
        await App.managers.sip.blindTransfer(session.id, transferNumber);
        console.log('✅ blindTransfer method completed');        // Note: Don't hide modal or show success here - the REFER response handlers will do that
        
    } catch (error) {
        console.error('Failed to perform blind transfer:', error);
        showError('Transfer failed: ' + error.message);
    }
}

async function performAttendedTransfer() {
    const transferNumber = document.getElementById('transferNumber').value.trim();
    if (!transferNumber) {
        showError('Please enter a number to transfer to');
        return;
    }
    
    if (!App.managers.sip) {
        console.error('SIP manager not available');
        return;
    }
    
    try {
        const session = App.managers.sip.getCurrentSession();
        if (!session) {
            console.error('No active session for transfer');
            showError('No active call to transfer');
            return;
        }
        
        // Switch to attended transfer UI
        const transferActions = document.getElementById('transferActions');
        const attendedActions = document.getElementById('attendedActions');
        const transferInputSection = document.querySelector('.transfer-input-section');
        const completeTransferBtn = document.getElementById('completeTransferBtn');
        const attendedStatusText = document.querySelector('.attended-status');
        
        transferActions.classList.add('hidden');
        attendedActions.classList.remove('hidden');
        
        // Hide the transfer number input section during attended transfer
        if (transferInputSection) {
            transferInputSection.classList.add('hidden');
        }
        
        // Update the status message with the dialed number
        if (attendedStatusText) {
            attendedStatusText.textContent = `Calling transfer target ${transferNumber}...`;
        }
        
        // Disable the complete transfer button until call is answered
        if (completeTransferBtn) {
            completeTransferBtn.disabled = true;
            completeTransferBtn.style.opacity = '0.5';
            completeTransferBtn.style.cursor = 'not-allowed';
        }
        
        // Store transfer session for completion later
        window.currentTransferSession = await App.managers.sip.attendedTransfer(session.id, transferNumber);
        
    } catch (error) {
        console.error('Failed to initiate attended transfer:', error);
        showError('Transfer failed: ' + error.message);
        
        // Return to transfer modal for another attempt
        returnToTransferModal();
    }
}

async function completeAttendedTransfer() {
    if (!App.managers.sip || !window.currentTransferSession) {
        console.error('No transfer session available');
        return;
    }
    
    try {
        const originalSession = App.managers.sip.getCurrentSession();
        if (!originalSession) {
            console.error('No original session for transfer completion');
            return;
        }
        
        await App.managers.sip.completeAttendedTransfer(originalSession.id, window.currentTransferSession.id);
        
        await hideTransferModal(true); // Transfer completed successfully
        window.currentTransferSession = null;
        
        showSuccess('Transfer completed successfully');
        
    } catch (error) {
        console.error('Failed to complete attended transfer:', error);
        showError('Transfer completion failed: ' + error.message);
    }
}

function cancelAttendedTransfer() {
    console.log('🚫 Cancelling attended transfer');
    
    if (!App.managers.sip) {
        console.error('SIP manager not available');
        return;
    }

    // Get the original session to cancel the transfer properly
    const originalSession = App.managers.sip.getCurrentSession();
    if (!originalSession) {
        console.warn('No original session found for transfer cancellation');
        // Still reset UI even if we can't find the session
        resetTransferUI();
        return;
    }

    // Use the proper SIP session manager method to cancel attended transfer
    App.managers.sip.cancelAttendedTransfer(originalSession.id)
        .then(() => {
            console.log('✅ Attended transfer cancelled successfully');
            showSuccess('Transfer cancelled');
        })
        .catch(error => {
            console.error('❌ Failed to cancel attended transfer:', error);
            showError('Failed to cancel transfer: ' + error.message);
        })
        .finally(() => {
            // Return to transfer modal for another attempt
            returnToTransferModal();
        });
}

function resetTransferUI() {
    // Reset transfer UI
    const transferActions = document.getElementById('transferActions');
    const attendedActions = document.getElementById('attendedActions');
    const transferInput = document.getElementById('transferNumber');
    const transferInputSection = document.querySelector('.transfer-input-section');
    const completeTransferBtn = document.getElementById('completeTransferBtn');
    const attendedStatusText = document.querySelector('.attended-status');
    
    if (transferActions) {
        transferActions.classList.remove('hidden');
    }
    if (attendedActions) {
        attendedActions.classList.add('hidden');
    }
    
    // Show the transfer input section again
    if (transferInputSection) {
        transferInputSection.classList.remove('hidden');
    }
    
    // Reset the status message to default
    if (attendedStatusText) {
        attendedStatusText.textContent = 'Calling transfer target...';
    }
    
    // Reset the complete transfer button state
    if (completeTransferBtn) {
        completeTransferBtn.disabled = false;
        completeTransferBtn.style.opacity = '1';
        completeTransferBtn.style.cursor = 'pointer';
    }
    
    // Clear the transfer number field
    if (transferInput) {
        transferInput.value = '';
        console.log('🔄 Transfer number field cleared');
    }
    
    // Clear the transfer session reference
    window.currentTransferSession = null;
    
    console.log('🔄 Transfer UI reset');
}

async function resumeOriginalCallAndCloseModal(originalSessionId, reason) {
    console.log('🔄 Resuming original call and closing transfer modal after consultation call ended:', reason);
    
    try {
        // Get the original session
        const originalSession = App.managers.sip.getSession(originalSessionId) || App.managers.sip.getCurrentSession();
        
        if (originalSession) {
            // If the original call is on hold, resume it
            if (originalSession.onHold) {
                console.log('📞 Resuming original call from hold');
                await App.managers.sip.toggleHold(originalSessionId);
                console.log('✅ Original call resumed successfully');
                showSuccess('Consultation call ended. Original call resumed.');
            } else {
                console.log('ℹ️ Original call was not on hold');
                showInfo('Consultation call ended. You can now continue with the original call.');
            }
        } else {
            console.warn('⚠️ Original session not found, cannot resume');
        }
        
        // Close the transfer modal
        await hideTransferModal(false); // false = transfer not completed
        
        // Clear transfer session reference
        if (window.currentTransferSession) {
            window.currentTransferSession = null;
        }
        
        console.log('✅ Transfer modal closed and original call ready');
        
    } catch (error) {
        console.error('❌ Error resuming original call:', error);
        showError('Failed to resume original call. Please check call status.');
        
        // Still close the modal even if resume failed
        await hideTransferModal(false);
    }
}

function returnToTransferModal() {
    console.log('🔄 Returning to transfer modal after failed/cancelled attended transfer');
    
    // Reset UI to show transfer actions
    resetTransferUI();
    
    // Safely ensure the original call is on hold with retry logic
    safelyHoldCall().then(success => {
        if (success) {
            console.log('✅ Call successfully put on hold and ready for new transfer');
        } else {
            console.warn('⚠️ Call may not be on hold, but transfer modal is ready');
        }
    });
    
    // Focus the transfer input field for immediate use
    setTimeout(() => {
        const transferInput = document.getElementById('transferNumber');
        if (transferInput) {
            transferInput.focus();
            transferInput.select(); // Select any existing text
            console.log('🎯 Transfer input focused for new number entry');
        }
    }, 100);
    
    // Show info message that user can try another transfer
    showInfo('Transfer cancelled. You can now attempt another transfer.');
    
    console.log('✅ Returned to transfer modal ready for new transfer');
}

function handleTransferEnterKey() {
    console.log('📞 Enter key pressed in transfer modal');
    
    // Check user preference for transfer type
    const preferBlind = getTransferPreference();
    
    console.log('📞 Transfer preference:', preferBlind ? 'Blind' : 'Attended');
    
    if (preferBlind) {
        // Perform blind transfer
        performBlindTransfer();
    } else {
        // Perform attended transfer
        performAttendedTransfer();
    }
}

function getTransferPreference() {
    // Get transfer preference from localStorage
    if (window.localDB) {
        return window.localDB.getItem('PreferBlindTransfer', '0') === '1';
    }
    
    // Also check BLF manager if available
    if (window.BLFManager && typeof window.BLFManager.getTransferPreference === 'function') {
        return window.BLFManager.getTransferPreference();
    }
    
    return false; // Default to attended transfer
}

function clearCurrentCallUI() {
    console.log('🔄 Clearing current call UI after transfer');
    
    // Reset call display to idle state
    const callDisplay = document.getElementById('currentCall');
    if (callDisplay) {
        callDisplay.textContent = 'No active call';
        callDisplay.classList.remove('active-call');
    }
    
    // Reset call controls
    const callControls = document.getElementById('call-controls');
    if (callControls) {
        callControls.classList.add('hidden');
    }
    
    // Reset dial button
    const dialButton = document.getElementById('startCallBtn');
    if (dialButton) {
        dialButton.disabled = false;
        dialButton.innerHTML = '<i class="fa fa-phone"></i><span class="btn-label">CALL</span>';
    }
    
    // Reset transfer button
    const transferBtn = document.getElementById('transferBtn');
    if (transferBtn) {
        transferBtn.disabled = true;
    }
    
    // Reset hold button
    const holdBtn = document.getElementById('holdBtn');
    if (holdBtn) {
        holdBtn.disabled = true;
        holdBtn.classList.remove('held');
    }
    
    // Reset mute button
    const muteBtn = document.getElementById('muteBtn');
    if (muteBtn) {
        muteBtn.disabled = true;
        muteBtn.classList.remove('muted');
    }
    
    // Note: Hangup button is intentionally NOT disabled
    // User may want to hang up even when no call is showing
    
    // Reset any call timer
    if (window.callTimer) {
        clearInterval(window.callTimer);
        window.callTimer = null;
    }
    
    // Reset call duration display
    const callDuration = document.getElementById('callDuration');
    if (callDuration) {
        callDuration.textContent = '';
    }
    
    // Clear dial input
    clearDialInput();
    
    // Update busy light to idle if available
    if (App.managers?.busylight?.setState) {
        App.managers.busylight.setState('idle');
    }
    
    console.log('✅ Call UI cleared and reset to idle state');
}

function updateCallControlUI(session) {
    console.log('🔄 Updating call control UI for session:', session);
    
    const muteBtn = document.getElementById('muteBtn');
    const holdBtn = document.getElementById('holdBtn');
    const transferBtn = document.getElementById('transferBtn');
    
    if (muteBtn) {
        const muteLabel = muteBtn.querySelector('.btn-label');
        if (session && session.muted) {
            muteBtn.classList.add('muted');
            if (muteLabel) muteLabel.textContent = 'UNMUTE';
        } else {
            muteBtn.classList.remove('muted');
            if (muteLabel) muteLabel.textContent = 'MUTE';
        }
        console.log('🔇 Mute button updated:', session?.muted ? 'UNMUTE' : 'MUTE');
    }
    
    if (holdBtn) {
        const holdLabel = holdBtn.querySelector('.btn-label');
        if (session && session.onHold) {
            holdBtn.classList.add('on-hold');
            if (holdLabel) holdLabel.textContent = 'RESUME';
        } else {
            holdBtn.classList.remove('on-hold');
            if (holdLabel) holdLabel.textContent = 'HOLD';
        }
        console.log('⏸️ Hold button updated:', session?.onHold ? 'RESUME' : 'HOLD');
    }
}

function enableCallControls() {
    console.log('🔧 Enabling call control buttons for active session');
    
    const muteBtn = document.getElementById('muteBtn');
    const holdBtn = document.getElementById('holdBtn');
    const transferBtn = document.getElementById('transferBtn');
    
    if (muteBtn) {
        muteBtn.disabled = false;
        console.log('✅ Mute button enabled');
    }
    
    if (holdBtn) {
        holdBtn.disabled = false;
        console.log('✅ Hold button enabled');
    }
    
    if (transferBtn) {
        transferBtn.disabled = false;
        console.log('✅ Transfer button enabled');
    }
}

function showCallControls() {
    const dialActions = document.querySelector('.dial-actions');
    const callControls = document.getElementById('callControls');
    
    if (dialActions && callControls) {
        dialActions.style.display = 'none';
        callControls.classList.remove('hidden');
    }
}

function hideCallControls() {
    const dialActions = document.querySelector('.dial-actions');
    const callControls = document.getElementById('callControls');
    
    if (dialActions && callControls) {
        dialActions.style.display = 'flex';
        callControls.classList.add('hidden');
    }
}

async function sendDTMF(digit) {
    console.log('Sending DTMF:', digit);
    
    if (!App.managers.sip) {
        console.error('SIP manager not available');
        return;
    }
    
    // Get the current active session
    const currentSession = App.managers.sip.getCurrentSession();
    if (!currentSession) {
        console.warn('No active session to send DTMF to');
        return;
    }
    
    // Validate session state - check for various possible state values
    const validStates = [
        SIP.SessionState.Established,  // SIP.js enum value
        'Established',                 // String value
        'active',                      // Alternative state name
        'confirmed'                    // Another possible state
    ];
    
    console.log('🔍 Session state debug:', {
        currentState: currentSession.state,
        stateType: typeof currentSession.state,
        sipEstablished: SIP.SessionState.Established,
        validStates: validStates
    });
    
    if (!validStates.includes(currentSession.state)) {
        console.warn('Cannot send DTMF - session not in valid state. State:', currentSession.state);
        console.warn('Valid states:', validStates);
        return;
    }
    
    try {
        await App.managers.sip.sendDTMF(currentSession.id, digit);
        console.log(`DTMF ${digit} sent to session ${currentSession.id}`);
    } catch (error) {
        console.error('Failed to send DTMF:', error);
        // Show user-friendly error notification
        showWarningNotification('DTMF Failed', `Could not send tone ${digit}. ${error.message}`, 3000);
    }
}

async function toggleRegistration() {
    const registerBtn = document.getElementById('registerBtn');
    
    if (!App.managers.sip) {
        console.error('SIP manager not available');
        return;
    }
    
    try {
        if (App.managers.sip.isRegistered()) {
            await App.managers.sip.unregister();
            console.log('Unregistered successfully');
        } else {
            // Use SIP manager to create user agent with proper configuration
            // Build config from local database
            let config = buildSipConfigFromDatabase();
            console.log('🚀 About to call createUserAgent with config:', {
                server: config.server,
                username: config.username ? '***' : '(missing)',
                type: typeof config.server,
                serverLength: config.server ? config.server.length : 'N/A'
            });
            
            // Validate required configuration including WebRTC support
            const validation = validateSipConfig(config);
            if (!validation.isValid) {
                showError(`Missing required SIP settings: ${validation.missingFields.join(', ')}. Please configure these in Settings.`);
                console.error('Missing SIP configuration:', validation.missingFields);
                return;
            }
            
            // Log WebRTC support status
            console.log('WebRTC Support Status:', validation.webrtcSupport);
            
            try {
                await App.managers.sip.createUserAgent(config);
                console.log('UserAgent created successfully');
                
                // Follow the working pattern: connect transport first, then register
                console.log('Starting transport connection...');
                // The transport connection and registration will be handled by events
            } catch (error) {
                console.error('Failed to create UserAgent:', error);
            }
        }
    } catch (error) {
        console.error('Registration toggle failed:', error);
        showError('Registration failed: ' + error.message);
    }
}

/* ====================================================================================== */
/* UI FUNCTIONS */
/* ====================================================================================== */

function showDial() {
    console.log('Switching to dial view');
    if (App.managers?.ui) {
        App.managers.ui.setCurrentView('dial');
        // Update SIP status display when showing dial view
        setTimeout(() => {
            if (App.managers.ui.updateSipStatusDisplay) {
                App.managers.ui.updateSipStatusDisplay();
            }
        }, 100);
    } else {
        switchToView('dial');
    }
}

function showContacts() {
    console.log('Switching to contacts view');
    if (App.managers?.ui) {
        App.managers.ui.setCurrentView('contacts');
    } else {
        switchToView('contacts');
    }
}

function showActivity() {
    console.log('Switching to activity view');
    if (App.managers?.ui) {
        App.managers.ui.setCurrentView('activity');
    } else {
        switchToView('activity');
    }
}

function showSettings() {
    console.log('Switching to settings view');
    if (App.managers?.ui) {
        App.managers.ui.setCurrentView('settings');
    } else {
        switchToView('settings');
    }
}

function switchToView(viewName) {
    console.log('Fallback view switching to:', viewName);
    
    // Hide all view containers
    document.querySelectorAll('.view-container').forEach(container => {
        container.style.display = 'none';
        container.classList.add('hidden');
    });
    
    // Show target view
    const targetView = document.getElementById(viewName + 'View');
    if (targetView) {
        targetView.style.display = 'block';
        targetView.classList.remove('hidden');
    }
    
    // Update navigation
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    const activeTab = document.querySelector(`.nav-tab[data-view="${viewName}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    // Update body class for styling
    document.body.className = document.body.className.replace(/view-\w+/g, '');
    document.body.classList.add('view-' + viewName);
    
    // Handle view-specific logic
    if (viewName === 'settings') {
        setTimeout(loadSettingsIntoForm, 100);
    } else if (viewName === 'contacts') {
        loadBuddies();
        updateBuddyList();
    } else if (viewName === 'dial') {
        // Update BLF button visibility based on current settings
        if (typeof renderBlfButtons === 'function') {
            setTimeout(renderBlfButtons, 100);
        }
    }
}

/* ====================================================================================== */
/* DIALPAD FUNCTIONS */
/* ====================================================================================== */

function handleDialpadInput(digit) {
    console.log('Dialpad input:', digit);
    
    const dialInput = document.getElementById('dialInput');
    if (dialInput) {
        // Handle special commands
        if (digit === 'clear') {
            dialInput.value = '';
        } else if (digit === 'backspace') {
            dialInput.value = dialInput.value.slice(0, -1);
        } else {
            // Add digit to dial input (for display)
            dialInput.value += digit;
        }
        
        // Send DTMF if in an active call (only for actual digits, not clear/backspace)
        if (digit !== 'clear' && digit !== 'backspace' && 
            App.managers.sip && App.managers.sip.hasActiveSessions()) {
            
            // Call async function but don't wait for it
            sendDTMF(digit).catch(error => {
                console.error('DTMF failed from dialpad input:', error);
            });
        }
        
        triggerWebHook('dialpad_input', { digit, currentValue: dialInput.value });
    }
}

/* ====================================================================================== */
/* SEARCH FUNCTIONS */
/* ====================================================================================== */

function handleSearch(query) {
    console.log('Search query:', query);
    
    if (!query.trim()) {
        updateBuddyList();
        return;
    }
    
    const filteredBuddies = App.buddies.filter(buddy => 
        buddy.name.toLowerCase().includes(query.toLowerCase()) ||
        buddy.number.includes(query)
    );
    
    updateBuddyList(filteredBuddies);
    triggerWebHook('search', { query, results: filteredBuddies.length });
}

function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
        handleSearch('');
    }
}

/* ====================================================================================== */
/* BUDDY/CONTACT MANAGEMENT */
/* ====================================================================================== */

function loadBuddies() {
    const savedBuddies = window.localDB ? window.localDB.getJSON('buddies', []) : [];
    try {
        App.buddies = savedBuddies;
        if (App.managers?.ui) {
            App.managers.ui.updateState({ buddies: App.buddies });
        }
    } catch (error) {
        console.error('Failed to load buddies:', error);
        App.buddies = [];
    }
}

function saveBuddies() {
    try {
        if (window.localDB) {
            window.localDB.setJSON('buddies', App.buddies);
        }
    } catch (error) {
        console.error('Error saving buddies:', error);
    }
}

function addBuddy(name, number) {
    if (!name || !number) {
        showError('Name and number are required');
        return;
    }
    
    const buddy = {
        id: Date.now().toString(),
        name: name.trim(),
        number: number.trim(),
        addedAt: new Date().toISOString()
    };
    
    App.buddies.push(buddy);
    saveBuddies();
    updateBuddyList();
    
    console.log('Buddy added:', buddy);
    triggerWebHook('buddy_added', buddy);
}

function removeBuddy(buddyId) {
    const index = App.buddies.findIndex(b => b.id === buddyId);
    if (index !== -1) {
        const removedBuddy = App.buddies.splice(index, 1)[0];
        saveBuddies();
        updateBuddyList();
        
        console.log('Buddy removed:', removedBuddy);
        triggerWebHook('buddy_removed', removedBuddy);
    }
}

function updateBuddyList(buddies = null) {
    const buddyList = document.getElementById('buddyList');
    if (!buddyList) return;
    
    const displayBuddies = buddies || App.buddies;
    
    if (displayBuddies.length === 0) {
        buddyList.innerHTML = '<div class="empty-state">No contacts found</div>';
        return;
    }
    
    buddyList.innerHTML = displayBuddies.map(buddy => `
        <div class="buddy-item" data-id="${buddy.id}">
            <div class="buddy-info">
                <div class="buddy-name">${buddy.name}</div>
                <div class="buddy-number">${buddy.number}</div>
            </div>
            <div class="buddy-actions">
                <button onclick="callBuddy('${buddy.number}')" class="call-buddy-btn">📞</button>
                <button onclick="removeBuddy('${buddy.id}')" class="remove-buddy-btn">🗑️</button>
            </div>
        </div>
    `).join('');
}

function callBuddy(number) {
    const dialInput = document.getElementById('dialInput');
    if (dialInput) {
        dialInput.value = number;
    }
    
    showDial();
    
    setTimeout(() => {
        makeCall();
    }, 100);
}

function addNewContact() {
    const name = prompt('Enter contact name:');
    if (name && name.trim()) {
        const number = prompt('Enter phone number:');
        if (number && number.trim()) {
            addBuddy(name.trim(), number.trim());
        }
    }
}

/* ====================================================================================== */
/* THEME MANAGEMENT */
/* ====================================================================================== */

function initializeTheme() {
    if (App.managers?.ui && typeof App.managers.ui.initializeTheme === 'function') {
        App.managers.ui.initializeTheme();
    } else {
        // Fallback theme initialization
        const savedTheme = window.localDB ? window.localDB.getItem('selectedTheme', 'auto') : 'auto';
        console.log('Fallback theme initialization:', savedTheme);
        
        applyThemeFallback(savedTheme);
        
        if (App.managers?.ui && typeof App.managers.ui.setTheme === 'function') {
            App.managers.ui.setTheme(savedTheme);
        }
    }
    
    // Update display regardless of initialization method
    updateThemeDisplay();
}

function toggleTheme() {
    if (App.managers?.ui && typeof App.managers.ui.toggleTheme === 'function') {
        App.managers.ui.toggleTheme();
    } else {
        // Fallback theme toggle
        const currentTheme = window.localDB ? window.localDB.getItem('selectedTheme', 'auto') : 'auto';
        const themes = ['auto', 'light', 'dark'];
        const currentIndex = themes.indexOf(currentTheme);
        const nextTheme = themes[(currentIndex + 1) % themes.length];
        
        console.log('Fallback theme toggle:', currentTheme, '->', nextTheme);
        
        if (window.localDB) {
            window.localDB.setItem('selectedTheme', nextTheme);
        }
        applyThemeFallback(nextTheme);
        updateThemeDisplay();
    }
}

function handleThemeSelectChange(event) {
    const selectedTheme = event.target.value;
    console.log('Theme select changed to:', selectedTheme);
    
    if (App.managers?.ui && typeof App.managers.ui.setTheme === 'function') {
        App.managers.ui.setTheme(selectedTheme);
    } else {
        // Fallback theme setting
        if (window.localDB) {
            window.localDB.setItem('selectedTheme', selectedTheme);
        }
        applyThemeFallback(selectedTheme);
        updateThemeDisplay();
    }
}

function previewCurrentTheme() {
    const currentTheme = window.localDB ? window.localDB.getItem('selectedTheme', 'auto') : 'auto';
    console.log('Previewing current theme:', currentTheme);
    
    if (App.managers?.ui && typeof App.managers.ui.setTheme === 'function') {
        App.managers.ui.setTheme(currentTheme);
    } else {
        applyThemeFallback(currentTheme);
    }
    
    updateThemeDisplay();
}

function updateThemeDisplay() {
    const currentTheme = window.localDB ? window.localDB.getItem('selectedTheme', 'auto') : 'auto';
    
    // Update theme select dropdown
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect && themeSelect.value !== currentTheme) {
        themeSelect.value = currentTheme;
    }
    
    // Update theme button text
    const themeBtn = document.getElementById('themeBtn');
    if (themeBtn) {
        const themeNames = {
            'auto': '🌓 Auto',
            'light': '☀️ Light',
            'dark': '🌙 Dark'
        };
        themeBtn.textContent = themeNames[currentTheme] || '🌓 Auto';
    }
    
    console.log('Theme display updated:', currentTheme);
}

function applyThemeFallback(theme) {
    console.log('Applying fallback theme:', theme);
    
    // Remove existing theme classes
    document.body.classList.remove('theme-light', 'theme-dark', 'theme-auto');
    
    if (theme === 'auto') {
        // Use system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.body.classList.add(prefersDark ? 'theme-dark' : 'theme-light');
        console.log('Auto theme applied:', prefersDark ? 'dark' : 'light');
    } else {
        document.body.classList.add('theme-' + theme);
        console.log('Theme applied:', theme);
    }
}

/* ====================================================================================== */
/* SETTINGS MANAGEMENT */
/* ====================================================================================== */

function loadSettingsIntoForm() {
    console.log('Loading settings into form...');
    
    // Load settings directly from localStorage
    loadSettingsFromDatabase();
    
    // Update audio settings dropdowns
    if (App.managers?.audio) {
        App.managers.audio.loadSettings();
        App.managers.audio.updateDeviceDropdowns();
    }
    
    // Setup real-time BLF checkbox listener
    setupBlfCheckboxListener();
    
    // Load tab visibility settings
    if (typeof window.loadTabVisibilitySettings === 'function') {
        window.loadTabVisibilitySettings();
    }
    
    // Update tab visibility
    if (typeof window.updateTabVisibility === 'function') {
        window.updateTabVisibility();
    }
    
    console.log('Settings loaded into form');
}

function setupBlfCheckboxListener() {
    const blfCheckbox = document.getElementById('BlfEnabled');
    if (blfCheckbox) {
        // Remove any existing listener to avoid duplicates
        blfCheckbox.removeEventListener('change', handleBlfCheckboxChange);
        
        // Add the change listener
        blfCheckbox.addEventListener('change', handleBlfCheckboxChange);
        console.log('✅ BLF checkbox listener setup complete');
    }
}

function handleBlfCheckboxChange(event) {
    const isChecked = event.target.checked;
    console.log('🔄 BLF checkbox changed:', isChecked ? 'enabled' : 'disabled');
    
    // Save the setting immediately
    if (window.localDB) {
        window.localDB.setItem('BlfEnabled', isChecked ? '1' : '0');
        console.log('💾 BLF setting saved:', isChecked ? '1' : '0');
    }
    
    // Update BLF buttons immediately using all available methods
    if (typeof renderBlfButtons === 'function') {
        renderBlfButtons();
    }
    
    if (window.BLFManager && typeof window.BLFManager.renderBlfButtons === 'function') {
        window.BLFManager.renderBlfButtons();
    }
    
    console.log('✅ BLF buttons updated in real-time');
}

function loadSettingsFromDatabase() {
    console.log('Loading settings from database...');
    
    // Fallback direct database access
    const fields = [
        'PhantomID', 'SipUsername', 'SipPassword', 'profileName', 'VmAccess', 'IceGatheringTimeout'
    ];
    
    fields.forEach(field => {
        const element = document.getElementById(field);
        if (element && window.localDB) {
            // Set default values for specific fields
            let defaultValue = '';
            if (field === 'VmAccess') {
                defaultValue = '*97';
            } else if (field === 'IceGatheringTimeout') {
                defaultValue = '500';
            }
            element.value = window.localDB.getItem(field, defaultValue);
        }
    });

    
    // Boolean settings
    const booleanFields = [
        { id: 'AutoAnswerEnabled', key: 'AutoAnswerEnabled', defaultValue: '0' },
        { id: 'CallWaitingEnabled', key: 'CallWaitingEnabled', defaultValue: '0' },
        { id: 'IncomingCallNotifications', key: 'IncomingCallNotifications', defaultValue: '1' },
        { id: 'BlfEnabled', key: 'BlfEnabled', defaultValue: '0' },
        { id: 'PreferBlindTransfer', key: 'PreferBlindTransfer', defaultValue: '0' },
        { id: 'BusylightEnabled', key: 'BusylightEnabled', defaultValue: '0' },
        { id: 'SipMessagesEnabled', key: 'SipMessagesEnabled', defaultValue: '0' },
        { id: 'VerboseLoggingEnabled', key: 'VerboseLoggingEnabled', defaultValue: '0' },
        { id: 'OnscreenNotifications', key: 'OnscreenNotifications', defaultValue: '1' }
    ];
    
    booleanFields.forEach(({ id, key, defaultValue }) => {
        const element = document.getElementById(id);
        if (element && window.localDB) {
            element.checked = window.localDB.getItem(key, defaultValue) === '1';
        }
    });
    
    // Theme - updated to use new ThemeMode dropdown
    const themeModeSelect = document.getElementById('ThemeMode');
    if (themeModeSelect && App.managers?.ui) {
        const currentTheme = App.managers.ui.state.theme || 'auto';
        themeModeSelect.value = currentTheme;
        console.log('Loaded theme mode:', currentTheme);
    }
    
    // Language - load current language setting
    const languageSelect = document.getElementById('AppLanguage');
    if (languageSelect && window.languageManager) {
        const currentLanguage = window.languageManager.i18n?.language || 'en';
        languageSelect.value = currentLanguage;
        console.log('Loaded language:', currentLanguage);
    }
    
    // Update notification status display
    updateNotificationStatusDisplay();
}

async function saveSettings() {
    console.log('Saving settings...');
    
    try {
        // Direct database saving
        {
            const formElements = document.querySelectorAll('#settingsForm input, #settingsForm select');
            
            formElements.forEach(element => {
                if (element.type === 'checkbox') {
                    if (window.localDB) {
                        window.localDB.setItem(element.id, element.checked ? '1' : '0');
                    }
                } else {
                    if (window.localDB) {
                        window.localDB.setItem(element.id, element.value);
                    }
                }
                
                // Special handling for theme mode
                if (element.id === 'ThemeMode' && App.managers?.ui) {
                    console.log('Setting theme mode to:', element.value);
                    App.managers.ui.setTheme(element.value);
                }
                
                // Special handling for language change
                if (element.id === 'AppLanguage' && window.languageManager) {
                    console.log('Setting language to:', element.value);
                    window.languageManager.setLanguage(element.value);
                }
            });
            
            // Generate server settings from PhantomID if it was updated
            const phantomIDInput = document.getElementById('PhantomID');
            if (phantomIDInput && phantomIDInput.value && phantomIDInput.value.trim() !== '') {
                console.log('Generating server settings from PhantomID:', phantomIDInput.value);
                const phantomID = phantomIDInput.value.trim();
                const settings = generateServerSettings(phantomID);
                
                // Store the generated server settings
                if (window.localDB && settings.wssServerUrl) {
                    window.localDB.setItem("PhantomID", phantomID);
                    window.localDB.setItem("wssServer", settings.wssServerUrl);
                    window.localDB.setItem("SipDomain", settings.SipDomain);
                    window.localDB.setItem("SipServer", settings.SipServer);
                    window.localDB.setItem("wssPort", settings.wssPort.toString());
                    window.localDB.setItem("wssPath", settings.wssPath);
                    
                    console.log('✅ Server settings generated and saved:', {
                        phantomID: phantomID,
                        wssServer: settings.wssServerUrl,
                        domain: settings.SipDomain
                    });
                    
                    // Update profileName to match new PhantomID
                    const sipUsername = document.getElementById('SipUsername')?.value || phantomID;
                    const newProfileName = `${sipUsername}-365Connect`;
                    window.localDB.setItem('profileName', newProfileName);
                    console.log('✅ ProfileName updated to:', newProfileName);
                    
                    // Reinitialize API manager with new PhantomID
                    if (App.managers?.api) {
                        try {
                            await App.managers.api.initialize(phantomID);
                            console.log('✅ Phantom API reinitialized with new PhantomID');
                        } catch (error) {
                            console.warn('⚠️ Failed to reinitialize Phantom API:', error);
                        }
                    }
                }
            }
        }
        
        // Update App.config from localStorage
        App.config = buildSipConfigFromDatabase();
        
        // Apply theme immediately
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) {
            if (App.managers?.ui) {
                App.managers.ui.setTheme(themeSelect.value);
            } else {
                applyThemeFallback(themeSelect.value);
                updateThemeDisplay();
            }
        }
        
        // Update busylight if enabled/disabled
        if (App.managers.busylight) {
            const busylightEnabled = document.getElementById('BusylightEnabled');
            const isEnabled = busylightEnabled ? busylightEnabled.checked : false;
            
            // Use setEnabled method to properly initialize or disconnect
            App.managers.busylight.setEnabled(isEnabled).catch(error => {
                console.warn('Failed to update busylight state:', error);
            });
        }
        
        // Update BLF button visibility if setting changed
        if (typeof renderBlfButtons === 'function') {
            setTimeout(renderBlfButtons, 50);
        }
        
        // Also update via BLF Manager if available
        if (window.BLFManager && typeof window.BLFManager.renderBlfButtons === 'function') {
            setTimeout(() => window.BLFManager.renderBlfButtons(), 50);
        }
        
        // Save audio settings
        if (App.managers?.audio) {
            App.managers.audio.saveSettings();
        }
        
        // Save tab visibility settings
        if (typeof window.saveTabVisibilitySettings === 'function') {
            window.saveTabVisibilitySettings();
        }
        
        // Update tab visibility
        if (typeof window.updateTabVisibility === 'function') {
            window.updateTabVisibility();
        }
        
        // Force show settings saved notification even if onscreen notifications are disabled
        showNotification('Settings saved', 'Your settings have been saved successfully', 'success', 2000, true);
        console.log('Settings saved successfully');
        
        // Update device name display
        updateDeviceNameDisplay();
        
    } catch (error) {
        console.error('Failed to save settings:', error);
        showErrorNotification('Save failed', 'Failed to save settings: ' + error.message);
    }
}

function resetSettings() {
    if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
        try {
            // Reset all settings by clearing localStorage keys
            const keysToReset = [
                'PhantomID', 'wssServer', 'SipUsername', 'SipPassword', 'SipDomain',
                'SipServer', 'wssPort', 'wssPath',
                'AutoAnswerEnabled', 'CallWaitingEnabled', 
                'BlfEnabled', 'BusylightEnabled',
                'audioSpeakerDevice', 'audioMicrophoneDevice', 'audioRingerDevice', 'audioRingtoneFile'
            ];
            
            keysToReset.forEach(key => {
                if (window.localDB) window.localDB.removeItem(key);
            });
            
            // Reset tab visibility settings
            localStorage.removeItem('tabVisibilitySettings');
            
            // Reset tab visibility checkboxes to defaults
            const showContactsTab = document.getElementById('ShowContactsTab');
            const showActivityTab = document.getElementById('ShowActivityTab');
            const showBlank1Tab = document.getElementById('ShowBlank1Tab');
            const showBlank2Tab = document.getElementById('ShowBlank2Tab');
            
            if (showContactsTab) showContactsTab.checked = true;
            if (showActivityTab) showActivityTab.checked = true;
            if (showBlank1Tab) showBlank1Tab.checked = false;
            if (showBlank2Tab) showBlank2Tab.checked = false;
            
            // Update tab visibility
            if (typeof window.updateTabVisibility === 'function') {
                window.updateTabVisibility();
            }
            
            // Clear device name display immediately
            const sipExtensionElement = document.getElementById('sipExtension');
            if (sipExtensionElement) {
                sipExtensionElement.textContent = '--';
            }
            
            loadSettingsIntoForm();
            showSuccessNotification('Settings reset', 'All settings have been reset to defaults');
            console.log('Settings reset to defaults');
            
        } catch (error) {
            console.error('Failed to reset settings:', error);
            showErrorNotification('Reset failed', 'Failed to reset settings: ' + error.message);
        }
    }
}

/* ====================================================================================== */
/* DATABASE MONITOR (Settings Page) */
/* ====================================================================================== */

function refreshDatabaseStats() {
    if (!window.localDB) return;
    
    try {
        const stats = window.localDB.getStats();
        
        const dbSizeElement = document.getElementById('dbSize');
        if (dbSizeElement) {
            dbSizeElement.textContent = `${stats.size} items (${stats.sizeBytes} bytes)`;
        }
        
        const dbLastModified = document.getElementById('dbLastModified');
        if (dbLastModified) {
            dbLastModified.textContent = stats.lastModified || 'Unknown';
        }
        
        const dbList = document.getElementById('dbList');
        if (dbList) {
            if (stats.keys.length === 0) {
                dbList.innerHTML = '<div class="empty-state">No database entries found</div>';
            } else {
                dbList.innerHTML = stats.keys.map(key => {
                    const value = window.localDB.getItem(key);
                    const truncatedValue = typeof value === 'string' && value.length > 50 
                        ? value.substring(0, 50) + '...' 
                        : value;
                    
                    return `
                        <div class="db-item">
                            <strong>${key}:</strong> ${truncatedValue}
                        </div>
                    `;
                }).join('');
            }
        }
        
    } catch (error) {
        console.error('Failed to refresh database stats:', error);
    }
}

function startDatabaseMonitoring() {
    if (dbStatsInterval) return;
    
    dbStatsInterval = setInterval(refreshDatabaseStats, 2000);
    console.log('Database monitoring started');
}

function stopDatabaseMonitoring() {
    if (dbStatsInterval) {
        clearInterval(dbStatsInterval);
        dbStatsInterval = null;
        console.log('Database monitoring stopped');
    }
}

/* ====================================================================================== */
/* NOTIFICATION SYSTEM */
/* ====================================================================================== */

function showNotification(title, message, type = 'info', duration = 2000, forceShow = false) {
    console.log(`${type.toUpperCase()} Notification:`, title, message);
    
    const notification = {
        id: Date.now().toString(),
        title,
        message,
        type,
        timestamp: new Date()
    };
    
    notificationQueue.push(notification);
    
    // Check if onscreen notifications are enabled (always show errors and forced notifications)
    const onscreenEnabled = window.localDB ? 
        window.localDB.getItem('OnscreenNotifications', '1') === '1' : true;
    
    const shouldShowToast = onscreenEnabled || type === 'error' || forceShow === true;
    
    if (shouldShowToast) {
        // Try to show via UI manager first
        if (App.managers?.ui && typeof App.managers.ui.addNotification === 'function') {
            // Call addNotification directly with forceShow flag
            App.managers.ui.addNotification({
                title,
                message,
                type,
                duration,
                forceShow
            });
        } else {
            // Fallback notification display
            showFallbackNotification(title, message, type, duration);
        }
    } else {
        console.log(`Toast notification suppressed (type: ${type}, onscreen disabled)`);
    }
    
    triggerWebHook('notification', notification);
}

function showSuccessNotification(title, message, duration = 2000) {
    showNotification(title, message, 'success', duration);
}

function showErrorNotification(title, message, duration = 4000) {
    showNotification(title, message, 'error', duration);
}

function showInfoNotification(title, message, duration = 2000) {
    showNotification(title, message, 'info', duration);
}

function showWarningNotification(title, message, duration = 4000) {
    showNotification(title, message, 'warning', duration);
}

function showFallbackNotification(title, message, type, duration) {
    console.log('Using fallback notification system');
    
    const container = document.getElementById('notificationContainer') || createNotificationContainer();
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-title">${title}</div>
            <div class="notification-message">${message}</div>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(notification);
    
    // Auto-remove after duration
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, duration);
}

function createNotificationContainer() {
    const container = document.createElement('div');
    container.id = 'notificationContainer';
    container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        max-width: 400px;
    `;
    document.body.appendChild(container);
    return container;
}

function showError(message) {
    showErrorNotification('Error', message);
}

function showSuccess(message) {
    showSuccessNotification('Success', message);
}

function showInfo(message) {
    showInfoNotification('Info', message);
}

function showWarning(message) {
    showWarningNotification('Warning', message);
}

// Helper function to safely put call on hold with retry logic
async function safelyHoldCall(maxRetries = 3) {
    if (!App.managers.sip) {
        console.warn('⚠️ SIP manager not available for hold operation');
        return false;
    }

    // Define retry delays: 0.5s, 0.75s, 1.0s
    const retryDelays = [500, 750, 1000];

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const session = App.managers.sip.getCurrentSession();
            if (!session) {
                console.warn('⚠️ No session available for hold operation');
                return false;
            }

            if (session.onHold) {
                console.log('✅ Session is already on hold');
                return true;
            }

            console.log(`📞 Attempt ${attempt}/${maxRetries}: Putting call on hold`);
            await App.managers.sip.toggleHold();
            console.log('✅ Successfully put call on hold');
            return true;

        } catch (error) {
            const isReinviteError = error.message && error.message.includes('Reinvite in progress');
            
            if (isReinviteError && attempt < maxRetries) {
                const delay = retryDelays[attempt - 1]; // Use predefined delays
                console.warn(`⚠️ Attempt ${attempt}/${maxRetries} failed (reinvite in progress), retrying in ${delay}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error(`❌ Attempt ${attempt}/${maxRetries} failed to put call on hold:`, error.message);
                if (attempt === maxRetries) {
                    showWarning('Unable to put call on hold automatically. Please check call status.');
                    return false;
                }
            }
        }
    }
    return false;
}

/* ====================================================================================== */
/* SIP CONNECTION MONITORING */
/* ====================================================================================== */

function setupSipConnectionMonitoring() {
    console.log('Setting up SIP connection monitoring...');
    
    if (!App.managers.sip || !App.managers.ui) {
        console.warn('SIP or UI manager not available for monitoring setup');
        return;
    }
    
    // Monitor registration state changes
    App.managers.sip.on('registrationStateChanged', (state) => {
        console.log('Registration state changed:', state);
        
        // Update UI connection state (this will handle notifications via connectionStateChanged event)
        App.managers.ui.setConnectionState(state);
        
        // Update register button state
        updateRegisterButton(state);
    });
    
    // Handle connection state changes with notifications
    App.managers.ui.on('connectionStateChanged', (event) => {
        const { current, previous } = event.detail;
        console.log(`Connection state changed: ${previous} -> ${current}`);
        
        // Show notification based on new state
        switch (current) {
            case 'connecting':
            case 'registering':
                App.managers.ui.addNotification({
                    type: 'info',
                    title: 'Connecting',
                    message: 'Registering with SIP server...',
                    duration: 2000
                });
                break;
                
            case 'registered':
                App.managers.ui.addNotification({
                    type: 'success',
                    title: 'Connected',
                    message: 'Successfully registered with SIP server',
                    duration: 2000
                });
                break;
                
            case 'unregistered':
                // Only show notification if we were previously registered
                if (previous === 'registered') {
                    App.managers.ui.addNotification({
                        type: 'info',
                        title: 'Disconnected',
                        message: 'Unregistered from SIP server',
                        duration: 2000
                    });
                }
                break;
                
            case 'failed':
                // Note: registrationFailed event handler shows detailed notification with retry actions
                // So we don't show a duplicate simple notification here
                break;
        }
    });
    
    // Monitor transport state changes
    App.managers.sip.on('transportStateChanged', (state) => {
        console.log('Transport state changed:', state);
        
        switch (state) {
            case 'connecting':
                App.managers.ui.addNotification({
                    type: 'info',
                    title: 'Connecting',
                    message: 'Establishing connection to server...',
                    duration: 2000
                });
                break;
                
            case 'connected':
                console.log('Transport connected successfully');
                break;
                
            case 'disconnected':
                App.managers.ui.addNotification({
                    type: 'warning',
                    title: 'Disconnected',
                    message: 'Lost connection to server',
                    duration: 4000
                });
                App.managers.ui.setConnectionState('disconnected');
                break;
        }
    });
    
    // Monitor transport errors
    App.managers.sip.on('transportError', (error) => {
        console.error('Transport error:', error);
        
        App.managers.ui.addNotification({
            type: 'error',
            title: 'Connection Error',
            message: `Transport error: ${error.message || error}`,
            duration: 6000
        });
        
        App.managers.ui.setConnectionState('failed');
    });
    
    // Monitor registration success
    App.managers.sip.on('registered', (userAgent) => {
        console.log('SIP registration successful:', userAgent);
    });
    
    // Monitor registration failures
    App.managers.sip.on('registrationFailed', (error) => {
        console.error('SIP registration failed:', error);
        
        App.managers.ui.addNotification({
            type: 'error',
            title: 'Registration Failed',
            message: `Registration error: ${error.message || error}`,
            duration: 7000,
            actions: [
                {
                    text: 'Retry',
                    class: 'btn-primary',
                    action: () => {
                        console.log('Retrying registration...');
                        toggleRegistration();
                    }
                },
                {
                    text: 'Settings',
                    class: 'btn-secondary',
                    action: () => {
                        App.managers.ui.setCurrentView('settings');
                    }
                }
            ]
        });
        
        App.managers.ui.setConnectionState('failed');
    });
    
    // Monitor unregistration
    App.managers.sip.on('unregistered', () => {
        console.log('SIP unregistered successfully');
        
        // Note: setConnectionState and notification are handled via registrationStateChanged event
    });
    
    // Monitor session events for call status display
    App.managers.sip.on('sessionCreated', (session) => {
        console.log('Session created, updating call status display');
        const callData = {
            remoteIdentity: session.session?.remoteIdentity,
            direction: session.direction,
            target: session.target,
            state: 'created' // Session created but not yet connected
        };
        App.managers.ui.updateCallStatus(callData);
        // Don't start timer yet - wait for connection
        
        // Update call button for incoming calls
        updateCallButton(session);
    });
    
    App.managers.sip.on('incomingCall', (session) => {
        console.log('🔔 Incoming call detected, starting ringtone and notification');
        updateCallButton(session);
        
        // Start playing ringtone if audio manager is available
        if (App.managers.audio) {
            App.managers.audio.startRinging();
            console.log('✅ Ringtone started for incoming call');
        } else {
            console.warn('⚠️ Audio manager not available, no ringtone will play');
        }
        
        // Send system notification if enabled
        sendIncomingCallNotification(session);
    });
    
    App.managers.sip.on('sessionAnswered', (session) => {
        console.log('🔕 Call answered, stopping ringtone and showing call controls');
        
        // Stop ringtone when call is answered
        if (App.managers.audio) {
            App.managers.audio.stopRinging();
        }
        
        // Close any incoming call notification
        if (window.currentIncomingCallNotification) {
            window.currentIncomingCallNotification.close();
            window.currentIncomingCallNotification = null;
        }
        
        // Clear session reference
        if (window.currentIncomingSession) {
            window.currentIncomingSession = null;
        }
        
        // Update call status to show "Connected" and start timer
        const callData = {
            remoteIdentity: session.session?.remoteIdentity,
            direction: session.direction,
            target: session.target,
            state: 'answered' // Call is now connected
        };
        App.managers.ui.updateCallStatus(callData);
        App.managers.ui.startCallTimer(Date.now());
        
        showCallControls();
        enableCallControls(); // Enable mute, hold, transfer buttons
        updateCallControlUI(session);
    });
    
    App.managers.sip.on('sessionEstablished', (session) => {
        console.log('Session established, updating call timer');
        
        // Update call status to show "Connected"
        const callData = {
            remoteIdentity: session.session?.remoteIdentity,
            direction: session.direction,
            target: session.target,
            state: 'established' // Call is now established/connected
        };
        App.managers.ui.updateCallStatus(callData);
        
        // Start timer only if not already started
        if (!App.managers.ui.callTimer) {
            App.managers.ui.startCallTimer(Date.now());
        }
        
        // Update call button for active call
        updateCallButton(session);
        
        // Show call controls if not already shown
        showCallControls();
        enableCallControls(); // Enable mute, hold, transfer buttons
        updateCallControlUI(session);
    });
    
    App.managers.sip.on('sessionTerminated', (session) => {
        console.log('🔕 Session terminated, stopping ringtone and clearing call status');
        
        // Stop ringtone if it's still playing
        if (App.managers.audio) {
            App.managers.audio.stopRinging();
        }
        
        // Close any incoming call notification
        if (window.currentIncomingCallNotification) {
            window.currentIncomingCallNotification.close();
            window.currentIncomingCallNotification = null;
        }
        
        // Clear session reference
        if (window.currentIncomingSession) {
            window.currentIncomingSession = null;
        }
        
        App.managers.ui.updateCallStatus({});
        App.managers.ui.stopCallTimer();
        
        // Reset call button and hide call controls
        updateCallButton(null);
        hideCallControls();
        
        // Clear dial input after call ends
        clearDialInput();
        
        // Hide transfer modal if open
        hideTransferModal();
        
        // Clear any transfer session
        if (window.currentTransferSession) {
            window.currentTransferSession = null;
        }
    });
    
    App.managers.sip.on('sessionMuted', (data) => {
        console.log('Session mute state changed:', data);
        const session = App.managers.sip.sessions.get(data.sessionId);
        if (session) {
            updateCallControlUI(session);
        }
    });
    
    App.managers.sip.on('sessionHeld', (data) => {
        console.log('Session hold state changed:', data);
        const session = App.managers.sip.sessions.get(data.sessionId);
        if (session) {
            updateCallControlUI(session);
            // Update the call display to show hold status
            App.managers.ui.updateCallStatus(session);
        }
    });

    // Transfer event handlers
    App.managers.sip.on('transferInitiated', (data) => {
        console.log('📞 Transfer initiated:', data);
        const { sessionId, target, type } = data;
        
        // Show appropriate feedback
        if (type === 'blind') {
            showInfo(`Blind transfer to ${target} initiated...`);
        } else if (type === 'attended') {
            showInfo(`Attended transfer to ${target} started...`);
        }
    });

    App.managers.sip.on('transferCompleted', (data) => {
        console.log('📞 Transfer completed:', data);
        const { sessionId, target, type, success, reason } = data;
        
        if (success) {
            showSuccess(`${type.charAt(0).toUpperCase() + type.slice(1)} transfer to ${target} completed successfully`);
            
            // Hide transfer modal if it's open
            hideTransferModal(true);
            
            // Clear any current session UI since the call was transferred
            clearCurrentCallUI();
            
            // Clear dial input after successful transfer
            clearDialInput();
            
        } else {
            showError(`Transfer to ${target} failed: ${reason || 'Unknown error'}`);
        }
    });

    // Handle attended transfer events
    App.managers.sip.on('attendedTransferRejected', (data) => {
        console.log('📞 Attended transfer rejected:', data);
        const { originalSessionId, transferSessionId, target, reason } = data;
        
        showError(`Transfer to ${target} was rejected`);
        
        // Resume original call and close modal
        resumeOriginalCallAndCloseModal(originalSessionId, 'rejected');
    });

    App.managers.sip.on('attendedTransferTerminated', (data) => {
        console.log('📞 Attended transfer terminated:', data);
        const { originalSessionId, transferSessionId, target, reason } = data;
        
        const reasonMsg = reason || 'Connection ended';
        showError(`Transfer to ${target} terminated: ${reasonMsg}`);
        
        // Resume original call and close modal
        resumeOriginalCallAndCloseModal(originalSessionId, 'terminated');
    });

    App.managers.sip.on('attendedTransferAnswered', (data) => {
        console.log('📞 Attended transfer answered:', data);
        const { originalSessionId, transferSessionId, target } = data;
        
        showSuccess(`${target} answered. You can now speak with them or complete the transfer.`);
        
        // Enable the complete transfer button now that the call is connected
        const completeTransferBtn = document.getElementById('completeTransferBtn');
        if (completeTransferBtn) {
            completeTransferBtn.disabled = false;
            completeTransferBtn.style.opacity = '1';
            completeTransferBtn.style.cursor = 'pointer';
            console.log('✅ Complete transfer button enabled - call answered');
        }
    });

    App.managers.sip.on('attendedTransferCancelled', (data) => {
        console.log('📞 Attended transfer cancelled:', data);
        const { originalSessionId } = data;
        
        // This event is fired when cancelAttendedTransfer is called
        // The UI reset is handled by the cancelAttendedTransfer function itself
        console.log('✅ Attended transfer cancellation processed');
    });
    
    // Update SIP status display initially and on settings changes
    if (App.managers.ui.updateSipStatusDisplay) {
        // Initial update
        setTimeout(() => App.managers.ui.updateSipStatusDisplay(), 100);
        
        // Update status when settings change
        window.addEventListener('storage', () => {
            setTimeout(() => App.managers.ui.updateSipStatusDisplay(), 100);
        });
        
        // Make updateSipStatusDisplay globally available for testing
        window.updateSipStatusDisplay = () => App.managers.ui.updateSipStatusDisplay();
    }
    
    console.log('✅ SIP connection monitoring and status display setup complete');
}

function updateRegisterButton(registrationState) {
    const registerBtn = document.getElementById('registerBtn');
    if (!registerBtn) return;
    
    const icon = registerBtn.querySelector('i');
    const text = registerBtn.querySelector('.register-text');
    
    // Remove all registration state classes
    registerBtn.classList.remove('register-disconnected', 'register-connecting', 'register-connected', 'register-error');
    
    switch (registrationState) {
        case 'registered':
        case true: // Legacy support for boolean parameter
            registerBtn.classList.add('register-connected');
            if (icon) icon.className = 'fa fa-check-circle';
            if (text) text.textContent = 'REGISTERED';
            registerBtn.title = 'Disconnect from SIP server';
            break;
            
        case 'registering':
            registerBtn.classList.add('register-connecting');
            if (icon) icon.className = 'fa fa-spinner';
            if (text) text.textContent = 'REGISTERING';
            registerBtn.title = 'Registering to SIP server...';
            break;
            
        case 'failed':
            registerBtn.classList.add('register-error');
            if (icon) icon.className = 'fa fa-exclamation-triangle';
            if (text) text.textContent = t('error', 'ERROR');
            registerBtn.title = t('registration_failed_retry', 'Registration failed - Click to retry');
            break;
            
        case 'unregistered':
        case false: // Legacy support for boolean parameter
        default:
            registerBtn.classList.add('register-disconnected');
            if (icon) icon.className = 'fa fa-power-off';
            if (text) text.textContent = t('register', 'REGISTER');
            registerBtn.title = t('connect_to_sip_server', 'Connect to SIP server');
            break;
    }
}

function updateCallButton(sessionData) {
    const callBtn = document.getElementById('callBtn');
    if (!callBtn) return;
    
    const icon = callBtn.querySelector('i');
    const text = callBtn.textContent.replace(/.*\s/, ''); // Get text after icon
    
    // Remove all call state classes
    callBtn.classList.remove('btn-success', 'btn-warning', 'btn-danger', 'btn-primary');
    
    if (!sessionData) {
        // No active session - show normal CALL button
        callBtn.classList.add('btn-success');
        if (icon) icon.className = 'fa fa-phone';
        callBtn.innerHTML = '<i class="fa fa-phone"></i> CALL';
        callBtn.title = 'Dial Number';
        return;
    }
    
    // Check if there's an incoming call that needs to be answered
    const incomingSession = App.managers.sip ? App.managers.sip.getIncomingSession() : null;
    
    if (incomingSession && sessionData.direction === 'incoming' && sessionData.state !== 'established') {
        // Incoming call - show ANSWER button
        callBtn.classList.add('btn-primary');
        if (icon) icon.className = 'fa fa-phone';
        callBtn.innerHTML = '<i class="fa fa-phone"></i> ANSWER';
        callBtn.title = 'Answer Incoming Call';
    } else if (sessionData.state === 'established') {
        // Call is established - could show transfer or other options
        callBtn.classList.add('btn-warning');
        if (icon) icon.className = 'fa fa-share';
        callBtn.innerHTML = '<i class="fa fa-share"></i> TRANSFER';
        callBtn.title = 'Transfer Call';
    } else {
        // Other states (connecting, etc.) - show calling
        callBtn.classList.add('btn-warning');
        if (icon) icon.className = 'fa fa-spinner';
        callBtn.innerHTML = '<i class="fa fa-spinner"></i> CALLING';
        callBtn.title = 'Call in progress';
    }
}

/* ====================================================================================== */
/* UTILITY FUNCTIONS */
/* ====================================================================================== */

function isValidPhoneNumber(number) {
    // Allow PBX dialing patterns including:
    // - Regular numbers with optional + prefix
    // - Numbers starting with 0 (extensions)
    // - Feature codes with * and # (like *67, 200#, *123#)
    // - Empty strings are handled elsewhere
    if (!number || typeof number !== 'string') return false;
    
    // Remove spaces, dashes, parentheses for validation
    const cleaned = number.replace(/[\s\-\(\)]/g, '');
    
    // Allow digits, *, #, and optional + at start
    // Must be 1-20 characters to accommodate feature codes and extensions
    const phoneRegex = /^[+]?[0-9*#]{1,20}$/;
    return phoneRegex.test(cleaned);
}

async function checkAndRequestNotificationPermission() {
    try {
        // Check if notifications are supported
        if (!('Notification' in window)) {
            console.warn('This browser does not support notifications');
            showNotification('warning', t('notifications_not_supported', 'Notifications not supported in this browser'));
            return false;
        }

        // Check current permission status
        let permission = Notification.permission;
        console.log('Current notification permission:', permission);

        if (permission === 'granted') {
            console.log('Notification permission already granted');
            return true;
        }

        if (permission === 'denied') {
            console.warn('Notification permission denied by user');
            showNotification('error', t('permission_denied', 'Notification permission denied. Please enable notifications in your browser settings for this site.'));
            
            // Show instructions for enabling notifications
            showNotificationPermissionHelp();
            return false;
        }

        if (permission === 'default') {
            console.log('Requesting notification permission...');
            showNotification('info', t('allow_notifications_prompt', 'Please allow notifications when prompted to receive incoming call alerts.'));
            
            // Request permission
            permission = await Notification.requestPermission();
            console.log('Notification permission response:', permission);
            
            if (permission === 'granted') {
                console.log('Notification permission granted');
                showNotification('success', 'Notifications enabled! You will now receive alerts for incoming calls.');
                
                // Update status display
                updateNotificationStatusDisplay();
                
                // Test notification
                setTimeout(() => {
                    testNotification();
                }, 1000);
                
                return true;
            } else {
                console.warn('Notification permission denied by user');
                showNotification('error', 'Notification permission denied. Incoming call notifications will not work.');
                
                // Update status display
                updateNotificationStatusDisplay();
                return false;
            }
        }

        return false;
    } catch (error) {
        console.error('Error checking notification permission:', error);
        showNotification('error', 'Error checking notification permissions');
        return false;
    }
}

function showNotificationPermissionHelp() {
    const helpMessage = `
        To enable notifications:
        
        Chrome/Edge: Click the lock icon in the address bar → Notifications → Allow
        Firefox: Click the shield icon → Enable Notifications
        Safari: Safari menu → Preferences → Websites → Notifications → Allow
        
        Then reload the page and try again.
    `;
    
    console.log('Notification permission help:', helpMessage);
    
    // You could also show this in a modal if you prefer
    if (App.managers?.ui) {
        App.managers.ui.showModal('Notification Permission Help', helpMessage);
    }
}

function testNotification() {
    try {
        if (Notification.permission === 'granted') {
            const notification = new Notification(t('call_notification_test', 'Autocab365Connect'), {
                body: t('notifications_now_enabled', 'Notifications are now enabled! You will receive alerts for incoming calls.'),
                icon: 'icons/icon-192x192.png',
                badge: 'icons/icon-192x192.png',
                tag: 'test-notification',
                requireInteraction: false
            });

            // Auto close after 4 seconds
            setTimeout(() => {
                notification.close();
            }, 4000);

            console.log('Test notification sent');
        }
    } catch (error) {
        console.error('Error sending test notification:', error);
    }
}

function updateNotificationStatusDisplay() {
    const statusElement = document.getElementById('notificationStatus');
    if (!statusElement) return;

    if (!('Notification' in window)) {
        statusElement.textContent = t('not_supported', '(Not supported)');
        statusElement.className = 'notification-status unsupported';
        return;
    }

    const permission = Notification.permission;
    switch (permission) {
        case 'granted':
            statusElement.textContent = t('allowed', '(Allowed)');
            statusElement.className = 'notification-status granted';
            break;
        case 'denied':
            statusElement.textContent = t('blocked', '(Blocked)');
            statusElement.className = 'notification-status denied';
            break;
        case 'default':
            statusElement.textContent = t('not_set', '(Not set)');
            statusElement.className = 'notification-status default';
            break;
        default:
            statusElement.textContent = t('unknown', '(Unknown)');
            statusElement.className = 'notification-status';
    }
}

/**
 * Send Windows notification for incoming calls
 * Features:
 * - Click notification to answer call and focus window
 * - Action buttons (Answer/Decline) if browser supports them
 * - Keyboard shortcuts: Press Enter or Space to answer when notification is active
 * - Auto-closes after 30 seconds
 */
function sendIncomingCallNotification(session) {
    try {
        // Check if notifications are enabled in settings (default is now '1')
        const notificationsEnabled = window.localDB && window.localDB.getItem('IncomingCallNotifications', '1') === '1';
        
        if (!notificationsEnabled) {
            console.log('📱 Incoming call notifications disabled in settings');
            return;
        }

        // Check if notifications are supported
        if (!('Notification' in window)) {
            console.log('⚠️ This browser does not support desktop notifications');
            return;
        }

        // Check if permission is granted
        if (Notification.permission !== 'granted') {
            console.log('🔔 Notification permission not granted, current permission:', Notification.permission);
            
            // If permission is 'default', try to request it
            if (Notification.permission === 'default') {
                console.log('📱 Requesting notification permission for incoming call...');
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        console.log('✅ Permission granted, retrying notification');
                        // Retry sending notification
                        sendIncomingCallNotification(session);
                    } else {
                        console.log('❌ Permission denied, cannot show notification');
                    }
                });
            }
            return;
        }

        // Extract caller information
        let callerNumber = 'Unknown';
        let callerName = '';
        
        if (session && session.session && session.session.remoteIdentity) {
            const remoteIdentity = session.session.remoteIdentity;
            
            // Extract number from SIP URI (e.g., "sip:1234@server.com" -> "1234")
            if (remoteIdentity.uri && remoteIdentity.uri.user) {
                callerNumber = remoteIdentity.uri.user;
            }
            
            // Extract display name if available
            if (remoteIdentity.displayName) {
                callerName = remoteIdentity.displayName;
            }
        }

        // Create notification title and body
        const title = 'Incoming Call';
        const body = callerName ? `${callerName} (${callerNumber})` : callerNumber;
        
        console.log('🔔 Attempting to send incoming call notification:', { title, body });
        console.log('📊 Notification.permission:', Notification.permission);
        console.log('🖥️ User agent:', navigator.userAgent);
        console.log('🌐 Location:', window.location.href);
        console.log('🔒 Protocol:', window.location.protocol);
        
        // Simple notification options for better Windows compatibility
        // Note: Action buttons removed due to Windows bug where requireInteraction doesn't work with actions
        const notificationOptions = {
            body: body,
            icon: 'icons/IncomingCallIcon.png',
            tag: 'incoming-call',
            requireInteraction: true,
            silent: false
        };
        
        console.log('📋 Notification options:', notificationOptions);
        
        // Create and show notification with error handling
        let notification;
        try {
            notification = new Notification(title, notificationOptions);
            console.log('✅ Notification object created successfully');
        } catch (notificationError) {
            console.error('❌ Failed to create notification:', notificationError);
            
            // Fallback: try with minimal options
            try {
                console.log('🔄 Trying fallback notification with minimal options...');
                notification = new Notification(title, {
                    body: body,
                    icon: 'icons/IncomingCallIcon.png'
                });
                console.log('✅ Fallback notification created');
            } catch (fallbackError) {
                console.error('❌ Fallback notification also failed:', fallbackError);
                return;
            }
        }

        // Handle notification events
        notification.onshow = () => {
            console.log('✅ Notification shown successfully');
        };
        
        notification.onerror = (error) => {
            console.error('❌ Notification error:', error);
        };
        
        notification.onclose = () => {
            console.log('🔕 Notification closed');
        };

        // Handle notification clicks - answer call when clicked
        notification.onclick = (event) => {
            console.log('🖱️ Incoming call notification clicked - answering in background');
            event.preventDefault();
            
            // Don't focus window - let user continue working
            // window.focus() removed to keep app in background
            
            notification.close();
            
            // Auto-answer the call when notification is clicked
            if (session) {
                console.log('📞 Auto-answering call from notification click (background)');
                makeCall();
            }
        };

        // Store reference for cleanup
        window.currentIncomingCallNotification = notification;
        
        // Store session reference for keyboard handler
        window.currentIncomingSession = session;

        // Don't auto-close notification - let it persist until agent stops ringing
        // Notification will be closed when call is answered or terminated
        
        console.log('📤 Notification setup complete (persistent until call answered/terminated)');

    } catch (error) {
        console.error('Error sending incoming call notification:', error);
    }
}

function triggerWebHook(event, data = null) {
    const webhookName = `web_hook_on_${event}`;
    if (typeof window[webhookName] === 'function') {
        try {
            window[webhookName](data);
        } catch (error) {
            console.error(`Error in webhook ${webhookName}:`, error);
        }
    }
}

// Function to generate server settings from Phantom ID
function generateServerSettings(phantomID) {
    if (!phantomID || phantomID === "" || phantomID === "null" || phantomID === "undefined") {
        return {
            wssServerUrl: null,
            wssPort: null,
            wssPath: null,
            SipDomain: null,
            SipServer: null
        };
    }

    const domain = `server1-${phantomID}.phantomapi.net`;

    let wssPort = 8089;
    let wssPath = "/ws";

    return {
        wssServerUrl: "wss://" + domain +":"+ wssPort + wssPath,
        wssPort: wssPort,
        wssPath: wssPath,
        SipDomain: domain,
        SipServer: domain
    };
}

// Initialize server settings from Phantom ID
function initializeServerSettings() {
    const settings = generateServerSettings(phantomID);
    wssServerUrl = settings.wssServerUrl;
    SipServer = settings.SipServer;
    wssPort = settings.wssPort;
    wssPath = settings.wssPath;
    SipDomain = settings.SipDomain;

    // Store the generated values in localStorage for consistency
    if (phantomID && phantomID !== "" && phantomID !== "null") {
        
        localDB.setItem("SipServer", SipServer);
        localDB.setItem("wssPort", wssPort.toString());
        localDB.setItem("wssPath", wssPath);
        localDB.setItem("SipDomain", SipDomain);
        localDB.setItem("wssServer", wssServerUrl);
    }
}

function buildSipConfigFromDatabase() {
    console.log('Building SIP configuration from local database');
    
    // Debug LocalDB wssServer value
    const storedServer = window.localDB ? window.localDB.getItem('wssServer', '') : '';
    console.log('🔍 LocalDB wssServer value:', storedServer || '(empty/null)');
  
    const config = {
        server: storedServer,
        pid: window.localDB ? window.localDB.getItem('PhantomID', '') : '',
        username: window.localDB ? window.localDB.getItem('SipUsername', '') : '',
        password: window.localDB ? window.localDB.getItem('SipPassword', '') : '',
        domain: window.localDB ? window.localDB.getItem('SipDomain', '') : '',
        displayName: window.localDB ? window.localDB.getItem('profileName', '') : '',
        autoAnswer: window.localDB ? window.localDB.getItem('AutoAnswerEnabled', '0') === '1' : false,
        callWaiting: window.localDB ? window.localDB.getItem('CallWaitingEnabled', '0') === '1' : false,
        busylightEnabled: window.localDB ? window.localDB.getItem('BusylightEnabled', '0') === '1' : false,
        
        // WebRTC-specific configuration
        traceSip: window.localDB ? window.localDB.getItem('SipMessagesEnabled', '0') === '1' : false,
        connectionTimeout: parseInt(window.localDB ? window.localDB.getItem('ConnectionTimeout', '20') : '20'),
        iceGatheringTimeout: parseInt(window.localDB ? window.localDB.getItem('IceGatheringTimeout', '500') : '500'),
        bundlePolicy: window.localDB ? window.localDB.getItem('BundlePolicy', 'balanced') : 'balanced',
        wssInTransport: true, // Force WebSocket transport for WebRTC
        
        // Additional WebRTC settings
        reconnectionAttempts: parseInt(window.localDB ? window.localDB.getItem('ReconnectionAttempts', '5') : '5'),
        reconnectionTimeout: parseInt(window.localDB ? window.localDB.getItem('ReconnectionTimeout', '10') : '10')
    };
    
    console.log('Built SIP config:', { 
        server: config.server || '(empty)',
        username: config.username ? '***' : '(empty)',
        password: config.password ? '***' : '(empty)',
        domain: config.domain || '(empty)',
        displayName: config.displayName || '(empty)',
        webrtc: 'enabled with enhanced settings'
    });
    
    return config;
}

function checkAndFixServerConfiguration() {
    console.log('🔧 Checking server configuration...');
    
    // Check current stored value
    const storedServer = window.localDB ? window.localDB.getItem('wssServer') : null;
    console.log('Current wssServer in LocalDB:', storedServer || '(empty/null)');
    
    // If empty or pointing to localhost, suggest the correct server
    if (!storedServer || storedServer.includes('localhost:5500') || storedServer.includes('index.html')) {
        const correctServer = 'wss://server1-388.phantomapi.net:8089/ws';
        console.log('⚠️ Server configuration is empty or invalid');
        console.log('💡 Suggested fix: Set server to:', correctServer);
        
        // Offer to auto-fix
        if (confirm(`Current server configuration is invalid: "${storedServer || '(empty)'}"\n\nWould you like to set it to: "${correctServer}"?`)) {
            window.localDB.setItem('wssServer', correctServer);
            console.log('✅ Server configuration updated to:', correctServer);
            return correctServer;
        }
    } else {
        console.log('✅ Server configuration looks good:', storedServer);
    }
    
    return storedServer;
}

function validateSipConfig(config) {
    const requiredFields = ['server', 'username', 'password'];
    const missingFields = [];
    
    requiredFields.forEach(field => {
        if (!config[field] || config[field].trim() === '') {
            switch(field) {
                case 'server':
                    missingFields.push('WebSocket Server (wssServer)');
                    break;
                case 'username':
                    missingFields.push('SIP Username');
                    break;
                case 'password':
                    missingFields.push('SIP Password');
                    break;
                default:
                    missingFields.push(field);
            }
        }
    });
    
    // Check WebRTC capabilities
    const webrtcCheck = validateWebRTCSupport();
    if (!webrtcCheck.isSupported) {
        missingFields.push('WebRTC Support: ' + webrtcCheck.reason);
    }
    
    return {
        isValid: missingFields.length === 0,
        missingFields: missingFields,
        webrtcSupport: webrtcCheck
    };
}

function validateWebRTCSupport() {
    console.log('Checking WebRTC support...');
    
    // Check basic WebRTC support
    if (!window.RTCPeerConnection) {
        return {
            isSupported: false,
            reason: 'RTCPeerConnection not available - WebRTC not supported'
        };
    }
    
    // Check WebSocket support
    if (!window.WebSocket) {
        return {
            isSupported: false,
            reason: 'WebSocket not available - required for WSS transport'
        };
    }
    
    // Check getUserMedia support (for audio)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return {
            isSupported: false,
            reason: 'getUserMedia not available - audio access required'
        };
    }
    
    // Check if we're in a secure context (required for WebRTC in modern browsers)
    if (!window.isSecureContext && location.protocol !== 'file:') {
        return {
            isSupported: false,
            reason: 'Secure context required - please use HTTPS'
        };
    }
    
    console.log('✅ WebRTC support validated');
    return {
        isSupported: true,
        reason: 'WebRTC fully supported'
    };
}

// WebRTC Diagnostic Function
function diagnoseWebRTCConnection() {
    console.log('=== WebRTC Connection Diagnostics ===');
    
    // Check basic WebRTC support
    const webrtcSupport = validateWebRTCSupport();
    console.log('WebRTC Support:', webrtcSupport);
    
    // Check current SIP configuration
    const sipConfig = buildSipConfigFromDatabase();
    console.log('SIP Configuration:', {
        server: sipConfig.server,
        domain: sipConfig.domain,
        wssInTransport: sipConfig.wssInTransport,
        connectionTimeout: sipConfig.connectionTimeout,
        iceGatheringTimeout: sipConfig.iceGatheringTimeout
    });
    
    // Test WebSocket connection to SIP server with proper SIP protocol
    if (sipConfig.server) {
        console.log('Testing SIP WebSocket connection to:', sipConfig.server);
        
        try {
            // Create WebSocket with SIP protocol for testing
            const testWs = new WebSocket(sipConfig.server, 'sip');
            
            testWs.onopen = function() {
                console.log('✅ SIP WebSocket connection test: SUCCESS');
                console.log('Protocol negotiated:', testWs.protocol);
                testWs.close();
            };
            
            testWs.onerror = function(error) {
                console.error('❌ SIP WebSocket connection test: FAILED', error);
                console.log('Make sure the server supports SIP over WebSocket protocol');
            };
            
            testWs.onclose = function(event) {
                if (event.wasClean) {
                    console.log('SIP WebSocket connection test completed cleanly');
                } else {
                    console.warn('SIP WebSocket connection test closed unexpectedly:', {
                        code: event.code,
                        reason: event.reason || 'No reason provided',
                        wasClean: event.wasClean
                    });
                }
            };
            
            // Timeout after 10 seconds for SIP WebSocket
            setTimeout(() => {
                if (testWs.readyState === WebSocket.CONNECTING) {
                    console.warn('⚠️ SIP WebSocket connection test: TIMEOUT after 10s');
                    testWs.close();
                }
            }, 10000);
            
        } catch (error) {
            console.error('❌ SIP WebSocket connection test: EXCEPTION', error);
            console.log('Check if the server URL is correct and supports WebSocket connections');
        }
    }
    
    // Test media access
    console.log('Testing media device access...');
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            console.log('✅ Media access test: SUCCESS');
            stream.getTracks().forEach(track => track.stop());
        })
        .catch(error => {
            console.error('❌ Media access test: FAILED', error);
        });
    
    // Check ICE servers
    console.log('Testing ICE server connectivity...');
    const pc = new RTCPeerConnection({
        iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" }
        ]
    });
    
    pc.createDataChannel("test");
    pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .catch(error => console.error('❌ ICE test failed:', error));
    
    pc.onicecandidate = function(event) {
        if (event.candidate) {
            console.log('✅ ICE candidate gathered:', event.candidate.candidate);
        }
    };
    
    pc.onicegatheringstatechange = function() {
        console.log('ICE gathering state:', pc.iceGatheringState);
        if (pc.iceGatheringState === 'complete') {
            pc.close();
        }
    };
    
    // Cleanup after 10 seconds
    setTimeout(() => {
        pc.close();
    }, 10000);
}

// Debug function to check SIP configuration
function debugSipConfiguration() {
    console.log('=== SIP Configuration Debug ===');
    
    if (!window.localDB) {
        console.error('❌ LocalDB not available');
        return;
    }
    
    // Get all SIP-related configuration
    const sipUsername = window.localDB.getItem('SipUsername');
    const sipPassword = window.localDB.getItem('SipPassword');
    
    const config = {
        PhantomID: window.localDB.getItem('PhantomID'),
        wssServer: window.localDB.getItem('wssServer'),
        SipUsername: sipUsername || '(empty)',
        SipPassword: sipPassword ? `*** (${sipPassword.length} chars)` : '(empty)',
        SipDomain: window.localDB.getItem('SipDomain'),
        SipServer: window.localDB.getItem('SipServer'),
        wssPort: window.localDB.getItem('wssPort'),
        wssPath: window.localDB.getItem('wssPath'),
        // Authentication status
        authConfigured: !!(sipUsername && sipPassword),
        usernameSet: !!sipUsername,
        passwordSet: !!sipPassword
    };
    
    console.table(config);
    
    // Check if configuration is pointing to development server
    const problemUrls = ['localhost:5500', '127.0.0.1:5500', 'localhost:3000'];
    const serverUrl = config.wssServer || config.SipServer;
    
    if (serverUrl) {
        const hasProblem = problemUrls.some(url => serverUrl.includes(url));
        if (hasProblem) {
            console.error('❌ PROBLEM: SIP server is pointing to development server!');
            console.error('Current server:', serverUrl);
            console.error('This should be your actual SIP server URL (e.g., wss://your-sip-server.com:8089/ws)');
        } else {
            console.log('✅ SIP server URL looks correct:', serverUrl);
        }
    } else {
        console.error('❌ No SIP server URL configured');
    }
    
    // Show what the built config would look like
    const builtConfig = buildSipConfigFromDatabase();
    console.log('Built configuration:', builtConfig);
    
    return config;
}

    // Function to test server connectivity
    function testServerConnectivity() {
        console.log('🔍 Testing SIP server connectivity...');
        
        const config = buildSipConfigFromDatabase();
        const serverUrl = config.server;
        
        if (!serverUrl) {
            console.error('❌ No server configured');
            return;
        }
        
        console.log(`Testing connection to: ${serverUrl}`);
        
        // Test WebSocket connection
        try {
            const testWs = new WebSocket(serverUrl, 'sip');
            
            testWs.onopen = function() {
                console.log('✅ WebSocket connection successful');
                console.log('Server is reachable and accepting WebSocket connections');
                testWs.close();
            };
            
            testWs.onerror = function(error) {
                console.error('❌ WebSocket connection failed:', error);
                console.error('This could indicate:');
                console.error('• Server is down');
                console.error('• Network connectivity issues');  
                console.error('• Firewall blocking connection');
                console.error('• Wrong server URL or port');
            };
            
            testWs.onclose = function(event) {
                if (event.wasClean) {
                    console.log('✅ WebSocket test completed cleanly');
                } else {
                    console.error(`❌ WebSocket closed unexpectedly: ${event.code} - ${event.reason}`);
                }
            };
            
            // Timeout after 10 seconds
            setTimeout(() => {
                if (testWs.readyState === WebSocket.CONNECTING) {
                    console.error('❌ WebSocket connection timeout');
                    testWs.close();
                }
            }, 10000);
            
        } catch (error) {
            console.error('❌ Failed to create WebSocket:', error);
        }
    }
    
    // Diagnostic function to trace the exact server URL flow
    function traceServerUrlFlow() {
        console.log('=== SERVER URL FLOW TRACE ===');
        
        // 1. Check LocalDB value
        const storedServer = window.localDB ? window.localDB.getItem('wssServer') : null;
        console.log('1. LocalDB wssServer value:', storedServer);
        console.log('   Type:', typeof storedServer);
        console.log('   Length:', storedServer ? storedServer.length : 'N/A');
        
        // 2. Build config
        const config = buildSipConfigFromDatabase();
        console.log('2. Built config.server:', config.server);
        console.log('   Type:', typeof config.server);
        console.log('   Length:', config.server ? config.server.length : 'N/A');
        
        // 3. Check what SipSessionManager receives
        if (App.managers && App.managers.sip) {
            console.log('3. SipSessionManager config.server:', App.managers.sip.config?.server);
            console.log('   Type:', typeof App.managers.sip.config?.server);
        }
        
        // 4. Check transport options that would be passed to SIP.js
        if (config.server) {
            let serverUrl;
            if (config.server.startsWith('wss://') || config.server.startsWith('ws://')) {
                serverUrl = config.server;
            } else {
                serverUrl = `wss://${config.server}:8089/ws`;
            }
            console.log('4. Constructed serverUrl for transport:', serverUrl);
        } else {
            console.log('4. ⚠️ Server is empty - this will cause fallback to localhost!');
        }
        
        console.log('=== END TRACE ===');
        return { storedServer, config, serverUrl: config.server };
    }
    
    // Make diagnostic functions globally available
    window.diagnoseWebRTCConnection = diagnoseWebRTCConnection;
    window.debugSipConfiguration = debugSipConfiguration;
    window.checkAndFixServerConfiguration = checkAndFixServerConfiguration;
    window.traceServerUrlFlow = traceServerUrlFlow;
    window.testServerConnectivity = testServerConnectivity;
    window.addNewContact = addNewContact;

/* ====================================================================================== */
/* UI EVENT HANDLERS SETUP */
/* ====================================================================================== */

window.setupUIEventHandlers = function setupUIEventHandlers() {
    console.log('Setting up UI event handlers...');
    
    // Prevent duplicate event handler setup
    if (window.uiEventHandlersSetup) {
        console.log('UI event handlers already setup, skipping...');
        return;
    }
    
    // Navigation tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Skip disabled tabs
            if (tab.classList.contains('disabled')) {
                return;
            }
            
            const view = tab.dataset.view;
            if (view) {
                console.log('Navigation clicked:', view);
                if (App.managers?.ui) {
                    App.managers.ui.setCurrentView(view);
                } else {
                    switchToView(view);
                }
            }
        });
    });
    console.log('✓ Navigation tab handlers attached to', document.querySelectorAll('.nav-tab').length, 'tabs');
    
    // Call button
    const callBtn = document.getElementById('callBtn');
    if (callBtn) {
        callBtn.addEventListener('click', () => makeCall());
        console.log('✓ Call button handler attached');
    }
    
    // Register button
    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) {
        registerBtn.addEventListener('click', () => toggleRegistration());
        console.log('✓ Register button handler attached');
    }
    
    // Theme button
    const themeBtn = document.getElementById('themeBtn');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => toggleTheme());
        console.log('✓ Theme button handler attached');
    }
    
    // Theme mode dropdown in settings
    const themeModeSelect = document.getElementById('ThemeMode');
    if (themeModeSelect) {
        themeModeSelect.addEventListener('change', (e) => {
            const selectedTheme = e.target.value;
            console.log('Theme mode changed to:', selectedTheme);
            if (App.managers?.ui) {
                App.managers.ui.setTheme(selectedTheme);
            }
        });
        console.log('✓ Theme mode dropdown handler attached');
    }
    
    // Incoming call notifications checkbox
    const notificationsCheckbox = document.getElementById('IncomingCallNotifications');
    if (notificationsCheckbox) {
        notificationsCheckbox.addEventListener('change', async (e) => {
            if (e.target.checked) {
                console.log('Incoming call notifications enabled - checking permissions...');
                const hasPermission = await checkAndRequestNotificationPermission();
                if (!hasPermission) {
                    // If permission denied, uncheck the box
                    e.target.checked = false;
                    console.log('Notification permission denied - unchecking box');
                }
            } else {
                console.log('Incoming call notifications disabled');
            }
        });
        console.log('✓ Incoming call notifications handler attached');
    }
    
    // Call control buttons
    const muteBtn = document.getElementById('muteBtn');
    const holdBtn = document.getElementById('holdBtn');
    const transferBtn = document.getElementById('transferBtn');
    const endCallBtn = document.getElementById('endCallBtn');
    const hangupBtn = document.getElementById('hangupBtn');
    
    if (muteBtn) {
        muteBtn.addEventListener('click', () => toggleMute());
        console.log('✓ Mute button handler attached');
    }
    
    if (holdBtn) {
        holdBtn.addEventListener('click', () => toggleHold());
        console.log('✓ Hold button handler attached');
    }
    
    if (transferBtn) {
        transferBtn.addEventListener('click', async () => await showTransferModal());
        console.log('✓ Transfer button handler attached');
    }
    
    if (endCallBtn) {
        endCallBtn.addEventListener('click', () => hangupCall());
        console.log('✓ End call button handler attached');
    }
    
    if (hangupBtn) {
        hangupBtn.addEventListener('click', () => hangupCall());
        console.log('✓ Hangup button handler attached');
    }
    
    // Transfer modal controls
    const transferModalClose = document.getElementById('transferModalClose');
    const blindTransferBtn = document.getElementById('blindTransferBtn');
    const attendedTransferBtn = document.getElementById('attendedTransferBtn');
    const cancelTransferBtn = document.getElementById('cancelTransferBtn');
    const completeTransferBtn = document.getElementById('completeTransferBtn');
    const cancelAttendedBtn = document.getElementById('cancelAttendedBtn');
    const transferModal = document.getElementById('transferModal');
    const transferNumber = document.getElementById('transferNumber');
    
    if (transferModalClose) {
        transferModalClose.addEventListener('click', async () => await hideTransferModal());
        console.log('✓ Transfer modal close handler attached');
    }
    
    if (blindTransferBtn) {
        blindTransferBtn.addEventListener('click', () => performBlindTransfer());
        console.log('✓ Blind transfer button handler attached');
    }
    
    if (attendedTransferBtn) {
        attendedTransferBtn.addEventListener('click', () => performAttendedTransfer());
        console.log('✓ Attended transfer button handler attached');
    }
    
    if (cancelTransferBtn) {
        cancelTransferBtn.addEventListener('click', async () => await hideTransferModal());
        console.log('✓ Cancel transfer button handler attached');
    }
    
    if (completeTransferBtn) {
        completeTransferBtn.addEventListener('click', () => completeAttendedTransfer());
        console.log('✓ Complete transfer button handler attached');
    }
    
    if (cancelAttendedBtn) {
        cancelAttendedBtn.addEventListener('click', () => cancelAttendedTransfer());
        console.log('✓ Cancel attended transfer button handler attached');
    }
    
    // Close modal when clicking outside
    if (transferModal) {
        transferModal.addEventListener('click', (e) => {
            if (e.target === transferModal) {
                hideTransferModal();
            }
        });
    }
    
    // Prevent modal content clicks from closing modal
    const transferModalContent = document.querySelector('.transfer-modal-content');
    if (transferModalContent) {
        transferModalContent.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
    
    // Handle Enter key in transfer input
    if (transferNumber) {
        transferNumber.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleTransferEnterKey();
            }
        });
        
        // Debug input events
        transferNumber.addEventListener('input', (e) => {
            console.log('📝 Transfer input changed:', e.target.value);
        });
        
        transferNumber.addEventListener('focus', () => {
            console.log('🎯 Transfer input focused');
        });
        
        transferNumber.addEventListener('blur', () => {
            console.log('👋 Transfer input blurred');
        });
        
        // DIRECT keydown handler on input to bypass all other handlers
        transferNumber.addEventListener('keydown', (e) => {
            console.log('⌨️ Direct keydown on transfer input:', e.key);
            
            // Force allow number/special character keys
            const allowedKeys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '#', '+', '-'];
            if (allowedKeys.includes(e.key)) {
                console.log('🔧 Force allowing key:', e.key);
                e.stopPropagation(); // Stop other handlers from interfering
                
                // Manually insert the character if needed
                const currentValue = transferNumber.value;
                const cursorPos = transferNumber.selectionStart;
                const newValue = currentValue.slice(0, cursorPos) + e.key + currentValue.slice(transferNumber.selectionEnd);
                
                // Set the value and cursor position
                setTimeout(() => {
                    transferNumber.value = newValue;
                    transferNumber.setSelectionRange(cursorPos + 1, cursorPos + 1);
                    // Trigger input event
                    transferNumber.dispatchEvent(new Event('input', { bubbles: true }));
                }, 0);
            }
        });
    }
    
    // Dial pad keys
    document.querySelectorAll('.dialpad-key').forEach(key => {
        key.addEventListener('click', (e) => {
            const digit = e.currentTarget.dataset.digit || 
                         e.currentTarget.querySelector('.digit')?.textContent;
            if (digit) {
                handleDialpadInput(digit);
            }
        });
    });
    console.log('✓ Dialpad handlers attached to', document.querySelectorAll('.dialpad-key').length, 'keys');
    
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            handleSearch(e.target.value);
        });
        console.log('✓ Search input handler attached');
    }
    
    // Clear search button
    const clearSearch = document.getElementById('clearSearch');
    if (clearSearch) {
        clearSearch.addEventListener('click', () => {
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.value = '';
                handleSearch('');
            }
        });
        console.log('✓ Clear search button handler attached');
    }
    
    // Dial input
    const dialInput = document.getElementById('dialInput');
    if (dialInput) {
        dialInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                makeCall();
            }
        });
        console.log('✓ Dial input handler attached');
    }
    
    // Clear dial button
    const clearDial = document.getElementById('clearDial');
    if (clearDial) {
        clearDial.addEventListener('click', () => {
            const dialInput = document.getElementById('dialInput');
            if (dialInput) {
                dialInput.value = '';
            }
        });
        console.log('✓ Clear dial button handler attached');
    }
    
    // Settings form load
    const settingsTab = document.getElementById('navSettings');
    if (settingsTab) {
        settingsTab.addEventListener('click', () => {
            setTimeout(loadSettingsIntoForm, 100);
            // Start microphone monitoring when settings tab is opened
            setTimeout(() => {
                if (App.managers?.audio) {
                    App.managers.audio.startMicrophoneLevelMonitoring();
                }
            }, 200);
        });
    }
    
    // Audio device selection handlers
    setupAudioDeviceHandlers();
    
    console.log('UI event handlers setup complete');
    
    // Mark event handlers as setup to prevent duplicates
    window.uiEventHandlersSetup = true;
    
    // Set up SIP connection monitoring
    setupSipConnectionMonitoring();
}

function initializeContainerVisibility() {
    console.log('🔧 Initializing container visibility...');
    
    const searchContainer = document.getElementById('searchContainer');
    const agentKeysContainer = document.getElementById('agentKeysContainer');
    
    if (searchContainer) {
        searchContainer.style.display = 'none';
        searchContainer.classList.add('hidden');
        console.log('✓ Search container initially hidden');
    }
    
    if (agentKeysContainer) {
        agentKeysContainer.style.display = 'none';
        agentKeysContainer.classList.add('hidden');
        console.log('✓ Agent keys container initially hidden');
    }
    
    const activeTab = document.querySelector('.nav-tab.active');
    if (activeTab) {
        const view = activeTab.dataset.view;
        console.log('Initial active view:', view);
        
        if (view === 'contacts' && searchContainer) {
            searchContainer.style.display = 'block';
            searchContainer.classList.remove('hidden');
            console.log('✓ Search container shown for contacts view');
        } else if (view === 'dial' && agentKeysContainer) {
            agentKeysContainer.style.display = 'block';
            agentKeysContainer.classList.remove('hidden');
            console.log('✓ Agent keys container shown for dial view');
        }
    }
    
    if (activeTab) {
        document.body.classList.add(`view-${activeTab.dataset.view}`);
    }
    
    console.log('✅ Container visibility initialized');
}

/* ====================================================================================== */
/* BACKWARD COMPATIBILITY */
/* ====================================================================================== */

// Add new theme functions to global scope
window.toggleTheme = toggleTheme;
window.handleThemeSelectChange = handleThemeSelectChange;
window.previewCurrentTheme = previewCurrentTheme;
window.updateThemeDisplay = updateThemeDisplay;

// Legacy compatibility
window.changeTheme = handleThemeSelectChange;
window.previewTheme = previewCurrentTheme;

window.addEventListener('beforeunload', () => {
    console.log('Page unloading, cleaning up...');
    
    App.timers.forEach(timerId => clearInterval(timerId));
    App.timers.clear();
    
    // Clear session-specific agent data (agent name cache)
    try {
        sessionStorage.removeItem('cachedAgentName');
        console.log('✅ Cleared session cache for agent data');
    } catch (e) {
        console.warn('Failed to clear session cache:', e);
    }
    
    if (App.managers.sip) {
        App.managers.sip.destroy();
    }
    if (App.managers.busylight) {
        App.managers.busylight.disconnect();
    }
    if (App.managers.ui) {
        App.managers.ui.destroy();
    }
});

document.addEventListener('keydown', (e) => {
    // Shortcut keys
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        showDial();
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        showContacts();
    }
    
    if (e.key === 'Escape') {
        clearSearch();
    }
    
    // Answer incoming call with Space or Enter key
    if (e.key === ' ' || e.key === 'Enter') {
        const ringingSession = App.managers.sip.getAllSessions().find(s => s.state === 'ringing');
        if (ringingSession) {
            // Don't prevent default if Enter is pressed in an input field
            if (e.key === ' ' || !e.target.matches('input, textarea, [contenteditable]')) {
                e.preventDefault();
                console.log('⌨️ Answering call via', e.key === ' ' ? 'Space' : 'Enter', 'key');
                answerCall(ringingSession.id);
                
                // Close notification if present
                if (window.currentIncomingCallNotification) {
                    window.currentIncomingCallNotification.close();
                    window.currentIncomingCallNotification = null;
                }
            }
        }
    }
    
    // DTMF key support during active calls
    // Only send DTMF if:
    // 1. App is ready and SIP manager exists  
    // 2. There's an active call session
    // 3. Not typing in an input field or transfer modal
    // 4. Key is a valid DTMF digit
    
    // Debug logging for transfer input issues
    const validDtmfKeys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '#'];
    if (validDtmfKeys.includes(e.key)) {
        console.log('🔍 DTMF Key Debug:', {
            key: e.key,
            target: e.target.tagName + (e.target.id ? '#' + e.target.id : ''),
            isInput: e.target.matches('input, textarea, [contenteditable]'),
            inTransferModal: !!e.target.closest('.transfer-modal'),
            isTransferNumber: e.target.id === 'transferNumber',
            willSendDTMF: App.managers && App.managers.sip && 
                         !e.target.matches('input, textarea, [contenteditable]') &&
                         !e.target.closest('.transfer-modal') &&
                         e.target.id !== 'transferNumber' &&
                         !e.ctrlKey && !e.metaKey && !e.altKey
        });
    }
    
    if (App.managers && App.managers.sip && 
        !e.target.matches('input, textarea, [contenteditable]') &&
        !e.target.closest('.transfer-modal') &&
        e.target.id !== 'transferNumber' &&
        !e.ctrlKey && !e.metaKey && !e.altKey) {
        
        const activeSessions = App.managers.sip.getActiveSessions();
        if (activeSessions.length > 0) {
            const key = e.key;
            const validDtmfKeys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '#'];
            
            if (validDtmfKeys.includes(key)) {
                // CRITICAL: Never prevent default for transfer input
                if (e.target.id === 'transferNumber' || e.target.closest('.transfer-modal')) {
                    console.log('✅ Allowing key in transfer input:', key);
                    return; // Exit early, don't send DTMF
                }
                
                e.preventDefault();
                console.log(`Keyboard DTMF: ${key}`);
                
                // Send DTMF tone
                sendDTMF(key).catch(error => {
                    console.error('Keyboard DTMF failed:', error);
                });
                
                // Visual feedback - simulate button press
                const dialpadKey = document.querySelector(`.dialpad-key[data-digit="${key}"]`);
                if (dialpadKey) {
                    dialpadKey.classList.add('pressed');
                    setTimeout(() => {
                        dialpadKey.classList.remove('pressed');
                    }, 150);
                }
                
                // Also add to dial input if visible (for display purposes)
                const dialInput = document.getElementById('dialInput');
                if (dialInput && !dialInput.disabled) {
                    dialInput.value += key;
                }
            }
        }
    }
});

/* ====================================================================================== */
/* PHANTOM API DEBUG FUNCTIONS */
/* ====================================================================================== */

// Debug function to check Phantom API configuration
function debugPhantomApiConfiguration() {
    console.log('=== Phantom API Configuration Debug ===');
    
    if (!App.managers?.api) {
        console.error('❌ Phantom API Manager not available');
        return;
    }
    
    const apiManager = App.managers.api;
    const config = apiManager.getConfig();
    const phantomId = apiManager.getPhantomId();
    
    const debugInfo = {
        phantomId: phantomId || '(not set)',
        baseUrl: config.baseUrl || '(not generated)',
        timeout: config.timeout,
        isReady: apiManager.isReady(),
        expectedUrl: phantomId ? `https://server1-${phantomId}.phantomapi.net:443/api` : '(needs PhantomID)'
    };
    
    console.table(debugInfo);
    
    if (!phantomId) {
        console.error('❌ PROBLEM: PhantomID not configured!');
        console.error('Set PhantomID in settings to use Phantom API');
    } else if (!apiManager.isReady()) {
        console.error('❌ PROBLEM: API Manager not ready!');
        console.error('Call App.managers.api.initialize() to configure');
    } else {
        console.log('✅ Phantom API configuration looks correct');
    }
    
    return debugInfo;
}

// Test Phantom API connectivity
async function testPhantomApiConnection() {
    console.log('=== Testing Phantom API Connection ===');
    
    if (!App.managers?.api) {
        console.error('❌ Phantom API Manager not available');
        return { success: false, error: 'API Manager not available' };
    }
    
    try {
        const result = await App.managers.api.testConnection();
        if (result.success) {
            console.log('✅ API connection test passed:', result);
        } else {
            console.error('❌ API connection test failed:', result.error);
        }
        return result;
    } catch (error) {
        console.error('❌ API connection test error:', error);
        return { success: false, error: error.message };
    }
}

// Example API request function
async function examplePhantomApiRequest(apiName = 'ping', data = null) {
    console.log(`=== Example API Request to '${apiName}' ===`);
    
    if (!App.managers?.api) {
        console.error('❌ Phantom API Manager not available');
        return { success: false, error: 'API Manager not available' };
    }
    
    try {
        let result;
        
        if (data) {
            // POST request with data
            result = await App.managers.api.post(apiName, data);
            console.log(`POST ${apiName} result:`, result);
        } else {
            // GET request
            result = await App.managers.api.get(apiName);
            console.log(`GET ${apiName} result:`, result);
        }
        
        return result;
    } catch (error) {
        console.error(`API request error:`, error);
        return { success: false, error: error.message };
    }
}

/* ====================================================================================== */
/* AUDIO SETTINGS FUNCTIONS */
/* ====================================================================================== */

function setupAudioDeviceHandlers() {
    console.log('Setting up audio device handlers...');
    
    // Speaker device selection
    const speakerSelect = document.getElementById('audioSpeakerDevice');
    if (speakerSelect) {
        speakerSelect.addEventListener('change', (e) => {
            if (App.managers?.audio) {
                App.managers.audio.updateDeviceSelection('speaker', e.target.value);
            }
        });
        console.log('✓ Speaker device handler attached');
    }
    
    // Microphone device selection
    const microphoneSelect = document.getElementById('audioMicrophoneDevice');
    if (microphoneSelect) {
        microphoneSelect.addEventListener('change', (e) => {
            if (App.managers?.audio) {
                App.managers.audio.updateDeviceSelection('microphone', e.target.value);
            }
        });
        console.log('✓ Microphone device handler attached');
    }
    
    // Ringer device selection
    const ringerSelect = document.getElementById('audioRingerDevice');
    if (ringerSelect) {
        ringerSelect.addEventListener('change', (e) => {
            if (App.managers?.audio) {
                App.managers.audio.updateDeviceSelection('ringer', e.target.value);
            }
        });
        console.log('✓ Ringer device handler attached');
    }
    
    // Ringtone selection
    const ringtoneSelect = document.getElementById('audioRingtoneFile');
    if (ringtoneSelect) {
        ringtoneSelect.addEventListener('change', (e) => {
            if (App.managers?.audio) {
                App.managers.audio.updateDeviceSelection('ringtone', e.target.value);
            }
        });
        console.log('✓ Ringtone selection handler attached');
    }
}

function testAudioDevice(deviceType) {
    console.log(`Testing ${deviceType} device...`);
    
    if (!App.managers?.audio) {
        console.warn('Audio manager not available');
        return;
    }
    
    App.managers.audio.playTestTone(deviceType);
}

function testRingtone() {
    console.log('Testing selected ringtone...');
    
    if (!App.managers?.audio) {
        console.warn('Audio manager not available');
        return;
    }
    
    App.managers.audio.playSelectedRingtone();
}

// Comprehensive notification debugging function
function debugNotifications() {
    console.log('🔍 === NOTIFICATION SYSTEM DEBUG ===');
    console.log('🌐 URL:', window.location.href);
    console.log('🔒 Protocol:', window.location.protocol);
    console.log('🖥️ User Agent:', navigator.userAgent);
    console.log('📱 Platform:', navigator.platform);
    console.log('🔔 Notification Support:', 'Notification' in window);
    
    if ('Notification' in window) {
        console.log('📊 Permission:', Notification.permission);
        console.log('🎯 Max Actions:', Notification.maxActions || 'Not supported');
        console.log('🔧 Prototype Actions:', 'actions' in Notification.prototype);
    }
    
    // Check PWA context
    console.log('📱 PWA Context:');
    console.log('  - Display Mode:', window.matchMedia('(display-mode: standalone)').matches ? 'Standalone' : 'Browser');
    console.log('  - Service Worker:', 'serviceWorker' in navigator);
    
    // Check Windows Focus API
    console.log('🪟 Windows API:');
    console.log('  - Focus:', typeof window.focus);
    console.log('  - Chrome:', !!window.chrome);
    console.log('  - Document Visibility:', document.visibilityState);
    
    // Check local storage settings
    if (window.localDB) {
        const notificationSetting = window.localDB.getItem('IncomingCallNotifications', '0');
        console.log('⚙️ Settings:');
        console.log('  - Notifications Enabled:', notificationSetting === '1');
    }
    
    return {
        supported: 'Notification' in window,
        permission: Notification.permission,
        platform: navigator.platform,
        protocol: window.location.protocol,
        standalone: window.matchMedia('(display-mode: standalone)').matches
    };
}



// Dial voicemail access code
async function dialVoicemail() {
    console.log('📞 Voicemail icon clicked');
    
    try {
        if (!window.localDB) {
            console.warn('⚠️ Local storage not available');
            return;
        }
        
        const vmAccessCode = window.localDB.getItem('VmAccess', '');
        
        if (!vmAccessCode || vmAccessCode.trim() === '') {
            console.warn('⚠️ VM Access code not configured');
            if (App.managers?.ui) {
                App.managers.ui.addNotification({
                    type: 'warning',
                    title: 'Voicemail',
                    message: 'VM Access code not configured. Please set it in Connection Settings.',
                    duration: 4000
                });
            }
            return;
        }
        
        console.log('📞 Dialing VM Access code:', vmAccessCode);
        
        if (App.managers?.sip) {
            await App.managers.sip.makeCall(vmAccessCode.trim());
            
            if (App.managers?.ui) {
                App.managers.ui.addNotification({
                    type: 'success',
                    title: 'Voicemail',
                    message: `Calling voicemail: ${vmAccessCode}`,
                    duration: 2000
                });
            }
        } else {
            console.warn('⚠️ SIP manager not available');
            if (App.managers?.ui) {
                App.managers.ui.addNotification({
                    type: 'error',
                    title: 'Error',
                    message: 'Phone system not ready',
                    duration: 3000
                });
            }
        }
    } catch (error) {
        console.error('❌ Error dialing voicemail:', error);
        if (App.managers?.ui) {
            App.managers.ui.addNotification({
                type: 'error',
                title: 'Voicemail Error',
                message: 'Failed to dial voicemail access code',
                duration: 3000
            });
        }
    }
}

// Update voicemail message waiting indication
function updateVoicemailMWI(voicemailData) {
    if (!voicemailData) return;
    
    const countElement = document.getElementById('voicemailCount');
    const textElement = document.querySelector('.voicemail-text');
    const iconElement = document.getElementById('voicemailIcon');
    
    if (!countElement || !textElement || !iconElement) return;
    
    const newMessages = voicemailData.newVoiceMessages || 0;
    const hasMessages = newMessages > 0;
    
    console.log('📧 Updating voicemail MWI:', {
        newMessages,
        messagesWaiting: voicemailData.messagesWaiting,
        hasMessages
    });
    
    if (hasMessages) {
        // Show count and "NEW" text
        countElement.textContent = newMessages;
        countElement.classList.remove('hidden');
        textElement.classList.remove('hidden');
        
        // Add flashing animation only to icon
        iconElement.classList.add('message-waiting');
        
        // Update tooltip
        iconElement.title = `Voicemail (${newMessages} new message${newMessages > 1 ? 's' : ''})`;
    } else {
        // Hide count and text
        countElement.classList.add('hidden');
        textElement.classList.add('hidden');
        
        // Remove flashing animation
        iconElement.classList.remove('message-waiting');
        
        // Reset tooltip
        iconElement.title = 'Voicemail';
    }
}

// Listen for NOTIFY events from SIP manager
function setupVoicemailMWI() {
    if (App.managers?.sip) {
        App.managers.sip.on('notifyReceived', (data) => {
            if (data.event && data.event.toLowerCase().includes('message-summary') && data.voicemailData) {
                updateVoicemailMWI(data.voicemailData);
            }
        });
        console.log('✅ Voicemail MWI listener registered');
    } else {
        console.warn('⚠️ SIP manager not available for MWI setup');
    }
}

// Update device name display when SIP settings change
function updateDeviceNameDisplay() {
    if (App.managers?.ui) {
        App.managers.ui.updateSipStatusDisplay();
    }
}

// Make audio and debug functions globally available
window.testAudioDevice = testAudioDevice;
window.testRingtone = testRingtone;
window.testNotification = testNotification;
window.debugNotifications = debugNotifications;
window.dialVoicemail = dialVoicemail;
window.updateVoicemailMWI = updateVoicemailMWI;
window.setupVoicemailMWI = setupVoicemailMWI;
window.updateDeviceNameDisplay = updateDeviceNameDisplay;

// Make debug functions globally available
window.debugPhantomApiConfiguration = debugPhantomApiConfiguration;
window.testPhantomApiConnection = testPhantomApiConnection;
window.examplePhantomApiRequest = examplePhantomApiRequest;

// Expose App object globally for other managers to access
window.App = App;

/* ====================================================================================== */
/* PHONE OBJECT - BACKWARD COMPATIBILITY & EXTERNAL API */
/* ====================================================================================== */

// Create Phone object for external API access and backward compatibility
window.Phone = {
    switchTab: function(view) {
        if (App.managers.ui && typeof App.managers.ui.switchToView === 'function') {
            App.managers.ui.switchToView(view);
            console.log('📞 Phone.switchTab called:', view);
        } else {
            console.error('📞 Phone.switchTab: UI manager not available');
        }
    },
    
    getApp: function() {
        return App;
    },
    
    getManagers: function() {
        return App.managers;
    }
};

// Export functions used by app-startup.js and other modules
window.initializeContainerVisibility = initializeContainerVisibility;
window.clearDialInput = clearDialInput;
window.getLastDialedNumber = getLastDialedNumber;
window.loadSettingsIntoForm = loadSettingsIntoForm;
window.updateRegisterButton = updateRegisterButton;
window.showSuccessNotification = showSuccessNotification;
window.showErrorNotification = showErrorNotification;

/* ====================================================================================== */
/* END OF FILE */
/* ====================================================================================== */