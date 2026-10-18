import { NextRequest, NextResponse } from "next/server";
import { getReceipt } from "@/lib/domain/pos-store";
import { prisma } from "@/lib/db";
import { getPersistedOrderView } from "@/lib/domain/pos-persistence";
import { ROLES, withPos } from "@/lib/server/pos-context";

/** GET /api/receipts/:id — printable receipt data with order lines and VAT calculation. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPos(request, ROLES.view, async (context) => {
    const { id } = await params;
    if (context.mode === "database") {
      const receipt = await prisma.posReceipt.findFirst({
        where: { OR: [{ id }, { orderId: id }, { documentNumber: id }], branchId: context.branchId },
        include: { branch: { select: { name: true, code: true } } },
      });
      if (!receipt) return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
      const order = await getPersistedOrderView(receipt.orderId);
      return NextResponse.json({
        data: {
          id: receipt.id,
          orderId: receipt.orderId,
          branchName: receipt.branch.name,
          documentNumber: receipt.documentNumber,
          documentType: receipt.documentType,
          totalSatang: receipt.totalSatang,
          status: receipt.status,
          issuedAt: receipt.issuedAt.toISOString(),
          order,
        },
      });
    }

    const receipt = getReceipt(id);
    return receipt ? NextResponse.json({ data: receipt }) : NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  });
}
