-- CreateTable
CREATE TABLE "PosJob" (
    "id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "last_error" TEXT,
    "next_attempt_at" TIMESTAMP(3),
    "idempotency_key" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosIncident" (
    "id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "PosIncident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PosJob_idempotency_key_key" ON "PosJob"("idempotency_key");

-- CreateIndex
CREATE INDEX "PosJob_branch_id_status_next_attempt_at_idx" ON "PosJob"("branch_id", "status", "next_attempt_at");

-- CreateIndex
CREATE INDEX "PosIncident_branch_id_status_createdAt_idx" ON "PosIncident"("branch_id", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "PosJob" ADD CONSTRAINT "PosJob_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "PosBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosIncident" ADD CONSTRAINT "PosIncident_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "PosBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
