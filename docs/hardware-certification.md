# Hardware Certification — Filling POS

> สาขาต้อง cert อุปกรณ์ก่อนขึ้น production — ใช้ `MockAdapter` จนกว่าจะผ่าน

## Adapters (`src/lib/domain/pos-adapters.ts:1`)
| อุปกรณ์ | Adapter | Protocol | สถานะ |
|---|---|---|---|
| เครื่องพิมพ์ใบเสร็จ | `PrinterAdapter` | ESC/POS via USB/Network | Mock |
| ลิ้นชักเงินสด | `CashDrawerAdapter` | RJ11 pulse | Mock |
| สแกนเนอร์ | `IoTDeviceGateway` | HID / MQTT | Mock |
| ESP32 ส่งครัว | `IoTDeviceGateway` | MQTT `kitchen/{branchId}` | Mock |
| EDC/QR | `TaxDocumentAdapter` + `PrinterAdapter` | — | Mock |

## ขั้นตอน cert ต่อสาขา
1. เลือก protocol จริงใน `.env.local` (เช่น `PRINTER_MODE=escpos`, `CASH_DRAWER_MODE=rj11`)
2. ทดสอบ `print` + `open` ด้วย `MockAdapter` → เปลี่ยนเป็น real adapter หลัง sandbox + approval gate (ADR 0005)
3. บันทึกผล cert: รุ่น, firmware, test print, idempotencyKey ซ้ำแล้ว replay (`mock-replayed:`)
4. เก็บ log ใน `PosAuditEvent` + `PosJob` — ห้ามข้าม approval

## Checklist Sunmi T1 (ที่ทดสอบแล้ว)
- LAN `http://<computer-ip>:3001`, `pos_session` cookie, `api/catalog/menu` public, SQLite outbox + WorkManager retry — ผ่าน
- Printer/cash drawer ยังไม่ต่อ hardware จริง

## ถ้ายังไม่มี hardware
ระบบทำงานได้แบบ `memory` + พิมพ์ PDF จาก `/ops` ก่อน — ไม่บล็อกการขาย
