export default function PdpaPage() {
  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">PDPA — นโยบายข้อมูลส่วนบุคคล (Filling POS)</h1>
      <p className="text-sm text-muted-foreground">เวอร์ชัน 1.0 — 3 ก.ย. 2026 — สำหรับ self-hosted POS ร้านอาหาร</p>
      <section className="space-y-2">
        <h2 className="font-semibold">1. ข้อมูลที่เก็บ</h2>
        <ul className="list-disc ml-6 text-sm"><li>บัญชีผู้ใช้: email, name, hash รหัสผ่าน, สิทธิ์สาขา</li><li>ออเดอร์/ใบเสร็จ: รายการ, ยอด satang, โต๊ะ, อุปกรณ์</li><li>สต็อก: ledger แบบ append-only</li><li>อุปกรณ์/เซสชัน: branchId, deviceId, token hash</li></ul>
      </section>
      <section className="space-y-2"><h2 className="font-semibold">2. ฐานกฎหมาย & Consent</h2><p className="text-sm">เก็บเฉพาะเท่าที่จำเป็นต่อการให้บริการ POS/บัญชี/ภาษี — ลูกค้า QR ไม่เก็บ PII เกินเบอร์โทร/ชื่อที่ให้ยินยอมเอง เก็บ consent ผ่านฟอร์มก่อนส่งออเดอร์ (mock ใน sandbox)</p></section>
      <section className="space-y-2"><h2 className="font-semibold">3. Retention & ลบ/ส่งออกข้อมูล</h2><p className="text-sm">ออเดอร์/ใบเสร็จ/ภาษี: เก็บ 7 ปีตามสรรพากร — บัญชีผู้ใช้: จนกว่าจะปิดบัญชี — ส่งออก/ลบ: ขอผ่าน manager (API <code>/api/pdpa/export</code> / <code>/api/pdpa/anonymize</code>) — ดำเนินการภายใน 30 วัน</p></section>
      <section className="space-y-2"><h2 className="font-semibold">4. สิทธิ์ของเจ้าของข้อมูล</h2><p className="text-sm">ขอเข้าถึง, แก้ไข, ลบ, คัดค้าน, ถอน consent ได้ที่ ops console — เหตุการณ์สำคัญบันทึกใน <code>PosAuditEvent</code></p></section>
      <section className="space-y-2"><h2 className="font-semibold">5. Incident</h2><p className="text-sm">ถ้าพบการรั่วไหล — สร้าง incident ที่ <code>/ops</code> (severity HIGH/CRITICAL) และแจ้งภายใน 72 ชม.</p></section>
    </main>
  );
}
