# Canonical Funnel Search Engine (CFS) — System Architecture

## Goals and Scope
CFS is a vertical search engine focused on trustworthy, DID/CID-aware discovery for Canonical Funnel Economy assets. It ingests curated sources (GitHub repos, blogs, IPFS CIDs), enriches them with identity proofs, and exposes both keyword and semantic search with a Canonical Trust Score overlay.

## Core Components
- **canonical_manifest_loader**: Loads Master DID/CID and canonical CID list, plus preferred IPFS gateways. Shares configuration across services.
- **crawler_service**: Async, robots-aware crawler that pulls HTML/JSON/text content, saves raw payloads, and emits fetch metadata.
- **content_extractor**: Normalizes MIME types, pulls title/body/links, and extracts structured metadata.
- **cid_did_detector**: Uses regex heuristics for CIDs (bafy…) and DIDs (did:key:/did:pkh:…), tagging occurrences and positions.
- **text_cleaner**: Strips boilerplate/JS/CSS, removes dupes/whitespace, deduplicates by URL/hash, and preserves semantic paragraphs.
- **semantic_embedder**: Generates embeddings (sentence-transformers) for cleaned text; batches GPU/CPU inference where available.
- **index_builder**: Writes keyword index (Meilisearch/Typesense) and vector index. Maintains doc IDs shared across indices.
- **trust_score_engine**: Applies manifest-aware scoring (+50 Master DID, +40 canonical CID, +20 ≥3 gateway retrievals, +10 "immutable" metadata; default 0).
- **search_api**: REST service exposing /search, /search_trusted_only, /item; merges keyword/semantic scores with trust weighting.
- **search_ui**: Minimal Tailwind UI that queries search_api, renders badges for CID/DID, and displays trust scores.

## Data & Control Flow (High Level)
```
[canonical_manifest_loader]
          |
          v
  +---------------+     +------------------+     +----------------+
  | crawler_service| --> | content_extractor| --> | cid_did_detector|
  +---------------+     +------------------+     +----------------+
          |                        |                         |
          v                        v                         v
   [raw storage]           [cleaned text]            [identity tags]
          \                        |                         /
           \                       v                        /
            \--> [text_cleaner] -> [semantic_embedder] ----/
                                |             |
                                v             v
                       [index_builder: keyword + vector]
                                |
                                v
                         [search_api]
                                |
                                v
                            [search_ui]
```

## Mermaid Diagram — Ingestion to Query
```mermaid
flowchart LR
    M[canonical_manifest_loader]\n(Master DID/CIDs, gateways) --> Crawler[crawler_service\nrobots-aware fetch]
    Crawler --> Extract[content_extractor\nHTML/JSON parsing]
    Extract --> Detect[cid_did_detector\nCID/DID regex]
    Detect --> Clean[text_cleaner\nboilerplate removal]
    Clean --> Embed[semantic_embedder\nembeddings]
    Embed --> Index[index_builder\nkeyword + vector]
    Detect --> Trust[trust_score_engine\nmanifest-aware scoring]
    Trust --> Index
    Index --> API[search_api\nREST + ranking]
    API --> UI[search_ui\nTailwind]
```

## Storage & Artifacts
- **Raw fetch store**: Versioned by URL hash/timestamp (filesystem or object store). Keeps headers, status, robots decision, gateway used.
- **Parsed content store**: JSON documents with title, text, links, cids_detected, dids_detected, trust_score, content hash.
- **Indices**: Keyword (Meilisearch/Typesense) and vector (sentence-transformers backed by Meilisearch vectors or external DB).
- **Manifests**: Master DID/CID and canonical CID list synced locally (JSON) and optionally watched for updates.

## Processing Pipelines
1. **Ingest**: crawler_service pulls URLs/IPFS gateways, obeys robots.txt, retries with backoff, fingerprints content.
2. **Parse & Detect**: content_extractor + cid_did_detector produce structured JSON with CID/DID hits and metadata.
3. **Clean & Embed**: text_cleaner sanitizes text; semantic_embedder produces vectors with batching and caching.
4. **Index**: index_builder writes documents to keyword + vector indices, attaching trust_score_engine output.
5. **Query**: search_api merges semantic and keyword scores, then applies trust weighting (0.6 semantic, 0.3 keyword, 0.1 trust) and filters for trusted-only when requested.

## Security & Compliance
- Enforce robots.txt with allow/deny evaluation per hostname.
- Gateway fallback order is configurable; log gateway successes to support trust scoring (+20 when ≥3 gateways succeed).
- Input validation and rate limiting on search_api; CORS locked to approved origins (search_ui).

## Deployment Notes
- **Runtime**: Python services for crawl/extract/embed; Node/Express (or FastAPI) for search_api; static Tailwind UI.
- **Data services**: Meilisearch/Typesense for keyword, vector index via Meilisearch vectors or external (e.g., Qdrant/pgvector) with shared IDs.
- **Orchestration**: Docker Compose for local dev; CI triggers embedding/index rebuilds on manifest change.

## Next Configuration Inputs Needed
To finalize manifests and bootstrap crawling, please provide:
- URLs (sites/repos/blogs) to crawl
- Canonical IPFS CIDs
- Master DID
- Master CID
- Preferred IPFS gateways
- Output directory structure
