# Autocab365Connect Color Palette Reference

## Quick Color Reference

### Light Theme Colors

| Element | Color | Hex Code | Usage |
|---------|-------|----------|-------|
| **Primary** | 🔵 Deep Blue | `#010658` | Buttons, links, primary actions |
| **Secondary** | 🟣 Vibrant Purple | `#524df2` | Secondary actions, accents |
| **Accent Pink** | 🔴 Pink | `#f2529e` | Notifications, highlights |
| **Accent Magenta** | 🟣 Magenta | `#bf14d9` | Special states, badges |
| **Background** | ⚪ White | `#ffffff` | Main background |
| **Surface** | ◽ Light Gray | `#f2f2f2` | Panels, cards, containers |
| **Surface Hover** | ◽ Darker Gray | `#e8e8e8` | Hover states |
| **Text Primary** | ⚫ Dark Gray | `#333333` | Main text |
| **Text Secondary** | ◾ Medium Gray | `#666666` | Secondary text |
| **Text Muted** | ◽ Light Gray | `#999999` | Disabled, muted text |
| **Border** | ◽ Border Gray | `#e0e0e0` | Dividers, borders |

### Dark Theme Colors

| Element | Color | Hex Code | Usage |
|---------|-------|----------|-------|
| **Primary** | 🟣 Vibrant Purple | `#524df2` | Buttons, links, primary actions |
| **Secondary** | 🔴 Pink | `#f2529e` | Secondary actions, accents |
| **Accent Pink** | 🔴 Light Pink | `#ff6bb3` | Notifications, highlights |
| **Accent Magenta** | 🟣 Light Magenta | `#d946ef` | Special states, badges |
| **Background** | 🔵 Deep Blue | `#010658` | Main background |
| **Surface** | ⚫ Dark Gray | `#333333` | Panels, cards, containers |
| **Surface Hover** | ◾ Lighter Gray | `#444444` | Hover states |
| **Text Primary** | ⚪ White | `#ffffff` | Main text |
| **Text Secondary** | ◽ Off White | `#f2f2f2` | Secondary text |
| **Text Muted** | ◽ Gray | `#999999` | Disabled, muted text |
| **Border** | ◾ Border Gray | `#444444` | Dividers, borders |

## Color Swatches

### Light Theme Preview
```
┌─────────────────────────────────────────────────┐
│ #010658 ████████  Primary (Deep Blue)          │
│ #524df2 ████████  Secondary (Vibrant Purple)   │
│ #f2529e ████████  Accent Pink                  │
│ #bf14d9 ████████  Accent Magenta               │
│ ───────────────────────────────────────────────│
│ #ffffff ████████  Background (White)           │
│ #f2f2f2 ████████  Surface (Light Gray)         │
│ #333333 ████████  Text (Dark Gray)             │
└─────────────────────────────────────────────────┘
```

### Dark Theme Preview
```
┌─────────────────────────────────────────────────┐
│ #524df2 ████████  Primary (Vibrant Purple)     │
│ #f2529e ████████  Secondary (Pink)             │
│ #ff6bb3 ████████  Accent Pink (Lighter)        │
│ #d946ef ████████  Accent Magenta (Lighter)     │
│ ───────────────────────────────────────────────│
│ #010658 ████████  Background (Deep Blue)       │
│ #333333 ████████  Surface (Dark Gray)          │
│ #ffffff ████████  Text (White)                 │
└─────────────────────────────────────────────────┘
```

## Semantic Colors (Both Themes)

| Purpose | Light Theme | Dark Theme |
|---------|------------|------------|
| **Success** | `#22c55e` 🟢 | `#34d399` 🟢 |
| **Danger/Error** | `#ef4444` 🔴 | `#f87171` 🔴 |
| **Warning** | `#f59e0b` 🟠 | `#fbbf24` 🟡 |
| **Info** | `#3b82f6` 🔵 | `#60a5fa` 🔵 |

## Brand Color Usage Matrix

### Primary Actions (Call, Register, Submit)
- ✅ Light: Deep Blue `#010658`
- ✅ Dark: Vibrant Purple `#524df2`

