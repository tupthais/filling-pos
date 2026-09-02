import { NextResponse } from "next/server";
import { listOrders } from "@/lib/domain/pos-store";
import { buildSalesSummary } from "@/lib/domain/reports";
import { requirePosSession } from "@/lib/auth/guard";
import { authErrorResponse } from "@/lib/auth/response";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) { if (process.env.POS_PERSISTENCE_MODE === "database") { try { await requirePosSession(request); } catch (error) { return authErrorResponse(error) ?? NextResponse.json({ error: "Report authorization failed" }, { status: 500 }); } } return NextResponse.json({ data: buildSalesSummary(listOrders().map((order) => ({ status: order.status, totalSatang: order.totals.totalSatang, source: order.source }))) }); }
