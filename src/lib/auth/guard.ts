import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/domain/auth-service";

export class UnauthorizedError extends Error {}
export class ForbiddenError extends Error {}
export type PosRole = "Owner" | "Manager" | "Cashier" | "Kitchen" | "Inventory" | "Purchaser" | "Accountant" | "Read-only";

export async function requirePosSession(request: NextRequest, roles?: PosRole[]) { const cookieToken = (await cookies()).get("pos_session")?.value; const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, ""); const session = await getSession(cookieToken ?? bearer ?? ""); if (!session) throw new UnauthorizedError("Unauthorized"); if (roles && !roles.includes(session.role as PosRole)) throw new ForbiddenError("Insufficient role permission"); return session; }
