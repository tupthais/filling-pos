import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePosSession } from "@/lib/auth/guard";
import { authErrorResponse } from "@/lib/auth/response";

export async function GET(request: NextRequest) {
  if (process.env.POS_PERSISTENCE_MODE === "database") { try { await requirePosSession(request); } catch (error) { return authErrorResponse(error) ?? NextResponse.json({ error: "Audit authorization failed" }, { status: 500 }); } return NextResponse.json({ data: await prisma.posAuditEvent.findMany({ orderBy: { createdAt: "desc" }, take: 500 }), appendOnly: true }); }
  return NextResponse.json({ data: [], appendOnly: true });
}
