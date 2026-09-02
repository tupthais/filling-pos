import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listShifts, openShift } from "@/lib/domain/pos-store";

const schema = z.object({ branchId: z.string().min(1), cashierId: z.string().min(1), openingFloatSatang: z.number().int().nonnegative() });
export function GET() { return NextResponse.json({ data: listShifts() }); }
export async function POST(request: NextRequest) { const parsed = schema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 }); return NextResponse.json({ data: openShift(parsed.data) }, { status: 201 }); }
