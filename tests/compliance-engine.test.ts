import { describe, expect, it } from "vitest";
import { BrandComplianceEngine } from "@/lib/domain/compliance-engine";
import { CompanyBrainService } from "@/lib/domain/company-brain-service";
import { InMemoryMarketingStore } from "@/lib/domain/in-memory-store";
import { TenantContext } from "@/lib/domain/types";

const permissions: TenantContext["permissions"] = ["workspace:read", "workspace:write", "company_brain:read", "company_brain:write"];

describe("brand compliance engine", () => {
  it("fails when text includes forbidden words", () => {
    const store = new InMemoryMarketingStore();
    const service = new CompanyBrainService(store);
    const context: TenantContext = { tenantId: "tenant-a", permissions };
    const workspace = service.createWorkspace(context, { name: "A Cafe", slug: "a-cafe" });
    const scoped = { ...context, workspaceId: workspace.id };

    service.createForbiddenRule(scoped, { type: "forbidden_word", severity: "fail", rule: "ถูกที่สุด", isActive: true });
    const result = new BrandComplianceEngine(store).check(scoped, { subjectType: "content", text: "ร้านนี้ถูกที่สุดในเมือง" });

    expect(result.status).toBe("fail");
    expect(result.reasons.join(" ")).toContain("ถูกที่สุด");
  });

  it("warns for non-CI colors and allows publish only when status is not fail", () => {
    const store = new InMemoryMarketingStore();
    const service = new CompanyBrainService(store);
    const context: TenantContext = { tenantId: "tenant-a", permissions };
    const workspace = service.createWorkspace(context, { name: "A Cafe", slug: "a-cafe" });
    const scoped = { ...context, workspaceId: workspace.id };
    const engine = new BrandComplianceEngine(store);

    service.upsertBrandIdentity(scoped, {
      colorSystem: { primary: "#2F6B4F", text: "#172026" },
      typography: { thaiFont: "Noto Sans Thai", englishFont: "Inter", heading: "Inter", body: "Noto Sans Thai" },
    });
    const result = engine.check(scoped, { subjectType: "asset", text: "approved copy", metadata: { colors: ["#FF0000"], fonts: [] } });

    expect(result.status).toBe("warning");
    expect(engine.canPublish(result)).toBe(true);
  });
});
