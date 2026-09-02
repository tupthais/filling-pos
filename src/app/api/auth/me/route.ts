import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/domain/auth-service";

export async function GET() { const token = (await cookies()).get("pos_session")?.value; if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const result = await getSession(token); return result ? NextResponse.json({ data: { user: { id: result.user.id, email: result.user.email, name: result.user.name }, branch: result.branch, device: result.device, role: result.role } }) : NextResponse.json({ error: "Session expired or revoked" }, { status: 401 }); }
