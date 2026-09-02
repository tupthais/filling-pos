import { NextResponse } from "next/server";
import { ForbiddenError, UnauthorizedError } from "./guard";

export function authErrorResponse(error: unknown) { if (error instanceof UnauthorizedError) return NextResponse.json({ error: error.message }, { status: 401 }); if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 }); return undefined; }
