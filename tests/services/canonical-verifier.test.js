'use strict';

const fs = require('fs');
const path = require('path');
const {
  verifyManifests,
  renderMarkdown,
  resolveReferencePath,
  writeVerificationReport,
  extractHashReferences,
  buildAssetLookup,
} = require('../../src/services/canonical-verifier');

describe('canonical verifier service', () => {
  it('builds lookup maps for assets', () => {
    const lookup = buildAssetLookup();
    expect(lookup.get('artifact.bin')).toEqual([
      'exclusive_master_canonical_wariphat/artifact.bin',
    ]);
  });

  it('extracts hash references from nested structures', () => {
    const references = extractHashReferences({
      file: 'direct.bin',
      sha256: 'abc',
      nested: [
        {
          name: 'next.bin',
          sha256: 'def',
        },
      ],
    });
    expect(references).toEqual([
      { file: 'direct.bin', sha256: 'abc' },
      { file: 'next.bin', sha256: 'def' },
    ]);
  });

  it('evaluates manifest references', () => {
    const results = verifyManifests();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty('manifest');
    expect(results[0].checked).toBe(2);
    expect(results[0].verified).toBe(2);
    expect(results[0].entries[0]).toEqual(
      expect.objectContaining({ status: 'verified' }),
    );
  });

  it('renders markdown report', () => {
    const results = verifyManifests();
    const markdown = renderMarkdown(results);
    expect(markdown).toContain('# Canonical Funnel Verification Report');
    expect(markdown).toContain('exclusive_master_canonical_wariphat');
    expect(markdown).toContain('verified');
  });

  it('renders markdown with all status pathways', () => {
    const markdown = renderMarkdown([
      {
        manifest: 'sample',
        checked: 4,
        verified: 1,
        mismatches: 1,
        missing: 1,
        entries: [
          { name: 'asset-a', status: 'verified', actual: 'abc123' },
          {
            name: 'asset-b',
            status: 'mismatch',
            expected: 'exp',
            actual: 'act',
          },
          { name: 'asset-c', status: 'missing', expected: 'exp' },
          { name: 'asset-d', status: 'error', error: 'boom' },
        ],
      },
    ]);
    expect(markdown).toContain('asset-b');
    expect(markdown).toContain('mismatch');
    expect(markdown).toContain('expected exp but computed act');
    expect(markdown).toContain('asset-d | error | boom');
  });

  it('resolves reference paths with direct and fallback matches', () => {
    const directLookup = new Map();
    directLookup.set('artifact.json', ['group/artifact.json']);
    const direct = resolveReferencePath(
      'artifact.json',
      'group',
      directLookup,
    );
    expect(direct).toBe('group/artifact.json');

    const fallbackLookup = new Map();
    fallbackLookup.set('001_artifact.json', [
      'group/001_artifact.json',
      'other/001_artifact.json',
    ]);
    const fallback = resolveReferencePath(
      'artifact.json',
      'group',
      fallbackLookup,
    );
    expect(fallback).toBe('group/001_artifact.json');

    const missing = resolveReferencePath(
      'unknown.json',
      'group',
      fallbackLookup,
    );
    expect(missing).toBeUndefined();
  });

  it('writes verification report and creates docs directory when missing', () => {
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

    const result = writeVerificationReport();

    expect(mkdirSpy).toHaveBeenCalled();
    expect(writeSpy).toHaveBeenCalledTimes(2);
    expect(result).toHaveProperty('jsonPath');

    existsSpy.mockRestore();
    mkdirSpy.mockRestore();
    writeSpy.mockRestore();
  });

  it('writes verification report when docs directory exists', () => {
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

    const result = writeVerificationReport();

    expect(writeSpy).toHaveBeenCalledTimes(2);
    expect(result).toHaveProperty('markdownPath');

    existsSpy.mockRestore();
    writeSpy.mockRestore();
  });
});
