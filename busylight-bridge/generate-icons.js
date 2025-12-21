// generate-icons.js
// Run this script to generate tray icons: node generate-icons.js
// Requires: npm install canvas png-to-ico

const fs = require('fs');
const path = require('path');

// Simple SVG-based icon generator
// These can be converted to ICO using online tools or the png-to-ico package

const icons = {
    'icon-default': '#4a90d9',      // Blue - default/idle
    'icon-connected': '#00cc00',    // Green - connected
    'icon-disconnected': '#888888', // Gray - disconnected
    'icon-busy': '#ff0000',         // Red - busy/on call
    'icon-ringing': '#ff0000',      // Red - ringing
    'icon-error': '#ff6600'         // Orange - error
};

const size = 256; // Generate larger icons, they'll be scaled down

function createSvgIcon(color, hasRing = false) {
    const ringStroke = hasRing ? `<circle cx="${size/2}" cy="${size/2}" r="${size/2 - 8}" fill="none" stroke="${color}" stroke-width="8" stroke-dasharray="20 10"/>` : '';
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${lightenColor(color, 30)};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${color};stop-opacity:1" />
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.3"/>
        </filter>
    </defs>
    <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 20}" fill="url(#grad)" filter="url(#shadow)"/>
    <circle cx="${size/2 - 30}" cy="${size/2 - 30}" r="30" fill="white" opacity="0.3"/>
    ${ringStroke}
</svg>`;
}

function lightenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

// Create assets directory if it doesn't exist
const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir);
}

// Generate SVG icons
for (const [name, color] of Object.entries(icons)) {
    const svg = createSvgIcon(color, name === 'icon-ringing');
    fs.writeFileSync(path.join(assetsDir, `${name}.svg`), svg);
    console.log(`Created ${name}.svg`);
}

// Also create a simple main icon
const mainIcon = createSvgIcon('#4a90d9');
fs.writeFileSync(path.join(assetsDir, 'icon.svg'), mainIcon);
console.log('Created icon.svg');

console.log('\nSVG icons created in assets/ folder');
console.log('To create PNG/ICO files, you can:');
console.log('1. Use an online converter like https://cloudconvert.com/svg-to-ico');
console.log('2. Use Inkscape: inkscape icon.svg --export-filename=icon.png -w 256 -h 256');
console.log('3. Use ImageMagick: convert icon.svg icon.ico');
console.log('\nFor Windows tray icons, 16x16 and 32x32 PNG files work best.');
