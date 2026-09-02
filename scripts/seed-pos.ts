import { prisma } from "../src/lib/db";

async function main() {
  const tenant = await prisma.tenant.upsert({ where: { slug: "filling-cafe" }, update: { name: "Filling Cafe" }, create: { name: "Filling Cafe", slug: "filling-cafe" } });
  const branch = await prisma.posBranch.upsert({ where: { tenantId_code: { tenantId: tenant.id, code: "MAIN" } }, update: { name: "สาขาหลัก" }, create: { tenantId: tenant.id, name: "สาขาหลัก", code: "MAIN" } });
  const ingredients = { beef: "00000000-0000-4000-8000-000000000001", rice: "00000000-0000-4000-8000-000000000002", tea: "00000000-0000-4000-8000-000000000003", water: "00000000-0000-4000-8000-000000000004" };
  const products = [
    { sku: "FOOD-001", name: "ข้าวกะเพราเนื้อ", priceSatang: 8900, channels: { POS: true, QR: true, DELIVERY: true }, bom: [{ ingredientId: ingredients.beef, quantity: 0.15, unit: "kg" }, { ingredientId: ingredients.rice, quantity: 0.2, unit: "kg" }] },
    { sku: "FOOD-002", name: "ข้าวผัดกุ้ง", priceSatang: 7900, channels: { POS: true, QR: true, DELIVERY: true }, bom: [{ ingredientId: ingredients.rice, quantity: 0.2, unit: "kg" }] },
    { sku: "DRINK-001", name: "ชาไทยเย็น", priceSatang: 4500, channels: { POS: true, QR: true, DELIVERY: false }, bom: [{ ingredientId: ingredients.tea, quantity: 0.03, unit: "kg" }] },
    { sku: "DRINK-002", name: "น้ำเปล่า", priceSatang: 1500, channels: { POS: true, QR: true, DELIVERY: true }, bom: [{ ingredientId: ingredients.water, quantity: 0.6, unit: "litre" }] },
  ];
  for (const product of products) await prisma.posProduct.upsert({ where: { branchId_sku: { branchId: branch.id, sku: product.sku } }, update: product, create: { branchId: branch.id, ...product } });
  for (const table of ["โต๊ะ 01", "โต๊ะ 02", "โต๊ะ 03", "โต๊ะ 04", "โต๊ะ 05", "โต๊ะ 06", "โต๊ะ 07"]) await prisma.posTable.upsert({ where: { branchId_name: { branchId: branch.id, name: table } }, update: { status: "AVAILABLE" }, create: { branchId: branch.id, name: table, qrToken: `qr_${branch.code.toLowerCase()}_${table.replace("โต๊ะ ", "table_")}` } });
  console.log(JSON.stringify({ tenantId: tenant.id, branchId: branch.id, products: products.length, tables: 7 }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
