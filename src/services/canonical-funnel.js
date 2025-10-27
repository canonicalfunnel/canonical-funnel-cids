'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { config } = require('../config');
const { createLogger } = require('../utils/logger');

const logger = createLogger('canonical-funnel-service');

const jsonCache = new Map();

function ensureReadable(targetPath, label) {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Missing canonical funnel ${label}: ${targetPath}`);
  }

  return targetPath;
}

function readJson(targetPath) {
  const normalizedPath = path.resolve(targetPath);
  const cached = jsonCache.get(normalizedPath);
  if (cached) {
    return cached;
  }

  const content = fs.readFileSync(normalizedPath, 'utf8');
  const parsed = JSON.parse(content);
  jsonCache.set(normalizedPath, parsed);
  return parsed;
}

function getAssetsDirectory() {
  return ensureReadable(config.canonicalFunnel.assetsDir, 'assets directory');
}

function getIndexPath() {
  return ensureReadable(config.canonicalFunnel.indexPath, 'index file');
}

function getAssetsSummaryPath() {
  return ensureReadable(
    config.canonicalFunnel.assetsSummaryPath,
    'assets summary',
  );
}

function getGroupedSummaryPath() {
  return ensureReadable(
    config.canonicalFunnel.groupedSummaryPath,
    'grouped summary',
  );
}

function loadAssetIndex() {
  return readJson(getIndexPath());
}

function listGroups() {
  const index = loadAssetIndex();
  return Object.keys(index.groups || {}).sort();
}

function listGroupItems(groupName) {
  if (!groupName) {
    throw new Error('Group name is required');
  }

  const index = loadAssetIndex();
  const group = index.groups && index.groups[groupName];
  if (!group) {
    throw new Error(`Unknown canonical funnel group: ${groupName}`);
  }

  return group.items || [];
}

function resolveAssetPath(relativePath) {
  if (!relativePath) {
    throw new Error('Relative asset path is required');
  }

  const baseDir = getAssetsDirectory();
  const target = path.resolve(baseDir, relativePath);
  return ensureReadable(target, 'asset file');
}

function loadJsonAsset(relativePath) {
  const absolutePath = resolveAssetPath(relativePath);
  return readJson(absolutePath);
}

function loadAssetsSummary() {
  return readJson(getAssetsSummaryPath());
}

function loadGroupedSummary() {
  return readJson(getGroupedSummaryPath());
}

function describeStructure(payload, options = {}) {
  const { maxEntries = 20 } = options;
  const results = [];

  function walk(value, pointer) {
    if (results.length >= maxEntries) {
      return;
    }

    if (Array.isArray(value)) {
      results.push({
        path: pointer,
        type: 'array',
        sampleSize: value.length,
      });
      if (value.length > 0) {
        walk(value[0], `${pointer}[0]`);
      }
      return;
    }

    if (value && typeof value === 'object') {
      const keys = Object.keys(value);
      results.push({
        path: pointer,
        type: 'object',
        keys,
      });
      keys.slice(0, maxEntries).forEach((key) => {
        walk(value[key], pointer ? `${pointer}.${key}` : key);
      });
      return;
    }

    results.push({
      path: pointer,
      type: typeof value,
      value,
    });
  }

  walk(payload, '');
  return results;
}

function collectTrustRecords() {
  const entries = loadAssetsSummary().filter((entry) =>
    entry.file.includes('canonical_trust_record'),
  );

  return entries.map((entry) => {
    const data = loadJsonAsset(entry.file);
    const record = data.CanonicalTrustRecord || {};
    return {
      relative: entry.file,
      owner: record.Owner,
      masterDid: record.MasterDID,
      masterCid: record.MasterCID,
      keys: Object.keys(record),
      record,
    };
  });
}

function collectManifestSummaries() {
  const entries = loadAssetsSummary().filter(
    (entry) =>
      entry.file.includes('manifest') &&
      entry.file.toLowerCase().endsWith('.json'),
  );

  return entries.map((entry) => {
    const data = loadJsonAsset(entry.file);
    return {
      relative: entry.file,
      keys: Object.keys(data),
      structure: describeStructure(data, { maxEntries: 10 }),
      data,
    };
  });
}

function computeAssetDigest(relativePath) {
  const absolutePath = resolveAssetPath(relativePath);
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(absolutePath));
  return hash.digest('hex');
}

function buildKeywordStats() {
  const keywordsFiles = [
    'canonical_funnel_wariphat/001_canonical-funnel-lot2-1M-with-updated-metadata.json',
    'canonical_funnel_wariphat/003_canonical-funnel-lot1-1M.json',
    'canonical_funnel_wariphat/006_1#Canonical_Funnel_Master_Record_1M.json',
  ];

  const totals = {
    filesProcessed: 0,
    keywords: 0,
    categories: 0,
    declaredLots: [],
    declaredCategoryTotals: [],
  };
  const lotIdentifiers = new Set();

  keywordsFiles.forEach((relative) => {
    try {
      const payload = loadJsonAsset(relative);
      totals.filesProcessed += 1;

      if (payload && payload.metadata) {
        const { metadata } = payload;
        if (metadata.lot_number) {
          lotIdentifiers.add(`Lot ${metadata.lot_number}`);
        }
        const certificate =
          metadata['Canonical Funnel Proof Certificate'];
        if (certificate && certificate.Scope) {
          lotIdentifiers.add(certificate.Scope);
        }
        if (certificate && certificate.Quantity) {
          lotIdentifiers.add(`Quantity ${certificate.Quantity}`);
        }
      }

      if (payload && payload._canonical_metadata) {
        const canonicalMeta = payload._canonical_metadata;
        if (canonicalMeta.name) {
          lotIdentifiers.add(canonicalMeta.name);
        }
        if (canonicalMeta.category_range) {
          lotIdentifiers.add(canonicalMeta.category_range);
        }
        if (canonicalMeta.funnel_category_count) {
          totals.declaredCategoryTotals.push(
            canonicalMeta.funnel_category_count,
          );
        }
      }

      if (Array.isArray(payload && payload.keywords)) {
        totals.keywords += payload.keywords.length;
      }

      if (payload && payload.funnels && typeof payload.funnels === 'object') {
        Object.values(payload.funnels).forEach((value) => {
          if (Array.isArray(value)) {
            totals.keywords += value.length;
            totals.categories += 1;
          }
        });
      }

      Object.keys(payload || {}).forEach((key) => {
        if (/^Funnel Category #/i.test(key) && Array.isArray(payload[key])) {
          totals.keywords += payload[key].length;
          totals.categories += 1;
        }
      });
    } catch (error) {
      logger.warn('Unable to parse keyword file', {
        relative,
        error: error && error.message ? error.message : String(error),
      });
    }
  });

  totals.declaredLots = Array.from(lotIdentifiers);
  return totals;
}

function printCliOutput(message, payload) {
  // eslint-disable-next-line no-console
  console.log(message);
  if (payload) {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(payload, null, 2));
  }
}

function runCli(argv = process.argv.slice(2)) {
  const [command] = argv;

  if (!command || command === 'help') {
    printCliOutput(
      'Usage: node src/services/canonical-funnel.js <command>\n' +
        'Commands: stats | trust | manifests | assets',
    );
    return;
  }

  if (command === 'stats') {
    const index = loadAssetIndex();
    const keywordStats = buildKeywordStats();
    printCliOutput('Canonical Funnel stats', {
      itemsTotal: index.items_total,
      groupCount: Object.keys(index.groups || {}).length,
      keywordStats,
    });
    return;
  }

  if (command === 'trust') {
    const records = collectTrustRecords();
    printCliOutput('Trust records', records.map((record) => ({
      relative: record.relative,
      owner: record.owner,
      masterDid: record.masterDid,
      masterCid: record.masterCid,
      keys: record.keys,
    })));
    return;
  }

  if (command === 'manifests') {
    const summaries = collectManifestSummaries();
    printCliOutput(
      'Manifest structures',
      summaries.map((summary) => ({
        relative: summary.relative,
        keys: summary.keys,
        structure: summary.structure,
      })),
    );
    return;
  }

  if (command === 'assets') {
    const groups = listGroups();
    const mapped = {};
    groups.forEach((groupName) => {
      mapped[groupName] = listGroupItems(groupName).length;
    });
    printCliOutput('Asset groups', mapped);
    return;
  }

  throw new Error(`Unknown canonical-funnel command: ${command}`);
}

module.exports = {
  getAssetsDirectory,
  getIndexPath,
  loadAssetIndex,
  listGroups,
  listGroupItems,
  resolveAssetPath,
  loadJsonAsset,
  loadAssetsSummary,
  loadGroupedSummary,
  describeStructure,
  collectTrustRecords,
  collectManifestSummaries,
  computeAssetDigest,
  buildKeywordStats,
  runCli,
};

if (require.main === module) {
  runCli();
}
