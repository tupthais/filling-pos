import { describe, expect, it } from "vitest";
import { AgentOrchestrationService } from "@/lib/domain/agent-orchestration";
import { CompanyBrainService } from "@/lib/domain/company-brain-service";
import { InMemoryMarketingStore } from "@/lib/domain/in-memory-store";
import { TenantContext } from "@/lib/domain/types";

describe("agent orchestration foundation", () => {
  it("keeps external actions waiting for approval by default", () => {
    const store = new InMemoryMarketingStore();
    const company = new CompanyBrainService(store);
    const agents = new AgentOrchestrationService(store);
    const context: TenantContext = {
      tenantId: "tenant-a",
      permissions: ["workspace:read", "workspace:write", "agent:run"],
    };
    const workspace = company.createWorkspace(context, { name: "A Cafe", slug: "a-cafe" });

    const run = agents.requestRun({ ...context, workspaceId: workspace.id }, { agentKey: "content-ai", input: { externalAction: "publish_social" } });

    expect(run.status).toBe("waiting_approval");
    expect(run.steps.map((step) => step.name)).toContain("await_human_approval_for_external_action");
  });
});
