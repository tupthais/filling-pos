import { describe, expect, it } from "vitest";
import { closeShift, confirmOrder, createOrder, createPayment, openShift } from "@/lib/domain/pos-store";

describe("POS order settlement", () => {
  it("settles an order once and emits a receipt reference", () => {
    const order = createOrder({ branchId: "test", source: "POS", lines: [{ productId: "coffee", unitPriceSatang: 1000, quantity: 1 }], idempotencyKey: `test-order-${crypto.randomUUID()}` });
    confirmOrder(order.id);
    const first = createPayment({ orderId: order.id, idempotencyKey: `test-payment-${crypto.randomUUID()}`, tenderedSatang: 1000, allocations: [{ method: "cash", amountSatang: 1000 }] });
    expect(first.changeSatang).toBe(0);
    expect(order.status).toBe("COMPLETED");
    expect(order.receiptId).toMatch(/^rcpt_/);
  });
  it("closes a shift with expected cash and variance", () => { const shift = openShift({ branchId: "test", cashierId: "cashier", openingFloatSatang: 1000 }); const closed = closeShift(shift.id, 1000); expect(closed?.varianceSatang).toBe(0); });
});
