import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { calculateOrder, cashChange, validatePayments, type OrderLine, type PaymentAllocation } from "./pos";
import { cashPortion, toLineView, type KitchenStatus, type OrderType, type OrderView } from "./order-view";
import { recordPosAudit } from "./pos-audit";
import { toMenuItem } from "./menu";

const orderInclude = { items: { include: { product: { select: { name: true } } } }, table: { select: { name: true } }, receipt: true } satisfies Prisma.PosOrderInclude;
type OrderWithRelations = Prisma.PosOrderGetPayload<{ include: typeof orderInclude }>;

export function toPersistedOrderView(order: OrderWithRelations): OrderView {
  let tableName = order.table?.name;
  if (!tableName) {
    if (order.orderType === "TAKEAWAY") {
      tableName = order.customerName ? `คิว (${order.customerName})` : "สั่งกลับบ้าน";
    } else if (order.orderType === "DELIVERY") {
      tableName = order.customerName ? `[Delivery] ${order.customerName}` : "เดลิเวอรี่";
    }
  }
  return {
    id: order.id,
    branchId: order.branchId,
    source: order.source,
    status: order.status,
    orderType: order.orderType,
    kitchenStatus: order.kitchenStatus,
    tableId: order.tableId ?? undefined,
    tableName,
    note: order.note ?? undefined,
    customerName: order.customerName ?? undefined,
    subtotalSatang: order.subtotalSatang,
    discountSatang: order.discountSatang,
    taxSatang: order.taxSatang,
    totalSatang: order.totalSatang,
    createdAt: order.createdAt.toISOString(),
    confirmedAt: order.confirmedAt?.toISOString(),
    paidAt: order.paidAt?.toISOString(),
    receipt: order.receipt ? { id: order.receipt.id, documentNumber: order.receipt.documentNumber, totalSatang: order.receipt.totalSatang, issuedAt: order.receipt.issuedAt.toISOString() } : undefined,
    lines: order.items.map((item) => toLineView(item.snapshot, { productId: item.productId, quantity: Number(item.quantity), unitPriceSatang: item.unitPriceSatang, name: item.product?.name })),
  };
}

export async function listPersistedOrders(filter: { branchId: string; status?: string[]; tableId?: string; since?: Date; take?: number }) {
  const orders = await prisma.posOrder.findMany({
    where: { branchId: filter.branchId, ...(filter.status?.length ? { status: { in: filter.status } } : {}), ...(filter.tableId ? { tableId: filter.tableId } : {}), ...(filter.since ? { createdAt: { gte: filter.since } } : {}) },
    include: orderInclude,
    orderBy: { createdAt: "desc" },
    take: filter.take ?? 200,
  });
  return orders.map(toPersistedOrderView);
}

export async function getPersistedOrderView(id: string) {
  const order = await prisma.posOrder.findUnique({ where: { id }, include: orderInclude });
  return order ? toPersistedOrderView(order) : undefined;
}

/** Cash taken by a branch in a time window (allocation-level; change handed back is excluded). */
export async function persistedCashBetween(branchId: string, from: Date, to?: Date) {
  const payments = await prisma.posPayment.findMany({ where: { order: { branchId }, createdAt: { gte: from, ...(to ? { lte: to } : {}) }, amountSatang: { gt: 0 } }, select: { allocations: true, method: true, amountSatang: true } });
  return payments.reduce((sum, payment) => sum + cashPortion(payment.allocations, payment.method, payment.amountSatang), 0);
}

