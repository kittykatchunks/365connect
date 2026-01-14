// ============================================
// WebRTC Utility Tests
// ============================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  checkWebRTCSupport,
  getWebRTCErrorMessage,
  getMicrophoneErrorMessage,
  validateBrowserSupport
} from '@/utils/webrtc';

describe('checkWebRTCSupport', () => {
  beforeEach(() => {
    // Reset mocks
    vi.restoreAllMocks();
  });
  
  it('should detect WebRTC support', () => {
    const capabilities = checkWebRTCSupport();
    
    expect(capabilities).toHaveProperty('isSupported');
    expect(capabilities).toHaveProperty('hasGetUserMedia');
    expect(capabilities).toHaveProperty('hasRTCPeerConnection');
    expect(capabilities).toHaveProperty('hasMediaDevices');
    expect(capabilities).toHaveProperty('hasWebSocket');
    expect(capabilities).toHaveProperty('isSecureContext');
  });
  
  it('should return correct support status based on browser capabilities', () => {
    const capabilities = checkWebRTCSupport();
    
    // In jsdom environment, most should be false or mocked
    expect(typeof capabilities.isSupported).toBe('boolean');
  });
});

describe('getWebRTCErrorMessage', () => {
  it('should return message for insecure context', () => {
    const capabilities = {
      isSupported: false,
      hasGetUserMedia: true,
      hasRTCPeerConnection: true,
      hasAudioContext: true,
      hasMediaDevices: true,
      hasWebSocket: true,
      isSecureContext: false
    };
    
    const message = getWebRTCErrorMessage(capabilities);
    expect(message).toContain('HTTPS');
  });
  
  it('should return message for missing WebSocket', () => {
    const capabilities = {
      isSupported: false,
      hasGetUserMedia: true,
      hasRTCPeerConnection: true,
      hasAudioContext: true,
      hasMediaDevices: true,
      hasWebSocket: false,
      isSecureContext: true
    };
    
    const message = getWebRTCErrorMessage(capabilities);
    expect(message).toContain('WebSocket');
  });
  
  it('should return message for missing RTCPeerConnection', () => {
    const capabilities = {
      isSupported: false,
      hasGetUserMedia: true,
      hasRTCPeerConnection: false,
      hasAudioContext: true,
      hasMediaDevices: true,
      hasWebSocket: true,
      isSecureContext: true
    };
    
    const message = getWebRTCErrorMessage(capabilities);
    expect(message).toContain('WebRTC');
  });
  
  it('should return null when all supported', () => {
    const capabilities = {
      isSupported: true,
      hasGetUserMedia: true,
      hasRTCPeerConnection: true,
      hasAudioContext: true,
      hasMediaDevices: true,
      hasWebSocket: true,
      isSecureContext: true
    };
    
    const message = getWebRTCErrorMessage(capabilities);
    expect(message).toBeNull();
  });
});

describe('getMicrophoneErrorMessage', () => {
  it('should return message for denied permission', () => {
    const message = getMicrophoneErrorMessage('microphone_denied');
    expect(message).toContain('denied');
  });
  
  it('should return message for not found', () => {
    const message = getMicrophoneErrorMessage('microphone_not_found');
    expect(message).toContain('found');
  });
  
  it('should return message for in use', () => {
    const message = getMicrophoneErrorMessage('microphone_in_use');
    expect(message).toContain('another application');
  });
  
  it('should return generic message for unknown error', () => {
    const message = getMicrophoneErrorMessage('unknown');
    expect(message).toBeTruthy();
  });
});

describe('validateBrowserSupport', () => {
  it('should return validation result object', () => {
    const result = validateBrowserSupport();
    
    expect(result).toHaveProperty('isValid');
    expect(result).toHaveProperty('errors');
    expect(result).toHaveProperty('warnings');
    expect(Array.isArray(result.errors)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
  });
});
