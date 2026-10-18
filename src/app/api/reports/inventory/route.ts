import { NextResponse } from "next/server";
import { getStockLedger } from "@/lib/domain/pos-store";
import { listInventoryLedger } from "@/lib/domain/catalog-store";
import { buildInventoryBalances } from "@/lib/domain/reports";
import { prisma } from "@/lib/db";
import { requirePosSession } from "@/lib/auth/guard";
import { authErrorResponse } from "@/lib/auth/response";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  if (process.env.POS_PERSISTENCE_MODE === "database") {
    let session;
    try {
      session = await requirePosSession(request);
    } catch (error) {
      return authErrorResponse(error) ?? NextResponse.json({ error: "Report authorization failed" }, { status: 500 });
    }
    try {
      const entries = await prisma.posStockLedger.findMany({
        where: { branchId: session.branch.id },
        orderBy: { createdAt: "desc" },
        take: 5000,
      });
      return NextResponse.json({ data: buildInventoryBalances(entries.map((entry) => ({ ingredientId: entry.ingredientId, quantity: Number(entry.quantity) })))});
    } catch (error) {
      console.error("Inventory report failed", error);
      return NextResponse.json({ error: "Inventory report failed" }, { status: 500 });
    }
  }
  return NextResponse.json({ data: buildInventoryBalances([...getStockLedger(), ...listInventoryLedger()]) });
}
