import { calculateOrder, consumeBom, type OrderLine, type StockLedgerEntry } from "./pos";
import { cashChange, validatePayments, type PaymentAllocation } from "./pos";

export type PosOrder = {
  id: string;
  branchId: string;
  source: "POS" | "QR" | "STAFF_ASSISTED" | "MANUAL_DELIVERY";
  tableId?: string;
  status: "DRAFT" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  lines: OrderLine[];
  totals: ReturnType<typeof calculateOrder>;
  idempotencyKey: string;
  createdAt: string;
  confirmedAt?: string;
  paidAt?: string;
  receiptId?: string;
};

export type PosPayment = { id: string; orderId: string; allocations: PaymentAllocation[]; tenderedSatang: number; changeSatang: number; idempotencyKey: string; createdAt: string };
export type PosShift = { id: string; branchId: string; cashierId: string; openingFloatSatang: number; openedAt: string; status: "OPEN" | "CLOSED"; cashSalesSatang: number; cashOutSatang: number; refundsSatang: number; countedCashSatang?: number; varianceSatang?: number; closedAt?: string };
export type PosReceipt = { id: string; branchId: string; orderId: string; documentType: "RECEIPT"; documentNumber: string; totalSatang: number; issuedAt: string; voidedAt?: string };

const orders = new Map<string, PosOrder>();
const idempotency = new Map<string, string>();
const payments = new Map<string, PosPayment>();
const paymentIdempotency = new Map<string, string>();
const shifts = new Map<string, PosShift>();
const receipts = new Map<string, PosReceipt>();
const receiptSequences = new Map<string, number>();
let stockLedger: StockLedgerEntry[] = [];

export function listOrders() { return [...orders.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }

export function createOrder(input: { branchId: string; source: PosOrder["source"]; tableId?: string; lines: OrderLine[]; idempotencyKey: string }) {
  const existingId = idempotency.get(input.idempotencyKey);
  if (existingId) return orders.get(existingId)!;
  const order: PosOrder = { id: `ord_${crypto.randomUUID()}`, branchId: input.branchId, source: input.source, tableId: input.tableId, status: "DRAFT", lines: input.lines, totals: calculateOrder(input.lines, { ratePercent: 7, inclusive: true }), idempotencyKey: input.idempotencyKey, createdAt: new Date().toISOString() };
  orders.set(order.id, order);
  idempotency.set(input.idempotencyKey, order.id);
  return order;
}

export function confirmOrder(id: string) {
  const order = orders.get(id);
  if (!order) return undefined;
  if (order.status === "CONFIRMED" || order.status === "COMPLETED") return order;
  if (order.status !== "DRAFT") throw new Error("Only draft orders can be confirmed.");
  order.status = "CONFIRMED";
  order.confirmedAt = new Date().toISOString();
  stockLedger = consumeBom(order.lines.flatMap((line) => [{ ingredientId: `${line.productId}:base`, quantity: 0.1, unit: "kg" }]), 1, order.id, stockLedger);
  return order;
}

export function createPayment(input: { orderId: string; allocations: PaymentAllocation[]; tenderedSatang: number; idempotencyKey: string }) {
  const existingId = paymentIdempotency.get(input.idempotencyKey);
  if (existingId) return payments.get(existingId)!;
  const order = orders.get(input.orderId);
  if (!order) throw new Error("Order not found.");
  if (order.status !== "CONFIRMED" && order.status !== "COMPLETED") throw new Error("Order must be confirmed before payment.");
  validatePayments(order.totals.totalSatang, input.allocations);
  const cashAmount = input.allocations.filter((allocation) => allocation.method === "cash").reduce((sum, allocation) => sum + allocation.amountSatang, 0);
  const payment: PosPayment = { id: `pay_${crypto.randomUUID()}`, orderId: input.orderId, allocations: input.allocations, tenderedSatang: input.tenderedSatang, changeSatang: cashAmount ? cashChange(cashAmount, input.tenderedSatang) : 0, idempotencyKey: input.idempotencyKey, createdAt: new Date().toISOString() };
  payments.set(payment.id, payment);
  paymentIdempotency.set(input.idempotencyKey, payment.id);
  order.status = "COMPLETED";
  order.paidAt = payment.createdAt;
  order.receiptId = issueReceipt(order);
  return payment;
}

function issueReceipt(order: PosOrder) {
  const sequenceKey = `${order.branchId}:RECEIPT:${new Date().getUTCFullYear()}`;
  const next = (receiptSequences.get(sequenceKey) ?? 0) + 1;
  receiptSequences.set(sequenceKey, next);
  const receipt: PosReceipt = { id: `rcpt_${crypto.randomUUID()}`, branchId: order.branchId, orderId: order.id, documentType: "RECEIPT", documentNumber: `R-${new Date().getUTCFullYear()}-${String(next).padStart(6, "0")}`, totalSatang: order.totals.totalSatang, issuedAt: new Date().toISOString() };
  receipts.set(receipt.id, receipt);
  return receipt.id;
}

export function getReceipt(id: string) { return receipts.get(id); }
export function openShift(input: { branchId: string; cashierId: string; openingFloatSatang: number }) { const shift: PosShift = { id: `shift_${crypto.randomUUID()}`, ...input, openedAt: new Date().toISOString(), status: "OPEN", cashSalesSatang: 0, cashOutSatang: 0, refundsSatang: 0 }; shifts.set(shift.id, shift); return shift; }
export function closeShift(id: string, countedCashSatang: number) { const shift = shifts.get(id); if (!shift) return undefined; if (shift.status === "CLOSED") return shift; const expected = shift.openingFloatSatang + shift.cashSalesSatang - shift.cashOutSatang - shift.refundsSatang; shift.status = "CLOSED"; shift.countedCashSatang = countedCashSatang; shift.varianceSatang = countedCashSatang - expected; shift.closedAt = new Date().toISOString(); return shift; }
export function voidOrder(id: string, reason: string) { const order = orders.get(id); if (!order) return undefined; if (order.status === "COMPLETED") throw new Error("Cannot void completed order — use refund."); if (order.status === "CANCELLED") return order; order.status = "CANCELLED"; (order as unknown as Record<string, unknown>).voidReason = reason; return order; }
export function listShifts() { return [...shifts.values()].sort((a, b) => b.openedAt.localeCompare(a.openedAt)); }

export function getStockLedger() { return [...stockLedger]; }
