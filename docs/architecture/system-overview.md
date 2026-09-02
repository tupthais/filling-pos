# System Overview

AI Marketing Company OS starts as a modular monolith built with Next.js App Router, TypeScript, Tailwind, PostgreSQL, and Prisma.

Phase 1 scope is the operating foundation only:

- Tenant-aware Client Workspace management.
- Company Brain records for profile, identity, tone, rules, assets, and prompts.
- Provider-neutral interfaces for AI, queue/workflow, and object storage.
- Agent run metadata without live external actions.
- Rule-based Brand Compliance before publish.
- Human approval and audit model foundations.

The system deliberately avoids microservices in Phase 1. Domain services live under `src/lib/domain`, API routes are thin transport adapters, and the database schema is designed for PostgreSQL row-level security.

Runtime layers:

- UI: Next.js server-rendered dashboard shell with forms and operational pages.
- API: Next.js route handlers that require tenant context headers.
- Domain: tenant-aware services, permission checks, compliance, orchestration.
- Persistence target: PostgreSQL via Prisma schema.
- Provider adapters: interfaces only, no vendor logic in domain layer.

Non-goals for Phase 1:

- Real ads publishing.
- Real social posting.
- Real email sending.
- Billing integration.
- Production credentials.
- Large 150+ table enterprise schema.
