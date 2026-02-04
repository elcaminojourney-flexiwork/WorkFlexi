// metro.config.js - FlexiWork Web Configuration
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable web support
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];

// Asset extensions
config.resolver.assetExts = [
  ...config.resolver.assetExts.filter(ext => ext !== 'svg'),
  'db',
  'ttf',
  'otf',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'ico',
];

// Web-specific settings
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    keep_classnames: true,
    keep_fnames: true,
    mangle: {
      keep_classnames: true,
      keep_fnames: true,
    },
  },
};

module.exports = config;
