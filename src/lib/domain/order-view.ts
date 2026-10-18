import type { OrderLine, OrderLineModifier, Satang } from "./pos";

/** Shared, framework-free order DTO used by API responses and the POS UI. */
export type OrderType = "DINE_IN" | "TAKEAWAY" | "DELIVERY";
export type KitchenStatus = "NEW" | "COOKING" | "READY" | "SERVED";
export type OrderStatus = "DRAFT" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "REFUNDED" | "PARTIALLY_REFUNDED";

export const ORDER_TYPES: OrderType[] = ["DINE_IN", "TAKEAWAY", "DELIVERY"];
export const KITCHEN_FLOW: KitchenStatus[] = ["NEW", "COOKING", "READY", "SERVED"];

export type OrderLineView = { productId: string; name: string; quantity: number; unitPriceSatang: Satang; modifiers: OrderLineModifier[]; note?: string };

export type ReceiptView = { id: string; documentNumber: string; totalSatang: Satang; issuedAt: string };

export type OrderView = {
  id: string;
  branchId: string;
  source: string;
  status: OrderStatus | string;
  orderType: OrderType | string;
  kitchenStatus: KitchenStatus | string;
  tableId?: string;
  tableName?: string;
  queueNumber?: string;
  deliveryPlatform?: string;
  deliveryOrderId?: string;
  note?: string;
  customerName?: string;
  subtotalSatang: Satang;
  discountSatang: Satang;
  taxSatang: Satang;
  totalSatang: Satang;
  createdAt: string;
  confirmedAt?: string;
  paidAt?: string;
  receipt?: ReceiptView;
  lines: OrderLineView[];
};

export type TableView = { id: string; name: string; qrToken: string; status: "AVAILABLE" | "OCCUPIED"; openOrders: number; openTotalSatang: number; openSince?: string; readyOrders: number };

export type ShiftView = { id: string; status: string; cashierId: string; openingFloatSatang: Satang; cashSalesSatang: Satang; expectedCashSatang: Satang; countedCashSatang?: Satang; varianceSatang?: Satang; openedAt: string; closedAt?: string };

export type SalesReport = {
  from: string;
  completedOrders: number;
  grossSalesSatang: Satang;
  taxSatang: Satang;
  averageBillSatang: Satang;
  openOrders: number;
  openTotalSatang: Satang;
  cancelledOrders: number;
  byMethod: Record<string, Satang>;
  bySource: Record<string, Satang>;
  byOrderType: Record<string, Satang>;
  byHour: Array<{ hour: number; totalSatang: Satang; orders: number }>;
  topItems: Array<{ name: string; quantity: number; totalSatang: Satang }>;
};

/** Statuses that still occupy a table / still need payment. */
export const OPEN_ORDER_STATUSES = ["DRAFT", "CONFIRMED"];

export function isOpenOrder(order: Pick<OrderView, "status">) {
  return OPEN_ORDER_STATUSES.includes(order.status);
}

export function nextKitchenStatus(current: string): KitchenStatus | undefined {
  const index = KITCHEN_FLOW.indexOf(current as KitchenStatus);
  return index >= 0 && index < KITCHEN_FLOW.length - 1 ? KITCHEN_FLOW[index + 1] : undefined;
}

export function isKitchenStatus(value: unknown): value is KitchenStatus {
  return typeof value === "string" && (KITCHEN_FLOW as string[]).includes(value);
}

/** Normalises a raw line (memory store line or persisted JSON snapshot) into a display line. */
export function toLineView(raw: unknown, fallback?: { productId?: string; quantity?: number; unitPriceSatang?: number; name?: string }): OrderLineView {
  const line = (raw && typeof raw === "object" ? raw : {}) as Partial<OrderLine>;
  const modifiers = Array.isArray(line.modifiers) ? line.modifiers.filter((m): m is OrderLineModifier => !!m && typeof m.name === "string" && typeof m.priceSatang === "number") : [];
  return {
    productId: String(line.productId ?? fallback?.productId ?? ""),
    name: String(line.name ?? fallback?.name ?? line.productId ?? fallback?.productId ?? "รายการ"),
    quantity: Number(fallback?.quantity ?? line.quantity ?? 1),
    unitPriceSatang: Number(fallback?.unitPriceSatang ?? line.unitPriceSatang ?? 0),
    modifiers,
    note: typeof line.note === "string" && line.note ? line.note : undefined,
  };
}

/** Cash portion of a payment allocation list (supports legacy `method` strings like "cash+qr"). */
export function cashPortion(allocations: unknown, fallbackMethod?: string, amountSatang = 0): Satang {
  if (Array.isArray(allocations)) return allocations.reduce((sum, a) => sum + (a && typeof a === "object" && (a as { method?: string }).method === "cash" ? Number((a as { amountSatang?: number }).amountSatang ?? 0) : 0), 0);
  return fallbackMethod === "cash" ? amountSatang : 0;
}
