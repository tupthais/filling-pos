import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { countStock } from "@/lib/domain/catalog-store";
import { countPersistedStock } from "@/lib/domain/inventory-persistence";

const schema = z.object({ branchId: z.string().uuid().optional(), ingredientId: z.string().min(1), countedQuantity: z.number().nonnegative(), quantity: z.number().optional(), unit: z.string().min(1), reference: z.string().min(1), location: z.string().optional(), idempotencyKey: z.string().optional() });
export async function POST(request: NextRequest) { const parsed = schema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 }); if (process.env.POS_PERSISTENCE_MODE === "database") { if (!parsed.data.branchId) return NextResponse.json({ error: "branchId is required in database mode" }, { status: 400 }); const entry = await countPersistedStock({ ...parsed.data, branchId: parsed.data.branchId, quantity: 0 }); return NextResponse.json({ data: entry, unchanged: !entry }, { status: entry ? 201 : 200 }); } const entry = countStock(parsed.data); return NextResponse.json({ data: entry, unchanged: !entry }, { status: entry ? 201 : 200 }); }
