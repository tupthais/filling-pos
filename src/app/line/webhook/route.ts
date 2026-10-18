import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decryptSecret } from "@/lib/domain/secret-box";
import { analyzeReceiptImage } from "@/lib/domain/ai-provider";

type PurchaseDraft = { ingredientId: string; ingredientName: string; quantity: number; unit: string; amountSatang: number; reference: string; sourceId: string };
const pendingPurchases = new Map<string, PurchaseDraft>();
const ingredientAliases: Record<string, { id: string; name: string; unit: string }> = {
  "เนื้อวัว": { id: "00000000-0000-4000-8000-000000000001", name: "เนื้อวัว", unit: "kg" },
  "ข้าวสาร": { id: "00000000-0000-4000-8000-000000000002", name: "ข้าวสาร", unit: "kg" },
  "ชาไทย": { id: "00000000-0000-4000-8000-000000000003", name: "ชาไทย", unit: "kg" },
  "น้ำเปล่า": { id: "00000000-0000-4000-8000-000000000004", name: "น้ำเปล่า", unit: "ลิตร" },
  "ผักบุ้ง": { id: "00000000-0000-4000-8000-000000000005", name: "ผักบุ้ง", unit: "g" },
  "กรีนโอ๊ค": { id: "00000000-0000-4000-8000-000000000006", name: "กรีนโอ๊ค", unit: "kg" },
  "เรดโอ๊ค": { id: "00000000-0000-4000-8000-000000000007", name: "เรดโอ๊ค", unit: "kg" },
};

function normalizeIngredientName(value: string) { return value.trim().toLowerCase().replace(/\s|[-_.]/g, "").replace(/โอ๊ก/g, "โอ๊ค").replace(/redoak/g, "เรดโอ๊ค").replace(/greenoak/g, "กรีนโอ๊ค"); }
function levenshtein(left: string, right: string) { const row = Array.from({ length: right.length + 1 }, (_, index) => index); for (let i = 1; i <= left.length; i++) { let diagonal = row[0]; row[0] = i; for (let j = 1; j <= right.length; j++) { const above = row[j]; row[j] = left[i - 1] === right[j - 1] ? diagonal : Math.min(row[j] + 1, row[j - 1] + 1, diagonal + 1); diagonal = above; } } return row[right.length]; }
function resolveIngredient(raw: string) {
  const normalized = normalizeIngredientName(raw);
  const candidates = Object.entries(ingredientAliases).map(([alias, item]) => ({ alias: normalizeIngredientName(alias), item }));
  const exact = candidates.find((candidate) => candidate.alias === normalized);
  if (exact) return exact.item;
  const closest = candidates.map((candidate) => ({ ...candidate, distance: levenshtein(normalized, candidate.alias) })).sort((left, right) => left.distance - right.distance)[0];
  return closest && closest.distance <= Math.max(1, Math.floor(normalized.length * 0.25)) ? closest.item : undefined;
}

