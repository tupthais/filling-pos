import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { revokeSession } from "@/lib/domain/auth-service";

export async function POST() { const cookieStore = await cookies(); const token = cookieStore.get("pos_session")?.value; if (token) await revokeSession(token); const response = NextResponse.json({ data: { loggedOut: true } }); response.cookies.delete("pos_session"); return response; }
