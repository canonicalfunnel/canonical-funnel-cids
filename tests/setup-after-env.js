'use strict';

beforeEach(() => {
  process.env.CFE_IPFS_CID = process.env.CFE_IPFS_CID || 'bafy-default-cid';
  process.env.CFE_DID = process.env.CFE_DID || 'did:key:default';
});
