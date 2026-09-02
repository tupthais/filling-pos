import { describe, expect, it } from "vitest";
import { calculateTax, createAdjustmentNote, issueTaxDocument, voidTaxDocument } from "@/lib/domain/tax-documents";

describe("Thai tax document boundary", () => {
  it("calculates VAT from an effective profile", () => {
    expect(calculateTax(10700, { ratePercent: 7, inclusive: true })).toEqual({ taxBaseSatang: 10000, taxSatang: 700, totalSatang: 10700 });
    expect(calculateTax(10000, { ratePercent: 7, inclusive: false })).toEqual({ taxBaseSatang: 10000, taxSatang: 700, totalSatang: 10700 });
  });

  it("does not reuse a voided document number", () => {
    const first = issueTaxDocument({ branchId: "b1", type: "RECEIPT", totalSatang: 10700 });
    voidTaxDocument(first.id, "customer refund");
    const second = issueTaxDocument({ branchId: "b1", type: "RECEIPT", totalSatang: 5000 });
    expect(second.documentNumber).not.toBe(first.documentNumber);
  });

  it("creates a linked credit note instead of mutating the original", () => {
    const invoice = issueTaxDocument({ branchId: "b1", type: "FULL_TAX_INVOICE", totalSatang: 10700 });
    const note = createAdjustmentNote(invoice.id, "CREDIT_NOTE", 1070, "partial refund");
    expect(note.relatedDocumentId).toBe(invoice.id);
    expect(invoice.totalSatang).toBe(10700);
  });
});
