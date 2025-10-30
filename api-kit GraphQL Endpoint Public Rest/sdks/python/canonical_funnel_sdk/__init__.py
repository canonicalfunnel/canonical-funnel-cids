"""Canonical Funnel Python SDK."""

from __future__ import annotations

import requests


class CanonicalFunnelClient:
    """Minimal REST wrapper."""

    def __init__(self, base_url: str, api_key: str | None = None, timeout: int = 10):
        if not base_url:
            raise ValueError('base_url is required')
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.timeout = timeout

    def _request(self, method: str, path: str):
        url = f"{self.base_url}{path}"
        headers = {}
        if self.api_key:
            headers['x-api-key'] = self.api_key
        response = requests.request(method, url, headers=headers, timeout=self.timeout)
        response.raise_for_status()
        return response.json()

    def list_groups(self):
        data = self._request('GET', '/api/v1/groups')
        return data.get('groups', [])

    def list_group_items(self, group: str):
        data = self._request('GET', f'/api/v1/groups/{group}/items')
        return data.get('items', [])

    def get_trust_records(self):
        data = self._request('GET', '/api/v1/trust-records')
        return data.get('records', [])

    def get_manifest_summaries(self):
        data = self._request('GET', '/api/v1/manifests')
        return data.get('manifests', [])

    def get_keyword_stats(self):
        return self._request('GET', '/api/v1/keywords/stats')


__all__ = ['CanonicalFunnelClient']