function parsePurchase(text: string, sourceId: string): PurchaseDraft | null {
  const numberToken = "(?:[\\d,.]+|ศูนย์|หนึ่ง|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า|สิบ|ยี่สิบ|สามสิบ|สี่สิบ|ห้าสิบ|หกสิบ|เจ็ดสิบ|แปดสิบ|เก้าสิบ|เจ็ดศูนย์|จุดเจ็ดศูนย์)";
  const match = text.trim().match(new RegExp(`^(?:ซื้อ|รับเข้า|รับ)\\s*(.+?)\\s*(${numberToken})\\s*(กรัม|กิโลกรัม|กิโล|กก\\.?|กอ|กอจุด|ก\\.?|kg|g|ลิตร|ลิ|ลอ|ชิ้น|กล่อง|ป๋อง|กระป๋อง)\\s*(?:ราคา|เป็นเงิน|จำนวนเงิน)?\\s*(${numberToken})\\s*บาท?$`, "i"));
  if (!match) return null;
  const ingredient = resolveIngredient(match[1]);
  if (!ingredient) return null;
  const thaiNumbers: Record<string, number> = { "ศูนย์": 0, "หนึ่ง": 1, "สอง": 2, "สาม": 3, "สี่": 4, "ห้า": 5, "หก": 6, "เจ็ด": 7, "แปด": 8, "เก้า": 9, "สิบ": 10, "ยี่สิบ": 20, "สามสิบ": 30, "สี่สิบ": 40, "ห้าสิบ": 50, "หกสิบ": 60, "เจ็ดสิบ": 70, "แปดสิบ": 80, "เก้าสิบ": 90, "เจ็ดศูนย์": 70, "จุดเจ็ดศูนย์": 0.7 };
  const numberValue = (raw: string) => thaiNumbers[raw] ?? Number(raw.replace(/,/g, ""));
  const quantity = numberValue(match[2]);
  const amountSatang = Math.round(numberValue(match[4]) * 100);
  if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(amountSatang) || amountSatang <= 0) return null;
  const unit = /^(กรัม|กอ|กอจุด|ก\.?|g)$/i.test(match[3]) ? "g" : /^(ลิตร|ลิ|ลอ)$/i.test(match[3]) ? "ลิตร" : /^(กิโลกรัม|กิโล|กก\.?|kg)$/i.test(match[3]) ? "kg" : "ชิ้น";
  return { ingredientId: ingredient.id, ingredientName: ingredient.name, quantity, unit, amountSatang, reference: `LINE purchase ${new Date().toISOString()}`, sourceId };
}

async function commitPurchase(tenantId: string, draft: PurchaseDraft) {
  const branch = await prisma.posBranch.findFirst({ where: { tenantId }, select: { id: true } });
  if (!branch) throw new Error("ไม่พบสาขาของร้าน");
  const reference = draft.reference;
  await prisma.$transaction(async (tx) => {
    await tx.posStockLedger.create({ data: { branchId: branch.id, ingredientId: draft.ingredientId, quantity: draft.quantity, unit: draft.unit, reason: "receipt", reference, idempotencyKey: `line:${draft.sourceId}:${reference}` } });
    const shift = await tx.posShift.findFirst({ where: { branchId: branch.id, status: "OPEN" }, orderBy: { openedAt: "desc" }, select: { id: true } });
    await tx.posCashMovement.create({ data: { branchId: branch.id, shiftId: shift?.id, direction: "OUT", amountSatang: draft.amountSatang, category: "วัตถุดิบ", note: `${draft.ingredientName} ${draft.quantity} ${draft.unit}`, reference } });
  });
}

async function lineSecret(tenantId: string) { const secret = await prisma.posSecret.findFirst({ where: { tenantId, name: "LINE_CHANNEL_SECRET" }, select: { ciphertext: true, iv: true, authTag: true } }); return process.env.LINE_CHANNEL_SECRET ?? (secret ? decryptSecret(secret) : undefined); }
async function validSignature(body: string, signature: string | null, tenantId?: string) { if (!signature && process.env.LINE_MODE !== "live") return true; const secret = tenantId ? await lineSecret(tenantId) : process.env.LINE_CHANNEL_SECRET; if (!secret) return process.env.LINE_MODE !== "live"; if (!signature) return false; const expected = createHmac("sha256", secret).update(body).digest("base64"); const left = Buffer.from(expected); const right = Buffer.from(signature); return left.length === right.length && timingSafeEqual(left, right); }
async function lineToken(tenantId: string) { const secret = await prisma.posSecret.findFirst({ where: { tenantId, name: "LINE_CHANNEL_ACCESS_TOKEN" }, select: { ciphertext: true, iv: true, authTag: true } }); return process.env.LINE_CHANNEL_ACCESS_TOKEN ?? (secret ? decryptSecret(secret) : undefined); }
async function reply(token: string, replyToken: string, text: string) {
  const response = await fetch("https://api.line.me/v2/bot/message/reply", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ replyToken, messages: [{ type: "text", text: text.slice(0, 4500) }] }) });
  if (!response.ok) throw new Error(`LINE reply failed (${response.status})`);
}

