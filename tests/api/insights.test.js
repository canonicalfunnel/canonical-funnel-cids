'use strict';

process.env.CFE_IPFS_CID = process.env.CFE_IPFS_CID || 'bafy-test-cid';
process.env.CFE_DID = process.env.CFE_DID || 'did:key:test';
process.env.NODE_ENV = 'test';
process.env.CFE_API_ENABLE_REST = 'true';
process.env.CFE_API_ENABLE_GRAPHQL = 'true';

const restHandlers = [];
let capturedApolloConfig;

jest.mock('express', () => {
  const router = {
    get: jest.fn((path, handler) => {
      restHandlers.push({ path, handler });
      return router;
    }),
    use: jest.fn(),
  };
  const app = Object.assign(() => {}, {
    use: jest.fn(),
  });
  const express = jest.fn(() => app);
  express.Router = jest.fn(() => router);
  express.__app = app;
  express.__router = router;
  return express;
}, { virtual: true });

const mockServer = {
  listen: jest.fn((port, callback) => {
    if (callback) {
      callback();
    }
  }),
  address: () => ({ port: 0 }),
  close: jest.fn((callback) => callback && callback()),
};

jest.mock('http', () => ({
  createServer: jest.fn(() => mockServer),
}));

jest.mock('cors', () => () => (req, res, next) => next && next(), { virtual: true });
jest.mock('helmet', () => () => (req, res, next) => next && next(), { virtual: true });
jest.mock(
  'express-rate-limit',
  () => () => (req, res, next) => next && next(),
  { virtual: true },
);
jest.mock(
  'body-parser',
  () => ({
    json: () => (req, res, next) => next && next(),
  }),
  { virtual: true },
);

jest.mock(
  '@apollo/server',
  () => ({
    ApolloServer: class {
      constructor(config) {
        capturedApolloConfig = config;
      }

      async start() {}
    },
  }),
  { virtual: true },
);

jest.mock(
  '@apollo/server/express4',
  () => ({
    expressMiddleware: () => (req, res, next) => next && next(),
  }),
  { virtual: true },
);

jest.mock(
  'graphql-tag',
  () => ({
    gql: (strings, ...values) =>
      strings.reduce((acc, str, index) => acc + str + (values[index] || ''), ''),
  }),
  { virtual: true },
);

const mockedInsights = {
  generatedAt: '2024-01-01T00:00:00.000Z',
  trustStructures: [{ relative: 'file.json', structure: [] }],
  manifestPatterns: [{ relative: 'manifest.json', keys: [], structure: [] }],
};

jest.mock('../../src/services/canonical-insights', () => ({
  loadCuratedInsights: jest.fn(() => mockedInsights),
}));

const { bootstrap } = require('../../api/server');

describe('API insights wiring', () => {
  it('registers REST route that returns curated insights', () => {
    const route = restHandlers.find((entry) => entry.path.endsWith('/insights'));
    expect(route).toBeDefined();

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    route.handler({}, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(mockedInsights);
  });

  it('exposes insights GraphQL field returning curated data', async () => {
    await bootstrap();
    expect(capturedApolloConfig).toBeDefined();
    expect(capturedApolloConfig.resolvers.Query.insights()).toBe(mockedInsights);
  });
});
