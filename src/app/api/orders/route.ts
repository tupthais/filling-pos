import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createOrder, listOrders, toMemoryOrderView } from "@/lib/domain/pos-store";
import { createPersistedOrder, getPersistedOrderView, listPersistedOrders } from "@/lib/domain/pos-persistence";
import { OPEN_ORDER_STATUSES } from "@/lib/domain/order-view";
import { ROLES, startOfToday, withPos } from "@/lib/server/pos-context";
import { orderLineSchema } from "@/lib/server/schemas";

const orderSchema = z.object({
  branchId: z.string().optional(),
  source: z.enum(["POS", "QR", "STAFF_ASSISTED", "MANUAL_DELIVERY"]).default("POS"),
  orderType: z.enum(["DINE_IN", "TAKEAWAY", "DELIVERY"]).optional(),
  tableId: z.string().optional(),
  queueNumber: z.string().max(30).optional(),
  deliveryPlatform: z.string().max(40).optional(),
  deliveryOrderId: z.string().max(60).optional(),
  discountSatang: z.number().int().nonnegative().optional(),
  note: z.string().max(300).optional(),
  customerName: z.string().max(80).optional(),
  idempotencyKey: z.string().min(1).max(120),
  lines: z.array(orderLineSchema).min(1).max(100),
});

/** GET /api/orders?status=open|DRAFT,CONFIRMED&tableId=…&scope=today */
export async function GET(request: NextRequest) {
  return withPos(request, ROLES.view, async (context) => {
    const params = new URL(request.url).searchParams;
    const statusParam = params.get("status");
    const status = statusParam === "open" ? OPEN_ORDER_STATUSES : statusParam?.split(",").filter(Boolean);
    const tableId = params.get("tableId") ?? undefined;
    const since = params.get("scope") === "today" ? startOfToday() : undefined;
    if (context.mode === "database") return NextResponse.json({ data: await listPersistedOrders({ branchId: context.branchId, status, tableId, since }) });
    const data = listOrders().filter((order) => (!status || status.includes(order.status)) && (!tableId || order.tableId === tableId) && (!since || new Date(order.createdAt) >= since)).map(toMemoryOrderView);
    return NextResponse.json({ data });
  });
}

export async function POST(request: NextRequest) {
  return withPos(request, ROLES.sell, async (context) => {
    const parsed = orderSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
    const input = { ...parsed.data, branchId: context.branchId };
    if (context.mode === "database") {
      const order = await createPersistedOrder({ ...input, actorUserId: context.userId });
      return NextResponse.json({ data: await getPersistedOrderView(order.id) }, { status: 201 });
    }
    return NextResponse.json({ data: toMemoryOrderView(createOrder(input)) }, { status: 201 });
  });
}
