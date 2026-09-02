import { describe, expect, it } from "vitest";
import { CompanyBrainService } from "@/lib/domain/company-brain-service";
import { InMemoryMarketingStore, TenantIsolationError } from "@/lib/domain/in-memory-store";
import { TenantContext } from "@/lib/domain/types";

const permissions: TenantContext["permissions"] = ["workspace:read", "workspace:write", "company_brain:read", "company_brain:write"];

describe("tenant isolation", () => {
  it("prevents tenant A from reading tenant B company brain data", () => {
    const store = new InMemoryMarketingStore();
    const service = new CompanyBrainService(store);
    const tenantA: TenantContext = { tenantId: "tenant-a", permissions };
    const tenantB: TenantContext = { tenantId: "tenant-b", permissions };
    const workspaceA = service.createWorkspace(tenantA, { name: "A Cafe", slug: "a-cafe" });
    const workspaceB = service.createWorkspace(tenantB, { name: "B Clinic", slug: "b-clinic" });

    service.upsertCompanyProfile(
      { ...tenantB, workspaceId: workspaceB.id },
      { companyName: "B Clinic", businessType: "Clinic", coreValues: ["premium"] },
    );

    expect(service.getCompanyProfile({ ...tenantA, workspaceId: workspaceA.id })).toBeUndefined();
    expect(() => store.get(store.companyProfiles, { ...tenantA, workspaceId: workspaceA.id }, [...store.companyProfiles.values()][0].id)).toThrow(
      TenantIsolationError,
    );
  });

  it("prevents cross-workspace writes inside the same tenant context", () => {
    const store = new InMemoryMarketingStore();
    const service = new CompanyBrainService(store);
    const context: TenantContext = { tenantId: "tenant-a", permissions };
    const workspaceA = service.createWorkspace(context, { name: "A Cafe", slug: "a-cafe" });
    const workspaceB = service.createWorkspace(context, { name: "B Clinic", slug: "b-clinic" });

    expect(() =>
      store.put(store.companyProfiles, { ...context, workspaceId: workspaceA.id }, {
        id: "profile-cross",
        tenantId: context.tenantId,
        workspaceId: workspaceB.id,
        companyName: "Wrong workspace",
        businessType: "Clinic",
        coreValues: [],
        version: 1,
        createdAt: store.now(),
        updatedAt: store.now(),
      }),
    ).toThrow(TenantIsolationError);
  });
});
