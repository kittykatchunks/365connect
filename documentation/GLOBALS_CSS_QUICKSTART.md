# 🚀 Quick Start Guide - Global CSS for Design Team

## 📍 File Location
`src/styles/globals.css` (4,648 lines)

---

## 🎯 3-Minute Quickstart

### Step 1: Open the File
```
src/styles/globals.css
```

### Step 2: Navigate Using Ctrl+F
Search for section numbers:
- `1. THEME SYSTEM` - Colors, spacing, fonts
- `6. TAB: DIAL` - Main phone interface
- `7. TAB: CONTACTS` - Contacts list
- `8. TAB: ACTIVITY` - Call history
- `9. TAB: COMPANY` - Company numbers
- `10. TAB: SETTINGS` - Settings interface

### Step 3: Read the Table of Contents
Lines 3-20 contain the complete structure overview.

---

## 🎨 Most Common Design Tasks

### Change Brand Colors
**Where:** Section 1 (Line ~30)
```css
--primary-color: #3182ce;        /* Change this */
--primary-color-hover: #2c5282;  /* And this */
```
**Remember:** Update both light AND dark themes!

### Adjust Button Sizes
**Where:** Section 5 (Line ~550)
```css
.btn {
  padding: var(--spacing-sm) var(--spacing-md);  /* Change padding */
  font-size: 1rem;  /* Change font size */
}
```

### Modify Dialpad Appearance
**Where:** Section 6 - "Dialpad" subsection (Line ~1300)
```css
.dialpad-key {
  background-color: var(--surface-color);
  padding: clamp(...);  /* Adjust sizing */
}
```

### Change Navigation Tab Style
**Where:** Section 4 (Line ~310)
```css
.nav-tab-active {
  color: var(--primary-color);
  border-bottom: 2px solid var(--primary-color);
}
```

### Customize Modals
**Where:** Section 11 (Line ~3550)
```css
.modal-container {
  background-color: var(--surface-color);
  border-radius: var(--radius-lg);
}
```

---

## 🔍 Finding Specific Components

### Quick Search Terms

| Component | Search For | Section |
|-----------|-----------|---------|
| Logo/branding | `.app-brand` | 3 |
| Dial buttons | `.dialpad-key` | 6 |
| Call button | `.call-button` | 6 |
| BLF buttons | `.blf-btn` | 6 |
| Contact items | `.contact-item` | 7 |
| Call history | `.activity-item` | 8 |
| Settings forms | `.setting-item` | 10 |
| Modal windows | `.modal-container` | 11 |
| Error messages | `.error-boundary` | 13 |

---

## 📱 Responsive Design

### Breakpoints
Located at end of Section 6 (Dial View):
- **Desktop:** Default styles
- **1024px:** Tablets - `@media (max-width: 1024px)`
- **768px:** Small tablets - `@media (max-width: 768px)`
- **480px:** Mobile - `@media (max-width: 480px)`

### Testing Responsiveness
1. Find component in its section
2. Scroll to end of section for responsive rules
3. Check mobile breakpoints (especially 480px)

---

## 🎨 Design Token Reference

### Colors (Section 1)
```css
--primary-color: #3182ce      /* Main blue */
--success-color: #38a169      /* Green (call active) */
--warning-color: #d69e2e      /* Orange (hold) */
--danger-color: #e53e3e       /* Red (end call) */
```

### Spacing (Section 1)
```css
--spacing-xs: 4px
--spacing-sm: 8px
--spacing-md: 16px   /* Most common */
--spacing-lg: 24px
--spacing-xl: 32px
```

### Border Radius (Section 1)
```css
--radius-sm: 4px
--radius-md: 6px     /* Most buttons */
--radius-lg: 8px
--radius-full: 9999px  /* Circular */
```

---

## ⚠️ Important Rules

### ✅ DO:
- ✅ Use CSS variables (e.g., `var(--primary-color)`)
- ✅ Test both light AND dark themes
- ✅ Check mobile responsiveness (≤480px)
- ✅ Reference section numbers when asking questions
- ✅ Keep animations performant (use `transform`, `opacity`)

### ❌ DON'T:
- ❌ Use hardcoded colors (use variables instead)
- ❌ Forget to test dark mode
- ❌ Skip mobile breakpoints
- ❌ Remove existing responsive styles
- ❌ Change animation keyframes without testing

---

## 🆘 Need Help Finding Something?

### Use the Documentation:
1. **Detailed Guide:** `documentation/GLOBALS_CSS_STRUCTURE.md`
2. **Visual Map:** `documentation/GLOBALS_CSS_VISUAL_MAP.md`
3. **This Guide:** `documentation/GLOBALS_CSS_QUICKSTART.md`

### Search Pattern:
1. Open `globals.css`
2. Press `Ctrl+F`
3. Search for section number (e.g., "6. TAB: DIAL")
4. Scroll through section to find component
5. Check end of section for responsive rules

---

## 📋 Making a Design Request

### Template:
```
Section: [Number and Name]
Component: [CSS Class Name]
Change: [What to modify]
Context: [Light/Dark, Desktop/Mobile]
```

### Example:
```
Section: 6 - Dial View
Component: .dialpad-key
Change: Increase button size by 20%
Context: Mobile devices (≤480px), both themes
```

---

## 🎯 Common Modifications Checklist

When making changes, verify:
- [ ] Light theme looks good
- [ ] Dark theme looks good
- [ ] Desktop layout works (>1024px)
- [ ] Tablet layout works (768-1024px)
- [ ] Mobile layout works (<480px)
- [ ] Animations are smooth
- [ ] No console errors
- [ ] Touch targets are adequate (mobile)

---

## 🚦 Section Priority Guide

### High-Impact Sections (Change These First)
1. **Section 1** - Theme colors affect entire app
2. **Section 6** - Dial view is main interface
3. **Section 5** - Buttons used everywhere

### Medium-Impact Sections
4. **Sections 7-10** - Individual tab styles
5. **Section 11** - Modal dialogs

### Low-Impact Sections (Usually Fine As-Is)
- **Section 2** - Base resets (rarely changed)
- **Section 13** - Error styles (edge cases)
- **Section 14** - Utility classes (reusable)

---

## 💡 Pro Tips

1. **Start with Section 1:** Change design tokens first, see global impact
2. **Work Section-by-Section:** Don't jump around randomly
3. **Comment Your Changes:** Add `/* Design Team: Description */`
4. **Save Often:** CSS is forgiving but save frequently
5. **Use Browser DevTools:** Test changes live before committing

---

## 📞 Getting Support

**When asking for help, include:**
1. Section number
2. Component name (CSS class)
3. What you tried
4. Screenshot if possible
5. Device/browser context

**Example:** 
> "I'm trying to modify the dialpad buttons in Section 6, specifically `.dialpad-key`. I changed the padding but it doesn't look right on mobile. See attached screenshot."

---

## ✅ Ready to Start!

You now have everything you need to navigate and modify the global CSS:
- ✅ File structure understood (14 sections)
- ✅ Navigation method learned (Ctrl+F section numbers)
- ✅ Common tasks identified
- ✅ Design tokens referenced
- ✅ Responsive rules located
- ✅ Support resources available

**Go forth and design! 🎨**

---

**Quick Links:**
- 📁 CSS File: `src/styles/globals.css`
- 📖 Detailed Guide: `documentation/GLOBALS_CSS_STRUCTURE.md`
- 🗺️ Visual Map: `documentation/GLOBALS_CSS_VISUAL_MAP.md`
- 📋 Summary: `documentation/GLOBALS_CSS_REFACTORING_SUMMARY.md`
