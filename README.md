# Filling POS — Self-hosted Thai Restaurant POS

> **สถานะ:** Functional foundation + sandbox MVP; **not production-certified**  
> Canonical workspace: `D:\AI marketing` — ดู `docs/POS-Production-Handoff.md` เป็น source of truth

Self-hosted POS สำหรับร้านอาหารไทย: Web POS/admin + ลูกค้าสั่งผ่าน QR + Android shell สำหรับเครื่อง Sunmi T1 + PostgreSQL เป็น system-of-record + BOM stock ledger + ใบเสร็จ/เอกสารภาษี + health/queue/incident console. External actions ทั้งหมดเป็น **mock-only** จนกว่าจะได้รับ credentials และ operational approval

## Quick start

```powershell
# จาก D:\AI marketing เสมอ
npm install
Copy-Item .env.example .env.local
docker compose up -d postgres        # PostgreSQL ที่พอร์ต 55433
npx prisma migrate deploy
npm run db:seed
npm run dev -- --hostname 0.0.0.0 --port 3001
```

URLs (port 3001 ตาม handoff):
- Admin/POS: `http://localhost:3001`
- LAN POS: `http://<computer-ip>:3001`
- QR demo: `http://<computer-ip>:3001/qr/qr_demo_table_04`
- Ops console: `http://localhost:3001/ops`
- Health (public): `http://localhost:3001/api/health`

## Owner bootstrap & login

ตั้งค่า `.env.local`:

```env
BOOTSTRAP_SECRET="use-a-long-random-secret"
POS_PERSISTENCE_MODE="database"
```

ใช้ IDs ที่ `npm run db:seed` พิมพ์ออกมา:

```powershell
$body = @{ tenantId = "<tenant-id>"; branchId = "<branch-id>"; email = "owner@example.test"; name = "Owner"; password = "use-a-long-password" } | ConvertTo-Json
Invoke-RestMethod http://localhost:3001/api/auth/bootstrap -Method Post -Headers @{ "x-bootstrap-secret" = $env:BOOTSTRAP_SECRET } -ContentType "application/json" -Body $body
```

Login: `POST /api/auth/login` → HttpOnly `pos_session` cookie (อายุ 12 ชม., revoke ผ่าน `POST /api/auth/logout`)

## Verification

```powershell
npm run prisma:validate
npm run typecheck
npm test            # 41 passed
npm run build
npm audit           # 0 vulnerabilities
```

ดู evidence ล่าสุดใน `docs/POS-Production-Handoff.md` §7

## API areas

| Area | Endpoints |
|------|-----------|
| Auth | `/api/auth/bootstrap`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout` |
| Catalog | `/api/catalog/products`, `/api/catalog/modifiers`, `/api/catalog/menu` |
| Orders/payments | `/api/orders`, `/api/orders/:id/confirm`, `/api/payments/confirm` |
| QR/delivery | `/api/qr/*`, `/api/delivery/manual-orders` |
| Inventory | `/api/inventory/receipts`, `/adjustments`, `/counts`, `/transfers`, `/expiry`, `/ledger` |
| Tax | `/api/tax/quote`, `/api/tax/documents/*` |
| Procurement | `/api/purchase-orders/draft`, `/api/purchase-orders/:id/approve` |
| Reports | `/api/reports/sales`, `/api/reports/inventory` |
| Ops | `/api/ops/health`, `/api/ops/jobs`, `/api/ops/incidents`, `/api/audit/pos` |
| MCP | `/api/mcp/tools` |
| Sync | `/api/sync/orders` |

เมื่อ `POS_PERSISTENCE_MODE=database` proxy (`proxy.ts:5`) จะ block private APIs ถ้าไม่มี `pos_session` — เป็น early boundary เท่านั้น ต้องเพิ่ม route-level auth เต็มรูปแบบก่อน production

## Android POS

```
apps/pos-android  (Gradle wrapper included)
.\gradlew.bat -PPOS_API_BASE_URL=http://<computer-ip>:3001 :app:assembleDebug
adb install -r .\app\build\outputs\apk\debug\app-debug.apk
```
Tested: Sunmi T1, API menu loading, SQLite outbox, WorkManager retry. Printer/cash drawer/barcode/MQTT ยังไม่ certified

## Backup & restore

```powershell
npm run db:backup
npm run db:restore -- -BackupPath "backups\filling-pos-YYYYMMDD-HHMMSS.sql" -Confirmation "RESTORE FILLING POS"
```
Restore เป็น destructive — ตรวจไฟล์และ target env ก่อนเสมอ

## Safety boundaries

- เงิน = integer satang (`src/lib/domain/pos.ts:1`), stock = append-only จาก BOM
- ทุก adapter ต้องมี tenant + branch + idempotency context
- Mock adapters ไม่ส่ง LINE / supplier / delivery / tax / payment จริง
- MCP/AI writes ต้องเป็น draft + approval ก่อน apply
- Tax / supplier / platform fees / loyalty / device protocol เป็น config/adapter ไม่ใช่ค่าคงที่

ดูเพิ่ม: `docs/pos-platform.md`, `docs/architecture/*`, `docs/adr/*`, `docs/pos-test-use-cases-th.md`

## Production blockers

ห้าม label ว่า production-ready จนกว่าจะครบ 10 ข้อใน `docs/POS-Production-Handoff.md` §8 (auth เต็มรูปแบบ, PostgreSQL เต็มระบบ, Android auth, hardware certification, refunds/voids/reconciliation, PDPA, backup drill, integration/UAT, accountant review, license/governance)

License: MIT — ดู `LICENSE`. Security: `SECURITY.md`. Contributing: `CONTRIBUTING.md`
