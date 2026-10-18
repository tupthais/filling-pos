import { NextRequest, NextResponse } from "next/server";
import { requirePosSession } from "@/lib/auth/guard";
import { authErrorResponse } from "@/lib/auth/response";
import { getAiProviderStatusForTenant } from "@/lib/domain/ai-provider";

export async function GET(request: NextRequest) {
  try { const session = await requirePosSession(request, ["Owner", "Manager", "Accountant"]); return NextResponse.json({ data: await getAiProviderStatusForTenant(session.branch.tenantId) }); }
  catch (error) { return authErrorResponse(error) ?? NextResponse.json({ error: "AI status access failed" }, { status: 500 }); }
}
