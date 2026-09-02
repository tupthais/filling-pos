import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePosSession } from "@/lib/auth/guard";
import { authErrorResponse } from "@/lib/auth/response";
import { approvePurchaseDraft } from "@/lib/domain/approval";
import { recordPosAudit } from "@/lib/domain/pos-audit";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (process.env.POS_PERSISTENCE_MODE === "database") { try { await requirePosSession(request, ["Owner", "Manager", "Purchaser"]); } catch (error) { return authErrorResponse(error) ?? NextResponse.json({ error: "Procurement authorization failed" }, { status: 500 }); } }
  const body = z.object({ approvalToken: z.string().min(1) }).safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: "Validation failed", issues: body.error.issues }, { status: 400 });
  try { const draft = approvePurchaseDraft((await params).id, body.data.approvalToken); if (process.env.POS_PERSISTENCE_MODE === "database") await recordPosAudit({ branchId: draft.branchId, action: "purchase.draft.approved", entityType: "PurchaseDraft", entityId: draft.id, metadata: { supplierId: draft.supplierId, totalSatang: draft.totalSatang } }); return NextResponse.json({ data: draft }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Approval failed" }, { status: 422 }); }
}
