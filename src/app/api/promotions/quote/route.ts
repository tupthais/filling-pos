import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculateOrder } from "@/lib/domain/pos";

const schema = z.object({ tax: z.object({ ratePercent: z.number().nonnegative(), inclusive: z.boolean() }), lines: z.array(z.object({ productId: z.string(), categoryId: z.string().optional(), unitPriceSatang: z.number().int().nonnegative(), quantity: z.number().positive(), promotion: z.any().optional() })).min(1) });
export async function POST(request: NextRequest) { const parsed = schema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 }); return NextResponse.json({ data: calculateOrder(parsed.data.lines, parsed.data.tax) }); }
