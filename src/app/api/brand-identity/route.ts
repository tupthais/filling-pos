import { NextRequest } from "next/server";
import { handleApi, readJson } from "../_shared";
import { companyBrainService } from "@/lib/domain/services";

export async function GET(request: NextRequest) {
  return handleApi(request, (context) => companyBrainService.getBrandIdentity(context));
}

export async function PUT(request: NextRequest) {
  return handleApi(request, async (context) => companyBrainService.upsertBrandIdentity(context, await readJson(request)));
}
