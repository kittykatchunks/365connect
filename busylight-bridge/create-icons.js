// create-icons.js
// Creates proper PNG icons for the system tray
// Run: node create-icons.js

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/**
 * Creates a simple PNG file with a colored circle
 * This is a minimal PNG encoder - no external dependencies needed
 */
function createPNG(width, height, colorFn) {
    // PNG signature
    const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    
    // IHDR chunk
    const ihdr = createIHDRChunk(width, height);
    
    // IDAT chunk (image data)
    const idat = createIDATChunk(width, height, colorFn);
    
    // IEND chunk
    const iend = createIENDChunk();
    
    return Buffer.concat([signature, ihdr, idat, iend]);
}

function createChunk(type, data) {
    const typeBuffer = Buffer.from(type);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    
    const crcData = Buffer.concat([typeBuffer, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(crcData), 0);
    
    return Buffer.concat([length, typeBuffer, data, crc]);
}

function createIHDRChunk(width, height) {
    const data = Buffer.alloc(13);
    data.writeUInt32BE(width, 0);      // Width
    data.writeUInt32BE(height, 4);     // Height
    data.writeUInt8(8, 8);             // Bit depth
    data.writeUInt8(6, 9);             // Color type (RGBA)
    data.writeUInt8(0, 10);            // Compression method
    data.writeUInt8(0, 11);            // Filter method
    data.writeUInt8(0, 12);            // Interlace method
    
    return createChunk('IHDR', data);
}

function createIDATChunk(width, height, colorFn) {
    // Create raw pixel data with filter bytes
    const rawData = [];
    
    for (let y = 0; y < height; y++) {
        rawData.push(0); // Filter type: None
        for (let x = 0; x < width; x++) {
            const [r, g, b, a] = colorFn(x, y, width, height);
            rawData.push(r, g, b, a);
        }
    }
    
    const rawBuffer = Buffer.from(rawData);
    const compressed = zlib.deflateSync(rawBuffer, { level: 9 });
    
    return createChunk('IDAT', compressed);
}

function createIENDChunk() {
    return createChunk('IEND', Buffer.alloc(0));
}

// CRC32 implementation for PNG chunks
function crc32(buffer) {
    let crc = 0xFFFFFFFF;
    
    for (let i = 0; i < buffer.length; i++) {
        crc ^= buffer[i];
        for (let j = 0; j < 8; j++) {
            crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
        }
    }
    
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Create a filled circle icon
 */
function createCircleIcon(size, r, g, b) {
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 1;
    const innerRadius = radius - 1;
    
    return createPNG(size, size, (x, y, w, h) => {
        const dx = x - centerX + 0.5;
        const dy = y - centerY + 0.5;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist <= innerRadius) {
            // Inside the circle - solid color with slight gradient for depth
            const lightFactor = 1 + (centerY - y) / (size * 2);
            const rr = Math.min(255, Math.floor(r * lightFactor));
            const gg = Math.min(255, Math.floor(g * lightFactor));
            const bb = Math.min(255, Math.floor(b * lightFactor));
            return [rr, gg, bb, 255];
        } else if (dist <= radius) {
            // Anti-aliased edge
            const alpha = Math.max(0, Math.min(255, Math.floor((radius - dist) * 255)));
            return [r, g, b, alpha];
        } else {
            // Outside - transparent
            return [0, 0, 0, 0];
        }
    });
}

/**
 * Create a ring/outline icon (for ringing state)
 */
function createRingIcon(size, r, g, b) {
    const centerX = size / 2;
    const centerY = size / 2;
    const outerRadius = size / 2 - 1;
    const innerRadius = outerRadius - 2;
    
    return createPNG(size, size, (x, y, w, h) => {
        const dx = x - centerX + 0.5;
        const dy = y - centerY + 0.5;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Create a ring shape
        if (dist >= innerRadius && dist <= outerRadius) {
            const edgeDist = Math.min(dist - innerRadius, outerRadius - dist);
            const alpha = Math.min(255, Math.floor(edgeDist * 255));
            return [r, g, b, alpha];
        } else if (dist < innerRadius - 1) {
            // Inner filled circle (smaller)
            const smallRadius = innerRadius - 2;
            if (dist <= smallRadius) {
                return [r, g, b, 255];
            } else {
                const alpha = Math.max(0, Math.min(255, Math.floor((smallRadius + 1 - dist) * 255)));
                return [r, g, b, alpha];
            }
        }
        
        return [0, 0, 0, 0];
    });
}

// Icon definitions with RGB colors
const icons = {
    'icon-default':      { r: 74,  g: 144, b: 217, type: 'circle' },   // Blue
    'icon-connected':    { r: 0,   g: 200, b: 0,   type: 'circle' },   // Green
    'icon-disconnected': { r: 136, g: 136, b: 136, type: 'circle' },   // Gray
    'icon-busy':         { r: 220, g: 0,   b: 0,   type: 'circle' },   // Red
    'icon-ringing':      { r: 220, g: 0,   b: 0,   type: 'ring' },     // Red ring
    'icon-error':        { r: 255, g: 102, b: 0,   type: 'circle' }    // Orange
};

// Create assets directory if it doesn't exist
const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
}

// Generate icons at multiple sizes
for (const [name, config] of Object.entries(icons)) {
    // Create 16x16 for tray (primary)
    const png16 = config.type === 'ring' 
        ? createRingIcon(16, config.r, config.g, config.b)
        : createCircleIcon(16, config.r, config.g, config.b);
    
    fs.writeFileSync(path.join(assetsDir, `${name}.png`), png16);
    console.log(`Created ${name}.png (16x16)`);
    
    // Create 256x256 for ICO conversion
    const png256 = config.type === 'ring'
        ? createRingIcon(256, config.r, config.g, config.b)
        : createCircleIcon(256, config.r, config.g, config.b);
    
    fs.writeFileSync(path.join(assetsDir, `${name}-256.png`), png256);
    console.log(`Created ${name}-256.png (256x256)`);
}

// Also create main icon
const mainPng = createCircleIcon(16, 74, 144, 217);
fs.writeFileSync(path.join(assetsDir, 'icon.png'), mainPng);

const mainPng256 = createCircleIcon(256, 74, 144, 217);
fs.writeFileSync(path.join(assetsDir, 'icon-256.png'), mainPng256);

console.log('\n✓ PNG icons created in assets/ folder');
console.log('\nFor the Windows installer, convert icon-256.png to icon.ico:');
console.log('  - https://icoconvert.com/');
console.log('  - https://cloudconvert.com/png-to-ico');
console.log('  - Or use ImageMagick: convert icon-256.png icon.ico');
