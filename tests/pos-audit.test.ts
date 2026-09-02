import { describe, expect, it } from "vitest";
import { sanitizeAuditMetadata } from "@/lib/domain/pos-audit";

describe("POS audit metadata", () => {
  it("removes credential-like fields before persistence", () => {
    const result = sanitizeAuditMetadata({ reason: "refund", approvalToken: "secret", password: "secret", nested: { token: "secret" } });
    expect(result).toEqual({ reason: "refund", approvalToken: "[REDACTED]", password: "[REDACTED]", nested: { token: "[REDACTED]" } });
  });
});
