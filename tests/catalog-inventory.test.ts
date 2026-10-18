import { describe, expect, it } from "vitest";
import { addCatalogProduct, adjustInventory, availableForChannel, calculateModifierTotal, receiveInventory, recordStockCount, transferInventory, writeOffExpiredLot } from "@/lib/domain/catalog-inventory";

describe("catalog and inventory", () => {
  it("creates products with channel availability", () => {
    const product = addCatalogProduct({ name: "ชาไทย", categoryId: "drinks", sku: "THAI-01", priceSatang: 4500, channels: { POS: true, QR: true, DELIVERY: false } });
    expect(product.channels.DELIVERY).toBe(false);
  });

  it("records receiving and adjustments as append-only ledger entries", () => {
    const ledger = receiveInventory([], { ingredientId: "milk", quantity: 5, unit: "litre", reference: "GRN-1" });
    const adjusted = adjustInventory(ledger, { ingredientId: "milk", quantity: -1, unit: "litre", reason: "waste", reference: "WASTE-1" });
    expect(adjusted).toHaveLength(2);
    expect(adjusted.reduce((sum, entry) => sum + entry.quantity, 0)).toBe(4);
    expect((adjusted as typeof ledger)[0].reference).toBe("GRN-1");
  });

  it("filters menu products by channel and effective schedule", () => {
    const product = addCatalogProduct({ name: "ชาไทย", categoryId: "drinks", sku: "THAI-02", priceSatang: 4500, channels: { POS: true, QR: true, DELIVERY: false }, schedule: { days: [1, 2, 3, 4, 5], startHour: 9, endHour: 17 } });
    expect(availableForChannel(product, "QR", new Date("2026-08-25T12:00:00+07:00"))).toBe(true);
    expect(availableForChannel(product, "DELIVERY", new Date("2026-08-25T12:00:00+07:00"))).toBe(false);
  });

  it("calculates modifier add-ons without changing base price", () => {
    expect(calculateModifierTotal([{ name: "ไข่ดาว", priceSatang: 1500 }, { name: "ชีส", priceSatang: 1000 }])).toBe(2500);
  });

  it("records a stock count as the variance from the ledger balance", () => {
    const received = receiveInventory([], { ingredientId: "rice", quantity: 10, unit: "kg", reference: "GRN-2" });
    const counted = recordStockCount(received, { ingredientId: "rice", countedQuantity: 8, unit: "kg", reference: "COUNT-1" });
    expect(counted.at(-1)?.quantity).toBe(-2);
    expect(counted.at(-1)?.reason).toBe("count");
  });

  it("creates paired ledger entries for an inventory transfer", () => {
    const entries = transferInventory([], { ingredientId: "oil", quantity: 3, unit: "litre", fromLocation: "main", toLocation: "bar", reference: "TRANSFER-1" });
    expect(entries).toHaveLength(2);
    expect(entries.map((entry) => entry.quantity)).toEqual([-3, 3]);
  });

  it("writes off an expired lot with an audit reference", () => {
    const entries = writeOffExpiredLot([], { ingredientId: "milk", quantity: 2, unit: "litre", lotId: "LOT-7", expiryDate: "2026-08-01", reference: "EXP-1" }, new Date("2026-08-25"));
    expect(entries[0].reason).toBe("expiry");
    expect(entries[0].lotId).toBe("LOT-7");
  });

  it("manages the option groups library independently from dishes", async () => {
    const { listOptionGroups, saveOptionGroup, deleteOptionGroup } = await import("@/lib/domain/catalog-store");
    const initial = listOptionGroups();
    expect(initial.length).toBeGreaterThanOrEqual(4);

    const noodles = saveOptionGroup({
      id: "noodle-type",
      name: "ชนิดเส้น",
      required: true,
      multi: false,
      choices: [
        { name: "เส้นเล็ก", priceSatang: 0 },
        { name: "บะหมี่หยก", priceSatang: 1000 },
      ],
    });
    expect(noodles.id).toBe("noodle-type");
    expect(listOptionGroups().some((g) => g.id === "noodle-type")).toBe(true);

    const deleted = deleteOptionGroup("noodle-type");
    expect(deleted).toBe(true);
    expect(listOptionGroups().some((g) => g.id === "noodle-type")).toBe(false);
  });
});

