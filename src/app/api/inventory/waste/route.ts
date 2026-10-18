import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePosSession } from "@/lib/auth/guard";
import { authErrorResponse } from "@/lib/auth/response";
import { recordPosAudit } from "@/lib/domain/pos-audit";

const schema = z.object({ productId: z.string().uuid(), quantity: z.number().positive().max(999), reason: z.enum(["coffee-shotเสีย", "เมนูทำผิด", "ของบูด", "หมูย่างผิด", "ไก่ย่างผิด", "โปรตีนเสีย", "วัตถุดิบหมดอายุ"]), note: z.string().max(200).optional(), idempotencyKey: z.string().min(1).max(120) });

export async function POST(request: NextRequest) {
  try {
    const session = await requirePosSession(request, ["Owner", "Manager", "Cashier", "Inventory"]);
    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
    const product = await prisma.posProduct.findFirst({ where: { id: parsed.data.productId, branchId: session.branch.id }, select: { id: true, sku: true, name: true, bom: true } });
    if (!product) return NextResponse.json({ error: "Product is not in this branch." }, { status: 404 });
    const bom = Array.isArray(product.bom) ? product.bom : [];
    if (bom.length === 0) return NextResponse.json({ error: `เมนู ${product.name} ยังไม่มี BOM จึงตัดสต็อกของเสียไม่ได้ กรุณาเติมสูตรก่อน` }, { status: 422 });
    const entries = await prisma.$transaction(async (tx) => {
      const created = [];
      for (const raw of bom) {
        if (!raw || typeof raw !== "object") continue;
        const item = raw as { ingredientId?: unknown; quantity?: unknown; unit?: unknown };
        if (typeof item.ingredientId !== "string" || typeof item.quantity !== "number" || typeof item.unit !== "string") continue;
        created.push(await tx.posStockLedger.create({ data: { branchId: session.branch.id, ingredientId: item.ingredientId, quantity: -Math.abs(item.quantity) * parsed.data.quantity, unit: item.unit, reason: "waste", reference: `WASTE:${parsed.data.reason}:${product.sku}`, idempotencyKey: `${parsed.data.idempotencyKey}:${item.ingredientId}` } }));
      }
      if (!created.length) throw new Error("BOM ไม่มีรายการวัตถุดิบที่ใช้งานได้");
      return created;
    });
    await recordPosAudit({ branchId: session.branch.id, actorUserId: session.user.id, action: "stock.waste", entityType: "PosStockLedger", entityId: entries[0].id, metadata: { productId: product.id, productName: product.name, reason: parsed.data.reason, quantity: parsed.data.quantity, note: parsed.data.note } });
    return NextResponse.json({ data: { product: product.name, reason: parsed.data.reason, quantity: parsed.data.quantity, entries } }, { status: 201 });
  } catch (error) { return authErrorResponse(error) ?? NextResponse.json({ error: error instanceof Error ? error.message : "Waste recording failed" }, { status: 422 }); }
}
