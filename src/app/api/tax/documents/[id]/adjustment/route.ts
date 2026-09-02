import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePosSession } from "@/lib/auth/guard";
import { authErrorResponse } from "@/lib/auth/response";
import { createAdjustmentNote } from "@/lib/domain/tax-documents";
import { recordPosAudit } from "@/lib/domain/pos-audit";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (process.env.POS_PERSISTENCE_MODE === "database") { try { await requirePosSession(request, ["Owner", "Manager", "Accountant"]); } catch (error) { return authErrorResponse(error) ?? NextResponse.json({ error: "Tax authorization failed" }, { status: 500 }); } }
  const body = z.object({ type: z.enum(["CREDIT_NOTE", "DEBIT_NOTE"]), totalSatang: z.number().int().nonnegative(), reason: z.string().min(1) }).safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: "Validation failed", issues: body.error.issues }, { status: 400 });
  try { const note = createAdjustmentNote((await params).id, body.data.type, body.data.totalSatang, body.data.reason); if (process.env.POS_PERSISTENCE_MODE === "database") await recordPosAudit({ branchId: note.branchId, action: "tax.adjustment.created", entityType: "TaxDocument", entityId: note.id, metadata: { relatedDocumentId: note.relatedDocumentId, type: note.type, reason: body.data.reason } }); return NextResponse.json({ data: note }, { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Adjustment note failed" }, { status: 422 }); }
}
