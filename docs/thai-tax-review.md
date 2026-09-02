# Thai Tax Review — รอ นักบัญชีรับรอง

> ระบบคำนวณ `src/lib/domain/pos.ts:27` ใช้ `inclusive: true, rate 7%` แบบ `Math.round` satang — ต้องได้ sign-off ก่อน e-Tax

## ที่ implement แล้ว
- `calculateOrder` แยก `subtotal/discount/taxable/vat/total` แบบ integer satang (`src/lib/domain/pos.ts:27`)
- `calculateTax` ใน `src/lib/domain/tax-documents.ts:7` รองรับ `inclusive` / `exclusive`
- `PosReceipt` + `PosDocumentSequence` (`prisma/schema.prisma:589`) ออกเลข `R-YYYY-######` แบบ per-branch/year
- `TaxDocument` types: `RECEIPT`, `ABBREVIATED_TAX_INVOICE`, `FULL_TAX_INVOICE`, `CREDIT_NOTE`, `DEBIT_NOTE` (`src/lib/domain/tax-documents.ts:2`)
- `TaxDocumentAdapter` ยังเป็น `MockAdapter` — ไม่ยิง e-Tax/WHT จริง

## ที่ต้องให้นักบัญชี review ก่อน production
- [ ] ยืนยัน VAT 7% inclusive เป็น default ของสาขา — config ต่อสาขาได้แล้วหรือยัง?
- [ ] Abbreviated vs Full tax invoice — เมื่อไหร่ออกอันไหน, ข้อมูลผู้ซื้อที่ต้องเก็บ
- [ ] Credit/Debit note อ้างอิง `relatedDocumentId` ถูกต้องตามสรรพากรไหม
- [ ] WHT (ถ้ามี supplier) — ยังไม่มี flow ภาษีหัก ณ ที่จ่าย
- [ ] e-Tax submission + `TAX_PROVIDER_MODE=mock` → `live` + sandbox approval

## แนะนำ
นัดนักบัญชี 1 ชม. ดู `docs/pos-test-use-cases-th.md` ชุดภาษี + ทดสอบ `POST /api/tax/quote` และ `POST /api/tax/documents` ด้วยยอดจริง (รวมปัดเศษ satang) ก่อนเปิดสาขาแรก
