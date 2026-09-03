"use client";

import { useEffect, useMemo, useState } from "react";

const demoProducts = [
  { id: "p1", name: "ข้าวกะเพราเนื้อ", category: "อาหารจานเดียว", price: 8900, color: "#f3c969" },
  { id: "p2", name: "ข้าวผัดกุ้ง", category: "อาหารจานเดียว", price: 7900, color: "#f4a261" },
  { id: "p3", name: "ชาไทยเย็น", category: "เครื่องดื่ม", price: 4500, color: "#d47c55" },
  { id: "p4", name: "น้ำเปล่า", category: "เครื่องดื่ม", price: 1500, color: "#b9d9e8" },
  { id: "p5", name: "ผัดไทยกุ้งสด", category: "อาหารจานเดียว", price: 9900, color: "#e98973" },
  { id: "p6", name: "ขนมถ้วย", category: "ของหวาน", price: 3500, color: "#c6a7d8" },
];
const nav = ["ภาพรวม", "ขายหน้าร้าน", "ออเดอร์ QR", "เมนูและสูตรอาหาร", "สต็อกและจัดซื้อ", "โปรโมชันและสมาชิก", "รายงานและภาษี", "AI / MCP", "ตั้งค่า"];
const money = (satang: number) => `฿${(satang / 100).toLocaleString("th-TH", { minimumFractionDigits: 2 })}`;

