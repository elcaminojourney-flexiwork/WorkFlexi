# PWA Icons

This directory contains the PWA icons required for installation and display.

## Required Icons

Generate all icons by running:

```bash
npm run generate:icons
```

This requires `sharp` to be installed:
```bash
npm install --save-dev sharp
```

## Icon Sizes

The following icons are required:

- `icon-72x72.png` - 72x72px
- `icon-96x96.png` - 96x96px
- `icon-128x128.png` - 128x128px
- `icon-144x144.png` - 144x144px
- `icon-152x152.png` - 152x152px (Windows)
- `icon-192x192.png` - 192x192px (Android)
- `icon-384x384.png` - 384x384px
- `icon-512x512.png` - 512x512px (Android)
- `apple-touch-icon.png` - 180x180px (iOS)
- `favicon-32x32.png` - 32x32px
- `favicon-16x16.png` - 16x16px

## Manual Generation

If `sharp` is not available, use an online tool:
- https://realfavicongenerator.net/
- https://www.pwabuilder.com/imageGenerator

Or use ImageMagick:
```bash
convert assets/images/icon.png -resize 192x192 public/icons/icon-192x192.png
```

## Source

Icons are generated from: `assets/images/icon.png`
