'use strict';

const fs = require('fs');
const path = require('path');
const {
  collectManifestSummaries,
  computeAssetDigest,
  loadAssetsSummary,
} = require('./canonical-funnel');
const { createLogger } = require('../utils/logger');

const logger = createLogger('canonical-verifier');

function buildAssetLookup() {
  const summary = loadAssetsSummary();
  const byBaseName = new Map();

  summary.forEach((entry) => {
    const base = path.basename(entry.file).toLowerCase();
    if (!byBaseName.has(base)) {
      byBaseName.set(base, []);
    }
    byBaseName.get(base).push(entry.file);
  });

  return byBaseName;
}

function extractHashReferences(node, accumulator = []) {
  if (!node || typeof node !== 'object') {
    return accumulator;
  }

  if (Array.isArray(node)) {
    node.forEach((value) => extractHashReferences(value, accumulator));
    return accumulator;
  }

  const fileName = node.file || node.name || node.filename;
  if (fileName && node.sha256) {
    accumulator.push({
      file: fileName,
      sha256: node.sha256,
    });
  }

  Object.values(node).forEach((value) =>
    extractHashReferences(value, accumulator),
  );

  return accumulator;
}

function resolveReferencePath(fileName, manifestDir, lookup) {
  const normalized = fileName.toLowerCase();
  const direct = lookup.get(normalized);
  if (direct && direct.length) {
    return direct[0];
  }

  const candidates = [];
  lookup.forEach((paths, key) => {
    if (
      key.endsWith(`_${normalized}`) ||
      key.endsWith(`-${normalized}`) ||
      key.endsWith(` ${normalized}`) ||
      key.endsWith(`/${normalized}`)
    ) {
      candidates.push(...paths);
    }
  });

  if (!candidates.length) {
    return undefined;
  }

  const preferred = candidates.find((candidate) =>
    candidate.startsWith(`${manifestDir}/`),
  );
  return preferred || candidates[0];
}

function verifyManifests() {
  const lookup = buildAssetLookup();
  const manifests = collectManifestSummaries();

  return manifests.map((manifest) => {
    const manifestDir = path.dirname(manifest.relative);
    const references = extractHashReferences(manifest.data);
    const entries = references.map((reference) => {
      const resolved = resolveReferencePath(
        reference.file,
        manifestDir,
        lookup,
      );

      if (!resolved) {
        return {
          name: reference.file,
          status: 'missing',
          expected: reference.sha256,
        };
      }

      try {
        const actual = computeAssetDigest(resolved);
        const ok =
          actual.toLowerCase() === reference.sha256.toLowerCase();
        return {
          name: reference.file,
          path: resolved,
          expected: reference.sha256,
          actual,
          status: ok ? 'verified' : 'mismatch',
        };
      } catch (error) {
        return {
          name: reference.file,
          path: resolved,
          expected: reference.sha256,
          status: 'error',
          error: error && error.message ? error.message : String(error),
        };
      }
    });

    const summary = {
      manifest: manifest.relative,
      checked: entries.length,
      verified: entries.filter((entry) => entry.status === 'verified')
        .length,
      mismatches: entries.filter((entry) => entry.status === 'mismatch')
        .length,
      missing: entries.filter((entry) => entry.status === 'missing')
        .length,
      entries,
    };

    return summary;
  });
}

function renderMarkdown(results) {
  const lines = [
    '# Canonical Funnel Verification Report',
    '',
    `Generated at: ${new Date().toISOString()}`,
    '',
  ];

  results.forEach((result) => {
    lines.push(`## ${result.manifest}`);
    lines.push(
      `- Checked: ${result.checked} • Verified: ${result.verified} • Missing: ${result.missing} • Mismatches: ${result.mismatches}`,
    );
    lines.push('');
    lines.push('| Asset | Status | Notes |');
    lines.push('| --- | --- | --- |');
    result.entries.forEach((entry) => {
      let notes = '';
      if (entry.status === 'verified') {
        notes = `SHA256 ${entry.actual}`;
      } else if (entry.status === 'mismatch') {
        notes = `expected ${entry.expected} but computed ${entry.actual}`;
      } else if (entry.status === 'missing') {
        notes = `expected SHA256 ${entry.expected} but file not found`;
      } else if (entry.status === 'error') {
        notes = entry.error || 'error during verification';
      }

      lines.push(
        `| ${entry.name} | ${entry.status} | ${notes.replace(/\|/g, '\\|')} |`,
      );
    });
    lines.push('');
  });

  return lines.join('\n');
}

function writeVerificationReport() {
  const results = verifyManifests();
  const docsDir = path.resolve(__dirname, '../../docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  const markdownPath = path.join(
    docsDir,
    'canonical-funnel-verification.md',
  );
  const jsonPath = path.join(
    docsDir,
    'canonical-funnel-verification.json',
  );

  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  fs.writeFileSync(markdownPath, renderMarkdown(results));

  logger.info('Wrote canonical verification report', {
    markdownPath,
    jsonPath,
  });

  return {
    markdownPath,
    jsonPath,
  };
}

module.exports = {
  buildAssetLookup,
  extractHashReferences,
  resolveReferencePath,
  verifyManifests,
  renderMarkdown,
  writeVerificationReport,
};

if (require.main === module) {
  writeVerificationReport();
}
