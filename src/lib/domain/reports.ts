export type ReportOrder = { status: string; totalSatang: number; source: string };
export type ReportLedgerEntry = { ingredientId: string; quantity: number };

export function buildSalesSummary(orders: ReportOrder[]) { const completed = orders.filter((order) => order.status === "COMPLETED"); const bySource: Record<string, number> = {}; for (const order of completed) bySource[order.source] = (bySource[order.source] ?? 0) + order.totalSatang; return { completedOrders: completed.length, grossSalesSatang: completed.reduce((sum, order) => sum + order.totalSatang, 0), bySource }; }
export function buildInventoryBalances(entries: ReportLedgerEntry[]) { return entries.reduce<Record<string, number>>((balances, entry) => ({ ...balances, [entry.ingredientId]: (balances[entry.ingredientId] ?? 0) + entry.quantity }), {}); }
