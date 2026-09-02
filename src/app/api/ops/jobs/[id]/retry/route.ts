import { NextRequest, NextResponse } from "next/server";
import { requirePosSession } from "@/lib/auth/guard";
import { authErrorResponse } from "@/lib/auth/response";
import { retryJob } from "@/lib/domain/ops";
import { retryPersistedJob } from "@/lib/domain/ops-persistence";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { if (process.env.POS_PERSISTENCE_MODE === "database") { try { await requirePosSession(request, ["Owner", "Manager"]); } catch (error) { return authErrorResponse(error) ?? NextResponse.json({ error: "Jobs authorization failed" }, { status: 500 }); } } try { const id = (await params).id; const body = await request.json().catch(() => ({})); const job = process.env.POS_PERSISTENCE_MODE === "database" ? await retryPersistedJob(id, typeof body.error === "string" ? body.error : undefined) : retryJob(id, typeof body.error === "string" ? body.error : undefined); return NextResponse.json({ data: job }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Retry failed" }, { status: 422 }); } }
