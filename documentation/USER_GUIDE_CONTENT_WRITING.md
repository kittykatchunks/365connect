# User Guide Content Writing Guide

## For Content Writers & Documentation Maintainers

This guide helps you update and maintain the 365 Connect user guide content effectively.

## File Location
📁 `public/userguide/index.html` - The complete user guide in a single HTML file

## Quick Edit Guide

### 1. Adding Text Content

Find the section you want to edit using the section ID:

```html
<section id="section-name">
    <h2>Section Title</h2>
    <p>Your content here...</p>
</section>
```

**Common Section IDs:**
- `overview` - Homepage/introduction
- `installation` - Installation instructions
- `first-setup` - Initial configuration
- `making-calls` - Call functionality
- `contacts` - Contact management
- `call-history` - Activity/history
- `connection-settings` - Connection configuration
- `audio-settings` - Audio device setup
- `common-issues` - Troubleshooting

### 2. Formatting Your Content

#### Paragraphs
```html
<p>Regular paragraph text goes here.</p>
```

#### Headings
```html
<h2>Main Section Heading</h2>
<h3>Subsection Heading</h3>
<h4>Minor Heading</h4>
```

#### Numbered Lists (Steps)
```html
<ol>
    <li>First step</li>
    <li>Second step</li>
    <li>Third step</li>
</ol>
```

#### Bullet Lists (Features/Options)
```html
<ul>
    <li>First item</li>
    <li>Second item</li>
    <li>Third item</li>
</ul>
```

#### Bold Text (Important Terms)
```html
<strong>Important Term</strong>
```

#### Code/Technical Terms
```html
Use <code>technical terms</code> for settings, file names, or code.
```

### 3. Adding Visual Elements

#### Info Box (Tips & Helpful Information)
```html
<div class="info-box">
    <div class="info-box-title">💡 Tip</div>
    <p>Your helpful tip goes here.</p>
</div>
```

#### Warning Box (Important Warnings)
```html
<div class="warning-box">
    <div class="warning-box-title">⚠️ Important</div>
    <p>Your warning message here.</p>
</div>
```

#### Screenshot Placeholder
```html
<div class="screenshot">
    <svg class="screenshot-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
    </svg>
    <div class="screenshot-label">Screenshot: Describe what should be shown</div>
</div>
```

#### Tables (Feature Lists, Comparisons)
```html
<table>
    <thead>
        <tr>
            <th>Column 1</th>
            <th>Column 2</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>Data 1</td>
            <td>Data 2</td>
        </tr>
    </tbody>
</table>
```

### 4. Adding a New Section

**Step 1: Add to Navigation Sidebar** (around line 520)
```html
<li><a href="#new-section" class="sidebar-link">New Section Name</a></li>
```

**Step 2: Add Content Section** (in main content area)
```html
<section id="new-section">
    <h2>New Section Title</h2>
    <p>Introduction paragraph...</p>
    
    <h3>Subsection</h3>
    <p>More detailed content...</p>
    
    <!-- Add screenshots, lists, tables as needed -->
</section>
```

**Step 3: Update Search Index** (in JavaScript section, around line 1000)
```javascript
const searchData = [
    // ... existing entries
    { 
        title: 'New Section Name', 
        section: 'new-section', 
        content: 'keywords that describe this section feature topic' 
    }
];
```

### 5. Working with Screenshots

#### Creating Screenshot Folders
1. Create directory: `public/userguide/images/`
2. Save screenshots with descriptive names:
   - `settings-connection-form.png`
   - `phone-dialpad.png`
   - `incoming-call-notification.png`

