'use strict';

const { config } = require('../../src/config');
const storachaService = require('../../src/services/storacha');

describe('Storacha service', () => {
  let defaultCreateMock;

  beforeEach(() => {
    global.fetch = jest.fn();
    defaultCreateMock = jest.fn().mockResolvedValue({
      capability: {
        upload: {
          list: jest.fn().mockResolvedValue({ ok: true }),
        },
      },
    });

    storachaService.setClientModuleLoader(async () => ({ create: defaultCreateMock }));
    storachaService.setClientFactory(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete global.fetch;
    delete process.env.STORACHA_API_KEY;
    config.storacha.apiKey = undefined;
    storachaService.setClientFactory(undefined);
  });

  it('resolves gateway URLs with optional path segments', () => {
    const url = storachaService.resolveGatewayUrl('bafy-test', 'metadata.json');
    expect(url).toBe('https://storacha.link/ipfs/bafy-test/metadata.json');
    const sanitized = storachaService.resolveGatewayUrl('bafy-test', '/a/b');
    expect(sanitized).toBe('https://storacha.link/ipfs/bafy-test/a/b');
  });

  it('throws when resolving URL without a CID', () => {
    expect(() => storachaService.resolveGatewayUrl()).toThrow('A CID is required');
  });

  it('fetches CID content as text', async () => {
    const textMock = jest.fn().mockResolvedValue('{"name":"Asset"}');
    global.fetch.mockResolvedValue({
      ok: true,
      text: textMock,
    });

    const result = await storachaService.fetchCidText('bafy-test', {
      retryDelay: () => 0,
    });

    expect(result).toBe('{"name":"Asset"}');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://storacha.link/ipfs/bafy-test',
      expect.any(Object),
    );
  });

  it('parses CID content as JSON', async () => {
    const textMock = jest.fn().mockResolvedValue('{"ok":true}');
    global.fetch.mockResolvedValue({ ok: true, text: textMock });

    const json = await storachaService.fetchCidJson('bafy-test');
    expect(json).toEqual({ ok: true });
  });

  it('throws when CID payload is not valid JSON', async () => {
    const textMock = jest.fn().mockResolvedValue('not-json');
    global.fetch.mockResolvedValue({ ok: true, text: textMock });

    await expect(storachaService.fetchCidJson('bafy-test')).rejects.toThrow();
  });

  it('throws when fetch response is not ok', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 500 });

    await expect(
      storachaService.fetchCidText('bafy-test', { retryDelay: () => 0, retries: 0 }),
    ).rejects.toThrow('Failed to fetch CID bafy-test (500)');
  });

  it('retries failed fetch attempts before succeeding', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true, text: jest.fn().mockResolvedValue('success') });

    const text = await storachaService.fetchCidText('bafy-test', {
      retryDelay: () => 0,
      retries: 1,
    });

    expect(text).toBe('success');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('lists uploads via ensured client', async () => {
    const clientUploadList = jest.fn().mockResolvedValue({ ok: true });
    storachaService.setClientFactory(async () => ({
      capability: {
        upload: {
          list: clientUploadList,
        },
      },
    }));

    const result = await storachaService.listUploadRecords({
      size: 10,
      retryDelay: () => 0,
    });

    expect(result).toEqual({ ok: true });
    expect(clientUploadList).toHaveBeenCalledWith({
      cursor: undefined,
      size: 10,
    });
  });

  it('requires client factory overrides to be functions', () => {
    expect(() => storachaService.setClientFactory('invalid')).toThrow(
      'Client factory override must be a function',
    );
  });

  it('supports module loader overrides and forwards API keys', async () => {
    process.env.STORACHA_API_KEY = 'secret-token';
    config.storacha.apiKey = 'secret-token';
    const createMock = jest.fn().mockResolvedValue({
      capability: {
        upload: {
          list: jest.fn().mockResolvedValue({ ok: true }),
        },
      },
    });

    storachaService.setClientModuleLoader(async () => ({ create: createMock }));
    storachaService.setClientFactory(undefined);

    const client = await storachaService.ensureClient();
    expect(createMock).toHaveBeenCalledWith({ token: 'secret-token' });
    expect(client.capability.upload.list).toBeDefined();
  });

  it('throws when upload capability is missing', async () => {
    storachaService.setClientFactory(async () => ({}));
    await expect(storachaService.listUploadRecords()).rejects.toThrow(
      'Storacha client does not expose capability.upload.list',
    );
  });

  it('requires module loader overrides to be functions', () => {
    expect(() => storachaService.setClientModuleLoader('bad-loader')).toThrow(
      'Client module loader must be a function',
    );
  });

  it('throws if module loader does not provide a factory', async () => {
    storachaService.setClientModuleLoader(async () => ({ default: {} }));
    await expect(storachaService.ensureClient()).rejects.toThrow(
      'Unable to locate Storacha client factory function',
    );
  });
});
