# Data Model

Phase 1 keeps the schema intentionally small while covering the required domain.

Identity and access:

- Tenant
- User
- Membership
- Role
- Permission
- RolePermission

Client and Company Brain:

- ClientWorkspace
- CompanyProfile
- BrandBrain
- BrandIdentity
- ToneOfVoice
- BrandRule
- Asset
- PromptTemplate
- Persona
- ProductService

Marketing operations:

- Campaign
- ContentItem
- ApprovalRequest
- ComplianceCheck

Agents and memory:

- AgentDefinition
- AgentVersion
- AgentRun
- RunStep
- MemoryRecord

Governance:

- AuditEvent

Tenant keys:

- Business tables include `tenantId`.
- Workspace-scoped tables include both `tenantId` and `workspaceId`.
- Unique constraints include tenant/workspace where names or slugs are user-controlled.

Migration validation for Phase 1 is Prisma schema validation plus generated SQL diff. Real database migration execution is left for the next phase because no production PostgreSQL credential is configured.