#### Recommended Screenshot Settings
- **Format**: PNG for UI screenshots
- **Size**: Max width 1200px (they'll resize automatically)
- **Quality**: High quality, but optimized for web
- **Background**: Include relevant context, not just the isolated feature

#### Replacing Placeholders with Images
Find the placeholder:
```html
<div class="screenshot">
    <svg class="screenshot-icon">...</svg>
    <div class="screenshot-label">Screenshot: Connection settings form</div>
</div>
```

Replace with:
```html
<img src="images/settings-connection-form.png" 
     alt="Connection settings form showing Phantom ID, username, and password fields" 
     style="max-width: 100%; border-radius: 8px; box-shadow: var(--shadow-lg);">
```

### 6. Writing Style Guidelines

#### Use Clear, Simple Language
❌ **Don't say:** "Navigate to the settings interface and locate the connection configuration parameters."
✅ **Do say:** "Go to Settings and find the Connection section."

#### Write in Second Person
❌ **Don't say:** "Users should click the button."
✅ **Do say:** "Click the button."

#### Use Active Voice
❌ **Don't say:** "The call can be placed by clicking..."
✅ **Do say:** "Click to place the call..."

#### Break Down Complex Tasks
❌ **Don't say:** "To configure audio, select devices from dropdowns in settings."
✅ **Do say:**
1. Open Settings
2. Click Audio
3. Select your microphone from the dropdown
4. Select your speaker from the dropdown

#### Be Consistent with Terms
Always use the same term for the same thing:
- "Phone tab" (not "dialer", "phone panel", etc.)
- "Settings tab" (not "preferences", "configuration")
- "Phantom ID" (exactly this capitalization)
- "BLF Buttons" (not "BLF keys", "line keys")

### 7. Common Content Templates

#### Feature Introduction
```html
<section id="feature-name">
    <h2>Feature Name</h2>
    <p>Brief introduction explaining what this feature does and why it's useful.</p>
    
    <h3>How to Use [Feature]</h3>
    <ol>
        <li>First step</li>
        <li>Second step</li>
        <li>Third step</li>
    </ol>
    
    <div class="screenshot">
        <!-- Screenshot placeholder -->
    </div>
    
    <div class="info-box">
        <div class="info-box-title">💡 Tip</div>
        <p>Helpful tip about this feature.</p>
    </div>
</section>
```

#### Troubleshooting Section
```html
<h3>Problem: [Issue Description]</h3>
<p><strong>Possible causes:</strong></p>
<ul>
    <li>Cause 1</li>
    <li>Cause 2</li>
    <li>Cause 3</li>
</ul>

<p><strong>Solutions:</strong></p>
<ol>
    <li>Try this first</li>
    <li>If that doesn't work, try this</li>
    <li>Finally, try this</li>
</ol>
```

#### Settings Section
```html
<section id="setting-name">
    <h2>Setting Name</h2>
    <p>What this setting controls and why you might want to change it.</p>
    
    <h3>Accessing [Setting]</h3>
    <ol>
        <li>Open <strong>Settings</strong></li>
        <li>Click <strong>[Section Name]</strong></li>
        <li>Find the <strong>[Setting Name]</strong> option</li>
    </ol>
    
    <h3>Available Options</h3>
    <table>
        <thead>
            <tr>
                <th>Option</th>
                <th>Description</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Option 1</td>
                <td>What this option does</td>
            </tr>
        </tbody>
    </table>
</section>
```

### 8. Content Checklist

Before publishing your changes:

#### Accuracy
- [ ] All steps tested and verified
- [ ] Screenshots match current UI
- [ ] Links work correctly
- [ ] Technical terms are correct

#### Completeness
- [ ] Section has introduction
- [ ] Step-by-step instructions provided
- [ ] Screenshots added (or placeholders noted)
- [ ] Tips/warnings included where needed

#### Consistency
- [ ] Terminology matches existing content
- [ ] Formatting matches other sections
- [ ] Headings follow hierarchy
- [ ] Navigation updated

#### Quality
- [ ] No spelling errors
- [ ] Grammar is correct
- [ ] Sentences are clear
- [ ] Instructions are easy to follow

### 9. Testing Your Changes

#### Browser Testing
1. Open the user guide in Chrome, Firefox, Safari
2. Test on mobile device (or browser dev tools)
3. Try dark mode and light mode
4. Test the search function for your new content

#### Navigation Testing
1. Click sidebar links to verify they jump to correct sections
2. Ensure smooth scrolling works
3. Check that active section highlights properly

#### Content Testing
1. Follow your instructions step-by-step
2. Ask someone else to follow them
3. Make sure screenshots match instructions
4. Verify all links open correctly

### 10. Quick Reference

#### Common Section IDs in Navigation
```
#overview
#installation
#first-setup
#quick-start
#making-calls
  #outbound-calls
  #receiving-calls
  #call-controls
#contacts
#call-history
#voicemail
#blf-monitoring
#company-numbers
#queue-monitor
#connection-settings
#interface-settings
#audio-settings
#call-settings
#busylight-settings
#advanced-settings
#common-issues
#audio-problems
#connection-problems
#verbose-logging
#keyboard-shortcuts
#feature-index
#glossary
#support
```

#### Emoji Quick Reference
Use these for info boxes and sections:
- 💡 Tips and helpful information
- ⚠️ Warnings and important notes
- ✅ Completed items or success
- ❌ Errors or what not to do
- 📧 Contact information
- 🎉 New features or highlights
- 🔍 Search-related content
- 📱 Mobile-specific information
- 🖥️ Desktop-specific information
- 🎨 Interface and design topics

### 11. Getting Help

#### HTML Basics
If you're not familiar with HTML:
1. Copy existing sections as templates
2. Change only the text content
3. Leave the HTML tags unchanged
4. Ask for help if something breaks

#### Common Mistakes to Avoid
- ❌ Don't remove `<section id="...">` tags (needed for navigation)
- ❌ Don't change class names (needed for styling)
- ❌ Don't remove the `<script>` section at bottom
- ❌ Don't forget to close tags (`</section>`, `</div>`, etc.)

#### Where to Ask Questions
- Check `documentation/USER_GUIDE_IMPLEMENTATION.md` for technical details
- Review existing sections for examples
- Ask developers for HTML help
- Test in browser frequently to catch errors early

---

## Summary

**To update content:**
1. Find the section by ID
2. Edit the text
3. Add screenshots
4. Update search index
5. Test in browser

**To add new section:**
1. Add to sidebar navigation
2. Create section with content
3. Add to search index
4. Test navigation and search

**Follow these principles:**
- Keep it simple and clear
- Use consistent terminology
- Include screenshots
- Break down complex tasks
- Test everything

Happy writing! 📝
