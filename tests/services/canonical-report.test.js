'use strict';

const {
  generateReport,
  renderMarkdown,
  analyzeAllocationPayload,
  hasSignatureKey,
} = require('../../src/services/canonical-report');

describe('canonical report service', () => {
  it('produces aggregate statistics', () => {
    const report = generateReport();
    expect(report.totals.assets).toBe(195);
    expect(report.keywords.filesProcessed).toBeGreaterThanOrEqual(1);
    expect(report.signatures.binaryArtifacts).toBeGreaterThan(0);
  });

  it('renders markdown summary', () => {
    const report = generateReport();
    const markdown = renderMarkdown(report);
    expect(markdown).toContain('# Canonical Funnel Quantitative Report');
    expect(markdown).toContain('## Signatures & Hashes');
  });

  it('analyzes allocation payload structures', () => {
    const payload = {
      groups: [
        {
          name: 'Group A',
          entries: [
            { rights_holder: 'holder-1', allocation_share: 60 },
            { rights_holder: 'holder-2', allocation_share: 40 },
          ],
        },
      ],
    };
    const result = analyzeAllocationPayload(payload);
    expect(result.groups).toBeGreaterThanOrEqual(1);
    expect(result.entries).toBeGreaterThanOrEqual(2);
  });

  it('detects signature fields inside nested structures', () => {
    const payload = {
      data: [
        {
          metadata: {
            signature_base64: 'abc',
          },
        },
      ],
    };
    expect(hasSignatureKey(payload)).toBe(true);
    expect(hasSignatureKey({})).toBe(false);
  });
});
