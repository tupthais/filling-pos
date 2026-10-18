import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePosSession } from "@/lib/auth/guard";
import { authErrorResponse } from "@/lib/auth/response";
import { generateAiInsight } from "@/lib/domain/ai-provider";

const schema = z.object({ question: z.string().min(3).max(2000), context: z.record(z.string(), z.unknown()).default({}) });

export async function POST(request: NextRequest) {
  try {
    const session = await requirePosSession(request, ["Owner", "Manager", "Accountant"]);
    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
    const result = await generateAiInsight({ tenantId: session.branch.tenantId, system: "You are an advisory assistant for a Thai restaurant POS. Analyze only the supplied tenant-scoped data. Never instruct direct ledger mutation, payment execution, or stock adjustment. Return concise Thai recommendations with risks and a human approval step.", prompt: JSON.stringify({ question: parsed.data.question, context: parsed.data.context, branchId: session.branch.id }) });
    return NextResponse.json({ data: result });
  } catch (error) { return authErrorResponse(error) ?? NextResponse.json({ error: error instanceof Error ? error.message : "AI insight failed" }, { status: 503 }); }
}
