"use client";

import { useEffect, useMemo, useState } from "react";

const products = [
  { id: "p1", name: "ข้าวกะเพราเนื้อ", price: 8900, emoji: "🍛" },
  { id: "p2", name: "ข้าวผัดกุ้ง", price: 7900, emoji: "🍤" },
  { id: "p3", name: "ชาไทยเย็น", price: 4500, emoji: "🧋" },
  { id: "p4", name: "น้ำเปล่า", price: 1500, emoji: "💧" },
];
const money = (satang: number) => `฿${(satang / 100).toLocaleString("th-TH", { minimumFractionDigits: 2 })}`;

export default function QrOrderClient({ token }: { token: string }) {
  const [table, setTable] = useState<{ label: string }>();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [notice, setNotice] = useState("");
  const total = useMemo(() => products.reduce((sum, product) => sum + product.price * (cart[product.id] ?? 0), 0), [cart]);
  useEffect(() => { fetch(`/api/qr/tables/${token}`).then((response) => response.ok ? response.json() : Promise.reject()).then((payload) => setTable(payload.data)).catch(() => setNotice("QR โต๊ะนี้ไม่ถูกต้องหรือหมดอายุ")); }, [token]);
  const submit = async () => {
    const lines = products.filter((product) => cart[product.id]).map((product) => ({ productId: product.id, unitPriceSatang: product.price, quantity: cart[product.id] }));
    if (!lines.length) return;
    const response = await fetch("/api/qr/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tableToken: token, idempotencyKey: `qr-${token}-${Date.now()}`, lines }) });
    setNotice(response.ok ? "ส่งออเดอร์ให้ร้านแล้ว พนักงานกำลังยืนยันรายการ" : "ส่งออเดอร์ไม่สำเร็จ กรุณาลองใหม่");
    if (response.ok) setCart({});
  };
  return <main className="min-h-screen bg-[#f7f8f5] px-4 py-6 text-[#20322b]"><div className="mx-auto max-w-lg"><header className="rounded-3xl bg-[#173d32] p-6 text-white"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b8d0c3]">Filling Cafe</p><h1 className="mt-2 text-3xl font-bold">สั่งอาหารที่โต๊ะ</h1><p className="mt-2 text-sm text-[#d6e7dd]">{table?.label ?? "กำลังตรวจสอบโต๊ะ..."} · สั่งได้จากเมนูด้านล่าง</p></header><section className="mt-5 grid gap-3">{products.map((product) => <div key={product.id} className="flex items-center gap-3 rounded-2xl border border-[#dce6df] bg-white p-3"><div className="grid h-14 w-14 place-items-center rounded-xl bg-[#f4e6bd] text-2xl">{product.emoji}</div><div className="min-w-0 flex-1"><p className="font-bold">{product.name}</p><p className="text-sm text-[#71837a]">{money(product.price)}</p></div><div className="flex items-center gap-2"><button onClick={() => setCart((current) => ({ ...current, [product.id]: Math.max(0, (current[product.id] ?? 0) - 1) }))} className="h-9 w-9 rounded-full bg-[#eef5ef] text-lg">−</button><span className="w-5 text-center font-bold">{cart[product.id] ?? 0}</span><button onClick={() => setCart((current) => ({ ...current, [product.id]: (current[product.id] ?? 0) + 1 }))} className="h-9 w-9 rounded-full bg-[#d7a84a] text-lg">+</button></div></div>)}</section>{notice && <div className="mt-4 rounded-2xl bg-[#eaf6ed] p-4 text-sm font-semibold text-[#24623e]">{notice}</div>}<div className="sticky bottom-4 mt-5 rounded-2xl bg-white p-4 shadow-lg ring-1 ring-[#dce6df]"><div className="flex justify-between font-bold"><span>ยอดรวม</span><span>{money(total)}</span></div><button onClick={submit} disabled={!total || !table} className="mt-3 w-full rounded-xl bg-[#d7a84a] py-3 font-bold text-[#173d32] disabled:opacity-40">ส่งออเดอร์ให้ร้าน</button><p className="mt-2 text-center text-xs text-[#71837a]">ยังไม่ชำระเงิน · พนักงานจะยืนยันรายการ</p></div></div></main>;
}
