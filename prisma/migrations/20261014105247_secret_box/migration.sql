-- CreateTable
CREATE TABLE "PosSecret" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "auth_tag" TEXT NOT NULL,
    "created_by_id" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosSecret_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PosSecret_tenant_id_updatedAt_idx" ON "PosSecret"("tenant_id", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PosSecret_tenant_id_name_key" ON "PosSecret"("tenant_id", "name");

-- AddForeignKey
ALTER TABLE "PosSecret" ADD CONSTRAINT "PosSecret_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosSecret" ADD CONSTRAINT "PosSecret_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
