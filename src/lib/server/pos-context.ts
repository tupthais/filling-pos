import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { ForbiddenError, requirePosSession, type PosRole } from "@/lib/auth/guard";
import { authErrorResponse } from "@/lib/auth/response";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/domain/auth-service";
import { MEMORY_BRANCH_ID } from "@/lib/domain/pos-store";

/** Role groups used by POS routes. */
export const ROLES = {
  sell: ["Owner", "Manager", "Cashier"] as PosRole[],
  kitchen: ["Owner", "Manager", "Cashier", "Kitchen"] as PosRole[],
  manage: ["Owner", "Manager"] as PosRole[],
  catalog: ["Owner", "Manager", "Inventory"] as PosRole[],
  view: undefined,
};

export const isDatabaseMode = () => process.env.POS_PERSISTENCE_MODE === "database";

export type PosContext = { mode: "memory" | "database"; branchId: string; userId?: string; userName?: string; role?: string };

/**
 * Resolves the caller's branch from the session (database mode) — the client-supplied
 * branchId is never trusted. Memory mode is a single-branch demo without auth.
 */
export async function requirePosContext(request: NextRequest, roles?: PosRole[]): Promise<PosContext> {
  if (!isDatabaseMode()) return { mode: "memory", branchId: MEMORY_BRANCH_ID };
  const session = await requirePosSession(request, roles);
  return { mode: "database", branchId: session.branch.id, userId: session.user.id, userName: session.user.name, role: session.role };
}

/** Wraps a route handler with session/role resolution and uniform error responses. */
export async function withPos(request: NextRequest, roles: PosRole[] | undefined, handler: (context: PosContext) => Promise<Response>) {
  try {
    const context = await requirePosContext(request, roles);
    return await handler(context);
  } catch (error) {
    return authErrorResponse(error) ?? NextResponse.json({ error: error instanceof Error ? error.message : "Request failed" }, { status: 422 });
  }
}

/** Ensures a persisted order belongs to the caller's branch. */
export async function assertOrderInBranch(orderId: string, context: PosContext) {
  if (context.mode !== "database") return;
  const order = await prisma.posOrder.findUnique({ where: { id: orderId }, select: { branchId: true } });
  if (!order) throw new Error("Order not found.");
  if (order.branchId !== context.branchId) throw new ForbiddenError("Order belongs to another branch");
}

/** Branch for public endpoints (menu): signed-in branch if any, otherwise the default branch code. */
export async function resolvePublicBranchId(request: NextRequest): Promise<string | undefined> {
  if (!isDatabaseMode()) return MEMORY_BRANCH_ID;
  const token = (await cookies()).get("pos_session")?.value ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (token) {
    const session = await getSession(token).catch(() => undefined);
    if (session) return session.branch.id;
  }
  const branchId = new URL(request.url).searchParams.get("branchId");
  if (branchId && /^[0-9a-f-]{36}$/i.test(branchId)) return branchId;
  const branch = await prisma.posBranch.findFirst({ where: { code: process.env.POS_DEFAULT_BRANCH_CODE ?? "MAIN" }, select: { id: true } });
  return branch?.id;
}

/** Midnight of the current day in the shop's timezone (server may run in UTC, e.g. Docker). */
export function startOfToday(now = new Date(), timeZone = process.env.POS_TIMEZONE ?? "Asia/Bangkok") {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const offsetMs = new Date(now.toLocaleString("en-US", { timeZone })).getTime() - new Date(now.toLocaleString("en-US", { timeZone: "UTC" })).getTime();
  return new Date(new Date(`${day}T00:00:00Z`).getTime() - offsetMs);
}
