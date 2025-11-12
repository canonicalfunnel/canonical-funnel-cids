'use strict';

const path = require('path');

const fixtureRoot = path.resolve(__dirname, './fixtures/canonical-funnel');

process.env.CFE_IPFS_CID = process.env.CFE_IPFS_CID || 'bafy-default-cid';
process.env.CFE_DID = process.env.CFE_DID || 'did:key:default';
process.env.CFE_ASSETS_DIR =
  process.env.CFE_ASSETS_DIR || path.join(fixtureRoot, 'cfe_assets');
process.env.CFE_ASSETS_SUMMARY_PATH =
  process.env.CFE_ASSETS_SUMMARY_PATH ||
  path.join(fixtureRoot, 'cfe_assets_summary.json');
process.env.CFE_GROUPED_SUMMARY_PATH =
  process.env.CFE_GROUPED_SUMMARY_PATH ||
  path.join(fixtureRoot, 'cfe_assets_grouped_summary.json');
process.env.CFE_INDEX_PATH =
  process.env.CFE_INDEX_PATH ||
  path.join(fixtureRoot, 'Complete_Structure_Consolidated.json');
