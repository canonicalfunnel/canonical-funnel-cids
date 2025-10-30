# Canonical Funnel Python SDK

Lightweight wrapper for the Canonical Funnel REST API.

## Installation

```bash
pip install -r requirements.txt
```

The SDK only depends on `requests`.

## Usage

```python
from canonical_funnel_sdk import CanonicalFunnelClient

client = CanonicalFunnelClient(
    base_url="https://api.example.com",
    api_key="your-api-key",
)

groups = client.list_groups()
print(groups)

trust_records = client.get_trust_records()
print(trust_records[0]["owner"])
```

## Commands

- `make lint` / `make test` (optional helpers in `Makefile`)

## Configuration

| Parameter | Description |
| --- | --- |
| `base_url` | REST endpoint (e.g., `http://localhost:8080`) |
| `api_key` | API key matching the server configuration |
| `timeout` | Request timeout (seconds, default 10) |

## License

Distributed alongside the Canonical Funnel dataset under the same license.
