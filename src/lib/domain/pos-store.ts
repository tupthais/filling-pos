import { calculateOrder, cashChange, consumeBom, validatePayments, type OrderLine, type PaymentAllocation, type StockLedgerEntry } from "./pos";
import { cashPortion, toLineView, type KitchenStatus, type OrderType, type OrderView } from "./order-view";

/**
 * In-memory POS store used when POS_PERSISTENCE_MODE=memory (demo / single-device trial).
 * State lives on globalThis so every route bundle in the same server process shares it.
 */
export type PosOrder = {
  id: string;
  branchId: string;
  source: "POS" | "QR" | "STAFF_ASSISTED" | "MANUAL_DELIVERY";
  tableId?: string;
  tableName?: string;
  queueNumber?: string;
  deliveryPlatform?: string;
  deliveryOrderId?: string;
  status: "DRAFT" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  orderType: OrderType;
  kitchenStatus: KitchenStatus;
  note?: string;
  customerName?: string;
  lines: OrderLine[];
  totals: ReturnType<typeof calculateOrder>;
  idempotencyKey: string;
  createdAt: string;
  confirmedAt?: string;
  paidAt?: string;
  receiptId?: string;
  voidReason?: string;
};

export type PosPayment = { id: string; orderId: string; branchId: string; allocations: PaymentAllocation[]; amountSatang: number; tenderedSatang: number; changeSatang: number; idempotencyKey: string; createdAt: string };
export type PosShift = { id: string; branchId: string; cashierId: string; openingFloatSatang: number; openedAt: string; status: "OPEN" | "CLOSED"; cashSalesSatang: number; cashOutSatang: number; refundsSatang: number; expectedCashSatang?: number; countedCashSatang?: number; varianceSatang?: number; closedAt?: string };
export type PosReceipt = { id: string; branchId: string; orderId: string; documentType: "RECEIPT"; documentNumber: string; totalSatang: number; issuedAt: string; voidedAt?: string };
export type MemoryTable = { id: string; branchId: string; name: string; qrToken: string; status: string };

type Store = {
  orders: Map<string, PosOrder>;
  idempotency: Map<string, string>;
  payments: Map<string, PosPayment>;
  paymentIdempotency: Map<string, string>;
  shifts: Map<string, PosShift>;
  receipts: Map<string, PosReceipt>;
  receiptSequences: Map<string, number>;
  tables: MemoryTable[];
  stockLedger: StockLedgerEntry[];
};

export const MEMORY_BRANCH_ID = "branch-main";

const globalStore = globalThis as typeof globalThis & { __fillingPosStore?: Store };
const store: Store = (globalStore.__fillingPosStore ??= {
  orders: new Map(),
  idempotency: new Map(),
  payments: new Map(),
  paymentIdempotency: new Map(),
  shifts: new Map(),
  receipts: new Map(),
  receiptSequences: new Map(),
  tables: Array.from({ length: 8 }, (_, index) => {
    const number = String(index + 1).padStart(2, "0");
    return { id: `table-${number}`, branchId: MEMORY_BRANCH_ID, name: `โต๊ะ ${number}`, qrToken: `qr_demo_table_${number}`, status: "AVAILABLE" };
  }),
  stockLedger: [],
});

const DEFAULT_TAX = { ratePercent: 7, inclusive: true };

