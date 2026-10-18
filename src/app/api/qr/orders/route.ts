import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createOrder, findTableByToken, toMemoryOrderView } from "@/lib/domain/pos-store";
import { createPersistedOrder, getPersistedOrderView } from "@/lib/domain/pos-persistence";
import { prisma } from "@/lib/db";
import { orderLineSchema } from "@/lib/server/schemas";

const schema = z.object({
  tableToken: z.string().min(1),
  idempotencyKey: z.string().min(1),
  note: z.string().max(300).optional(),
  customerName: z.string().max(80).optional(),
  lines: z.array(orderLineSchema).min(1),
});

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });

  if (process.env.POS_PERSISTENCE_MODE === "database") {
    const table = await prisma.posTable.findUnique({ where: { qrToken: parsed.data.tableToken } });
    if (!table) return NextResponse.json({ error: "QR table not found" }, { status: 404 });
    try {
      const order = await createPersistedOrder({
        branchId: table.branchId,
        tableId: table.id,
        source: "QR",
        orderType: "DINE_IN",
        note: parsed.data.note,
        customerName: parsed.data.customerName,
        lines: parsed.data.lines,
        idempotencyKey: parsed.data.idempotencyKey,
      });
      return NextResponse.json({ data: await getPersistedOrderView(order.id) }, { status: 201 });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "QR order failed" }, { status: 422 });
    }
  }

  const table = findTableByToken(parsed.data.tableToken);
  if (!table) return NextResponse.json({ error: "QR table not found" }, { status: 404 });

  const order = createOrder({
    branchId: table.branchId,
    tableId: table.id,
    source: "QR",
    orderType: "DINE_IN",
    note: parsed.data.note,
    customerName: parsed.data.customerName,
    lines: parsed.data.lines,
    idempotencyKey: parsed.data.idempotencyKey,
  });
  return NextResponse.json({ data: toMemoryOrderView(order) }, { status: 201 });
}
