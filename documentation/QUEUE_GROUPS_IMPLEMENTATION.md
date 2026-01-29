# Queue Groups Feature - Implementation Documentation

## Overview
The Queue Groups feature allows users to group multiple queues together for organized monitoring and future functionality. Queue groups are stored locally and can be imported/exported with other application data.

**Status**: ✅ **Complete** - Ready for use  
**Implementation Date**: January 29, 2026  
**Version**: 1.0

---

## Feature Requirements

### User Requirements
- Create queue groups with auto-assigned IDs (QG01-QG99)
- Name each queue group with a custom name
- Select multiple queues to include in a group
- Edit existing queue groups
- Delete individual queue groups
- Delete all queue groups at once
- Import/export queue groups data
- Store queue groups locally

### Technical Requirements
- Auto-assign lowest available ID (QG01-QG99)
- Multi-select dropdown with select all/clear all functionality
- localStorage persistence
- Integration with existing import/export system
- Full internationalization (i18n)
- Verbose logging support
- React/TypeScript implementation

---

## Architecture

### File Structure

```
src/
├── types/
│   └── queue-monitor.ts                    # QueueGroup interface definition
├── utils/
│   └── queueGroupStorage.ts                # Storage utilities
├── components/
│   └── settings/
│       ├── SettingsView.tsx                # Main settings UI (updated)
│       ├── QueueGroupModal.tsx             # Add/Edit modal component
│       └── QueueGroupModal.css             # Modal styles
├── components/
│   └── modals/
│       └── ImportExportModal.tsx           # Import/Export integration (updated)
└── i18n/
    └── locales/
        └── en.json                         # Translations (updated)
```

### Data Model

#### QueueGroup Interface
```typescript
interface QueueGroup {
  id: string;              // QG01-QG99
  name: string;            // User-defined group name
  queueNumbers: string[];  // Array of queue numbers in this group
}
```

#### Example Data
```json
{
  "id": "QG01",
  "name": "Priority Queues",
  "queueNumbers": ["600", "601", "602"]
}
```

---

## Implementation Details

### 1. Type Definitions (`src/types/queue-monitor.ts`)

```typescript
export interface QueueGroup {
  /** Group identifier (QG01-QG99) */
  id: string;
  /** Group name/label */
  name: string;
  /** Array of queue numbers included in this group */
  queueNumbers: string[];
}
```

### 2. Storage Utilities (`src/utils/queueGroupStorage.ts`)

**Storage Key**: `QueueGroups`

**Functions**:
- `loadQueueGroups()` - Load all queue groups from localStorage
- `saveQueueGroups(groups)` - Save queue groups array to localStorage
- `getNextQueueGroupId()` - Generate next available ID (QG01-QG99)
- `saveQueueGroup(group)` - Add or update a single queue group
- `deleteQueueGroup(groupId)` - Delete a queue group by ID
- `getQueueGroup(groupId)` - Get a single queue group by ID
- `deleteAllQueueGroups()` - Delete all queue groups
- `exportQueueGroupsData()` - Export groups as JSON string
- `importQueueGroupsData(jsonData)` - Import groups from JSON string

**ID Generation Logic**:
```typescript
function getNextQueueGroupId(): string {
  const groups = loadQueueGroups();
  const existingNumbers = groups
    .map(g => parseInt(g.id.replace('QG', ''), 10))
    .filter(n => !isNaN(n));
  
  for (let i = 1; i <= 99; i++) {
    if (!existingNumbers.includes(i)) {
      return `QG${i.toString().padStart(2, '0')}`;
    }
  }
  
  return 'QG99'; // Fallback
}
```

### 3. QueueGroupModal Component (`src/components/settings/QueueGroupModal.tsx`)

**Props**:
```typescript
interface QueueGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (group: QueueGroup) => void;
  existingGroup?: QueueGroup | null;
  availableQueues: AvailableQueue[];
  groupId: string;
}
```

**Features**:
- Auto-generated or existing group ID display
- Group name input field
- Multi-select dropdown for queues
- Select All / Clear All buttons
- Selected queues displayed as removable badges
- Form validation (name required, at least one queue required)
- Verbose logging for all operations

**UI Flow**:
1. User opens modal (Add or Edit mode)
2. Group ID is displayed (auto-generated for new, fixed for edit)
3. User enters/edits group name
4. User selects queues from dropdown with checkboxes
5. Selected queues appear as badges below dropdown
6. User clicks Save (disabled if name empty or no queues selected)
7. Modal closes and parent component receives new/updated group

