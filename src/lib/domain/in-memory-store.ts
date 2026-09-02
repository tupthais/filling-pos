import {
  AgentDefinition,
  AgentRun,
  Asset,
  AuditEvent,
  BrandIdentity,
  BrandRule,
  ClientWorkspace,
  CompanyProfile,
  ComplianceCheck,
  Id,
  PromptTemplate,
  TenantContext,
  ToneOfVoice,
  VersionedRecord,
} from "./types";
import { tenantMatches } from "./tenant-context";

type TenantScoped = { id: Id; tenantId: Id; workspaceId?: Id };

export class TenantIsolationError extends Error {}

export class InMemoryMarketingStore {
  workspaces = new Map<Id, ClientWorkspace>();
  companyProfiles = new Map<Id, CompanyProfile>();
  brandIdentities = new Map<Id, BrandIdentity>();
  toneOfVoices = new Map<Id, ToneOfVoice>();
  brandRules = new Map<Id, BrandRule>();
  assets = new Map<Id, Asset>();
  promptTemplates = new Map<Id, PromptTemplate>();
  complianceChecks = new Map<Id, ComplianceCheck>();
  agentDefinitions = new Map<Id, AgentDefinition>();
  agentRuns = new Map<Id, AgentRun>();
  auditEvents = new Map<Id, AuditEvent>();
  versionHistory = new Map<Id, unknown[]>();

  now() {
    return new Date().toISOString();
  }

  id(prefix: string) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  put<T extends TenantScoped>(collection: Map<Id, T>, context: TenantContext, record: T) {
    this.assertTenantWrite(context, record);
    collection.set(record.id, record);
    return record;
  }

  get<T extends TenantScoped>(collection: Map<Id, T>, context: TenantContext, id: Id) {
    const record = collection.get(id);
    if (!record) return undefined;
    this.assertTenantRead(context, record);
    return record;
  }

  list<T extends TenantScoped>(collection: Map<Id, T>, context: TenantContext) {
    return [...collection.values()].filter((record) => tenantMatches(context, record));
  }

  updateVersioned<T extends VersionedRecord>(
    collection: Map<Id, T>,
    context: TenantContext,
    id: Id,
    patch: Partial<Omit<T, keyof VersionedRecord>>,
  ) {
    const current = this.get(collection, context, id);
    if (!current) return undefined;
    this.recordVersion(current);
    const next = {
      ...current,
      ...patch,
      version: current.version + 1,
      updatedAt: this.now(),
    } as T;
    collection.set(id, next);
    return next;
  }

  recordVersion(record: VersionedRecord) {
    const versions = this.versionHistory.get(record.id) ?? [];
    versions.push(structuredClone(record));
    this.versionHistory.set(record.id, versions);
  }

  audit(context: TenantContext, event: Omit<AuditEvent, "id" | "tenantId" | "workspaceId" | "actorUserId" | "createdAt">) {
    const auditEvent: AuditEvent = {
      id: this.id("audit"),
      tenantId: context.tenantId,
      workspaceId: context.workspaceId,
      actorUserId: context.actorUserId,
      createdAt: this.now(),
      ...event,
    };
    this.auditEvents.set(auditEvent.id, auditEvent);
    return auditEvent;
  }

  private assertTenantRead(context: TenantContext, record: TenantScoped) {
    if (!tenantMatches(context, record)) {
      throw new TenantIsolationError("Tenant isolation violation: attempted cross-tenant read.");
    }
  }

  private assertTenantWrite(context: TenantContext, record: TenantScoped) {
    if (record.tenantId !== context.tenantId) {
      throw new TenantIsolationError("Tenant isolation violation: attempted cross-tenant write.");
    }
    if (context.workspaceId && record.workspaceId && record.workspaceId !== context.workspaceId) {
      throw new TenantIsolationError("Tenant isolation violation: attempted cross-workspace write.");
    }
  }
}

export const marketingStore = new InMemoryMarketingStore();
