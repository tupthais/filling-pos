# Company Brain

Each Client Workspace owns one Company Brain. AI outputs must use only the Company Brain for the current workspace.

Phase 1 Company Brain modules:

- Company Profile.
- Brand Identity.
- Color System.
- Typography.
- Tone of Voice.
- Brand Rules and Forbidden Rules.
- Asset metadata.
- Prompt Templates.
- Persona.
- Product or Service.
- Campaign.
- Content Item.
- Memory Record.

Important writes are versioned and audited. Version history is required for brand evolution, rollback, and evidence that CI changes do not leak across clients.

Company Brain read path:

1. Resolve tenant and workspace context.
2. Check permission.
3. Load only records with matching `tenantId` and `workspaceId`.
4. Build AI prompt context from those records only.
5. Store output metadata with matching tenant and workspace identifiers.

No Phase 1 agent may use shared prompt, asset, memory, or analytics records across workspaces.
