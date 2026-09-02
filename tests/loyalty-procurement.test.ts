import { describe, expect, it } from "vitest";
import { earnLoyalty, resolveSupplierPolicy, validatePurchaseDraft } from "@/lib/domain/loyalty-procurement";

describe("loyalty and procurement boundaries", () => {
  it("does not award duplicate points for the same idempotency key", () => { const input = { customerId: "c1", orderId: "o1", eligibleAmountSatang: 25000, idempotencyKey: `loyalty-${crypto.randomUUID()}` }; expect(earnLoyalty(input)).toEqual(earnLoyalty(input)); expect(earnLoyalty(input).points).toBe(2); });
  it("resolves effective supplier policy and blocks invalid MOQ", () => { const policy = { supplierId: "s1", branchId: "b1", effectiveFrom: "2026-01-01T00:00:00.000Z", minimumOrderSatang: 100000, minimumQuantityByIngredient: { rice: 10 }, packSizeByIngredient: { rice: 5 }, deliveryFeeSatang: 5000 }; expect(resolveSupplierPolicy([policy], "s1", "b1")?.supplierId).toBe("s1"); expect(validatePurchaseDraft(policy, [{ ingredientId: "rice", quantity: 5, unitPriceSatang: 1000 }]).valid).toBe(false); });
});
