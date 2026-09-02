import { PermissionKey, TenantContext } from "./types";

export class PermissionError extends Error {}

export function requirePermission(context: TenantContext, permission: PermissionKey) {
  if (!context.permissions.includes(permission)) {
    throw new PermissionError(`Missing permission: ${permission}`);
  }
}

export function canPerformExternalAction() {
  return process.env.EXTERNAL_ACTIONS_ENABLED === "true";
}
