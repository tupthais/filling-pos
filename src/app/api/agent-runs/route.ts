import { NextRequest } from "next/server";
import { handleApi, readJson } from "../_shared";
import { agentOrchestrationService } from "@/lib/domain/services";

export async function GET(request: NextRequest) {
  return handleApi(request, (context) => agentOrchestrationService.listRuns(context));
}

export async function POST(request: NextRequest) {
  return handleApi(request, async (context) => agentOrchestrationService.requestRun(context, await readJson(request)));
}
