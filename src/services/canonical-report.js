'use strict';

const fs = require('fs');
const path = require('path');
const {
  buildKeywordStats,
  loadAssetIndex,
  loadAssetsSummary,
  loadJsonAsset,
} = require('./canonical-funnel');
const { createLogger } = require('../utils/logger');

const logger = createLogger('canonical-report');

function tallyExtensions(entries) {
  const counts = {};

  entries.forEach((entry) => {
    const ext = path.extname(entry.file).toLowerCase() || 'none';
    counts[ext] = (counts[ext] || 0) + 1;
  });

  return counts;
}

function analyzeAllocationPayload(payload) {
  const totals = {
    groups: 0,
    entries: 0,
  };

  function walk(node) {
    if (!node) {
      return;
    }

    if (Array.isArray(node)) {
      if (node.length > 0 && typeof node[0] === 'object') {
        const sample = node[0];
        if (
          sample.rights_holder !== undefined ||
          sample.holder !== undefined ||
          sample.allocation_share !== undefined ||
          sample.allocation_percentage !== undefined ||
          sample.contact !== undefined
        ) {
          totals.entries += node.length;
        }
      }
      node.forEach(walk);
      return;
    }

    if (typeof node === 'object') {
      if (Array.isArray(node.groups)) {
        totals.groups += node.groups.length;
      }
      Object.values(node).forEach(walk);
    }
  }

  walk(payload);
  return totals;
}

function computeAllocationStats() {
  const entries = loadAssetsSummary().filter(
    (entry) =>
      entry.file.toLowerCase().includes('allocation') &&
      entry.file.toLowerCase().endsWith('.json'),
  );

  const aggregate = {
    files: entries.length,
    groups: 0,
    entries: 0,
  };

  entries.forEach((entry) => {
    try {
      const payload = loadJsonAsset(entry.file);
      const analysis = analyzeAllocationPayload(payload);
      aggregate.groups += analysis.groups;
      aggregate.entries += analysis.entries;
    } catch (error) {
      logger.warn('Unable to analyze allocation payload', {
        file: entry.file,
        error: error && error.message ? error.message : String(error),
      });
    }
  });

  return aggregate;
}

function hasSignatureKey(value) {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const queue = [value];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== 'object') {
      // eslint-disable-next-line no-continue
      continue;
    }

    if (!Array.isArray(current)) {
      const keys = Object.keys(current);
      if (
        keys.some((key) =>
          key.toLowerCase().match(/signature|sha256|public_key/),
        )
      ) {
        return true;
      }
    }

    if (Array.isArray(current)) {
      if (current.length === 0) {
        // eslint-disable-next-line no-continue
        continue;
      }

      const sample = current.slice(0, 3);
      sample.forEach((entry) => {
        if (entry && typeof entry === 'object') {
          queue.push(entry);
        }
      });
      // eslint-disable-next-line no-continue
      continue;
    }

    queue.push(...Object.values(current));
  }

  return false;
}

function computeSignatureStats() {
  const entries = loadAssetsSummary();
  let binaryArtifacts = 0;
  let jsonSignatureDocs = 0;

  entries.forEach((entry) => {
    const lower = entry.file.toLowerCase();
    if (
      lower.includes('signature') ||
      lower.endsWith('.sig') ||
      lower.endsWith('.pem') ||
      lower.endsWith('.sha256') ||
      lower.endsWith('.base64')
    ) {
      binaryArtifacts += 1;
    }

    if (lower.endsWith('.json')) {
      try {
        const payload = loadJsonAsset(entry.file);
        if (hasSignatureKey(payload)) {
          jsonSignatureDocs += 1;
        }
      } catch (error) {
        logger.warn('Unable to parse JSON while computing signature stats', {
          file: entry.file,
          error: error && error.message ? error.message : String(error),
        });
      }
    }
  });

  return {
    binaryArtifacts,
    jsonSignatureDocs,
  };
}

function generateReport() {
  const index = loadAssetIndex();
  const summaryEntries = loadAssetsSummary();

  const keywordStats = buildKeywordStats();
  const allocationStats = computeAllocationStats();
  const signatureStats = computeSignatureStats();

  const extensionBreakdown = tallyExtensions(summaryEntries);

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      assets: index.items_total,
      groups: Object.keys(index.groups || {}).length,
      extensionBreakdown,
    },
    keywords: keywordStats,
    allocations: allocationStats,
    signatures: {
      binaryArtifacts: signatureStats.binaryArtifacts,
      jsonDocuments: signatureStats.jsonSignatureDocs,
      coverageRatio:
        summaryEntries.length > 0
          ? Number(
              (
                signatureStats.jsonSignatureDocs / summaryEntries.length
              ).toFixed(3),
            )
          : 0,
    },
  };
}

function renderMarkdown(report) {
  const lines = [
    '# Canonical Funnel Quantitative Report',
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Totals',
    `- Assets indexed: ${report.totals.assets}`,
    `- Asset groups: ${report.totals.groups}`,
    '',
    '### File type distribution',
  ];

  Object.entries(report.totals.extensionBreakdown)
    .sort((a, b) => b[1] - a[1])
    .forEach(([ext, count]) => {
      lines.push(`- \`${ext}\`: ${count}`);
    });

  lines.push('');
  lines.push('## Keywords');
  lines.push(`- Files processed: ${report.keywords.filesProcessed}`);
  lines.push(`- Total keywords observed: ${report.keywords.keywords}`);
  lines.push(
    `- Category buckets enumerated: ${report.keywords.categories}`,
  );
  lines.push(
    `- Declared lots: ${
      report.keywords.declaredLots.length > 0
        ? report.keywords.declaredLots.join(', ')
        : 'n/a'
    }`,
  );
  lines.push(
    `- Declared category totals: ${
      report.keywords.declaredCategoryTotals.length > 0
        ? report.keywords.declaredCategoryTotals.join(', ')
        : 'n/a'
    }`,
  );
  lines.push('');
  lines.push('## Allocations');
  lines.push(`- Allocation files: ${report.allocations.files}`);
  lines.push(`- Allocation groups detected: ${report.allocations.groups}`);
  lines.push(`- Allocation entries detected: ${report.allocations.entries}`);
  lines.push('');
  lines.push('## Signatures & Hashes');
  lines.push(
    `- Binary signature/hash artifacts: ${report.signatures.binaryArtifacts}`,
  );
  lines.push(
    `- JSON documents declaring signatures/hashes: ${report.signatures.jsonDocuments}`,
  );
  lines.push(
    `- Coverage ratio: ${(
      report.signatures.coverageRatio * 100
    ).toFixed(1)}%`,
  );

  return lines.join('\n');
}

function writeReportFiles() {
  const report = generateReport();
  const docsDir = path.resolve(__dirname, '../../docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  const markdownPath = path.join(docsDir, 'canonical-funnel-report.md');
  const jsonPath = path.join(docsDir, 'canonical-funnel-report.json');

  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(markdownPath, renderMarkdown(report));

  logger.info('Wrote canonical funnel report', {
    markdownPath,
    jsonPath,
  });

  return {
    markdownPath,
    jsonPath,
  };
}

module.exports = {
  generateReport,
  renderMarkdown,
  writeReportFiles,
  analyzeAllocationPayload,
  hasSignatureKey,
};

if (require.main === module) {
  writeReportFiles();
}
