import { z } from "zod";

export const modifierSchema = z.object({ name: z.string().min(1).max(80), priceSatang: z.number().int().nonnegative() });
export const orderLineSchema = z.object({ productId: z.string().min(1), categoryId: z.string().optional(), name: z.string().max(120).optional(), unitPriceSatang: z.number().int().nonnegative(), quantity: z.number().positive().max(999), modifiers: z.array(modifierSchema).max(20).optional(), note: z.string().max(200).optional() });
export const optionGroupSchema = z.object({ id: z.string().min(1).max(40), name: z.string().min(1).max(60), required: z.boolean().optional(), multi: z.boolean().optional(), choices: z.array(modifierSchema).min(1).max(20) });
export const channelsSchema = z.object({ POS: z.boolean(), QR: z.boolean(), DELIVERY: z.boolean() });
