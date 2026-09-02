# ADR 0005: Disable External Actions In Phase 1

Status: Accepted

Decision: External publishing, ads, email, and social posting are disabled in Phase 1.

Context: The foundation needs compliance and approval gates before any action can affect a real external account.

Consequences:

- Agent runs that request external actions move to `waiting_approval`.
- No production credentials are required.
- Compliance checks can be built and tested before live connectors exist.

Rejected:

- Early live connector integration, because it raises security and customer-impact risk before approval workflow is complete.
