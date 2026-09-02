import { describe, expect, it } from "vitest";
import { executeMcpTool } from "@/lib/domain/mcp-gateway";

describe("MCP gateway risk boundaries", () => {
  it("allows branch-scoped read tools", () => {
    const result = executeMcpTool({ role: "Manager", branchId: "b1", tool: "get_sales_summary", mode: "read", targetBranchId: "b1" });
    expect(result.status).toBe("ALLOWED");
  });

  it("turns write-intent into a draft and blocks direct apply", () => {
    const result = executeMcpTool({ role: "Manager", branchId: "b1", tool: "activate_promotion", mode: "approval", targetBranchId: "b1" });
    expect(result.status).toBe("APPROVAL_REQUIRED");
    expect(result.directMutation).toBe(false);
  });

  it("rejects cross-branch access and cashier approval", () => {
    expect(() => executeMcpTool({ role: "Cashier", branchId: "b1", tool: "get_inventory_status", mode: "read", targetBranchId: "b2" })).toThrow("Branch scope violation");
    expect(() => executeMcpTool({ role: "Cashier", branchId: "b1", tool: "approve_purchase_order", mode: "approval", targetBranchId: "b1" })).toThrow("Approval permission required");
  });
});
