'use strict';

const fs = require('fs');
const path = require('path');
const {
  collectManifestSummaries,
  collectTrustRecords,
  describeStructure,
} = require('./canonical-funnel');
const { createLogger } = require('../utils/logger');

const logger = createLogger('canonical-insights');

const insightsCache = {
  raw: null,
  curated: null,
};

function resetInsightsCache() {
  insightsCache.raw = null;
  insightsCache.curated = null;
}

function getInsightsPath() {
  return path.resolve(__dirname, '../../docs/canonical-funnel-insights.json');
}

function loadInsightsFile() {
  if (insightsCache.raw) {
    return insightsCache.raw;
  }

  const targetPath = getInsightsPath();
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Missing canonical insights file: ${targetPath}`);
  }

  const content = fs.readFileSync(targetPath, 'utf8');
  insightsCache.raw = JSON.parse(content);
  return insightsCache.raw;
}

function mapStructureEntry(entry) {
  return {
    path: entry.path || '(root)',
    type: entry.type,
    detail: entry.detail || '',
  };
}

function curateInsights(rawInsights) {
  const trustStructures = (rawInsights.trustRecords || []).map((record) => ({
    relative: record.relative,
    owner: record.owner,
    masterDid: record.masterDid,
    masterCid: record.masterCid,
    structure: (record.structure || []).map((entry) => mapStructureEntry(entry)),
  }));

  const manifestPatterns = (rawInsights.manifests || []).map((manifest) => ({
    relative: manifest.relative,
    keys: manifest.keys || [],
    structure: (manifest.structure || []).map((entry) => mapStructureEntry(entry)),
  }));

  return {
    generatedAt: rawInsights.generatedAt,
    trustStructures,
    manifestPatterns,
  };
}

function loadCuratedInsights() {
  if (insightsCache.curated) {
    return insightsCache.curated;
  }

  const curated = curateInsights(loadInsightsFile());
  insightsCache.curated = curated;
  return curated;
}

function loadRawInsights() {
  return loadInsightsFile();
}

function __resetInsightsCache() {
  resetInsightsCache();
}

function formatStructureEntry(entry) {
  if (entry.type === 'object') {
    return {
      path: entry.path || '(root)',
      type: 'object',
      detail: entry.keys ? entry.keys.join(', ') : '',
    };
  }

  if (entry.type === 'array') {
    return {
      path: entry.path,
      type: 'array',
      detail: `length≈${entry.sampleSize}`,
    };
  }

  return {
    path: entry.path,
    type: entry.type,
    detail:
      entry.value === undefined
        ? ''
        : JSON.stringify(entry.value).slice(0, 120),
  };
}

function mapStructure(structure) {
  return structure.map((entry) => formatStructureEntry(entry));
}

function generateInsights() {
  const trustRecords = collectTrustRecords().map((record) => ({
    relative: record.relative,
    owner: record.owner,
    masterDid: record.masterDid,
    masterCid: record.masterCid,
    structure: mapStructure(describeStructure(record.record, { maxEntries: 25 })),
  }));

  const manifests = collectManifestSummaries().map((manifest) => ({
    relative: manifest.relative,
    keys: manifest.keys,
    structure: mapStructure(manifest.structure),
  }));

  return {
    generatedAt: new Date().toISOString(),
    trustRecords,
    manifests,
  };
}

function renderMarkdown(insights) {
  const lines = [
    '# Canonical Funnel Structural Insights',
    '',
    `Generated at: ${insights.generatedAt}`,
    '',
    '## Trust Records',
  ];

  insights.trustRecords.forEach((record) => {
    lines.push(`### ${record.relative}`);
    lines.push('');
    lines.push(`- Owner: ${record.owner}`);
    lines.push(`- Master DID: ${record.masterDid}`);
    lines.push(`- Master CID: ${record.masterCid}`);
    lines.push('');
    lines.push('| Path | Type | Detail |');
    lines.push('| --- | --- | --- |');
    record.structure.forEach((entry) => {
      lines.push(
        `| ${entry.path || '(root)'} | ${entry.type} | ${entry.detail || ''} |`,
      );
    });
    lines.push('');
  });

  lines.push('## Manifests');
  insights.manifests.forEach((manifest) => {
    lines.push(`### ${manifest.relative}`);
    lines.push('');
    lines.push(`Keys: ${manifest.keys.join(', ')}`);
    lines.push('');
    lines.push('| Path | Type | Detail |');
    lines.push('| --- | --- | --- |');
    manifest.structure.forEach((entry) => {
      lines.push(
        `| ${entry.path || '(root)'} | ${entry.type} | ${
          entry.detail || ''
        } |`,
      );
    });
    lines.push('');
  });

  return lines.join('\n');
}

function writeInsightsFiles() {
  const insights = generateInsights();
  const docsDir = path.resolve(__dirname, '../../docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  const markdownPath = path.join(
    docsDir,
    'canonical-funnel-insights.md',
  );
  const jsonPath = path.join(docsDir, 'canonical-funnel-insights.json');

  fs.writeFileSync(jsonPath, JSON.stringify(insights, null, 2));
  fs.writeFileSync(markdownPath, renderMarkdown(insights));

  logger.info('Wrote canonical funnel insights', {
    markdownPath,
    jsonPath,
  });

  return {
    markdownPath,
    jsonPath,
  };
}

function runWhenMain(entryModule = require.main) {
  if (!entryModule) {
    return;
  }

  const candidateFilename =
    entryModule && entryModule.filename
      ? path.resolve(entryModule.filename)
      : null;

  const isMainModule =
    entryModule === module || candidateFilename === module.filename;

  if (isMainModule) {
    module.exports.writeInsightsFiles();
  }
}

module.exports = {
  generateInsights,
  renderMarkdown,
  writeInsightsFiles,
  loadCuratedInsights,
  loadRawInsights,
  getInsightsPath,
  __resetInsightsCache,
  runWhenMain,
};

runWhenMain();
