import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { toMemoryOrderView, voidOrder } from "@/lib/domain/pos-store";
import { getPersistedOrderView, voidPersistedOrder } from "@/lib/domain/pos-persistence";
import { ROLES, assertOrderInBranch, withPos } from "@/lib/server/pos-context";

const schema = z.object({ reason: z.string().min(3).max(500) });

/** Cancels an unpaid order. Paid orders must be refunded instead. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPos(request, ROLES.manage, async (context) => {
    const { id } = await params;
    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
    if (context.mode === "database") {
      await assertOrderInBranch(id, context);
      await voidPersistedOrder(id, parsed.data.reason, context.userId);
      return NextResponse.json({ data: await getPersistedOrderView(id) });
    }
    const order = voidOrder(id, parsed.data.reason);
    return order ? NextResponse.json({ data: toMemoryOrderView(order) }) : NextResponse.json({ error: "Order not found" }, { status: 404 });
  });
}
