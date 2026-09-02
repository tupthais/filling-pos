import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePosSession } from "@/lib/auth/guard";
import { authErrorResponse } from "@/lib/auth/response";

export async function GET(request: NextRequest) {
  if (process.env.POS_PERSISTENCE_MODE === "database") { try { await requirePosSession(request); } catch (error) { return authErrorResponse(error) ?? NextResponse.json({ error: "Operations authorization failed" }, { status: 500 }); } }
  const checkedAt = new Date().toISOString();
  if (process.env.POS_PERSISTENCE_MODE !== "database") return NextResponse.json({ data: { status: "ok", persistence: "memory", externalActions: "disabled", checkedAt } });
  try { const [branchCount, activeSessions] = await Promise.all([prisma.posBranch.count(), prisma.posSession.count({ where: { revokedAt: null, expiresAt: { gt: new Date() } } })]); return NextResponse.json({ data: { status: "ok", persistence: "postgresql", database: "ok", branchCount, activeSessions, connectors: { line: process.env.LINE_MODE ?? "mock", delivery: process.env.DELIVERY_CONNECTORS_MODE ?? "manual-only", tax: process.env.TAX_PROVIDER_MODE ?? "mock" }, externalActions: process.env.EXTERNAL_ACTIONS_ENABLED === "true" ? "enabled" : "disabled", checkedAt } }); } catch { return NextResponse.json({ data: { status: "degraded", persistence: "postgresql", database: "unavailable", checkedAt } }, { status: 503 }); }
}
