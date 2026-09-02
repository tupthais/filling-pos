export type McpRole = "Owner" | "Manager" | "Cashier" | "Kitchen" | "Inventory" | "Purchaser" | "Accountant" | "Read-only";
export type McpMode = "read" | "draft" | "approval";
type ToolDefinition = { mode: McpMode; approvalRoles?: McpRole[] };
const tools: Record<string, ToolDefinition> = {
  get_sales_summary: { mode: "read" }, get_inventory_status: { mode: "read" }, get_shift_report: { mode: "read" }, get_platform_payout: { mode: "read" },
  create_purchase_order_draft: { mode: "draft" }, create_promotion_draft: { mode: "draft" }, create_stock_review: { mode: "draft" },
  approve_purchase_order: { mode: "approval", approvalRoles: ["Owner", "Manager", "Purchaser"] }, activate_promotion: { mode: "approval", approvalRoles: ["Owner", "Manager"] }, adjust_stock: { mode: "approval", approvalRoles: ["Owner", "Manager", "Inventory"] }, reverse_points: { mode: "approval", approvalRoles: ["Owner", "Manager"] },
};

export function executeMcpTool(input: { role: McpRole; branchId: string; targetBranchId: string; tool: string; mode: McpMode }) { const definition = tools[input.tool]; if (!definition) throw new Error("MCP tool not found"); if (input.branchId !== input.targetBranchId) throw new Error("Branch scope violation"); if (definition.mode !== input.mode) throw new Error("Tool mode mismatch"); if (input.mode === "approval" && !definition.approvalRoles?.includes(input.role)) throw new Error("Approval permission required"); return { status: input.mode === "approval" ? "APPROVAL_REQUIRED" as const : "ALLOWED" as const, tool: input.tool, directMutation: false, auditRequired: true }; }
