// ============================================
// Server Config Utility Tests
// ============================================

import { describe, it, expect } from 'vitest';
import { generateServerSettings, isValidPhantomId, getWssUrl } from '@/utils/serverConfig';

describe('generateServerSettings', () => {
  it('should generate settings for a valid 3-digit PhantomID', () => {
    const settings = generateServerSettings('388');
    
    expect(settings).toBeDefined();
    expect(settings.wssServerUrl).toBe('wss://server1-388.phantomapi.net:8089/ws');
    expect(settings.sipDomain).toBe('server1-388.phantomapi.net');
    expect(settings.wssPort).toBe(8089);
    expect(settings.wssPath).toBe('/ws');
  });
  
  it('should generate settings for a valid 4-digit PhantomID', () => {
    const settings = generateServerSettings('1234');
    
    expect(settings.wssServerUrl).toBe('wss://server1-1234.phantomapi.net:8089/ws');
    expect(settings.sipDomain).toBe('server1-1234.phantomapi.net');
  });
  
  it('should throw error for empty PhantomID', () => {
    expect(() => generateServerSettings('')).toThrow();
  });
  
  it('should throw error for invalid PhantomID (too short)', () => {
    expect(() => generateServerSettings('12')).toThrow();
  });
  
  it('should throw error for invalid PhantomID (too long)', () => {
    expect(() => generateServerSettings('12345')).toThrow();
  });
  
  it('should throw error for non-numeric PhantomID', () => {
    expect(() => generateServerSettings('abc')).toThrow();
  });
});

describe('isValidPhantomId', () => {
  it('should return true for valid 3-digit ID', () => {
    expect(isValidPhantomId('388')).toBe(true);
  });
  
  it('should return true for valid 4-digit ID', () => {
    expect(isValidPhantomId('1234')).toBe(true);
  });
  
  it('should return false for 2-digit ID', () => {
    expect(isValidPhantomId('12')).toBe(false);
  });
  
  it('should return false for 5-digit ID', () => {
    expect(isValidPhantomId('12345')).toBe(false);
  });
  
  it('should return false for non-numeric ID', () => {
    expect(isValidPhantomId('abc')).toBe(false);
  });
  
  it('should return false for empty string', () => {
    expect(isValidPhantomId('')).toBe(false);
  });
});

describe('getWssUrl', () => {
  it('should return correct WebSocket URL for PhantomID', () => {
    const url = getWssUrl('388');
    expect(url).toBe('wss://server1-388.phantomapi.net:8089/ws');
  });
});
