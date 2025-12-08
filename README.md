# Canonical Funnel CIDs

This repository is a public snapshot of the Canonical Funnel Economy dataset. It bundles the IPFS assets, consolidated metadata, and Node.js tooling used to explore, verify, and publish the archive.

## What is inside?
- **Data**: JSON, manifests, signatures, and related artifacts under `cfe_assets/` with summary indexes (`cfe_assets_summary.json`, `Complete_Structure_Consolidated.json`).
- **Services**: CLI-friendly modules in `src/services/` for collecting trust records, manifests, and verification results.
- **Docs & Reports**: Generated insights, reports, and verification summaries under `docs/`.
- **Tests**: Jest suites in `tests/` keep coverage above 90% and validate the service behaviors.

## Quick start
```bash
npm install
npm test -- --coverage
```

Explore the dataset and regenerate structural insights:
```bash
node src/services/canonical-funnel.js stats
node src/services/canonical-insights.js
```

## Canonical insights
`src/services/canonical-insights.js` inspects the dataset to describe trust-record and manifest structures. Running the module as the main entry point writes two artifacts:
- `docs/canonical-funnel-insights.json`: machine-readable structures.
- `docs/canonical-funnel-insights.md`: human-readable Markdown summary.

Refer to `tests/services/canonical-insights.test.js` for examples of caching behavior, missing-file handling, and structure mapping logic.
