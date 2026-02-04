const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, '..', 'public', '_redirects');
const dest = path.join(__dirname, '..', 'dist', '_redirects');
if (fs.existsSync(src)) {
  fs.copyFileSync(src, dest);
  console.log('Copied public/_redirects to dist/_redirects');
}
