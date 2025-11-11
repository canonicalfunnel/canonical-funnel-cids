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
    expect(report.totals.assets).toBe(6);
    expect(report.totals.groups).toBe(2);
    expect(report.keywords.filesProcessed).toBe(3);
    expect(report.keywords.keywords).toBe(12);
    expect(report.signatures.binaryArtifacts).toBe(2);
    expect(report.signatures.jsonDocuments).toBeGreaterThanOrEqual(1);
    expect(report.allocations.files).toBe(1);
    expect(report.allocations.entries).toBe(2);
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

  it('handles allocation and signature parsing failures gracefully', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    jest.isolateModules(() => {
      jest.doMock('../../src/services/canonical-funnel', () => ({
        buildKeywordStats: jest.fn(() => ({
          filesProcessed: 0,
          keywords: 0,
          categories: 0,
          declaredLots: [],
          declaredCategoryTotals: [],
        })),
        loadAssetIndex: jest.fn(() => ({ items_total: 0, groups: {} })),
        loadAssetsSummary: jest.fn(() => [
          { file: 'artifact-without-extension' },
          { file: 'exclusive/allocation.json' },
          { file: 'exclusive/signature.json' },
          { file: 'exclusive/signature.sig' },
        ]),
        loadJsonAsset: jest.fn(() => {
          throw new Error('boom');
        }),
      }));

      const report = require('../../src/services/canonical-report');
      const result = report.generateReport();
      expect(result.allocations.files).toBe(1);
      expect(result.signatures.binaryArtifacts).toBe(2);
      expect(result.totals.extensionBreakdown.none).toBe(1);
      jest.dontMock('../../src/services/canonical-funnel');
    });

    warnSpy.mockRestore();
  });
});
