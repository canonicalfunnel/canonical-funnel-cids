'use strict';

const fs = require('fs');
const path = require('path');

function main() {
  const scopeArg = process.argv[2];
  if (!scopeArg) {
    throw new Error('A scope argument is required, e.g. node scripts/scope-package.js canonical-funnel');
  }

  const normalizedScope = scopeArg.startsWith('@') ? scopeArg.slice(1) : scopeArg;
  const packagePath = path.resolve(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const baseName = packageJson.name.includes('/')
    ? packageJson.name.split('/').pop()
    : packageJson.name;

  packageJson.name = `@${normalizedScope}/${baseName}`;
  fs.writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
  console.log(`Scoped package name to ${packageJson.name}`);
}

main();
