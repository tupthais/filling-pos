export type Id = string;

export type TenantContext = {
  tenantId: Id;
  workspaceId?: Id;
  actorUserId?: Id;
  permissions: PermissionKey[];
};

export type PermissionKey =
  | "workspace:read"
  | "workspace:write"
  | "company_brain:read"
  | "company_brain:write"
  | "asset:read"
  | "asset:write"
  | "prompt:read"
  | "prompt:write"
  | "agent:run"
  | "approval:review"
  | "audit:read";

export type VersionedRecord = {
  id: Id;
  tenantId: Id;
  workspaceId: Id;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type ClientWorkspace = {
  id: Id;
  tenantId: Id;
  name: string;
  slug: string;
  status: "active" | "paused" | "archived";
  createdAt: string;
  updatedAt: string;
};

export type CompanyProfile = VersionedRecord & {
  companyName: string;
  businessType: string;
  brandStory?: string;
  mission?: string;
  vision?: string;
  coreValues: string[];
};

export type BrandIdentity = VersionedRecord & {
  logoAssetId?: Id;
  colorSystem: {
    primary: string;
    secondary?: string;
    accent?: string;
    background?: string;
    text?: string;
  };
  typography: {
    thaiFont: string;
    englishFont: string;
    heading: string;
    body: string;
  };
  designRules?: Record<string, string | number | boolean>;
};

export type ToneOfVoice = VersionedRecord & {
  name: string;
  description: string;
  examples: string[];
  bannedPhrases: string[];
};

export type BrandRule = VersionedRecord & {
  type: "forbidden_word" | "color" | "font" | "logo" | "tone";
  severity: ComplianceStatus;
  rule: string;
  evidenceHint?: string;
  isActive: boolean;
};

export type Asset = VersionedRecord & {
  kind: "logo" | "font" | "image" | "video" | "document" | "audio";
  name: string;
  provider: string;
  objectKey: string;
  mimeType: string;
  metadata: Record<string, unknown>;
};

export type PromptTemplate = VersionedRecord & {
  name: string;
  channel: string;
  template: string;
  variables: string[];
};

export type AgentRunStatus =
  | "queued"
  | "running"
  | "waiting_approval"
  | "completed"
  | "failed"
  | "cancelled";

export type AgentDefinition = {
  id: Id;
  tenantId: Id;
  key: string;
  name: string;
  externalActions: boolean;
  versions: AgentVersion[];
  createdAt: string;
};

export type AgentVersion = {
  id: Id;
  version: number;
  config: Record<string, unknown>;
  createdAt: string;
};

export type AgentRun = {
  id: Id;
  tenantId: Id;
  workspaceId: Id;
  agentId: Id;
  status: AgentRunStatus;
  request: Record<string, unknown>;
  steps: RunStep[];
  createdAt: string;
  updatedAt: string;
};

export type RunStep = {
  id: Id;
  name: string;
  status: AgentRunStatus;
  inputArtifacts: ArtifactMetadata[];
  outputArtifacts: ArtifactMetadata[];
};

export type ArtifactMetadata = {
  id: Id;
  kind: string;
  name: string;
  tenantId: Id;
  workspaceId: Id;
};

export type ComplianceStatus = "pass" | "warning" | "fail";

export type ComplianceCheck = {
  id: Id;
  tenantId: Id;
  workspaceId: Id;
  subjectType: string;
  subjectId?: Id;
  status: ComplianceStatus;
  reasons: string[];
  evidence: Record<string, unknown>;
  createdAt: string;
};

export type AuditEvent = {
  id: Id;
  tenantId: Id;
  workspaceId?: Id;
  actorUserId?: Id;
  action: string;
  entityType: string;
  entityId: Id;
  before?: unknown;
  after?: unknown;
  createdAt: string;
};
