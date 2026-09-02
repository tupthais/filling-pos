import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { closeShift } from "@/lib/domain/pos-store";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { const body = z.object({ countedCashSatang: z.number().int().nonnegative() }).safeParse(await request.json()); if (!body.success) return NextResponse.json({ error: "Validation failed", issues: body.error.issues }, { status: 400 }); const shift = closeShift((await params).id, body.data.countedCashSatang); return shift ? NextResponse.json({ data: shift }) : NextResponse.json({ error: "Shift not found" }, { status: 404 }); }
