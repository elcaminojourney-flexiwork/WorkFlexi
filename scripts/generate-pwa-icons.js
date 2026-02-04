/**
 * Generate PWA icons from source icon
 * This script uses sharp (if available) or provides instructions for manual generation
 */

const fs = require('fs');
const path = require('path');

const sourceIcon = path.join(__dirname, '../assets/images/icon.png');
const outputDir = path.join(__dirname, '../public/icons');

// Required icon sizes for PWA
const iconSizes = [
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 16, name: 'favicon-16x16.png' },
];

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('⚠️  Sharp not found. Install it with: npm install --save-dev sharp');
  console.log('📝 Manual icon generation instructions:');
  console.log('   1. Use an online tool like https://realfavicongenerator.net/');
  console.log('   2. Or use ImageMagick: convert icon.png -resize 192x192 icon-192x192.png');
  console.log('   3. Place all icons in public/icons/ directory');
  process.exit(0);
}

async function generateIcons() {
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Check if source icon exists
  if (!fs.existsSync(sourceIcon)) {
    console.error('❌ Source icon not found:', sourceIcon);
    console.log('💡 Please ensure assets/images/icon.png exists');
    process.exit(1);
  }

  console.log('🖼️  Generating PWA icons...');
  console.log(`   Source: ${sourceIcon}`);
  console.log(`   Output: ${outputDir}\n`);

  try {
    for (const { size, name } of iconSizes) {
      const outputPath = path.join(outputDir, name);
      
      await sharp(sourceIcon)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Generated ${name} (${size}x${size})`);
    }

    console.log('\n✨ All icons generated successfully!');
    console.log(`📁 Icons are in: ${outputDir}`);
  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
