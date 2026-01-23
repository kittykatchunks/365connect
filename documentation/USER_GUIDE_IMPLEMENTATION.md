# 365 Connect User Guide System

## Overview
The 365 Connect user guide is a comprehensive, web-based documentation system that provides users with detailed instructions, troubleshooting tips, and feature references. The guide is designed following modern documentation best practices with a focus on ease of navigation, searchability, and maintainability.

## Features

### 🎨 Modern Design
- **Responsive Layout**: Works seamlessly on desktop, tablet, and mobile devices
- **Dark/Light Mode**: Automatic theme detection with manual toggle support
- **Clean Navigation**: Sidebar navigation with collapsible sections
- **Visual Hierarchy**: Clear typography and spacing for easy reading

### 🔍 Search Functionality
- **Real-time Search**: Instant search results as you type
- **Content Indexing**: Searches through all sections and content
- **Quick Navigation**: Click search results to jump directly to sections
- **Keyboard Friendly**: Accessible via keyboard shortcuts

### 📱 Progressive Web App Ready
- **Offline Access**: Can be cached for offline viewing
- **Fast Loading**: Optimized single-page HTML for quick access
- **Responsive**: Adapts to any screen size

### 🎯 User-Centric Features
- **Quick Links**: Fast access to common topics on the homepage
- **Feature Index**: Comprehensive table of all features and their locations
- **Screenshot Placeholders**: Marked locations for adding visual guides
- **Info Boxes**: Highlighted tips, warnings, and important information
- **Smooth Scrolling**: Enhanced navigation experience

## File Structure

```
public/
└── userguide/
    └── index.html          # Complete self-contained user guide
```

## Accessing the User Guide

### From the Application
1. Open **Settings** tab
2. Click the **Book icon** (📖) in the header (positioned before the Import/Export icon)
3. User guide opens in a new browser window

### Direct Access
Navigate to: `https://your-domain.com/userguide/index.html`

## Screenshot Placeholders

Throughout the guide, you'll find screenshot placeholders marked like this:

```html
<div class="screenshot">
    <svg class="screenshot-icon">...</svg>
    <div class="screenshot-label">Screenshot: Description of what goes here</div>
</div>
```

### Adding Screenshots
1. Take a screenshot of the relevant feature/interface
2. Save it in `public/userguide/images/` with a descriptive name (e.g., `settings-connection-form.png`)
3. Replace the placeholder with:
```html
<img src="images/settings-connection-form.png" 
     alt="Connection settings form" 
     style="max-width: 100%; border-radius: 8px; box-shadow: var(--shadow-lg);">
```

## Content Sections

The user guide is organized into the following major sections:

### 1. Getting Started
- **Overview**: Introduction and quick links
- **Installation**: PWA installation instructions for desktop and mobile
- **First Setup**: Connection configuration walkthrough
- **Quick Start**: Common tasks for new users

### 2. Core Features
- **Making Calls**: Outbound, inbound, and call controls
- **Contacts Management**: Adding, editing, and organizing contacts
- **Call History**: Viewing and managing call records
- **Voicemail**: Accessing voicemail (placeholder for future content)
- **BLF Monitoring**: Extension monitoring (placeholder)
- **Company Numbers**: Company directory (placeholder)
- **Queue Monitor**: Call queue monitoring (placeholder)

### 3. Settings
- **Connection Settings**: Phantom ID and SIP configuration
- **Interface Settings**: Theme, language, and display options
- **Audio Settings**: Device selection and testing
- **Call Settings**: Call behavior preferences
- **Busylight Settings**: Hardware integration
- **Advanced Settings**: Logging and data management

### 4. Troubleshooting
- **Common Issues**: Registration, audio, and connection problems
- **Audio Problems**: Microphone and speaker troubleshooting
- **Connection Problems**: Network and firewall issues
- **Verbose Logging**: Enabling debugging for support

### 5. Reference
- **Keyboard Shortcuts**: Quick reference (placeholder)
- **Feature Index**: Complete feature location table
- **Glossary**: Terms and definitions (placeholder)
- **Support & Feedback**: Contact information and requirements

## Updating the User Guide

### Best Practices for Updates

1. **Keep Content Synchronized**
   - Update guide whenever UI features change
   - Add new sections when features are added
   - Remove or update deprecated features

2. **Maintain Search Index**
   - Update the `searchData` array in the JavaScript section when adding new sections
   - Include relevant keywords for each section

3. **Consistent Formatting**
   - Use existing heading hierarchy (h1 > h2 > h3 > h4)
   - Apply info boxes for tips and warnings
   - Use tables for structured data
   - Add screenshots for visual features

4. **Accessibility**
   - Include descriptive alt text for all images
   - Maintain semantic HTML structure
   - Ensure keyboard navigation works
   - Test with screen readers

### Adding New Sections

To add a new section to the user guide:

1. **Add to Sidebar Navigation** (around line 520):
```html
<li><a href="#new-section" class="sidebar-link">New Feature</a></li>
```

2. **Add Content Section** (in main content area):
```html
<section id="new-section">
    <h2>New Feature Title</h2>
    <p>Description and instructions...</p>
    <!-- Add screenshots, tables, lists, etc. -->
</section>
```

