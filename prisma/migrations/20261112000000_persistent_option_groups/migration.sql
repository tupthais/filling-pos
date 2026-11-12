-- Persist reusable menu option groups per branch instead of keeping them in process memory.
CREATE TABLE "PosOptionGroup" (
    "id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "group_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "multi" BOOLEAN NOT NULL DEFAULT false,
    "choices" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosOptionGroup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PosOptionGroup_branch_id_group_key_key" ON "PosOptionGroup"("branch_id", "group_key");
CREATE INDEX "PosOptionGroup_branch_id_idx" ON "PosOptionGroup"("branch_id");

ALTER TABLE "PosOptionGroup"
  ADD CONSTRAINT "PosOptionGroup_branch_id_fkey"
  FOREIGN KEY ("branch_id") REFERENCES "PosBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PosOptionGroup" ENABLE ROW LEVEL SECURITY;