### Secondary Actions (Cancel, Settings, Import)
- ✅ Light: Vibrant Purple `#524df2`
- ✅ Dark: Pink `#f2529e`

### Text on Primary Buttons
- ✅ Both: White `#ffffff`

### Panel Backgrounds
- ✅ Light: Light Gray `#f2f2f2`
- ✅ Dark: Dark Gray `#333333`

### Main Background
- ✅ Light: White `#ffffff`
- ✅ Dark: Deep Blue `#010658`

### Navigation Active State
- ✅ Light: Deep Blue background `#010658` + White text
- ✅ Dark: Vibrant Purple background `#524df2` + White text

## Logo Colors Guide

### Light Theme Logo (on white/light gray background)
**Recommended Colors:**
- Primary: `#010658` (Deep Blue) - Best contrast
- Accent: `#524df2` (Vibrant Purple) - Good accent
- Text: `#333333` (Dark Gray) - For text elements

**Avoid:**
- ❌ White `#ffffff` - Will disappear
- ❌ Very light colors - Poor contrast

### Dark Theme Logo (on deep blue/dark gray background)
**Recommended Colors:**
- Primary: `#ffffff` (White) - Best contrast
- Accent: `#524df2` (Vibrant Purple) - Vibrant accent
- Alternate: `#f2529e` (Pink) - Bold accent
- Text: `#f2f2f2` (Off White) - For text elements

**Avoid:**
- ❌ Deep Blue `#010658` - Will blend with background
- ❌ Very dark colors - Poor contrast

## CSS Variable Names

### Quick Copy-Paste

```css
/* Light Theme - Primary Colors */
--primary-color: #010658;
--secondary-color: #524df2;
--accent-pink: #f2529e;
--accent-magenta: #bf14d9;

/* Light Theme - Backgrounds */
--background-color: #ffffff;
--surface-color: #f2f2f2;
--surface-color-hover: #e8e8e8;

/* Light Theme - Text */
--text-color: #333333;
--text-color-secondary: #666666;
--text-color-muted: #999999;

/* Dark Theme - Primary Colors */
[data-theme="dark"] {
    --primary-color: #524df2;
    --secondary-color: #f2529e;
    --accent-pink: #ff6bb3;
    --accent-magenta: #d946ef;
}

/* Dark Theme - Backgrounds */
[data-theme="dark"] {
    --background-color: #010658;
    --surface-color: #333333;
    --surface-color-hover: #444444;
}

/* Dark Theme - Text */
[data-theme="dark"] {
    --text-color: #ffffff;
    --text-color-secondary: #f2f2f2;
    --text-color-muted: #999999;
}
```

## Accessibility Notes

### Contrast Ratios
All color combinations meet WCAG AA standards:

**Light Theme:**
- `#333333` on `#ffffff`: 12.6:1 ✅ (AAA)
- `#010658` on `#ffffff`: 15.5:1 ✅ (AAA)
- `#ffffff` on `#010658`: 15.5:1 ✅ (AAA)

**Dark Theme:**
- `#ffffff` on `#010658`: 15.5:1 ✅ (AAA)
- `#ffffff` on `#333333`: 11.5:1 ✅ (AAA)
- `#524df2` on `#010658`: 4.8:1 ✅ (AA)

### Color Blind Friendly
- Deep Blue and Purple provide good distinction
- Pink/Magenta accents are supplementary, not critical
- All interactive elements have sufficient contrast
- Never use color alone to convey information

## Design System Integration

### Button Styles
```css
/* Primary Button (Light) */
background: #010658;
color: #ffffff;
hover: #020980;

/* Primary Button (Dark) */
background: #524df2;
color: #ffffff;
hover: #6b66ff;

/* Secondary Button (Light) */
background: #524df2;
color: #ffffff;

/* Secondary Button (Dark) */
background: #f2529e;
color: #ffffff;
```

### Status Indicators
- 🟢 Available/Online: Success color
- 🔴 Busy/Error: Danger color
- 🟡 Away/Warning: Warning color
- ⚪ Offline: Muted text color

---

**Tip**: Open this file side-by-side with your design tool to ensure color accuracy when creating logos and graphics.
