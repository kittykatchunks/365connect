# CompanyNumbersManager

- **File**: pwa/js/company-numbers-manager.js

## Purpose

Manages company CLI (Caller Line Identification) numbers for outgoing calls. Supports CRUD, CSV import/export, inline editing, CLI selector on the dial tab, and issuing CLI change codes via SIP (e.g., `*82*{company_id}`).

## Key Methods (brief use)

- `constructor()` : Initialize arrays, storage key, and state.
- `initialize()` : Load stored numbers, initialize event handlers, render list, and initialize CLI selector.
- `initializeEventHandlers()` : Attach DOM handlers for add, delete all, import/export, file input, and CLI selector.
- `addCompanyNumber(companyData)` / `updateCompanyNumber(companyId, updatedData)` / `deleteCompanyNumber(companyId)` / `deleteAllCompanyNumbers()` : CRUD operations with validation.
- `validateCompanyNumber(companyData)` : Ensure ID (1-99), name, and number present.
- `getCompanyById()` / `getAllCompanies()` : Query helpers.
- `saveCompanyNumbers()` / `loadCompanyNumbers()` : Persistence via `window.localDB`.
- `exportCompanyNumbers()` / `companyNumbersToCSV()` / `importCompanyNumbers()` / `handleCSVImport(event)` : CSV import/export and parsing logic.
- `renderCompanyNumbers()` / `makeFieldEditable()` / `editCompanyInline()` : UI rendering and inline editing.
- `initializeCliSelector()` / `updateCliSelector()` / `handleCliSelectionChange()` / `confirmCliChange()` / `updateCliDisplay()` : Dial-tab CLI selection and confirmation logic, issues SIP call with CLI code.
- `showAddCompanyModal()` / `showModal()` / `closeModal()` : Modal UI for adding companies.
- `showSuccess()`, `showError()`, `showWarning()` : Notification helpers.

## Instance Properties / Variables

- `companyNumbers` — array of company objects {id, name, number, createdAt, updatedAt}.
- `currentSelectedCompany` — currently selected CLI company after change.
- `storageKey` — local storage key `CompanyNumbers`.

## DOM & Event Listeners

- Elements: `#companyNumbersList`, `#addCompanyNumberBtn`, `#deleteAllCompanyNumbersBtn`, `#importCompanyNumbersBtn`, `#exportCompanyNumbersBtn`, `#companyNumbersCsvFileInput`, `#cliCompanySelect`, `#cliConfirmBtn`, `#cliConfirmNumber`, `#cliCurrentNumber`, `#modalOverlay`.
- Inline edit behavior: double-click editable cells `.editable-cell`.

## Notes / Behavior

- CSV parsing supports quoted fields and maps columns heuristically (id, name, phone/number).
- Exports CSV sorted by ID and uses safe CSV escaping.
- CLI change uses SIP call `*82*{company_id}` to the system; requires `App.managers.sip` to be available.
- Provides user confirmations for destructive actions and feedback with `App.managers.ui` or console fallbacks.

---

*Generated automatically from `pwa/js/company-numbers-manager.js`.*