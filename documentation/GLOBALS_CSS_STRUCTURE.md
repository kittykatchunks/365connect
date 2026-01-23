# Global CSS Structure Guide

## Overview
The `src/styles/globals.css` file has been refactored into clearly defined sections to make it easier for the design team to locate and modify styles for specific components and views.

## File Location
`src/styles/globals.css` (4,650+ lines)

## Table of Contents Structure

The CSS file is organized into 14 major sections:

### 1. Theme System & CSS Variables
**Lines:** ~1-150  
**Purpose:** Core design tokens and theme definitions
- Light mode color palette
- Dark mode color palette
- Spacing scale
- Border radius values
- Shadow definitions
- Typography settings
- Transition timings
- Responsive font sizes for dial components

**What to modify here:**
- Brand colors
- Spacing system
- Typography scale
- Shadow intensities
- Animation speeds

---

### 2. Base Styles & Resets
**Lines:** ~150-300  
**Purpose:** Global HTML element resets and base styling
- Box model resets
- HTML/body base styles
- Focus states
- Scrollbar styling
- Text selection
- Input/button resets
- Screen reader utilities

**What to modify here:**
- Global font smoothing
- Default focus styles
- Scrollbar appearance
- Text selection colors

---

### 3. Layout Components
**Lines:** ~300-450  
**Purpose:** Main application layout structure
- `.main-container` - App wrapper
- `.left-panel` - Sidebar container
- `.left-panel-header` - Top header with logo
- `.app-brand` - Logo and branding
- `.panel-header` - Tab content headers
- `.sip-status` - SIP connection indicator
- `.voicemail-item` - Voicemail notification

**What to modify here:**
- Panel widths and spacing
- Header heights
- Logo sizing
- Status indicator styling
- Voicemail badge appearance

---

### 4. Navigation Tabs
**Lines:** ~450-550  
**Purpose:** Bottom navigation tab bar
- `.navigation-tabs` - Tab container
- `.nav-tab` - Individual tab button
- `.nav-tab-active` - Active tab state
- `.nav-tab-icon` - Tab icons
- `.nav-tab-label` - Tab labels

**What to modify here:**
- Tab heights and spacing
- Active tab indicators
- Icon sizes
- Label typography
- Hover/active states

---

