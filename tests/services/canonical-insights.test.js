'use strict';

const fs = require('fs');
const path = require('path');
const {
  generateInsights,
  renderMarkdown,
  writeInsightsFiles,
} = require('../../src/services/canonical-insights');

describe('canonical insights', () => {
  it('generates trust record and manifest structures', () => {
    const insights = generateInsights();
    expect(insights.trustRecords.length).toBeGreaterThan(0);
    expect(insights.manifests.length).toBeGreaterThan(0);
  });

  it('renders markdown output', () => {
    const insights = generateInsights();
    const markdown = renderMarkdown(insights);
    expect(markdown).toContain('# Canonical Funnel Structural Insights');
    expect(markdown).toContain('## Trust Records');
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