3. **Update Search Index** (in JavaScript section):
```javascript
const searchData = [
    // ... existing entries
    { 
        title: 'New Feature', 
        section: 'new-section', 
        content: 'keywords describing the feature' 
    }
];
```

4. **Update Feature Index Table** (if applicable):
```html
<tr>
    <td>New Feature</td>
    <td>Location in App</td>
    <td>Brief description</td>
</tr>
```

## Dynamic Updates Strategy

While the current implementation is static HTML, here's how to implement dynamic updates:

### Option 1: Template-Based Generation
Use a build script to generate the user guide from Markdown files:

```javascript
// scripts/build-userguide.js
// Read markdown files
// Parse and convert to HTML sections
// Inject into template
// Output to public/userguide/index.html
```

### Option 2: API-Driven Content
Fetch content dynamically from a CMS or API:

```javascript
// In user guide HTML
async function loadContent() {
    const content = await fetch('/api/userguide/content');
    renderSections(content);
}
```

### Option 3: Component-Based (React)
Create a React-based documentation system:

```typescript
// src/components/userguide/UserGuide.tsx
// Use existing components and styling
// Add to routing system
// Open in new tab or modal
```

### Option 4: Automated Screenshot Generation
Use Playwright or Puppeteer to automatically capture screenshots:

```javascript
// scripts/generate-screenshots.js
// Navigate to each feature
// Capture screenshot
// Save to public/userguide/images/
// Update HTML references
```

## Internationalization (i18n) Support

### Current Implementation
The user guide button is internationalized in the main application:

**Translation Keys Added:**
- `settings.user_guide`: "User Guide" (button label)
- `settings.user_guide_title`: "Open User Guide" (tooltip)

**Languages Supported:**
- English (en)
- Spanish - Spain (es)
- Spanish - Latin America (es-419)
- French - France (fr)
- French - Canada (fr-CA)
- Dutch (nl)
- Portuguese - Portugal (pt)
- Portuguese - Brazil (pt-BR)

### Future i18n Implementation

To create multilingual user guides:

1. **Create Language-Specific Guides**:
```
public/userguide/
├── index.html          (English - default)
├── es/
│   └── index.html      (Spanish)
├── fr/
│   └── index.html      (French)
└── pt/
    └── index.html      (Portuguese)
```

2. **Language Detection in Settings**:
```typescript
// Update SettingsView.tsx button
const currentLang = settings.interface.language;
const guideUrl = `/userguide/${currentLang === 'en' ? '' : currentLang + '/'}index.html`;
window.open(guideUrl, '_blank', 'noopener,noreferrer');
```

3. **Translation Workflow**:
   - Export content to translation-friendly format (JSON/YAML)
   - Send to translation service
   - Import translated content
   - Build language-specific HTML files

## Maintenance Checklist

### Monthly Review
- [ ] Check for broken links
- [ ] Verify all screenshots are current
- [ ] Test search functionality
- [ ] Review and update troubleshooting section
- [ ] Check mobile responsiveness

### After Major Updates
- [ ] Update relevant sections
- [ ] Add/update screenshots
- [ ] Test all examples and instructions
- [ ] Update feature index
- [ ] Verify keyboard shortcuts (if added)

### Quarterly Tasks
- [ ] Review analytics (if implemented)
- [ ] Gather user feedback
- [ ] Update common issues based on support tickets
- [ ] Optimize search keywords
- [ ] Check accessibility compliance

## Technical Details

### Browser Compatibility
- Chrome 70+
- Edge 79+
- Safari 14+
- Firefox 70+
- Mobile browsers (iOS Safari, Chrome Mobile)

### Performance
- Single HTML file: ~80KB (uncompressed)
- No external dependencies
- Loads in <100ms on standard connections
- Fully cacheable for offline use

### Accessibility Features
- Semantic HTML5 structure
- ARIA labels (where applicable)
- Keyboard navigation support
- High contrast mode compatible
- Screen reader friendly

## Support and Contributions

### Reporting Issues
If you find errors or outdated information in the user guide:
1. Note the section ID and description
2. Provide suggested corrections
3. Include screenshots if relevant

### Suggesting Improvements
Consider these aspects when suggesting improvements:
- Clarity of instructions
- Missing topics or features
- Better organization
- Visual aids needed
- Search functionality enhancements

## Future Enhancements

### Planned Features
- [ ] Video tutorials embedded
- [ ] Interactive demos
- [ ] Keyboard shortcut reference
- [ ] Glossary with definitions
- [ ] Version-specific documentation
- [ ] Print-friendly CSS
- [ ] PDF export functionality
- [ ] User feedback mechanism
- [ ] Analytics integration
- [ ] Automated screenshot updates

### Advanced Features to Consider
- [ ] AI-powered search
- [ ] Context-sensitive help
- [ ] In-app tutorial overlays
- [ ] Community contributions
- [ ] Multi-version support
- [ ] A/B testing for content
- [ ] Usage tracking (privacy-compliant)

## License and Attribution

This user guide is part of the 365 Connect application. 
Design patterns inspired by modern documentation systems like Docusaurus and Docsify.

---

**Last Updated**: January 2026  
**Maintained By**: 365 Connect Development Team  
**Version**: 1.0.0
