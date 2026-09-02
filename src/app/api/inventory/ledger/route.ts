import { NextResponse } from "next/server";
import { getStockLedger } from "@/lib/domain/pos-store";
import { listInventoryLedger } from "@/lib/domain/catalog-store";
import { prisma } from "@/lib/db";
import { requirePosSession } from "@/lib/auth/guard";
import { authErrorResponse } from "@/lib/auth/response";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) { if (process.env.POS_PERSISTENCE_MODE === "database") { try { await requirePosSession(request); } catch (error) { return authErrorResponse(error) ?? NextResponse.json({ error: "Inventory authorization failed" }, { status: 500 }); } return NextResponse.json({ data: await prisma.posStockLedger.findMany({ orderBy: { createdAt: "desc" }, take: 500 }), appendOnly: true }); } return NextResponse.json({ data: [...getStockLedger(), ...listInventoryLedger()], appendOnly: true }); }
