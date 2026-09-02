import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculateDelivery } from "@/lib/domain/pos";

const schema = z.object({ platform: z.enum(["GRABFOOD", "LINEMAN", "SHOPEEFOOD"]), externalOrderNumber: z.string().min(1), orderedAt: z.string().datetime(), items: z.array(z.object({ productId: z.string(), quantity: z.number().positive(), unitPriceSatang: z.number().int().nonnegative() })).min(1), modifiers: z.array(z.object({ name: z.string(), amountSatang: z.number().int() })).default([]), profile: z.object({ commissionPercent: z.number().nonnegative(), paymentFeePercent: z.number().nonnegative(), merchantDiscountPercent: z.number().nonnegative(), otherFeeSatang: z.number().int().nonnegative() }) });

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
  const grossSatang = parsed.data.items.reduce((sum, item) => sum + item.unitPriceSatang * item.quantity, 0) + parsed.data.modifiers.reduce((sum, modifier) => sum + modifier.amountSatang, 0);
  return NextResponse.json({ data: { platform: parsed.data.platform, externalOrderNumber: parsed.data.externalOrderNumber, orderedAt: parsed.data.orderedAt, ...calculateDelivery(grossSatang, parsed.data.profile) } }, { status: 201 });
}