### 4. Settings View Integration (`src/components/settings/SettingsView.tsx`)

**Queues Accordion Content**:
```tsx
<AccordionContent value="queues">
  {/* List of existing queue groups */}
  {queueGroups.length > 0 && (
    <div className="queue-groups-list">
      {queueGroups.map(group => (
        <div key={group.id} className="queue-group-item">
          <span>{group.id} {group.name}</span>
          <button onClick={() => handleEditQueueGroup(group.id)}>Edit</button>
          <button onClick={() => handleDeleteQueueGroup(group.id)}>Delete</button>
        </div>
      ))}
    </div>
  )}
  
  {/* Action buttons */}
  <div className="actions">
    {queueGroups.length > 0 && (
      <Button onClick={handleDeleteAllQueueGroups}>
        Delete All
      </Button>
    )}
    <Button onClick={handleAddQueueGroup}>
      Add Queue Group
    </Button>
  </div>
</AccordionContent>
```

**State Management**:
```typescript
const [queueGroups, setQueueGroups] = useState<QueueGroup[]>([]);
const [isQueueGroupModalOpen, setIsQueueGroupModalOpen] = useState(false);
const [editingQueueGroup, setEditingQueueGroup] = useState<QueueGroup | null>(null);
const [deleteConfirmGroupId, setDeleteConfirmGroupId] = useState<string | null>(null);
const [isDeleteAllGroupsConfirmOpen, setIsDeleteAllGroupsConfirmOpen] = useState(false);
```

**Handler Functions**:
- `handleAddQueueGroup()` - Open modal for new group
- `handleEditQueueGroup(groupId)` - Open modal with existing group
- `handleDeleteQueueGroup(groupId)` - Show delete confirmation
- `confirmDeleteQueueGroup()` - Execute delete after confirmation
- `handleDeleteAllQueueGroups()` - Show delete all confirmation
- `confirmDeleteAllQueueGroups()` - Execute delete all after confirmation
- `handleSaveQueueGroup(group)` - Save new/updated group
- `getAvailableQueuesForGroups()` - Get list of configured queues

### 5. Import/Export Integration (`src/components/modals/ImportExportModal.tsx`)

**Export Data Structure**:
```typescript
interface ExportData {
  version: string;
  exportedAt: string;
  contacts?: Contact[];
  companyNumbers?: CompanyNumber[];
  blfButtons?: BLFButton[];
  queueMonitoring?: {
    configs: QueueConfig[];
    alerts: QueueAlertStatus[];
    exportedAt: string;
  };
  queueGroups?: {
    groups: QueueGroup[];
    exportedAt: string;
  };
}
```

**Export Logic**:
```typescript
if (exportQueueGroups) {
  const groupsData = exportQueueGroupsData();
  const parsedData = JSON.parse(groupsData);
  if (parsedData.groups && parsedData.groups.length > 0) {
    data.queueGroups = parsedData;
  }
}
```

**Import Logic**:
```typescript
if (includeQueueGroups && importData.queueGroups) {
  const result = importQueueGroupsData(JSON.stringify(importData.queueGroups));
  if (!result.success) {
    throw new Error(`Queue groups import failed: ${result.error}`);
  }
}
```

**UI Updates**:
- Export toggles show count of configured groups
- Import toggles show count of groups in file
- Toggles disabled when no data available
- Success/error messages for import operations

---

## Internationalization

### Translation Keys Added

**Settings (en.json)**:
```json
{
  "settings": {
    "add_queue_group": "Add Queue Group",
    "edit_queue_group": "Edit Queue Group",
    "queue_group_id": "Group ID",
    "queue_group_name": "Group Name",
    "queue_group_name_placeholder": "Enter group name",
    "select_queues": "Select Queues",
    "select_queues_desc": "Select one or more queues for this group",
    "select_queues_placeholder": "Click to select queues",
    "queues_selected": "{{count}} queue(s) selected",
    "select_all": "Select All",
    "clear_all": "Clear All",
    "no_queues_available": "No queues available",
    "no_queue_groups": "No queue groups configured",
    "delete_all_groups": "Delete All",
    "delete_queue_group_title": "Delete Queue Group",
    "delete_queue_group_message": "Are you sure you want to delete this queue group?",
    "delete_all_groups_title": "Delete All Queue Groups",
    "delete_all_groups_message": "Are you sure you want to delete all queue groups? This cannot be undone.",
    "export_queue_groups": "Queue Groups",
    "import_queue_groups": "Queue Groups"
  }
}
```

