import { NextRequest, NextResponse } from "next/server";
import { requirePosSession } from "@/lib/auth/guard";
import { authErrorResponse } from "@/lib/auth/response";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  if (process.env.POS_PERSISTENCE_MODE === "database") {
    try { await requirePosSession(request, ["Owner", "Manager"]); } catch (e) { return authErrorResponse(e) ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
    const email = new URL(request.url).searchParams.get("email");
    if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const audits = await prisma.posAuditEvent.findMany({ where: { actorUserId: user.id }, take: 100, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ data: { user: { id: user.id, email: user.email, name: user.name }, audits, exportedAt: new Date().toISOString(), retentionNote: "Export on request — anonymize via POST /api/pdpa/anonymize" } });
  }
  return NextResponse.json({ data: { notice: "PDPA export — database mode required", pdpaPage: "/pdpa" } });
}