### 5. UI Components
**Lines:** ~550-1100  
**Purpose:** Reusable UI components used throughout the app
- **Buttons:** `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, etc.
- **Inputs:** `.input`, `.input-wrapper`, `.input-icon`
- **Select:** `.select`, `.select-wrapper`
- **Checkbox:** `.checkbox-wrapper`, `.checkbox-box`
- **Toggle:** `.toggle-wrapper`, `.toggle-track`, `.toggle-thumb`
- **Modal:** `.modal-backdrop`, `.modal-container`, `.modal-header`
- **Toast:** `.toast-container`, `.toast`, `.toast-icon`
- **Accordion:** `.accordion`, `.accordion-trigger`
- **Loading:** `.loading-screen`, `.spinner`
- **Pause Reason Modal:** `.pause-reason-modal`, `.pause-reason-button`

**What to modify here:**
- Button colors, sizes, and hover states
- Input field styling
- Modal appearance and animations
- Toast notification styling
- Loading spinner design

---

### 6. TAB: Dial View & Components
**Lines:** ~1100-2500  
**Purpose:** Main dialer interface and all related components

#### Subsections:
- **Dial View Layout** - Container and grid structure
- **Dial Input** - Number input field with call button
- **Call Info Display** - Active/incoming call information
- **Dialpad** - Number pad buttons (responsive)
- **Line Keys** - Multi-line selection buttons
- **Call Control Buttons** - Mute, hold, transfer, end call
- **Incoming Call Banner** - Pulsing incoming call display
- **Active Call Display** - Connected call information
- **BLF (Busy Lamp Field) Buttons** - Extension monitoring sidebar
- **CLI Selector** - Caller ID number selection
- **API Sync Modal** - Company numbers sync interface
- **Responsive Breakpoints** - Mobile/tablet adaptations

**What to modify here:**
- Dialpad button sizes and spacing
- Call info typography
- BLF button appearance and animations
- Control button colors and layouts
- Mobile responsiveness breakpoints
- Incoming call animations

**Key Responsive Breakpoints:**
- Desktop: Default styles
- Tablets (≤1024px): Slightly reduced spacing
- Mobile (≤768px): Adjusted button sizes
- Small Mobile (≤480px): Hide BLF, double dialpad size

---

### 7. TAB: Contacts View
**Lines:** ~2500-2800  
**Purpose:** Contacts list and management
- `.empty-state` - No contacts placeholder
- `.coming-soon` - Feature preview
- `.contacts-view` - Main container
- `.contacts-search` - Search input area
- `.contacts-list` - Scrollable list
- `.contact-item` - Individual contact row
- `.contact-avatar` - Contact initials/image
- `.contact-actions` - Call/edit buttons
- `.contact-menu` - Context menu dropdown

**What to modify here:**
- Contact list item styling
- Avatar appearance
- Search bar design
- Action button placement
- Empty state messaging

---

### 8. TAB: Activity View
**Lines:** ~2800-3100  
**Purpose:** Call history and activity log
- `.activity-view` - Main container
- `.activity-filters` - Filter buttons
- `.activity-list` - Scrollable history
- `.activity-group` - Grouped by date
- `.activity-item` - Individual call record
- `.activity-item--missed` - Missed call highlight
- `.activity-icon` - Call direction indicator
- `.activity-meta` - Time and duration

**What to modify here:**
- Call history item layout
- Missed call highlighting
- Date grouping headers
- Icon colors for in/out/missed
- Duration formatting

---

### 9. TAB: Company Numbers View
**Lines:** ~3100-3400  
**Purpose:** Company DID/CLI number management
- `.company-numbers-view` - Main container
- `.company-numbers-search` - Search input
- `.company-numbers-list` - Scrollable list
- `.company-number-item` - Individual number row
- `.company-number-id` - Number ID badge
- `.company-number-cid` - Caller ID display
- `.company-number-menu` - Context actions

**What to modify here:**
- Number list styling
- ID badge appearance
- Search functionality
- Action menu design

---

### 10. TAB: Settings View
**Lines:** ~3400-3600  
**Purpose:** Application settings and configuration
- `.settings-view` - Main container
- `.settings-content` - Scrollable content
- `.settings-group` - Grouped settings
- `.settings-subtitle` - Section headers
- `.setting-item` - Individual setting
- `.audio-device-row` - Device selectors
- `.mic-level-meter` - Microphone level indicator
- `.import-export-modal` - Data import/export
- `.file-picker` - File upload area

**What to modify here:**
- Settings form layout
- Section headers
- Audio device selector styling
- Import/export interface
- Microphone level visualization

---

### 11. Modals & Overlays
**Lines:** ~3600-3900  
**Purpose:** Modal dialogs and overlay components
- **Transfer Modal** - Call transfer interface
- **BLF Config Modal** - BLF button configuration
- **Confirm Modal** - Confirmation dialogs
- **Welcome Overlay** - First-time user welcome
- **Version Update Modal** - Update notifications

**What to modify here:**
- Modal backdrop blur/color
- Modal sizing and spacing
- Header/footer styling
- Confirmation icon colors
- Welcome screen branding

---

### 12. PWA Components & Loading
**Lines:** ~3900-4100  
**Purpose:** Progressive Web App features
- `.pwa-install-button` - Install prompt button
- `.pwa-installed-badge` - Installed indicator
- `.loading-screen` - App initialization
- `.loading-logo` - Loading brand animation
- `.loading-steps` - Initialization progress
- `.update-prompt` - Update notification banner

**What to modify here:**
- Install button styling
- Loading screen branding
- Progress indicators
- Update banner appearance

---

### 13. Error Handling & Boundaries
**Lines:** ~4100-4500  
**Purpose:** Error states and recovery UI
- `.error-boundary` - App-level errors
- `.view-error-boundary` - Tab-level errors
- `.webrtc-warning` - WebRTC compatibility warnings
- `.tab-flashing` - Tab alert animations
- `.view-loading` - Tab loading state

**What to modify here:**
- Error message styling
- Warning banner colors
- Tab alert animations
- Recovery button styling

---

### 14. Animations & Utilities
**Lines:** ~4500-4650  
**Purpose:** Keyframe animations and utility classes
- **Keyframes:** `fadeIn`, `slideUp`, `pulse`, `spin`, `ring`
- **Animation Classes:** `.animate-fade-in`, `.animate-pulse`, `.animate-spin`
- **Utility Classes:** `.text-muted`, `.text-success`, `.text-warning`, `.text-error`

**What to modify here:**
- Animation timing and easing
- Pulse effects
- Utility text colors

---

## Design Token System

### Color Variables
All colors are defined as CSS custom properties in Section 1:

```css
/* Primary Colors */
--primary-color: #3182ce;
--primary-color-hover: #2c5282;
--primary-color-light: #bee3f8;

