import { describe, expect, it } from "vitest";
import { approvePurchaseDraft, createPurchaseDraft } from "@/lib/domain/approval";

describe("purchase approval workflow", () => {
  it("requires a valid one-time token and marks a draft approved", () => {
    const draft = createPurchaseDraft({ supplierId: "s1", branchId: "b1", totalSatang: 120000, items: [{ ingredientId: "rice", quantity: 10 }] });
    const approved = approvePurchaseDraft(draft.id, draft.approvalToken);
    expect(approved.status).toBe("APPROVED");
    expect(() => approvePurchaseDraft(draft.id, draft.approvalToken)).toThrow("Approval token has already been used");
  });

  it("rejects an invalid token without changing the draft", () => {
    const draft = createPurchaseDraft({ supplierId: "s2", branchId: "b1", totalSatang: 50000, items: [] });
    expect(() => approvePurchaseDraft(draft.id, "wrong-token")).toThrow("Invalid approval token");
    expect(draft.status).toBe("PENDING_APPROVAL");
  });
});