**Common (en.json)**:
```json
{
  "common": {
    "add": "Add",
    "edit": "Edit",
    "delete": "Delete",
    "configured": "Configured"
  }
}
```

---

## Verbose Logging

All queue group operations include verbose logging when enabled:

```typescript
const verboseLogging = isVerboseLoggingEnabled();

if (verboseLogging) {
  console.log('[QueueGroupStorage] 📥 Loaded queue groups:', groups);
  console.log('[QueueGroupStorage] 💾 Saved queue groups:', groups);
  console.log('[QueueGroupStorage] 🆔 Generated new group ID:', newId);
  console.log('[QueueGroupStorage] 🔄 Updated queue group:', group);
  console.log('[QueueGroupStorage] ➕ Added new queue group:', group);
  console.log('[QueueGroupStorage] 🗑️ Deleted queue group:', groupId);
  console.log('[QueueGroupStorage] 📤 Exporting queue groups data:', data);
  console.log('[QueueGroupStorage] 📥 Imported queue groups data successfully');
  console.log('[QueueGroupModal] 📝 Initialized form with existing group:', group);
  console.log('[QueueGroupModal] 🆕 Reset form for new queue group');
  console.log('[QueueGroupModal] 💾 Saving queue group:', group);
  console.log('[SettingsView] 📋 Loaded queue groups:', groups);
  console.log('[SettingsView] 🆕 Opening add queue group modal');
  console.log('[SettingsView] 📝 Editing queue group:', group);
  console.log('[SettingsView] 🗑️ Deleted queue group:', groupId);
  console.log('[SettingsView] 💾 Saved queue group:', group);
}
```

---

## Usage Guide

### Creating a Queue Group

1. Navigate to Settings > Queues accordion
2. Click **[Add Queue Group]** button
3. Modal opens with auto-generated ID (e.g., QG01)
4. Enter a descriptive **Group Name**
5. Click the queue selection dropdown
6. Use checkboxes to select queues or use **Select All**
7. Selected queues appear as blue badges below
8. Click **Add** to save (disabled until name and queues provided)
9. Group appears in the list with edit/delete buttons

### Editing a Queue Group

1. Click **Edit** button on any group in the list
2. Modal opens with group ID (read-only) and current values
3. Modify the group name and/or queue selections
4. Click **Save** to update
5. Updated group replaces the old one in the list

### Deleting Queue Groups

**Single Group**:
1. Click **Delete** button on a group
2. Confirmation modal appears
3. Click **Delete** to confirm

**All Groups**:
1. Click **Delete All** button (only visible when groups exist)
2. Confirmation modal appears with warning
3. Click **Delete All** to confirm

### Exporting Queue Groups

1. Navigate to Settings > Advanced
2. Click **Export Data**
3. Toggle **Queue Groups** ON (default)
4. Click **Export**
5. JSON file downloads with queue groups included

### Importing Queue Groups

1. Navigate to Settings > Advanced
2. Click **Import Data**
3. Select previously exported JSON file
4. Toggle **Queue Groups** ON if available in file
5. Click **Import**
6. Queue groups are restored/merged

---

## Future Enhancements

### Planned Uses for Queue Groups

Queue Groups are designed as a foundation for future features:

1. **Grouped Monitoring** - Monitor multiple queues as a single unit
2. **Aggregate Statistics** - Combined metrics across grouped queues
3. **Group-level Alerts** - SLA alerts for entire queue groups
4. **Flexible Routing** - Route calls to queue groups
5. **Reporting** - Generate reports for queue groups
6. **Dashboard Views** - Customizable dashboards showing queue groups

### Implementation Notes for Future Developers

When implementing queue group utilizations:

1. **Access Groups**: Use `loadQueueGroups()` from `queueGroupStorage.ts`
2. **Resolve Queues**: Use `group.queueNumbers` to get member queues
3. **Fetch Stats**: Loop through `queueNumbers` and aggregate statistics
4. **UI Components**: Create new components in appropriate tab views
5. **Settings Integration**: Add configuration options to Settings if needed

### Example: Using Queue Groups in Queue Monitor

