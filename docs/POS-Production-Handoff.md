# Filling POS — Production Handoff

**วันที่:** 3 กันยายน 2026  
**Canonical workspace:** `D:\AI marketing`  
**สถานะ:** Functional foundation + sandbox MVP; not production-certified

## 1. Scope

Self-hosted Thai restaurant POS foundation with:

- Responsive Web POS/admin
- Customer QR ordering
- POS Android shell for legacy hardware
- PostgreSQL persistence boundary
- Integer-satang pricing and configurable VAT
- BOM-driven append-only stock ledger
- Loyalty, promotion, supplier policy and approval boundaries
- MCP role/branch safety boundary
- Offline SQLite outbox and WorkManager retry
- Receipt/tax-document foundation
- Operations health, queue/retry and incident console

External actions are disabled or mock-only. No real LINE message, supplier order, delivery order, payment capture, tax submission or customer notification is enabled.

## 2. Quick start

Run all commands from `D:\AI marketing`:

```powershell
npm install
Copy-Item .env.example .env.local
docker compose up -d postgres
npx prisma migrate deploy
npm run db:seed
npm run dev -- --hostname 0.0.0.0 --port 3001
```

Web URLs:

- Admin/POS: `http://localhost:3001`
- LAN POS: `http://<computer-ip>:3001`
- Customer QR demo: `http://<computer-ip>:3001/qr/qr_demo_table_04`
- Operations console: `http://localhost:3001/ops`
- Public health: `http://localhost:3001/api/health`

PostgreSQL is exposed locally on port `55433`. Set `POS_PERSISTENCE_MODE=database` only after bootstrap/login is configured. Memory mode remains useful for quick demos.

## 3. Owner bootstrap

Set a private value in `.env.local`:

```env
BOOTSTRAP_SECRET="use-a-long-random-secret"
POS_PERSISTENCE_MODE="database"
```

Use the IDs printed by `npm run db:seed`:

```powershell
$body = @{ tenantId = "<tenant-id>"; branchId = "<branch-id>"; email = "owner@example.test"; name = "Owner"; password = "use-a-long-password" } | ConvertTo-Json
Invoke-RestMethod http://localhost:3001/api/auth/bootstrap -Method Post -Headers @{ "x-bootstrap-secret" = $env:BOOTSTRAP_SECRET } -ContentType "application/json" -Body $body
```

Login: `POST /api/auth/login`. The server issues an HttpOnly `pos_session` cookie. Sessions expire after 12 hours and can be revoked with `POST /api/auth/logout`.

## 4. API areas

