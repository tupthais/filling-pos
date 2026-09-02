import { NextRequest } from "next/server";
import { TenantContext } from "./types";

export class TenantContextError extends Error {}

export function requireTenantContext(request: NextRequest): TenantContext {
  const tenantId = request.headers.get("x-tenant-id");
  const workspaceId = request.headers.get("x-workspace-id") ?? undefined;
  const actorUserId = request.headers.get("x-user-id") ?? undefined;
  const permissions = request.headers
    .get("x-permissions")
    ?.split(",")
    .map((permission) => permission.trim())
    .filter(Boolean);

  if (!tenantId) {
    throw new TenantContextError("Missing x-tenant-id. Business API calls are default-deny.");
  }

  return {
    tenantId,
    workspaceId,
    actorUserId,
    permissions: (permissions ?? []) as TenantContext["permissions"],
  };
}

export function assertWorkspaceContext(context: TenantContext): asserts context is TenantContext & { workspaceId: string } {
  if (!context.workspaceId) {
    throw new TenantContextError("Missing x-workspace-id for workspace-scoped data.");
  }
}

export function tenantMatches(context: TenantContext, record: { tenantId: string; workspaceId?: string }) {
  if (record.tenantId !== context.tenantId) return false;
  if (context.workspaceId && record.workspaceId && record.workspaceId !== context.workspaceId) return false;
  return true;
}
