'use strict';

const { config } = require('../config');
const { createLogger } = require('../utils/logger');
const { withRetry } = require('../utils/retry');

const logger = createLogger('storacha-service');

let clientPromise;
let clientFactoryOverride;
let clientModuleLoader = () => import('@storacha/client');

async function resolveClientFactory() {
  if (typeof clientFactoryOverride === 'function') {
    return clientFactoryOverride;
  }

  const storachaModule = await clientModuleLoader();
  const factory =
    storachaModule.create ||
    (storachaModule.default && storachaModule.default.create);

  if (typeof factory !== 'function') {
    throw new Error('Unable to locate Storacha client factory function');
  }

  return factory;
}

function resolveGatewayUrl(cid, pathSegment = '') {
  if (!cid) {
    throw new Error('A CID is required to resolve a gateway URL');
  }

  const sanitizedPath =
    pathSegment && pathSegment.startsWith('/') ? pathSegment.slice(1) : pathSegment;

  const baseUrl = config.storacha.gatewayUrl.replace(/\/+$/, '');
  return sanitizedPath
    ? `${baseUrl}/${cid}/${sanitizedPath}`
    : `${baseUrl}/${cid}`;
}

async function ensureClient() {
  if (!clientPromise) {
    clientPromise = (async () => {
      logger.info('Initializing Storacha client');

      const factory = await resolveClientFactory();

      const options = {};
      if (config.storacha.apiKey) {
        options.token = config.storacha.apiKey;
      }

      const client = await factory(options);
      logger.debug('Storacha client ready');
      return client;
    })().catch((error) => {
      clientPromise = undefined;
      logger.error('Failed to initialise Storacha client', {
        error: error && error.message ? error.message : String(error),
      });
      throw error;
    });
  }

  return clientPromise;
}

function setClientFactory(factory) {
  if (factory !== undefined && typeof factory !== 'function') {
    throw new Error('Client factory override must be a function');
  }

  clientFactoryOverride = factory;
  clientPromise = undefined;
}

function setClientModuleLoader(loader) {
  if (loader !== undefined && typeof loader !== 'function') {
    throw new Error('Client module loader must be a function');
  }

  clientModuleLoader =
    loader ||
    (() => import('@storacha/client'));

  clientFactoryOverride = undefined;
  clientPromise = undefined;
}

async function fetchCidText(cid, options = {}) {
  const {
    path: pathSegment = '',
    signal,
    retries = 2,
    retryDelay = (attempt) => 500 * attempt,
  } = options;

  const url = resolveGatewayUrl(cid, pathSegment);
  logger.debug('Fetching CID content as text', { cid, url });

  return withRetry(
    async () => {
      const response = await fetch(url, { signal });
      if (!response.ok) {
        throw new Error(`Failed to fetch CID ${cid} (${response.status})`);
      }

      return response.text();
    },
    {
      retries,
      delay: retryDelay,
      component: 'storacha-fetch',
      onRetry: (error, attempt) => {
        logger.warn('Retrying CID fetch', {
          cid,
          attempt,
          error: error && error.message ? error.message : String(error),
        });
      },
    },
  );
}

async function fetchCidJson(cid, options = {}) {
  const text = await fetchCidText(cid, options);

  try {
    return JSON.parse(text);
  } catch (error) {
    logger.error('Unable to parse CID payload as JSON', {
      cid,
      error: error && error.message ? error.message : String(error),
    });
    throw error;
  }
}

async function listUploadRecords(options = {}) {
  const client = await ensureClient();

  if (
    !client ||
    !client.capability ||
    !client.capability.upload ||
    typeof client.capability.upload.list !== 'function'
  ) {
    throw new Error('Storacha client does not expose capability.upload.list');
  }

  const {
    cursor,
    size = 25,
    retries = 2,
    retryDelay = 250,
  } = options;

  logger.debug('Listing Storacha uploads', { cursor, size });

  return withRetry(
    () =>
      client.capability.upload.list({
        cursor,
        size,
      }),
    {
      retries,
      delay: retryDelay,
      component: 'storacha-upload-list',
      onRetry: (error, attempt) => {
        logger.warn('Retrying Storacha upload list', {
          attempt,
          error: error && error.message ? error.message : String(error),
        });
      },
    },
  );
}

module.exports = {
  ensureClient,
  fetchCidJson,
  fetchCidText,
  listUploadRecords,
  resolveGatewayUrl,
  setClientFactory,
  setClientModuleLoader,
};
