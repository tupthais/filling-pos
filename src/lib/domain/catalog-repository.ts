import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

export type PersistedCatalogProduct = { branchId: string; name: string; categoryId?: string; sku: string; priceSatang: number; channels: Prisma.InputJsonValue; schedule?: Prisma.InputJsonValue; bom?: Prisma.InputJsonValue };

export async function createPersistedCatalogProduct(input: PersistedCatalogProduct) {
  return prisma.posProduct.create({ data: { branchId: input.branchId, name: input.name, categoryId: input.categoryId, sku: input.sku, priceSatang: input.priceSatang, channels: input.channels, schedule: input.schedule } });
}

export async function listPersistedCatalogProducts(branchId: string) {
  return prisma.posProduct.findMany({ where: { branchId, available: true }, orderBy: { name: "asc" } });
}
