# PWA Sidebar - Quick Reference Card

## 📱 Browser Support Status

| Browser | Sidebar Ready | Method |
|---------|--------------|--------|
| Edge | ✅ YES | Install PWA → App Settings → Sidebar |
| Chrome | 🔄 Coming Soon | Extension API (temp) |
| Opera | ⚠️ Limited | Custom implementation |
| Safari | ⏳ Planned | Future iOS/macOS update |

---

## 🚀 Enable in Edge (Easiest)

1. Install PWA: Click install button in address bar
2. Right-click app icon → "App settings"  
3. Enable "Open in sidebar" / "Side panel"

**Alternative:** Edge Settings → Sidebar → Apps → Add Autocab365Connect

---

## 🔧 Key Files Modified

```
✅ pwa/manifest.json          - Added edge_side_panel config
✅ pwa/css/phone.css          - Sidebar-responsive styles
✅ pwa/js/sidebar-manager.js  - NEW: Detection & optimization
✅ pwa/js/app-startup.js      - Initialize sidebar manager
✅ pwa/index.html             - Load sidebar-manager.js
```

---

## 📐 Sidebar Dimensions

| Width | Mode | Optimizations |
|-------|------|---------------|
| > 450px | Normal | Standard desktop layout |
| 350-450px | Sidebar | Compact buttons (60px) |
| < 350px | Ultra-narrow | Mini buttons (50px), hide extras |

---

## 💻 Test Sidebar Mode

### Quick Test in Browser:
```javascript
// DevTools Console
window.resizeTo(400, 800);
```

### Check if in Sidebar:
```javascript
App.managers.sidebar.isSidebar()
// Returns: true/false

App.managers.sidebar.getSidebarStatus()
// Returns: { isSidebarMode, displayMode, viewportWidth, viewportHeight }
```

### Force Sidebar Mode (Testing):
```javascript
document.body.setAttribute('data-sidebar-mode', 'true');
```

---

## 🎨 CSS Media Queries Added

```css
/* Sidebar mode detection */
@media (max-width: 450px) and (display-mode: standalone) {
  /* Compact UI */
}

/* Ultra-narrow */
@media (max-width: 350px) and (display-mode: standalone) {
  /* Mini UI */
}

/* Window controls overlay */
@media (display-mode: window-controls-overlay) {
  /* Titlebar customization */
}
```

---

## 🛠️ Manifest.json Key Changes

```json
{
  "display_override": [
    "window-controls-overlay",
    "standalone", 
    "minimal-ui"
  ],
  "edge_side_panel": {
    "preferred_width": 400
  },
  "orientation": "any"
}
```

---

## 📊 Display Modes Hierarchy

1. **window-controls-overlay** (Best for sidebar)
2. **standalone** (Standard PWA)
3. **minimal-ui** (Fallback with minimal browser UI)
4. **browser** (Regular web page)

---

## 🎯 Automatic Optimizations

When sidebar detected, app automatically:

✅ Reduces button sizes  
✅ Stacks buttons vertically  
✅ Compacts header  
✅ Limits visible sessions (max 3)  
✅ Hides decorative elements  
✅ Enables horizontal scroll for tabs  

---

## 🐛 Debug Commands

```javascript
// Check all display modes
['window-controls-overlay', 'standalone', 'minimal-ui', 'fullscreen', 'browser']
  .forEach(m => console.log(m, window.matchMedia(`(display-mode: ${m})`).matches));

// Get layout config
App.managers.sidebar.getLayoutConfig()

// Listen for mode changes
window.addEventListener('sidebarmodechange', (e) => {
  console.log('Sidebar mode changed:', e.detail);
});
```

---

## ⚡ Performance Tips

1. **Lazy load** non-critical features
2. **Debounce resize** (already implemented)
3. **Cache API calls** - important in narrow view
4. **Minimize DOM** updates during resize

---

## 🎨 CSS Helper Classes

```html
<!-- Hide in sidebar -->
<div class="sidebar-hidden">Hidden in sidebar mode</div>

<!-- Show only in sidebar -->
<div class="sidebar-only">Only visible in sidebar</div>

<!-- Desktop only -->
<div class="desktop-only">Desktop view</div>
```

---

## 📱 Responsive Design Breakpoints

| Width | Target Device | Layout |
|-------|--------------|--------|
| < 350px | Ultra-narrow sidebar | Minimal UI |
| 350-450px | Standard sidebar | Compact UI |
| 450-768px | Mobile portrait | Touch-optimized |
| 768-1024px | Tablet | Enhanced features |
| > 1024px | Desktop | Full features |

---

## 🔔 Events

### Listen for sidebar mode changes:
```javascript
App.managers.sidebar.on('modechange', (event) => {
  const { isSidebarMode, displayMode, viewportWidth } = event.detail;
  // React to mode change
});
```

---

## ✅ Verification Checklist

- [ ] PWA installs successfully
- [ ] Sidebar option appears in Edge
- [ ] App opens in sidebar (300-450px)
- [ ] Dialpad buttons are appropriately sized
- [ ] Buttons stack vertically
- [ ] All functionality works in narrow view
- [ ] No horizontal scrolling issues
- [ ] Theme works correctly
- [ ] Calls can be made/received
- [ ] Settings are accessible

---

## 🆘 Troubleshooting

**Problem**: Sidebar option not showing in Edge  
**Solution**: Ensure PWA is fully installed, check manifest.json

**Problem**: UI looks broken in sidebar  
**Solution**: Clear cache, check CSS media queries loaded

**Problem**: Too narrow to use  
**Solution**: Check `edge_side_panel.preferred_width` in manifest

**Problem**: Sidebar mode not detected  
**Solution**: Check `App.managers.sidebar` exists, verify display mode

---

## 📚 Learn More

- **Full Guide**: `SIDEBAR_IMPLEMENTATION.md`
- **Manifest Spec**: [W3C Web App Manifest](https://www.w3.org/TR/appmanifest/)
- **Edge PWAs**: [Microsoft Edge PWA Docs](https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/)
- **Chrome Extensions**: [Side Panel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)

---

**Version**: 1.0.0  
**Last Updated**: November 2025  
**Status**: ✅ Production Ready
