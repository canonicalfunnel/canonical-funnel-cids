'use strict';

const { config } = require('../config');
const { createLogger } = require('../utils/logger');
const storachaService = require('../services/storacha');
const nftLeasingService = require('../services/nft-leasing');

const logger = createLogger('canonical-funnel-agent');

async function loadCanonicalMetadata(cid) {
  if (!cid) {
    throw new Error('A CID is required to load canonical metadata');
  }

  logger.info('Loading canonical metadata', { cid });
  const metadata = await storachaService.fetchCidJson(cid);

  logger.debug('Metadata loaded', {
    cid,
    keys: Array.isArray(metadata)
      ? 'array'
      : Object.keys(metadata || {}).slice(0, 10),
  });

  return metadata;
}

function prepareLeaseTerms(metadata, cid, overrides = {}) {
  const defaults = nftLeasingService.extractLeaseDefaults(metadata) || {};
  const overrideTerms = overrides.terms || {};

  const mergedTerms = {
    ...(defaults.terms || {}),
    ...overrideTerms,
    metadataCid: cid,
  };

  return {
    lesseeDid: overrides.lesseeDid || defaults.lesseeDid,
    terms: mergedTerms,
  };
}

async function buildLeaseFromMetadata(metadata, options = {}) {
  const {
    metadataCid,
    lesseeDid: overrideLesseeDid,
    terms: overrideTerms,
    autoFinalize = false,
    submitLease,
  } = options;

  if (!metadataCid) {
    throw new Error('metadataCid is required to build a lease record');
  }

  const defaults = prepareLeaseTerms(metadata, metadataCid, {
    lesseeDid: overrideLesseeDid,
    terms: overrideTerms,
  });

  const leaseProposal = nftLeasingService.createLeaseProposal({
    metadataCid,
    lessorDid: config.canonicalFunnel.did,
    lesseeDid: defaults.lesseeDid || config.canonicalFunnel.did,
    terms: defaults.terms,
    metadataSnapshot: metadata,
  });

  if (!autoFinalize) {
    return leaseProposal;
  }

  return nftLeasingService.finalizeLease(leaseProposal, {
    submit: submitLease,
  });
}

async function runAgent(options = {}) {
  const cid = options.cid || config.canonicalFunnel.ipfsCid;
  const metadata = await loadCanonicalMetadata(cid);
  const leaseRecord = await buildLeaseFromMetadata(metadata, {
    metadataCid: cid,
    lesseeDid: options.lesseeDid,
    terms: options.terms,
    autoFinalize: options.autoFinalize,
    submitLease: options.submitLease,
  });

  return {
    cid,
    metadata,
    leaseRecord,
    gatewayUrl: storachaService.resolveGatewayUrl(cid),
  };
}

async function main() {
  try {
    const result = await runAgent({
      autoFinalize: process.env.AUTO_FINALIZE === 'true',
    });

    logger.info('Canonical Funnel agent execution complete', {
      cid: result.cid,
      leaseId: result.leaseRecord.id,
      status: result.leaseRecord.status,
    });
  } catch (error) {
    logger.error('Canonical Funnel agent execution failed', {
      error: error && error.message ? error.message : String(error),
    });
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  buildLeaseFromMetadata,
  loadCanonicalMetadata,
  prepareLeaseTerms,
  runAgent,
  main,
};