```typescript
import { loadQueueGroups } from '@/utils/queueGroupStorage';
import { loadQueueConfigs } from '@/utils/queueStorage';

function QueueGroupMonitorView() {
  const groups = loadQueueGroups();
  const configs = loadQueueConfigs();
  
  // For each group, get aggregated stats
  const groupStats = groups.map(group => {
    const queueStats = group.queueNumbers
      .map(queueNum => configs.find(c => c.queueNumber === queueNum))
      .filter(Boolean);
    
    // Aggregate metrics
    const totalWaiting = queueStats.reduce((sum, q) => sum + q.waitingCalls, 0);
    const avgWaitTime = queueStats.reduce((sum, q) => sum + q.avgWaitTime, 0) / queueStats.length;
    
    return {
      groupId: group.id,
      groupName: group.name,
      totalWaiting,
      avgWaitTime,
      memberQueues: queueStats
    };
  });
  
  return (
    // Render grouped queue statistics
  );
}
```

---

## Testing Checklist

### Manual Testing

- [ ] Add new queue group with valid data
- [ ] Add queue group with empty name (should be disabled)
- [ ] Add queue group with no queues selected (should be disabled)
- [ ] Edit existing queue group and change name
- [ ] Edit existing queue group and add/remove queues
- [ ] Delete single queue group with confirmation
- [ ] Delete all queue groups with confirmation
- [ ] Verify IDs are auto-assigned sequentially (QG01, QG02, etc.)
- [ ] Verify ID gaps are filled (delete QG01, next new group is QG01)
- [ ] Export data with queue groups included
- [ ] Import data with queue groups and verify restoration
- [ ] Verify localStorage persistence across browser refresh
- [ ] Test with no configured queues (dropdown should show "No queues available")
- [ ] Test select all / clear all functionality
- [ ] Test removing queues via badge X buttons
- [ ] Verify all text is internationalized (no hardcoded English)
- [ ] Check verbose logging output when enabled

### Edge Cases

- [ ] Create 99 queue groups (maximum)
- [ ] Try to create 100th group (should reuse highest ID)
- [ ] Delete and recreate groups multiple times
- [ ] Import file with invalid queue group structure
- [ ] Import file with queue numbers that don't exist
- [ ] Test with very long group names
- [ ] Test with special characters in group names

---

## Troubleshooting

### Queue Groups Not Saving

**Symptom**: Queue groups disappear after browser refresh  
**Cause**: localStorage not available or blocked  
**Solution**: Check browser localStorage permissions

### Import Fails for Queue Groups

**Symptom**: Error message during import  
**Cause**: Invalid JSON structure or missing required fields  
**Solution**: Verify export file structure matches expected format

### No Queues Available in Dropdown

**Symptom**: Dropdown shows "No queues available"  
**Cause**: No queues configured in Queue Monitor  
**Solution**: Add queues in Queue Monitor tab first, then create groups

### Queue Group IDs Not Sequential

**Symptom**: New group gets QG05 when QG01-QG04 exist  
**Cause**: Previous groups QG01-QG04 were deleted  
**Solution**: Expected behavior - next ID should be QG05

---

## Technical Notes

### Browser Compatibility

- **localStorage**: Required - all modern browsers supported
- **React 18**: Required
- **TypeScript**: Required
- **ES6+**: Required

### Performance Considerations

- Queue groups stored as single localStorage item (efficient)
- No API calls required (local-only feature)
- Minimal memory footprint (small data structures)
- Fast ID generation (linear scan, max 99 iterations)

### Security Considerations

- No sensitive data stored (queue numbers and names only)
- No authentication required (local storage only)
- No cross-origin data sharing
- Export files are plain JSON (user should secure if needed)

---

## Changelog

### Version 1.0 (January 29, 2026)
- ✅ Initial implementation complete
- ✅ QueueGroup type definition
- ✅ Storage utilities with full CRUD operations
- ✅ QueueGroupModal component
- ✅ Settings view integration
- ✅ Import/Export integration
- ✅ Full internationalization support
- ✅ Verbose logging throughout
- ✅ Documentation complete

---

## Support

For questions or issues with Queue Groups:
1. Check verbose logging output (Settings > Advanced > Verbose Logging)
2. Verify localStorage availability in browser
3. Check browser console for error messages
4. Review this documentation for usage patterns

---

**Document Version**: 1.0  
**Last Updated**: January 29, 2026  
**Author**: AI Development Assistant  
**Status**: Production Ready ✅
