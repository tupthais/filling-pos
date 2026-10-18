import type { OrderView, SalesReport } from "./order-view";

export type ReportOrder = { status: string; totalSatang: number; source: string };
export type ReportLedgerEntry = { ingredientId: string; quantity: number };
export type ReportPayment = { method: string; amountSatang: number; allocations: unknown };

export function buildSalesSummary(orders: ReportOrder[]) { const completed = orders.filter((order) => order.status === "COMPLETED"); const bySource: Record<string, number> = {}; for (const order of completed) bySource[order.source] = (bySource[order.source] ?? 0) + order.totalSatang; return { completedOrders: completed.length, grossSalesSatang: completed.reduce((sum, order) => sum + order.totalSatang, 0), bySource }; }
export function buildInventoryBalances(entries: ReportLedgerEntry[]) {
  return entries.reduce<Record<string, number>>((balances, entry) => {
    const quantity = Number(entry.quantity);
    balances[entry.ingredientId] = (balances[entry.ingredientId] ?? 0) + quantity;
    return balances;
  }, {});
}

function hourIn(iso: string, timeZone: string) {
  return Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone }).format(new Date(iso)));
}

/** Daily dashboard report (sales, payment mix, hourly curve, best sellers). Pure — used by both persistence modes. */
export function buildDailyReport(orders: OrderView[], payments: ReportPayment[], from: Date, timeZone = "Asia/Bangkok"): SalesReport {
  const completed = orders.filter((order) => order.status === "COMPLETED");
  const open = orders.filter((order) => order.status === "DRAFT" || order.status === "CONFIRMED");
  const add = (record: Record<string, number>, key: string, value: number) => { record[key] = (record[key] ?? 0) + value; };
  const bySource: Record<string, number> = {};
  const byOrderType: Record<string, number> = {};
  const byMethod: Record<string, number> = {};
  const hours = new Map<number, { totalSatang: number; orders: number }>();
  const items = new Map<string, { name: string; quantity: number; totalSatang: number }>();
  for (const order of completed) {
    add(bySource, order.source, order.totalSatang);
    add(byOrderType, order.orderType, order.totalSatang);
    const hour = hourIn(order.paidAt ?? order.createdAt, timeZone);
    const bucket = hours.get(hour) ?? { totalSatang: 0, orders: 0 };
    bucket.totalSatang += order.totalSatang;
    bucket.orders += 1;
    hours.set(hour, bucket);
    for (const line of order.lines) {
      const item = items.get(line.name) ?? { name: line.name, quantity: 0, totalSatang: 0 };
      item.quantity += line.quantity;
      item.totalSatang += line.unitPriceSatang * line.quantity;
      items.set(line.name, item);
    }
  }
  for (const payment of payments) {
    if (payment.amountSatang < 0 || payment.method === "refund") { add(byMethod, "refund", -Math.abs(payment.amountSatang)); continue; }
    if (Array.isArray(payment.allocations) && payment.allocations.length) {
      for (const allocation of payment.allocations as Array<{ method?: string; amountSatang?: number }>) add(byMethod, allocation.method ?? "other", Number(allocation.amountSatang ?? 0));
    } else add(byMethod, payment.method, payment.amountSatang);
  }
  const grossSalesSatang = completed.reduce((sum, order) => sum + order.totalSatang, 0);
  return {
    from: from.toISOString(),
    completedOrders: completed.length,
    grossSalesSatang,
    taxSatang: completed.reduce((sum, order) => sum + order.taxSatang, 0),
    averageBillSatang: completed.length ? Math.round(grossSalesSatang / completed.length) : 0,
    openOrders: open.length,
    openTotalSatang: open.reduce((sum, order) => sum + order.totalSatang, 0),
    cancelledOrders: orders.filter((order) => order.status === "CANCELLED").length,
    byMethod,
    bySource,
    byOrderType,
    byHour: [...hours.entries()].sort((a, b) => a[0] - b[0]).map(([hour, value]) => ({ hour, ...value })),
    topItems: [...items.values()].sort((a, b) => b.quantity - a.quantity || b.totalSatang - a.totalSatang).slice(0, 10),
  };
}
