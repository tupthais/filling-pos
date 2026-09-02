# ADR 0001: Start With A Modular Monolith

Status: Accepted

Decision: Build Phase 1 as a Next.js modular monolith.

Context: The product needs strong tenant boundaries and fast iteration, but not distributed deployment complexity yet.

Consequences:

- Domain services stay in-process.
- API routes remain thin.
- Microservices are deferred until scaling evidence exists.

Rejected:

- Many microservices from day one, because the team would carry coordination and security overhead before feature boundaries are proven.
