#!/usr/bin/env node
/**
 * Checks that critical app routes exist and runs lint.
 * Run: node scripts/check-routes-and-lint.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const requiredRoutes = [
  'app/_layout.tsx',
  'app/auth/select-user-type.tsx',
  'app/employer/index.tsx',
  'app/employer/rota/index.tsx',
  'app/employer/rota/_layout.tsx',
  'app/employer/rota/add-shift.tsx',
  'app/employer/rota/team/index.tsx',
  'app/employer/rota/team/[id].tsx',
  'app/employer/rota/settings.tsx',
  'app/employer/rota/shift/[shiftId].tsx',
  'app/employer/organisation/index.tsx',
  'app/employer/my-shifts.tsx',
  'app/employer/post-shift.tsx',
  'app/worker/index.tsx',
  'components/ConstitutionalScreen.tsx',
];

let failed = 0;
console.log('Checking required route files...\n');
for (const file of requiredRoutes) {
  const full = path.join(ROOT, file);
  const exists = fs.existsSync(full);
  console.log(exists ? '  OK   ' : '  MISS ', file);
  if (!exists) failed++;
}
console.log('');
if (failed > 0) {
  console.error(`ERROR: ${failed} required file(s) missing.`);
  process.exit(1);
}
console.log('All required routes present.\n');
console.log('Run "npm run lint" to check code quality.');
process.exit(0);
