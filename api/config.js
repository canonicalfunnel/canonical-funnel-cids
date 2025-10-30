'use strict';

const path = require('path');
const { loadEnvFile, getEnv } = require('../src/config');

loadEnvFile();

const apiConfig = {
  port: Number(getEnv('CFE_API_PORT', { defaultValue: 8080 })),
  apiVersion: 'v1',
  apiKey: getEnv('CFE_API_KEY', { defaultValue: null }),
  rateLimit: {
    windowMs: Number(getEnv('CFE_API_WINDOW_MS', { defaultValue: 15 * 60 * 1000 })),
    max: Number(getEnv('CFE_API_MAX_REQUESTS', { defaultValue: 100 })),
  },
  cors: {
    origin: getEnv('CFE_API_CORS_ORIGIN', { defaultValue: '*' }),
  },
  enableGraphql: getEnv('CFE_API_ENABLE_GRAPHQL', { defaultValue: 'true' }) !== 'false',
  enableRest: getEnv('CFE_API_ENABLE_REST', { defaultValue: 'true' }) !== 'false',
  docsDir: path.resolve(__dirname, '../docs/api'),
};

module.exports = {
  apiConfig,
};
