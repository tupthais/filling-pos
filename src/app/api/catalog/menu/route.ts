import { NextRequest, NextResponse } from "next/server";
import { listMenu } from "@/lib/domain/catalog-store";
import { toMenuItem } from "@/lib/domain/menu";
import { prisma } from "@/lib/db";
import { resolvePublicBranchId } from "@/lib/server/pos-context";

/** Public menu for POS / QR / delivery channels. Only available items are returned. */
export async function GET(request: NextRequest) {
  const channel = new URL(request.url).searchParams.get("channel") as "POS" | "QR" | "DELIVERY" | null;
  if (!channel || !["POS", "QR", "DELIVERY"].includes(channel)) return NextResponse.json({ error: "channel must be POS, QR, or DELIVERY" }, { status: 400 });
  if (process.env.POS_PERSISTENCE_MODE !== "database") return NextResponse.json({ data: listMenu(channel) });
  try {
    const branchId = await resolvePublicBranchId(request);
    if (!branchId) return NextResponse.json({ data: [] });
    const rows = await prisma.posProduct.findMany({ where: { branchId, available: true }, orderBy: [{ categoryId: "asc" }, { name: "asc" }] });
    return NextResponse.json({ data: rows.map(toMenuItem).filter((item) => item.channels[channel]) });
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}
