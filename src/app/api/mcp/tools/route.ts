import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { executeMcpTool, type McpMode, type McpRole } from "@/lib/domain/mcp-gateway";
import { requirePosSession } from "@/lib/auth/guard";
import { authErrorResponse } from "@/lib/auth/response";

const schema = z.object({ role: z.enum(["Owner", "Manager", "Cashier", "Kitchen", "Inventory", "Purchaser", "Accountant", "Read-only"]), branchId: z.string().min(1), targetBranchId: z.string().min(1), tool: z.string().min(1), mode: z.enum(["read", "draft", "approval"]) });
export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
  let role = parsed.data.role as McpRole;
  if (process.env.POS_PERSISTENCE_MODE === "database") { try { const session = await requirePosSession(request); role = session.role as McpRole; } catch (error) { return authErrorResponse(error) ?? NextResponse.json({ error: "MCP authorization failed" }, { status: 500 }); } }
  try { return NextResponse.json({ data: executeMcpTool({ ...parsed.data, role } as { role: McpRole; branchId: string; targetBranchId: string; tool: string; mode: McpMode }) }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "MCP request denied" }, { status: 403 }); }
}