export function listOrders() { return [...store.orders.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
export function getOrder(id: string) { return store.orders.get(id); }

export function createOrder(input: {
  branchId: string;
  source: PosOrder["source"];
  tableId?: string;
  lines: OrderLine[];
  idempotencyKey: string;
  orderType?: OrderType;
  note?: string;
  customerName?: string;
  queueNumber?: string;
  deliveryPlatform?: string;
  deliveryOrderId?: string;
  discountSatang?: number;
}) {
  const existingId = store.idempotency.get(input.idempotencyKey);
  if (existingId) return store.orders.get(existingId)!;
  const table = input.tableId ? store.tables.find((t) => t.id === input.tableId) : undefined;
  const resolvedOrderType = input.orderType ?? (input.tableId ? "DINE_IN" : "TAKEAWAY");
  let resolvedTableName = table?.name;
  if (resolvedOrderType === "TAKEAWAY") {
    resolvedTableName = input.queueNumber
      ? `คิว #${input.queueNumber}${input.customerName ? ` (${input.customerName})` : ""}`
      : input.customerName
      ? `คิว (${input.customerName})`
      : "สั่งกลับบ้าน";
  } else if (resolvedOrderType === "DELIVERY") {
    const platform = input.deliveryPlatform || "Delivery";
    resolvedTableName = `[${platform}] ${input.deliveryOrderId || ""}${input.customerName ? ` (${input.customerName})` : ""}`.trim();
  }

  const order: PosOrder = {
    id: `ord_${crypto.randomUUID()}`,
    branchId: input.branchId,
    source: input.source,
    tableId: input.tableId,
    tableName: resolvedTableName,
    queueNumber: input.queueNumber,
    deliveryPlatform: input.deliveryPlatform,
    deliveryOrderId: input.deliveryOrderId,
    status: "DRAFT",
    orderType: resolvedOrderType,
    kitchenStatus: "NEW",
    note: input.note,
    customerName: input.customerName,
    lines: input.lines,
    totals: calculateOrder(input.lines, DEFAULT_TAX, input.discountSatang ?? 0),
    idempotencyKey: input.idempotencyKey,
    createdAt: new Date().toISOString(),
  };
  store.orders.set(order.id, order);
  store.idempotency.set(input.idempotencyKey, order.id);
  return order;
}

export function confirmOrder(id: string) {
  const order = store.orders.get(id);
  if (!order) return undefined;
  if (order.status === "CONFIRMED" || order.status === "COMPLETED") return order;
  if (order.status !== "DRAFT") throw new Error("Only draft orders can be confirmed.");
  order.status = "CONFIRMED";
  order.confirmedAt = new Date().toISOString();
  store.stockLedger = consumeBom(order.lines.flatMap((line) => [{ ingredientId: `${line.productId}:base`, quantity: 0.1 * line.quantity, unit: "kg" }]), 1, order.id, store.stockLedger);
  return order;
}

export function setKitchenStatus(id: string, kitchenStatus: KitchenStatus) {
  const order = store.orders.get(id);
  if (!order) return undefined;
  if (order.status === "CANCELLED") throw new Error("Cancelled orders cannot change kitchen status.");
  order.kitchenStatus = kitchenStatus;
  return order;
}

export function createPayment(input: { orderId: string; allocations: PaymentAllocation[]; tenderedSatang: number; idempotencyKey: string }) {
  const existingId = store.paymentIdempotency.get(input.idempotencyKey);
  if (existingId) return store.payments.get(existingId)!;
  const order = store.orders.get(input.orderId);
  if (!order) throw new Error("Order not found.");
  if (order.status === "DRAFT") confirmOrder(order.id);
  if (order.status !== "CONFIRMED") throw new Error("Order must be confirmed before payment.");
  validatePayments(order.totals.totalSatang, input.allocations);
  const cashAmount = cashPortion(input.allocations);
  const payment: PosPayment = { id: `pay_${crypto.randomUUID()}`, orderId: input.orderId, branchId: order.branchId, allocations: input.allocations, amountSatang: order.totals.totalSatang, tenderedSatang: input.tenderedSatang, changeSatang: cashAmount ? cashChange(cashAmount, input.tenderedSatang) : 0, idempotencyKey: input.idempotencyKey, createdAt: new Date().toISOString() };
  store.payments.set(payment.id, payment);
  store.paymentIdempotency.set(input.idempotencyKey, payment.id);
  order.status = "COMPLETED";
  order.paidAt = payment.createdAt;
  order.receiptId = issueReceipt(order);
  const openShift = [...store.shifts.values()].find((shift) => shift.branchId === order.branchId && shift.status === "OPEN");
  if (openShift) openShift.cashSalesSatang += cashAmount;
  return payment;
}

function issueReceipt(order: PosOrder) {
  const year = new Date().getUTCFullYear();
  const sequenceKey = `${order.branchId}:RECEIPT:${year}`;
  const next = (store.receiptSequences.get(sequenceKey) ?? 0) + 1;
  store.receiptSequences.set(sequenceKey, next);
  const receipt: PosReceipt = { id: `rcpt_${crypto.randomUUID()}`, branchId: order.branchId, orderId: order.id, documentType: "RECEIPT", documentNumber: `R-${year}-${String(next).padStart(6, "0")}`, totalSatang: order.totals.totalSatang, issuedAt: new Date().toISOString() };
  store.receipts.set(receipt.id, receipt);
  return receipt.id;
}

export function getReceipt(id: string) { return store.receipts.get(id); }
export function listPayments() { return [...store.payments.values()]; }

export function openShift(input: { branchId: string; cashierId: string; openingFloatSatang: number }) {
  const existing = [...store.shifts.values()].find((shift) => shift.branchId === input.branchId && shift.status === "OPEN");
  if (existing) return existing;
  const shift: PosShift = { id: `shift_${crypto.randomUUID()}`, ...input, openedAt: new Date().toISOString(), status: "OPEN", cashSalesSatang: 0, cashOutSatang: 0, refundsSatang: 0 };
  store.shifts.set(shift.id, shift);
  return shift;
}

export function closeShift(id: string, countedCashSatang: number) {
  const shift = store.shifts.get(id);
  if (!shift) return undefined;
  if (shift.status === "CLOSED") return shift;
  const expected = shift.openingFloatSatang + shift.cashSalesSatang - shift.cashOutSatang - shift.refundsSatang;
  shift.status = "CLOSED";
  shift.expectedCashSatang = expected;
  shift.countedCashSatang = countedCashSatang;
  shift.varianceSatang = countedCashSatang - expected;
  shift.closedAt = new Date().toISOString();
  return shift;
}

export function voidOrder(id: string, reason: string) {
  const order = store.orders.get(id);
  if (!order) return undefined;
  if (order.status === "COMPLETED") throw new Error("Cannot void completed order — use refund.");
  if (order.status === "CANCELLED") return order;
  order.status = "CANCELLED";
  order.voidReason = reason;
  return order;
}

export function listShifts() { return [...store.shifts.values()].sort((a, b) => b.openedAt.localeCompare(a.openedAt)); }
export function getStockLedger() { return [...store.stockLedger]; }

export function listTables() { return store.tables.map((table) => ({ ...table })); }
export function findTableByToken(token: string) { return store.tables.find((table) => table.qrToken === token); }
export function addTable(input: { name: string; qrToken?: string }) {
  const table: MemoryTable = { id: `table_${crypto.randomUUID()}`, branchId: MEMORY_BRANCH_ID, name: input.name, qrToken: input.qrToken ?? `qr_${crypto.randomUUID().slice(0, 12)}`, status: "AVAILABLE" };
  store.tables.push(table);
  return table;
}

export function toMemoryOrderView(order: PosOrder): OrderView {
  const receipt = order.receiptId ? store.receipts.get(order.receiptId) : undefined;
  return {
    id: order.id,
    branchId: order.branchId,
    source: order.source,
    status: order.status,
    orderType: order.orderType,
    kitchenStatus: order.kitchenStatus,
    tableId: order.tableId,
    tableName: order.tableName,
    queueNumber: order.queueNumber,
    deliveryPlatform: order.deliveryPlatform,
    deliveryOrderId: order.deliveryOrderId,
    note: order.note,
    customerName: order.customerName,
    subtotalSatang: order.totals.subtotalSatang,
    discountSatang: order.totals.discountSatang,
    taxSatang: order.totals.vatSatang,
    totalSatang: order.totals.totalSatang,
    createdAt: order.createdAt,
    confirmedAt: order.confirmedAt,
    paidAt: order.paidAt,
    receipt: receipt ? { id: receipt.id, documentNumber: receipt.documentNumber, totalSatang: receipt.totalSatang, issuedAt: receipt.issuedAt } : undefined,
    lines: order.lines.map((line) => toLineView(line)),
  };
}
