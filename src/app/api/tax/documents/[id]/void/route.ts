import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePosSession } from "@/lib/auth/guard";
import { authErrorResponse } from "@/lib/auth/response";
import { voidTaxDocument } from "@/lib/domain/tax-documents";
import { recordPosAudit } from "@/lib/domain/pos-audit";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (process.env.POS_PERSISTENCE_MODE === "database") { try { await requirePosSession(request, ["Owner", "Manager", "Accountant"]); } catch (error) { return authErrorResponse(error) ?? NextResponse.json({ error: "Tax authorization failed" }, { status: 500 }); } }
  const body = z.object({ reason: z.string().min(1) }).safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: "Validation failed", issues: body.error.issues }, { status: 400 });
  try { const document = voidTaxDocument((await params).id, body.data.reason); if (process.env.POS_PERSISTENCE_MODE === "database") await recordPosAudit({ branchId: document.branchId, action: "tax.document.voided", entityType: "TaxDocument", entityId: document.id, metadata: { reason: body.data.reason } }); return NextResponse.json({ data: document }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Void failed" }, { status: 404 }); }
}
