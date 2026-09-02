import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { voidOrder } from "@/lib/domain/pos-store";
import { voidPersistedOrder } from "@/lib/domain/pos-persistence";
import { requirePosSession } from "@/lib/auth/guard";
import { authErrorResponse } from "@/lib/auth/response";

const schema = z.object({ reason: z.string().min(3).max(500) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (process.env.POS_PERSISTENCE_MODE === "database") {
    try { await requirePosSession(request, ["Owner", "Manager"]); } catch (error) { return authErrorResponse(error) ?? NextResponse.json({ error: "Order authorization failed" }, { status: 500 }); }
  }
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
  try {
    const order = process.env.POS_PERSISTENCE_MODE === "database" ? await voidPersistedOrder(id, parsed.data.reason) : voidOrder(id, parsed.data.reason);
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    return NextResponse.json({ data: order });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Void failed" }, { status: 422 }); }
}
