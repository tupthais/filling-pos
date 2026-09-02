import { NextResponse } from "next/server";
import { getReceipt } from "@/lib/domain/pos-store";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) { const receipt = getReceipt((await params).id); return receipt ? NextResponse.json({ data: receipt }) : NextResponse.json({ error: "Receipt not found" }, { status: 404 }); }
