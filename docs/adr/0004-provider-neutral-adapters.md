# ADR 0004: Provider-Neutral Adapters

Status: Accepted

Decision: Keep AI, object storage, and workflow queue providers behind interfaces.

Context: The system should support OpenAI, Anthropic, Gemini, and future providers without hard-coding vendor logic in domain services.

Consequences:

- Domain code imports only local adapter interfaces.
- Provider credentials are not needed in Phase 1.
- Vendor selection can happen in infrastructure modules later.

Rejected:

- Direct SDK calls in domain services, because they make tenant policy, testing, and future provider changes harder.
