import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePosSession } from "@/lib/auth/guard";
import { authErrorResponse } from "@/lib/auth/response";
import { earnLoyalty } from "@/lib/domain/loyalty-procurement";

const schema = z.object({ customerId: z.string().min(1), orderId: z.string().min(1), eligibleAmountSatang: z.number().int().nonnegative(), idempotencyKey: z.string().min(1) });
export async function POST(request: NextRequest) {
  if (process.env.POS_PERSISTENCE_MODE === "database") { try { await requirePosSession(request, ["Owner", "Manager", "Cashier"]); } catch (error) { return authErrorResponse(error) ?? NextResponse.json({ error: "Loyalty authorization failed" }, { status: 500 }); } }
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
  return NextResponse.json({ data: earnLoyalty(parsed.data) }, { status: 201 });
}
