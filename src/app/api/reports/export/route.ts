import { NextRequest, NextResponse } from "next/server";
import { requirePosSession } from "@/lib/auth/guard";
import { authErrorResponse } from "@/lib/auth/response";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  if (process.env.POS_PERSISTENCE_MODE === "database") {
    try { await requirePosSession(request, ["Owner", "Manager", "Accountant"]); } catch (e) { return authErrorResponse(e) ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
    const branchId = new URL(request.url).searchParams.get("branchId");
    const from = new URL(request.url).searchParams.get("from");
    const to = new URL(request.url).searchParams.get("to");
    const where: Record<string, unknown> = {};
    if (branchId) (where as Record<string,string>).branchId = branchId;
    if (from || to) (where as Record<string,Record<string,Date>>).createdAt = { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) };
    const orders = await prisma.posOrder.findMany({ where, orderBy: { createdAt: "desc" }, take: 1000 });
    const csvHeader = "orderId,branchId,source,status,totalSatang,createdAt";
    const rows = orders.map(o => `${o.id},${o.branchId},${o.source},${o.status},${o.totalSatang},${o.createdAt.toISOString()}`).join("\n");
    return new NextResponse(`${csvHeader}\n${rows}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename=\"sales-${from ?? "all"}-${to ?? "all"}.csv"` } });
  }
  return NextResponse.json({ error: "Database mode required for export" }, { status: 400 });
}
