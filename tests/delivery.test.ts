import { describe, expect, it } from "vitest";
import { calculateDelivery } from "@/lib/domain/pos";

describe("manual delivery profiles", () => {
  it("calculates payout from effective profile rates", () => {
    const result = calculateDelivery(10000, { commissionPercent: 20, paymentFeePercent: 2, merchantDiscountPercent: 5, otherFeeSatang: 100 });
    expect(result.netPayoutSatang).toBe(7200);
    expect(result.deductionPercent).toBeCloseTo(28);
  });
});
