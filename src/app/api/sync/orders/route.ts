import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { acknowledgeSync, enqueueOfflineOrder, getSyncRecord } from "@/lib/domain/offline-sync";
import { createOrder } from "@/lib/domain/pos-store";
import { createPersistedOrder } from "@/lib/domain/pos-persistence";
import { requirePosSession } from "@/lib/auth/guard";
import { authErrorResponse } from "@/lib/auth/response";

const schema = z.object({ localOrderId: z.string().min(1), deviceId: z.string().min(1), payload: z.unknown(), serverOrderId: z.string().optional(), conflict: z.string().optional() });
const orderPayload = z.object({ source: z.string().default("POS"), branchId: z.string().optional(), tableId: z.string().optional(), totalSatang: z.number().int().nonnegative(), items: z.array(z.object({ productId: z.string(), quantity: z.number().positive(), unitPriceSatang: z.number().int().nonnegative() })).min(1) });
export async function POST(request: NextRequest) {
  if (process.env.POS_PERSISTENCE_MODE === "database") { try { await requirePosSession(request); } catch (error) { return authErrorResponse(error) ?? NextResponse.json({ error: "Sync authorization failed" }, { status: 500 }); } }
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
  if (!getSyncRecord(parsed.data.localOrderId)) enqueueOfflineOrder({ localOrderId: parsed.data.localOrderId, deviceId: parsed.data.deviceId, payload: parsed.data.payload });
  try { let serverOrderId = parsed.data.serverOrderId; const payload = orderPayload.safeParse(parsed.data.payload); if (!serverOrderId && payload.success) { const lines = payload.data.items.map((item) => ({ productId: item.productId, quantity: item.quantity, unitPriceSatang: item.unitPriceSatang })); if (process.env.POS_PERSISTENCE_MODE === "database" && payload.data.branchId?.match(/^[0-9a-f-]{36}$/i)) { const order = await createPersistedOrder({ branchId: payload.data.branchId, tableId: payload.data.tableId, source: payload.data.source, lines, idempotencyKey: parsed.data.localOrderId }); serverOrderId = order.id; } else { const order = createOrder({ branchId: payload.data.branchId ?? "offline", tableId: payload.data.tableId, source: "POS", lines, idempotencyKey: parsed.data.localOrderId }); serverOrderId = order.id; } } serverOrderId ??= `synced_${parsed.data.localOrderId}`; return NextResponse.json({ data: acknowledgeSync(parsed.data.localOrderId, { serverOrderId, conflict: parsed.data.conflict }) }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Sync failed" }, { status: 422 }); }
}
