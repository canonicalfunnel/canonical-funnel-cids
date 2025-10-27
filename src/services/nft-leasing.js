'use strict';

const crypto = require('crypto');
const { createLogger } = require('../utils/logger');
const { withRetry } = require('../utils/retry');

const logger = createLogger('nft-leasing-service');

function coerceDate(value, fallback) {
  if (!value) {
    return fallback ? new Date(fallback).toISOString() : undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date value provided: ${value}`);
  }

  return date.toISOString();
}

function validateLeaseTerms(terms = {}) {
  if (typeof terms !== 'object') {
    throw new Error('Lease terms must be provided as an object');
  }

  const {
    startDate,
    endDate,
    currency = 'USDC',
    paymentFrequency = 'monthly',
    price,
    metadataCid,
  } = terms;

  if (price === undefined || Number.isNaN(Number(price)) || Number(price) <= 0) {
    throw new Error('Lease price must be a positive number');
  }

  const normalizedStart = coerceDate(
    startDate,
    new Date().toISOString(),
  );
  const normalizedEnd = coerceDate(endDate);

  if (!normalizedEnd) {
    throw new Error('Lease end date is required');
  }

  if (new Date(normalizedStart) >= new Date(normalizedEnd)) {
    throw new Error('Lease end date must be after the start date');
  }

  return {
    startDate: normalizedStart,
    endDate: normalizedEnd,
    currency,
    paymentFrequency,
    price: Number(price),
    metadataCid,
  };
}

function deriveLeaseIdentifier(payload) {
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify(payload));
  return hash.digest('hex');
}

function createLeaseProposal(options = {}) {
  const {
    metadataCid,
    lessorDid,
    lesseeDid,
    terms,
    metadataSnapshot,
  } = options;

  if (!metadataCid) {
    throw new Error('A metadata CID is required to create a lease proposal');
  }

  if (!lessorDid) {
    throw new Error('A lessor DID is required to create a lease proposal');
  }

  const validatedTerms = validateLeaseTerms({
    ...terms,
    metadataCid: terms && terms.metadataCid ? terms.metadataCid : metadataCid,
  });

  const baseRecord = {
    metadataCid,
    lessorDid,
    lesseeDid,
    terms: validatedTerms,
    metadataSnapshot: metadataSnapshot || null,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };

  const leaseId = deriveLeaseIdentifier(baseRecord);

  const proposal = {
    id: leaseId,
    ...baseRecord,
  };

  logger.info('Created lease proposal', {
    leaseId,
    metadataCid,
    lessorDid,
    lesseeDid,
    price: validatedTerms.price,
    startDate: validatedTerms.startDate,
    endDate: validatedTerms.endDate,
  });

  return proposal;
}

async function finalizeLease(proposal, options = {}) {
  if (!proposal || proposal.status !== 'pending') {
    throw new Error('Only pending lease proposals can be finalized');
  }

  const {
    retries = 2,
    retryDelay = 500,
    submit,
  } = options;

  const record = {
    ...proposal,
    status: 'finalized',
    finalizedAt: new Date().toISOString(),
  };

  if (typeof submit !== 'function') {
    logger.debug('No submit handler provided, returning finalized record');
    return record;
  }

  await withRetry(() => submit(record), {
    retries,
    delay: retryDelay,
      component: 'nft-leasing-finalize',
    onRetry: (error, attempt) => {
      logger.warn('Retrying lease submission', {
        leaseId: record.id,
        attempt,
        error: error && error.message ? error.message : String(error),
      });
    },
  });

  logger.info('Finalized lease record', {
    leaseId: record.id,
    metadataCid: record.metadataCid,
  });

  return record;
}

function extractLeaseDefaults(metadata = {}) {
  const { leasing, lesseeDid } = metadata;

  if (!leasing) {
    return undefined;
  }

  const terms = {
    price: leasing.price,
    currency: leasing.currency,
    paymentFrequency: leasing.paymentFrequency || 'monthly',
    startDate: leasing.startDate,
    endDate: leasing.endDate,
  };

  return {
    lesseeDid,
    terms,
  };
}

module.exports = {
  createLeaseProposal,
  extractLeaseDefaults,
  finalizeLease,
  validateLeaseTerms,
};
