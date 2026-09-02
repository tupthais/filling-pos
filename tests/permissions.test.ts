import { describe, expect, it } from "vitest";
import { CompanyBrainService } from "@/lib/domain/company-brain-service";
import { InMemoryMarketingStore } from "@/lib/domain/in-memory-store";
import { PermissionError } from "@/lib/domain/permissions";

describe("permissions", () => {
  it("denies workspace writes without permission", () => {
    const service = new CompanyBrainService(new InMemoryMarketingStore());

    expect(() => service.createWorkspace({ tenantId: "tenant-a", permissions: ["workspace:read"] }, { name: "A Cafe", slug: "a-cafe" })).toThrow(
      PermissionError,
    );
  });
});
