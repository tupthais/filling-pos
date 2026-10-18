-- CreateTable
CREATE TABLE "PosCashMovement" (
    "id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "shift_id" UUID,
    "actor_user_id" UUID,
    "direction" TEXT NOT NULL,
    "amount_satang" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "note" TEXT,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PosCashMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PosCashMovement_branch_id_createdAt_idx" ON "PosCashMovement"("branch_id", "createdAt");

-- CreateIndex
CREATE INDEX "PosCashMovement_shift_id_createdAt_idx" ON "PosCashMovement"("shift_id", "createdAt");

-- AddForeignKey
ALTER TABLE "PosCashMovement" ADD CONSTRAINT "PosCashMovement_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "PosBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosCashMovement" ADD CONSTRAINT "PosCashMovement_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "PosShift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosCashMovement" ADD CONSTRAINT "PosCashMovement_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
