export interface AiProviderAdapter {
  name: string;
  generateText(input: { tenantId: string; workspaceId: string; prompt: string }): Promise<{ text: string; metadata: Record<string, unknown> }>;
}

export interface ObjectStorageAdapter {
  provider: string;
  putMetadata(input: { tenantId: string; workspaceId: string; key: string; metadata: Record<string, unknown> }): Promise<void>;
  getSignedReadUrl(input: { tenantId: string; workspaceId: string; key: string }): Promise<string>;
}

export interface WorkflowQueueAdapter {
  enqueue(input: { tenantId: string; workspaceId: string; jobType: string; payload: Record<string, unknown> }): Promise<{ jobId: string }>;
}

export class DisabledAiProvider implements AiProviderAdapter {
  name = "disabled";

  async generateText(): Promise<{ text: string; metadata: Record<string, unknown> }> {
    throw new Error("AI provider is disabled in Phase 1.");
  }
}
