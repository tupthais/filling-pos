import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateProduct } from "@/lib/domain/catalog-store";
import { toMenuItem } from "@/lib/domain/menu";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { ForbiddenError } from "@/lib/auth/guard";
import { recordPosAudit } from "@/lib/domain/pos-audit";
import { ROLES, withPos } from "@/lib/server/pos-context";
import { channelsSchema, optionGroupSchema } from "@/lib/server/schemas";

const schema = z.object({ name: z.string().min(1).max(120).optional(), categoryId: z.string().min(1).max(60).optional(), priceSatang: z.number().int().nonnegative().optional(), available: z.boolean().optional(), channels: channelsSchema.optional(), options: z.array(optionGroupSchema).max(10).optional(), imageUrl: z.string().max(500000).optional() });

/** PATCH /api/catalog/products/:id — edit price/name/category, toggle sold-out, edit options. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Cashiers may toggle sold-out; other edits need catalog roles (checked below).
  return withPos(request, ["Owner", "Manager", "Inventory", "Cashier"], async (context) => {
    const { id } = await params;
    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
    const onlyAvailability = Object.keys(parsed.data).every((key) => key === "available");
    if (context.mode === "database" && !onlyAvailability && !(ROLES.catalog as string[]).includes(context.role ?? "")) throw new ForbiddenError("Insufficient role permission");
    if (context.mode !== "database") {
      const item = updateProduct(id, parsed.data);
      return item ? NextResponse.json({ data: item }) : NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    const existing = await prisma.posProduct.findUnique({ where: { id } });
    if (!existing || existing.branchId !== context.branchId) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    const { options, ...rest } = parsed.data;
    const row = await prisma.posProduct.update({ where: { id }, data: { ...rest, ...(options ? { options: options as unknown as Prisma.InputJsonValue } : {}) } });
    await recordPosAudit({ branchId: context.branchId, actorUserId: context.userId, action: "product.updated", entityType: "PosProduct", entityId: id, metadata: { changes: Object.keys(parsed.data), priceSatang: row.priceSatang, available: row.available } });
    return NextResponse.json({ data: toMenuItem(row) });
  });
}
