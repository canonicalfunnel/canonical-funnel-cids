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
});
