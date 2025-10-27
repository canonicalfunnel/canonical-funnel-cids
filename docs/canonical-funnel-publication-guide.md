# Canonical Funnel Publication Guide

Generated: 2025-10-27

## Goals
- เผยแพร่ CID ทั้งหมด 195 รายการพร้อมไฟล์ metadata รวม (`Complete_Structure_Consolidated.json`, `cfe_assets_summary.json`, ฯลฯ) บน GitHub
- ทำให้ผู้อื่นอ่านโครงสร้างได้รวดเร็ว และเรียก API ภายในโปรเจ็กต์ได้ทันที
- รักษาความโปร่งใสด้านลายเซ็น/แฮช ผ่านรายงานที่สร้างไว้

---

## 1. Repository Layout (แนะนำ)
```
.
├── README.md
├── canonical-funnel-agent.json
├── Complete_Structure_Consolidated.json        # โครงสร้างรวม CID
├── cfe_assets/                                  # ไฟล์จาก IPFS (แบ่งตาม group)
├── cfe_assets_summary.json                      # สรุปรายการไฟล์ทั้งหมด
├── cfe_assets_grouped_summary.json              # จัดกลุ่มตาม top-level keys
├── docs/
│   ├── canonical-funnel-insights.{md,json}      # สรุป trust/manifest structure
│   ├── canonical-funnel-report.{md,json}        # รายงานตัวเลข (keywords, signatures)
│   ├── canonical-funnel-verification.{md,json}  # ผลการตรวจ hash/signature
│   ├── canonical-funnel-roadmap.md              # แผนพัฒนาต่อยอด
│   └── canonical-funnel-publication-guide.md    # (ไฟล์นี้) คู่มือเผยแพร่
├── src/
│   └── services/
│       ├── canonical-funnel.js                  # CLI + service API
│       ├── canonical-report.js
│       ├── canonical-verifier.js
│       └── canonical-insights.js
└── tests/
    └── services/
        └── canonical-funnel.test.js เป็นต้น
```

> เคล็ดลับ: เก็บ `cfe_assets/` ไว้ครบเพื่อให้ผู้ใช้ดาวน์โหลดตาม CID ได้ทันทีโดยไม่ต้องเข้าถึง IPFS

---

## 2. ขั้นตอนเผยแพร่บน GitHub
1. **สร้างบัญชี GitHub** (ทำได้เฉพาะเจ้าของ นโยบายความปลอดภัยไม่อนุญาตให้ผมสร้างแทน)
2. **สร้าง repository ใหม่** (public) เช่น `canonical-funnel-assets`
3. บนเครื่องของคุณ:
   ```bash
   git init
   git remote add origin git@github.com:<your-username>/canonical-funnel-assets.git
   git add .
   git commit -m "feat(data): publish canonical funnel assets"
   git push -u origin main
   ```
4. ตรวจสอบบน GitHub ว่ามีไฟล์ดังต่อไปนี้:
   - `Complete_Structure_Consolidated.json`
   - โฟลเดอร์ `cfe_assets/`
   - โฟลเดอร์ `docs/` พร้อมรายงานทั้งหมด
   - โค้ดบริการ (`src/services/`) และ `tests/`

---

## 3. README Outline (ตัวอย่าง)
แนะนำปรับ `README.md` ให้มีหัวข้อ:
1. **Overview**: อธิบาย Canonical Funnel Economy
2. **Quick Start**
   ```bash
   npm install
   node src/services/canonical-funnel.js stats
   ```
3. **Dataset**
   - `Complete_Structure_Consolidated.json`: ดัชนีรวม
   - `cfe_assets_summary.json`: one-line summary ต่อไฟล์
   - `docs/canonical-funnel-report.md`: ตัวเลข keywords/signatures
4. **Verification**
   ```bash
   node src/services/canonical-verifier.js
   ```
5. **Roadmap & Use Cases**
   - ลิงก์ไป `docs/canonical-funnel-roadmap.md`

