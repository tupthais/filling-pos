import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const tableTokens = new Map([["qr_demo_table_04", { branchId: "branch-main", tableId: "table-04", label: "โต๊ะ 04" }], ["qr_demo_table_07", { branchId: "branch-main", tableId: "table-07", label: "โต๊ะ 07" }]]);

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  if (process.env.POS_PERSISTENCE_MODE === "database") { const table = await prisma.posTable.findUnique({ where: { qrToken: (await params).token }, select: { branchId: true, id: true, name: true } }); return table ? NextResponse.json({ data: { branchId: table.branchId, tableId: table.id, label: table.name } }) : NextResponse.json({ error: "QR table not found" }, { status: 404 }); }
  const table = tableTokens.get((await params).token);
  return table ? NextResponse.json({ data: table }) : NextResponse.json({ error: "QR table not found" }, { status: 404 });
}
