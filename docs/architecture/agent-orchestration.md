# Agent Orchestration

Phase 1 creates orchestration metadata, not autonomous publishing.

Core concepts:

- Agent Definition: tenant-scoped agent key, name, and external action flag.
- Agent Version: immutable config snapshot.
- Agent Run: workspace-scoped request with status.
- Run Step: ordered execution metadata.
- Artifact Metadata: input and output references, tenant-scoped.

Statuses:

- `queued`
- `running`
- `waiting_approval`
- `completed`
- `failed`
- `cancelled`

External action policy:

- Default disabled.
- If a run requests external action while disabled, status becomes `waiting_approval`.
- Publish, ads, email, and social posting cannot execute in Phase 1.

Provider-neutral boundaries:

- AI generation uses `AiProviderAdapter`.
- Workflow dispatch uses `WorkflowQueueAdapter`.
- Object metadata uses `ObjectStorageAdapter`.

Domain services cannot import OpenAI, Anthropic, Gemini, storage SDKs, ad SDKs, social SDKs, or email SDKs directly.
