-- Phase 1 PostgreSQL RLS baseline. Application requests must SET app.current_tenant_id.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Prisma migrate will create tables from schema separately in real environments.
-- This policy script is kept explicit so the security model is reviewable before DB rollout.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'User','Role','Membership','ClientWorkspace','CompanyProfile','BrandBrain',
    'BrandIdentity','ToneOfVoice','BrandRule','Asset','PromptTemplate','Persona',
    'ProductService','Campaign','ContentItem','ApprovalRequest','ComplianceCheck',
    'AgentDefinition','AgentRun','RunStep','MemoryRecord','AuditEvent'
  ]
  LOOP
    IF to_regclass(format('%I', table_name)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE IF EXISTS %I ENABLE ROW LEVEL SECURITY', table_name);
      EXECUTE format('ALTER TABLE IF EXISTS %I FORCE ROW LEVEL SECURITY', table_name);
      EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_%s ON %I', lower(table_name), table_name);
      EXECUTE format(
        'CREATE POLICY tenant_isolation_%s ON %I USING ("tenant_id" = current_setting(''app.current_tenant_id'', true)::uuid) WITH CHECK ("tenant_id" = current_setting(''app.current_tenant_id'', true)::uuid)',
        lower(table_name), table_name
      );
    END IF;
  END LOOP;
END $$;

-- Tenant and Permission are system tables. They are default-deny to application roles.
ALTER TABLE IF EXISTS "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Tenant" FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Permission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Permission" FORCE ROW LEVEL SECURITY;
