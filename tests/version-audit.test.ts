import { describe, expect, it } from "vitest";
import { CompanyBrainService } from "@/lib/domain/company-brain-service";
import { InMemoryMarketingStore } from "@/lib/domain/in-memory-store";
import { TenantContext } from "@/lib/domain/types";

describe("version history and audit", () => {
  it("keeps previous versions and audits important writes", () => {
    const store = new InMemoryMarketingStore();
    const service = new CompanyBrainService(store);
    const context: TenantContext = {
      tenantId: "tenant-a",
      permissions: ["workspace:read", "workspace:write", "company_brain:read", "company_brain:write", "audit:read"],
    };
    const workspace = service.createWorkspace(context, { name: "A Cafe", slug: "a-cafe" });
    const scoped = { ...context, workspaceId: workspace.id };
    const created = service.upsertCompanyProfile(scoped, { companyName: "A Cafe", businessType: "Cafe", coreValues: ["warm"] });
    const updated = service.upsertCompanyProfile(scoped, { companyName: "A Cafe", businessType: "Cafe", coreValues: ["warm", "minimal"] });

    expect(updated?.version).toBe(2);
    expect(store.versionHistory.get(created!.id)).toHaveLength(1);
    expect(store.list(store.auditEvents, scoped).map((event) => event.entityType)).toContain("CompanyProfile");
  });
});
