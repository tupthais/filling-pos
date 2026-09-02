import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createOrder } from "@/lib/domain/pos-store";
import { createPersistedOrder } from "@/lib/domain/pos-persistence";
import { prisma } from "@/lib/db";

const schema = z.object({ tableToken: z.string().min(1), idempotencyKey: z.string().min(1), lines: z.array(z.object({ productId: z.string(), categoryId: z.string().optional(), unitPriceSatang: z.number().int().nonnegative(), quantity: z.number().positive() })).min(1) });
const tableTokens = new Map([["qr_demo_table_04", { branchId: "branch-main", tableId: "table-04" }], ["qr_demo_table_07", { branchId: "branch-main", tableId: "table-07" }]]);

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
  const table = tableTokens.get(parsed.data.tableToken);
  if (process.env.POS_PERSISTENCE_MODE === "database") { const persistedTable = await prisma.posTable.findUnique({ where: { qrToken: parsed.data.tableToken } }); if (!persistedTable) return NextResponse.json({ error: "QR table not found" }, { status: 404 }); try { return NextResponse.json({ data: await createPersistedOrder({ branchId: persistedTable.branchId, tableId: persistedTable.id, source: "QR", lines: parsed.data.lines, idempotencyKey: parsed.data.idempotencyKey }) }, { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "QR order failed" }, { status: 422 }); } }
  if (!table) return NextResponse.json({ error: "QR table not found" }, { status: 404 });
  return NextResponse.json({ data: createOrder({ ...table, source: "QR", lines: parsed.data.lines, idempotencyKey: parsed.data.idempotencyKey }) }, { status: 201 });
}
