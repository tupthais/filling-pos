import { NextRequest, NextResponse } from "next/server";
import { requirePosSession } from "@/lib/auth/guard";
import { authErrorResponse } from "@/lib/auth/response";
import { listJobs } from "@/lib/domain/ops";
import { listPersistedJobs } from "@/lib/domain/ops-persistence";

export async function GET(request: NextRequest) { if (process.env.POS_PERSISTENCE_MODE === "database") { try { await requirePosSession(request); return NextResponse.json({ data: await listPersistedJobs() }); } catch (error) { return authErrorResponse(error) ?? NextResponse.json({ error: "Jobs authorization failed" }, { status: 500 }); } } return NextResponse.json({ data: listJobs() }); }
