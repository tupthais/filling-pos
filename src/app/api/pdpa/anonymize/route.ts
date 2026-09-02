import { NextRequest, NextResponse } from "next/server";
import { requirePosSession } from "@/lib/auth/guard";
import { authErrorResponse } from "@/lib/auth/response";
import { prisma } from "@/lib/db";
import { recordPosAudit } from "@/lib/domain/pos-audit";

export async function POST(request: NextRequest) {
  if (process.env.POS_PERSISTENCE_MODE === "database") {
    try { const session = await requirePosSession(request, ["Owner"]); const { email } = await request.json(); if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
      const user = await prisma.user.findFirst({ where: { email } });
      if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
      await prisma.user.update({ where: { id: user.id }, data: { email: `anonymized_${user.id}@deleted.local`, name: "Anonymized", passwordHash: null } });
      await recordPosAudit({ branchId: session.branch.id, actorUserId: session.user.id, action: "pdpa.anonymized", entityType: "User", entityId: user.id, metadata: { originalEmailHash: email.slice(0,3)+"***" } });
      return NextResponse.json({ data: { anonymized: true, userId: user.id } });
    } catch (e) { return authErrorResponse(e) ?? NextResponse.json({ error: e instanceof Error ? e.message : "Anonymize failed" }, { status: 422 }); }
  }
  return NextResponse.json({ data: { mock: true, notice: "Use database mode for real anonymization" } });
}
