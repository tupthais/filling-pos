import { NextRequest } from "next/server";
import { handleApi, readJson } from "../_shared";
import { complianceEngine } from "@/lib/domain/services";

export async function POST(request: NextRequest) {
  return handleApi(request, async (context) => complianceEngine.check(context, await readJson(request)));
}
