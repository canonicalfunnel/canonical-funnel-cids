'use strict';

const fs = require('fs');
const path = require('path');

async function uploadFile(filePath, metadataPath) {
  const token = process.env.WEB3_STORAGE_TOKEN || process.env.STORACHA_API_KEY;
  if (!token) {
    throw new Error(
      'A WEB3_STORAGE_TOKEN or STORACHA_API_KEY environment variable is required to upload artifacts.',
    );
  }

  const endpoint = process.env.WEB3_STORAGE_ENDPOINT || 'https://api.web3.storage/upload';
  const stream = fs.createReadStream(filePath);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/octet-stream',
    },
    body: stream,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Unable to anchor artifact. Status: ${response.status}. Body: ${errorBody}`);
  }

  const payload = await response.json();
  const manifest = {
    cid: payload.cid,
    size: payload.size || payload.dagSize || fs.statSync(filePath).size,
    source: path.basename(filePath),
    endpoint,
    createdAt: new Date().toISOString(),
  };

  fs.writeFileSync(metadataPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`CID ${manifest.cid} stored in ${metadataPath}`);
  console.log(JSON.stringify(manifest, null, 2));
}

async function main() {
  const [,, inputPath, metadataPath = 'storacha-manifest.json'] = process.argv;

  if (!inputPath) {
    throw new Error('Usage: node scripts/anchor-to-web3.js <artifact-path> [manifest-path]');
  }

  const absoluteInput = path.resolve(process.cwd(), inputPath);
  if (!fs.existsSync(absoluteInput)) {
    throw new Error(`Artifact not found at ${absoluteInput}`);
  }

  const absoluteManifest = path.resolve(process.cwd(), metadataPath);
  await uploadFile(absoluteInput, absoluteManifest);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
