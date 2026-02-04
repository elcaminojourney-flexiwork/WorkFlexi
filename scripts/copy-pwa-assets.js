/**
 * Copy PWA assets to web-build directory after Expo build
 * This ensures manifest.json, sw.js, and icons are in the correct location
 */

const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '../public');
const buildDir = path.join(__dirname, '../web-build');

function copyRecursive(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursive(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

function copyPwaAssets() {
  console.log('📦 Copying PWA assets to web-build...');
  
  if (!fs.existsSync(sourceDir)) {
    console.error('❌ Source directory not found:', sourceDir);
    process.exit(1);
  }

  if (!fs.existsSync(buildDir)) {
    console.log('⚠️  web-build directory not found. Run "npm run web:build" first.');
    process.exit(1);
  }

  // Copy manifest.json
  const manifestSrc = path.join(sourceDir, 'manifest.json');
  const manifestDest = path.join(buildDir, 'manifest.json');
  if (fs.existsSync(manifestSrc)) {
    fs.copyFileSync(manifestSrc, manifestDest);
    console.log('✅ Copied manifest.json');
  }

  // Copy service worker
  const swSrc = path.join(sourceDir, 'sw.js');
  const swDest = path.join(buildDir, 'sw.js');
  if (fs.existsSync(swSrc)) {
    fs.copyFileSync(swSrc, swDest);
    console.log('✅ Copied sw.js');
  }

  // Copy icons directory
  const iconsSrc = path.join(sourceDir, 'icons');
  const iconsDest = path.join(buildDir, 'icons');
  if (fs.existsSync(iconsSrc)) {
    copyRecursive(iconsSrc, iconsDest);
    console.log('✅ Copied icons directory');
  } else {
    console.log('⚠️  Icons directory not found. Run "npm run generate:icons" first.');
  }

  // Copy haptic styles
  const stylesSrc = path.join(sourceDir, 'haptic-styles.css');
  const stylesDest = path.join(buildDir, 'haptic-styles.css');
  if (fs.existsSync(stylesSrc)) {
    fs.copyFileSync(stylesSrc, stylesDest);
    console.log('✅ Copied haptic-styles.css');
  }

  // Copy .htaccess if exists
  const htaccessSrc = path.join(sourceDir, '.htaccess');
  const htaccessDest = path.join(buildDir, '.htaccess');
  if (fs.existsSync(htaccessSrc)) {
    fs.copyFileSync(htaccessSrc, htaccessDest);
    console.log('✅ Copied .htaccess');
  }

  console.log('✨ PWA assets copied successfully!');
}

copyPwaAssets();
