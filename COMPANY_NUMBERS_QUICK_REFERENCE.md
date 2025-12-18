# Company Numbers Feature - Quick Reference

## Overview
The Company Numbers feature allows agents to manage a list of company phone numbers and select which number to use as their outgoing CLI (Calling Line Identity) during calls.

## Features

### 1. Company Numbers Management Tab
- Located in the first blank tab (enabled via Settings → Interface → Show Company Numbers Tab)
- Add, edit, and delete company numbers
- Each company has:
  - **Company ID**: 1-99 (required, unique)
  - **Company Name**: Display name (required)
  - **Telephone Number**: CLI phone number (required)
- CSV Import/Export functionality
- Inline editing (double-click cells to edit)

### 2. CLI Selector (Dial Tab)
- Appears below Agent status when Company Numbers tab is enabled
- Dropdown list showing all companies alphabetically
- Confirm button changes to orange when a company is selected
- Shows current selected company number for visual confirmation
- Dials `*82*{company_id}` to change CLI

## User Workflow

### Adding Company Numbers
1. Enable "Show Company Numbers Tab" in Settings → Interface
2. Navigate to Company Numbers tab
3. Click "Add Company Number"
4. Enter Company ID (1-99), Name, and Phone Number
5. Click "Add Company"

### Importing Company Numbers
1. Click "Import" button in Company Numbers tab
2. Select a CSV file with format: `Company ID, Company Name, Telephone Number`
3. Confirm import

### Changing Outgoing CLI
1. In Dial tab, locate CLI selector below Agent status
2. Select desired company from dropdown
3. Button changes to orange "Confirm"
4. Click "Confirm" to dial `*82*{company_id}`
5. Current company number displays below for confirmation

### Editing Company Numbers
- **Double-click** any Name or Number cell to edit inline
- Press **Enter** to save, **Escape** to cancel
- Or click **Edit** icon (pencil) to edit Name field

## CSV Format

### Import/Export Format
```csv
Company ID,Company Name,Telephone Number
1,Head Office,01234567890
2,London Branch,02034567890
3,Manchester Office,01614567890
```

### Rules
- Header row required
- Company ID must be 1-99
- All three fields required
- Fields with commas should be quoted

## Technical Details

### File Location
- Manager: `pwa/js/company-numbers-manager.js`
- Storage: LocalStorage key `CompanyNumbers`
- Tab: `blank1Area` (navBlank1)

### Manager Access
```javascript
// Add company
App.managers.companyNumbers.addCompanyNumber({
    id: 1,
    name: "Head Office",
    number: "01234567890"
});

// Get all companies (alphabetically sorted)
const companies = App.managers.companyNumbers.getAllCompanies();

// Get by ID
const company = App.managers.companyNumbers.getCompanyById(1);

// Update CLI selector
App.managers.companyNumbers.updateCliSelector();
```

### CLI Change Process
1. User selects company from dropdown
2. Confirm button activates (orange)
3. User clicks Confirm
4. Manager dials `*82*{company_id}` via SIP
5. Current company stored and displayed
6. Button resets to gray

### Storage Structure
```json
[
    {
        "id": 1,
        "name": "Head Office",
        "number": "01234567890",
        "createdAt": "2025-11-17T10:30:00.000Z",
        "updatedAt": "2025-11-17T10:30:00.000Z"
    }
]
```

## CSS Classes

### CLI Selector
- `.cli-selector-container` - Main container
- `.cli-company-select` - Dropdown
- `.cli-confirm-btn` - Confirm button
  - `.cli-inactive` - Gray/disabled state
  - `.cli-active` - Orange/active state
- `.cli-current-number` - Display current number

### Company Numbers Tab
- `.company-numbers-container` - Main container
- `.company-numbers-table` - Table display
- `.editable-cell` - Inline editable cells
- `.btn-icon` - Action buttons (edit/delete)
- `.no-company-numbers-message` - Empty state

## Integration Points

### Settings Toggle
- Checkbox ID: `ShowBlank1Tab`
- Enables both Company Numbers tab AND CLI selector
- Handled in `updateTabVisibility()` function

### Tab Visibility
- Enabling tab: Shows CLI selector, initializes manager
- Disabling tab: Hides CLI selector
- Tab name: "Company Numbers" with building icon

### SIP Integration
- Uses `App.managers.sip.makeCall()` to dial CLI codes
- Format: `*82*{company_id}` (e.g., `*82*1` for company ID 1)
- Automatic call termination handled by PBX

## Best Practices

### For Administrators
1. Pre-populate company numbers via CSV import
2. Use sequential IDs (1, 2, 3...) for easier management
3. Use descriptive company names
4. Include full phone numbers with area codes

### For Users
1. Select company BEFORE making outbound calls
2. Verify displayed number matches expectation
3. CLI changes persist until changed again
4. Current CLI shown in selector for reference

## Troubleshooting

### CLI Selector Not Visible
- Check Settings → Interface → Show Company Numbers Tab is enabled
- Refresh page to apply settings

### CLI Change Not Working
- Verify SIP registration is active
- Check PBX supports `*82*` feature codes
- Ensure company ID is valid (1-99)
- Check browser console for errors

### CSV Import Issues
- Verify file format matches spec
- Check for duplicate Company IDs
- Ensure all required fields present
- Check for special characters in data

## Future Enhancements
- CLI validation against PBX
- Default company selection
- CLI history/logging
- Permission-based access to companies
- Automatic CLI selection based on queue/context
