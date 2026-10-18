import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { findTableByToken } from "@/lib/domain/pos-store";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (process.env.POS_PERSISTENCE_MODE === "database") {
    const table = await prisma.posTable.findUnique({
      where: { qrToken: token },
      select: { branchId: true, id: true, name: true, branch: { select: { name: true } } },
    });
    return table
      ? NextResponse.json({ data: { branchId: table.branchId, tableId: table.id, label: table.name, branchName: table.branch.name } })
      : NextResponse.json({ error: "QR table not found" }, { status: 404 });
  }

  const memoryTable = findTableByToken(token);
  return memoryTable
    ? NextResponse.json({ data: { branchId: memoryTable.branchId, tableId: memoryTable.id, label: memoryTable.name, branchName: "Filling Cafe" } })
    : NextResponse.json({ error: "QR table not found" }, { status: 404 });
}
