# ADR 0003: Default-Deny Tenant Context

Status: Accepted

Decision: Every business API call must include tenant context. Workspace-scoped calls must include workspace context.

Context: The core risk is cross-client contamination of data, prompts, assets, memory, analytics, or generated outputs.

Consequences:

- Missing tenant context returns 403.
- Domain stores reject cross-tenant reads and writes.
- PostgreSQL RLS mirrors the application boundary.

Rejected:

- Optional tenant filters, because one missed filter could leak client data.