export default function Home() {
  const [active, setActive] = useState("ภาพรวม");
  const [cart, setCart] = useState<{ id: string; quantity: number }[]>([{ id: "p1", quantity: 1 }, { id: "p3", quantity: 2 }]);
  const [shiftOpen, setShiftOpen] = useState(true);
  const [notice, setNotice] = useState("");
  const [products, setProducts] = useState(demoProducts);
  const [tables, setTables] = useState<{ id: string; name: string; status: string; qrToken: string }[]>([{ id: "table-04", name: "โต๊ะ 04", status: "AVAILABLE", qrToken: "qr_demo_table_04" }, { id: "table-07", name: "โต๊ะ 07", status: "AVAILABLE", qrToken: "qr_demo_table_07" }]);
  const [selectedTable, setSelectedTable] = useState("table-04");
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddTable, setShowAddTable] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", price: "", category: "อาหารจานเดียว", sku: "" });
  const [newTable, setNewTable] = useState({ name: "" });
  useEffect(() => {
    fetch("/api/catalog/menu?channel=POS").then((r) => r.ok ? r.json() : Promise.reject()).then((p) => { if (p.data?.length) setProducts(p.data.map((pr: { id: string; name: string; priceSatang: number; categoryId?: string }) => ({ id: pr.id, name: pr.name, category: pr.categoryId ?? "เมนู", price: pr.priceSatang, color: "#f3c969" }))); }).catch(()=>undefined);
    fetch("/api/tables?branchId=branch-main").then((r)=>r.ok?r.json():Promise.reject()).then((p)=>{ if(p.data?.length) setTables(p.data.map((t:{id:string;name:string;status:string;qrToken:string})=>({id:t.id,name:t.name,status:t.status,qrToken:t.qrToken}))); }).catch(()=>undefined);
  }, []);
  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.sku) { setNotice("กรอก ชื่อ ราคา และ SKU ก่อน"); return; }
    const satang = Math.round(parseFloat(newProduct.price) * 100);
    const res = await fetch("/api/catalog/products", { method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify({ name:newProduct.name, sku:newProduct.sku, categoryId:newProduct.category, priceSatang:satang, channels:{POS:true,QR:true,DELIVERY:true} }) });
    if (!res.ok) { const e=await res.json(); setNotice(`เพิ่มรายการไม่สำเร็จ: ${e.error ?? res.status}`); return; }
    const j=await res.json(); setProducts((prev)=>[...prev,{id:j.data.id??`p_${Date.now()}`, name:newProduct.name, category:newProduct.category, price:satang, color:"#f3c969"}]); setNewProduct({name:"",price:"",category:"อาหารจานเดียว",sku:""}); setShowAddProduct(false); setNotice(`เพิ่มรายการ "${newProduct.name}" แล้ว`);
  };
  const handleAddTable = async () => {
    if (!newTable.name) { setNotice("ใส่ชื่อโต๊ะก่อน"); return; }
    const res = await fetch("/api/tables", { method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify({ branchId:"branch-main", name:newTable.name }) });
    if (!res.ok) { const e=await res.json(); setNotice(`เพิ่มโต๊ะไม่สำเร็จ: ${e.error ?? res.status}`); return; }
    const j=await res.json(); setTables((prev)=>[...prev,{id:j.data.id,name:j.data.name,status:j.data.status??"AVAILABLE",qrToken:j.data.qrToken}]); setNewTable({name:""}); setShowAddTable(false); setNotice(`เพิ่มโต๊ะ "${j.data.name}" แล้ว`);
  };
  const total = useMemo(() => cart.reduce((sum, row) => { const product = products.find((item) => item.id === row.id)!; return sum + product.price * row.quantity; }, 0), [cart, products]);
  const addToCart = (id: string) => setCart((current) => current.some((row) => row.id === id) ? current.map((row) => row.id === id ? { ...row, quantity: row.quantity + 1 } : row) : [...current, { id, quantity: 1 }]);
  const completeSale = async () => {
    if (!cart.length) return;
    const response = await fetch("/api/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ branchId: "branch-main", source: "POS", tableId: selectedTable, idempotencyKey: `pos-${Date.now()}`, lines: cart.map((row) => { const product = products.find((item) => item.id === row.id)!; return { productId: product.id, categoryId: product.category, unitPriceSatang: product.price, quantity: row.quantity }; }) }) });
    if (!response.ok) { setNotice("บันทึกออเดอร์ไม่สำเร็จ กรุณาลองใหม่"); return; }
    const created = await response.json();
    const confirmed = await fetch(`/api/orders/${created.data.id}/confirm`, { method: "POST" });
    if (!confirmed.ok) { setNotice("สร้างออเดอร์แล้ว แต่ยืนยันรายการไม่สำเร็จ"); return; }
    const payment = await fetch("/api/payments/confirm", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderId: created.data.id, idempotencyKey: `payment-${created.data.id}`, tenderedSatang: total, allocations: [{ method: "cash", amountSatang: total }] }) });
    if (!payment.ok) { setNotice("ยืนยันออเดอร์แล้ว แต่รับชำระเงินไม่สำเร็จ"); return; }
    setNotice(`บันทึกการขาย ${money(total)} แล้ว • Payment + Receipt + Mock Printer + BOM ledger สำเร็จ`);
    setCart([]);
  };

  return <main className="min-h-screen bg-[#f7f8f5] text-[#20322b]">
    <div className="grid min-h-screen lg:grid-cols-[250px_1fr]">
      <aside className="border-r border-[#d9e2dc] bg-[#173d32] p-5 text-[#ecf4ed]">
        <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#d7a84a] text-xl font-black text-[#173d32]">F</div><div><p className="text-lg font-bold">FILLING POS</p><p className="text-xs text-[#b8d0c3]">Open source • Thailand</p></div></div>
        <div className="mt-8 rounded-2xl border border-[#47705f] bg-[#245342] p-3"><p className="text-xs text-[#b8d0c3]">สาขาที่ใช้งาน</p><p className="mt-1 font-semibold">Filling Cafe · สาขาหลัก</p><p className="mt-2 text-xs text-[#9bc4af]">● Online · Sync ล่าสุด 12:42</p></div>
        <nav className="mt-7 grid gap-1">{nav.map((item) => <button key={item} onClick={() => setActive(item)} className={`rounded-xl px-3 py-2.5 text-left text-sm ${active === item ? "bg-[#d7a84a] font-bold text-[#173d32]" : "text-[#d6e7dd] hover:bg-[#245342]"}`}>{item}</button>)}</nav>
        <div className="mt-8 border-t border-[#47705f] pt-4 text-xs text-[#b8d0c3]"><p>ผู้ใช้งาน</p><p className="mt-1 font-semibold text-white">Nok · Cashier</p><p className="mt-4">External actions: <span className="text-[#f2c879]">Sandbox only</span></p></div>
      </aside>
      <section className="p-5 md:p-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><p className="text-sm font-semibold text-[#6f8178]">วันอังคาร 25 สิงหาคม 2026 · กะเช้า</p><h1 className="mt-1 text-3xl font-bold tracking-tight">{active}</h1><p className="mt-1 text-sm text-[#71837a]">ศูนย์ควบคุมร้าน · ทุกธุรกรรมตรวจสอบย้อนหลังได้</p></div><div className="flex gap-2"><button onClick={() => setShiftOpen(!shiftOpen)} className={`rounded-xl border px-4 py-2 text-sm font-bold ${shiftOpen ? "border-[#b9d9c5] bg-[#eaf6ed] text-[#24623e]" : "border-[#e3b6a7] bg-[#fff2ee] text-[#9b4d39]"}`}>{shiftOpen ? "กะเปิดอยู่ · ฿2,000.00" : "เปิดกะใหม่"}</button><button className="rounded-xl bg-[#173d32] px-4 py-2 text-sm font-bold text-white">ศูนย์แจ้งเตือน 3</button></div></header>
        {notice && <div className="mt-5 rounded-xl border border-[#b9d9c5] bg-[#eaf6ed] p-3 text-sm font-semibold text-[#24623e]">{notice}</div>}
        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["ยอดขายวันนี้","฿18,460.00","+12.4% จากเมื่อวาน"],["ออเดอร์ทั้งหมด","42","3 รอชำระเงิน"],["สต็อกใกล้หมด","6 รายการ","ต้องสั่งซื้อภายใน 3 วัน"],["เงินสดในลิ้นชัก","฿7,840.00","Variance ฿0.00"]].map(([label,value,sub]) => <div key={label} className="rounded-2xl border border-[#dce6df] bg-white p-5 shadow-[0_3px_14px_rgba(28,61,48,0.04)]"><p className="text-sm text-[#71837a]">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p><p className="mt-2 text-xs font-semibold text-[#47825e]">{sub}</p></div>)}</div>
        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_390px]">
          <section className="rounded-2xl border border-[#dce6df] bg-white p-5"><div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">ขายหน้าร้าน</h2><p className="text-sm text-[#71837a]">เลือกสินค้าเพื่อสร้างออเดอร์ใหม่ · ราคาสุทธิรวม VAT 7% แบบ satang</p></div><div className="flex gap-2"><button onClick={()=>setShowAddProduct(true)} className="rounded-lg bg-[#173d32] px-3 py-1.5 text-xs font-bold text-white">+ เพิ่มรายการ</button><span className="rounded-lg bg-[#eef5ef] px-3 py-1.5 text-xs font-bold text-[#47765a]">● POS online</span></div></div>
            {(active==="เมนูและสูตรอาหาร" || showAddProduct) && <div className="mt-4 rounded-xl border border-[#d7a84a] bg-[#fff7e6] p-4"><p className="font-bold text-sm">เพิ่มรายการใหม่</p><div className="mt-3 grid gap-2 sm:grid-cols-4"><input value={newProduct.name} onChange={(e)=>setNewProduct({...newProduct,name:e.target.value})} placeholder="ชื่อเมนู เช่น ส้มตำไทย" className="rounded-lg border px-3 py-2 text-sm"/><input value={newProduct.sku} onChange={(e)=>setNewProduct({...newProduct,sku:e.target.value})} placeholder="SKU เช่น SOMTAM-01" className="rounded-lg border px-3 py-2 text-sm"/><input value={newProduct.price} onChange={(e)=>setNewProduct({...newProduct,price:e.target.value})} placeholder="ราคา (บาท) เช่น 89" type="number" className="rounded-lg border px-3 py-2 text-sm"/><select value={newProduct.category} onChange={(e)=>setNewProduct({...newProduct,category:e.target.value})} className="rounded-lg border px-3 py-2 text-sm"><option>อาหารจานเดียว</option><option>เครื่องดื่ม</option><option>ของหวาน</option></select></div><div className="mt-3 flex gap-2"><button onClick={handleAddProduct} className="rounded-lg bg-[#d7a84a] px-4 py-2 text-sm font-bold text-[#173d32]">บันทึกเมนู</button><button onClick={()=>setShowAddProduct(false)} className="rounded-lg border px-4 py-2 text-sm">ปิด</button>{active==="เมนูและสูตรอาหาร" && <span className="text-xs text-[#8d6521] self-center">POST /api/catalog/products → satang + BOM</span>}</div></div>}
            <div className="mt-5 flex gap-2 overflow-auto pb-1">{["ทั้งหมด", "อาหารจานเดียว", "เครื่องดื่ม", "ของหวาน"].map((category, index) => <button key={category} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold ${index === 0 ? "bg-[#173d32] text-white" : "bg-[#f1f5f1] text-[#53675c]"}`}>{category}</button>)}</div><div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">{products.map((product) => <button key={product.id} onClick={() => addToCart(product.id)} className="group rounded-2xl border border-[#e3ebe5] p-3 text-left transition hover:-translate-y-0.5 hover:border-[#b6d2bf]"><div className="grid h-24 place-items-center rounded-xl text-3xl" style={{ background: product.color }}>🍽️</div><p className="mt-3 font-bold">{product.name}</p><p className="mt-1 text-xs text-[#788980]">{product.category}</p><p className="mt-2 font-bold text-[#2d6949]">{money(product.price)}</p></button>)}</div></section>
          <section className="rounded-2xl border border-[#dce6df] bg-white p-5"><div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">ออเดอร์ใหม่</h2><div className="mt-1 flex items-center gap-2"><select value={selectedTable} onChange={(e)=>setSelectedTable(e.target.value)} className="rounded-lg border px-2 py-1 text-xs font-bold">{tables.map((t)=><option key={t.id} value={t.id}>{t.name} · {t.status}</option>)}</select><button onClick={()=>setShowAddTable(true)} className="rounded-lg bg-[#eef7ef] px-2 py-1 text-xs font-bold text-[#3b7652]">+ เพิ่มโต๊ะ</button></div></div><button onClick={() => setCart([])} className="text-xs font-bold text-[#b15c47]">ล้างรายการ</button></div>
            {showAddTable && <div className="mt-3 rounded-xl border bg-[#f5f8f5] p-3"><p className="text-xs font-bold">เพิ่มโต๊ะใหม่</p><div className="mt-2 flex gap-2"><input value={newTable.name} onChange={(e)=>setNewTable({name:e.target.value})} placeholder="ชื่อโต๊ะ เช่น โต๊ะ 08" className="flex-1 rounded-lg border px-3 py-2 text-sm"/><button onClick={handleAddTable} className="rounded-lg bg-[#173d32] px-4 py-2 text-xs font-bold text-white">บันทึก</button><button onClick={()=>setShowAddTable(false)} className="rounded-lg border px-3 py-2 text-xs">ปิด</button></div><p className="mt-1 text-[11px] text-[#71837a]">POST /api/tables → QR โต๊ะพร้อมใช้ที่ /qr/[token]</p></div>}<div className="mt-5 grid gap-3">{cart.length === 0 ? <div className="rounded-xl bg-[#f5f8f5] p-8 text-center text-sm text-[#71837a]">ยังไม่มีรายการสินค้า<br /><span className="text-xs">เลือกเมนูทางซ้ายเพื่อเริ่มออเดอร์</span></div> : cart.map((row) => { const product = products.find((item) => item.id === row.id)!; return <div key={row.id} className="flex items-center justify-between rounded-xl bg-[#f5f8f5] p-3"><div><p className="font-bold">{product.name}</p><p className="text-xs text-[#71837a]">{row.quantity} × {money(product.price)}</p></div><p className="font-bold">{money(product.price * row.quantity)}</p></div>; })}</div><div className="mt-5 border-t border-[#e1e9e3] pt-4"><div className="flex justify-between text-sm text-[#71837a]"><span>Subtotal</span><span>{money(total)}</span></div><div className="mt-2 flex justify-between text-sm text-[#71837a]"><span>VAT 7% (Tax Profile)</span><span>รวมในราคา</span></div><div className="mt-3 flex justify-between text-xl font-bold"><span>ยอดรวม</span><span>{money(total)}</span></div><div className="mt-4 grid grid-cols-2 gap-2"><button className="rounded-xl border border-[#cbdacf] py-3 text-sm font-bold">QR / โอนเงิน</button><button onClick={completeSale} disabled={!cart.length} className="rounded-xl bg-[#d7a84a] py-3 text-sm font-bold text-[#173d32] disabled:opacity-40">รับเงินสด</button></div><p className="mt-3 text-center text-xs text-[#7b8d83]">สร้าง receipt + print job + cash drawer event แบบ idempotent</p></div></section>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-3"><InfoCard title="ออเดอร์จาก QR โต๊ะ" accent="amber" items={["โต๊ะ 07 · รอพนักงานยืนยัน", "โต๊ะ 02 · กำลังเตรียมอาหาร", "โต๊ะ 09 · ชำระแล้ว"]} /><InfoCard title="สต็อกและจัดซื้อ" accent="green" items={["เนื้อสไลซ์ · เหลือ 2.4 kg", "ใบกะเพรา · เหลือ 0.6 kg", "Draft PO #PO-2026-014 รออนุมัติ"]} /><InfoCard title="Sandbox integrations" accent="blue" items={["Mock Printer · พร้อมใช้งาน", "Mock LINE Report · รอส่ง", "MCP Gateway · Read / Draft / Approval"]} /></div>
        <footer className="mt-7 flex flex-col gap-2 border-t border-[#dce6df] pt-4 text-xs text-[#71837a] md:flex-row md:justify-between"><span>Filling POS v0.1 · Open source · Self-hosted</span><span>Health: OK · Backup: ล่าสุดวันนี้ 03:00 · PDPA controls enabled</span></footer>
      </section>
    </div>
  </main>;
}

function InfoCard({ title, items, accent }: { title: string; items: string[]; accent: "amber" | "green" | "blue" }) { const colors = { amber: "bg-[#fff7e6] text-[#8d6521]", green: "bg-[#eef7ef] text-[#3b7652]", blue: "bg-[#edf5fb] text-[#396886]" }; return <section className="rounded-2xl border border-[#dce6df] bg-white p-5"><h2 className="font-bold">{title}</h2><div className="mt-4 grid gap-2">{items.map((item) => <div key={item} className={`rounded-xl px-3 py-3 text-sm font-semibold ${colors[accent]}`}>{item}</div>)}</div></section>; }
