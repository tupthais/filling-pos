export type Satang = number;

export type TaxProfile = { ratePercent: number; inclusive: boolean };

export type Promotion =
  | { kind: "percent"; value: number }
  | { kind: "fixed"; valueSatang: Satang }
  | { kind: "bogo"; buy: number; get: number }
  | { kind: "category"; categoryId: string; percent: number };

export type OrderLineModifier = { name: string; priceSatang: Satang };

export type OrderLine = {
  productId: string;
  categoryId?: string;
  /** Unit price including selected modifiers. */
  unitPriceSatang: Satang;
  quantity: number;
  promotion?: Promotion;
  name?: string;
  modifiers?: OrderLineModifier[];
  note?: string;
};

export type MoneyBreakdown = {
  subtotalSatang: Satang;
  discountSatang: Satang;
  taxableSatang: Satang;
  vatSatang: Satang;
  totalSatang: Satang;
};

export function calculateOrder(lines: OrderLine[], tax: TaxProfile, orderDiscountSatang: Satang = 0): MoneyBreakdown {
  const subtotalSatang = lines.reduce((sum, line) => sum + line.unitPriceSatang * line.quantity, 0);
  const lineDiscounts = lines.reduce((sum, line) => sum + lineDiscount(line), 0);
  const discountSatang = Math.min(subtotalSatang, lineDiscounts + Math.max(0, orderDiscountSatang));
  const taxableSatang = Math.max(0, subtotalSatang - discountSatang);
  const vatSatang = tax.inclusive
    ? Math.round(taxableSatang - taxableSatang / (1 + tax.ratePercent / 100))
    : Math.round(taxableSatang * (tax.ratePercent / 100));
  return { subtotalSatang, discountSatang, taxableSatang, vatSatang, totalSatang: tax.inclusive ? taxableSatang : taxableSatang + vatSatang };
}

function lineDiscount(line: OrderLine): Satang {
  const base = line.unitPriceSatang * line.quantity;
  if (!line.promotion) return 0;
  switch (line.promotion.kind) {
    case "percent": return Math.min(base, Math.round(base * line.promotion.value / 100));
    case "fixed": return Math.min(base, line.promotion.valueSatang);
    case "category": return line.categoryId === line.promotion.categoryId ? Math.min(base, Math.round(base * line.promotion.percent / 100)) : 0;
    case "bogo": return Math.min(base, Math.floor(line.quantity / (line.promotion.buy + line.promotion.get)) * line.promotion.get * line.unitPriceSatang);
  }
}

export type PaymentAllocation = { method: "cash" | "qr" | "transfer" | "scheme"; amountSatang: Satang; platform?: "grab" | "shopeefood" | "lineman" };

export function validatePayments(totalSatang: Satang, payments: PaymentAllocation[]): void {
  if (payments.reduce((sum, payment) => sum + payment.amountSatang, 0) !== totalSatang) throw new Error("Payment allocation must equal order total.");
  if (payments.some((payment) => payment.amountSatang < 0)) throw new Error("Payment amount cannot be negative.");
}

export function cashChange(totalSatang: Satang, tenderedSatang: Satang): Satang {
  if (tenderedSatang < totalSatang) throw new Error("Cash tendered is less than total.");
  return tenderedSatang - totalSatang;
}

export function schemeEligibleAmount(allowanceSatang: Satang, scheme: "50/50" | "60/40"): Satang {
  return scheme === "50/50" ? allowanceSatang * 2 : Math.round(allowanceSatang * 2.5);
}

export function loyaltyPoints(totalSatang: Satang): number {
  return Math.floor(totalSatang / 10_000);
}

export type BomComponent = { ingredientId: string; quantity: number; unit: string };
export type StockLedgerEntry = { id: string; ingredientId: string; quantity: number; unit: string; reason: string; idempotencyKey: string; createdAt: string };

export function consumeBom(bom: BomComponent[], soldQuantity: number, idempotencyKey: string, ledger: StockLedgerEntry[], now = new Date().toISOString()): StockLedgerEntry[] {
  if (ledger.some((entry) => entry.idempotencyKey === idempotencyKey || entry.idempotencyKey.startsWith(`${idempotencyKey}:`))) return ledger;
  return [...ledger, ...bom.map((component) => ({ ...component, quantity: -component.quantity * soldQuantity, reason: "sale-consumption", id: crypto.randomUUID(), idempotencyKey: `${idempotencyKey}:${component.ingredientId}`, createdAt: now }))];
}

export type PlatformProfile = { commissionPercent: number; paymentFeePercent: number; merchantDiscountPercent: number; otherFeeSatang: number };
export function calculateDelivery(grossSatang: Satang, profile: PlatformProfile) {
  const merchantDiscountSatang = Math.round(grossSatang * profile.merchantDiscountPercent / 100);
  const commissionSatang = Math.round(grossSatang * profile.commissionPercent / 100);
  const paymentFeeSatang = Math.round(grossSatang * profile.paymentFeePercent / 100);
  const netPayoutSatang = grossSatang - merchantDiscountSatang - commissionSatang - paymentFeeSatang - profile.otherFeeSatang;
  return { grossSatang, merchantDiscountSatang, commissionSatang, paymentFeeSatang, otherFeeSatang: profile.otherFeeSatang, netPayoutSatang, deductionSatang: grossSatang - netPayoutSatang, deductionPercent: grossSatang ? (grossSatang - netPayoutSatang) / grossSatang * 100 : 0 };
}

export function appendCashLedger(openingFloatSatang: Satang, cashSalesSatang: Satang, cashOutSatang: Satang, refundsSatang: Satang, countedCashSatang: Satang) {
  const expectedCashSatang = openingFloatSatang + cashSalesSatang - cashOutSatang - refundsSatang;
  return { expectedCashSatang, countedCashSatang, varianceSatang: countedCashSatang - expectedCashSatang };
}
