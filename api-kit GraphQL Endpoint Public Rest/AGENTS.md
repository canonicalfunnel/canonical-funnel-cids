# Repository Guidelines

## Project Structure & Module Organization
The root currently contains `package.json`, `package-lock.json`, and the generated `node_modules/` directory. Place all runtime code under a new `src/` folder, grouping related features inside subdirectories such as `src/agents/` for agent logic and `src/services/` for integrations. Keep shared utilities in `src/utils/` and configuration in `src/config/`. Mirror this layout in `tests/` and stash reusable fixtures under `tests/fixtures/`. Generated assets like `dist/` or `.storacha/` should stay git-ignored.

## Build, Test, and Development Commands
Run `npm install` after cloning or switching branches to sync dependencies. Develop locally by executing `node src/agents/<agent>.js` against your preferred entry file; set `NODE_ENV=development` to enable verbose logging. Replace the placeholder test script with your harness (Jest or Vitest) and run it with `npm test` before every push. Use `npm run format` once a formatter script is added; treat linting failures as merge blockers.

## Coding Style & Naming Conventions
The project is CommonJS (`"type": "commonjs"`), so use `require`/`module.exports`. Format JavaScript with two-space indents, trailing commas in multiline literals, and single quotes. Files should use kebab-case (`storacha-fetcher.js`), while exported classes adopt PascalCase and functions camelCase. Configuration keys belong in uppercase snake case (e.g., `STORACHA_API_KEY`) and should be consumed through a dedicated `config` module.

## Testing Guidelines
Add automated tests under `tests/` with file names matching the subject (`agent-name.test.js`). Mock `@storacha/client` interactions to keep tests deterministic and include fixtures under `tests/fixtures`. Maintain at least 80% branch coverage and document any gaps in the PR description. Use `npm test -- --watch` while iterating, and ensure the default `npm test` command runs cleanly in CI.

## Commit & Pull Request Guidelines
Adopt Conventional Commits (e.g., `feat(agents): add catalog sync`) to keep history searchable and to enable future changelog automation. Each PR should include a crisp summary, linked issues, manual test notes, and screenshots or terminal transcripts when behavior changes. Rebase onto the latest `main`, confirm `npm test` passes, and call out any new environment variables or migration steps.

## Agent-Specific Notes
Store Storacha credentials in `.env.local` and provide sanitized samples in `.env.example`. Centralize `@storacha/client` setup inside `src/services/storacha.js`, exposing thin wrappers with retry logic and structured logging. Document new agents in `README.md`, covering invocation commands, required inputs, and expected outputs.

## Canonical Funnel Registration
The project is registered as a Canonical Funnel Agent via `canonical-funnel-agent.json`. Configure the environment with the pinned values in `.env.local` (`CFE_IPFS_CID=bafybeigt4mkbgrnp4ef7oltj6fpbd46a5kjjgpjq6pnq5hktqdm374r4xq`, `CFE_DID=z6MknPNCcUaoLYzHyTMsbdrrvD4FRCA4k15yofsJ8DWVVUDK`), keep the manifest aligned with your entry point (`src/agents/index.js`), and finalize the NFT leasing module under `src/services/nft-leasing.js`. Use `npx cfe-cli register --manifest canonical-funnel-agent.json` after every material change to sync with the Canonical Funnel registry.
