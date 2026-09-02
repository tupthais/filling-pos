import { describe, it, expect } from "vitest";
import { calculateOrder } from "@/lib/domain/pos";
import { createOrder, confirmOrder, voidOrder } from "@/lib/domain/pos-store";
import { enqueueOfflineOrder, acknowledgeSync } from "@/lib/domain/offline-sync";

describe("พร้อมทำงานจริง — integration smoke", () => {
  it("order → confirm → void ห้าม void หลัง completed", () => {
    const order = createOrder({ branchId: "branch-1", source: "POS", lines: [{ productId: "p1", unitPriceSatang: 10000, quantity: 2 }], idempotencyKey: `it-${Date.now()}-1` });
    confirmOrder(order.id);
    const voided = voidOrder(order.id, "ลูกค้ายกเลิก");
    expect(voided?.status).toBe("CANCELLED");
  });
  it("offline outbox → ACK ไม่ซ้ำ", () => {
    const localId = `local-${Date.now()}`;
    enqueueOfflineOrder({ localOrderId: localId, deviceId: "sunmi-t1", payload: { branchId: "b1", items: [] } });
    const ack = acknowledgeSync(localId, { serverOrderId: "ord-server" });
    expect(ack.status).toBe("ACKED");
    expect(ack.serverOrderId).toBe("ord-server");
  });
  it("satang คำนวณไม่ปัดผิด — 7% inclusive", () => {
    const totals = calculateOrder([{ productId: "p1", unitPriceSatang: 10700, quantity: 1 }], { ratePercent: 7, inclusive: true });
    expect(totals.vatSatang).toBe(700);
    expect(totals.totalSatang).toBe(10700);
  });
});
