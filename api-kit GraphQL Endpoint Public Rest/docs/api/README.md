# Canonical Funnel API

Public REST + GraphQL interface for querying Canonical Funnel metadata.

## Overview

- **Entry point**: `api/server.js`
- **REST base URL**: `/api/v1` (configurable via `CFE_API_VERSION`, default `v1`)
- **GraphQL endpoint**: `/graphql`
- **Auth**: API key required when `CFE_API_KEY` is set (send via `x-api-key` header or `apiKey` query param)
- **Rate limiting**: Defaults to 100 requests / 15 minutes per IP (`CFE_API_MAX_REQUESTS`, `CFE_API_WINDOW_MS`)

## Quick Start

```bash
npm install
export CFE_API_KEY="your-secret-key"
npm run start:api
```

### REST Examples

```bash
curl -H "x-api-key: $CFE_API_KEY" http://localhost:8080/api/v1/groups
curl -H "x-api-key: $CFE_API_KEY" http://localhost:8080/api/v1/groups/canonical_funnel_wariphat/items
curl -H "x-api-key: $CFE_API_KEY" http://localhost:8080/api/v1/trust-records
```

### GraphQL Example

```bash
curl -H "Content-Type: application/json" \
     -H "x-api-key: $CFE_API_KEY" \
     -d '{ "query": "{ groups trustRecords { owner masterDid } }" }' \
     http://localhost:8080/graphql
```

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `CFE_API_PORT` | `8080` | API listening port |
| `CFE_API_KEY` | _unset_ | Shared secret for REST/GraphQL; if unset auth is disabled |
| `CFE_API_MAX_REQUESTS` | `100` | Maximum requests per window per IP |
| `CFE_API_WINDOW_MS` | `900000` | Rate-limit window (ms) |
| `CFE_API_CORS_ORIGIN` | `*` | Allowed CORS origin |
| `CFE_API_ENABLE_REST` | `true` | Toggle REST routes |
| `CFE_API_ENABLE_GRAPHQL` | `true` | Toggle GraphQL endpoint |

## Documentation Assets

- `openapi.yaml` – Swagger/OpenAPI 3.1 definition
- `postman-collection.json` – Postman collection with sample requests
- `python/` – Python SDK
- `rust/` – Rust binding

## Deployment Checklist

1. Ensure dataset/environment variables (`CFE_*`) resolved (see project README).
2. Configure API key and rate limits appropriate for public access.
3. Host behind HTTPS reverse proxy (e.g., Nginx) and configure caching if required.
4. Set up monitoring/metrics (e.g., Prometheus, CloudWatch) per operational needs.
5. Publish docs (`openapi.yaml`, Postman) with your preferred developer portal.
