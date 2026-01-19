// ============================================
// Diagnostic Utilities
// ============================================
// Debug helper functions for troubleshooting SIP/WebRTC issues
// Based on PWA implementation in pwa/js/phone.js

import { isVerboseLoggingEnabled } from '@/utils';

/**
 * Debug utilities interface
 */
interface DebugUtilities {
  diagnoseWebRTC: () => Promise<DiagnosticReport>;
  debugSipConfig: () => SipConfiguration;
  testServerConnectivity: () => Promise<WebSocketTestResult>;
  getSipConfig: () => SipConfiguration;
  validateWebRTC: () => WebRTCSupport;
}

declare global {
  interface Window {
    __debug?: DebugUtilities;
  }
}

/**
 * Diagnostic report structure
 */
export interface DiagnosticReport {
  webrtcSupport: WebRTCSupport;
  sipConfiguration: SipConfiguration;
  websocketTest?: WebSocketTestResult;
  mediaTest?: MediaTestResult;
  iceTest?: IceTestResult;
}

interface WebRTCSupport {
  hasGetUserMedia: boolean;
  hasRTCPeerConnection: boolean;
  hasWebSocket: boolean;
  hasMediaDevices: boolean;
  browserInfo: string;
}

interface SipConfiguration {
  phantomId?: string;
  server?: string;
  domain?: string;
  username?: string;
  hasPassword: boolean;
  sipMessagesEnabled: boolean;
  verboseLogging: boolean;
  authConfigured: boolean;
}

interface WebSocketTestResult {
  success: boolean;
  error?: string;
  protocol?: string;
  serverUrl?: string;
}

interface MediaTestResult {
  success: boolean;
  error?: string;
  devices?: MediaDeviceInfo[];
}

interface IceTestResult {
  candidates: string[];
  gatheringState: string;
}

/**
 * Validate WebRTC support in current browser
 */
function validateWebRTCSupport(): WebRTCSupport {
  const verboseLogging = isVerboseLoggingEnabled();
  
  const support: WebRTCSupport = {
    hasGetUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    hasRTCPeerConnection: !!window.RTCPeerConnection,
    hasWebSocket: !!window.WebSocket,
    hasMediaDevices: !!navigator.mediaDevices,
    browserInfo: navigator.userAgent
  };
  
  if (verboseLogging) {
    console.log('[Diagnostics] WebRTC support check:', support);
  }
  
  return support;
}

/**
 * Get SIP configuration from settings store
 */
function getSipConfiguration(): SipConfiguration {
  const verboseLogging = isVerboseLoggingEnabled();
  
  try {
    const settingsStore = localStorage.getItem('settings-store');
    if (!settingsStore) {
      if (verboseLogging) {
        console.warn('[Diagnostics] No settings-store found in localStorage');
      }
      return {
        hasPassword: false,
        sipMessagesEnabled: false,
        verboseLogging: false,
        authConfigured: false
      };
    }
    
    const parsed = JSON.parse(settingsStore);
    const settings = parsed?.state?.settings;
    
    const config: SipConfiguration = {
      phantomId: settings?.connection?.phantomId || undefined,
      server: settings?.connection?.server || undefined,
      domain: settings?.connection?.domain || undefined,
      username: settings?.connection?.username || undefined,
      hasPassword: !!(settings?.connection?.password && settings.connection.password.length > 0),
      sipMessagesEnabled: settings?.advanced?.sipMessagesEnabled === true,
      verboseLogging: settings?.advanced?.verboseLogging === true,
      authConfigured: !!(settings?.connection?.username && settings?.connection?.password)
    };
    
    if (verboseLogging) {
      console.log('[Diagnostics] SIP configuration:', config);
    }
    
    return config;
  } catch (error) {
    console.error('[Diagnostics] Failed to read SIP configuration:', error);
    return {
      hasPassword: false,
      sipMessagesEnabled: false,
      verboseLogging: false,
      authConfigured: false
    };
  }
}

/**
 * Test WebSocket connection to SIP server
 */
