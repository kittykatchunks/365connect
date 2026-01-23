# Global CSS - Visual Navigation Map

```
src/styles/globals.css
│
├─── 📦 1. THEME SYSTEM & CSS VARIABLES (~150 lines)
│    ├─ Color palette (light mode)
│    ├─ Color palette (dark mode)
│    ├─ Spacing scale
│    ├─ Border radius
│    ├─ Shadows
│    ├─ Transitions
│    └─ Typography
│
├─── 🔧 2. BASE STYLES & RESETS (~150 lines)
│    ├─ HTML/body defaults
│    ├─ Focus states
│    ├─ Scrollbar styling
│    ├─ Selection colors
│    └─ Element resets
│
├─── 📐 3. LAYOUT COMPONENTS (~150 lines)
│    ├─ .main-container
│    ├─ .left-panel
│    ├─ .left-panel-header
│    ├─ .app-brand
│    ├─ .panel-header
│    └─ .voicemail-item
│
├─── 🔽 4. NAVIGATION TABS (~100 lines)
│    ├─ .navigation-tabs
│    ├─ .nav-tab
│    ├─ .nav-tab-active
│    └─ Tab animations
│
├─── 🎨 5. UI COMPONENTS (~550 lines)
│    ├─ Buttons (.btn-*)
│    ├─ Inputs (.input)
│    ├─ Select dropdowns (.select)
│    ├─ Checkboxes (.checkbox-*)
│    ├─ Toggles (.toggle-*)
│    ├─ Modals (.modal-*)
│    ├─ Toasts (.toast-*)
│    ├─ Accordion (.accordion-*)
│    ├─ Loading (.spinner)
│    └─ Pause Reason Modal
│
├─── 📱 6. TAB: DIAL VIEW (~1400 lines) ⭐ LARGEST SECTION
│    ├─ Layout
│    │   ├─ .dial-view
│    │   ├─ .dial-view-layout
│    │   └─ .dial-view-content
│    │
│    ├─ Dial Input
│    │   ├─ .dial-input-container
│    │   ├─ .dial-input
│    │   └─ .dial-input-actions
│    │
│    ├─ Call Info Display
│    │   ├─ .call-info-display
│    │   ├─ .caller-number
│    │   ├─ .caller-name
│    │   └─ .call-duration
│    │
│    ├─ Dialpad (Responsive)
│    │   ├─ .dialpad
│    │   ├─ .dialpad-key
│    │   ├─ .dialpad-digit
│    │   └─ .dialpad-letters
│    │
│    ├─ Line Keys
│    │   ├─ .line-keys
│    │   ├─ .line-key
│    │   └─ .line-key-active
│    │
│    ├─ Call Control Buttons
│    │   ├─ .call-controls-container
│    │   ├─ .dial-actions (idle)
│    │   ├─ .call-actions (active call)
│    │   ├─ .call-button
│    │   ├─ .hangup-button
│    │   ├─ .mute-btn
│    │   ├─ .hold-btn
│    │   └─ .transfer-btn
│    │
│    ├─ Incoming Call
│    │   ├─ .incoming-call-banner
│    │   ├─ .btn-answer
│    │   └─ .btn-reject
│    │
│    ├─ Active Call
│    │   ├─ .active-call-display
│    │   ├─ .call-timer
│    │   └─ .call-status
│    │
│    ├─ BLF Buttons (Busy Lamp Field)
│    │   ├─ .blf-grid
│    │   ├─ .blf-btn
│    │   ├─ .blf-btn-available (green)
│    │   ├─ .blf-btn-busy (red)
│    │   ├─ .blf-btn-ringing (flashing)
│    │   ├─ .blf-btn-hold (yellow)
│    │   └─ .blf-btn-inactive (gray)
│    │
│    ├─ CLI Selector
│    │   ├─ .cli-selector
│    │   ├─ .cli-selector-dropdown
│    │   └─ .cli-selector-option
│    │
│    ├─ API Sync Modal
│    │   └─ .api-sync-modal
│    │
│    └─ Responsive Breakpoints
│        ├─ @media (max-width: 1024px) - Tablets
│        ├─ @media (max-width: 768px) - Small tablets
│        ├─ @media (max-width: 480px) - Mobile
│        └─ @container queries
│
├─── 👥 7. TAB: CONTACTS VIEW (~300 lines)
│    ├─ .contacts-view
│    ├─ .contacts-search
│    ├─ .contacts-list
│    ├─ .contact-item
│    ├─ .contact-avatar
│    ├─ .contact-info
│    ├─ .contact-actions
│    ├─ .contact-menu
│    └─ .empty-state
│
├─── 📞 8. TAB: ACTIVITY VIEW (~300 lines)
│    ├─ .activity-view
│    ├─ .activity-filters
│    ├─ .activity-list
│    ├─ .activity-group
│    ├─ .activity-group-header
│    ├─ .activity-item
│    ├─ .activity-item--missed (red highlight)
│    ├─ .activity-icon
│    ├─ .activity-meta
│    └─ .activity-actions
│
├─── 🏢 9. TAB: COMPANY NUMBERS VIEW (~250 lines)
│    ├─ .company-numbers-view
│    ├─ .company-numbers-search
│    ├─ .company-numbers-list
│    ├─ .company-number-item
│    ├─ .company-number-id
│    ├─ .company-number-info
│    ├─ .company-number-cid
│    └─ .company-number-menu
│
├─── ⚙️ 10. TAB: SETTINGS VIEW (~200 lines)
│    ├─ .settings-view
│    ├─ .settings-content
│    ├─ .settings-group
│    ├─ .settings-subtitle
│    ├─ .setting-item
│    ├─ .audio-device-row
│    ├─ .mic-level-meter
│    ├─ .import-export-modal
│    └─ .file-picker
│
├─── 🪟 11. MODALS & OVERLAYS (~300 lines)
│    ├─ Transfer Modal
│    │   ├─ .transfer-modal-content
│    │   ├─ .transfer-type-tabs
│    │   └─ .transfer-input-group
│    │
│    ├─ BLF Config Modal
│    │   ├─ .blf-config-content
│    │   └─ .blf-config-field
│    │
│    ├─ Confirm Modal
│    │   ├─ .confirm-modal
│    │   ├─ .confirm-icon
│    │   └─ .confirm-message
│    │
│    ├─ Welcome Overlay
│    │   ├─ .welcome-overlay
│    │   ├─ .welcome-content
│    │   ├─ .welcome-header
│    │   └─ .welcome-features
│    │
│    └─ Version Update Modal
│        └─ .version-update-message
│
├─── 🔄 12. PWA COMPONENTS & LOADING (~200 lines)
│    ├─ PWA Install
│    │   ├─ .pwa-install-button
│    │   └─ .pwa-installed-badge
│    │
│    ├─ Loading Screen
│    │   ├─ .loading-screen
│    │   ├─ .loading-logo
│    │   ├─ .loading-steps
│    │   └─ .loading-progress
│    │
│    └─ Update Prompt
│        ├─ .update-prompt
│        └─ .update-prompt-actions
│
├─── ⚠️ 13. ERROR HANDLING & BOUNDARIES (~300 lines)
│    ├─ .error-boundary (app-level)
│    ├─ .view-error-boundary (tab-level)
│    ├─ .webrtc-warning
│    ├─ .tab-flashing (incoming call alert)
│    ├─ .tab-alert-warning (slow yellow flash)
│    ├─ .tab-alert-error (fast red flash)
│    └─ .view-loading
│
└─── ✨ 14. ANIMATIONS & UTILITIES (~150 lines)
     ├─ Keyframe Animations
     │   ├─ @keyframes fadeIn
     │   ├─ @keyframes slideUp
     │   ├─ @keyframes pulse
     │   ├─ @keyframes spin
     │   └─ @keyframes ring
     │
     ├─ Animation Classes
     │   ├─ .animate-fade-in
     │   ├─ .animate-slide-up
     │   ├─ .animate-pulse
     │   └─ .animate-spin
     │
     └─ Utility Classes
         ├─ .text-muted
         ├─ .text-success
         ├─ .text-warning
         └─ .text-error
```

