import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createPayment, getOrder, getReceipt } from "@/lib/domain/pos-store";
import { settlePersistedOrder } from "@/lib/domain/pos-persistence";
import { ROLES, assertOrderInBranch, withPos } from "@/lib/server/pos-context";

const paymentSchema = z.object({ orderId: z.string(), idempotencyKey: z.string().min(1), tenderedSatang: z.number().int().nonnegative(), allocations: z.array(z.object({ method: z.enum(["cash", "qr", "transfer", "scheme"]), amountSatang: z.number().int().nonnegative(), platform: z.enum(["grab", "shopeefood", "lineman"]).optional() })).min(1) });

/** Settles an order (auto-confirms drafts), issues the receipt and returns payment + receipt. */
export async function POST(request: NextRequest) {
  return withPos(request, ROLES.sell, async (context) => {
    const parsed = paymentSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
    try {
      if (context.mode === "database") {
        await assertOrderInBranch(parsed.data.orderId, context);
        return NextResponse.json({ data: await settlePersistedOrder({ ...parsed.data, actorUserId: context.userId }) }, { status: 201 });
      }
      const payment = createPayment(parsed.data);
      const order = getOrder(parsed.data.orderId);
      return NextResponse.json({ data: { ...payment, receipt: order?.receiptId ? getReceipt(order.receiptId) : undefined } }, { status: 201 });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Payment failed" }, { status: 400 });
    }
  });
}
