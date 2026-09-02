import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePosSession } from "@/lib/auth/guard";
import { authErrorResponse } from "@/lib/auth/response";
import { issueTaxDocument } from "@/lib/domain/tax-documents";
import { recordPosAudit } from "@/lib/domain/pos-audit";

const schema = z.object({ branchId: z.string().min(1), type: z.enum(["RECEIPT", "ABBREVIATED_TAX_INVOICE", "FULL_TAX_INVOICE", "CREDIT_NOTE", "DEBIT_NOTE"]), totalSatang: z.number().int().nonnegative() });
export async function POST(request: NextRequest) { if (process.env.POS_PERSISTENCE_MODE === "database") { try { await requirePosSession(request, ["Owner", "Manager", "Accountant"]); } catch (error) { return authErrorResponse(error) ?? NextResponse.json({ error: "Tax authorization failed" }, { status: 500 }); } } const parsed = schema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 }); const document = issueTaxDocument(parsed.data); if (process.env.POS_PERSISTENCE_MODE === "database") await recordPosAudit({ branchId: document.branchId, action: "tax.document.issued", entityType: "TaxDocument", entityId: document.id, metadata: { type: document.type, totalSatang: document.totalSatang } }); return NextResponse.json({ data: document }, { status: 201 }); }
