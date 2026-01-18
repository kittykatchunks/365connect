// ============================================
// Contact Lookup Utility
// Matches incoming phone numbers against stored contacts
// ============================================

import type { Contact } from '@/types/contact';
import { isVerboseLoggingEnabled } from '@/utils';

/**
 * Result of a contact lookup operation
 */
export interface ContactLookupResult {
  /** Whether a matching contact was found */
  found: boolean;
  /** The matched contact (if found) */
  contact?: Contact;
  /** Display name to use for the incoming call */
  displayName: string;
  /** Whether the display name came from a contact match */
  isContactMatch: boolean;
}

/**
 * Normalize phone number for comparison
 * Removes all non-digit characters except +
 */
function normalizePhoneNumber(phoneNumber: string): string {
  return phoneNumber.replace(/[^0-9+]/g, '');
}

/**
 * Check if two phone numbers match
 * Handles various phone number formats and partial matches
 */
function phoneNumbersMatch(number1: string, number2: string): boolean {
  const normalized1 = normalizePhoneNumber(number1);
  const normalized2 = normalizePhoneNumber(number2);
  
  // Exact match
  if (normalized1 === normalized2) {
    return true;
  }
  
  // One number ends with the other (handles country codes)
  // Match at least the last 7 digits (local number)
  const minMatchLength = 7;
  
  if (normalized1.length >= minMatchLength && normalized2.length >= minMatchLength) {
    const longer = normalized1.length > normalized2.length ? normalized1 : normalized2;
    const shorter = normalized1.length > normalized2.length ? normalized2 : normalized1;
    
    // Check if the longer number ends with the shorter one
    if (longer.endsWith(shorter) || shorter.endsWith(longer)) {
      return true;
    }
    
    // Compare last N digits
    const suffix1 = normalized1.slice(-minMatchLength);
    const suffix2 = normalized2.slice(-minMatchLength);
    
    if (suffix1 === suffix2) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get the best display name from a contact
 * Priority: First + Last Name > Company Name > Phone Number
 */
function getContactDisplayName(contact: Contact): string {
  const verboseLogging = isVerboseLoggingEnabled();
  
  // Combine first and last name
  const firstName = contact.firstName?.trim() || '';
  const lastName = contact.lastName?.trim() || '';
  const fullName = `${firstName} ${lastName}`.trim();
  
  // Priority: name > company > phone
  let displayName: string;
  
  if (fullName) {
    displayName = fullName;
  } else if (contact.companyName?.trim()) {
    displayName = contact.companyName.trim();
  } else {
    displayName = contact.phoneNumber;
  }
  
  if (verboseLogging) {
    console.log('[ContactLookup] Generated display name:', {
      contactId: contact.id,
      firstName,
      lastName,
      fullName,
      company: contact.companyName,
      displayName
    });
  }
  
  return displayName;
}

/**
 * Look up a contact by phone number
 * 
 * @param incomingNumber - The phone number from the incoming call
 * @param contacts - Array of contacts to search
 * @param fallbackCallerIdName - Optional caller ID name from SIP headers to use if no contact match
 * @returns ContactLookupResult with match status and display name to use
 */
export function lookupContactByNumber(
  incomingNumber: string,
  contacts: Contact[],
  fallbackCallerIdName?: string
): ContactLookupResult {
  const verboseLogging = isVerboseLoggingEnabled();
  
  if (verboseLogging) {
    console.log('[ContactLookup] 🔍 Starting contact lookup:', {
      incomingNumber,
      totalContacts: contacts.length,
      fallbackCallerIdName
    });
  }
  
  // Search for matching contact
  const matchedContact = contacts.find(contact => 
    phoneNumbersMatch(incomingNumber, contact.phoneNumber)
  );
  
  if (matchedContact) {
    const displayName = getContactDisplayName(matchedContact);
    
    if (verboseLogging) {
      console.log('[ContactLookup] ✅ Contact match found:', {
        contactId: matchedContact.id,
        matchedNumber: matchedContact.phoneNumber,
        displayName,
        hasFirstName: !!matchedContact.firstName,
        hasLastName: !!matchedContact.lastName,
        hasCompany: !!matchedContact.companyName
      });
    }
    
    return {
      found: true,
      contact: matchedContact,
      displayName,
      isContactMatch: true
    };
  }
  
  // No contact match - use fallback or incoming number
  const displayName = fallbackCallerIdName || incomingNumber;
  
  if (verboseLogging) {
    console.log('[ContactLookup] ❌ No contact match found, using fallback:', {
      incomingNumber,
      displayName,
      usingFallback: !!fallbackCallerIdName
    });
  }
  
  return {
    found: false,
    displayName,
    isContactMatch: false
  };
}
