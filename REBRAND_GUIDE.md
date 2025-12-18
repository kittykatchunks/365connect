# Autocab365Connect PWA - Rebrand Implementation Guide

## Overview
This document describes the new color scheme and branding implementation for the Autocab365Connect PWA.

## Color Palette

### Brand Colors
- **Primary Deep Blue**: `#010658` - Main brand color
- **Secondary Vibrant Purple**: `#524df2` - Secondary accent
- **Accent Pink**: `#f2529e` - Accent color
- **Accent Magenta**: `#bf14d9` - Accent color
- **Light Gray**: `#f2f2f2` - Light backgrounds/surfaces
- **Dark Gray**: `#333333` - Dark backgrounds/surfaces
- **Pure White**: `#ffffff` - Backgrounds and text

## Theme Implementation

### Light Theme
The light theme uses a clean, professional appearance:

```css
--primary-color: #010658           /* Deep Blue for buttons and emphasis */
--secondary-color: #524df2         /* Vibrant Purple for secondary actions */
--accent-pink: #f2529e             /* Pink for accents */
--accent-magenta: #bf14d9          /* Magenta for accents */

--background-color: #ffffff        /* Pure white background */
--surface-color: #f2f2f2           /* Light gray for panels */
--surface-color-hover: #e8e8e8     /* Hover states */

--text-color: #333333              /* Dark gray primary text */
--text-color-secondary: #666666    /* Medium gray secondary text */
--text-color-accent: #010658       /* Deep blue for emphasis */
```

