import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { login } from "@/lib/domain/auth-service";

const schema = z.object({ tenantId: z.string().uuid(), branchId: z.string().uuid(), email: z.string().email(), password: z.string(), deviceId: z.string().uuid().optional() });
export async function POST(request: NextRequest) { const parsed = schema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 }); try { const result = await login(parsed.data); const response = NextResponse.json({ data: result }); response.cookies.set("pos_session", result.token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 12 }); return response; } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Login failed" }, { status: 401 }); } }
