'use strict';

const path = require('path');
const {
  getAssetsDirectory,
  getIndexPath,
  loadAssetIndex,
  listGroups,
  listGroupItems,
  loadJsonAsset,
  loadGroupedSummary,
  collectTrustRecords,
  collectManifestSummaries,
  resolveAssetPath,
  describeStructure,
  buildKeywordStats,
  runCli,
} = require('../../src/services/canonical-funnel');

describe('canonical funnel service', () => {
  it('exposes canonical asset locations', () => {
    const baseDir = getAssetsDirectory();
    const indexPath = getIndexPath();
    expect(path.isAbsolute(baseDir)).toBe(true);
    expect(path.isAbsolute(indexPath)).toBe(true);
  });

  it('loads asset index with expected groups', () => {
    const index = loadAssetIndex();
    expect(index.items_total).toBe(15);
    expect(Object.keys(index.groups || {})).toContain(
      'canonical_funnel_wariphat',
    );
  });

  it('lists items from a canonical group', () => {
    const items = listGroupItems('canonical_funnel_wariphat');
    expect(items.length).toBeGreaterThanOrEqual(7);
    expect(items[0]).toHaveProperty('name');
  });

  it('loads trust record json payloads', () => {
    const payload = loadJsonAsset(
      'exclusive_master_canonical_wariphat/133_canonical_trust_record.json',
    );
    expect(payload).toHaveProperty('CanonicalTrustRecord');
  });

  it('collects trust record summaries', () => {
    const records = collectTrustRecords();
    expect(records.length).toBeGreaterThanOrEqual(1);
    expect(records[0].owner).toEqual('Nattapol Horrakangthong');
    expect(records[0].masterDid).toMatch(/^z6M/);
  });

  it('throws when accessing unknown group', () => {
    expect(() => listGroupItems('unknown_group')).toThrow(
      'Unknown canonical funnel group',
    );
  });

  it('requires group name when listing items', () => {
    expect(() => listGroupItems()).toThrow('Group name is required');
  });

  it('throws when resolving unknown asset paths', () => {
    expect(() => resolveAssetPath()).toThrow(
      'Relative asset path is required',
    );
    expect(() => resolveAssetPath('missing.json')).toThrow(
      /Missing canonical funnel asset file/,
    );
  });

  it('provides structural descriptions for primitives', () => {
    const details = describeStructure({ value: 1, nested: { flag: true } });
    const numberEntry = details.find((entry) => entry.type === 'number');
    const boolEntry = details.find(
      (entry) => entry.path === 'nested.flag' && entry.type === 'boolean',
    );
    expect(numberEntry).toBeDefined();
    expect(boolEntry).toBeDefined();
  });

  it('respects describeStructure entry limits', () => {
    const details = describeStructure(
      { values: [1, 2, 3], nested: { inner: true } },
      { maxEntries: 1 },
    );
    expect(details.length).toBe(1);
  });

  it('loads grouped asset summary metadata', () => {
    const summary = loadGroupedSummary();
    expect(summary).toHaveProperty('groups');
    expect(Array.isArray(summary.groups)).toBe(true);
  });

  it('collects manifest structures', () => {
    const manifests = collectManifestSummaries();
    expect(manifests.length).toBeGreaterThanOrEqual(1);
    expect(manifests[0]).toHaveProperty('structure');
    expect(Array.isArray(manifests[0].structure)).toBe(true);
  });

  it('computes keyword statistics', () => {
    const stats = buildKeywordStats();
    expect(stats.filesProcessed).toBeGreaterThan(0);
    expect(stats.keywords).toBeGreaterThan(0);
  });

  it('continues keyword aggregation when a file cannot be parsed', () => {
    jest.isolateModules(() => {
      const fs = require('fs');
      const originalRead = fs.readFileSync;
      const readSpy = jest
        .spyOn(fs, 'readFileSync')
        .mockImplementation((target, ...args) => {
          if (
            typeof target === 'string' &&
            target.includes(
              '001_canonical-funnel-lot2-1M-with-updated-metadata.json',
            )
          ) {
            throw new Error('forced read failure');
          }
          return originalRead.call(fs, target, ...args);
        });

      const funnel = require('../../src/services/canonical-funnel');
      const stats = funnel.buildKeywordStats();
      expect(stats.filesProcessed).toBe(2);
      expect(stats.keywords).toBeGreaterThan(0);

      readSpy.mockRestore();
    });
  });

  it('handles keyword payloads missing optional sections', () => {
    jest.isolateModules(() => {
      const fs = require('fs');
      const originalRead = fs.readFileSync;
      const replacement = JSON.stringify({ funnels: { primary: 'not-an-array' } });
      const readSpy = jest
        .spyOn(fs, 'readFileSync')
        .mockImplementation((target, ...args) => {
          if (
            typeof target === 'string' &&
            target.includes('003_canonical-funnel-lot1-1M.json')
          ) {
            return replacement;
          }
          return originalRead.call(fs, target, ...args);
        });

      const funnel = require('../../src/services/canonical-funnel');
      const stats = funnel.buildKeywordStats();
      expect(stats.filesProcessed).toBeGreaterThan(0);
      expect(Array.isArray(stats.declaredLots)).toBe(true);

      readSpy.mockRestore();
    });
  });
});

describe('canonical funnel CLI', () => {
  let logSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('prints help when no command provided', () => {
    runCli([]);
    expect(logSpy).toHaveBeenCalled();
  });

  it('handles stats command', () => {
    runCli(['stats']);
    expect(logSpy).toHaveBeenCalled();
  });

  it('handles trust command', () => {
    runCli(['trust']);
    expect(logSpy).toHaveBeenCalled();
  });

  it('handles manifests command', () => {
    runCli(['manifests']);
    expect(logSpy).toHaveBeenCalled();
  });

  it('handles assets command', () => {
    runCli(['assets']);
    expect(logSpy).toHaveBeenCalled();
  });

  it('throws on unknown command', () => {
    expect(() => runCli(['unknown'])).toThrow(
      'Unknown canonical-funnel command: unknown',
    );
  });
});
