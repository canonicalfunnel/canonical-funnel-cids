'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');

function ensureCleanDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function copyDirectory(source, destination) {
  if (!fs.existsSync(source)) {
    return;
  }

  fs.mkdirSync(destination, { recursive: true });
  const entries = fs.readdirSync(source, { withFileTypes: true });

  entries.forEach((entry) => {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, destinationPath);
    } else if (entry.isFile()) {
      copyFile(sourcePath, destinationPath);
    }
  });
}

function hashFile(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function gatherFiles(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  const files = [];
  const queue = [directory];

  while (queue.length) {
    const current = queue.pop();
    const stats = fs.statSync(current);

    if (stats.isDirectory()) {
      fs.readdirSync(current).forEach((child) => {
        queue.push(path.join(current, child));
      });
    } else if (stats.isFile()) {
      files.push(current);
    }
  }

  return files;
}

function writeManifest(files) {
  const manifestPath = path.join(distDir, 'manifest.json');
  const manifest = {
    generatedAt: new Date().toISOString(),
    files: files.map((absolutePath) => ({
      path: path.relative(projectRoot, absolutePath),
      size: fs.statSync(absolutePath).size,
      sha256: hashFile(absolutePath),
    })),
  };

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifestPath;
}

function main() {
  ensureCleanDir(distDir);

  const directoriesToCopy = [
    'src',
    'api',
    'docs',
    'cfe_assets',
    'api-kit GraphQL Endpoint Public Rest',
  ];
  const filesToCopy = [
    'Canonical-Funnel-README.md',
    'Complete_Structure_Consolidated.json',
    'cfe_assets_summary.json',
    'cfe_assets_grouped_summary.json',
    'canonical-funnel-agent.json',
    'canonical-funnel-info.json',
  ];

  directoriesToCopy.forEach((dir) => {
    const source = path.join(projectRoot, dir);
    if (fs.existsSync(source)) {
      copyDirectory(source, path.join(distDir, dir));
    }
  });

  filesToCopy.forEach((fileName) => {
    const source = path.join(projectRoot, fileName);
    if (fs.existsSync(source)) {
      copyFile(source, path.join(distDir, fileName));
    }
  });

  const docsDir = path.join(distDir, 'docs');
  if (fs.existsSync(docsDir) && !fs.existsSync(path.join(docsDir, 'index.md'))) {
    const readmePath = path.join(projectRoot, 'Canonical-Funnel-README.md');
    if (fs.existsSync(readmePath)) {
      copyFile(readmePath, path.join(docsDir, 'index.md'));
    }
  }

  const files = gatherFiles(distDir);
  const manifestPath = writeManifest(files);

  console.log(`Build artifacts written to ${distDir}`);
  console.log(`Manifest created at ${manifestPath}`);
}

main();
