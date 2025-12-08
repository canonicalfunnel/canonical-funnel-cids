'use strict';

const fs = require('fs');
const path = require('path');
const {
  generateInsights,
  renderMarkdown,
  writeInsightsFiles,
  loadCuratedInsights,
  loadRawInsights,
  getInsightsPath,
  __resetInsightsCache,
  runWhenMain,
} = require('../../src/services/canonical-insights');

describe('canonical insights', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    __resetInsightsCache();
  });

  it('generates trust record and manifest structures', () => {
    const insights = generateInsights();
    expect(insights.trustRecords.length).toBeGreaterThan(0);
    expect(insights.manifests.length).toBeGreaterThan(0);
    const trustStructure = insights.trustRecords[0].structure;
    const manifestStructure = insights.manifests[0].structure;
    expect(trustStructure.some((entry) => entry.type === 'object')).toBe(true);
    expect(manifestStructure.some((entry) => entry.type === 'array')).toBe(true);
  });

  it('renders markdown output with manifest data', () => {
    const insights = generateInsights();
    const markdown = renderMarkdown(insights);
    expect(markdown).toContain('# Canonical Funnel Structural Insights');
    expect(markdown).toContain('## Trust Records');
    expect(markdown).toContain('## Manifests');
    expect(markdown).toContain('exclusive_master_canonical_wariphat/005');
  });

  it('writes insights files and creates docs directory when missing', () => {
    const docsDir = path.resolve(__dirname, '../../docs');
    const originalExists = fs.existsSync;
    const existsSpy = jest
      .spyOn(fs, 'existsSync')
      .mockImplementation((target) => {
        if (target === docsDir) {
          return false;
        }
        return originalExists.call(fs, target);
      });
    const mkdirSpy = jest
      .spyOn(fs, 'mkdirSync')
      .mockImplementation(() => {});
    const writeSpy = jest
      .spyOn(fs, 'writeFileSync')
      .mockImplementation(() => {});

    const result = writeInsightsFiles();

    expect(mkdirSpy).toHaveBeenCalled();
    expect(writeSpy).toHaveBeenCalledTimes(2);
    expect(result).toHaveProperty('markdownPath');

  });

  it('writes insights files when docs directory already exists', () => {
    const docsDir = path.resolve(__dirname, '../../docs');
    const originalExists = fs.existsSync;
    const existsSpy = jest
      .spyOn(fs, 'existsSync')
      .mockImplementation((target) => {
        if (target === docsDir) {
          return true;
        }
        return originalExists.call(fs, target);
      });
    const writeSpy = jest
      .spyOn(fs, 'writeFileSync')
      .mockImplementation(() => {});

    const result = writeInsightsFiles();

    expect(writeSpy).toHaveBeenCalledTimes(2);
    expect(result).toHaveProperty('jsonPath');

  });

  it('uses cached insights without re-reading the source file', () => {
    jest.isolateModules(() => {
      jest.doMock('fs', () => ({
        existsSync: jest.fn(() => true),
        readFileSync: jest
          .fn()
          .mockReturnValue(
            JSON.stringify({ generatedAt: 'now', trustRecords: [], manifests: [] }),
          ),
      }));

      const { loadCuratedInsights, __resetInsightsCache } = require(
        '../../src/services/canonical-insights',
      );
      const fsMock = require('fs');

      loadCuratedInsights();
      fsMock.readFileSync.mockClear();

      expect(loadCuratedInsights()).toEqual({
        generatedAt: 'now',
        trustStructures: [],
        manifestPatterns: [],
      });
      expect(fsMock.readFileSync).not.toHaveBeenCalled();

    });
  });

  it('throws a helpful error when the insights file is missing', () => {
    jest.isolateModules(() => {
      jest.doMock('fs', () => ({
        existsSync: jest.fn(() => false),
        readFileSync: jest.fn(),
      }));

      const { loadRawInsights } = require('../../src/services/canonical-insights');

      expect(() => loadRawInsights()).toThrow(/Missing canonical insights file/);

    });
  });

  it('handles insight structures that omit optional fields', () => {
    jest.isolateModules(() => {
      jest.doMock('fs', () => ({
        existsSync: jest.fn(() => true),
        readFileSync: jest.fn(() =>
          JSON.stringify({
            generatedAt: 'now',
            trustRecords: [
              {
                relative: 'trust.json',
                owner: 'Owner Fixture',
                masterDid: 'did:key:fixture',
                masterCid: 'bafy-fixture',
                structure: [{ type: 'object' }, { path: 'entry', type: 'string' }],
              },
            ],
            manifests: [
              {
                relative: 'manifest.json',
                keys: ['entries'],
                structure: [{ type: 'array', sampleSize: 2 }],
              },
            ],
          }),
        ),
      }));

      const { loadCuratedInsights } = require('../../src/services/canonical-insights');
      const curated = loadCuratedInsights();

      expect(curated.trustStructures[0].structure[0]).toEqual({
        path: '(root)',
        type: 'object',
        detail: '',
      });
      expect(curated.trustStructures[0].structure[1]).toEqual({
        path: 'entry',
        type: 'string',
        detail: '',
      });
      expect(curated.manifestPatterns[0].structure[0]).toEqual({
        path: '(root)',
        type: 'array',
        detail: '',
      });

    });
  });

  it('runs insights generation when executed as the main module', () => {
    jest.isolateModules(() => {
      jest.doMock('fs', () => ({
        existsSync: jest.fn(() => true),
        readFileSync: jest.fn(() =>
          JSON.stringify({ generatedAt: 'now', trustRecords: [], manifests: [] }),
        ),
        writeFileSync: jest.fn(),
        mkdirSync: jest.fn(),
      }));

      const insightsModulePath = '../../src/services/canonical-insights';
      // eslint-disable-next-line global-require
      const insights = require(insightsModulePath);
      const writeSpy = jest
        .spyOn(insights, 'writeInsightsFiles')
        .mockReturnValue({ markdownPath: '', jsonPath: '' });

      insights.runWhenMain({ filename: require.resolve(insightsModulePath) });
      expect(writeSpy).toHaveBeenCalled();

      writeSpy.mockRestore();
      jest.dontMock('fs');
    });
  });

  it('maps structure entries across supported entry types', () => {
    jest.doMock('../../src/services/canonical-funnel', () => ({
      collectTrustRecords: jest.fn(() => [
        {
          relative: 'trust.json',
          owner: 'Owner Fixture',
          masterDid: 'did:key:fixture',
          masterCid: 'bafy-fixture',
          record: { data: ['abc'] },
        },
      ]),
      collectManifestSummaries: jest.fn(() => [
        {
          relative: 'manifest.json',
          keys: ['entries'],
          structure: [
            { path: '', type: 'object', keys: ['entries'] },
            { path: 'entries', type: 'array', sampleSize: 2 },
            { path: 'entries[0].sha', type: 'string', value: 'abc' },
          ],
        },
      ]),
      describeStructure: jest.fn(() => [
        { path: '', type: 'object', keys: ['data'] },
        { path: 'data', type: 'array', sampleSize: 1 },
        { path: 'data[0]', type: 'string', value: 'abc' },
        { path: 'flag', type: 'boolean' },
      ]),
    }));

    jest.isolateModules(() => {
      const { generateInsights } = require('../../src/services/canonical-insights');
      const insights = generateInsights();
      expect(insights.trustRecords[0].structure[0]).toMatchObject({
        type: 'object',
        detail: 'data',
      });
      expect(insights.trustRecords[0].structure[1]).toMatchObject({
        type: 'array',
        detail: 'length≈1',
      });
      expect(insights.trustRecords[0].structure[2]).toMatchObject({
        type: 'string',
        detail: '"abc"',
      });
      expect(insights.trustRecords[0].structure[3]).toMatchObject({
        type: 'boolean',
        detail: '',
      });
      expect(insights.manifests[0].structure[1]).toMatchObject({
        type: 'array',
        detail: 'length≈2',
      });
    });

    jest.dontMock('../../src/services/canonical-funnel');
    jest.resetModules();
  });
});
