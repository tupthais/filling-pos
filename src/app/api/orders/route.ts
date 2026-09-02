import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createOrder, listOrders } from "@/lib/domain/pos-store";
import { createPersistedOrder } from "@/lib/domain/pos-persistence";
import { prisma } from "@/lib/db";
import { requirePosSession } from "@/lib/auth/guard";
import { authErrorResponse } from "@/lib/auth/response";

const orderSchema = z.object({ branchId: z.string().min(1), source: z.enum(["POS", "QR", "STAFF_ASSISTED", "MANUAL_DELIVERY"]), tableId: z.string().optional(), idempotencyKey: z.string().min(1), lines: z.array(z.object({ productId: z.string(), categoryId: z.string().optional(), unitPriceSatang: z.number().int().nonnegative(), quantity: z.number().positive(), promotion: z.any().optional() })).min(1) });

export async function GET(request: NextRequest) { if (process.env.POS_PERSISTENCE_MODE === "database") { try { await requirePosSession(request); return NextResponse.json({ data: await prisma.posOrder.findMany({ orderBy: { createdAt: "desc" }, take: 100 }) }); } catch (error) { return authErrorResponse(error) ?? NextResponse.json({ error: "Order lookup failed" }, { status: 500 }); } } return NextResponse.json({ data: listOrders() }); }

export async function POST(request: NextRequest) {
  if (process.env.POS_PERSISTENCE_MODE === "database") { try { await requirePosSession(request, ["Owner", "Manager", "Cashier"]); } catch (error) { return authErrorResponse(error) ?? NextResponse.json({ error: "Order authorization failed" }, { status: 500 }); } }
  const parsed = orderSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
  if (process.env.POS_PERSISTENCE_MODE === "database") { if (!parsed.data.branchId.match(/^[0-9a-f-]{36}$/i)) return NextResponse.json({ error: "branchId must be a UUID in database mode" }, { status: 400 }); try { return NextResponse.json({ data: await createPersistedOrder(parsed.data) }, { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Order creation failed" }, { status: 422 }); } }
  return NextResponse.json({ data: createOrder(parsed.data) }, { status: 201 });
}
