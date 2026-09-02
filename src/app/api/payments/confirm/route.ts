import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createPayment } from "@/lib/domain/pos-store";
import { settlePersistedOrder } from "@/lib/domain/pos-persistence";
import { requirePosSession } from "@/lib/auth/guard";
import { authErrorResponse } from "@/lib/auth/response";

const paymentSchema = z.object({ orderId: z.string(), idempotencyKey: z.string().min(1), tenderedSatang: z.number().int().nonnegative(), allocations: z.array(z.object({ method: z.enum(["cash", "qr", "transfer", "scheme"]), amountSatang: z.number().int().nonnegative() })).min(1) });

export async function POST(request: NextRequest) {
  if (process.env.POS_PERSISTENCE_MODE === "database") { try { await requirePosSession(request, ["Owner", "Manager", "Cashier"]); } catch (error) { return authErrorResponse(error) ?? NextResponse.json({ error: "Payment authorization failed" }, { status: 500 }); } }
  const parsed = paymentSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
  try { const payment = process.env.POS_PERSISTENCE_MODE === "database" ? await settlePersistedOrder(parsed.data) : createPayment(parsed.data); return NextResponse.json({ data: payment }, { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Payment failed" }, { status: 400 }); }
}
