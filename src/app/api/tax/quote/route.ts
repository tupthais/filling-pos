import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePosSession } from "@/lib/auth/guard";
import { authErrorResponse } from "@/lib/auth/response";
import { calculateTax } from "@/lib/domain/tax-documents";

const schema = z.object({ totalSatang: z.number().int().nonnegative(), profile: z.object({ ratePercent: z.number().nonnegative(), inclusive: z.boolean(), effectiveFrom: z.string().optional() }) });
export async function POST(request: NextRequest) { if (process.env.POS_PERSISTENCE_MODE === "database") { try { await requirePosSession(request); } catch (error) { return authErrorResponse(error) ?? NextResponse.json({ error: "Tax authorization failed" }, { status: 500 }); } } const parsed = schema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 }); return NextResponse.json({ data: calculateTax(parsed.data.totalSatang, parsed.data.profile) }); }
