import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { recordPosAudit } from "@/lib/domain/pos-audit";
import { addTable, listOrders, listTables } from "@/lib/domain/pos-store";
import { OPEN_ORDER_STATUSES, type TableView } from "@/lib/domain/order-view";
import { ROLES, withPos } from "@/lib/server/pos-context";

const createSchema = z.object({ name: z.string().min(1).max(50), qrToken: z.string().min(3).max(64).regex(/^[a-zA-Z0-9_-]+$/).optional() });

function summarise(tables: Array<{ id: string; name: string; qrToken: string }>, open: Array<{ tableId?: string | null; totalSatang: number; createdAt: string; kitchenStatus: string }>): TableView[] {
  return tables.map((table) => {
    const orders = open.filter((order) => order.tableId === table.id);
    const since = orders.map((order) => order.createdAt).sort()[0];
    return { id: table.id, name: table.name, qrToken: table.qrToken, status: orders.length ? "OCCUPIED" : "AVAILABLE", openOrders: orders.length, openTotalSatang: orders.reduce((sum, order) => sum + order.totalSatang, 0), openSince: since, readyOrders: orders.filter((order) => order.kitchenStatus === "READY").length };
  });
}

/** Tables with live occupancy derived from unpaid orders. */
export async function GET(request: NextRequest) {
  return withPos(request, ROLES.view, async (context) => {
    if (context.mode !== "database") {
      const open = listOrders().filter((order) => OPEN_ORDER_STATUSES.includes(order.status)).map((order) => ({ tableId: order.tableId, totalSatang: order.totals.totalSatang, createdAt: order.createdAt, kitchenStatus: order.kitchenStatus }));
      return NextResponse.json({ data: summarise(listTables(), open) });
    }
    const [tables, open] = await Promise.all([
      prisma.posTable.findMany({ where: { branchId: context.branchId }, orderBy: { name: "asc" } }),
      prisma.posOrder.findMany({ where: { branchId: context.branchId, status: { in: OPEN_ORDER_STATUSES }, tableId: { not: null } }, select: { tableId: true, totalSatang: true, createdAt: true, kitchenStatus: true } }),
    ]);
    return NextResponse.json({ data: summarise(tables, open.map((order) => ({ ...order, createdAt: order.createdAt.toISOString() }))) });
  });
}

export async function POST(request: NextRequest) {
  return withPos(request, ROLES.manage, async (context) => {
    const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
    if (context.mode !== "database") return NextResponse.json({ data: addTable(parsed.data) }, { status: 201 });
    const table = await prisma.posTable.create({ data: { branchId: context.branchId, name: parsed.data.name, qrToken: parsed.data.qrToken ?? `qr_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`, status: "AVAILABLE" } });
    await recordPosAudit({ branchId: context.branchId, actorUserId: context.userId, action: "table.created", entityType: "PosTable", entityId: table.id, metadata: { name: table.name } });
    return NextResponse.json({ data: table }, { status: 201 });
  });
}
