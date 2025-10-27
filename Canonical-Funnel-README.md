# Canonical Funnel CID Archive

Public snapshot of the Canonical Funnel Economy dataset, including all 195 IPFS assets, consolidated metadata, verification reports, and Node.js tooling for programmatic consumption.

- **Live repo:** https://github.com/canonicalfunnel/canonical-funnel-cids
- **Primary owner:** Nattapol Horrakangthong (`did:key:z6MknPNCcUaoLYzHyTMsbdrrvD4FRCA4k15yofsJ8DWVVUDK`)

---

## Contents

| Path | Description |
| --- | --- |
| `Complete_Structure_Consolidated.json` | Canonical index enumerating every CID, group, and timestamp. |
| `cfe_assets/` | Raw asset files fetched from IPFS (JSON, PDFs, images, binaries, signatures). |
| `cfe_assets_summary.json` | Machine-readable summary (one entry per asset with size, type, notes). |
| `cfe_assets_grouped_summary.json` | Assets grouped by shared JSON key structures. |
| `docs/canonical-funnel-insights.{md,json}` | Structural deep dives for trust records & manifests. |
| `docs/canonical-funnel-report.{md,json}` | Quantitative report (keywords, signature coverage, file types). |
| `docs/canonical-funnel-verification.{md,json}` | Hash/signature verification results. |
| `docs/canonical-funnel-roadmap.md` | Roadmap for productization and ecosystem adoption. |
| `docs/canonical-funnel-publication-guide.md` | Guide for mirroring/publishing this archive. |
| `src/services/` | Node.js service modules (CLI/API) for querying the dataset. |
| `tests/` | Jest test suite covering all service modules. |

---

## Quick Start

```bash
git clone https://github.com/canonicalfunnel/canonical-funnel-cids.git
cd canonical-funnel-cids
npm install
```

Run the CLI to inspect the dataset:

```bash
node src/services/canonical-funnel.js stats
node src/services/canonical-funnel.js trust
node src/services/canonical-funnel.js manifests
node src/services/canonical-funnel.js assets
```

Execute the verification and reports:

```bash
node src/services/canonical-verifier.js
node src/services/canonical-report.js
node src/services/canonical-insights.js
```

Run automated tests (coverage ≥ 90%):

```bash
npm test
```

---

## Programmatic Usage

```js
const {
  listGroups,
  listGroupItems,
  collectTrustRecords,
  collectManifestSummaries,
  buildKeywordStats,
} = require('./src/services/canonical-funnel');

console.log(listGroups()); // => ['canonical_funnel_wariphat', 'exclusive_master_canonical_wariphat']
console.log(listGroupItems('canonical_funnel_wariphat').length); // => 7

const trustRecords = collectTrustRecords();
console.log(trustRecords[0].record.SubZeroBinding.reference); // => 'U+2205'

const manifests = collectManifestSummaries();
console.log(manifests[0].structure); // Array describing object/array keys

const stats = buildKeywordStats();
console.log(stats.keywords); // => 3000000
```

Integrate into APIs by exposing the service functions in `src/services/` (Express/GraphQL ready). See `docs/canonical-funnel-publication-guide.md` for detailed deployment tips.

---

## Verification Workflow

1. Run `node src/services/canonical-verifier.js`.
2. Review `docs/canonical-funnel-verification.md` for any missing/mismatched hashes.
3. Inspect signature-bearing manifesets under `cfe_assets/exclusive_master_canonical_wariphat/`.
4. Cross-reference the quantitative report (`docs/canonical-funnel-report.md`) for coverage status.

This process confirms every CID payload matches the recorded hashes and signatures prior to redistribution.

---

## Publishing / Mirroring

Follow `docs/canonical-funnel-publication-guide.md` to:

1. Mirror the dataset into new repositories or IPFS gateways.
2. Customize README and documentation for your audience.
3. Automate verification in CI/CD (recommended: run `npm test` + `node src/services/canonical-verifier.js`).

---

## Contributing

1. Fork the repository.
2. Add/update assets or metadata (ensure new hashes/signatures are captured).
3. Run `npm test` and verification scripts.
4. Open a pull request with a summary of changes and verification results.

For significant dataset updates, please include regenerated reports under `docs/`.

---

## License

Metadata and code are provided for archival and educational purposes. Verify licensing and rights (see trust records and allocation manifests) before commercial usage. Contact canonicalfunnel (or relevant DID owners) for partnership or leasing inquiries.
