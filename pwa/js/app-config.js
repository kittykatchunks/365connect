/* ====================================================================================== */
/* AUTOCAB365CONNECT PWA - APPLICATION CONFIGURATION */
/* Centralized configuration management for the application */
/* Version: 0.1.001 */
/* ====================================================================================== */

// Application Configuration
const AppConfig = {
    version: "0.1.001",
    sipjs: "0.21.2",
    
    // Feature flags
    features: {
        loadAlternateLang: true,
        enableBusylight: true,
        enableBLF: true,
        enableRecording: false,
        enableVideoCall: false
    },
    
    // Default settings
    defaults: {
        autoAnswer: false,
        recordAllCalls: false,
        busylightEnabled: false,
        theme: 'auto'
    },
    
    // CDN Configuration
    cdn: {
        primary: 'https://dtd6jl0d42sve.cloudfront.net',
        fallback: 'https://unpkg.com'
    },
    
    // Dependencies
    dependencies: {
        jquery: '3.6.1',
        jqueryUI: '1.13.2',
        sipjs: '0.20.0',
        moment: '2.24.0',
        croppie: '2.6.4'
    }
};

// Global App object
window.App = {
    initialized: false,
    managers: {},
    config: {},
    buddies: [],
    currentCall: null,
    registrationState: 'unregistered'
};

// Web hooks for external integration
const WebHooks = {
    onLanguagePackLoaded: function(lang) {
        console.log("Language pack loaded:", lang);
        document.dispatchEvent(new CustomEvent('languagePackLoaded', { detail: lang }));
    },
    
    onBeforeInit: function(options) {
        console.log("Before initialization:", options);
        document.dispatchEvent(new CustomEvent('beforeInit', { detail: options }));
    },
    
    onInit: function() {
        console.log("Application initialized");
        document.dispatchEvent(new CustomEvent('appInitialized'));
    },
    
    onRegister: function(userAgent) {
        console.log("SIP registered:", userAgent);
        App.registrationState = 'registered';
        document.dispatchEvent(new CustomEvent('sipRegistered', { detail: userAgent }));
    },
    
    onUnregister: function() {
        console.log("SIP unregistered");
        App.registrationState = 'unregistered';
        document.dispatchEvent(new CustomEvent('sipUnregistered'));
    },
    
    onInvite: function(sessionData) {
        console.log("Incoming call:", sessionData);
        document.dispatchEvent(new CustomEvent('incomingCall', { detail: sessionData }));
    },
    
    onAnswer: function(sessionData) {
        console.log("Call answered:", sessionData);
        App.currentCall = sessionData;
        document.dispatchEvent(new CustomEvent('callAnswered', { detail: sessionData }));
    },
    
    onTerminate: function(sessionData) {
        console.log("Call terminated:", sessionData);
        App.currentCall = null;
        document.dispatchEvent(new CustomEvent('callTerminated', { detail: sessionData }));
    },
    
    onNotify: function(data) {
        console.log("NOTIFY received:", data);
        document.dispatchEvent(new CustomEvent('sipNotify', { detail: data }));
    },
    
    onMessage: function(data) {
        console.log("MESSAGE received:", data);
        document.dispatchEvent(new CustomEvent('sipMessage', { detail: data }));
    },
    
    onDTMF: function(data) {
        console.log("DTMF received:", data);
        document.dispatchEvent(new CustomEvent('dtmfReceived', { detail: data }));
    }
};

// Legacy web hook support (for backward compatibility)
function setupLegacyWebHooks() {
    window.web_hook_on_language_pack_loaded = WebHooks.onLanguagePackLoaded;
    window.web_hook_on_before_init = WebHooks.onBeforeInit;
    window.web_hook_on_init = WebHooks.onInit;
    window.web_hook_on_register = WebHooks.onRegister;
    window.web_hook_on_unregistered = WebHooks.onUnregister;
    window.web_hook_on_invite = WebHooks.onInvite;
    window.web_hook_on_answer = WebHooks.onAnswer;
    window.web_hook_on_terminate = WebHooks.onTerminate;
    window.web_hook_on_notify = WebHooks.onNotify;
    window.web_hook_on_message = WebHooks.onMessage;
    window.web_hook_on_dtmf = WebHooks.onDTMF;
}

// Initialize legacy web hooks
setupLegacyWebHooks();

// Note: Service Worker is registered in index.html to avoid duplicate registration

// Make config globally available
window.AppConfig = AppConfig;
window.WebHooks = WebHooks;