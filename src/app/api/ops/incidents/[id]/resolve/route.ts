import { NextRequest, NextResponse } from "next/server";
import { requirePosSession } from "@/lib/auth/guard";
import { authErrorResponse } from "@/lib/auth/response";
import { resolveIncident } from "@/lib/domain/ops";
import { resolvePersistedIncident } from "@/lib/domain/ops-persistence";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { if (process.env.POS_PERSISTENCE_MODE === "database") { try { await requirePosSession(request, ["Owner", "Manager"]); } catch (error) { return authErrorResponse(error) ?? NextResponse.json({ error: "Incidents authorization failed" }, { status: 500 }); } } try { const incident = process.env.POS_PERSISTENCE_MODE === "database" ? await resolvePersistedIncident((await params).id) : resolveIncident((await params).id); return NextResponse.json({ data: incident }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Resolve failed" }, { status: 422 }); } }
