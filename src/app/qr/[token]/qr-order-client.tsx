"use client";
/* eslint-disable @next/next/no-img-element -- QR and menu images may be runtime data URLs. */

import { useEffect, useMemo, useState } from "react";
import type { MenuItem, OptionChoice, OptionGroup } from "@/lib/domain/menu";

type CartLine = {
  id: string; // unique key in cart
  productId: string;
  productName: string;
  basePriceSatang: number;
  quantity: number;
  selectedOptions: { groupName: string; choiceName: string; extraSatang: number }[];
  note: string;
};

const money = (satang: number) => `฿${(satang / 100).toLocaleString("th-TH", { minimumFractionDigits: 0 })}`;
const DRINK_CATEGORIES = ["กาแฟสด", "ชา & มัทฉะ", "นมสด & โกโก้", "อิตาเลียนโซดา", "สมูทตี้", "น้ำดื่ม & โค้ก"];
const isDrinkCategory = (categoryId: string) => DRINK_CATEGORIES.includes(categoryId) || /กาแฟ|ชา|มัทฉะ|นม|โกโก้|โซดา|สมูทตี้|น้ำ|โค้ก|drink|coffee|tea/i.test(categoryId);
const STATIC_PAYMENT_QR_URL = process.env.NEXT_PUBLIC_PAYMENT_QR_IMAGE_URL || "";

