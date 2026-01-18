# Contact-Based Caller ID Feature

## Overview
When an incoming call is received, the system now automatically looks up the calling number against stored contacts and displays the contact name instead of the SIP caller ID name. This provides better caller identification for known contacts.

## Feature Behavior

### Priority Order for Display Name
When an incoming call is received, the system determines what to display using this priority:

1. **Contact Match with Name**: If the phone number matches a contact and the contact has a first name or last name (or both), display the full name
2. **Contact Match with Company**: If the phone number matches a contact but has no name, display the company name
3. **SIP Caller ID**: If no contact match is found, display the caller ID name from SIP headers
4. **Phone Number**: If no contact match and no SIP caller ID, display the raw phone number

### Phone Number Matching
The system uses intelligent phone number matching to handle various formats:
- **Exact match**: Numbers that match exactly
- **Country code handling**: Matches numbers even if one has a country code and the other doesn't
- **Partial match**: Matches on the last 7+ digits to handle local vs. international formats
- **Format agnostic**: Ignores formatting characters like spaces, dashes, parentheses

## Implementation Details

### React/TypeScript Version (src/)

#### New Files
- **`src/utils/contactLookup.ts`**: Core contact lookup utility
  - `lookupContactByNumber()`: Main lookup function
  - `normalizePhoneNumber()`: Number normalization
  - `phoneNumbersMatch()`: Intelligent number comparison
  - `getContactDisplayName()`: Extract best display name from contact

#### Modified Files
- **`src/services/SIPService.ts`**:
  - Added `contacts` property to store contact list
  - Added `setContacts()` method to update contacts
  - Modified `handleIncomingInvitation()` to perform contact lookup before creating session

- **`src/contexts/SIPContext.tsx`**:
  - Imports `useContactsStore` to access contacts
  - Added effect to sync contacts with SIP service automatically
  - Contacts are synced whenever they change

- **`src/utils/index.ts`**:
  - Exports contact lookup utilities

### PWA/Legacy Version (pwa/)

#### Modified Files
- **`pwa/js/sip-session-manager.js`**:
  - Added `contacts` property to constructor
  - Added `setContacts()` method
  - Added `lookupContactByNumber()` method with same logic as React version
  - Modified `handleIncomingInvitation()` to use contact lookup

- **`pwa/js/contacts-manager.js`**:
  - Modified `loadContacts()` to sync contacts with SIP manager on load
  - Modified `saveContacts()` to sync contacts with SIP manager on save

## Verbose Logging

All contact lookup operations include comprehensive logging when verbose logging is enabled:

```javascript
// React version
const verboseLogging = isVerboseLoggingEnabled();

if (verboseLogging) {
    console.log('[ContactLookup] 🔍 Starting contact lookup:', {
        incomingNumber,
        totalContacts: contacts.length,
        fallbackCallerIdName
    });
}
```

### Log Messages
- **Contact lookup start**: Shows incoming number and total contacts available
- **Contact match found**: Shows matched contact details and display name source
- **No match found**: Shows fallback behavior
- **Contacts synced**: When contacts are loaded/updated in SIP service
- **Caller identification**: Final display name and its source (CONTACT, SIP_CALLER_ID, or PHONE_NUMBER)

## Usage Example

### Scenario 1: Contact with Full Name
```javascript
// Contact in database:
{
    firstName: "John",
    lastName: "Smith",
    companyName: "Acme Corp",
    phoneNumber: "555-1234"
}

// Incoming call from: 555-1234
// Display: "John Smith"
```

### Scenario 2: Contact with Company Only
```javascript
// Contact in database:
{
    firstName: "",
    lastName: "",
    companyName: "City Taxi",
    phoneNumber: "555-5678"
}

// Incoming call from: 555-5678
// Display: "City Taxi"
```

### Scenario 3: No Contact Match
```javascript
// Incoming call from: 555-9999
// SIP Caller ID: "Unknown Caller"
// Display: "Unknown Caller"

// Incoming call from: 555-8888
// SIP Caller ID: (empty)
// Display: "555-8888"
```

### Scenario 4: International Number Match
```javascript
// Contact in database:
{
    firstName: "Jane",
    lastName: "Doe",
    phoneNumber: "5551234"
}

// Incoming call from: +15551234 (with country code)
// Display: "Jane Doe" ✓ (matches even with country code)
```

## Testing

### Manual Test Cases
1. **Test contact with name**: Add contact with first/last name, call from that number
2. **Test contact with company**: Add contact with only company name, call from that number
3. **Test no match with SIP caller ID**: Call from unknown number with caller ID set
4. **Test no match without SIP caller ID**: Call from unknown number without caller ID
5. **Test number format variations**: Test with local, long distance, international formats
6. **Test partial matches**: Test with/without country codes, different formatting

### Debug Commands
Enable verbose logging in Settings > Advanced Settings to see detailed lookup information.

## Data Flow

```
Incoming Call
    ↓
SIPService.handleIncomingInvitation()
    ↓
Extract: remoteNumber, sipCallerIdName
    ↓
lookupContactByNumber(remoteNumber, contacts, sipCallerIdName)
    ↓
normalizePhoneNumber() → Compare with all contacts
    ↓
Match Found?
    ├─ YES → getContactDisplayName() → Use name > company > phone
    └─ NO → Use sipCallerIdName > remoteNumber
    ↓
Create SessionData with displayName
    ↓
Emit sessionCreated event
    ↓
UI displays contact name in CallInfoDisplay
```

## Automatic Synchronization

### React Version
- Uses Zustand store subscription
- Contacts automatically sync whenever added/updated/deleted
- No manual sync required

### PWA Version
- Syncs on `loadContacts()` (initialization)
- Syncs on `saveContacts()` (after any modification)
- Automatic when using ContactsManager methods

## Future Enhancements

Potential improvements for future versions:
1. **Contact photos**: Display contact photos in call notifications
2. **Multiple numbers**: Support multiple phone numbers per contact
3. **Fuzzy matching**: More intelligent number matching algorithms
4. **Contact groups**: Tag contacts and show group memberships
5. **Recent contacts**: Prioritize recently contacted numbers
6. **Reverse lookup**: API integration for unknown number lookup
7. **Contact notes**: Display notes about the caller during incoming call

## Compatibility

- **React version**: Full support
- **PWA version**: Full support
- **Browser requirements**: None (pure JavaScript logic)
- **Storage**: Uses existing contact storage mechanisms
- **SIP.js**: Compatible with all versions (uses standard SIP headers)

## Performance

- **Lookup time**: O(n) where n = number of contacts (typically <1ms for <1000 contacts)
- **Memory**: Minimal (contact array is already in memory)
- **No blocking**: Lookup is synchronous but extremely fast
- **No network**: All matching done locally
