use reqwest::blocking::Client;
use reqwest::header::HeaderMap;
use serde::Deserialize;

#[derive(Clone)]
pub struct CanonicalFunnelClient {
    base_url: String,
    api_key: Option<String>,
    client: Client,
}

impl CanonicalFunnelClient {
    pub fn new(base_url: &str, api_key: Option<&str>) -> Result<Self, reqwest::Error> {
        let client = Client::builder().build()?;
        Ok(Self {
            base_url: base_url.trim_end_matches('/').to_string(),
            api_key: api_key.map(|key| key.to_string()),
            client,
        })
    }

    fn request<T: for<'de> Deserialize<'de>>(&self, path: &str) -> Result<T, reqwest::Error> {
        let url = format!("{}{}", self.base_url, path);
        let mut headers = HeaderMap::new();
        if let Some(api_key) = &self.api_key {
            headers.insert("x-api-key", api_key.parse().unwrap());
        }
        let response = self
            .client
            .get(url)
            .headers(headers)
            .send()?;
        response.json::<T>()
    }

    pub fn list_groups(&self) -> Result<Vec<String>, reqwest::Error> {
        #[derive(Deserialize)]
        struct Response {
            groups: Vec<String>,
        }
        let res: Response = self.request("/api/v1/groups")?;
        Ok(res.groups)
    }
}
