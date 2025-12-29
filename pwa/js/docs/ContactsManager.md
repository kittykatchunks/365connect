# ContactsManager

- **File**: pwa/js/contacts-manager.js

## Purpose

Handles contact CRUD, search, sorting, CSV import/export, UI rendering, and dialing contacts. Provides modals for add/edit and confirmations for deletions.

## Key Methods (brief use)

- `constructor()` : Initialize arrays and state.
- `initialize()` : Load stored contacts, set up event handlers, and render contacts.
- `initializeEventHandlers()` : Wire add/delete/import/export buttons and search input.
- `addContact(contactData)` / `updateContact(contactId, contactData)` / `deleteContact(contactId)` / `deleteAllContacts()` : CRUD operations with persistence.
- `validateContact(contactData)` : Ensure at least one name field exists.
- `generateContactId()` : Create unique contact IDs.
- `handleSearch(query)` / `fuzzySearch(text, query)` : Search/filtering logic with simple fuzzy match.
- `sortContacts(contacts)` / `getDisplayName(contact)` / `getFullDisplayName(contact)` : Sorting and display name logic.
- `loadContacts()` / `saveContacts()` : Persistence via `window.localDB`.
- `exportContacts()` / `contactsToCSV()` / `importContacts()` / `handleCSVImport(event)` : CSV import/export support and parsing.
- `renderContacts()` / `renderEmptyState(container)` / `createContactElement(contact)` : UI rendering functions.
- Modal functions: `showAddContactModal()` / `showEditContactModal(contactId)` / `showContactModal(title, contact)` / `hideContactModal()` / `handleContactSubmit(event, isEdit)`.
- `dialContact(contactId)` : Populate dial input and switch to dial view.
- Notification helpers: `showSuccess`, `showError`.

## Instance Properties / Variables

- `contacts` — array of contact objects.
- `filteredContacts` — array for search results.
- `searchQuery` — current search string.
- `initialized` — initialization flag.

## DOM & Event Listeners

- Elements: `#contactsList`, `#addContactBtn`, `#deleteAllContactsBtn`, `#importContactsBtn`, `#exportContactsBtn`, `#contactSearchInput`, `#csvFileInput`.
- Modal id: `#contactModal` with form `#contactForm`.

## Notes / Behavior

- CSV parsing maps header columns heuristically (first name, last name, company, phone).
- Uses `window.localDB` for persistence and `window.showToast` for notifications if available.
- Provides inline dialing by setting `#dialInput` and switching to the dial tab.

---

*Generated automatically from `pwa/js/contacts-manager.js`.*