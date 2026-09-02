# Phase Plan

## Phase 0: Workspace and Foundation

- Inspect current path.
- Check whether a repository exists.
- Check git status.
- Preserve existing files.
- Create project only when no existing system exists.

## Phase 1: Tenant-Isolated Company Brain Foundation

- Next.js App Router, TypeScript, Tailwind scaffold.
- Prisma PostgreSQL schema.
- RLS policy baseline.
- Tenant-aware domain services.
- Company Brain APIs.
- Agent orchestration metadata.
- Rule-based Brand Compliance.
- Approval and audit foundations.
- UI shell for nontechnical operators.
- Unit and integration tests.

## Phase 2: Real Persistence and Auth

- Add real authentication provider.
- Bind tenant context to verified session claims.
- Run migrations against PostgreSQL.
- Add database-backed repositories.
- Add integration tests against ephemeral PostgreSQL.

## Phase 3: AI Provider Execution

- Implement provider-neutral AI adapter.
- Add prompt assembly from workspace Company Brain only.
- Add output artifact tracking.
- Add human review workflow for generated assets.

## Phase 4: Publishing Connectors

- Add external connector adapters behind approval gates.
- Add compliance blocking at publish boundary.
- Add sandbox and dry-run environments first.