export async function createPersistedOrder(input: {
  branchId: string;
  source: string;
  tableId?: string;
  lines: OrderLine[];
  idempotencyKey: string;
  orderType?: OrderType;
  note?: string;
  customerName?: string;
  actorUserId?: string;
  discountSatang?: number;
  queueNumber?: string;
  deliveryPlatform?: string;
  deliveryOrderId?: string;
}) {
  const existing = await prisma.posOrder.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) return existing;
  const products = await prisma.posProduct.findMany({ where: { branchId: input.branchId, id: { in: input.lines.map((line) => line.productId) } }, select: { id: true, sku: true, name: true, categoryId: true, priceSatang: true, available: true, channels: true, options: true } });
  for (const line of input.lines) {
    const product = products.find((p) => p.id === line.productId);
    if (!product) throw new Error(`Product ${line.productId} is not part of this branch menu.`);
    if (!product.available) throw new Error(`${line.name ?? line.productId} is sold out.`);
    const choices = toMenuItem(product).options.flatMap((group) => group.choices);
    for (const modifier of line.modifiers ?? []) if (!choices.some((choice) => choice.name === modifier.name && choice.priceSatang === modifier.priceSatang)) throw new Error(`Option "${modifier.name}" is not available for ${line.name ?? line.productId}.`);
    const modifierTotal = (line.modifiers ?? []).reduce((sum, modifier) => sum + modifier.priceSatang, 0);
    if (line.unitPriceSatang !== product.priceSatang + modifierTotal) throw new Error(`Price for ${line.name ?? line.productId} does not match the current menu. Refresh the menu and try again.`);
  }
  const totals = calculateOrder(input.lines, { ratePercent: 7, inclusive: true }, input.discountSatang ?? 0);
  let resolvedCustomerName = input.customerName;
  if (input.orderType === "TAKEAWAY" && input.queueNumber) {
    resolvedCustomerName = input.customerName ? `คิว #${input.queueNumber} (${input.customerName})` : `คิว #${input.queueNumber}`;
  } else if (input.orderType === "DELIVERY" && (input.deliveryPlatform || input.deliveryOrderId)) {
    const platform = input.deliveryPlatform || "Delivery";
    resolvedCustomerName = `[${platform}] ${input.deliveryOrderId || ""}${input.customerName ? ` (${input.customerName})` : ""}`.trim();
  }

  const order = await prisma.posOrder.create({
    data: {
      branchId: input.branchId,
      tableId: input.tableId,
      source: input.source,
      orderType: input.orderType ?? (input.tableId ? "DINE_IN" : "TAKEAWAY"),
      note: input.note,
      customerName: resolvedCustomerName,
      subtotalSatang: totals.subtotalSatang,
      discountSatang: totals.discountSatang,
      taxSatang: totals.vatSatang,
      totalSatang: totals.totalSatang,
      idempotencyKey: input.idempotencyKey,
      items: { create: input.lines.map((line) => ({ productId: line.productId, quantity: line.quantity, unitPriceSatang: line.unitPriceSatang, snapshot: line as unknown as Prisma.InputJsonValue })) },
    },
  });
  await recordPosAudit({ branchId: input.branchId, actorUserId: input.actorUserId, action: "order.created", entityType: "PosOrder", entityId: order.id, metadata: { source: input.source, totalSatang: totals.totalSatang } });
  return order;
}

export async function confirmPersistedOrder(id: string, actorUserId?: string) {
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
  await recordPosAudit({ branchId: confirmed.branchId, actorUserId, action: "order.confirmed", entityType: "PosOrder", entityId: confirmed.id, metadata: { itemCount: confirmed.items.length } });
  return confirmed;
}

