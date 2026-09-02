-- CreateTable
CREATE TABLE "PosDocumentSequence" (
    "id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "document_type" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "next_number" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PosDocumentSequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PosDocumentSequence_branch_id_document_type_year_key" ON "PosDocumentSequence"("branch_id", "document_type", "year");

-- AddForeignKey
ALTER TABLE "PosDocumentSequence" ADD CONSTRAINT "PosDocumentSequence_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "PosBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
