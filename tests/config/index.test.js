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
});
