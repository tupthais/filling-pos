import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ status: "ok", service: "thai-pos", externalActions: "disabled", timestamp: new Date().toISOString() });
}
