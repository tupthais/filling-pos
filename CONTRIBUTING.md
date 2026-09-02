# Contributing — Filling POS

> Canonical workspace: `D:\AI marketing` — อย่าใช้ OneDrive copy เก่าเป็น workspace หลัก

## Workflow

1. สร้าง branch จาก `main`: `feat/<scope>` หรือ `fix/<scope>`
2. รัน verification ก่อน push:
   ```powershell
   npm run typecheck
   npm test
   npm run build
   npx prisma validate
   npm audit
   ```
3. เปิด PR พร้อม: scope, tenant isolation impact, adapter safety (mock vs real), และ test evidence
4. ห้าม `npm audit fix --force` (อาจ downgrade Prisma / upgrade Next ข้าม major)

## Tenant & Branch Safety

- ทุก domain service ต้องรับ `TenantContext` — default-deny (ADR 0003)
- ทุก write ต้องมี audit trail (`PosAuditEvent` / `AuditEvent`)
- Stock ใช้ append-only ledger เท่านั้น ห้าม update-in-place
- เงิน = integer satang (`src/lib/domain/pos.ts:1`), จำนวนวัตถุดิบทศนิยมได้

## Adapter Rules

- สร้าง adapter ใหม่ให้ implement interface ใน `src/lib/domain/pos-adapters.ts` และเริ่มจาก `MockAdapter`
- เปิด external action จริงได้หลังมี: sandbox test + approval gate + compliance check (ADR 0005)

## DB & Migrations

```powershell
docker compose up -d postgres   # port 55433
npx prisma migrate deploy
npm run db:seed
npm run db:backup
npm run db:restore -- -BackupPath "backups\filling-pos-YYYYMMDD-HHMMSS.sql" -Confirmation "RESTORE FILLING POS"
```

Restore เป็น destructive — ตรวจ backup file และ target env ก่อนเสมอ

## Release Governance

- ตอนนี้ license คือ MIT (`LICENSE`) — เปลี่ยน license ต้องได้รับ approval จาก owner
- ก่อน tag release: อัปเดต `docs/POS-Production-Handoff.md` หัวข้อ Verification evidence และปิด Production blockers ให้ครบ
