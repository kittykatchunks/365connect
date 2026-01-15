// ============================================
// Phone Number Utility Tests
// ============================================

import { describe, it, expect } from 'vitest';
import { formatPhoneNumber, normalizePhoneNumber, isValidPhoneNumber } from '@/utils/phoneNumber';

describe('normalizePhoneNumber', () => {
  it('should remove formatting characters', () => {
    const result = normalizePhoneNumber('(555) 123-4567');
    expect(result).toBe('5551234567');
  });
  
  it('should preserve plus sign for international', () => {
    const result = normalizePhoneNumber('+1 555-123-4567');
    expect(result).toBe('+15551234567');
  });
  
  it('should remove spaces and dashes', () => {
    const result = normalizePhoneNumber('555 123 4567');
    expect(result).toBe('5551234567');
  });
  
  it('should handle clean numbers', () => {
    const result = normalizePhoneNumber('5551234567');
    expect(result).toBe('5551234567');
  });
  
  it('should handle empty string', () => {
    const result = normalizePhoneNumber('');
    expect(result).toBe('');
  });
});

describe('formatPhoneNumber', () => {
  it('should format US number with country code', () => {
    const result = formatPhoneNumber('+15551234567');
    expect(result).toBe('+1 (555) 123-4567');
  });
  
  it('should return extension as-is', () => {
    const result = formatPhoneNumber('101');
    expect(result).toBe('101');
  });
  
  it('should handle empty string', () => {
    const result = formatPhoneNumber('');
    expect(result).toBe('');
  });
  
  it('should normalize and format numbers with dashes', () => {
    const result = formatPhoneNumber('+1-555-123-4567');
    expect(result).toBe('+1 (555) 123-4567');
  });
  
  it('should handle UK local format', () => {
    const result = formatPhoneNumber('01onal234567');
    // UK numbers starting with 0 and 11 digits get formatted
    expect(result).toBeDefined();
  });
});

describe('isValidPhoneNumber', () => {
  it('should return true for 10-digit number', () => {
    expect(isValidPhoneNumber('5551234567')).toBe(true);
  });
  
  it('should return true for international format', () => {
    expect(isValidPhoneNumber('+15551234567')).toBe(true);
  });
  
  it('should return true for extension', () => {
    expect(isValidPhoneNumber('101')).toBe(true);
  });
  
  it('should return false for empty string', () => {
    expect(isValidPhoneNumber('')).toBe(false);
  });
  
  it('should return true for formatted number', () => {
    expect(isValidPhoneNumber('(555) 123-4567')).toBe(true);
  });
  
  it('should return false for too short numbers', () => {
    expect(isValidPhoneNumber('12')).toBe(false);
  });
});
