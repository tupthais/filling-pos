-- AlterTable
ALTER TABLE "PosStockLedger" ADD COLUMN     "expiry_date" TIMESTAMP(3),
ADD COLUMN     "from_location" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "lot_id" TEXT,
ADD COLUMN     "to_location" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "password_hash" TEXT;

-- CreateTable
CREATE TABLE "PosAccess" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "device_id" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PosAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosSession" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "device_id" UUID,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "PosSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PosAccess_branch_id_role_idx" ON "PosAccess"("branch_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "PosAccess_user_id_branch_id_role_key" ON "PosAccess"("user_id", "branch_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "PosSession_token_hash_key" ON "PosSession"("token_hash");

-- CreateIndex
CREATE INDEX "PosSession_user_id_expires_at_idx" ON "PosSession"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "PosSession_branch_id_expires_at_idx" ON "PosSession"("branch_id", "expires_at");

-- AddForeignKey
ALTER TABLE "PosAccess" ADD CONSTRAINT "PosAccess_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosAccess" ADD CONSTRAINT "PosAccess_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "PosBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosSession" ADD CONSTRAINT "PosSession_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosSession" ADD CONSTRAINT "PosSession_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "PosBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosSession" ADD CONSTRAINT "PosSession_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "PosDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
