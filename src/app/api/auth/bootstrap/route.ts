import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { bootstrapOwner } from "@/lib/domain/auth-service";

const schema = z.object({ tenantId: z.string().uuid(), branchId: z.string().uuid(), email: z.string().email(), name: z.string().min(1), password: z.string().min(12) });
export async function POST(request: NextRequest) { if (!process.env.BOOTSTRAP_SECRET || request.headers.get("x-bootstrap-secret") !== process.env.BOOTSTRAP_SECRET) return NextResponse.json({ error: "Bootstrap is not authorized" }, { status: 403 }); const parsed = schema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 }); return NextResponse.json({ data: await bootstrapOwner(parsed.data) }, { status: 201 }); }
