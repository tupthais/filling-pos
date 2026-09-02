import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePosSession } from "@/lib/auth/guard";
import { authErrorResponse } from "@/lib/auth/response";
import { refundPersistedOrder } from "@/lib/domain/pos-persistence";
import { prisma } from "@/lib/db";
import { recordPosAudit } from "@/lib/domain/pos-audit";

const schema = z.object({ amountSatang: z.number().int().positive(), reason: z.string().min(3).max(500), idempotencyKey: z.string().min(1) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let session: Awaited<ReturnType<typeof requirePosSession>> | undefined;
  if (process.env.POS_PERSISTENCE_MODE === "database") {
    try { session = await requirePosSession(request, ["Owner", "Manager"]); } catch (e) { return authErrorResponse(e) ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  }
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
  try {
    if (process.env.POS_PERSISTENCE_MODE === "database") {
      const payment = await refundPersistedOrder({ orderId: id, amountSatang: parsed.data.amountSatang, reason: parsed.data.reason, idempotencyKey: parsed.data.idempotencyKey, actorUserId: session?.user.id });
      return NextResponse.json({ data: payment }, { status: 201 });
    }
    // memory mode — audit only
    const order = await prisma.$transaction ? undefined : undefined;
    await recordPosAudit({ branchId: "memory", action: "payment.refunded", entityType: "PosOrder", entityId: id, metadata: parsed.data } as never).catch(()=>{});
    return NextResponse.json({ data: { mock: true, ...parsed.data, orderId: id } }, { status: 201 });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Refund failed" }, { status: 422 }); }
}
