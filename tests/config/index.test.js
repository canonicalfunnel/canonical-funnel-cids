'use strict';

describe('config module', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    delete process.env.CFE_IPFS_CID;
    delete process.env.CFE_DID;
  });

  it('provides default values when environment variables are missing', () => {
    const { getEnv } = require('../../src/config');
    expect(getEnv('NON_EXISTENT', { defaultValue: 'fallback' })).toBe('fallback');
  });

  it('throws when required environment variables are missing', () => {
    process.env.CFE_IPFS_CID = 'bafy-test-config';
    process.env.CFE_DID = 'did:key:test-config';
    const { getEnv } = require('../../src/config');
    expect(() => getEnv('ALSO_MISSING', { required: true })).toThrow(
      'Missing required environment variable: ALSO_MISSING',
    );
  });

  it('exposes resolved canonical funnel configuration', () => {
    process.env.CFE_IPFS_CID = 'bafy-test-config';
    process.env.CFE_DID = 'did:key:test-config';
    jest.resetModules();

    const { config } = require('../../src/config');
    expect(config.canonicalFunnel.ipfsCid).toBe('bafy-test-config');
    expect(config.canonicalFunnel.did).toBe('did:key:test-config');
  });

  it('skips loading when env file is missing', () => {
    process.env.CFE_IPFS_CID = 'bafy-test-config';
    process.env.CFE_DID = 'did:key:test-config';
    jest.doMock('fs', () => ({
      existsSync: jest.fn().mockReturnValue(false),
      readFileSync: jest.fn(),
    }));

    jest.isolateModules(() => {
      const { loadEnvFile } = require('../../src/config');
      loadEnvFile();
      const fsMock = require('fs');
      expect(fsMock.existsSync).toHaveBeenCalled();
      expect(fsMock.readFileSync).not.toHaveBeenCalled();
    });

    jest.dontMock('fs');
    jest.resetModules();
  });

  it('logs a warning when env file cannot be read', () => {
    process.env.CFE_IPFS_CID = 'bafy-test-config';
    process.env.CFE_DID = 'did:key:test-config';
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.doMock('fs', () => ({
      existsSync: jest.fn().mockReturnValue(true),
      readFileSync: jest.fn(() => {
        throw new Error('read error');
      }),
    }));

    jest.isolateModules(() => {
      const { loadEnvFile } = require('../../src/config');
      expect(() => loadEnvFile()).not.toThrow();
    });

    jest.dontMock('fs');
    jest.resetModules();
    warnSpy.mockRestore();
  });

  it('loads env file content only once and preserves existing values', () => {
    process.env.CFE_IPFS_CID = 'bafy-test-config';
    process.env.CFE_DID = 'did:key:test-config';
    process.env.ALREADY_SET = 'preset';

    const readFileSync = jest.fn(
      () => '# comment\nCFE_EXTRA=value-from-file\nALREADY_SET=ignored\nEMPTY=\n',
    );
    const existsSync = jest.fn().mockReturnValue(true);

    jest.doMock('fs', () => ({ existsSync, readFileSync }));

    jest.isolateModules(() => {
      const { loadEnvFile } = require('../../src/config');
      loadEnvFile();
      loadEnvFile();
      expect(existsSync).toHaveBeenCalledTimes(1);
      expect(readFileSync).toHaveBeenCalledTimes(1);
      expect(process.env.CFE_EXTRA).toBe('value-from-file');
      expect(process.env.ALREADY_SET).toBe('preset');
      expect(process.env.EMPTY).toBeUndefined();
    });

    delete process.env.ALREADY_SET;
    delete process.env.CFE_EXTRA;
    delete process.env.EMPTY;

    jest.dontMock('fs');
    jest.resetModules();
  });
});
