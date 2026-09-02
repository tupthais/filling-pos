import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { calculateOrder, cashChange, validatePayments, type OrderLine, type PaymentAllocation } from "./pos";
import { recordPosAudit } from "./pos-audit";

export async function createPersistedOrder(input: { branchId: string; source: string; tableId?: string; lines: OrderLine[]; idempotencyKey: string }) {
  const existing = await prisma.posOrder.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) return existing;
  const totals = calculateOrder(input.lines, { ratePercent: 7, inclusive: true });
  const order = await prisma.posOrder.create({ data: { branchId: input.branchId, tableId: input.tableId, source: input.source, subtotalSatang: totals.subtotalSatang, discountSatang: totals.discountSatang, taxSatang: totals.vatSatang, totalSatang: totals.totalSatang, idempotencyKey: input.idempotencyKey, items: { create: input.lines.map((line) => ({ productId: line.productId, quantity: line.quantity, unitPriceSatang: line.unitPriceSatang, snapshot: line as unknown as Prisma.InputJsonValue })) } } });
  await recordPosAudit({ branchId: input.branchId, action: "order.created", entityType: "PosOrder", entityId: order.id, metadata: { source: input.source, totalSatang: totals.totalSatang } });
  return order;
}

export async function confirmPersistedOrder(id: string) {
  const existing = await prisma.posOrder.findUnique({ where: { id }, include: { items: { include: { product: true } } } });
  if (!existing) throw new Error("Order not found.");
  if (existing.status !== "DRAFT") return existing;
  const confirmed = await prisma.$transaction(async (tx) => {
    const order = await tx.posOrder.update({ where: { id }, data: { status: "CONFIRMED", confirmedAt: new Date() }, include: { items: { include: { product: true } } } });
    for (const item of order.items) {
      if (!Array.isArray(item.product.bom)) continue;
      for (const component of item.product.bom) {
        if (!component || typeof component !== "object" || !("ingredientId" in component) || !("quantity" in component) || !("unit" in component)) continue;
        const value = component as { ingredientId: unknown; quantity: unknown; unit: unknown };
        if (typeof value.ingredientId !== "string" || typeof value.quantity !== "number" || typeof value.unit !== "string") continue;
        await tx.posStockLedger.create({ data: { branchId: order.branchId, ingredientId: value.ingredientId, quantity: -Math.abs(value.quantity) * Number(item.quantity), unit: value.unit, reason: "sale-consumption", reference: order.id, idempotencyKey: `${order.id}:${item.id}:${value.ingredientId}` } });
      }
    }
    return order;
  });
  await recordPosAudit({ branchId: confirmed.branchId, action: "order.confirmed", entityType: "PosOrder", entityId: confirmed.id, metadata: { itemCount: confirmed.items.length } });
  return confirmed;
}

export async function voidPersistedOrder(id: string, reason: string, actorUserId?: string) {
  const existing = await prisma.posOrder.findUnique({ where: { id } });
  if (!existing) throw new Error("Order not found.");
  if (existing.status === "COMPLETED") throw new Error("Cannot void completed order — use refund.");
  if (existing.status === "CANCELLED") return existing;
  const order = await prisma.posOrder.update({ where: { id }, data: { status: "CANCELLED" } });
  await recordPosAudit({ branchId: order.branchId, actorUserId, action: "order.voided", entityType: "PosOrder", entityId: order.id, metadata: { reason } });
  return order;
}

export async function settlePersistedOrder(input: { orderId: string; allocations: PaymentAllocation[]; tenderedSatang: number; idempotencyKey: string }) {
  const existing = await prisma.posPayment.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) return existing;
  const payment = await prisma.$transaction(async (tx) => {
    const order = await tx.posOrder.findUnique({ where: { id: input.orderId } });
    if (!order) throw new Error("Order not found.");
    if (order.status !== "CONFIRMED" && order.status !== "COMPLETED") throw new Error("Order must be confirmed before payment.");
    validatePayments(order.totalSatang, input.allocations);
    const cashAmount = input.allocations.filter((allocation) => allocation.method === "cash").reduce((sum, allocation) => sum + allocation.amountSatang, 0);
    const payment = await tx.posPayment.create({ data: { orderId: order.id, method: input.allocations.map((allocation) => allocation.method).join("+") || "unknown", amountSatang: order.totalSatang, tenderedSatang: input.tenderedSatang, changeSatang: cashAmount ? cashChange(cashAmount, input.tenderedSatang) : 0, allocations: input.allocations as unknown as Prisma.InputJsonValue, idempotencyKey: input.idempotencyKey } });
    const year = new Date().getUTCFullYear();
    const sequence = await tx.posDocumentSequence.upsert({ where: { branchId_documentType_year: { branchId: order.branchId, documentType: "RECEIPT", year } }, create: { branchId: order.branchId, documentType: "RECEIPT", year, nextNumber: 1 }, update: { nextNumber: { increment: 1 } } });
    await tx.posReceipt.create({ data: { branchId: order.branchId, orderId: order.id, documentType: "RECEIPT", documentNumber: `R-${year}-${String(sequence.nextNumber).padStart(6, "0")}`, totalSatang: order.totalSatang } });
    await tx.posOrder.update({ where: { id: order.id }, data: { status: "COMPLETED", paidAt: new Date() } });
    return payment;
  });
  const order = await prisma.posOrder.findUnique({ where: { id: input.orderId }, select: { branchId: true } });
  if (order) await recordPosAudit({ branchId: order.branchId, action: "payment.confirmed", entityType: "PosPayment", entityId: payment.id, metadata: { orderId: input.orderId, allocationCount: input.allocations.length } });
  return payment;
}
