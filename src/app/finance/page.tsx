"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

const money = (satang: number) => `฿${(satang / 100).toLocaleString("th-TH", { minimumFractionDigits: 2 })}`;
type Movement = { id: string; direction: "IN" | "OUT"; amountSatang: number; category: string; note?: string; reference?: string; createdAt: string };

export default function FinancePage() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [summary, setSummary] = useState({ inSatang: 0, outSatang: 0, netSatang: 0 });
  const [direction, setDirection] = useState<"IN" | "OUT">("OUT");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("ซื้อวัตถุดิบ");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [loggedIn, setLoggedIn] = useState(true);

  const refresh = async () => {
    const response = await fetch("/api/finance/cash-movements");
    if (response.status === 401 || response.status === 403) { setLoggedIn(false); return; }
    const payload = await response.json();
    setMovements(payload.data ?? []);
    setSummary(payload.summary ?? { inSatang: 0, outSatang: 0, netSatang: 0 });
  };
  useEffect(() => { const timer = window.setTimeout(() => void refresh(), 0); return () => window.clearTimeout(timer); }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const response = await fetch("/api/finance/cash-movements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ direction, amountSatang: Math.round(Number(amount) * 100), category, note: note || undefined }) });
    if (!response.ok) { setMessage((await response.json()).error ?? "บันทึกไม่สำเร็จ"); return; }
    setMessage(direction === "IN" ? "บันทึกรับเงินแล้ว" : "บันทึกจ่ายเงินแล้ว"); setAmount(""); setNote(""); await refresh();
  };

  if (!loggedIn) return <main className="min-h-screen bg-[#f7f8f5] p-6 text-[#20322b]"><div className="mx-auto max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm"><h1 className="text-2xl font-black">การเงิน</h1><p className="mt-2 text-sm text-[#71837a]">กรุณาเข้าสู่ระบบก่อนใช้งาน</p><Link href="/inventory" className="mt-5 inline-block rounded-xl bg-[#173d32] px-5 py-3 font-bold text-white">ไปหน้าเข้าสู่ระบบ</Link></div></main>;

  return <main className="min-h-screen bg-[#f7f8f5] p-6 text-[#20322b]"><div className="mx-auto max-w-6xl"><header className="flex items-end justify-between border-b border-[#dce6df] pb-5"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6f8178]">Filling POS · Finance</p><h1 className="mt-2 text-3xl font-black">การเงิน</h1><p className="mt-1 text-sm text-[#71837a]">บันทึกรับเงิน จ่ายเงิน และดูเงินสดของร้าน</p></div><div className="flex gap-2"><Link href="/" className="rounded-xl bg-[#173d32] px-4 py-2 text-sm font-bold text-white">หน้า POS</Link><Link href="/inventory" className="rounded-xl border border-[#dce6df] bg-white px-4 py-2 text-sm font-bold">สต็อก</Link></div></header><section className="mt-6 grid gap-4 md:grid-cols-3"><div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-[#71837a]">รับเงิน</p><p className="mt-2 text-3xl font-black text-[#1b5e3f]">{money(summary.inSatang)}</p></div><div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-[#71837a]">จ่ายเงิน</p><p className="mt-2 text-3xl font-black text-[#a64835]">{money(summary.outSatang)}</p></div><div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-[#71837a]">สุทธิ</p><p className="mt-2 text-3xl font-black text-[#173d32]">{money(summary.netSatang)}</p></div></section><section className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]"><form onSubmit={submit} className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="text-xl font-black">บันทึกรายการ</h2><div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => setDirection("IN")} className={`rounded-xl p-3 font-bold ${direction === "IN" ? "bg-[#d9f0df] text-[#1b5e3f]" : "bg-[#f4f6f4]"}`}>รับเงินเข้า</button><button type="button" onClick={() => setDirection("OUT")} className={`rounded-xl p-3 font-bold ${direction === "OUT" ? "bg-[#ffe3dc] text-[#a64835]" : "bg-[#f4f6f4]"}`}>จ่ายเงินออก</button></div><input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min="0.01" step="0.01" placeholder="จำนวนเงิน (บาท)" className="mt-3 w-full rounded-xl border p-3" required /><select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-3 w-full rounded-xl border p-3"><option>ซื้อวัตถุดิบ</option><option>ค่าแรง</option><option>ค่าเช่า</option><option>ค่าสาธารณูปโภค</option><option>เงินทอนเข้าลิ้นชัก</option><option>ฝากเงินเข้าร้าน</option><option>อื่น ๆ</option></select><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="หมายเหตุ เช่น จ่ายตลาดสด" className="mt-3 min-h-24 w-full rounded-xl border p-3" /><button className="mt-3 w-full rounded-xl bg-[#d7a84a] p-3 font-black text-[#173d32]">บันทึก{direction === "IN" ? "รับเงิน" : "จ่ายเงิน"}</button>{message && <p className="mt-3 rounded-xl bg-[#edf7ef] p-3 text-sm font-bold text-[#1b5e3f]">{message}</p>}</form><section className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-xl font-black">รายการล่าสุด</h2><button onClick={() => void refresh()} className="rounded-lg border px-3 py-1.5 text-xs font-bold">รีเฟรช</button></div><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs text-[#71837a]"><th className="p-2">เวลา</th><th className="p-2">รายการ</th><th className="p-2">หมวด</th><th className="p-2 text-right">จำนวน</th></tr></thead><tbody>{movements.map((item) => <tr key={item.id} className="border-b border-[#eef2ee]"><td className="p-2 text-xs">{new Date(item.createdAt).toLocaleString("th-TH")}</td><td className={`p-2 font-bold ${item.direction === "IN" ? "text-[#1b5e3f]" : "text-[#a64835]"}`}>{item.direction === "IN" ? "รับเงินเข้า" : "จ่ายเงินออก"}<div className="text-xs font-normal text-[#71837a]">{item.note ?? "—"}</div></td><td className="p-2">{item.category}</td><td className="p-2 text-right font-black">{item.direction === "IN" ? "+" : "-"}{money(item.amountSatang)}</td></tr>)}</tbody></table>{movements.length === 0 && <p className="p-8 text-center text-sm text-[#71837a]">ยังไม่มีรายการเงินสด</p>}</div></section></section></div></main>;
}