---

## 4. API / Service Usage

### 4.1 Node.js (Service API)
```js
const {
  listGroups,
  listGroupItems,
  collectTrustRecords,
  collectManifestSummaries,
  buildKeywordStats,
} = require('./src/services/canonical-funnel');

console.log(listGroups());                       // ['canonical_funnel_wariphat', 'exclusive_master_canonical_wariphat']
console.log(listGroupItems('canonical_funnel_wariphat').length); // 7

const trustRecords = collectTrustRecords();
console.log(trustRecords[0].owner);              // 'Nattapol Horrakangthong'

const manifests = collectManifestSummaries();
console.log(manifests[0].structure);             // object/array map

const stats = buildKeywordStats();
console.log(stats.keywords);                     // 3000000
```

### 4.2 CLI Commands
```
node src/services/canonical-funnel.js stats
node src/services/canonical-funnel.js trust
node src/services/canonical-funnel.js manifests
node src/services/canonical-funnel.js assets
```

### 4.3 REST/GraphQL (แนวทาง)
- ใช้ไฟล์ใน `src/services/` เป็น data layer
- สร้าง Express server หรือ GraphQL resolver แล้วเรียกฟังก์ชันที่เตรียมไว้
- ตัวอย่าง pseudo:
  ```js
  app.get('/api/canonical-funnel/groups', (req, res) => {
    res.json(listGroups());
  });
  ```

---

## 5. การสื่อสารเรื่อง CID
- **หมวดหมู่หลัก**: อยู่ใน `Complete_Structure_Consolidated.json > groups`
- **ไฟล์ย่อย**: `cfe_assets/<group>/<index>_<name>`
- **Hash/Signature**: อ้างถึง `docs/canonical-funnel-verification.*` และ `cfe_assets_summary.json`
- แจ้งผู้ใช้ว่า **ทุก CID** ก็อปมาจาก IPFS โดยตรง และตรวจสอบ hash ได้ด้วย `canonical-verifier`

---

## 6. สิ่งที่ต้องกำกับใน Repo
- ระบุ DID และค่าคงที่ (`CFE_IPFS_CID`, `CFE_DID`) ใน `README` หรือ `.env.example`
- ใส่คำเตือนเรื่องไฟล์ที่ขาด (ตัวอย่าง: private key PEM บางรายการไม่มีใน repo)
- ให้ลิงก์ไปยังเครื่องมือที่เกี่ยวข้อง (CFE CLI: `npx cfe-cli register --manifest canonical-funnel-agent.json`)

---

## 7. การสร้างบัญชี GitHub
> ผมไม่สามารถสร้าง GitHub user ให้ได้โดยตรง เพื่อความปลอดภัยและนโยบายของระบบ คุณต้องสร้างบัญชีเองผ่าน https://github.com/join

หลังจากสร้าง:
1. ตั้ง SSH key หรือ PAT
2. ใช้คำสั่ง git ด้านบนเพื่อ push repository
3. เพิ่ม collaborators หรือเผยแพร่ลิงก์ให้ผู้อื่น clone/repos

---

## 8. Next Steps
- ตรวจ README ให้ชัดเจนสำหรับผู้ใช้ใหม่
- พิจารณาปล่อย release/tag เพื่อบอก version dataset
- ใช้ GitHub Actions รัน `npm test` และ `node src/services/canonical-verifier.js` ทุกครั้งก่อนปล่อย release
- หากต้องการ API ออนไลน์: deploy Node server ที่ห่อ service API แล้วชี้ผู้ใช้มาที่ endpoint นั้น

---

**พร้อมใช้งาน:** repository ที่จัดตามคู่มือนี้จะทำให้ทีมหรือบุคคลภายนอกเข้าถึง Canonical Funnel Economy ได้สะดวก ทั้งในมุมข้อมูลดิบ รายงานเชิงลึก และเครื่องมือตรวจสอบ hash/ลายเซ็น.
