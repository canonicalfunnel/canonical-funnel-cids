'use strict';

const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');

let envInitialized = false;

function loadEnvFile() {
  if (envInitialized) {
    return;
  }

  envInitialized = true;

  const envPath = path.resolve(__dirname, '../../.env.local');
  if (!fs.existsSync(envPath)) {
    return;
  }

  try {
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split(/\r?\n/);

    lines.forEach((line) => {
      if (!line || line.trim().startsWith('#')) {
        return;
      }

      const [key, ...rest] = line.split('=');
      if (!key) {
        return;
      }

      const value = rest.join('=').trim();
      if (value === '' || process.env[key]) {
        return;
      }

      process.env[key] = value;
    });
  } catch (error) {
    logger.warn('Unable to load .env.local file', {
      error: error && error.message ? error.message : String(error),
    });
  }
}

function getEnv(name, options = {}) {
  loadEnvFile();

  const { required = false, defaultValue } = options;
  const value = process.env[name];

  if (value === undefined || value === null || value === '') {
    if (required) {
      throw new Error(`Missing required environment variable: ${name}`);
    }

    return defaultValue;
  }

  return value;
}

const config = {
  environment: {
    nodeEnv: getEnv('NODE_ENV', { defaultValue: 'development' }),
  },
  storacha: {
    apiKey: getEnv('STORACHA_API_KEY'),
    gatewayUrl: getEnv('STORACHA_GATEWAY_URL', {
      defaultValue: 'https://storacha.link/ipfs',
    }),
  },
  canonicalFunnel: {
    ipfsCid: getEnv('CFE_IPFS_CID', { required: true }),
    did: getEnv('CFE_DID', { required: true }),
    assetsDir: getEnv('CFE_ASSETS_DIR', {
      defaultValue: path.resolve(__dirname, '../../cfe_assets'),
    }),
    assetsSummaryPath: getEnv('CFE_ASSETS_SUMMARY_PATH', {
      defaultValue: path.resolve(
        __dirname,
        '../../cfe_assets_summary.json',
      ),
    }),
    groupedSummaryPath: getEnv('CFE_GROUPED_SUMMARY_PATH', {
      defaultValue: path.resolve(
        __dirname,
        '../../cfe_assets_grouped_summary.json',
      ),
    }),
    indexPath: getEnv('CFE_INDEX_PATH', {
      defaultValue: path.resolve(
        __dirname,
        '../../Complete_Structure_Consolidated.json',
      ),
    }),
  },
};

module.exports = {
  config,
  getEnv,
  loadEnvFile,
};
