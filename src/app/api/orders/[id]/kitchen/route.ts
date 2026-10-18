import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { setKitchenStatus, toMemoryOrderView } from "@/lib/domain/pos-store";
import { getPersistedOrderView, setPersistedKitchenStatus } from "@/lib/domain/pos-persistence";
import { KITCHEN_FLOW, type KitchenStatus } from "@/lib/domain/order-view";
import { ROLES, assertOrderInBranch, withPos } from "@/lib/server/pos-context";

const schema = z.object({ kitchenStatus: z.enum(KITCHEN_FLOW as [KitchenStatus, ...KitchenStatus[]]) });

/** PATCH /api/orders/:id/kitchen — kitchen display workflow NEW → COOKING → READY → SERVED. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPos(request, ROLES.kitchen, async (context) => {
    const { id } = await params;
    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
    if (context.mode === "database") {
      await assertOrderInBranch(id, context);
      await setPersistedKitchenStatus(id, parsed.data.kitchenStatus, context.userId);
      return NextResponse.json({ data: await getPersistedOrderView(id) });
    }
    const order = setKitchenStatus(id, parsed.data.kitchenStatus);
    return order ? NextResponse.json({ data: toMemoryOrderView(order) }) : NextResponse.json({ error: "Order not found" }, { status: 404 });
  });
}
