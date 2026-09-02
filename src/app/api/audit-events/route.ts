import { NextRequest } from "next/server";
import { handleApi } from "../_shared";
import { requirePermission } from "@/lib/domain/permissions";
import { marketingStore } from "@/lib/domain/services";

export async function GET(request: NextRequest) {
  return handleApi(request, (context) => {
    requirePermission(context, "audit:read");
    return marketingStore.list(marketingStore.auditEvents, context);
  });
}
