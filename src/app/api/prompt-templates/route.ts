import { NextRequest } from "next/server";
import { handleApi, readJson } from "../_shared";
import { companyBrainService } from "@/lib/domain/services";

export async function GET(request: NextRequest) {
  return handleApi(request, (context) => companyBrainService.listPromptTemplates(context));
}

export async function POST(request: NextRequest) {
  return handleApi(request, async (context) => companyBrainService.createPromptTemplate(context, await readJson(request)));
}
