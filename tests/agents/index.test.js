'use strict';

jest.mock('../../src/services/storacha', () => ({
  ensureClient: jest.fn(),
  fetchCidJson: jest.fn(),
  fetchCidText: jest.fn(),
  listUploadRecords: jest.fn(),
  resolveGatewayUrl: jest.fn(),
}));

jest.mock('../../src/services/nft-leasing', () => ({
  createLeaseProposal: jest.fn(),
  extractLeaseDefaults: jest.fn(),
  finalizeLease: jest.fn(),
  validateLeaseTerms: jest.fn(),
}));

const storachaService = require('../../src/services/storacha');
const nftLeasingService = require('../../src/services/nft-leasing');

describe('Canonical Funnel agent', () => {
  const metadataFixture = require('../fixtures/sample-metadata.json');

  beforeEach(() => {
    process.env.CFE_IPFS_CID = 'bafy-test-cid';
    process.env.CFE_DID = 'did:key:lessor123';
    process.env.NODE_ENV = 'test';

    storachaService.fetchCidJson.mockResolvedValue(metadataFixture);
    storachaService.resolveGatewayUrl.mockReturnValue(
      'https://storacha.link/ipfs/bafy-test-cid',
    );

    nftLeasingService.extractLeaseDefaults.mockReturnValue({
      lesseeDid: metadataFixture.lesseeDid,
      terms: metadataFixture.leasing,
    });

    nftLeasingService.createLeaseProposal.mockImplementation((payload) => ({
      id: 'lease-proposal-1',
      status: 'pending',
      ...payload,
    }));

    nftLeasingService.finalizeLease.mockImplementation(async (proposal) => ({
      ...proposal,
      status: 'finalized',
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete require.cache[require.resolve('../../src/agents')];
  });

  it('builds a lease record using metadata defaults', async () => {
    const agent = require('../../src/agents');
    const result = await agent.runAgent({ autoFinalize: true });

    expect(storachaService.fetchCidJson).toHaveBeenCalledWith('bafy-test-cid');
    expect(nftLeasingService.createLeaseProposal).toHaveBeenCalledWith(
      expect.objectContaining({
        metadataCid: 'bafy-test-cid',
        lessorDid: 'did:key:lessor123',
        lesseeDid: metadataFixture.lesseeDid,
      }),
    );
    expect(nftLeasingService.finalizeLease).toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        cid: 'bafy-test-cid',
        metadata: metadataFixture,
        gatewayUrl: 'https://storacha.link/ipfs/bafy-test-cid',
      }),
    );
    expect(result.leaseRecord.status).toBe('finalized');
  });

  it('respects override terms and lessee DID', async () => {
    const agent = require('../../src/agents');

    const overrideTerms = {
      price: 2500,
      startDate: '2024-06-01T00:00:00Z',
      endDate: '2025-06-01T00:00:00Z',
      currency: 'DAI',
    };

    await agent.runAgent({
      lesseeDid: 'did:key:custom-lessee',
      terms: overrideTerms,
    });

    expect(nftLeasingService.createLeaseProposal).toHaveBeenCalledWith(
      expect.objectContaining({
        lesseeDid: 'did:key:custom-lessee',
        terms: expect.objectContaining({
          price: overrideTerms.price,
          currency: overrideTerms.currency,
          startDate: overrideTerms.startDate,
          endDate: overrideTerms.endDate,
          metadataCid: 'bafy-test-cid',
        }),
      }),
    );
  });

  it('returns pending lease when autoFinalize is disabled', async () => {
    const agent = require('../../src/agents');

    const result = await agent.runAgent({ autoFinalize: false });

    expect(nftLeasingService.finalizeLease).not.toHaveBeenCalled();
    expect(result.leaseRecord.status).toBe('pending');
  });

  it('prepares lease terms when no defaults are present', () => {
    nftLeasingService.extractLeaseDefaults.mockReturnValueOnce(undefined);
    const agent = require('../../src/agents');

    const prepared = agent.prepareLeaseTerms(
      {},
      'bafy-new-cid',
      {
        lesseeDid: 'did:key:override',
        terms: {
          price: 1500,
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2025-01-01T00:00:00Z',
        },
      },
    );

    expect(prepared.lesseeDid).toBe('did:key:override');
    expect(prepared.terms.metadataCid).toBe('bafy-new-cid');
  });

  it('throws when metadata CID is missing for lease creation', async () => {
    const agent = require('../../src/agents');
    await expect(agent.buildLeaseFromMetadata({}, {})).rejects.toThrow(
      'metadataCid is required to build a lease record',
    );
  });

  it('requires a CID when loading metadata', async () => {
    const agent = require('../../src/agents');
    await expect(agent.loadCanonicalMetadata()).rejects.toThrow(
      'A CID is required to load canonical metadata',
    );
  });

  it('runs the main entry point successfully', async () => {
    const agent = require('../../src/agents');
    process.exitCode = undefined;

    await agent.main();

    expect(process.exitCode).toBeUndefined();
  });

  it('sets an error exit code when main fails', async () => {
    const agent = require('../../src/agents');
    storachaService.fetchCidJson.mockRejectedValueOnce(new Error('boom'));
    const originalExitCode = process.exitCode;
    process.exitCode = undefined;

    await agent.main();

    expect(process.exitCode).toBe(1);
    process.exitCode = originalExitCode;
  });
});
