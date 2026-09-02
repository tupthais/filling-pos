-- CreateTable
CREATE TABLE "PosAuditEvent" (
    "id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "actor_user_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PosAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PosAuditEvent_branch_id_createdAt_idx" ON "PosAuditEvent"("branch_id", "createdAt");

-- CreateIndex
CREATE INDEX "PosAuditEvent_entity_type_entity_id_idx" ON "PosAuditEvent"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "PosAuditEvent" ADD CONSTRAINT "PosAuditEvent_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "PosBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosAuditEvent" ADD CONSTRAINT "PosAuditEvent_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
