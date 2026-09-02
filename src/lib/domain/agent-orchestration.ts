import { InMemoryMarketingStore } from "./in-memory-store";
import { canPerformExternalAction, requirePermission } from "./permissions";
import { agentRunRequestSchema } from "./schemas";
import { assertWorkspaceContext } from "./tenant-context";
import { AgentDefinition, AgentRun, TenantContext } from "./types";

export class AgentOrchestrationService {
  constructor(private readonly store: InMemoryMarketingStore) {}

  registerAgent(context: TenantContext, input: { key: string; name: string; config?: Record<string, unknown>; externalActions?: boolean }) {
    requirePermission(context, "agent:run");
    const now = this.store.now();
    const agent: AgentDefinition = {
      id: this.store.id("agent"),
      tenantId: context.tenantId,
      key: input.key,
      name: input.name,
      externalActions: input.externalActions ?? false,
      createdAt: now,
      versions: [
        {
          id: this.store.id("agentver"),
          version: 1,
          config: input.config ?? {},
          createdAt: now,
        },
      ],
    };
    this.store.put(this.store.agentDefinitions, context, agent);
    return agent;
  }

  requestRun(context: TenantContext, input: unknown): AgentRun {
    assertWorkspaceContext(context);
    requirePermission(context, "agent:run");
    const request = agentRunRequestSchema.parse(input);
    const agent =
      this.store.list(this.store.agentDefinitions, context).find((definition) => definition.key === request.agentKey) ??
      this.registerAgent(context, { key: request.agentKey, name: request.agentKey });

    const externalRequested = Boolean(request.input.externalAction);
    const status = externalRequested && !canPerformExternalAction() ? "waiting_approval" : "queued";
    const now = this.store.now();
    const run: AgentRun = {
      id: this.store.id("run"),
      tenantId: context.tenantId,
      workspaceId: context.workspaceId,
      agentId: agent.id,
      status,
      request: request.input,
      steps: [
        {
          id: this.store.id("step"),
          name: "validate_tenant_and_company_brain_scope",
          status: "completed",
          inputArtifacts: [],
          outputArtifacts: [],
        },
        {
          id: this.store.id("step"),
          name: status === "waiting_approval" ? "await_human_approval_for_external_action" : "queue_provider_neutral_execution",
          status,
          inputArtifacts: [],
          outputArtifacts: [],
        },
      ],
      createdAt: now,
      updatedAt: now,
    };
    this.store.put(this.store.agentRuns, context, run);
    this.store.audit(context, { action: "agent_run", entityType: "AgentRun", entityId: run.id, after: run });
    return run;
  }

  listRuns(context: TenantContext) {
    assertWorkspaceContext(context);
    requirePermission(context, "agent:run");
    return this.store.list(this.store.agentRuns, context);
  }
}
