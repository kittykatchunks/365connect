// ============================================
// Phone Number Utilities
// ============================================

/**
 * Normalize a phone number by removing non-digit characters (except +, *, #)
 * @param number - The phone number to normalize
 * @param convertPlusTo00 - If true, replace + prefix with 00
 */
export function normalizePhoneNumber(number: string, convertPlusTo00: boolean = false): string {
  // First, remove all non-digit characters except +, *, # (valid DTMF tones)
  let normalized = number.replace(/[^0-9+*#]/g, '');
  
  // If convertPlusTo00 is enabled and number starts with +, replace it with 00
  if (convertPlusTo00 && normalized.startsWith('+')) {
    normalized = '00' + normalized.substring(1);
  }
  
  return normalized;
}

/**
 * Format a phone number for display
 */
export function formatPhoneNumber(number: string): string {
  const normalized = normalizePhoneNumber(number);
  
  // If it's a short number (extension), return as-is
  if (normalized.length <= 5) {
    return normalized;
  }
  
  // UK format (starts with +44 or 0)
  if (normalized.startsWith('+44')) {
    const local = normalized.slice(3);
    if (local.length === 10) {
      return `+44 ${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
    }
  }
  
  // US/Canada format
  if (normalized.startsWith('+1') && normalized.length === 12) {
    const local = normalized.slice(2);
    return `+1 (${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
  }
  
  // Generic international format
  if (normalized.startsWith('+')) {
    return normalized;
  }
  
  // UK local format
  if (normalized.startsWith('0') && normalized.length === 11) {
    return `${normalized.slice(0, 5)} ${normalized.slice(5, 8)} ${normalized.slice(8)}`;
  }
  
  return normalized;
}

/**
 * Check if a string is a valid phone number
 */
export function isValidPhoneNumber(number: string): boolean {
  const normalized = normalizePhoneNumber(number);
  return normalized.length >= 3 && /^[+]?\d+$/.test(normalized);
}

/**
 * Extract the country code from a phone number
 */
export function extractCountryCode(number: string): string | null {
  const normalized = normalizePhoneNumber(number);
  
  if (!normalized.startsWith('+')) {
    return null;
  }
  
  // Common country codes
  const countryCodes = [
    '1',    // US/Canada
    '44',   // UK
    '31',   // Netherlands
    '33',   // France
    '34',   // Spain
    '351',  // Portugal
    '352',  // Luxembourg
    '353',  // Ireland
    '354',  // Iceland
    '358',  // Finland
    '49',   // Germany
    '61',   // Australia
  ];
  
  for (const code of countryCodes) {
    if (normalized.startsWith('+' + code)) {
      return code;
    }
  }
  
  // Return first 1-3 digits after + as country code
  const match = normalized.match(/^\+(\d{1,3})/);
  return match ? match[1] : null;
}

/**
 * Compare two phone numbers for equality (normalized)
 */
export function phoneNumbersEqual(num1: string, num2: string): boolean {
  return normalizePhoneNumber(num1) === normalizePhoneNumber(num2);
}

/**
 * Check if a phone number ends with another (for matching partial numbers)
 */
export function phoneNumberEndsWith(fullNumber: string, partialNumber: string): boolean {
  const normalizedFull = normalizePhoneNumber(fullNumber);
  const normalizedPartial = normalizePhoneNumber(partialNumber);
  return normalizedFull.endsWith(normalizedPartial);
}
