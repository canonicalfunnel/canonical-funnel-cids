# Canonical Funnel API Kit

ชุดไฟล์สำหรับเปิดใช้งาน Canonical Funnel API แบบโมดูลาร์:

- `api/` — Node.js REST + GraphQL server พร้อม rate limit และ API key
- `docs/api/` — Swagger (OpenAPI) และ Postman collection
- `sdks/python` — Python wrapper
- `sdks/rust` — Rust blocking client

## วิธีเริ่มต้น

```bash
npm install
export CFE_API_KEY="your-api-key"
npm run start:api
```

จากนั้นดูตัวอย่างคำขอใน `docs/api/postman-collection.json` หรือ `docs/api/openapi.yaml`

## SDK
- Python: `pip install -r sdks/python/requirements.txt`
- Rust: ใช้ `sdks/rust` เป็น dependency ภายใน workspace ของคุณ
