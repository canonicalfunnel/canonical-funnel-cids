'use strict';

const path = require('path');

const fixtureRoot = path.resolve(__dirname, 'fixtures/canonical');

process.env.CFE_ASSETS_DIR = path.join(fixtureRoot, 'assets');
process.env.CFE_ASSETS_SUMMARY_PATH = path.join(
  fixtureRoot,
  'cfe_assets_summary.json',
);
process.env.CFE_GROUPED_SUMMARY_PATH = path.join(
  fixtureRoot,
  'cfe_assets_grouped_summary.json',
);
process.env.CFE_INDEX_PATH = path.join(
  fixtureRoot,
  'Complete_Structure_Consolidated.json',
);

if (!process.env.CFE_IPFS_CID) {
  process.env.CFE_IPFS_CID = 'bafy-fixture';
}

if (!process.env.CFE_DID) {
  process.env.CFE_DID = 'did:key:fixture';
}
