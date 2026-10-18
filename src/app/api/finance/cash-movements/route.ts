import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePosSession } from "@/lib/auth/guard";
import { authErrorResponse } from "@/lib/auth/response";
import { recordPosAudit } from "@/lib/domain/pos-audit";

const schema = z.object({ direction: z.enum(["IN", "OUT"]), amountSatang: z.number().int().positive(), category: z.string().min(1).max(60), note: z.string().max(200).optional(), reference: z.string().max(80).optional() });

export async function GET(request: NextRequest) {
  try {
    const session = await requirePosSession(request, ["Owner", "Manager", "Cashier", "Accountant", "Read-only"]);
    const data = await prisma.posCashMovement.findMany({ where: { branchId: session.branch.id }, orderBy: { createdAt: "desc" }, take: 300 });
    const summary = data.reduce((result, item) => { if (item.direction === "IN") result.inSatang += item.amountSatang; else result.outSatang += item.amountSatang; return result; }, { inSatang: 0, outSatang: 0 });
    return NextResponse.json({ data, summary: { ...summary, netSatang: summary.inSatang - summary.outSatang } });
  } catch (error) { return authErrorResponse(error) ?? NextResponse.json({ error: "Finance access failed" }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePosSession(request, ["Owner", "Manager", "Cashier"]);
    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
    const shift = await prisma.posShift.findFirst({ where: { branchId: session.branch.id, status: "OPEN" }, orderBy: { openedAt: "desc" } });
    const movement = await prisma.posCashMovement.create({ data: { ...parsed.data, branchId: session.branch.id, actorUserId: session.user.id, shiftId: shift?.id } });
    await recordPosAudit({ branchId: session.branch.id, actorUserId: session.user.id, action: `cash.${parsed.data.direction.toLowerCase()}`, entityType: "PosCashMovement", entityId: movement.id, metadata: { amountSatang: parsed.data.amountSatang, category: parsed.data.category } });
    return NextResponse.json({ data: movement }, { status: 201 });
  } catch (error) { return authErrorResponse(error) ?? NextResponse.json({ error: error instanceof Error ? error.message : "Cash movement failed" }, { status: 500 }); }
}