---

## 🎯 Quick Navigation Tips

### For Header/Logo Changes:
→ Go to **Section 3: Layout Components**

### For Tab Bar Styling:
→ Go to **Section 4: Navigation Tabs**

### For Dialpad/Call Controls:
→ Go to **Section 6: Dial View** (largest section)

### For Contact/Activity Lists:
→ Go to **Sections 7-9** (individual tab sections)

### For Settings Forms:
→ Go to **Section 10: Settings View**

### For Modal Dialogs:
→ Go to **Section 11: Modals & Overlays**

### For Colors/Spacing:
→ Go to **Section 1: Theme System**

### For Animations:
→ Go to **Section 14: Animations & Utilities**

---

## 📊 Section Size Reference

| Section | Lines | Complexity |
|---------|-------|------------|
| 1. Theme System | ~150 | 🟢 Simple |
| 2. Base Styles | ~150 | 🟢 Simple |
| 3. Layout | ~150 | 🟢 Simple |
| 4. Navigation | ~100 | 🟢 Simple |
| 5. UI Components | ~550 | 🟡 Medium |
| 6. Dial View ⭐ | ~1400 | 🔴 Complex |
| 7. Contacts | ~300 | 🟡 Medium |
| 8. Activity | ~300 | 🟡 Medium |
| 9. Company Numbers | ~250 | 🟡 Medium |
| 10. Settings | ~200 | 🟡 Medium |
| 11. Modals | ~300 | 🟡 Medium |
| 12. PWA | ~200 | 🟢 Simple |
| 13. Errors | ~300 | 🟡 Medium |
| 14. Animations | ~150 | 🟢 Simple |

**Total:** ~4,650 lines

---

## 🎨 Design Token Quick Reference

```css
/* Colors */
--primary-color: #3182ce        /* Blue */
--success-color: #38a169        /* Green */
--warning-color: #d69e2e        /* Orange */
--danger-color: #e53e3e         /* Red */

/* Spacing */
--spacing-xs: 4px
--spacing-sm: 8px
--spacing-md: 16px
--spacing-lg: 24px
--spacing-xl: 32px

/* Responsive Breakpoints */
1024px - Tablets
768px  - Small tablets
480px  - Mobile phones
```

---

**Navigation:** Use Ctrl+F to search for section numbers (e.g., "6. TAB: DIAL VIEW")
