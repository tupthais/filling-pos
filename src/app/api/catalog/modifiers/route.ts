import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createModifier } from "@/lib/domain/catalog-store";
import { requirePosSession } from "@/lib/auth/guard";
import { authErrorResponse } from "@/lib/auth/response";

const schema = z.object({ name: z.string().min(1), priceSatang: z.number().int().nonnegative(), productIds: z.array(z.string()).min(1) });
export async function POST(request: NextRequest) { if (process.env.POS_PERSISTENCE_MODE === "database") { try { await requirePosSession(request, ["Owner", "Manager", "Inventory"]); } catch (error) { return authErrorResponse(error) ?? NextResponse.json({ error: "Catalog authorization failed" }, { status: 500 }); } } const parsed = schema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 }); return NextResponse.json({ data: createModifier(parsed.data) }, { status: 201 }); }