**Visual Identity (Light Mode):**
- Clean white backgrounds
- Deep blue (#010658) for primary actions (Call, Register buttons)
- Light gray (#f2f2f2) panels for content areas
- Purple accents (#524df2) for secondary actions
- Dark gray (#333333) text for excellent readability

### Dark Theme
The dark theme uses vibrant colors for visibility against dark backgrounds:

```css
--primary-color: #524df2           /* Vibrant Purple for visibility */
--secondary-color: #f2529e         /* Pink for secondary actions */
--accent-pink: #ff6bb3             /* Lighter pink for visibility */
--accent-magenta: #d946ef          /* Lighter magenta for visibility */

--background-color: #010658        /* Deep blue background */
--surface-color: #333333           /* Dark gray for panels */
--surface-color-hover: #444444     /* Hover states */

--text-color: #ffffff              /* White primary text */
--text-color-secondary: #f2f2f2    /* Off-white secondary text */
--text-color-accent: #524df2       /* Purple for emphasis */
```

**Visual Identity (Dark Mode):**
- Deep blue (#010658) background creates professional atmosphere
- Vibrant purple (#524df2) for primary actions stands out
- Dark gray (#333333) panels provide hierarchy
- Pink accents (#f2529e) for secondary actions
- White text (#ffffff) ensures readability

## Logo Implementation

### File Structure
Place your logo files in the `pwa/images/` directory:

```
pwa/images/
├── logo-light.png    (For light theme)
└── logo-dark.png     (For dark theme)
```

### Accepted Logo Formats
1. **SVG** (Recommended) - Scalable, small file size, perfect quality at any size
2. **PNG** - Use with transparency, 32x32px minimum (64x64px or 128x128px recommended for retina)
3. **WebP** - Modern format with good compression
4. **Base64** - Can be embedded directly in CSS if needed

### Logo Dimensions
- **Display Size**: 32x32px (defined in CSS)
- **Source Image**: Recommend 64x64px or 128x128px for retina displays
- **Format**: PNG with transparency or SVG

### Theme-Aware Logo Switching
The application automatically switches logos based on the active theme:

- **Light Theme**: Shows `logo-light.png`
- **Dark Theme**: Shows `logo-dark.png`
- **Auto Mode**: Follows system preference

The CSS handles this automatically - no JavaScript required.

### Logo Design Guidelines

**For Light Theme Logo (`logo-light.png`):**
- Should work on white background (#ffffff)
- Can use dark colors: #010658, #524df2, #333333
- Consider using the deep blue (#010658) as primary logo color
- Avoid pure white elements (they'll disappear)

**For Dark Theme Logo (`logo-dark.png`):**
- Should work on deep blue background (#010658)
- Can use light colors: #ffffff, #f2f2f2, #524df2, #f2529e
- Consider using white (#ffffff) or vibrant purple (#524df2)
- Avoid dark blue colors (they'll blend with background)

## CSS Variables Reference

### All Available Brand Color Variables

```css
/* Light Theme Colors */
--primary-color: #010658
--primary-color-rgb: 1, 6, 88
--primary-hover: #020980
--secondary-color: #524df2
--secondary-color-rgb: 82, 77, 242
--accent-pink: #f2529e
--accent-magenta: #bf14d9

/* Dark Theme Colors (in [data-theme="dark"]) */
--primary-color: #524df2
--primary-color-rgb: 82, 77, 242
--primary-hover: #6b66ff
--secondary-color: #f2529e
--secondary-color-rgb: 242, 82, 158
--accent-pink: #ff6bb3
--accent-magenta: #d946ef
```

### Semantic Colors
These colors remain consistent across themes (with slight adjustments for visibility):

```css
--success-color: #22c55e / #34d399   (Light / Dark)
--danger-color: #ef4444 / #f87171    (Light / Dark)
--warning-color: #f59e0b / #fbbf24   (Light / Dark)
--info-color: #3b82f6 / #60a5fa      (Light / Dark)
```

## File Updates Made

### 1. `pwa/css/phone.css`
- Updated `:root` section with new light theme colors
- Updated `[data-theme="dark"]` section with new dark theme colors
- Updated `@media (prefers-color-scheme: dark)` with matching dark theme
- Added `.app-logo img` theme-aware display rules
- Added `.logo-light` and `.logo-dark` classes

### 2. `pwa/index.html`
- Updated logo markup to include both light and dark variants
- Both logos are in DOM, CSS controls visibility

## Usage Examples

### Using Brand Colors in Custom CSS

```css
/* Primary button with brand color */
.my-button {
    background-color: var(--primary-color);
    color: var(--text-color-inverse);
}

/* Secondary action with accent */
.my-secondary-button {
    background-color: var(--secondary-color);
    color: white;
}

/* Surface with brand colors */
.my-panel {
    background-color: var(--surface-color);
    border: 1px solid var(--border-color);
    color: var(--text-color);
}
```

### Testing Themes

1. **Manual Theme Switch**: Go to Settings > Interface > Theme Mode
   - Select "Light Mode" to test light theme
   - Select "Dark Mode" to test dark theme
   - Select "Auto (System)" to follow OS preference

2. **Browser DevTools**: 
   - Open DevTools (F12)
   - Inspect the `<body>` or `<html>` element
   - Check for `data-theme="dark"` attribute

3. **System Preference**:
   - Change your OS theme settings
   - With "Auto (System)" selected, app will follow OS

## Next Steps

1. **Create Logo Files**:
   - Design/export `logo-light.png` (for light theme)
   - Design/export `logo-dark.png` (for dark theme)
   - Place both files in `pwa/images/` directory

2. **Test Both Themes**:
   - Test light theme: Settings > Interface > Theme Mode > "Light Mode"
   - Test dark theme: Settings > Interface > Theme Mode > "Dark Mode"
   - Verify logo visibility in both themes

3. **Update Manifest** (Optional):
   - Update `pwa/manifest.json` with new theme colors
   - Update `theme_color` and `background_color` fields

4. **Update Favicon** (Optional):
   - Create matching favicon files
   - Update references in `index.html` `<head>` section

## Brand Guidelines Summary

### Primary Actions (Buttons, Links, CTAs)
- **Light Theme**: Deep Blue (#010658)
- **Dark Theme**: Vibrant Purple (#524df2)

### Secondary Actions
- **Light Theme**: Vibrant Purple (#524df2)
- **Dark Theme**: Pink (#f2529e)

### Backgrounds
- **Light Theme**: White (#ffffff) with Light Gray (#f2f2f2) panels
- **Dark Theme**: Deep Blue (#010658) with Dark Gray (#333333) panels

### Text
- **Light Theme**: Dark Gray (#333333) on white/light backgrounds
- **Dark Theme**: White (#ffffff) on blue/dark backgrounds

### Accents & Highlights
- Use Pink (#f2529e) and Magenta (#bf14d9) sparingly for:
  - Notifications
  - Badges
  - Special states
  - Decorative elements

## Technical Notes

### CSS Custom Properties
The theme system uses CSS custom properties (variables) which:
- Automatically update when theme changes
- Support real-time theme switching
- Reduce code duplication
- Improve maintainability

### Browser Compatibility
- Modern browsers (Chrome 49+, Firefox 31+, Safari 9.1+, Edge 15+)
- Automatic theme switching works in Chrome 76+, Firefox 67+, Safari 12.1+
- Fallback to light theme in older browsers

### Performance
- CSS-only theme switching (no JavaScript required for color changes)
- Smooth transitions with `--theme-transition: all 0.3s ease`
- No flash of unstyled content (FOUC)

## Support

For questions or issues with the rebrand implementation:
1. Check browser console for any CSS errors
2. Verify logo files are in correct location
3. Test with DevTools to inspect active CSS variables
4. Check `data-theme` attribute on `<body>` or `<html>`

---

**Version**: 0.2.001  
**Last Updated**: November 27, 2025  
**Theme System**: CSS Custom Properties with Auto-Detection
