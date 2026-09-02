import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePosSession } from "@/lib/auth/guard";
import { authErrorResponse } from "@/lib/auth/response";
import { createIncident, listIncidents } from "@/lib/domain/ops";
import { createPersistedIncident, listPersistedIncidents } from "@/lib/domain/ops-persistence";

const schema = z.object({ branchId: z.string().uuid().optional(), severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]), title: z.string().min(1), description: z.string().min(1), metadata: z.unknown().optional() });
export async function GET(request: NextRequest) { if (process.env.POS_PERSISTENCE_MODE === "database") { try { await requirePosSession(request); return NextResponse.json({ data: await listPersistedIncidents() }); } catch (error) { return authErrorResponse(error) ?? NextResponse.json({ error: "Incidents authorization failed" }, { status: 500 }); } } return NextResponse.json({ data: listIncidents() }); }
export async function POST(request: NextRequest) { if (process.env.POS_PERSISTENCE_MODE === "database") { try { await requirePosSession(request, ["Owner", "Manager"]); } catch (error) { return authErrorResponse(error) ?? NextResponse.json({ error: "Incidents authorization failed" }, { status: 500 }); } } const parsed = schema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 }); if (process.env.POS_PERSISTENCE_MODE === "database") { if (!parsed.data.branchId) return NextResponse.json({ error: "branchId is required in database mode" }, { status: 400 }); return NextResponse.json({ data: await createPersistedIncident({ ...parsed.data, branchId: parsed.data.branchId }) }, { status: 201 }); } return NextResponse.json({ data: createIncident({ ...parsed.data, branchId: parsed.data.branchId ?? "memory" }) }, { status: 201 }); }
