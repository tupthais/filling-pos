# ADR 0002: Use Prisma With PostgreSQL

Status: Accepted

Decision: Use Prisma as the ORM and PostgreSQL as the database target.

Context: The schema has many relations, versioned business records, and needs a readable model for early team collaboration. Prisma gives strong TypeScript ergonomics and schema validation.

Consequences:

- PostgreSQL remains the source of truth.
- RLS policies are authored as SQL alongside Prisma schema.
- Query helpers must still enforce tenant context in the application.

Rejected:

- Drizzle for Phase 1, because Prisma's schema readability and validation are more useful for this foundation pass.