export async function setPersistedKitchenStatus(id: string, kitchenStatus: KitchenStatus, actorUserId?: string) {
  const existing = await prisma.posOrder.findUnique({ where: { id } });
  if (!existing) throw new Error("Order not found.");
  if (existing.status === "CANCELLED") throw new Error("Cancelled orders cannot change kitchen status.");
  const order = await prisma.posOrder.update({ where: { id }, data: { kitchenStatus } });
  await recordPosAudit({ branchId: order.branchId, actorUserId, action: "order.kitchen_status", entityType: "PosOrder", entityId: order.id, metadata: { from: existing.kitchenStatus, to: kitchenStatus } });
  return order;
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

export async function refundPersistedOrder(input: { orderId: string; amountSatang: number; reason: string; idempotencyKey: string; actorUserId?: string }) {
  const existing = await prisma.posPayment.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) return existing;
  const refund = await prisma.$transaction(async (tx) => {
    const order = await tx.posOrder.findUnique({ where: { id: input.orderId }, include: { payments: true } });
    if (!order) throw new Error("Order not found.");
    if (order.status !== "COMPLETED") throw new Error("Only completed orders can be refunded.");
    const paid = order.payments.reduce((s, p) => s + p.amountSatang, 0);
    if (input.amountSatang > paid) throw new Error("Refund exceeds paid amount.");
    const payment = await tx.posPayment.create({ data: { orderId: order.id, method: "refund", amountSatang: -Math.abs(input.amountSatang), tenderedSatang: 0, changeSatang: 0, allocations: { reason: input.reason } as unknown as Prisma.InputJsonValue, idempotencyKey: input.idempotencyKey } });
    await tx.posOrder.update({ where: { id: order.id }, data: { status: input.amountSatang >= paid ? "REFUNDED" : "PARTIALLY_REFUNDED" } });
    return payment;
  });
  const order = await prisma.posOrder.findUnique({ where: { id: input.orderId }, select: { branchId: true } });
  if (order) await recordPosAudit({ branchId: order.branchId, actorUserId: input.actorUserId, action: "payment.refunded", entityType: "PosOrder", entityId: input.orderId, metadata: { amountSatang: input.amountSatang, reason: input.reason } });
  return refund;
}

export async function settlePersistedOrder(input: { orderId: string; allocations: PaymentAllocation[]; tenderedSatang: number; idempotencyKey: string; actorUserId?: string }) {
  const existing = await prisma.posPayment.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) return { ...existing, receipt: await prisma.posReceipt.findUnique({ where: { orderId: existing.orderId } }) };
  const draft = await prisma.posOrder.findUnique({ where: { id: input.orderId }, select: { status: true } });
  if (draft?.status === "DRAFT") await confirmPersistedOrder(input.orderId, input.actorUserId);
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.posOrder.findUnique({ where: { id: input.orderId } });
    if (!order) throw new Error("Order not found.");
    if (order.status !== "CONFIRMED") throw new Error(order.status === "COMPLETED" ? "Order is already paid." : "Order must be confirmed before payment.");
    validatePayments(order.totalSatang, input.allocations);
    const cashAmount = cashPortion(input.allocations);
    const payment = await tx.posPayment.create({ data: { orderId: order.id, method: input.allocations.map((allocation) => allocation.method).join("+") || "unknown", amountSatang: order.totalSatang, tenderedSatang: input.tenderedSatang, changeSatang: cashAmount ? cashChange(cashAmount, input.tenderedSatang) : 0, allocations: input.allocations as unknown as Prisma.InputJsonValue, idempotencyKey: input.idempotencyKey } });
    const year = new Date().getUTCFullYear();
    const sequence = await tx.posDocumentSequence.upsert({ where: { branchId_documentType_year: { branchId: order.branchId, documentType: "RECEIPT", year } }, create: { branchId: order.branchId, documentType: "RECEIPT", year, nextNumber: 1 }, update: { nextNumber: { increment: 1 } } });
    const receipt = await tx.posReceipt.create({ data: { branchId: order.branchId, orderId: order.id, documentType: "RECEIPT", documentNumber: `R-${year}-${String(sequence.nextNumber).padStart(6, "0")}`, totalSatang: order.totalSatang } });
    await tx.posOrder.update({ where: { id: order.id }, data: { status: "COMPLETED", paidAt: new Date() } });
    return { ...payment, branchId: order.branchId, receipt };
  });
  await recordPosAudit({ branchId: result.branchId, actorUserId: input.actorUserId, action: "payment.confirmed", entityType: "PosPayment", entityId: result.id, metadata: { orderId: input.orderId, allocationCount: input.allocations.length } });
  return result;
}