async function testWebSocketConnection(serverUrl: string): Promise<WebSocketTestResult> {
  const verboseLogging = isVerboseLoggingEnabled();
  
  if (verboseLogging) {
    console.log('[Diagnostics] Testing SIP WebSocket connection to:', serverUrl);
  }
  
  return new Promise((resolve) => {
    try {
      // Create WebSocket with SIP protocol for testing
      const testWs = new WebSocket(serverUrl, 'sip');
      
      const timeout = setTimeout(() => {
        if (testWs.readyState === WebSocket.CONNECTING) {
          if (verboseLogging) {
            console.warn('[Diagnostics] ⚠️ SIP WebSocket connection test: TIMEOUT after 10s');
          }
          testWs.close();
          resolve({
            success: false,
            error: 'Connection timeout after 10 seconds',
            serverUrl
          });
        }
      }, 10000);
      
      testWs.onopen = function() {
        clearTimeout(timeout);
        if (verboseLogging) {
          console.log('[Diagnostics] ✅ SIP WebSocket connection test: SUCCESS');
          console.log('[Diagnostics] Protocol negotiated:', testWs.protocol);
        }
        testWs.close();
        resolve({
          success: true,
          protocol: testWs.protocol,
          serverUrl
        });
      };
      
      testWs.onerror = function(error) {
        clearTimeout(timeout);
        console.error('[Diagnostics] ❌ SIP WebSocket connection test: FAILED', error);
        resolve({
          success: false,
          error: 'WebSocket connection failed - make sure the server supports SIP over WebSocket protocol',
          serverUrl
        });
      };
      
      testWs.onclose = function(event) {
        clearTimeout(timeout);
        if (!event.wasClean) {
          if (verboseLogging) {
            console.warn('[Diagnostics] SIP WebSocket connection test closed unexpectedly:', {
              code: event.code,
              reason: event.reason || 'No reason provided',
              wasClean: event.wasClean
            });
          }
        }
      };
      
    } catch (error) {
      console.error('[Diagnostics] ❌ SIP WebSocket connection test: EXCEPTION', error);
      resolve({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        serverUrl
      });
    }
  });
}

/**
 * Test media device access
 */
async function testMediaAccess(): Promise<MediaTestResult> {
  const verboseLogging = isVerboseLoggingEnabled();
  
  if (verboseLogging) {
    console.log('[Diagnostics] Testing media device access...');
  }
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const devices = await navigator.mediaDevices.enumerateDevices();
    
    // Stop all tracks
    stream.getTracks().forEach(track => track.stop());
    
    if (verboseLogging) {
      console.log('[Diagnostics] ✅ Media access test: SUCCESS');
      console.log('[Diagnostics] Available devices:', devices.length);
    }
    
    return {
      success: true,
      devices
    };
  } catch (error) {
    console.error('[Diagnostics] ❌ Media access test: FAILED', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Test ICE server connectivity
 */
async function testIceConnectivity(): Promise<IceTestResult> {
  const verboseLogging = isVerboseLoggingEnabled();
  
  if (verboseLogging) {
    console.log('[Diagnostics] Testing ICE server connectivity...');
  }
  
  return new Promise((resolve) => {
    const candidates: string[] = [];
    
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
      ]
    });
    
    pc.createDataChannel("test");
    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .catch(error => {
        console.error('[Diagnostics] ❌ ICE test failed:', error);
        pc.close();
        resolve({ candidates: [], gatheringState: 'failed' });
      });
    
    pc.onicecandidate = function(event) {
      if (event.candidate) {
        candidates.push(event.candidate.candidate);
        if (verboseLogging) {
          console.log('[Diagnostics] ✅ ICE candidate gathered:', event.candidate.candidate);
        }
      }
    };
    
    pc.onicegatheringstatechange = function() {
      if (verboseLogging) {
        console.log('[Diagnostics] ICE gathering state:', pc.iceGatheringState);
      }
      if (pc.iceGatheringState === 'complete') {
        pc.close();
        resolve({
          candidates,
          gatheringState: pc.iceGatheringState
        });
      }
    };
    
    // Cleanup after 10 seconds
    setTimeout(() => {
      if (pc.iceGatheringState !== 'complete') {
        pc.close();
        resolve({
          candidates,
          gatheringState: pc.iceGatheringState
        });
      }
    }, 10000);
  });
}

/**
 * Comprehensive WebRTC connection diagnostics
 * Based on PWA's diagnoseWebRTCConnection function
 */