/* Status Colors */
--success-color: #38a169;
--warning-color: #d69e2e;
--danger-color: #e53e3e;
--info-color: #3182ce;
```

### Spacing Scale
```css
--spacing-xs: 0.25rem;   /* 4px */
--spacing-sm: 0.5rem;    /* 8px */
--spacing-md: 1rem;      /* 16px */
--spacing-lg: 1.5rem;    /* 24px */
--spacing-xl: 2rem;      /* 32px */
```

### Typography
```css
--font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

Responsive font sizes use `clamp()` for fluid scaling:
```css
font-size: clamp(0.75rem, 0.5rem + 0.833vw, 1rem);
```

---

## Common Modification Patterns

### Changing Brand Colors
1. Navigate to **Section 1: Theme System**
2. Update `--primary-color` and related variables
3. Update dark theme overrides in `[data-theme="dark"]`

### Adjusting Component Spacing
1. Navigate to the specific section (e.g., Section 6 for Dial)
2. Find the component class
3. Modify `padding`, `gap`, or `margin` properties
4. Consider mobile breakpoints at the end of the section

### Customizing Animations
1. Navigate to **Section 14: Animations**
2. Modify keyframe definitions or durations
3. Check component-specific animations in their sections

### Responsive Design Changes
1. Each major section includes its own responsive breakpoints
2. **Dial View** has the most extensive responsive rules (end of Section 6)
3. Common breakpoints: 1024px, 768px, 480px

---

## Best Practices

1. **Always test both light and dark themes** when modifying colors
2. **Check responsive breakpoints** when changing sizes or layouts
3. **Use CSS variables** for colors and spacing (defined in Section 1)
4. **Test on mobile devices** - especially Dial View changes
5. **Maintain accessibility** - ensure sufficient color contrast
6. **Keep animations performant** - prefer `transform` and `opacity`

---

## Quick Reference: Finding Specific Styles

| Component | Section | Search Term |
|-----------|---------|-------------|
| Primary buttons | 5 | `.btn-primary` |
| Dialpad numbers | 6 | `.dialpad-key` |
| BLF buttons | 6 | `.blf-btn` |
| Contact list items | 7 | `.contact-item` |
| Call history | 8 | `.activity-item` |
| Settings toggles | 10 | `.toggle-wrapper` |
| Modal dialogs | 11 | `.modal-container` |
| Error messages | 13 | `.error-boundary` |

---

## Getting Help

When requesting design changes, please reference:
1. **Section number** (1-14)
2. **Component name** (e.g., "Dialpad button")
3. **Specific property** to change (e.g., "background color", "padding")
4. **Context** (light/dark theme, desktop/mobile)

Example: "In Section 6 (Dial View), please change the dialpad button background color in dark mode"

---

**Last Updated:** January 2026  
**File Version:** Refactored structure with 14 major sections
