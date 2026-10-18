import { prisma } from "@/lib/db";
import { decryptSecret } from "@/lib/domain/secret-box";

export type AiProviderStatus = {
  provider: string;
  model: string;
  enabled: boolean;
  mode: "advisory";
  approvalRequired: true;
  financeMode: string;
  autoPostLimitSatang: number;
  minConfidence: number;
};

export function getAiProviderStatus(): AiProviderStatus {
  const provider = process.env.AI_PROVIDER ?? "disabled";
  return { provider, model: process.env.OPENAI_MODEL ?? "gpt-6-luna", enabled: provider === "openai" && Boolean(process.env.OPENAI_API_KEY), mode: "advisory", approvalRequired: true, financeMode: process.env.AI_FINANCE_MODE ?? "approval", autoPostLimitSatang: Number(process.env.AI_FINANCE_AUTO_MAX_SATANG ?? 0), minConfidence: Number(process.env.AI_FINANCE_MIN_CONFIDENCE ?? 0.95) };
}

export async function getAiProviderStatusForTenant(tenantId: string) {
  const secret = await prisma.posSecret.findFirst({ where: { tenantId, name: "OPENAI_API_KEY" }, select: { ciphertext: true, iv: true, authTag: true } });
  return { ...getAiProviderStatus(), enabled: (process.env.AI_PROVIDER ?? "disabled") === "openai" && Boolean(process.env.OPENAI_API_KEY || secret) };
}

export async function generateAiInsight(input: { tenantId: string; system: string; prompt: string }) {
  const status = getAiProviderStatus();
  const secret = await prisma.posSecret.findFirst({ where: { tenantId: input.tenantId, name: "OPENAI_API_KEY" }, select: { ciphertext: true, iv: true, authTag: true } });
  const apiKey = process.env.OPENAI_API_KEY ?? (secret ? decryptSecret(secret) : undefined);
  if (status.provider !== "openai" || !apiKey) throw new Error("AI provider is not configured.");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: status.model, input: [{ role: "system", content: [{ type: "input_text", text: input.system }] }, { role: "user", content: [{ type: "input_text", text: input.prompt }] }], max_output_tokens: 800 }),
  });
  if (!response.ok) throw new Error(`AI provider returned ${response.status}.`);
  const payload = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
  const text = payload.output_text ?? payload.output?.flatMap((item) => item.content ?? []).map((item) => item.text ?? "").join("\n") ?? "";
  return { text, metadata: { provider: status.provider, model: status.model, mode: status.mode, approvalRequired: true } };
}

export async function analyzeReceiptImage(input: { tenantId: string; imageBase64: string; mimeType: string }) {
  const status = getAiProviderStatus();
  const secret = await prisma.posSecret.findFirst({ where: { tenantId: input.tenantId, name: "OPENAI_API_KEY" }, select: { ciphertext: true, iv: true, authTag: true } });
  const apiKey = process.env.OPENAI_API_KEY ?? (secret ? decryptSecret(secret) : undefined);
  if (status.provider !== "openai" || !apiKey) throw new Error("AI provider is not configured.");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: status.model, input: [{ role: "system", content: [{ type: "input_text", text: "อ่านข้อความใบเสร็จร้านอาหารเป็น JSON เท่านั้น ห้ามเดาหากอ่านไม่ชัด ใช้ schema: {supplier:string,date:string,totalSatang:number,vatSatang:number,items:[{name:string,quantity:number,unit:string,unitPriceSatang:number}],confidence:number,notes:string[]}" }] }, { role: "user", content: [{ type: "input_text", text: "อ่านข้อความจากภาพใบเสร็จนี้และคืน JSON ตาม schema" }, { type: "input_image", image_url: `data:${input.mimeType};base64,${input.imageBase64}` }] }], max_output_tokens: 1200 }),
  });
  if (!response.ok) throw new Error(`AI provider returned ${response.status}.`);
  const payload = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
  const text = payload.output_text ?? payload.output?.flatMap((item) => item.content ?? []).map((item) => item.text ?? "").join("\n") ?? "";
  return { text, metadata: { provider: status.provider, model: status.model, mode: "receipt-draft", approvalRequired: true } };
}
