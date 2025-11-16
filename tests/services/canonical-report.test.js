'use strict';

const {
  generateReport,
  renderMarkdown,
  analyzeAllocationPayload,
  hasSignatureKey,
} = require('../../src/services/canonical-report');

const canonicalIndexFixture = require('../fixtures/canonical-funnel/Complete_Structure_Consolidated.json');

const EXPECTED_ITEMS_TOTAL = canonicalIndexFixture.items_total;

describe('canonical report service', () => {
  it('produces aggregate statistics', () => {
    const report = generateReport();
    expect(report.totals.assets).toBe(EXPECTED_ITEMS_TOTAL);
    expect(report.keywords.filesProcessed).toBeGreaterThanOrEqual(1);
    expect(report.signatures.binaryArtifacts).toBeGreaterThan(0);
  });

  it('renders markdown summary', () => {
    const report = generateReport();
    const markdown = renderMarkdown(report);
    expect(markdown).toContain('# Canonical Funnel Quantitative Report');
    expect(markdown).toContain('## Signatures & Hashes');
    expect(markdown).toContain('Fixture Lot');
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
        {
          name: 'Group B',
          entries: [
            { holder: 'holder-3', allocation_percentage: 50 },
          ],
        },
      ],
    };
    const result = analyzeAllocationPayload(payload);
    expect(result.groups).toBe(2);
    expect(result.entries).toBe(3);
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

  it('handles empty asset summary when generating reports', () => {
    jest.doMock('../../src/services/canonical-funnel', () => ({
      buildKeywordStats: jest.fn(() => ({
        filesProcessed: 0,
        keywords: 0,
        categories: 0,
        declaredLots: [],
        declaredCategoryTotals: [],
      })),
      loadAssetIndex: jest.fn(() => ({ items_total: 0, groups: {} })),
      loadAssetsSummary: jest.fn(() => []),
      loadJsonAsset: jest.fn(),
    }));

    jest.isolateModules(() => {
      const { generateReport } = require('../../src/services/canonical-report');
      const report = generateReport();
      expect(report.totals.assets).toBe(0);
      expect(report.totals.extensionBreakdown).toEqual({});
      expect(report.signatures.coverageRatio).toBe(0);
    });

    jest.dontMock('../../src/services/canonical-funnel');
    jest.resetModules();
  });

  it('renders markdown when keyword stats are empty', () => {
    const report = {
      generatedAt: '2024-01-01T00:00:00.000Z',
      totals: {
        assets: 0,
        groups: 0,
        extensionBreakdown: {},
      },
      keywords: {
        filesProcessed: 0,
        keywords: 0,
        categories: 0,
        declaredLots: [],
        declaredCategoryTotals: [],
      },
      allocations: { files: 0, groups: 0, entries: 0 },
      signatures: { binaryArtifacts: 0, jsonDocuments: 0, coverageRatio: 0 },
    };

    const markdown = renderMarkdown(report);
    expect(markdown).toContain('Declared lots: n/a');
    expect(markdown).toContain('Declared category totals: n/a');
  });
});
