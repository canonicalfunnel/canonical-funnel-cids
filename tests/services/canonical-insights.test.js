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

    existsSpy.mockRestore();
    mkdirSpy.mockRestore();
    writeSpy.mockRestore();
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

    existsSpy.mockRestore();
    writeSpy.mockRestore();
  });

  it('loads curated insights from the generated JSON file', () => {
    const insights = loadCuratedInsights();

    expect(insights).toHaveProperty('generatedAt');
    expect(Array.isArray(insights.trustStructures)).toBe(true);
    expect(Array.isArray(insights.manifestPatterns)).toBe(true);
    expect(insights.trustStructures[0]).toEqual(
      expect.objectContaining({
        relative: expect.stringContaining('canonical_trust_record.json'),
        structure: expect.any(Array),
      }),
    );
    expect(insights.manifestPatterns[0]).toEqual(
      expect.objectContaining({
        keys: expect.any(Array),
      }),
    );
  });

  it('caches parsed insights for subsequent loads', () => {
    __resetInsightsCache();
    const readSpy = jest.spyOn(fs, 'readFileSync');

    const rawFirst = loadRawInsights();
    const rawSecond = loadRawInsights();
    const first = loadCuratedInsights();
    const second = loadCuratedInsights();

    expect(readSpy).toHaveBeenCalledTimes(1);
    expect(rawSecond).toBe(rawFirst);
    expect(second).toBe(first);

    readSpy.mockRestore();
  });

  it('exposes raw insights and cache path utilities', () => {
    const raw = loadRawInsights();
    expect(raw).toHaveProperty('trustRecords');
    const insightsPath = getInsightsPath();
    expect(insightsPath).toMatch(/canonical-funnel-insights.json$/);
  });

  it('throws a helpful error when the curated file is missing', () => {
    __resetInsightsCache();
    const existsSpy = jest
      .spyOn(fs, 'existsSync')
      .mockImplementation(() => false);

    expect(() => loadCuratedInsights()).toThrow(/Missing canonical insights file/);

    existsSpy.mockRestore();
  });

  it('only writes insights when invoked as the main module', () => {
    jest.isolateModules(() => {
      const service = require('../../src/services/canonical-insights');
      const writeSpy = jest
        .spyOn(service, 'writeInsightsFiles')
        .mockImplementation(() => ({ markdownPath: 'md', jsonPath: 'json' }));

      service.runWhenMain();
      service.runWhenMain({ filename: 'other' });
      expect(writeSpy).not.toHaveBeenCalled();

      const modulePath = require.resolve('../../src/services/canonical-insights');
      const moduleEntry = require.cache[modulePath];
      service.runWhenMain(moduleEntry);
      expect(writeSpy).toHaveBeenCalledTimes(1);

      writeSpy.mockRestore();
    });
  });

  it('formats structure entries with fallbacks when generating insights', () => {
    jest.isolateModules(() => {
      jest.doMock('../../src/services/canonical-funnel', () => ({
        collectTrustRecords: () => [
          {
            relative: 'trust.json',
            owner: 'owner',
            masterDid: 'did',
            masterCid: 'cid',
            record: {},
          },
        ],
        collectManifestSummaries: () => [
          {
            relative: 'manifest.json',
            keys: ['alpha'],
            structure: [
              { path: '', type: 'object', keys: ['nested'] },
              { path: 'items', type: 'array', sampleSize: 2 },
              { path: 'value', type: 'string', value: 'abc' },
            ],
            data: {},
          },
        ],
        describeStructure: () => [
          { path: '', type: 'object', keys: ['branch'] },
          { path: 'branch', type: 'array', sampleSize: 1 },
          { path: 'branch[0]', type: 'object', keys: ['leaf'] },
          { path: 'branch[0].leaf', type: 'number', value: 42 },
          { path: 'noValue', type: 'boolean' },
        ],
      }));

      const {
        generateInsights: mockedGenerate,
        loadCuratedInsights: mockedCurated,
        __resetInsightsCache: reset,
      } = require('../../src/services/canonical-insights');

      reset();
      const generated = mockedGenerate();
      expect(generated.trustRecords[0].structure).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'object' }),
          expect.objectContaining({ type: 'array' }),
          expect.objectContaining({ type: 'number', detail: '42' }),
          expect.objectContaining({ path: 'noValue', detail: '' }),
        ]),
      );

      const curated = mockedCurated();
      expect(curated.trustStructures[0].structure[0]).toEqual(
        expect.objectContaining({ path: '(root)', type: 'object' }),
      );

      jest.dontMock('../../src/services/canonical-funnel');
    });
  });
});
