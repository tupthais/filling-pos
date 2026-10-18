import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { closeShift } from "@/lib/domain/pos-store";
import { prisma } from "@/lib/db";
import { recordPosAudit } from "@/lib/domain/pos-audit";
import { persistedCashBetween } from "@/lib/domain/pos-persistence";
import { ROLES, withPos } from "@/lib/server/pos-context";

const bodySchema = z.object({ countedCashSatang: z.number().int().nonnegative().max(100_000_000) });

/** POST /api/shifts/:id/close — record counted cash and calculate variance. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPos(request, ROLES.sell, async (context) => {
    const { id } = await params;
    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });

    if (context.mode !== "database") {
      const shift = closeShift(id, parsed.data.countedCashSatang);
      return shift ? NextResponse.json({ data: shift }) : NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    const existing = await prisma.posShift.findUnique({ where: { id } });
    if (!existing || existing.branchId !== context.branchId) return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    if (existing.status === "CLOSED") return NextResponse.json({ data: existing });

    const cashSalesSatang = await persistedCashBetween(existing.branchId, existing.openedAt);
    const expected = existing.openingFloatSatang + cashSalesSatang;
    const varianceSatang = parsed.data.countedCashSatang - expected;

    const shift = await prisma.posShift.update({
      where: { id },
      data: { status: "CLOSED", countedCashSatang: parsed.data.countedCashSatang, varianceSatang, closedAt: new Date() },
    });

    await recordPosAudit({
      branchId: existing.branchId,
      actorUserId: context.userId,
      action: "shift.closed",
      entityType: "PosShift",
      entityId: shift.id,
      metadata: { countedCashSatang: parsed.data.countedCashSatang, varianceSatang, expectedCashSatang: expected },
    });

    return NextResponse.json({
      data: {
        ...shift,
        cashSalesSatang,
        expectedCashSatang: expected,
        openedAt: shift.openedAt.toISOString(),
        closedAt: shift.closedAt?.toISOString(),
      },
    });
  });
}
