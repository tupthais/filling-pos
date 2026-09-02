import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { receiveStock } from "@/lib/domain/catalog-store";
import { receivePersistedStock } from "@/lib/domain/inventory-persistence";

const schema = z.object({ branchId: z.string().uuid().optional(), ingredientId: z.string().min(1), quantity: z.number().positive(), unit: z.string().min(1), reference: z.string().min(1), idempotencyKey: z.string().optional() });
export async function POST(request: NextRequest) { const parsed = schema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 }); try { if (process.env.POS_PERSISTENCE_MODE === "database") { if (!parsed.data.branchId) return NextResponse.json({ error: "branchId is required in database mode" }, { status: 400 }); return NextResponse.json({ data: await receivePersistedStock({ ...parsed.data, branchId: parsed.data.branchId }) }, { status: 201 }); } return NextResponse.json({ data: receiveStock(parsed.data) }, { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Receipt failed" }, { status: 400 }); } }