export async function diagnoseWebRTCConnection(): Promise<DiagnosticReport> {
  const verboseLogging = isVerboseLoggingEnabled();
  
  console.log('=== WebRTC Connection Diagnostics ===');
  
  // Check basic WebRTC support
  const webrtcSupport = validateWebRTCSupport();
  console.log('WebRTC Support:', webrtcSupport);
  
  // Check current SIP configuration
  const sipConfiguration = getSipConfiguration();
  console.log('SIP Configuration:', {
    server: sipConfiguration.server,
    domain: sipConfiguration.domain,
    username: sipConfiguration.username,
    hasPassword: sipConfiguration.hasPassword,
    authConfigured: sipConfiguration.authConfigured,
    sipMessagesEnabled: sipConfiguration.sipMessagesEnabled,
    verboseLogging: sipConfiguration.verboseLogging
  });
  
  const report: DiagnosticReport = {
    webrtcSupport,
    sipConfiguration
  };
  
  // Test WebSocket connection if server is configured
  if (sipConfiguration.server) {
    report.websocketTest = await testWebSocketConnection(sipConfiguration.server);
  } else {
    console.warn('⚠️ No SIP server configured - skipping WebSocket test');
  }
  
  // Test media access
  report.mediaTest = await testMediaAccess();
  
  // Test ICE connectivity
  report.iceTest = await testIceConnectivity();
  
  console.log('=== Diagnostic Report Complete ===');
  if (verboseLogging) {
    console.log('[Diagnostics] Full report:', report);
  }
  
  return report;
}

/**
 * Debug SIP configuration - display current settings
 * Based on PWA's debugSipConfiguration function
 */
export function debugSipConfiguration(): SipConfiguration {
  console.log('=== SIP Configuration Debug ===');
  
  const config = getSipConfiguration();
  
  // Display configuration in table format
  console.table({
    'Phantom ID': config.phantomId || '(empty)',
    'Server': config.server || '(empty)',
    'Domain': config.domain || '(empty)',
    'Username': config.username || '(empty)',
    'Password': config.hasPassword ? `*** (set)` : '(empty)',
    'Auth Configured': config.authConfigured ? '✅' : '❌',
    'SIP Messages': config.sipMessagesEnabled ? '✅' : '❌',
    'Verbose Logging': config.verboseLogging ? '✅' : '❌'
  });
  
  // Check if configuration is pointing to development server
  const problemUrls = ['localhost:5500', '127.0.0.1:5500', 'localhost:3000', 'localhost:5173'];
  const serverUrl = config.server;
  
  if (serverUrl) {
    const hasProblem = problemUrls.some(url => serverUrl.includes(url));
    if (hasProblem) {
      console.error('❌ PROBLEM: SIP server is pointing to development server!');
      console.error('Current server:', serverUrl);
      console.error('This should be your actual SIP server URL (e.g., wss://server1-388.phantomapi.net:8089/ws)');
    } else {
      console.log('✅ SIP server URL looks correct:', serverUrl);
    }
  } else {
    console.error('❌ No SIP server URL configured');
  }
  
  console.log('=== End Configuration Debug ===');
  return config;
}

/**
 * Test server connectivity
 * Based on PWA's testServerConnectivity function
 */
export async function testServerConnectivity(): Promise<WebSocketTestResult> {
  console.log('🔍 Testing SIP server connectivity...');
  
  const config = getSipConfiguration();
  const serverUrl = config.server;
  
  if (!serverUrl) {
    console.error('❌ No server configured');
    return {
      success: false,
      error: 'No server URL configured'
    };
  }
  
  console.log(`Testing connection to: ${serverUrl}`);
  return await testWebSocketConnection(serverUrl);
}

/**
 * Expose debug functions to window in development mode
 */
if (import.meta.env.DEV) {
  const verboseLogging = isVerboseLoggingEnabled();
  
  if (verboseLogging) {
    console.log('[Diagnostics] Exposing debug utilities to window.__debug');
  }
  
  window.__debug = {
    diagnoseWebRTC: diagnoseWebRTCConnection,
    debugSipConfig: debugSipConfiguration,
    testServerConnectivity,
    getSipConfig: getSipConfiguration,
    validateWebRTC: validateWebRTCSupport
  };
  
  console.log('🔧 Debug utilities available: window.__debug');
  console.log('  - diagnoseWebRTC(): Run full WebRTC diagnostics');
  console.log('  - debugSipConfig(): Display SIP configuration');
  console.log('  - testServerConnectivity(): Test server connection');
  console.log('  - getSipConfig(): Get current SIP configuration');
  console.log('  - validateWebRTC(): Check WebRTC support');
}
