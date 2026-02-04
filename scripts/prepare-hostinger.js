/**
 * Hostinger Deployment Preparation Script
 * 
 * This script creates a flat, Hostinger-ready folder structure
 * from the Expo web build output.
 * 
 * Run after: npx expo export --platform web
 * Usage: npm run prepare:hostinger
 */

const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, 'dist');
const OUTPUT_DIR = path.join(__dirname, 'hostinger-ready');
const PUBLIC_DIR = path.join(__dirname, 'public');
const ASSETS_DIR = path.join(__dirname, 'assets');

console.log('🚀 Preparing Hostinger deployment...\n');

// Check if dist folder exists
if (!fs.existsSync(DIST_DIR)) {
  console.error('❌ ERROR: dist/ folder not found!');
  console.error('   Run "npx expo export --platform web" first.\n');
  process.exit(1);
}

// Create output directory
if (fs.existsSync(OUTPUT_DIR)) {
  fs.rmSync(OUTPUT_DIR, { recursive: true });
}
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Copy dist contents to output (this includes index.html at root)
function copyRecursive(src, dest) {
  if (fs.statSync(src).isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(file => {
      copyRecursive(path.join(src, file), path.join(dest, file));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

console.log('📁 Copying dist/ contents...');
copyRecursive(DIST_DIR, OUTPUT_DIR);

// Copy PWA assets from public/
console.log('📁 Copying PWA assets...');
const pwaFiles = ['manifest.json', 'sw.js', 'haptic-styles.css', '.htaccess'];
pwaFiles.forEach(file => {
  const src = path.join(PUBLIC_DIR, file);
  const dest = path.join(OUTPUT_DIR, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`   ✓ ${file}`);
  } else {
    console.log(`   ⚠ ${file} not found`);
  }
});

// Copy icons
console.log('📁 Copying icons...');
const iconsDir = path.join(PUBLIC_DIR, 'icons');
const iconsOutputDir = path.join(OUTPUT_DIR, 'icons');
if (fs.existsSync(iconsDir)) {
  copyRecursive(iconsDir, iconsOutputDir);
  const iconCount = fs.readdirSync(iconsOutputDir).filter(f => f.endsWith('.png')).length;
  console.log(`   ✓ ${iconCount} icons copied`);
}

// Copy background image to assets
console.log('📁 Copying background image...');
const bgSrc = path.join(ASSETS_DIR, 'images', 'background.webp');
const bgDest = path.join(OUTPUT_DIR, 'assets', 'images', 'background.webp');
if (fs.existsSync(bgSrc)) {
  fs.mkdirSync(path.dirname(bgDest), { recursive: true });
  fs.copyFileSync(bgSrc, bgDest);
  console.log('   ✓ background.webp');
}

// Verify index.html is at root
const indexPath = path.join(OUTPUT_DIR, 'index.html');
if (fs.existsSync(indexPath)) {
  console.log('\n✅ index.html is at ROOT level');
} else {
  console.log('\n❌ WARNING: index.html not found at root!');
}

// List output structure
console.log('\n📂 Hostinger-ready folder structure:');
console.log('─'.repeat(40));
function listDir(dir, prefix = '') {
  const items = fs.readdirSync(dir).sort();
  items.forEach((item, index) => {
    const fullPath = path.join(dir, item);
    const isLast = index === items.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    
    if (fs.statSync(fullPath).isDirectory()) {
      console.log(`${prefix}${connector}${item}/`);
      if (item !== '_expo' && item !== 'node_modules') {
        listDir(fullPath, prefix + (isLast ? '    ' : '│   '));
      }
    } else {
      console.log(`${prefix}${connector}${item}`);
    }
  });
}
listDir(OUTPUT_DIR);

console.log('\n' + '─'.repeat(40));
console.log('✅ READY! Upload the contents of hostinger-ready/ to public_html');
console.log('─'.repeat(40));
