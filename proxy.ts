import { NextRequest, NextResponse } from "next/server";

const publicApiPaths = ["/api/health", "/api/auth", "/api/qr", "/api/catalog/menu"];

export function proxy(request: NextRequest) {
  if (process.env.POS_PERSISTENCE_MODE !== "database" || !request.nextUrl.pathname.startsWith("/api")) return NextResponse.next();
  if (publicApiPaths.some((path) => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(`${path}/`))) return NextResponse.next();
  if (!request.cookies.get("pos_session")?.value && !request.headers.get("authorization")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.next();
}

export const proxyConfig = { matcher: ["/api/:path*"] };
