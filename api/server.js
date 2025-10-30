'use strict';

const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { gql } = require('graphql-tag');

const {
  listGroups,
  listGroupItems,
  collectTrustRecords,
  collectManifestSummaries,
  buildKeywordStats,
} = require('../src/services/canonical-funnel');
const { apiConfig } = require('./config');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: apiConfig.cors.origin }));
app.use(bodyParser.json({ limit: '1mb' }));

if (apiConfig.rateLimit && apiConfig.rateLimit.max > 0) {
  app.use(
    rateLimit({
      windowMs: apiConfig.rateLimit.windowMs,
      max: apiConfig.rateLimit.max,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
}

function authenticate(req, res, next) {
  if (!apiConfig.apiKey) {
    next();
    return;
  }

  const headerKey = req.headers['x-api-key'];
  const queryKey = req.query.apiKey || req.query.api_key;
  const provided = headerKey || queryKey;

  if (provided && provided === apiConfig.apiKey) {
    next();
    return;
  }

  res.status(401).json({
    error: 'Unauthorized',
    message: 'Valid API key required (send via x-api-key header or apiKey query param).',
  });
}

app.use('/api', authenticate);

if (apiConfig.enableRest) {
  const router = express.Router();

  router.get(`/${apiConfig.apiVersion}/groups`, (req, res) => {
    res.json({ groups: listGroups() });
  });

  router.get(`/${apiConfig.apiVersion}/groups/:group/items`, (req, res) => {
    try {
      const items = listGroupItems(req.params.group);
      res.json({ group: req.params.group, count: items.length, items });
    } catch (error) {
      res.status(404).json({
        error: 'NotFound',
        message: error.message,
      });
    }
  });

  router.get(`/${apiConfig.apiVersion}/trust-records`, (req, res) => {
    const records = collectTrustRecords();
    res.json({ count: records.length, records });
  });

  router.get(`/${apiConfig.apiVersion}/manifests`, (req, res) => {
    const manifests = collectManifestSummaries();
    res.json({
      count: manifests.length,
      manifests: manifests.map((manifest) => ({
        relative: manifest.relative,
        keys: manifest.keys,
        structure: manifest.structure,
      })),
    });
  });

  router.get(`/${apiConfig.apiVersion}/keywords/stats`, (req, res) => {
    res.json(buildKeywordStats());
  });

  app.use('/api', router);
}

let apolloServer;
async function initialiseGraphql() {
  if (!apiConfig.enableGraphql) {
    return;
  }

  const typeDefs = gql`
    type Query {
      groups: [String!]!
      group(group: String!): Group
      trustRecords: [TrustRecord!]!
      manifests: [ManifestSummary!]!
      keywordStats: KeywordStats!
    }

    type Group {
      name: String!
      items: [GroupItem!]!
    }

    type GroupItem {
      index: Int
      name: String
      cid: String
      url: String
      timestampUtc: String @deprecated(reason: "Use timestamp_utc from Consolidated metadata.")
      timestamp_utc: String
    }

    type TrustRecord {
      relative: String!
      owner: String
      masterDid: String
      masterCid: String
      keys: [String!]!
    }

    type ManifestSummary {
      relative: String!
      keys: [String!]!
      structure: [StructureEntry!]!
    }

    type StructureEntry {
      path: String
      type: String!
      detail: String
    }

    type KeywordStats {
      filesProcessed: Int!
      keywords: Int!
      categories: Int!
      declaredLots: [String!]!
      declaredCategoryTotals: [Int!]!
    }
  `;

  const resolvers = {
    Query: {
      groups: () => listGroups(),
      group: (_, args) => {
        try {
          const items = listGroupItems(args.group);
          return {
            name: args.group,
            items,
          };
        } catch (error) {
          return null;
        }
      },
      trustRecords: () => collectTrustRecords(),
      manifests: () => collectManifestSummaries(),
      keywordStats: () => buildKeywordStats(),
    },
    GroupItem: {
      index: (item) => item.index,
      name: (item) => item.name,
      cid: (item) => item.cid,
      url: (item) => item.url,
      timestampUtc: (item) => item.timestamp_utc,
      timestamp_utc: (item) => item.timestamp_utc,
    },
    TrustRecord: {
      masterDid: (record) => record.masterDid,
      masterCid: (record) => record.masterCid,
    },
  };

  apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
  });
  await apolloServer.start();
  app.use(
    '/graphql',
    authenticate,
    bodyParser.json(),
    expressMiddleware(apolloServer),
  );
}

async function bootstrap() {
  await initialiseGraphql();

  const server = http.createServer(app);
  server.listen(apiConfig.port, () => {
    // eslint-disable-next-line no-console
    console.log(
      `Canonical Funnel API listening on port ${apiConfig.port} (REST: ${apiConfig.enableRest}, GraphQL: ${apiConfig.enableGraphql})`,
    );
  });

  return server;
}

if (require.main === module) {
  bootstrap();
}

module.exports = {
  app,
  bootstrap,
};
