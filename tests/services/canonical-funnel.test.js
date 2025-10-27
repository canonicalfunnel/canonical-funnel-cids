'use strict';

const path = require('path');
const {
  getAssetsDirectory,
  getIndexPath,
  loadAssetIndex,
  listGroups,
  listGroupItems,
  loadJsonAsset,
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
    expect(index.items_total).toBe(195);
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
