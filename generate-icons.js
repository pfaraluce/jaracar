// Script to generate PWA icons from existing favicon
const fs = require('fs');
const path = require('path');

// For now, we'll copy the existing PNG favicon as a placeholder
// In production, you should use proper icon generation tools or provide custom icons

const publicDir = path.join(__dirname, 'public');
const faviconPath = path.join(publicDir, 'quango-favicon-black.png');

// Check if favicon exists
if (!fs.existsSync(faviconPath)) {
    console.error('Error: quango-favicon-black.png not found in public directory');
    process.exit(1);
}

// Copy favicon as placeholder icons (these should be replaced with proper sized icons)
const iconSizes = [
    { size: '192', name: 'icon-192.png' },
    { size: '512', name: 'icon-512.png' },
    { size: '180', name: 'apple-touch-icon.png' }
];

iconSizes.forEach(({ name }) => {
    const targetPath = path.join(publicDir, name);
    if (!fs.existsSync(targetPath)) {
        fs.copyFileSync(faviconPath, targetPath);
        console.log(`✓ Created ${name} (placeholder - should be replaced with proper ${name.match(/\d+/)[0]}x${name.match(/\d+/)[0]} icon)`);
    } else {
        console.log(`✓ ${name} already exists`);
    }
});

console.log('\n⚠️  IMPORTANT: The generated icons are placeholders.');
console.log('For production, please provide properly sized icons:');
console.log('  - icon-192.png (192x192px)');
console.log('  - icon-512.png (512x512px)');
console.log('  - apple-touch-icon.png (180x180px)');
console.log('\nYou can use tools like:');
console.log('  - https://realfavicongenerator.net/');
console.log('  - https://www.pwabuilder.com/imageGenerator');