export default function QrOrderClient({ token }: { token: string }) {
  const [table, setTable] = useState<{ id: string; label: string; branchId: string } | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [activeStore, setActiveStore] = useState<"STEAK" | "CAFE">("STEAK");
  const [activeCategory, setActiveCategory] = useState<string>("ทั้งหมด");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [orderSent, setOrderSent] = useState<boolean>(false);
  const [customerName, setCustomerName] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal state for selecting item options
  const [selectedProduct, setSelectedProduct] = useState<MenuItem | null>(null);
  const [optionPicks, setOptionPicks] = useState<Record<string, string[]>>({});
  const [itemNote, setItemNote] = useState("");

  useEffect(() => {
    // 1. Fetch table details
    fetch(`/api/qr/tables/${token}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((res) => setTable(res.data))
      .catch(() => setNotice("QR Code โต๊ะนี้ไม่ถูกต้องหรือหมดอายุแล้ว กรุณาติดต่อพนักงาน"));

    // 2. Fetch menu
    fetch("/api/catalog/menu?channel=QR")
      .then((r) => r.json())
      .then((res) => {
        if (Array.isArray(res.data)) setMenu(res.data);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const storeMenu = useMemo(() => menu.filter((item) => activeStore === "CAFE" ? isDrinkCategory(item.categoryId) : !isDrinkCategory(item.categoryId)), [menu, activeStore]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    storeMenu.forEach((item) => set.add(item.categoryId));
    return ["ทั้งหมด", ...Array.from(set)];
  }, [storeMenu]);

  const filteredMenu = useMemo(() => {
    if (activeCategory === "ทั้งหมด") return storeMenu;
    return storeMenu.filter((item) => item.categoryId === activeCategory);
  }, [storeMenu, activeCategory]);

  const openOptionModal = (product: MenuItem) => {
    setSelectedProduct(product);
    setItemNote("");
    const initial: Record<string, string[]> = {};
    for (const group of product.options ?? []) {
      if (group.required && group.choices.length > 0) {
        initial[group.name] = [group.choices[0].name];
      } else {
        initial[group.name] = [];
      }
    }
    setOptionPicks(initial);
  };

  const handleChoiceToggle = (group: OptionGroup, choice: OptionChoice) => {
    setOptionPicks((prev) => {
      const current = prev[group.name] ?? [];
      if (group.multi) {
        const next = current.includes(choice.name) ? current.filter((c) => c !== choice.name) : [...current, choice.name];
        return { ...prev, [group.name]: next };
      }
      return { ...prev, [group.name]: [choice.name] };
    });
  };

  const addModalToCart = () => {
    if (!selectedProduct) return;
    const selectedOptionsList: CartLine["selectedOptions"] = [];
    for (const group of selectedProduct.options ?? []) {
      const picked = optionPicks[group.name] ?? [];
      for (const choiceName of picked) {
        const choice = group.choices.find((c) => c.name === choiceName);
        if (choice) {
          selectedOptionsList.push({
            groupName: group.name,
            choiceName: choice.name,
            extraSatang: choice.priceSatang,
          });
        }
      }
    }

    const lineId = `${selectedProduct.id}-${JSON.stringify(selectedOptionsList)}-${itemNote}`;
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.id === lineId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [
        ...prev,
        {
          id: lineId,
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          basePriceSatang: selectedProduct.priceSatang,
          quantity: 1,
          selectedOptions: selectedOptionsList,
          note: itemNote.trim(),
        },
      ];
    });

    setSelectedProduct(null);
  };

  const directAddToCart = (product: MenuItem) => {
    if ((product.options ?? []).length > 0) {
      openOptionModal(product);
      return;
    }
    const lineId = `${product.id}--`;
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.id === lineId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [
        ...prev,
        {
          id: lineId,
          productId: product.id,
          productName: product.name,
          basePriceSatang: product.priceSatang,
          quantity: 1,
          selectedOptions: [],
          note: "",
        },
      ];
    });
  };

  const updateCartQty = (lineId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) => {
          if (l.id !== lineId) return l;
          const newQty = l.quantity + delta;
          return newQty > 0 ? { ...l, quantity: newQty } : null;
        })
        .filter((l): l is CartLine => l !== null),
    );
  };

  const totalSatang = useMemo(() => {
    return cart.reduce((sum, line) => {
      const optionsSum = line.selectedOptions.reduce((acc, opt) => acc + opt.extraSatang, 0);
      return sum + (line.basePriceSatang + optionsSum) * line.quantity;
    }, 0);
  }, [cart]);

  const submitOrder = async () => {
    if (!cart.length || !table) return;
    setIsSubmitting(true);
    setNotice(null);

    const payload = {
      tableToken: token,
      idempotencyKey: `qr-${token}-${Date.now()}`,
      customerName: customerName.trim() || undefined,
      note: orderNote.trim() || undefined,
      lines: cart.map((line) => {
        const optionsExtra = line.selectedOptions.reduce((acc, o) => acc + o.extraSatang, 0);
        return {
          productId: line.productId,
          quantity: line.quantity,
          unitPriceSatang: line.basePriceSatang + optionsExtra,
          selectedOptions: line.selectedOptions,
          note: line.note || undefined,
        };
      }),
    };

    try {
      const res = await fetch("/api/qr/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setCart([]);
        setOrderSent(true);
      } else {
        const err = await res.json().catch(() => ({}));
        setNotice(err.error || "ส่งรายการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      }
    } catch {
      setNotice("การเชื่อมต่อล้มเหลว กรุณาเรียกพนักงาน");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-50 pb-36 text-neutral-800">
      {/* Header Banner */}
      <header className="sticky top-0 z-20 border-b border-emerald-900/20 bg-emerald-900 px-4 py-4 text-white shadow-md">
        <div className="mx-auto flex max-w-xl items-center justify-between">
          <div>
            <span className="inline-block rounded-full bg-emerald-800/80 px-2.5 py-0.5 text-xs font-semibold tracking-wider text-amber-300">
              FILLING POS · สั่งอาหารที่โต๊ะ
            </span>
            <h1 className="mt-1 text-2xl font-black tracking-tight">{table ? table.label : "กำลังโหลดข้อมูล..."}</h1>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-950/60 px-3 py-1.5 text-xs font-semibold text-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              เปิดรับออเดอร์
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4 py-4">
        {/* Notice Banner */}
        {notice && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
            {notice}
          </div>
        )}

        {/* Order Sent Success Screen */}
        {orderSent && (
          <div className="my-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center text-emerald-950 shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-3xl text-white shadow-lg shadow-emerald-600/30">
              ✓
            </div>
            <h2 className="mt-4 text-2xl font-black">ส่งออเดอร์ให้ครัวแล้ว!</h2>
            <p className="mt-2 text-sm text-emerald-800">
              รายการของคุณถูกส่งเข้าจอครัว KDS เรียบร้อยแล้ว กำลังเตรียมเสิร์ฟให้คุณที่ {table?.label}
            </p>
            <div className="mt-6 flex flex-col gap-2">
              {STATIC_PAYMENT_QR_URL && (
                <div className="rounded-2xl border border-amber-200 bg-white p-4">
                  <p className="mb-2 text-sm font-black text-emerald-950">ชำระเงินด้วย QR PromptPay</p>
                  <img src={STATIC_PAYMENT_QR_URL} alt="QR PromptPay ของร้าน" className="mx-auto h-56 w-56 rounded-xl object-contain" />
                  <p className="mt-2 text-xs text-neutral-500">สแกนแล้วตรวจสอบยอดและแจ้งพนักงานหลังโอนเงิน</p>
                </div>
              )}
              <button
                type="button"
                onClick={() => setOrderSent(false)}
                className="w-full rounded-2xl bg-emerald-800 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-[0.99]"
              >
                + สั่งรายการเพิ่ม
              </button>
            </div>
          </div>
        )}

        {/* Main store tabs: keep the two businesses clearly separated for QR customers. */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => { setActiveStore("STEAK"); setActiveCategory("ทั้งหมด"); }}
            className={`rounded-2xl px-4 py-4 text-left shadow-sm transition ${activeStore === "STEAK" ? "bg-emerald-900 text-white ring-2 ring-amber-400" : "border border-neutral-200 bg-white text-neutral-700"}`}
          >
            <span className="block text-2xl">🥩</span>
            <span className="mt-1 block text-lg font-black">ร้านสเต็ก</span>
            <span className="text-xs opacity-80">อาหารและของทานเล่น</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveStore("CAFE"); setActiveCategory("ทั้งหมด"); }}
            className={`rounded-2xl px-4 py-4 text-left shadow-sm transition ${activeStore === "CAFE" ? "bg-emerald-900 text-white ring-2 ring-amber-400" : "border border-neutral-200 bg-white text-neutral-700"}`}
          >
            <span className="block text-2xl">☕</span>
            <span className="mt-1 block text-lg font-black">ร้านกาแฟ</span>
            <span className="text-xs opacity-80">กาแฟ ชา และเครื่องดื่ม</span>
          </button>
        </div>

        {/* Category Pill Filters */}
        <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 py-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                activeCategory === cat
                  ? "bg-amber-500 text-emerald-950 shadow-sm"
                  : "bg-white text-neutral-600 border border-neutral-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Menu Items Grid / List */}
        {loading ? (
          <div className="py-20 text-center text-neutral-400">กำลังโหลดเมนูอาหาร...</div>
        ) : filteredMenu.length === 0 ? (
          <div className="py-20 text-center text-neutral-400">ไม่มีรายการอาหารในหมวดหมู่นี้</div>
        ) : (
          <div className="space-y-3">
            {filteredMenu.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-3 rounded-2xl border border-neutral-200/80 bg-white p-3 shadow-sm hover:border-emerald-600 transition"
              >
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl object-cover shrink-0 border border-neutral-100 shadow-2xs"
                  />
                ) : (
                  <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl bg-[#edf5f0] text-[#12382e] flex flex-col items-center justify-center shrink-0 border border-[#d8e3dc]">
                    <span className="text-2xl">🍽️</span>
                    <span className="text-[10px] font-bold text-[#527263] mt-0.5 truncate max-w-[70px] text-center">{product.categoryId}</span>
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-[#719183] uppercase tracking-wider">{product.categoryId}</span>
                  <h3 className="font-bold text-sm sm:text-base text-neutral-900 leading-snug line-clamp-2">{product.name}</h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="text-base font-black text-emerald-800">{money(product.priceSatang)}</span>
                    {product.options && product.options.length > 0 && (
                      <span className="rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-bold">
                        เลือกตัวเลือกได้
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => directAddToCart(product)}
                  className="flex h-11 items-center justify-center rounded-xl bg-amber-400 hover:bg-amber-500 px-3.5 sm:px-4 text-xs sm:text-sm font-black text-neutral-950 shadow-sm active:scale-95 shrink-0 transition"
                >
                  {product.options && product.options.length > 0 ? "เลือก" : "+ สั่ง"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Product Option Customization Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white p-5 shadow-2xl">
            {selectedProduct.imageUrl && (
              <div className="mb-4 h-48 sm:h-56 w-full overflow-hidden rounded-2xl bg-neutral-100 border border-neutral-200 shadow-inner">
                <img
                  src={selectedProduct.imageUrl}
                  alt={selectedProduct.name}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-xs font-bold text-neutral-400">{selectedProduct.categoryId}</span>
                <h3 className="text-xl font-black text-neutral-900">{selectedProduct.name}</h3>
                <p className="text-base font-black text-emerald-800 mt-0.5">{money(selectedProduct.priceSatang)}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-lg font-bold text-neutral-500 hover:bg-neutral-200"
              >
                ✕
              </button>
            </div>

            {/* Option Groups */}
            <div className="mt-4 space-y-5">
              {(selectedProduct.options ?? []).map((group) => (
                <div key={group.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-neutral-900">
                      {group.name} {group.required && <span className="text-red-500">*จำเป็น</span>}
                    </span>
                    <span className="text-xs text-neutral-400">{group.multi ? "เลือกได้หลายอย่าง" : "เลือกได้ 1 อย่าง"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {group.choices.map((choice) => {
                      const isPicked = (optionPicks[group.name] ?? []).includes(choice.name);
                      return (
                        <button
                          key={choice.name}
                          type="button"
                          onClick={() => handleChoiceToggle(group, choice)}
                          className={`flex items-center justify-between rounded-xl border p-2.5 text-left text-sm transition-all ${
                            isPicked
                              ? "border-emerald-600 bg-emerald-50 font-bold text-emerald-900 ring-2 ring-emerald-500/20"
                              : "border-neutral-200 bg-white text-neutral-700"
                          }`}
                        >
                          <span className="truncate">{choice.name}</span>
                          {choice.priceSatang > 0 && (
                            <span className="ml-1 text-xs text-emerald-700 font-semibold">
                              +{choice.priceSatang / 100}฿
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Special Note */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700">หมายเหตุพิเศษ</label>
                <input
                  type="text"
                  placeholder="เช่น ไม่ใส่ผัก, เผ็ดน้อย, แยกน้ำจิ้ม"
                  value={itemNote}
                  onChange={(e) => setItemNote(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={addModalToCart}
                className="w-full rounded-2xl bg-amber-500 py-3.5 text-sm font-bold text-neutral-950 shadow-md active:scale-[0.99]"
              >
                ใส่ตะกร้า
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Cart Bar */}
      {cart.length > 0 && !orderSent && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-neutral-200 bg-white p-4 shadow-2xl">
          <div className="mx-auto max-w-xl">
            {/* Collapsed/Expanded Cart Overview */}
            <div className="mb-3 max-h-48 overflow-y-auto divide-y divide-neutral-100 rounded-xl bg-neutral-50 p-2.5 text-xs">
              {cart.map((line) => {
                const optExtra = line.selectedOptions.reduce((acc, o) => acc + o.extraSatang, 0);
                const lineTotal = (line.basePriceSatang + optExtra) * line.quantity;
                return (
                  <div key={line.id} className="flex items-center justify-between py-1.5">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-neutral-800">{line.productName}</div>
                      {line.selectedOptions.length > 0 && (
                        <div className="text-[11px] text-neutral-500">
                          {line.selectedOptions.map((o) => o.choiceName).join(", ")}
                        </div>
                      )}
                      {line.note && <div className="text-[11px] text-amber-700">โน้ต: {line.note}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-800">{money(lineTotal)}</span>
                      <div className="flex items-center rounded-lg border border-neutral-300 bg-white">
                        <button
                          type="button"
                          onClick={() => updateCartQty(line.id, -1)}
                          className="h-7 w-7 text-sm font-bold text-neutral-600 active:bg-neutral-100"
                        >
                          -
                        </button>
                        <span className="w-5 text-center font-bold text-neutral-800">{line.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateCartQty(line.id, 1)}
                          className="h-7 w-7 text-sm font-bold text-neutral-600 active:bg-neutral-100"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Optional Customer Name & Table Note */}
            <div className="mb-3 grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="ชื่อผู้สั่ง (ถ้ามี)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="rounded-xl border border-neutral-200 px-3 py-2 text-xs outline-none focus:border-emerald-500"
              />
              <input
                type="text"
                placeholder="โน้ตเพิ่มเติมสำหรับโต๊ะ"
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
                className="rounded-xl border border-neutral-200 px-3 py-2 text-xs outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-neutral-500">รวมทั้งหมด ({cart.reduce((a, b) => a + b.quantity, 0)} รายการ)</p>
                <p className="text-2xl font-black text-emerald-950">{money(totalSatang)}</p>
              </div>
              <button
                type="button"
                onClick={submitOrder}
                disabled={isSubmitting || !table}
                className="flex-1 rounded-2xl bg-emerald-800 py-3.5 text-center font-bold text-white shadow-md hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50"
              >
                {isSubmitting ? "กำลังส่ง..." : "ยืนยันส่งครัว"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