| Area | Endpoints |
| --- | --- |
| Auth | `/api/auth/bootstrap`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout` |
| Catalog | `/api/catalog/products`, `/api/catalog/modifiers`, `/api/catalog/menu` |
| Orders/payments | `/api/orders`, `/api/orders/:id/confirm`, `/api/payments/confirm` |
| QR/delivery | `/api/qr/*`, `/api/delivery/manual-orders` |
| Inventory | `/api/inventory/receipts`, `/adjustments`, `/counts`, `/transfers`, `/expiry`, `/ledger` |
| Tax | `/api/tax/quote`, `/api/tax/documents/*` |
| Procurement | `/api/purchase-orders/draft`, `/api/purchase-orders/:id/approve` |
| Reports | `/api/reports/sales`, `/api/reports/inventory` |
| Operations | `/api/ops/health`, `/api/ops/jobs`, `/api/ops/incidents`, `/api/audit/pos` |
| MCP | `/api/mcp/tools` |
| Offline sync | `/api/sync/orders` |

## 5. Android POS

The Android project is under `apps/pos-android`. A Gradle wrapper is included. Build for a physical device on the same LAN:

```powershell
cd "D:\AI marketing\apps\pos-android"
$env:ANDROID_SDK_ROOT = "$env:LOCALAPPDATA\Android\Sdk"
.\gradlew.bat -PPOS_API_BASE_URL=http://<computer-ip>:3001 :app:assembleDebug
```

Install:

```powershell
adb devices
adb install -r .\app\build\outputs\apk\debug\app-debug.apk
```

The tested POS device was a Sunmi T1. The app supports API menu loading, local SQLite outbox, direct online order/payment flow, and WorkManager retry fallback. Printer, cash drawer, barcode and device certification remain incomplete.

## 6. Backup and restore

```powershell
npm run db:backup
npm run db:restore -- -BackupPath "backups\filling-pos-YYYYMMDD-HHMMSS.sql" -Confirmation "RESTORE FILLING POS"
```

Restore is destructive to the target database and must be performed only after validating the backup file and target environment.

## 7. Verification evidence

Latest verified results:

- Web tests: 41 passed
- TypeScript typecheck: passed
- ESLint: passed
- Next.js production build: passed
- Prisma schema validation: passed
- npm audit: 0 vulnerabilities
- PostgreSQL migrations: applied locally
- PostgreSQL order/payment/receipt/BOM smoke test: passed
- Android Gradle debug build: passed
- Sunmi T1 ADB install and app launch: passed
- LAN API reachability from the local network: passed

## 8. Production blockers

Do not label the system production-ready until these are complete:

1. Add route-level auth checks to every remaining mutation and enforce user/branch/device identity from session context.
2. Move loyalty, procurement, tax documents, reports and offline sync state fully to PostgreSQL where still in-memory.
3. Add real Android authentication/device registration and a persisted server-side sync ACK mapping.
4. Implement printer, cash drawer, barcode and ESP32/MQTT adapters with hardware certification.
5. Complete refunds, voids, cash movements, shift close, reconciliation and accounting exports.
6. Complete PDPA notice, consent, retention, export/anonymization and incident workflow.
7. Run encrypted backup restore drill with documented RPO/RTO.
8. Add integration, concurrency, device, tax and full UAT suites.
9. Obtain accountant review for Thai tax configuration and e-Tax/WHT boundaries.
10. Choose final open-source license and add SECURITY/CONTRIBUTING/release governance files.

## 9. Deploy

**Self-hosted (recommended):**
```powershell
# ตั้ง env จริงใน .env.prod.local หรือ export
$env:POSTGRES_PASSWORD="use-strong-password"
$env:BOOTSTRAP_SECRET="use-a-long-random-secret"
$env:PORT="3001"
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
docker compose -f docker-compose.prod.yml logs -f app
# health: http://localhost:3001/api/health  +  /ops
```
Image ใช้ `output: standalone` (`next.config.ts:4`) + `Dockerfile` multi-stage + `HEALTHCHECK` ที่ `/api/health`
สำหรับการรัน standalone นอก Docker ให้ใช้ `npm run start:standalone` หลัง `npm run build` แทน `next start`

**Vercel (preview only, memory mode):** import `tupthais/filling-pos` แล้วตั้ง `DATABASE_URL` เป็น Neon/Supabase Postgres ถ้าต้องการ `POS_PERSISTENCE_MODE=database` มิฉะนั้นจะเป็น `memory` ตาม `vercel.json`

**CI:** `.github/workflows/ci.yml` รัน `prisma validate → typecheck → test → build → audit` + docker build บน main

## 10. Important operational notes

- Do not commit `.env.local`, tokens, passwords or backup files.
- Do not run `npm audit fix --force`; it may downgrade Prisma or upgrade Next.js across a breaking boundary.
- Do not use the old OneDrive copy as the active workspace. The canonical project is `D:\AI marketing`.
- The old C: copy may remain locked by OneDrive and should be removed only after closing OneDrive/IDE processes and confirming the D: workspace is backed up.

## 11. Vercel deployment record

- Provider: Vercel
- Account/team used for the deployment CLI: `peenawat6-prog` / `peenawat6-progs-projects`
- Project: `filling-pos`
- Production URL: `https://filling-pos.vercel.app`
- Current plan: Hobby
- Latest deployment: completed with production build passing
- Deployment protection: enabled; Vercel authentication is required
- Database status: deployment still needs a reachable managed PostgreSQL instance and production environment variables before real finance, inventory, shift, or payment use
- Secret handling: do not record Vercel tokens, API keys, passwords, or device codes in this handoff. Keep them in Vercel environment variables or Secret Box/password manager.

## 12. Cloud account and database record

- Vercel browser account used for the current shop workspace: `filling.cnx@gmail.com`
- Vercel CLI account/team used by the existing deployment: `peenawat6-prog` / `peenawat6-progs-projects`
- Vercel project: `filling-pos`
- Supabase account/project: `filling.cnx@gmail.com` / `fillingcnx-maker's Project`
- Supabase project reference: `ieaizslyunpodungqqrp`
- Supabase region: `ap-northeast-1`
- Supabase status: schema, RLS baseline, owner account, 90 menu products and 7 tables seeded
- Current connection gap: Vercel still needs `DATABASE_URL` for the Supabase Prisma pooler connection; never store the password or full connection string in this document.
