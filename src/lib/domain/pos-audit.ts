import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

const sensitiveKey = /password|secret|token|authorization|cookie|api[-_]?key/i;
export function sanitizeAuditMetadata(value: unknown): unknown { if (Array.isArray(value)) return value.map(sanitizeAuditMetadata); if (!value || typeof value !== "object") return value; return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, sensitiveKey.test(key) ? "[REDACTED]" : sanitizeAuditMetadata(nested)])); }
export async function recordPosAudit(input: { branchId: string; actorUserId?: string; action: string; entityType: string; entityId: string; metadata?: unknown }) { return prisma.posAuditEvent.create({ data: { branchId: input.branchId, actorUserId: input.actorUserId, action: input.action, entityType: input.entityType, entityId: input.entityId, metadata: sanitizeAuditMetadata(input.metadata) as Prisma.InputJsonValue } }); }
