import { NextRequest, NextResponse } from "next/server";
import { confirmOrder, toMemoryOrderView } from "@/lib/domain/pos-store";
import { confirmPersistedOrder, getPersistedOrderView } from "@/lib/domain/pos-persistence";
import { ROLES, assertOrderInBranch, withPos } from "@/lib/server/pos-context";

/** Confirms an order and sends it to the kitchen (BOM stock is consumed here). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPos(request, ROLES.sell, async (context) => {
    const { id } = await params;
    if (context.mode === "database") {
      await assertOrderInBranch(id, context);
      await confirmPersistedOrder(id, context.userId);
      return NextResponse.json({ data: await getPersistedOrderView(id) });
    }
    const order = confirmOrder(id);
    return order ? NextResponse.json({ data: toMemoryOrderView(order) }) : NextResponse.json({ error: "Order not found" }, { status: 404 });
  });
}
