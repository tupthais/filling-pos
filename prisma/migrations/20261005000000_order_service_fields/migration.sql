-- AlterTable: service fields for dine-in / takeaway / kitchen display
ALTER TABLE "PosOrder" ADD COLUMN "order_type" TEXT NOT NULL DEFAULT 'DINE_IN';
ALTER TABLE "PosOrder" ADD COLUMN "kitchen_status" TEXT NOT NULL DEFAULT 'NEW';
ALTER TABLE "PosOrder" ADD COLUMN "note" TEXT;
ALTER TABLE "PosOrder" ADD COLUMN "customer_name" TEXT;

-- AlterTable: per-product option groups (spice level, add-ons)
ALTER TABLE "PosProduct" ADD COLUMN "options" JSONB;

-- CreateIndex
CREATE INDEX "PosOrder_branch_id_kitchen_status_idx" ON "PosOrder"("branch_id", "kitchen_status");
