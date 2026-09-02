import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePosSession } from "@/lib/auth/guard";
import { authErrorResponse } from "@/lib/auth/response";
import { resolveSupplierPolicy, validatePurchaseDraft, type SupplierPolicy } from "@/lib/domain/loyalty-procurement";
import { createPurchaseDraft } from "@/lib/domain/approval";
import { recordPosAudit } from "@/lib/domain/pos-audit";

const schema = z.object({ policy: z.object({ supplierId: z.string(), branchId: z.string(), effectiveFrom: z.string(), minimumOrderSatang: z.number().int().nonnegative(), minimumQuantityByIngredient: z.record(z.string(), z.number().nonnegative()), packSizeByIngredient: z.record(z.string(), z.number().positive()), deliveryFeeSatang: z.number().int().nonnegative() }), items: z.array(z.object({ ingredientId: z.string(), quantity: z.number().positive(), unitPriceSatang: z.number().int().nonnegative() })).min(1) });
export async function POST(request: NextRequest) {
  if (process.env.POS_PERSISTENCE_MODE === "database") { try { await requirePosSession(request, ["Owner", "Manager", "Purchaser"]); } catch (error) { return authErrorResponse(error) ?? NextResponse.json({ error: "Procurement authorization failed" }, { status: 500 }); } }
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
  const policy = resolveSupplierPolicy([parsed.data.policy as SupplierPolicy], parsed.data.policy.supplierId, parsed.data.policy.branchId);
  if (!policy) return NextResponse.json({ error: "No effective supplier policy" }, { status: 422 });
  const validation = validatePurchaseDraft(policy, parsed.data.items);
  if (!validation.valid) return NextResponse.json({ data: { status: "BLOCKED_BY_POLICY", approvalRequired: true, validation } }, { status: 422 });
  const draft = createPurchaseDraft({ supplierId: policy.supplierId, branchId: policy.branchId, totalSatang: validation.totalSatang, items: parsed.data.items });
  if (process.env.POS_PERSISTENCE_MODE === "database") await recordPosAudit({ branchId: draft.branchId, action: "purchase.draft.created", entityType: "PurchaseDraft", entityId: draft.id, metadata: { supplierId: draft.supplierId, totalSatang: draft.totalSatang } });
  return NextResponse.json({ data: { ...draft, approvalRequired: true, validation } }, { status: 201 });
}
