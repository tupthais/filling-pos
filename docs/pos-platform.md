# Filling POS platform

This repository is the web/admin and domain foundation for a self-hosted Thai restaurant POS. The product topology follows the engineering handoff: one modular business core is shared by POS, manager web, customer QR, connectors, and MCP tools. External integrations are mock-only until credentials and operational approval are provided.

## Run locally

```bash
npm install
Copy-Item .env.example .env.local
docker compose up -d postgres
npm run db:seed
npm run prisma:validate
npm run typecheck
npm test
npm run dev
```

Open `http://localhost:3000`. Health is available at `http://localhost:3000/api/health`.

## Owner bootstrap and login

Bootstrap requires the `BOOTSTRAP_SECRET` from `.env.local` and never uses a default password. Use the seeded IDs printed by `npm run db:seed`:

```powershell
$body = @{ tenantId = "<tenant-id>"; branchId = "<branch-id>"; email = "owner@example.test"; name = "Owner"; password = "use-a-long-password" } | ConvertTo-Json
Invoke-RestMethod http://localhost:3000/api/auth/bootstrap -Method Post -Headers @{ "x-bootstrap-secret" = "<bootstrap-secret>" } -ContentType "application/json" -Body $body
```

Login is `POST /api/auth/login`; the server returns an HttpOnly `pos_session` cookie. Sessions expire after 12 hours and can be revoked through `POST /api/auth/logout`.

## Backup and restore

With the local PostgreSQL container running:

```powershell
npm run db:backup
docker compose exec postgres pg_isready -U postgres -d filling_pos
```

Restore is intentionally explicit and destructive to the target database:

```powershell
npm run db:restore -- -BackupPath "backups\filling-pos-YYYYMMDD-HHMMSS.sql" -Confirmation "RESTORE FILLING POS"
```

Operations health is available at `GET /api/ops/health` for an authenticated session. It reports persistence, database reachability, active sessions, connector modes, and whether external actions are disabled.

When `POS_PERSISTENCE_MODE=database`, the Next.js proxy blocks private POS/admin APIs without that session cookie. Health, auth, catalog menu, and customer QR endpoints remain public by design. Route-level session verification and role checks remain required before production deployment; the cookie presence gate is only an early boundary.

The current vertical slice uses in-memory domain fixtures for fast local development. PostgreSQL is the system-of-record target. The Prisma schema now includes additive POS entities; runtime repository wiring is intentionally staged separately because Prisma 7 requires an explicit PostgreSQL adapter, which is not bundled until the deployment adapter choice is approved.

## Safety boundaries

- Money is integer satang; quantities may be decimal.
- Stock changes are append-only ledger events generated from the BOM.
- All adapter calls require tenant, branch, and idempotency context.
- Mock adapters never send LINE messages, supplier orders, platform orders, tax documents, or payments.
- AI/MCP writes must produce drafts and require an approval step before apply.
- Tax rates, supplier policy, platform fees, loyalty rules, and device protocols are configuration/adapters, not permanent constants.

## Planned adapter seams

`LoyaltyAdapter`, `DeliveryConnector`, `SupplierConnector`, `LineMessagingAdapter`, `TaxDocumentAdapter`, `PrinterAdapter`, `CashDrawerAdapter`, `McpToolGateway`, and `IoTDeviceGateway` are defined in `src/lib/domain/pos-adapters.ts`. Replace `MockAdapter` only after sandbox and approval checks exist.

## Production blockers

Before production: additive POS database migrations, real device certification, backup/restore drill, PDPA notice/retention/export workflow, accountant review of tax profiles, supplier receiving/accounting exports, payment settlement reconciliation, and final open-source license selection.
