# ADR 0006: Rule-Based Compliance First

Status: Accepted

Decision: Start Brand Compliance with deterministic rules before semantic AI judging.

Context: Forbidden words, CI colors, fonts, and logo metadata are high-value checks that can be tested deterministically.

Consequences:

- Failures are explainable.
- Tests can prove publish blocking.
- AI-based tone review is deferred until reliable evidence collection exists.

Rejected:

- LLM-only compliance, because it is harder to prove and audit in the first production foundation.
