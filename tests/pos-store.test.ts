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

  it("creates takeaway order with queue number and formats tableName", () => {
    const order = createOrder({
      branchId: "test",
      source: "POS",
      orderType: "TAKEAWAY",
      queueNumber: "A05",
      customerName: "สมชาย",
      lines: [{ productId: "rice", unitPriceSatang: 5000, quantity: 2 }],
      idempotencyKey: `test-order-${crypto.randomUUID()}`,
    });
    expect(order.orderType).toBe("TAKEAWAY");
    expect(order.queueNumber).toBe("A05");
    expect(order.tableName).toBe("คิว #A05 (สมชาย)");
  });

  it("creates delivery order with platform and order id", () => {
    const order = createOrder({
      branchId: "test",
      source: "POS",
      orderType: "DELIVERY",
      deliveryPlatform: "Grab",
      deliveryOrderId: "#GF-8841",
      customerName: "ไรเดอร์เอก",
      lines: [{ productId: "tea", unitPriceSatang: 4500, quantity: 1 }],
      idempotencyKey: `test-order-${crypto.randomUUID()}`,
    });
    expect(order.orderType).toBe("DELIVERY");
    expect(order.deliveryPlatform).toBe("Grab");
    expect(order.deliveryOrderId).toBe("#GF-8841");
    expect(order.tableName).toBe("[Grab] #GF-8841 (ไรเดอร์เอก)");
  });

  it("applies order discountSatang and calculates total and change accurately", () => {
    // 2 x 5000 = 10000 satang (100 THB). Discount 2000 satang (20 THB). Total should be 8000 satang (80 THB).
    const order = createOrder({
      branchId: "test",
      source: "POS",
      lines: [{ productId: "curry", unitPriceSatang: 5000, quantity: 2 }],
      discountSatang: 2000,
      idempotencyKey: `test-order-${crypto.randomUUID()}`,
    });
    expect(order.totals.subtotalSatang).toBe(10000);
    expect(order.totals.discountSatang).toBe(2000);
    expect(order.totals.totalSatang).toBe(8000);

    confirmOrder(order.id);
    const payment = createPayment({
      orderId: order.id,
      idempotencyKey: `test-payment-${crypto.randomUUID()}`,
      tenderedSatang: 10000, // Pay 100 THB cash for 80 THB order
      allocations: [{ method: "cash", amountSatang: 8000 }],
    });
    expect(payment.amountSatang).toBe(8000);
    expect(payment.changeSatang).toBe(2000); // 20 THB change
    expect(order.status).toBe("COMPLETED");
  });

  it("closes a shift with expected cash and variance", () => { const shift = openShift({ branchId: "test", cashierId: "cashier", openingFloatSatang: 1000 }); const closed = closeShift(shift.id, 1000); expect(closed?.varianceSatang).toBe(0); });
});
