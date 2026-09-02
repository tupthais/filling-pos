import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { PermissionError } from "@/lib/domain/permissions";
import { TenantContextError, requireTenantContext } from "@/lib/domain/tenant-context";
import { TenantIsolationError } from "@/lib/domain/in-memory-store";

export async function handleApi<T>(request: NextRequest, handler: (context: ReturnType<typeof requireTenantContext>) => Promise<T> | T) {
  try {
    const context = requireTenantContext(request);
    const data = await handler(context);
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof TenantContextError || error instanceof PermissionError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof TenantIsolationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

export async function readJson(request: NextRequest) {
  const text = await request.text();
  return text ? JSON.parse(text) : {};
}
