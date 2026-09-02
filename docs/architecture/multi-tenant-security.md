# Multi-Tenant Security

Tenant isolation is a hard boundary. Business records use `tenantId`, and workspace-scoped records also use `workspaceId`.

Security rules:

- API calls are default-deny without `x-tenant-id`.
- Workspace data requires `x-workspace-id`.
- Domain services check permissions before reads and writes.
- Repository access must filter by tenant context.
- PostgreSQL RLS must be enabled and forced for business tables.
- Application DB sessions must set `app.current_tenant_id` before business queries.
- External actions are disabled unless explicitly enabled and approved.

RLS baseline:

- Business tables have tenant-scoped policies.
- System tables are default-deny to application roles.
- Policies use `current_setting('app.current_tenant_id', true)::uuid`.

Test evidence required:

- Tenant A cannot read Tenant B Company Brain records.
- Cross-workspace writes in the same tenant are rejected when the context is scoped to another workspace.
- Missing permissions are rejected.

Open implementation work:

- Add real auth session binding.
- Move tenant context from trusted headers to server-derived session claims.
- Add database integration tests against ephemeral PostgreSQL.
