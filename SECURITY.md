# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| main (pre-1.0) | Best-effort, not production-certified |

> ระบบยังอยู่ในสถานะ **Functional foundation + sandbox MVP; not production-certified** ตาม `docs/POS-Production-Handoff.md` ห้ามใช้งาน production จนกว่าจะปิด Production blockers ครบ 10 ข้อ

## Reporting a Vulnerability

- ส่งรายละเอียดผ่าน private channel ของเจ้าของ repo (ไม่เปิด issue สาธารณะ)
- ระบุ: component, reproduction steps, impact, tenant/branch isolation ที่เกี่ยวข้อง
- เราจะตอบกลับภายใน 5 วันทำการ และประสาน patch แบบ staged rollout

## Security Boundaries (POS)

- เงินคำนวณเป็น integer satang, stock เป็น append-only ledger จาก BOM
- ทุก adapter ต้องมี tenantId + branchId + idempotencyKey
- External actions (LINE, supplier, delivery, payment capture, tax submission) ถูก disable / mock-only จนกว่าจะได้รับ credentials และ operational approval (ดู ADR 0005)
- `POS_PERSISTENCE_MODE=database` จะเปิด proxy gate ที่บังคับ `pos_session` cookie สำหรับ private APIs (`proxy.ts:5`)
- Session: HttpOnly `pos_session`, อายุ 12 ชั่วโมง, revoke ได้ผ่าน `POST /api/auth/logout`
- อย่า commit `.env.local`, tokens, passwords, หรือไฟล์ `backups/*.sql`

## Hardening Checklist ก่อน Production

อ้างอิง `docs/POS-Production-Handoff.md` หัวข้อ 8:
1. Route-level auth ทุก mutation + enforce user/branch/device จาก session
2. ย้าย loyalty/procurement/tax/reports/offline sync ที่ยัง in-memory ไป PostgreSQL
3. Android auth + device registration + sync ACK mapping แบบ persisted
4. Hardware certification: printer / cash drawer / barcode / ESP32/MQTT
5. PDPA: notice, consent, retention, export/anonymization, incident workflow
6. Encrypted backup restore drill (RPO/RTO documented)
