import { z } from "zod";
import { InMemoryMarketingStore } from "./in-memory-store";
import { requirePermission } from "./permissions";
import {
  assetSchema,
  brandIdentitySchema,
  companyProfileSchema,
  createWorkspaceSchema,
  forbiddenRuleSchema,
  promptTemplateSchema,
  toneOfVoiceSchema,
} from "./schemas";
import { assertWorkspaceContext } from "./tenant-context";
import { TenantContext } from "./types";

export class CompanyBrainService {
  constructor(private readonly store: InMemoryMarketingStore) {}

  listWorkspaces(context: TenantContext) {
    requirePermission(context, "workspace:read");
    return this.store.list(this.store.workspaces, context);
  }

  createWorkspace(context: TenantContext, input: z.infer<typeof createWorkspaceSchema>) {
    requirePermission(context, "workspace:write");
    const data = createWorkspaceSchema.parse(input);
    const now = this.store.now();
    const workspace = this.store.put(this.store.workspaces, context, {
      id: this.store.id("ws"),
      tenantId: context.tenantId,
      status: "active",
      createdAt: now,
      updatedAt: now,
      ...data,
    });
    this.store.audit({ ...context, workspaceId: workspace.id }, { action: "create", entityType: "ClientWorkspace", entityId: workspace.id, after: workspace });
    return workspace;
  }

  upsertCompanyProfile(context: TenantContext, input: z.infer<typeof companyProfileSchema>) {
    assertWorkspaceContext(context);
    requirePermission(context, "company_brain:write");
    const data = companyProfileSchema.parse(input);
    const current = this.store.list(this.store.companyProfiles, context)[0];
    if (current) {
      const updated = this.store.updateVersioned(this.store.companyProfiles, context, current.id, data);
      this.store.audit(context, { action: "update", entityType: "CompanyProfile", entityId: current.id, before: current, after: updated });
      return updated;
    }
    const now = this.store.now();
    const created = this.store.put(this.store.companyProfiles, context, {
      id: this.store.id("profile"),
      tenantId: context.tenantId,
      workspaceId: context.workspaceId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      ...data,
    });
    this.store.audit(context, { action: "create", entityType: "CompanyProfile", entityId: created.id, after: created });
    return created;
  }

  getCompanyProfile(context: TenantContext) {
    assertWorkspaceContext(context);
    requirePermission(context, "company_brain:read");
    return this.store.list(this.store.companyProfiles, context)[0];
  }

  upsertBrandIdentity(context: TenantContext, input: z.infer<typeof brandIdentitySchema>) {
    assertWorkspaceContext(context);
    requirePermission(context, "company_brain:write");
    const data = brandIdentitySchema.parse(input);
    const current = this.store.list(this.store.brandIdentities, context)[0];
    if (current) {
      const updated = this.store.updateVersioned(this.store.brandIdentities, context, current.id, data);
      this.store.audit(context, { action: "update", entityType: "BrandIdentity", entityId: current.id, before: current, after: updated });
      return updated;
    }
    const now = this.store.now();
    const created = this.store.put(this.store.brandIdentities, context, {
      id: this.store.id("brand"),
      tenantId: context.tenantId,
      workspaceId: context.workspaceId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      ...data,
    });
    this.store.audit(context, { action: "create", entityType: "BrandIdentity", entityId: created.id, after: created });
    return created;
  }

  getBrandIdentity(context: TenantContext) {
    assertWorkspaceContext(context);
    requirePermission(context, "company_brain:read");
    return this.store.list(this.store.brandIdentities, context)[0];
  }

  createToneOfVoice(context: TenantContext, input: z.infer<typeof toneOfVoiceSchema>) {
    assertWorkspaceContext(context);
    requirePermission(context, "company_brain:write");
    const data = toneOfVoiceSchema.parse(input);
    const now = this.store.now();
    const record = this.store.put(this.store.toneOfVoices, context, {
      id: this.store.id("tone"),
      tenantId: context.tenantId,
      workspaceId: context.workspaceId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      ...data,
    });
    this.store.audit(context, { action: "create", entityType: "ToneOfVoice", entityId: record.id, after: record });
    return record;
  }

  listToneOfVoice(context: TenantContext) {
    assertWorkspaceContext(context);
    requirePermission(context, "company_brain:read");
    return this.store.list(this.store.toneOfVoices, context);
  }

  createForbiddenRule(context: TenantContext, input: z.infer<typeof forbiddenRuleSchema>) {
    assertWorkspaceContext(context);
    requirePermission(context, "company_brain:write");
    const data = forbiddenRuleSchema.parse(input);
    const now = this.store.now();
    const record = this.store.put(this.store.brandRules, context, {
      id: this.store.id("rule"),
      tenantId: context.tenantId,
      workspaceId: context.workspaceId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      ...data,
    });
    this.store.audit(context, { action: "create", entityType: "BrandRule", entityId: record.id, after: record });
    return record;
  }

  listForbiddenRules(context: TenantContext) {
    assertWorkspaceContext(context);
    requirePermission(context, "company_brain:read");
    return this.store.list(this.store.brandRules, context);
  }

  createAsset(context: TenantContext, input: z.infer<typeof assetSchema>) {
    assertWorkspaceContext(context);
    requirePermission(context, "asset:write");
    const data = assetSchema.parse(input);
    const now = this.store.now();
    const asset = this.store.put(this.store.assets, context, {
      id: this.store.id("asset"),
      tenantId: context.tenantId,
      workspaceId: context.workspaceId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      ...data,
    });
    this.store.audit(context, { action: "create", entityType: "Asset", entityId: asset.id, after: asset });
    return asset;
  }

  listAssets(context: TenantContext) {
    assertWorkspaceContext(context);
    requirePermission(context, "asset:read");
    return this.store.list(this.store.assets, context);
  }

  createPromptTemplate(context: TenantContext, input: z.infer<typeof promptTemplateSchema>) {
    assertWorkspaceContext(context);
    requirePermission(context, "prompt:write");
    const data = promptTemplateSchema.parse(input);
    const now = this.store.now();
    const prompt = this.store.put(this.store.promptTemplates, context, {
      id: this.store.id("prompt"),
      tenantId: context.tenantId,
      workspaceId: context.workspaceId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      ...data,
    });
    this.store.audit(context, { action: "create", entityType: "PromptTemplate", entityId: prompt.id, after: prompt });
    return prompt;
  }

  listPromptTemplates(context: TenantContext) {
    assertWorkspaceContext(context);
    requirePermission(context, "prompt:read");
    return this.store.list(this.store.promptTemplates, context);
  }
}
