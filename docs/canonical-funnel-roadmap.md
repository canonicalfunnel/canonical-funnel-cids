# Canonical Funnel Economy Roadmap

Generated: 2025-10-27T13:34Z

## Objectives
- Operationalize Canonical Funnel assets as a trustable knowledge and rights layer for AI agents.
- Monetize keyword ownership via leasing and allocation workflows backed by verifiable manifests.
- Provide governance, compliance, and provenance guarantees to downstream integrators.

## Near Term (0–3 months)
- **Insights integration**: Embed the canonical insights JSON (`docs/canonical-funnel-insights.json`) into analytics dashboards so product, legal, and AI teams can explore trust/manifest structures interactively.
- **Metadata API**: Ship the new `canonical-funnel` service as an internal API & CLI (`node src/services/canonical-funnel.js stats|trust|manifests`) to unblock agent development and automated checks.
- **Verification automation**: Run `node src/services/canonical-verifier.js` in CI to flag missing or mismatched hashes before publishing updates to Canonical Funnel.
- **Keyword distribution**: Use `docs/canonical-funnel-report.json` to confirm inventory (3M keywords, 1,100 category buckets) and publish a rights catalog for prospective lessees.

## Mid Term (3–6 months)
- **Leasing marketplace**: Link `canonical_funnel_allocation` documents with the NFT leasing service to auto-generate offers, pricing tiers, and usage policies.
- **Coverage KPIs**: Expand signature/hash coverage beyond the current 15.9% JSON subset by enforcing manifests for every new asset bundle.
- **AI provenance hooks**: Expose verified manifests as provenance payloads other agents can embed when responding to end users (aligns with Canonical Trust Record conclusions).
- **Allocation analytics**: Normalize allocation groups/entries (currently 14 detected) into a structured dataset for forecasting utilization and renewal schedules.

## Long Term (6–12 months)
- **External developer portal**: Offer a Canonical Funnel SDK referencing the service module, verification tooling, and allocation datasets for partners.
- **Adaptive governance**: Leverage governance manifests to drive DAO-like vote flows for future amendments; integrate with DID verification.
- **Cross-network notarization**: Register the verified manifests and trust records across chains/storage providers to harden provenance and improve discoverability.
- **Intelligent routing**: Train recommendation models on category buckets + allocation data to route leasing opportunities automatically to relevant industries.

## Next Steps
1. Wire the verification script into automated pipelines and document remediation for missing private keys.
2. Stand up a lightweight UI/CLI that queries the service module for keyword/lot insights on demand.
3. Prioritize product experiments that use verified manifests to unlock revenue (e.g., subscription keyword leasing tiers).
