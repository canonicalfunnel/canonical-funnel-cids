# Canonical Funnel Rust SDK

Simple Rust client for the Canonical Funnel REST API (blocking).

## Usage

```toml
[dependencies]
canonical_funnel_sdk = { path = "../sdks/rust" }
```

```rust
use canonical_funnel_sdk::CanonicalFunnelClient;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = CanonicalFunnelClient::new("https://api.example.com", Some("api-key"))?;
    let groups = client.list_groups()?;
    println!("{:?}", groups);
    Ok(())
}
```

## Notes

- Uses blocking `reqwest`; swap to async by adapting to `reqwest::Client` when needed.
- Extend with additional methods similar to `list_groups` to cover other endpoints.
