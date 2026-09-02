import { describe, expect, it } from "vitest";
import { buildInventoryBalances, buildSalesSummary } from "@/lib/domain/reports";

describe("operational reports", () => {
  it("summarizes completed sales and excludes drafts", () => {
    const report = buildSalesSummary([{ status: "COMPLETED", totalSatang: 10000, source: "POS" }, { status: "DRAFT", totalSatang: 5000, source: "POS" }, { status: "COMPLETED", totalSatang: 7000, source: "QR" }]);
    expect(report.completedOrders).toBe(2);
    expect(report.grossSalesSatang).toBe(17000);
    expect(report.bySource.QR).toBe(7000);
  });

  it("projects append-only inventory balances by ingredient", () => {
    const report = buildInventoryBalances([{ ingredientId: "rice", quantity: 10 }, { ingredientId: "rice", quantity: -2 }, { ingredientId: "oil", quantity: 3 }]);
    expect(report).toEqual({ rice: 8, oil: 3 });
  });
});
