import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { refundPersistedOrder } from "@/lib/domain/pos-persistence";
import { ROLES, assertOrderInBranch, withPos } from "@/lib/server/pos-context";

const schema = z.object({ amountSatang: z.number().int().positive(), reason: z.string().min(3).max(500), idempotencyKey: z.string().min(1) });

/** Refunds a completed order (full or partial). Manager/Owner only. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPos(request, ROLES.manage, async (context) => {
    const { id } = await params;
    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
    if (context.mode === "database") {
      await assertOrderInBranch(id, context);
      const payment = await refundPersistedOrder({ orderId: id, amountSatang: parsed.data.amountSatang, reason: parsed.data.reason, idempotencyKey: parsed.data.idempotencyKey, actorUserId: context.userId });
      return NextResponse.json({ data: payment }, { status: 201 });
    }
    // memory mode — demo only, nothing is persisted
    return NextResponse.json({ data: { mock: true, ...parsed.data, orderId: id } }, { status: 201 });
  });
}
