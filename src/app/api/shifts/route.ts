import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listShifts, openShift } from "@/lib/domain/pos-store";
import { prisma } from "@/lib/db";
import { recordPosAudit } from "@/lib/domain/pos-audit";
import { persistedCashBetween } from "@/lib/domain/pos-persistence";
import type { ShiftView } from "@/lib/domain/order-view";
import { ROLES, withPos } from "@/lib/server/pos-context";

const schema = z.object({ openingFloatSatang: z.number().int().nonnegative().max(100_000_000) });

/** GET /api/shifts — recent shifts; the open shift (if any) includes live expected cash. */
export async function GET(request: NextRequest) {
  return withPos(request, ROLES.view, async (context) => {
    if (context.mode !== "database") {
      const data: ShiftView[] = listShifts().map((shift) => ({ id: shift.id, status: shift.status, cashierId: shift.cashierId, openingFloatSatang: shift.openingFloatSatang, cashSalesSatang: shift.cashSalesSatang, expectedCashSatang: shift.expectedCashSatang ?? shift.openingFloatSatang + shift.cashSalesSatang - shift.cashOutSatang - shift.refundsSatang, countedCashSatang: shift.countedCashSatang, varianceSatang: shift.varianceSatang, openedAt: shift.openedAt, closedAt: shift.closedAt }));
      return NextResponse.json({ data });
    }
    const shifts = await prisma.posShift.findMany({ where: { branchId: context.branchId }, orderBy: { openedAt: "desc" }, take: 30 });
    const data: ShiftView[] = await Promise.all(shifts.map(async (shift) => {
      const cashSalesSatang = await persistedCashBetween(context.branchId, shift.openedAt, shift.closedAt ?? undefined);
      return { id: shift.id, status: shift.status, cashierId: shift.cashierId, openingFloatSatang: shift.openingFloatSatang, cashSalesSatang, expectedCashSatang: shift.openingFloatSatang + cashSalesSatang, countedCashSatang: shift.countedCashSatang ?? undefined, varianceSatang: shift.varianceSatang ?? undefined, openedAt: shift.openedAt.toISOString(), closedAt: shift.closedAt?.toISOString() };
    }));
    return NextResponse.json({ data });
  });
}

/** POST /api/shifts — open a shift with an opening float. Only one open shift per branch. */
export async function POST(request: NextRequest) {
  return withPos(request, ROLES.sell, async (context) => {
    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
    if (context.mode !== "database") return NextResponse.json({ data: openShift({ branchId: context.branchId, cashierId: "demo-cashier", openingFloatSatang: parsed.data.openingFloatSatang }) }, { status: 201 });
    const existing = await prisma.posShift.findFirst({ where: { branchId: context.branchId, status: "OPEN" } });
    if (existing) return NextResponse.json({ data: existing });
    const shift = await prisma.posShift.create({ data: { branchId: context.branchId, cashierId: context.userId!, openingFloatSatang: parsed.data.openingFloatSatang, status: "OPEN" } });
    await recordPosAudit({ branchId: context.branchId, actorUserId: context.userId, action: "shift.opened", entityType: "PosShift", entityId: shift.id, metadata: { openingFloatSatang: parsed.data.openingFloatSatang } });
    return NextResponse.json({ data: shift }, { status: 201 });
  });
}
