import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createProduct, listProducts } from "@/lib/domain/catalog-store";
import { toMenuItem } from "@/lib/domain/menu";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { recordPosAudit } from "@/lib/domain/pos-audit";
import { ROLES, withPos } from "@/lib/server/pos-context";
import { channelsSchema, optionGroupSchema } from "@/lib/server/schemas";

const schema = z.object({ name: z.string().min(1).max(120), categoryId: z.string().min(1).max(60), sku: z.string().min(1).max(40).optional(), priceSatang: z.number().int().nonnegative(), channels: channelsSchema.default({ POS: true, QR: true, DELIVERY: false }), options: z.array(optionGroupSchema).max(10).default([]), schedule: z.object({ days: z.array(z.number().int().min(0).max(6)), startHour: z.number().int().min(0).max(23), endHour: z.number().int().min(1).max(24) }).optional(), imageUrl: z.string().max(500000).optional() });

/** All products, including sold-out ones, for menu management. */
export async function GET(request: NextRequest) {
  return withPos(request, ["Owner", "Manager", "Cashier", "Inventory"], async (context) => {
    if (context.mode !== "database") return NextResponse.json({ data: listProducts() });
    const rows = await prisma.posProduct.findMany({ where: { branchId: context.branchId }, orderBy: [{ categoryId: "asc" }, { name: "asc" }] });
    return NextResponse.json({ data: rows.map(toMenuItem) });
  });
}

export async function POST(request: NextRequest) {
  return withPos(request, ROLES.catalog, async (context) => {
    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
    const sku = parsed.data.sku ?? `SKU-${Date.now().toString(36).toUpperCase()}`;
    if (context.mode !== "database") return NextResponse.json({ data: createProduct({ ...parsed.data, sku }) }, { status: 201 });
    const row = await prisma.posProduct.create({ data: { branchId: context.branchId, name: parsed.data.name, categoryId: parsed.data.categoryId, sku, priceSatang: parsed.data.priceSatang, channels: parsed.data.channels, options: parsed.data.options as unknown as Prisma.InputJsonValue, schedule: parsed.data.schedule } });
    await recordPosAudit({ branchId: context.branchId, actorUserId: context.userId, action: "product.created", entityType: "PosProduct", entityId: row.id, metadata: { name: row.name, priceSatang: row.priceSatang } });
    return NextResponse.json({ data: toMenuItem(row) }, { status: 201 });
  });
}
