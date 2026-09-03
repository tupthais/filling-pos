import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePosSession } from "@/lib/auth/guard";
import { authErrorResponse } from "@/lib/auth/response";
import { recordPosAudit } from "@/lib/domain/pos-audit";

const createSchema = z.object({ branchId: z.string().uuid(), name: z.string().min(1).max(50), qrToken: z.string().min(3).max(64).optional(), status: z.enum(["AVAILABLE","OCCUPIED","RESERVED","CLEANING"]).optional() });

export async function GET(request: NextRequest) {
  const branchId = new URL(request.url).searchParams.get("branchId");
  if (process.env.POS_PERSISTENCE_MODE === "database") {
    try { await requirePosSession(request); } catch (e) { return authErrorResponse(e) ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
    if (!branchId) return NextResponse.json({ error: "branchId required" }, { status: 400 });
    const tables = await prisma.posTable.findMany({ where: { branchId }, orderBy: { name: "asc" } });
    return NextResponse.json({ data: tables });
  }
  return NextResponse.json({ data: [{ id: "table-04", branchId: "branch-main", name: "โต๊ะ 04", qrToken: "qr_demo_table_04", status: "AVAILABLE" }] });
}

export async function POST(request: NextRequest) {
  if (process.env.POS_PERSISTENCE_MODE === "database") {
    try { const session = await requirePosSession(request, ["Owner","Manager"]); const parsed = createSchema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
      const table = await prisma.posTable.create({ data: { branchId: parsed.data.branchId, name: parsed.data.name, qrToken: parsed.data.qrToken ?? `qr_${Date.now()}_${Math.random().toString(36).slice(2,8)}`, status: parsed.data.status ?? "AVAILABLE" } });
      await recordPosAudit({ branchId: parsed.data.branchId, actorUserId: session.user.id, action: "table.created", entityType: "PosTable", entityId: table.id, metadata: { name: table.name } });
      return NextResponse.json({ data: table }, { status: 201 });
    } catch (e) { return authErrorResponse(e) ?? NextResponse.json({ error: e instanceof Error ? e.message : "Create table failed" }, { status: 422 }); }
  }
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
  return NextResponse.json({ data: { id: `table_${Date.now()}`, ...parsed.data, qrToken: parsed.data.qrToken ?? `qr_${Date.now()}` } }, { status: 201 });
}
