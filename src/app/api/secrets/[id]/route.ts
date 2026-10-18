import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePosSession } from "@/lib/auth/guard";
import { authErrorResponse } from "@/lib/auth/response";
import { decryptSecret } from "@/lib/domain/secret-box";
import { recordPosAudit } from "@/lib/domain/pos-audit";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePosSession(request, ["Owner"]);
    const { id } = await params;
    const secret = await prisma.posSecret.findFirst({ where: { id, tenantId: session.branch.tenantId } });
    if (!secret) return NextResponse.json({ error: "Secret not found" }, { status: 404 });
    await recordPosAudit({ branchId: session.branch.id, actorUserId: session.user.id, action: "secret.revealed", entityType: "PosSecret", entityId: secret.id, metadata: { name: secret.name } });
    return NextResponse.json({ data: { name: secret.name, value: decryptSecret(secret) } });
  } catch (error) { return authErrorResponse(error) ?? NextResponse.json({ error: "Secret Box reveal failed" }, { status: 500 }); }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePosSession(request, ["Owner"]);
    const { id } = await params;
    const secret = await prisma.posSecret.findFirst({ where: { id, tenantId: session.branch.tenantId } });
    if (!secret) return NextResponse.json({ error: "Secret not found" }, { status: 404 });
    await prisma.posSecret.delete({ where: { id: secret.id } });
    await recordPosAudit({ branchId: session.branch.id, actorUserId: session.user.id, action: "secret.deleted", entityType: "PosSecret", entityId: secret.id, metadata: { name: secret.name } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) { return authErrorResponse(error) ?? NextResponse.json({ error: "Secret Box delete failed" }, { status: 500 }); }
}
