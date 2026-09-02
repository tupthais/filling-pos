import { NextRequest, NextResponse } from "next/server";
import { listMenu } from "@/lib/domain/catalog-store";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) { const channel = new URL(request.url).searchParams.get("channel") as "POS" | "QR" | "DELIVERY" | null; if (!channel || !["POS", "QR", "DELIVERY"].includes(channel)) return NextResponse.json({ error: "channel must be POS, QR, or DELIVERY" }, { status: 400 }); if (process.env.POS_PERSISTENCE_MODE === "database") { try { const branch = await prisma.posBranch.findFirst({ where: { code: "MAIN" } }); return NextResponse.json({ data: branch ? await prisma.posProduct.findMany({ where: { branchId: branch.id, available: true }, orderBy: { name: "asc" } }) : [] }); } catch { return NextResponse.json({ error: "Database unavailable" }, { status: 503 }); } } return NextResponse.json({ data: listMenu(channel) }); }