export async function GET() { return NextResponse.json({ status: "ok", service: "filling-pos-line-webhook" }); }

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const tenantId = process.env.LINE_TENANT_ID;
  if (!(await validSignature(raw, request.headers.get("x-line-signature"), tenantId))) return NextResponse.json({ error: "Invalid LINE signature" }, { status: 401 });
  let payload: { events?: Array<{ type?: string; replyToken?: string; source?: { userId?: string; groupId?: string }; message?: { type?: string; id?: string; text?: string } }> } = {};
  try { payload = JSON.parse(raw) as typeof payload; } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const token = tenantId ? await lineToken(tenantId) : undefined;
  for (const event of payload.events ?? []) {
    if (event.type !== "message" || !event.replyToken || !token || !tenantId) continue;
    if (event.message?.type === "text") {
      try {
        const text = event.message.text?.trim() ?? "";
        const sourceId = event.source?.userId ?? event.source?.groupId ?? "line-chat";
        if (/^(ช่วยเหลือ|help|เมนู)$/i.test(text)) {
          await reply(token, event.replyToken, "ตัวอย่างการเพิ่มสต็อก:\nซื้อผักบุ้ง 30 กรัม 20 บาท\nซื้อเรดโอ๊ค 1 กก. 70 บาท\n\nกก./กอ/กรัม และกล่อง/กระป๋องจะถูกจัดเป็นหน่วยชิ้นเมื่อมีชื่อวัตถุดิบในคลัง แล้วส่งร่างให้ตรวจก่อนพิมพ์ “ยืนยัน”");
          continue;
        }
        if (/^(ยืนยัน|confirm)$/i.test(text)) {
          const draft = pendingPurchases.get(sourceId);
          if (!draft) { await reply(token, event.replyToken, "ยังไม่มีรายการรอการยืนยันครับ"); continue; }
          await commitPurchase(tenantId, draft);
          pendingPurchases.delete(sourceId);
          await reply(token, event.replyToken, `บันทึกแล้วครับ\nรับเข้า ${draft.ingredientName} ${draft.quantity} ${draft.unit}\nค่าใช้จ่าย ${draft.amountSatang / 100} บาท`);
          continue;
        }
        const draft = parsePurchase(text, sourceId);
        if (draft) {
          pendingPurchases.set(sourceId, draft);
          await reply(token, event.replyToken, `ร่างรายการครับ\n${draft.ingredientName} ${draft.quantity} ${draft.unit}\nค่าใช้จ่าย ${draft.amountSatang / 100} บาท\n\nถ้าถูกต้อง พิมพ์ “ยืนยัน” เพื่อบันทึกสต็อกและค่าใช้จ่าย`);
          continue;
        }
        const response = text ? `ยังแยกรายการนี้ไม่ได้ครับ\n\nลองใช้รูปแบบ: ซื้อผักบุ้ง 30 กรัม 20 บาท\nหรือส่งรูปบิลให้ระบบอ่านครับ` : "รับข้อความแล้วครับ";
        await reply(token, event.replyToken, response);
      } catch (error) { console.error("LINE text reply failed", error instanceof Error ? error.message : "unknown error"); }
      continue;
    }
    if (event.message?.type !== "image" || !event.message.id) continue;
    try {
      const image = await fetch(`https://api-data.line.me/v2/bot/message/${event.message.id}/content`, { headers: { Authorization: `Bearer ${token}` } });
      if (!image.ok) throw new Error("LINE image download failed");
      const buffer = Buffer.from(await image.arrayBuffer());
      if (buffer.byteLength > 8_000_000) throw new Error("Image is larger than 8MB");
      const result = await analyzeReceiptImage({ tenantId, imageBase64: buffer.toString("base64"), mimeType: image.headers.get("content-type") ?? "image/jpeg" });
      await reply(token, event.replyToken, `อ่านบิลแล้ว (ยังไม่บันทึกจริง)\n\n${result.text}\n\nกรุณาตอบ “ยืนยันบิล” เพื่อให้ระบบสร้างร่างรับสินค้าและค่าใช้จ่าย`);
    } catch (error) {
      try { await reply(token, event.replyToken, `อ่านรูปบิลไม่สำเร็จ: ${error instanceof Error ? error.message : "unknown error"}`); }
      catch (replyError) { console.error("LINE image error reply failed", replyError instanceof Error ? replyError.message : "unknown error"); }
    }
  }
  console.info("LINE webhook received", { eventCount: payload.events?.length ?? 0 });
  return NextResponse.json({ received: true });
}
