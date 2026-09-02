import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { expireStock } from "@/lib/domain/catalog-store";
import { expirePersistedStock } from "@/lib/domain/inventory-persistence";
import { requirePosSession } from "@/lib/auth/guard";
import { authErrorResponse } from "@/lib/auth/response";

const schema = z.object({ branchId: z.string().uuid().optional(), ingredientId: z.string().min(1), quantity: z.number().positive(), unit: z.string().min(1), lotId: z.string().min(1), expiryDate: z.string().date(), reference: z.string().min(1), idempotencyKey: z.string().optional() });
export async function POST(request: NextRequest) { if (process.env.POS_PERSISTENCE_MODE === "database") { try { await requirePosSession(request, ["Owner", "Manager", "Inventory"]); } catch (error) { return authErrorResponse(error) ?? NextResponse.json({ error: "Inventory authorization failed" }, { status: 500 }); } } const parsed = schema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 }); try { if (process.env.POS_PERSISTENCE_MODE === "database") { if (!parsed.data.branchId) return NextResponse.json({ error: "branchId is required in database mode" }, { status: 400 }); return NextResponse.json({ data: await expirePersistedStock({ ...parsed.data, branchId: parsed.data.branchId }) }, { status: 201 }); } return NextResponse.json({ data: expireStock(parsed.data) }, { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Expiry write-off failed" }, { status: 422 }); } }
