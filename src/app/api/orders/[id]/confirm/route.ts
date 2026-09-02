import { NextResponse } from "next/server";
import { confirmOrder } from "@/lib/domain/pos-store";
import { confirmPersistedOrder } from "@/lib/domain/pos-persistence";
import { requirePosSession } from "@/lib/auth/guard";
import { authErrorResponse } from "@/lib/auth/response";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (process.env.POS_PERSISTENCE_MODE === "database") { try { await requirePosSession(_ as import("next/server").NextRequest, ["Owner", "Manager", "Cashier"]); } catch (error) { return authErrorResponse(error) ?? NextResponse.json({ error: "Order authorization failed" }, { status: 500 }); } }
  const { id } = await params;
  const order = process.env.POS_PERSISTENCE_MODE === "database" ? await confirmPersistedOrder(id).catch(() => undefined) : confirmOrder(id);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  return NextResponse.json({ data: order });
}
