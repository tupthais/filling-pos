import { describe, expect, it } from "vitest";
import { appendCashLedger, calculateDelivery, calculateOrder, cashChange, consumeBom, loyaltyPoints, schemeEligibleAmount } from "@/lib/domain/pos";

describe("POS domain invariants", () => {
  it("uses satang and awards one point per 100 baht", () => { expect(loyaltyPoints(100_00)).toBe(1); expect(loyaltyPoints(250_00)).toBe(2); });
  it("calculates schemes and cash change", () => { expect(schemeEligibleAmount(24, "50/50")).toBe(48); expect(schemeEligibleAmount(24, "60/40")).toBe(60); expect(cashChange(75, 100)).toBe(25); });
  it("supports VAT inclusive and exclusive pricing", () => { expect(calculateOrder([{ productId: "p", unitPriceSatang: 1000, quantity: 1 }], { ratePercent: 7, inclusive: false }).totalSatang).toBe(1070); expect(calculateOrder([{ productId: "p", unitPriceSatang: 1070, quantity: 1 }], { ratePercent: 7, inclusive: true }).vatSatang).toBe(70); });
  it("consumes a BOM exactly once", () => { const bom = [{ ingredientId: "rice", quantity: 0.2, unit: "kg" }]; const first = consumeBom(bom, 2, "order-1", []); expect(first[0].quantity).toBe(-0.4); expect(consumeBom(bom, 2, "order-1", first)).toEqual(first); });
  it("calculates shift variance and delivery deductions", () => { expect(appendCashLedger(1000, 5000, 300, 200, 5500).varianceSatang).toBe(0); expect(calculateDelivery(10000, { commissionPercent: 20, paymentFeePercent: 2, merchantDiscountPercent: 5, otherFeeSatang: 100 }).netPayoutSatang).toBe(7200); });
});
