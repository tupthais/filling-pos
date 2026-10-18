import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePosSession } from "@/lib/auth/guard";
import { authErrorResponse } from "@/lib/auth/response";
import { encryptSecret } from "@/lib/domain/secret-box";
import { recordPosAudit } from "@/lib/domain/pos-audit";

const schema = z.object({ name: z.string().min(2).max(100).regex(/^[A-Za-z0-9._:-]+$/), value: z.string().min(1).max(10000) });

export async function GET(request: NextRequest) {
  try {
    const session = await requirePosSession(request, ["Owner"]);
    const data = await prisma.posSecret.findMany({ where: { tenantId: session.branch.tenantId }, select: { id: true, name: true, createdAt: true, updatedAt: true }, orderBy: { name: "asc" } });
    return NextResponse.json({ data });
  } catch (error) { return authErrorResponse(error) ?? NextResponse.json({ error: "Secret Box access failed" }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePosSession(request, ["Owner"]);
    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
    const encrypted = encryptSecret(parsed.data.value);
    const secret = await prisma.posSecret.upsert({
      where: { tenantId_name: { tenantId: session.branch.tenantId, name: parsed.data.name } },
      update: { ...encrypted, createdById: session.user.id },
      create: { ...encrypted, tenantId: session.branch.tenantId, name: parsed.data.name, createdById: session.user.id },
      select: { id: true, name: true, createdAt: true, updatedAt: true },
    });
    await recordPosAudit({ branchId: session.branch.id, actorUserId: session.user.id, action: "secret.upserted", entityType: "PosSecret", entityId: secret.id, metadata: { name: secret.name } });
    return NextResponse.json({ data: secret }, { status: 201 });
  } catch (error) { return authErrorResponse(error) ?? NextResponse.json({ error: error instanceof Error ? error.message : "Secret Box write failed" }, { status: 500 }); }
}
