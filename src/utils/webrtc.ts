// ============================================
// WebRTC Capabilities Check Utilities
// ============================================

export interface WebRTCCapabilities {
  isSupported: boolean;
  hasGetUserMedia: boolean;
  hasRTCPeerConnection: boolean;
  hasAudioContext: boolean;
  hasMediaDevices: boolean;
  hasWebSocket: boolean;
  isSecureContext: boolean;
}

export interface MediaPermissionStatus {
  microphone: PermissionState | 'unknown';
  camera: PermissionState | 'unknown';
}

/**
 * Check WebRTC browser support
 */
export function checkWebRTCSupport(): WebRTCCapabilities {
  const hasGetUserMedia = !!(
    navigator.mediaDevices?.getUserMedia ||
    (navigator as Navigator & { webkitGetUserMedia?: unknown }).webkitGetUserMedia ||
    (navigator as Navigator & { mozGetUserMedia?: unknown }).mozGetUserMedia
  );
  
  const hasRTCPeerConnection = !!(
    window.RTCPeerConnection ||
    (window as Window & { webkitRTCPeerConnection?: unknown }).webkitRTCPeerConnection ||
    (window as Window & { mozRTCPeerConnection?: unknown }).mozRTCPeerConnection
  );
  
  const hasAudioContext = !!(
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: unknown }).webkitAudioContext
  );
  
  const hasMediaDevices = !!navigator.mediaDevices;
  const hasWebSocket = !!window.WebSocket;
  const isSecureContext = window.isSecureContext;
  
  const isSupported = hasGetUserMedia && hasRTCPeerConnection && hasMediaDevices && hasWebSocket;
  
  return {
    isSupported,
    hasGetUserMedia,
    hasRTCPeerConnection,
    hasAudioContext,
    hasMediaDevices,
    hasWebSocket,
    isSecureContext
  };
}

/**
 * Check media permission status using Permissions API
 */
export async function checkMediaPermissions(): Promise<MediaPermissionStatus> {
  const result: MediaPermissionStatus = {
    microphone: 'unknown',
    camera: 'unknown'
  };
  
  if (!navigator.permissions) {
    return result;
  }
  
  try {
    const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    result.microphone = micPermission.state;
  } catch {
    // Microphone permission query not supported
  }
  
  try {
    const camPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
    result.camera = camPermission.state;
  } catch {
    // Camera permission query not supported
  }
  
  return result;
}

/**
 * Request microphone permission
 */
export async function requestMicrophonePermission(): Promise<{
  granted: boolean;
  stream?: MediaStream;
  error?: string;
}> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return { granted: true, stream };
  } catch (error) {
    const err = error as Error & { name?: string };
    
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      return { granted: false, error: 'microphone_denied' };
    }
    
    if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      return { granted: false, error: 'microphone_not_found' };
    }
    
    if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      return { granted: false, error: 'microphone_in_use' };
    }
    
    return { granted: false, error: err.message || 'unknown_error' };
  }
}

/**
 * Get error message for WebRTC capability issues
 */
export function getWebRTCErrorMessage(capabilities: WebRTCCapabilities, t: (key: string, fallback?: string) => string): string | null {
  if (!capabilities.isSecureContext) {
    return t('error_webrtc_secure_context', 'WebRTC requires a secure context (HTTPS). Please access this site via HTTPS.');
  }
  
  if (!capabilities.hasWebSocket) {
    return t('error_webrtc_websocket', 'Your browser does not support WebSocket connections required for SIP signaling.');
  }
  
  if (!capabilities.hasRTCPeerConnection) {
    return t('error_webrtc_peerconnection', 'Your browser does not support WebRTC peer connections required for voice calls.');
  }
  
  if (!capabilities.hasGetUserMedia || !capabilities.hasMediaDevices) {
    return t('error_webrtc_media_devices', 'Your browser does not support media device access required for microphone and speaker.');
  }
  
  if (!capabilities.isSupported) {
    return t('error_webrtc_not_supported', 'Your browser does not fully support WebRTC. Please use a modern browser like Chrome, Firefox, or Edge.');
  }
  
  return null;
}

/**
 * Get user-friendly error message for microphone permission issues
 */
export function getMicrophoneErrorMessage(errorCode: string, t: (key: string, fallback?: string) => string): string {
  switch (errorCode) {
    case 'microphone_denied':
      return t('error_microphone_denied', 'Microphone access was denied. Please allow microphone access in your browser settings to make calls.');
    case 'microphone_not_found':
      return t('error_microphone_not_found', 'No microphone was found. Please connect a microphone to make calls.');
    case 'microphone_in_use':
      return t('error_microphone_in_use', 'Your microphone is being used by another application. Please close other apps using your microphone.');
    default:
      return t('error_microphone_access', 'Failed to access microphone. Please check your audio settings and try again.');
  }
}

/**
 * Check if browser supports all required features
 */
export function validateBrowserSupport(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const capabilities = checkWebRTCSupport();
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!capabilities.isSecureContext) {
    errors.push('Secure context (HTTPS) required');
  }
  
  if (!capabilities.hasWebSocket) {
    errors.push('WebSocket not supported');
  }
  
  if (!capabilities.hasRTCPeerConnection) {
    errors.push('WebRTC PeerConnection not supported');
  }
  
  if (!capabilities.hasGetUserMedia || !capabilities.hasMediaDevices) {
    errors.push('Media devices not supported');
  }
  
  if (!capabilities.hasAudioContext) {
    warnings.push('AudioContext not supported - some audio features may not work');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
