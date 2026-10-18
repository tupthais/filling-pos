import { NextResponse, type NextRequest } from "next/server";
import { listOrders, listPayments, toMemoryOrderView } from "@/lib/domain/pos-store";
import { listPersistedOrders } from "@/lib/domain/pos-persistence";
import { buildDailyReport } from "@/lib/domain/reports";
import { prisma } from "@/lib/db";
import { withPos, startOfToday } from "@/lib/server/pos-context";

/** GET /api/reports/sales?days=1 — dashboard report for today (or the last N days). */
export async function GET(request: NextRequest) {
  return withPos(request, ["Owner", "Manager", "Cashier", "Accountant", "Read-only"], async (context) => {
    const days = Math.min(31, Math.max(1, Number(new URL(request.url).searchParams.get("days") ?? 1) || 1));
    const from = new Date(startOfToday().getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    const timeZone = process.env.POS_TIMEZONE ?? "Asia/Bangkok";
    if (context.mode !== "database") {
      const orders = listOrders().filter((order) => new Date(order.createdAt) >= from).map(toMemoryOrderView);
      const payments = listPayments().filter((payment) => new Date(payment.createdAt) >= from).map((payment) => ({ method: payment.allocations.map((a) => a.method).join("+"), amountSatang: payment.amountSatang, allocations: payment.allocations }));
      return NextResponse.json({ data: buildDailyReport(orders, payments, from, timeZone) });
    }
    const [orders, payments] = await Promise.all([
      listPersistedOrders({ branchId: context.branchId, since: from, take: 5000 }),
      prisma.posPayment.findMany({ where: { order: { branchId: context.branchId }, createdAt: { gte: from } }, select: { method: true, amountSatang: true, allocations: true } }),
    ]);
    return NextResponse.json({ data: buildDailyReport(orders, payments, from, timeZone) });
  });
}
