-- CreateEnum
CREATE TYPE "AgentRunStatus" AS ENUM ('queued', 'running', 'waiting_approval', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('draft', 'pending', 'approved', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('pass', 'warning', 'fail');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('create', 'update', 'delete', 'submit', 'approve', 'reject', 'compliance_check', 'agent_run');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "workspace_id" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientWorkspace" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientWorkspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyProfile" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "companyName" TEXT NOT NULL,
    "businessType" TEXT NOT NULL,
    "brandStory" TEXT,
    "mission" TEXT,
    "vision" TEXT,
    "coreValues" TEXT[],
    "contactJson" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandBrain" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "summary" TEXT NOT NULL,
    "evidenceJson" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandBrain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandIdentity" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "logoAssetId" UUID,
    "colorSystemJson" JSONB NOT NULL,
    "typographyJson" JSONB NOT NULL,
    "photographyJson" JSONB,
    "designRulesJson" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToneOfVoice" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "examples" TEXT[],
    "bannedPhrases" TEXT[],
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToneOfVoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandRule" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "severity" "ComplianceStatus" NOT NULL DEFAULT 'fail',
    "rule" TEXT NOT NULL,
    "evidenceHint" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "metadataJson" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptTemplate" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "variables" TEXT[],
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromptTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Persona" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "profileJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Persona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductService" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "priceCents" INTEGER,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "budgetCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentItem" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "campaignId" UUID,
    "channel" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'pending',
    "requestedById" UUID,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceCheck" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT,
    "status" "ComplianceStatus" NOT NULL,
    "reasons" TEXT[],
    "evidenceJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentDefinition" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "externalActions" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentVersion" (
    "id" UUID NOT NULL,
    "agentId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "configJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentRun" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "agentId" UUID NOT NULL,
    "status" "AgentRunStatus" NOT NULL DEFAULT 'queued',
    "requestJson" JSONB NOT NULL,
    "resultJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RunStep" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "runId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" "AgentRunStatus" NOT NULL DEFAULT 'queued',
    "inputArtifacts" JSONB,
    "outputArtifacts" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RunStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoryRecord" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "namespace" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemoryRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "workspace_id" UUID,
    "actorUserId" UUID,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosBranch" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Bangkok',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosBranch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosDevice" (
    "id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "device_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PosDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosTable" (
    "id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "qr_token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',

    CONSTRAINT "PosTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosProduct" (
    "id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category_id" TEXT,
    "price_satang" INTEGER NOT NULL,
    "channels" JSONB NOT NULL,
    "schedule" JSONB,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosOrder" (
    "id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "table_id" UUID,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "subtotal_satang" INTEGER NOT NULL,
    "discount_satang" INTEGER NOT NULL DEFAULT 0,
    "tax_satang" INTEGER NOT NULL DEFAULT 0,
    "total_satang" INTEGER NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "PosOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosOrderItem" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit_price_satang" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,

    CONSTRAINT "PosOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosPayment" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "method" TEXT NOT NULL,
    "amount_satang" INTEGER NOT NULL,
    "tendered_satang" INTEGER NOT NULL DEFAULT 0,
    "change_satang" INTEGER NOT NULL DEFAULT 0,
    "idempotency_key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PosPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosShift" (
    "id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "cashier_id" UUID NOT NULL,
    "opening_float_satang" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "counted_cash_satang" INTEGER,
    "variance_satang" INTEGER,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "PosShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosReceipt" (
    "id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "document_type" TEXT NOT NULL,
    "document_number" TEXT NOT NULL,
    "total_satang" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMP(3),

    CONSTRAINT "PosReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosStockLedger" (
    "id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "ingredient_id" UUID NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "idempotency_key" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PosStockLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "User_tenant_id_idx" ON "User"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenant_id_email_key" ON "User"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "Role_tenant_id_idx" ON "Role"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "Role_tenant_id_name_key" ON "Role"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE INDEX "Membership_tenant_id_userId_idx" ON "Membership"("tenant_id", "userId");

-- CreateIndex
CREATE INDEX "Membership_tenant_id_workspace_id_idx" ON "Membership"("tenant_id", "workspace_id");

-- CreateIndex
CREATE INDEX "ClientWorkspace_tenant_id_idx" ON "ClientWorkspace"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "ClientWorkspace_tenant_id_slug_key" ON "ClientWorkspace"("tenant_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyProfile_workspace_id_key" ON "CompanyProfile"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "BrandBrain_workspace_id_key" ON "BrandBrain"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "BrandIdentity_workspace_id_key" ON "BrandIdentity"("workspace_id");

-- CreateIndex
CREATE INDEX "ToneOfVoice_tenant_id_workspace_id_idx" ON "ToneOfVoice"("tenant_id", "workspace_id");

-- CreateIndex
CREATE INDEX "BrandRule_tenant_id_workspace_id_idx" ON "BrandRule"("tenant_id", "workspace_id");

-- CreateIndex
CREATE INDEX "Asset_tenant_id_workspace_id_idx" ON "Asset"("tenant_id", "workspace_id");

-- CreateIndex
CREATE INDEX "PromptTemplate_tenant_id_workspace_id_idx" ON "PromptTemplate"("tenant_id", "workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "PromptTemplate_tenant_id_workspace_id_name_version_key" ON "PromptTemplate"("tenant_id", "workspace_id", "name", "version");

-- CreateIndex
CREATE INDEX "Persona_tenant_id_workspace_id_idx" ON "Persona"("tenant_id", "workspace_id");

-- CreateIndex
CREATE INDEX "ProductService_tenant_id_workspace_id_idx" ON "ProductService"("tenant_id", "workspace_id");

-- CreateIndex
CREATE INDEX "Campaign_tenant_id_workspace_id_idx" ON "Campaign"("tenant_id", "workspace_id");

-- CreateIndex
CREATE INDEX "ContentItem_tenant_id_workspace_id_idx" ON "ContentItem"("tenant_id", "workspace_id");

-- CreateIndex
CREATE INDEX "ApprovalRequest_tenant_id_workspace_id_status_idx" ON "ApprovalRequest"("tenant_id", "workspace_id", "status");

-- CreateIndex
CREATE INDEX "ComplianceCheck_tenant_id_workspace_id_status_idx" ON "ComplianceCheck"("tenant_id", "workspace_id", "status");

-- CreateIndex
CREATE INDEX "AgentDefinition_tenant_id_idx" ON "AgentDefinition"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "AgentDefinition_tenant_id_key_key" ON "AgentDefinition"("tenant_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "AgentVersion_agentId_version_key" ON "AgentVersion"("agentId", "version");

-- CreateIndex
CREATE INDEX "AgentRun_tenant_id_workspace_id_status_idx" ON "AgentRun"("tenant_id", "workspace_id", "status");

-- CreateIndex
CREATE INDEX "RunStep_tenant_id_workspace_id_runId_idx" ON "RunStep"("tenant_id", "workspace_id", "runId");

-- CreateIndex
CREATE INDEX "MemoryRecord_tenant_id_workspace_id_namespace_idx" ON "MemoryRecord"("tenant_id", "workspace_id", "namespace");

-- CreateIndex
CREATE INDEX "AuditEvent_tenant_id_workspace_id_createdAt_idx" ON "AuditEvent"("tenant_id", "workspace_id", "createdAt");

-- CreateIndex
CREATE INDEX "PosBranch_tenant_id_idx" ON "PosBranch"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "PosBranch_tenant_id_code_key" ON "PosBranch"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "PosDevice_branch_id_status_idx" ON "PosDevice"("branch_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PosDevice_branch_id_device_code_key" ON "PosDevice"("branch_id", "device_code");

-- CreateIndex
CREATE UNIQUE INDEX "PosTable_qr_token_key" ON "PosTable"("qr_token");

-- CreateIndex
CREATE INDEX "PosTable_branch_id_status_idx" ON "PosTable"("branch_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PosTable_branch_id_name_key" ON "PosTable"("branch_id", "name");

-- CreateIndex
CREATE INDEX "PosProduct_branch_id_available_idx" ON "PosProduct"("branch_id", "available");

-- CreateIndex
CREATE UNIQUE INDEX "PosProduct_branch_id_sku_key" ON "PosProduct"("branch_id", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "PosOrder_idempotency_key_key" ON "PosOrder"("idempotency_key");

-- CreateIndex
CREATE INDEX "PosOrder_branch_id_status_createdAt_idx" ON "PosOrder"("branch_id", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PosOrderItem_order_id_idx" ON "PosOrderItem"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "PosPayment_idempotency_key_key" ON "PosPayment"("idempotency_key");

-- CreateIndex
CREATE INDEX "PosPayment_order_id_createdAt_idx" ON "PosPayment"("order_id", "createdAt");

-- CreateIndex
CREATE INDEX "PosShift_branch_id_status_openedAt_idx" ON "PosShift"("branch_id", "status", "openedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PosReceipt_order_id_key" ON "PosReceipt"("order_id");

-- CreateIndex
CREATE INDEX "PosReceipt_branch_id_issuedAt_idx" ON "PosReceipt"("branch_id", "issuedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PosReceipt_branch_id_document_type_document_number_key" ON "PosReceipt"("branch_id", "document_type", "document_number");

-- CreateIndex
CREATE UNIQUE INDEX "PosStockLedger_idempotency_key_key" ON "PosStockLedger"("idempotency_key");

-- CreateIndex
CREATE INDEX "PosStockLedger_branch_id_ingredient_id_createdAt_idx" ON "PosStockLedger"("branch_id", "ingredient_id", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "ClientWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientWorkspace" ADD CONSTRAINT "ClientWorkspace_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyProfile" ADD CONSTRAINT "CompanyProfile_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "ClientWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandBrain" ADD CONSTRAINT "BrandBrain_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "ClientWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandIdentity" ADD CONSTRAINT "BrandIdentity_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "ClientWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToneOfVoice" ADD CONSTRAINT "ToneOfVoice_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "ClientWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandRule" ADD CONSTRAINT "BrandRule_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "ClientWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "ClientWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptTemplate" ADD CONSTRAINT "PromptTemplate_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "ClientWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Persona" ADD CONSTRAINT "Persona_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "ClientWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductService" ADD CONSTRAINT "ProductService_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "ClientWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "ClientWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "ClientWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceCheck" ADD CONSTRAINT "ComplianceCheck_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "ClientWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentDefinition" ADD CONSTRAINT "AgentDefinition_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentVersion" ADD CONSTRAINT "AgentVersion_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "ClientWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunStep" ADD CONSTRAINT "RunStep_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AgentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoryRecord" ADD CONSTRAINT "MemoryRecord_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "ClientWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "ClientWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosBranch" ADD CONSTRAINT "PosBranch_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosDevice" ADD CONSTRAINT "PosDevice_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "PosBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosTable" ADD CONSTRAINT "PosTable_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "PosBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosProduct" ADD CONSTRAINT "PosProduct_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "PosBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosOrder" ADD CONSTRAINT "PosOrder_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "PosBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosOrder" ADD CONSTRAINT "PosOrder_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "PosTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosOrderItem" ADD CONSTRAINT "PosOrderItem_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "PosOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosOrderItem" ADD CONSTRAINT "PosOrderItem_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "PosProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosPayment" ADD CONSTRAINT "PosPayment_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "PosOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosShift" ADD CONSTRAINT "PosShift_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "PosBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosReceipt" ADD CONSTRAINT "PosReceipt_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "PosBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosReceipt" ADD CONSTRAINT "PosReceipt_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "PosOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosStockLedger" ADD CONSTRAINT "PosStockLedger_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "PosBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
