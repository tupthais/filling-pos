import { NextRequest, NextResponse } from "next/server";
import { getReceipt } from "@/lib/domain/pos-store";
import { requirePosSession } from "@/lib/auth/guard";
import { authErrorResponse } from "@/lib/auth/response";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { if (process.env.POS_PERSISTENCE_MODE === "database") { try { await requirePosSession(request); } catch (error) { return authErrorResponse(error) ?? NextResponse.json({ error: "Receipt authorization failed" }, { status: 500 }); } } const receipt = getReceipt((await params).id); return receipt ? NextResponse.json({ data: receipt }) : NextResponse.json({ error: "Receipt not found" }, { status: 404 }); }
