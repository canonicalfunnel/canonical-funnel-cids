'use strict';

const {
  createLeaseProposal,
  extractLeaseDefaults,
  finalizeLease,
  validateLeaseTerms,
} = require('../../src/services/nft-leasing');

describe('NFT leasing service', () => {
  const baseTerms = {
    price: 1500,
    currency: 'USDC',
    paymentFrequency: 'monthly',
    startDate: '2024-01-01T00:00:00Z',
    endDate: '2025-01-01T00:00:00Z',
  };

  it('validates lease terms and normalizes values', () => {
    const result = validateLeaseTerms({
      ...baseTerms,
      price: '1500.50',
    });

    expect(result.price).toBeCloseTo(1500.5);
    expect(result.metadataCid).toBeUndefined();
  });

  it('defaults lease start date when omitted', () => {
    const result = validateLeaseTerms({
      price: 1000,
      endDate: '2125-01-01T00:00:00Z',
    });

    expect(result.startDate).toBeDefined();
  });

  it('rejects invalid lease prices and dates', () => {
    expect(() => validateLeaseTerms({ ...baseTerms, price: 0 })).toThrow(
      'Lease price must be a positive number',
    );
    expect(() => validateLeaseTerms({ ...baseTerms, endDate: undefined })).toThrow(
      'Lease end date is required',
    );
    expect(() =>
      validateLeaseTerms({
        ...baseTerms,
        startDate: '2025-01-01T00:00:00Z',
        endDate: '2024-01-01T00:00:00Z',
      }),
    ).toThrow('Lease end date must be after the start date');
  });

  it('creates lease proposals with deterministic identifiers', () => {
    const proposal = createLeaseProposal({
      metadataCid: 'bafy-leasing-test',
      lessorDid: 'did:key:lessor',
      lesseeDid: 'did:key:lessee',
      terms: {
        ...baseTerms,
      },
      metadataSnapshot: { slug: 'asset-1' },
    });

    expect(proposal).toMatchObject({
      metadataCid: 'bafy-leasing-test',
      lessorDid: 'did:key:lessor',
      lesseeDid: 'did:key:lessee',
      status: 'pending',
    });
    expect(typeof proposal.id).toBe('string');
  });

  it('requires metadata CID and lessor DID for proposals', () => {
    expect(() =>
      createLeaseProposal({ lessorDid: 'did:key:lessor', terms: baseTerms }),
    ).toThrow('A metadata CID is required to create a lease proposal');
    expect(() =>
      createLeaseProposal({ metadataCid: 'bafy', terms: baseTerms }),
    ).toThrow('A lessor DID is required to create a lease proposal');
  });

  it('respects metadata CID provided inside terms', () => {
    const proposal = createLeaseProposal({
      metadataCid: 'bafy-original',
      lessorDid: 'did:key:lessor',
      terms: {
        ...baseTerms,
        metadataCid: 'bafy-from-terms',
      },
    });

    expect(proposal.terms.metadataCid).toBe('bafy-from-terms');
  });

  it('finalizes lease proposals and calls submit handler', async () => {
    const proposal = createLeaseProposal({
      metadataCid: 'bafy-leasing-test',
      lessorDid: 'did:key:lessor',
      lesseeDid: 'did:key:lessee',
      terms: {
        ...baseTerms,
      },
    });

    const submitSpy = jest.fn().mockResolvedValue(true);
    const record = await finalizeLease(proposal, { submit: submitSpy });

    expect(record.status).toBe('finalized');
    expect(submitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: proposal.id,
        status: 'finalized',
      }),
    );
  });

  it('returns finalized record when no submit handler is provided', async () => {
    const proposal = createLeaseProposal({
      metadataCid: 'bafy-leasing-test',
      lessorDid: 'did:key:lessor',
      lesseeDid: 'did:key:lessee',
      terms: baseTerms,
    });

    const record = await finalizeLease(proposal, {});
    expect(record.status).toBe('finalized');
  });

  it('extracts defaults from metadata payloads', () => {
    const defaults = extractLeaseDefaults({
      leasing: baseTerms,
      lesseeDid: 'did:key:lessee',
    });

    expect(defaults).toMatchObject({
      lesseeDid: 'did:key:lessee',
      terms: baseTerms,
    });
  });

  it('returns undefined defaults when leasing block is missing', () => {
    expect(extractLeaseDefaults({})).toBeUndefined();
  });

  it('provides monthly payment frequency by default', () => {
    const defaults = extractLeaseDefaults({
      leasing: {
        price: 1000,
        currency: 'USDC',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2025-01-01T00:00:00Z',
      },
    });

    expect(defaults.terms.paymentFrequency).toBe('monthly');
  });

  it('throws when finalizing non-pending leases', async () => {
    await expect(
      finalizeLease({
        id: '1',
        status: 'finalized',
        metadataCid: 'bafy',
        lessorDid: 'did:key:lessor',
        lesseeDid: 'did:key:lessee',
        terms: baseTerms,
      }),
    ).rejects.toThrow('Only pending lease proposals can be finalized');
  });
});
