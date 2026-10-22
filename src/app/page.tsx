"use client";
/* eslint-disable @next/next/no-img-element -- POS receipt and QR previews use runtime data URLs. */

import { useEffect, useMemo, useState } from "react";
import {
  Utensils,
  LayoutGrid,
  ChefHat,
  BookOpen,
  Wallet,
  BarChart3,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  QrCode,
  DollarSign,
  X,
  Printer,
  AlertTriangle,
  Settings,
  Sliders,
  Edit3,
  Tag,
} from "lucide-react";

import {
  type MenuItem,
  type OptionChoice,
  type OptionGroup,
} from "@/lib/domain/menu";
import type { OrderView, TableView, ShiftView, SalesReport } from "@/lib/domain/order-view";
import { generatePromptPayQrDataUrl, generateQrCodeDataUrl } from "@/lib/domain/promptpay";

// Helpers
const satangToBaht = (satang: number) => (satang / 100).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatMoney = (satang: number) => `฿${satangToBaht(satang)}`;
const createClientId = (prefix: string) => {
  return `${prefix}_${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
};

const posFetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const token = (window as Window & { FillingNative?: { getSessionToken?: () => string } }).FillingNative?.getSessionToken?.();
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
};

const resizeMenuImage = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error("อ่านรูปภาพไม่สำเร็จ"));
  reader.onload = () => {
    const image = new Image();
    image.onerror = () => reject(new Error("รูปภาพไม่ถูกต้อง"));
    image.onload = () => {
      const maxDimension = 1400;
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
      const encode = (quality: number) => canvas.toBlob((blob) => {
        if (!blob) { reject(new Error("ย่อรูปภาพไม่สำเร็จ")); return; }
        if (blob.size <= 2 * 1024 * 1024 || quality <= 0.45) {
          const output = new FileReader();
          output.onload = () => typeof output.result === "string" ? resolve(output.result) : reject(new Error("อ่านรูปที่ย่อแล้วไม่สำเร็จ"));
          output.readAsDataURL(blob);
        } else encode(Math.max(0.45, quality - 0.1));
      }, "image/jpeg", quality);
      encode(0.82);
    };
    image.src = String(reader.result);
  };
  reader.readAsDataURL(file);
});

type CartItem = {
  productId: string;
  name: string;
  categoryId: string;
  basePriceSatang: number;
  unitPriceSatang: number;
  quantity: number;
  modifiers: OptionChoice[];
  note: string;
};

type HeldBill = {
  table: TableView;
  cart: CartItem[];
  customerName: string;
  discountType: "percent" | "baht";
  discountValue: number;
  discountCustomInput: string;
};

type BranchChoice = { branchId: string; name: string; code: string };

const DEFAULT_TOP_20_SKUS = [
  "CMB-003", // สเต็กหมู + ไก่
  "SET-M",   // Set M
  "STK-005", // สเต็ก Ribeye / สันแหลม
  "STK-001", // สเต็กหมู
  "CMB-004", // สเต็กหมู + ปลาทอด
  "CAFE-COFFEE-AMER-MID", // Americano (คั่วกลาง)
  "CAFE-COFFEE-ESPRESSO", // Espresso เย็น (Es-Yen)
  "CAFE-COFFEE-LATTE",    // Latte
  "CAFE-TEA-GREEN",       // Green Tea (ชาเขียวนมเย็น)
  "CAFE-TEA-THAI",        // Thai Tea (ชาไทยเย็น)
  "STK-007", // สเต็ก Picanha
  "SET-L",   // Set L
  "CMB-006", // สเต็กไก่ + ปลาทอด
  "STK-002", // สเต็กไก่
  "STK-008", // Pork Chop
  "PST-007", // สปาเก็ตตี้พริกแห้งเบคอน
  "PST-001", // สปาเก็ตตี้คาโบนาร่า
  "SNK-001", // ทอดรวม
  "SNK-005", // เฟรนช์ฟรายส์ขายแยก
  "CAFE-COFFEE-CAPPUCCINO", // Cappuccino
];

const DRINK_CATEGORIES = [
  "กาแฟสด",
  "ชา & มัทฉะ",
  "นมสด & โกโก้",
  "อิตาเลียนโซดา",
  "สมูทตี้",
  "น้ำดื่ม & โค้ก",
];

const isDrinkCategory = (categoryId: string) => {
  if (DRINK_CATEGORIES.includes(categoryId)) return true;
  const lower = categoryId.toLowerCase();
  return (
    lower.includes("กาแฟ") ||
    lower.includes("ชา") ||
    lower.includes("มัทฉะ") ||
    lower.includes("นม") ||
    lower.includes("โกโก้") ||
    lower.includes("โซดา") ||
    lower.includes("สมูทตี้") ||
    lower.includes("น้ำ") ||
    lower.includes("เครื่องดื่ม") ||
    lower.includes("โค้ก") ||
    lower.includes("drink") ||
    lower.includes("coffee") ||
    lower.includes("tea")
  );
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "สเต็ก":
      return "🥩";
    case "สเต็กคอมโบ":
      return "🍖";
    case "เซ็ตครอบครัว":
      return "👨‍👩‍👧‍👦";
    case "สปาเก็ตตี้":
      return "🍝";
    case "เบอร์เกอร์":
      return "🍔";
    case "ของทานเล่น & สลัด":
      return "🍟";
    case "ของทานเล่น":
      return "🍟";
    case "สลัด":
      return "🥗";
    case "กาแฟสด":
      return "☕";
    case "ชา & มัทฉะ":
      return "🍵";
    case "นมสด & โกโก้":
      return "🥛";
    case "อิตาเลียนโซดา":
      return "🍹";
    case "สมูทตี้":
      return "🍧";
    case "น้ำดื่ม & โค้ก":
      return "🧊";
    default:
      if (isDrinkCategory(category)) return "🥤";
      return "🍽️";
  }
};


export default function PosApp() {
  // Navigation
  const [tab, setTab] = useState<"pos" | "tables" | "kitchen" | "menu" | "shifts" | "reports" | "settings">("pos");

  // Global POS state
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<TableView[]>([]);
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [shifts, setShifts] = useState<ShiftView[]>([]);
  const [report, setReport] = useState<SalesReport | null>(null);
  const [notice, setNotice] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);

  // Active POS Order State
  const [orderType, setOrderType] = useState<"DINE_IN" | "TAKEAWAY" | "DELIVERY">("DINE_IN");
  const [selectedTable, setSelectedTable] = useState<TableView | null>(() => {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(window.localStorage.getItem("pos_selected_table_v1") ?? "null") as TableView | null; } catch { return null; }
  });
  const [heldBills, setHeldBills] = useState<Record<string, HeldBill>>(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(window.localStorage.getItem("pos_held_bills_v1") ?? "{}"); } catch { return {}; }
  });
  const [hydrated, setHydrated] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [queueNumber, setQueueNumber] = useState("1");
  const [deliveryPlatform, setDeliveryPlatform] = useState("Grab");
  const [deliveryOrderId, setDeliveryOrderId] = useState("");
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(window.localStorage.getItem("pos_cart_draft_v1") ?? "[]") as CartItem[]; } catch { return []; }
  });
  const [cartHydrated] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [menuMainGroup, setMenuMainGroup] = useState<"TOP20" | "FOOD" | "DRINK" | "ALL">("TOP20");
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>("ALL");
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [printerSettings, setPrinterSettings] = useState<{ counterMac: string; kitchenMac: string; barMac: string; paperWidth: string; drawerEnabled: boolean }>(() => {
    const defaults = { counterMac: "", kitchenMac: "", barMac: "", paperWidth: "58", drawerEnabled: true };
    if (typeof window === "undefined") return defaults;
    try { return { ...defaults, ...JSON.parse(window.localStorage.getItem("pos_printer_settings_v1") ?? "{}") }; } catch { return defaults; }
  });

  useEffect(() => {
    window.localStorage.setItem("pos_printer_settings_v1", JSON.stringify(printerSettings));
  }, [printerSettings]);

  // Discount State
  const [discountType, setDiscountType] = useState<"percent" | "baht">("percent");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountCustomInput, setDiscountCustomInput] = useState<string>("");
  const [discountDrawerOpen, setDiscountDrawerOpen] = useState<boolean>(false);
  const [vatEnabled, setVatEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("pos_vat_enabled_v2") === "true";
  });

  useEffect(() => {
    window.localStorage.setItem("pos_vat_enabled_v2", String(vatEnabled));
  }, [vatEnabled]);

  useEffect(() => {
    if (!cartHydrated) return;
    if (cart.length > 0) window.localStorage.setItem("pos_cart_draft_v1", JSON.stringify(cart));
    else window.localStorage.removeItem("pos_cart_draft_v1");
    if (selectedTable) window.localStorage.setItem("pos_selected_table_v1", JSON.stringify(selectedTable));
    else window.localStorage.removeItem("pos_selected_table_v1");
  }, [cart, cartHydrated, selectedTable]);

  useEffect(() => {
    if (Object.keys(heldBills).length > 0) window.localStorage.setItem("pos_held_bills_v1", JSON.stringify(heldBills));
    else window.localStorage.removeItem("pos_held_bills_v1");
  }, [heldBills]);

  useEffect(() => {
    const timer = window.setTimeout(() => setHydrated(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  // Modals state
  const [optionModalItem, setOptionModalItem] = useState<MenuItem | null>(null);
  const [modalModifiers, setModalModifiers] = useState<OptionChoice[]>([]);
  const [modalNote, setModalNote] = useState("");
  const [modalQuantity, setModalQuantity] = useState(1);

  // Payment Modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qr" | "transfer" | "platform">("cash");
  const [paymentPlatform, setPaymentPlatform] = useState<"grab" | "shopeefood" | "lineman">("grab");
  const [cashTenderedSatang, setCashTenderedSatang] = useState<number>(0);
  const [promptPayQrUrl, setPromptPayQrUrl] = useState<string>("");
  const [activeReceipt, setActiveReceipt] = useState<{
    documentNumber: string;
    totalSatang: number;
    subtotalSatang: number;
    discountSatang?: number;
    vatSatang: number;
    issuedAt: string;
    lines: Array<{ name: string; quantity: number; unitPriceSatang: number; modifiers?: Array<{ name: string; priceSatang: number }>; note?: string }>;
    changeSatang?: number;
    tenderedSatang?: number;
    method?: string;
    orderType?: string;
    tableName?: string;
    queueNumber?: string;
    deliveryPlatform?: string;
    deliveryOrderId?: string;
    openDrawer?: boolean;
  } | null>(null);
  const [paperWidth, setPaperWidth] = useState<"58mm" | "80mm">("58mm");

  // Table QR modal
  const [tableQrModal, setTableQrModal] = useState<{ table: TableView; qrUrl: string } | null>(null);

  // Shift modals
  const [openShiftModal, setOpenShiftModal] = useState(false);
  const [closeShiftModal, setCloseShiftModal] = useState(false);
  const [openingFloatInput, setOpeningFloatInput] = useState("2000");
  const [countedCashInput, setCountedCashInput] = useState("");
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [branchChoices, setBranchChoices] = useState<BranchChoice[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [showAuthPassword, setShowAuthPassword] = useState(false);

  // Menu sub-tab (Menu items vs Option Groups library)
  const [menuSubTab, setMenuSubTab] = useState<"products" | "option_groups">("products");
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);

  // Option Groups Library Modal
  const [libraryGroupModalOpen, setLibraryGroupModalOpen] = useState(false);
  const [editingLibGroupId, setEditingLibGroupId] = useState<string | null>(null);
  const [libGroupName, setLibGroupName] = useState("");
  const [libGroupRequired, setLibGroupRequired] = useState(false);
  const [libGroupMulti, setLibGroupMulti] = useState(false);
  const [libChoices, setLibChoices] = useState<{ name: string; priceBaht: string }[]>([
    { name: "", priceBaht: "0" },
    { name: "", priceBaht: "0" },
  ]);

  // Product & Options Editor Modal
  const [productEditorOpen, setProductEditorOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [formProductName, setFormProductName] = useState("");
  const [formProductCategory, setFormProductCategory] = useState("สเต็ก");
  const [formProductPrice, setFormProductPrice] = useState("99");
  const [formProductImageUrl, setFormProductImageUrl] = useState("");
  const [formProductOptions, setFormProductOptions] = useState<OptionGroup[]>([]);

  const openCreateProductModal = () => {
    setEditingProductId(null);
    setFormProductName("");
    setFormProductCategory("สเต็ก");
    setFormProductPrice("99");
    setFormProductImageUrl("");
    setFormProductOptions([]);
    setProductEditorOpen(true);
  };

  const openEditProductModal = (product: MenuItem) => {
    setEditingProductId(product.id);
    setFormProductName(product.name);
    setFormProductCategory(product.categoryId);
    setFormProductPrice(String(Math.round(product.priceSatang / 100)));
    setFormProductImageUrl(product.imageUrl || "");
    setFormProductOptions(product.options ? JSON.parse(JSON.stringify(product.options)) : []);
    setProductEditorOpen(true);
  };

  const toggleOptionGroupOnProduct = (group: OptionGroup) => {
    setFormProductOptions((prev) => {
      const exists = prev.some((g) => g.id === group.id || g.name === group.name);
      if (exists) {
        return prev.filter((g) => g.id !== group.id && g.name !== group.name);
      }
      return [...prev, JSON.parse(JSON.stringify(group))];
    });
  };

  const openCreateLibraryGroupModal = () => {
    setEditingLibGroupId(null);
    setLibGroupName("");
    setLibGroupRequired(false);
    setLibGroupMulti(false);
    setLibChoices([
      { name: "", priceBaht: "0" },
      { name: "", priceBaht: "0" },
    ]);
    setLibraryGroupModalOpen(true);
  };

  const openEditLibraryGroupModal = (group: OptionGroup) => {
    setEditingLibGroupId(group.id);
    setLibGroupName(group.name);
    setLibGroupRequired(!!group.required);
    setLibGroupMulti(!!group.multi);
    setLibChoices(
      group.choices.map((c) => ({
        name: c.name,
        priceBaht: String(Math.round(c.priceSatang / 100)),
      }))
    );
    setLibraryGroupModalOpen(true);
  };

  const handleSaveLibraryGroup = async () => {
    if (!libGroupName.trim()) {
      showNotice("กรุณาระบุชื่อกลุ่มตัวเลือก", "error");
      return;
    }
    const validChoices = libChoices
      .filter((c) => c.name.trim().length > 0)
      .map((c) => ({
        name: c.name.trim(),
        priceSatang: Math.round((parseFloat(c.priceBaht) || 0) * 100),
      }));

    if (validChoices.length === 0) {
      showNotice("กรุณาเพิ่มช้อยส์ตัวเลือกอย่างน้อย 1 รายการ", "error");
      return;
    }

    const payload: OptionGroup = {
      id: editingLibGroupId || createClientId("opt"),
      name: libGroupName.trim(),
      required: libGroupRequired,
      multi: libGroupMulti,
      choices: validChoices,
    };

    try {
      const res = await posFetch("/api/catalog/option-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        showNotice(`บันทึกกลุ่มตัวเลือก "${payload.name}" เรียบร้อย`, "success");
        setLibraryGroupModalOpen(false);
        void loadOptionGroups();
      } else {
        showNotice("บันทึกกลุ่มตัวเลือกไม่สำเร็จ", "error");
      }
    } catch {
      showNotice("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    }
  };

  const handleDeleteLibraryGroup = async (id: string, name: string) => {
    if (!confirm(`ต้องการลบกลุ่มตัวเลือก "${name}" ออกจากคลังหรือไม่?`)) return;
    try {
      const res = await posFetch(`/api/catalog/option-groups?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showNotice(`ลบกลุ่มตัวเลือก "${name}" แล้ว`, "info");
        void loadOptionGroups();
      }
    } catch {
      showNotice("ลบกลุ่มตัวเลือกไม่สำเร็จ", "error");
    }
  };

  const handleSaveProduct = async () => {
    if (!formProductName.trim() || !formProductPrice.trim()) {
      showNotice("กรุณากรอกชื่อและราคาอาหาร", "error");
      return;
    }
    const priceSatang = Math.round(parseFloat(formProductPrice) * 100);
    if (isNaN(priceSatang) || priceSatang < 0) {
      showNotice("ราคาอาหารไม่ถูกต้อง", "error");
      return;
    }

    try {
      if (editingProductId) {
      const res = await posFetch(`/api/catalog/products/${editingProductId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formProductName.trim(),
            categoryId: formProductCategory.trim() || "ทั่วไป",
            priceSatang,
            imageUrl: formProductImageUrl.trim() || undefined,
            options: formProductOptions,
          }),
        });
        if (res.ok) {
          showNotice(`บันทึกการแก้ไขเมนู "${formProductName}" สำเร็จ`, "success");
          setProductEditorOpen(false);
          void loadMenu();
        } else {
          showNotice("แก้ไขเมนูไม่สำเร็จ", "error");
        }
      } else {
      const res = await posFetch("/api/catalog/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formProductName.trim(),
            categoryId: formProductCategory.trim() || "ทั่วไป",
            priceSatang,
            imageUrl: formProductImageUrl.trim() || undefined,
            channels: { POS: true, QR: true, DELIVERY: false },
            options: formProductOptions,
          }),
        });
        if (res.ok) {
          showNotice(`เพิ่มเมนู "${formProductName}" สำเร็จ`, "success");
          setProductEditorOpen(false);
          void loadMenu();
        } else {
          showNotice("เพิ่มเมนูไม่สำเร็จ", "error");
        }
      }
    } catch {
      showNotice("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    }
  };

  const showNotice = (msg: string, type: "success" | "error" | "info" = "info") => {
    setNotice({ msg, type });
    setTimeout(() => setNotice(null), 4000);
  };

  // Load menu
  const loadMenu = async () => {
    try {
      const res = await posFetch("/api/catalog/menu?channel=POS");
      if (res.ok) {
        const payload = await res.json();
        setMenu(payload.data || []);
      }
    } catch {
      // ignore
    }
  };

  // Load tables
  const loadTables = async () => {
    try {
      const res = await posFetch("/api/tables");
      if (res.ok) {
        const payload = await res.json();
        setTables(payload.data || []);
      }
    } catch {
      // ignore
    }
  };

  // Load orders
  const loadOrders = async () => {
    try {
      const res = await posFetch("/api/orders?scope=today");
      if (res.ok) {
        const payload = await res.json();
        setOrders(payload.data || []);
      }
    } catch {
      // ignore
    }
  };

  // Load shifts
  const loadShifts = async () => {
    try {
      const res = await posFetch("/api/shifts");
      if (res.ok) {
        const payload = await res.json();
        setShifts(payload.data || []);
      }
    } catch {
      // ignore
    }
  };

  // Load report
  const loadReport = async () => {
    try {
      const res = await posFetch("/api/reports/sales?days=1");
      if (res.ok) {
        const payload = await res.json();
        setReport(payload.data || null);
      }
    } catch {
      // ignore
    }
  };

  // Load option groups library
  const loadOptionGroups = async () => {
    try {
      const res = await posFetch("/api/catalog/option-groups");
      if (res.ok) {
        const payload = await res.json();
        setOptionGroups(payload.data || []);
      }
    } catch {
      // ignore
    }
  };

  const refreshAll = async () => {
    await Promise.all([loadMenu(), loadOptionGroups(), loadTables(), loadOrders(), loadShifts(), loadReport()]);
  };

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void refreshAll(), 0);
    const interval = setInterval(() => {
      void loadOrders();
      void loadTables();
    }, 15000);
    return () => {
      window.clearTimeout(initialLoad);
      clearInterval(interval);
    };
    // The refresh functions intentionally use the current POS session context.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Current active shift
  const currentShift = useMemo(() => shifts.find((s) => s.status === "OPEN"), [shifts]);

  // Dynamic Sales Volume per item from confirmed orders
  const itemSalesCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const order of orders) {
      if (order.status === "VOIDED") continue;
      for (const line of order.lines) {
        counts.set(line.productId, (counts.get(line.productId) || 0) + line.quantity);
      }
    }
    return counts;
  }, [orders]);

  // Compute the Top 20 best-selling items
  const top20Items = useMemo(() => {
    const sorted = [...menu].sort((a, b) => {
      const countA = itemSalesCount.get(a.id) || 0;
      const countB = itemSalesCount.get(b.id) || 0;
      if (countA !== countB) return countB - countA;

      const idxA = DEFAULT_TOP_20_SKUS.indexOf(a.sku);
      const idxB = DEFAULT_TOP_20_SKUS.indexOf(b.sku);
      const scoreA = idxA !== -1 ? 1000 - idxA : 0;
      const scoreB = idxB !== -1 ? 1000 - idxB : 0;
      return scoreB - scoreA;
    });
    return sorted.slice(0, 20);
  }, [menu, itemSalesCount]);

  // Count of food and drinks
  const foodCount = useMemo(() => menu.filter((m) => !isDrinkCategory(m.categoryId)).length, [menu]);
  const drinkCount = useMemo(() => menu.filter((m) => isDrinkCategory(m.categoryId)).length, [menu]);

  // Food categories from menu
  const foodCategories = useMemo(() => {
    const priorityOrder = ["สเต็ก", "สเต็กคอมโบ", "เซ็ตครอบครัว", "สปาเก็ตตี้", "เบอร์เกอร์", "ของทานเล่น", "สลัด"];
    const set = new Set<string>();
    menu.forEach((m) => {
      if (!isDrinkCategory(m.categoryId)) {
        set.add(m.categoryId);
      }
    });
    return Array.from(set).sort((a, b) => {
      const idxA = priorityOrder.indexOf(a);
      const idxB = priorityOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b, "th");
    });
  }, [menu]);

  // Drink categories from menu (separated into กาแฟสด, ชา & มัทฉะ, นมสด & โกโก้, อิตาเลียนโซดา, สมูทตี้, น้ำดื่ม & โค้ก)
  const drinkCategories = useMemo(() => {
    const priorityOrder = ["กาแฟสด", "ชา & มัทฉะ", "นมสด & โกโก้", "อิตาเลียนโซดา", "สมูทตี้", "น้ำดื่ม & โค้ก"];
    const set = new Set<string>();
    menu.forEach((m) => {
      if (isDrinkCategory(m.categoryId)) {
        set.add(m.categoryId);
      }
    });
    return Array.from(set).sort((a, b) => {
      const idxA = priorityOrder.indexOf(a);
      const idxB = priorityOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b, "th");
    });
  }, [menu]);

  // Top 20 ranking lookup
  const top20RankMap = useMemo(() => {
    const map = new Map<string, number>();
    top20Items.forEach((item, index) => {
      map.set(item.id, index + 1);
    });
    return map;
  }, [top20Items]);

  // Filtered menu based on menuMainGroup ("TOP20" | "FOOD" | "DRINK" | "ALL") and selectedSubCategory
  const filteredMenu = useMemo(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return menu.filter((item) =>
        item.name.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q) || item.categoryId.toLowerCase().includes(q)
      );
    }

    if (menuMainGroup === "TOP20") {
      if (selectedSubCategory === "FOOD") {
        return top20Items.filter((item) => !isDrinkCategory(item.categoryId));
      }
      if (selectedSubCategory === "DRINK") {
        return top20Items.filter((item) => isDrinkCategory(item.categoryId));
      }
      return top20Items;
    }

    if (menuMainGroup === "FOOD") {
      const foodItems = menu.filter((item) => !isDrinkCategory(item.categoryId));
      if (selectedSubCategory !== "ALL") {
        return foodItems.filter((item) => item.categoryId === selectedSubCategory);
      }
      return foodItems;
    }

    if (menuMainGroup === "DRINK") {
      const drinkItems = menu.filter((item) => isDrinkCategory(item.categoryId));
      if (selectedSubCategory !== "ALL") {
        return drinkItems.filter((item) => item.categoryId === selectedSubCategory);
      }
      return drinkItems;
    }

    // ALL
    if (selectedSubCategory !== "ALL") {
      return menu.filter((item) => item.categoryId === selectedSubCategory);
    }
    return menu;
  }, [menu, menuMainGroup, selectedSubCategory, top20Items, searchQuery]);

  // Cart totals
  const cartSubtotal = useMemo(() => cart.reduce((sum, item) => sum + item.unitPriceSatang * item.quantity, 0), [cart]);
  const cartDiscountSatang = useMemo(() => {
    if (!discountValue || discountValue <= 0) return 0;
    if (discountType === "percent") {
      const pct = Math.min(100, Math.max(0, discountValue));
      return Math.round((cartSubtotal * pct) / 100);
    } else {
      return Math.min(cartSubtotal, Math.round(discountValue * 100));
    }
  }, [cartSubtotal, discountType, discountValue]);
  const cartTotal = useMemo(() => Math.max(0, cartSubtotal - cartDiscountSatang), [cartSubtotal, cartDiscountSatang]);
  const cartVat = useMemo(() => (vatEnabled ? Math.round(cartTotal - cartTotal / 1.07) : 0), [cartTotal, vatEnabled]);

  // PromptPay QR generation on payment open
  useEffect(() => {
    if (paymentModalOpen && cartTotal > 0) {
      void generatePromptPayQrDataUrl("0812345678", cartTotal).then(setPromptPayQrUrl);
    }
  }, [paymentModalOpen, cartTotal]);

  const openPaymentModal = () => {
    if (orderType === "DINE_IN" && !selectedTable) {
      showNotice("กรุณาเลือกโต๊ะก่อนรับชำระเงิน", "error");
      return;
    }
    setCashTenderedSatang(cartTotal);
    setPaymentModalOpen(true);
  };

  // Handlers for Cart
  const openProductOptions = (item: MenuItem) => {
    if (!item.available) {
      showNotice(`${item.name} หมดแล้ว`, "error");
      return;
    }
    setOptionModalItem(item);
    setModalQuantity(1);
    setModalNote("");

    // pre-select first required choices
    const initialMods: OptionChoice[] = [];
    for (const group of item.options) {
      if (group.required && group.choices.length > 0) {
        initialMods.push(group.choices[0]);
      }
    }
    setModalModifiers(initialMods);
  };

  const confirmAddOptionsToCart = () => {
    if (!optionModalItem) return;
    const modifierTotal = modalModifiers.reduce((sum, m) => sum + m.priceSatang, 0);
    const unitPriceSatang = optionModalItem.priceSatang + modifierTotal;

    setCart((prev) => [
      ...prev,
      {
        productId: optionModalItem.id,
        name: optionModalItem.name,
        categoryId: optionModalItem.categoryId,
        basePriceSatang: optionModalItem.priceSatang,
        unitPriceSatang,
        quantity: modalQuantity,
        modifiers: modalModifiers,
        note: modalNote.trim(),
      },
    ]);
    setOptionModalItem(null);
    showNotice(`เพิ่ม ${optionModalItem.name} x${modalQuantity} แล้ว`, "success");
  };

  const updateCartQty = (index: number, delta: number) => {
    setCart((prev) => {
      const next = [...prev];
      const newQty = next[index].quantity + delta;
      if (newQty <= 0) {
        next.splice(index, 1);
      } else {
        next[index].quantity = newQty;
      }
      return next;
    });
  };

  const holdCurrentBill = () => {
    if (!selectedTable || cart.length === 0) {
      showNotice("ต้องเลือกโต๊ะและมีรายการก่อนพักบิล", "error");
      return;
    }
    const table = selectedTable;
    setHeldBills((prev) => ({
      ...prev,
      [table.id]: { table, cart: [...cart], customerName, discountType, discountValue, discountCustomInput },
    }));
    setCart([]);
    setSelectedTable(null);
    setCustomerName("");
    setDiscountValue(0);
    setDiscountCustomInput("");
    setDiscountDrawerOpen(false);
    showNotice(`พักบิล ${table.name} แล้ว สามารถเลือกโต๊ะอื่นต่อได้`, "success");
  };

  const selectTableForOrder = (table: TableView) => {
    if (selectedTable?.id !== table.id && cart.length > 0) {
      showNotice(`มีรายการของ ${selectedTable?.name ?? "โต๊ะเดิม"} อยู่ กรุณากด “พักบิล” ก่อนเปลี่ยนโต๊ะ`, "error");
      return;
    }
    const held = heldBills[table.id];
    setOrderType("DINE_IN");
    setTab("pos");
    if (held) {
      setCart(held.cart);
      setSelectedTable(held.table);
      setCustomerName(held.customerName);
      setDiscountType(held.discountType);
      setDiscountValue(held.discountValue);
      setDiscountCustomInput(held.discountCustomInput);
      setHeldBills((prev) => { const next = { ...prev }; delete next[table.id]; return next; });
      showNotice(`เรียกบิล ${table.name} กลับมาแล้ว`, "success");
      return;
    }
    setSelectedTable(table);
  };

  // Order submission & settlement
  const handleCheckoutSubmit = async () => {
    if (!cart.length) return;
    if (orderType === "DINE_IN" && !selectedTable) {
      showNotice("กรุณาเลือกโต๊ะสำหรับทานที่ร้าน", "error");
      return;
    }

    try {
      const idempotencyKey = createClientId("pos");
      // 1. Create order
      const lines = cart.map((item) => ({
        productId: item.productId,
        name: item.name,
        unitPriceSatang: item.unitPriceSatang,
        quantity: item.quantity,
        modifiers: item.modifiers.map((m) => ({ name: m.name, priceSatang: m.priceSatang })),
        note: item.note || undefined,
      }));

      const createRes = await posFetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source: "POS",
          orderType,
          tableId: selectedTable?.id,
          customerName: customerName || undefined,
          queueNumber: orderType === "TAKEAWAY" ? (queueNumber || undefined) : undefined,
          deliveryPlatform: orderType === "DELIVERY" ? deliveryPlatform : undefined,
          deliveryOrderId: orderType === "DELIVERY" ? (deliveryOrderId || undefined) : undefined,
          discountSatang: cartDiscountSatang > 0 ? cartDiscountSatang : undefined,
          idempotencyKey,
          lines,
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(err.error || "สร้างออเดอร์ไม่สำเร็จ");
      }
      const created = await createRes.json();
      const orderId = created.data.id;

      // 2. Settle payment
      const allocationMethod = paymentMethod === "cash" ? "cash" : paymentMethod === "qr" ? "qr" : paymentMethod === "transfer" ? "transfer" : "scheme";
      const payRes = await posFetch("/api/payments/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          orderId,
          idempotencyKey: `pay-${orderId}`,
          tenderedSatang: paymentMethod === "cash" ? cashTenderedSatang : cartTotal,
          allocations: [{ method: allocationMethod, amountSatang: cartTotal, ...(paymentMethod === "platform" ? { platform: paymentPlatform } : {}) }],
        }),
      });

      if (!payRes.ok) {
        const err = await payRes.json();
        throw new Error(err.error || "บันทึกชำระเงินไม่สำเร็จ");
      }
      const payData = await payRes.json();

      // Show receipt
      setActiveReceipt({
        documentNumber: payData.data.receipt?.documentNumber || `R-${new Date().getFullYear()}-000001`,
        totalSatang: cartTotal,
        subtotalSatang: cartSubtotal,
        discountSatang: cartDiscountSatang,
        vatSatang: cartVat,
        issuedAt: new Date().toISOString(),
        lines: [...cart],
        changeSatang: payData.data.changeSatang || 0,
        tenderedSatang: paymentMethod === "cash" ? cashTenderedSatang : cartTotal,
        method: paymentMethod === "cash" ? "เงินสด" : paymentMethod === "qr" ? "PromptPay QR" : paymentMethod === "transfer" ? "เงินโอน" : `แพลตฟอร์ม ${paymentPlatform}`,
        orderType: orderType === "DINE_IN" ? "ทานที่ร้าน" : orderType === "TAKEAWAY" ? "สั่งกลับบ้าน" : "เดลิเวอรี",
        tableName: selectedTable?.name,
        queueNumber: orderType === "TAKEAWAY" ? queueNumber : undefined,
        deliveryPlatform: orderType === "DELIVERY" ? deliveryPlatform : undefined,
        deliveryOrderId: orderType === "DELIVERY" ? deliveryOrderId : undefined,
        openDrawer: paymentMethod === "cash",
      });

      // Reset cart & inputs
      setCart([]);
      setSelectedTable(null);
      setCustomerName("");
      setDeliveryOrderId("");
      setDiscountValue(0);
      setDiscountCustomInput("");
      setDiscountDrawerOpen(false);
      if (orderType === "TAKEAWAY") {
        const currentQ = parseInt(queueNumber, 10);
        if (!isNaN(currentQ)) setQueueNumber(String(currentQ + 1));
      }
      setPaymentModalOpen(false);
      setMobileCartOpen(false);
      showNotice("ชำระเงินสำเร็จ ออกใบเสร็จและส่งครัวแล้ว!", "success");
      void refreshAll();
    } catch (err: unknown) {
      showNotice(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการทำรายการ", "error");
    }
  };

  // Advance kitchen ticket
  const advanceKitchen = async (orderId: string, nextStatus: string) => {
    try {
      const res = await posFetch(`/api/orders/${orderId}/kitchen`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kitchenStatus: nextStatus }),
      });
      if (res.ok) {
        showNotice(`อัปเดตสถานะครัวเป็น ${nextStatus}`, "success");
        void loadOrders();
      }
    } catch {
      showNotice("อัปเดตสถานะไม่สำเร็จ", "error");
    }
  };

  // Toggle Product availability
  const toggleAvailable = async (product: MenuItem) => {
    try {
      const res = await posFetch(`/api/catalog/products/${product.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ available: !product.available }),
      });
      if (res.ok) {
        showNotice(`${product.name}: ${!product.available ? "เปิดขายแล้ว" : "ตั้งเป็นของหมดแล้ว"}`, "info");
        void loadMenu();
      }
    } catch {
      showNotice("อัปเดตไม่สำเร็จ", "error");
    }
  };

  // Open Shift
  const handleOpenShift = async () => {
    const floatSatang = Math.round(parseFloat(openingFloatInput || "0") * 100);
    try {
      const res = await posFetch("/api/shifts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ openingFloatSatang: floatSatang }),
      });
      if (res.ok) {
        showNotice("เปิดกะเรียบร้อยแล้ว", "success");
        setOpenShiftModal(false);
        void loadShifts();
      } else if (res.status === 401) {
        setAuthNotice("กรุณาเข้าสู่ระบบด้วยบัญชีพนักงานก่อนเปิดกะ");
        setAuthModalOpen(true);
      } else {
        const error = await res.json().catch(() => ({}));
        showNotice(error.error ?? "เปิดกะไม่สำเร็จ", "error");
      }
    } catch {
      showNotice("เปิดกะไม่สำเร็จ", "error");
    }
  };

  const handleLogin = async () => {
    try {
      const res = await posFetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: authEmail.trim().toLowerCase(), password: authPassword, ...(selectedBranchId ? { branchId: selectedBranchId } : {}), rememberMe: true }) });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        if (res.status === 409 && payload.error === "BRANCH_SELECTION_REQUIRED") {
          setBranchChoices(Array.isArray(payload.branches) ? payload.branches : []);
          setAuthNotice("บัญชีนี้มีหลายสาขา กรุณาเลือกสาขาที่จะเปิดกะ");
        } else setAuthNotice(payload.error ?? "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        return;
      }
      setAuthModalOpen(false);
      setAuthPassword("");
      setAuthNotice("");
      setBranchChoices([]);
      setSelectedBranchId("");
      await handleOpenShift();
    } catch { setAuthNotice("เชื่อมต่อระบบไม่ได้"); }
  };

  // Close Shift
  const handleCloseShift = async () => {
    if (!currentShift) return;
    const countedSatang = Math.round(parseFloat(countedCashInput || "0") * 100);
    try {
      const res = await posFetch(`/api/shifts/${currentShift.id}/close`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ countedCashSatang: countedSatang }),
      });
      if (res.ok) {
        showNotice("ปิดกะและบันทึกตรวจนับเงินสดเรียบร้อยแล้ว", "success");
        setCloseShiftModal(false);
        setCart([]);
        setSelectedTable(null);
        setHeldBills({});
        window.localStorage.removeItem("pos_cart_draft_v1");
        window.localStorage.removeItem("pos_selected_table_v1");
        window.localStorage.removeItem("pos_held_bills_v1");
        void loadShifts();
      }
    } catch {
      showNotice("ปิดกะไม่สำเร็จ", "error");
    }
  };

  // Show table QR code
  const openTableQr = async (table: TableView) => {
    const fullUrl = `${window.location.origin}/qr/${table.qrToken}`;
    const qrUrl = await generateQrCodeDataUrl(fullUrl);
    setTableQrModal({ table, qrUrl });
  };

  if (!hydrated) return <div className="h-screen w-screen bg-[#f4f7f4]" />;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#f4f7f4] text-[#162a21] select-none">
      {/* Top Banner / Toast Notice */}
      {notice && (
        <div
          className={`fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-2xl px-5 py-3 shadow-xl backdrop-blur-md transition-all text-sm font-bold ${
            notice.type === "success"
              ? "bg-[#12382e]/95 text-[#f4eedb] border border-[#ddb259]/30"
              : notice.type === "error"
              ? "bg-red-800/95 text-white border border-red-500/40"
              : "bg-[#254d3f]/95 text-white border border-[#4d826f]/40"
          }`}
        >
          {notice.type === "success" ? <CheckCircle2 className="h-4 w-4 text-[#ddb259]" /> : <AlertTriangle className="h-4 w-4" />}
          <span>{notice.msg}</span>
        </div>
      )}

      {/* Main App Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Side Navigation (Desktop & iPad Landscape) */}
        <aside className="hidden lg:flex w-52 flex-col border-r border-[#d8e3dc] bg-[#12382e] p-3 text-[#eaf3ed]">
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-2 py-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#ddb259] text-2xl font-black text-[#12382e] shadow-md">
              F
            </div>
            <div>
              <h1 className="text-lg font-black tracking-wide text-white">FILLING POS</h1>
              <p className="text-xs text-[#a3c9b7]">ร้านอาหารไทย · หน้าร้าน</p>
            </div>
          </div>

          {/* Shift status pill */}
          <div className="mt-4 rounded-2xl bg-[#1b483c] p-3 text-xs border border-[#2b5c4f]">
            <div className="flex items-center justify-between font-bold">
              <span className="text-[#a3c9b7]">สถานะกะ</span>
              <span className={`flex items-center gap-1.5 ${currentShift ? "text-[#98e29a]" : "text-[#f3b497]"}`}>
                <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
                {currentShift ? "เปิดกะขายอยู่" : "ยังไม่ได้เปิดกะ"}
              </span>
            </div>
            {currentShift ? (
              <p className="mt-2 text-sm font-black text-white">
                เงินทอน {formatMoney(currentShift.openingFloatSatang)}
              </p>
            ) : (
              <button
                onClick={() => setOpenShiftModal(true)}
                className="mt-2 w-full rounded-xl bg-[#ddb259] py-1.5 text-center font-bold text-[#12382e] hover:bg-[#ebd08e]"
              >
                + เปิดกะใหม่
              </button>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="mt-5 flex flex-col gap-1.5 flex-1">
            {[
              { id: "pos", label: "ขายหน้าร้าน", icon: Utensils, badge: cart.length > 0 ? cart.length : undefined },
              { id: "tables", label: "ผังโต๊ะอาหาร", icon: LayoutGrid, badge: tables.filter((t) => t.status === "OCCUPIED").length + Object.keys(heldBills).length || undefined },
              { id: "kitchen", label: "จอส่งครัว (KDS)", icon: ChefHat, badge: orders.filter((o) => o.kitchenStatus === "NEW" || o.kitchenStatus === "COOKING").length || undefined },
              { id: "menu", label: "จัดการเมนู", icon: BookOpen },
              { id: "shifts", label: "จัดการกะ & เงินสด", icon: Wallet },
              { id: "reports", label: "สรุปยอดขาย", icon: BarChart3 },
              { id: "settings", label: "ตั้งค่าอุปกรณ์", icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = tab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id as typeof tab)}
                  className={`flex items-center justify-between rounded-2xl px-3.5 py-3 text-sm font-bold transition-all ${
                    isActive
                      ? "bg-[#ddb259] text-[#12382e] shadow-md shadow-[#ddb259]/20 font-black"
                      : "text-[#cce2d6] hover:bg-[#1b483c] hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`grid h-5 min-w-[20px] place-items-center rounded-full px-1.5 text-[11px] font-black ${
                        isActive ? "bg-[#12382e] text-[#ddb259]" : "bg-[#ddb259] text-[#12382e]"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick link to Ops */}
          <div className="mt-auto pt-3 border-t border-[#234e42] flex items-center justify-between text-xs text-[#a3c9b7]">
            <span>ระบบออฟไลน์พร้อม</span>
            <a href="/ops" className="underline hover:text-white">
              ศูนย์ระบบ
            </a>
          </div>
        </aside>

        {/* Center / Workspace Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Bar for Mobile & Tablet */}
          <header className="lg:hidden flex items-center justify-between bg-[#12382e] px-4 py-3 text-white border-b border-[#234e42]">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#ddb259] font-black text-[#12382e]">F</div>
              <span className="font-black text-sm tracking-wide">FILLING POS</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMobileCartOpen(true)}
                className="relative flex items-center gap-1.5 rounded-xl bg-[#ddb259] px-3 py-1.5 text-xs font-black text-[#12382e]"
              >
                <span>ตะกร้า</span>
                {cart.length > 0 && (
                  <span className="grid h-4 w-4 place-items-center rounded-full bg-[#12382e] text-[10px] text-white">
                    {cart.length}
                  </span>
                )}
                <span>· {formatMoney(cartTotal)}</span>
              </button>
            </div>
          </header>

          {/* Content by Tab */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {tab === "pos" && (
              <div className="flex-1 flex overflow-hidden">
                {/* Products & Ordering Section */}
                <div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-4 sm:p-5 lg:p-6">
                  {/* Service Mode & Table Selector Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-[#d8e3dc] shadow-sm">
                    {/* Order Type Toggle */}
                    <div className="flex rounded-xl bg-[#edf3ef] p-1 gap-1">
                      {(
                        [
                          { id: "DINE_IN", label: "ทานที่ร้าน" },
                          { id: "TAKEAWAY", label: "สั่งกลับบ้าน" },
                          { id: "DELIVERY", label: "เดลิเวอรี" },
                        ] as const
                      ).map((type) => (
                        <button
                          key={type.id}
                          onClick={() => setOrderType(type.id)}
                          className={`rounded-lg px-3 py-1.5 text-xs sm:text-sm font-bold transition ${
                            orderType === type.id ? "bg-[#12382e] text-white shadow-sm" : "text-[#547365] hover:text-[#12382e]"
                          }`}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>

                    {/* Table selection badge */}
                    {orderType === "DINE_IN" && (
                      <div className="flex items-center gap-2">
                        {selectedTable ? (
                          <div className="flex items-center gap-2 rounded-xl bg-[#e6f4ea] border border-[#b4e0bf] px-3 py-1.5 text-xs sm:text-sm font-bold text-[#1f5936]">
                            <span>{selectedTable.name}</span>
                            <button
                              onClick={() => {
                                if (cart.length > 0) showNotice("กรุณากด “พักบิล” ก่อนเปลี่ยนโต๊ะ", "error");
                                else setSelectedTable(null);
                              }}
                              className="text-[#a04838] hover:underline text-xs"
                            >
                              (เปลี่ยน)
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-1.5 overflow-x-auto max-w-[280px] sm:max-w-none no-scrollbar">
                            {tables.slice(0, 6).map((t) => {
                              const hasHeldBill = Boolean(heldBills[t.id]);
                              return (
                                <button
                                  key={t.id}
                                  onClick={() => selectTableForOrder(t)}
                                  className={`rounded-xl border px-2.5 py-1 text-xs font-bold whitespace-nowrap ${
                                    hasHeldBill
                                      ? "bg-[#fff0c9] border-[#ddb259] text-[#7f5a18] shadow-sm"
                                      : t.status === "OCCUPIED"
                                      ? "bg-[#fff2e6] border-[#f0c29e] text-[#9c531d]"
                                      : "bg-white border-[#d8e3dc] text-[#345b49] hover:border-[#345b49]"
                                  }`}
                                >
                                  {hasHeldBill ? `⏸ ${t.name}` : t.name}
                                </button>
                              );
                            })}
                            {tables.length > 6 && (
                              <button
                                onClick={() => setTab("tables")}
                                className="rounded-xl border border-dashed border-[#b8ccbf] px-2 py-1 text-xs font-bold text-[#5c7a6c]"
                              >
                                ดูทั้งหมด
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAKEAWAY: Queue Number + Customer Name */}
                    {orderType === "TAKEAWAY" && (
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center rounded-xl border border-[#d8e3dc] bg-[#f9fbf9] px-2.5 py-1 text-xs sm:text-sm">
                          <span className="font-black text-[#b45309] mr-1.5 whitespace-nowrap">คิว #</span>
                          <input
                            type="text"
                            value={queueNumber}
                            onChange={(e) => setQueueNumber(e.target.value)}
                             placeholder="คิว เช่น 12"
                             aria-label="เลขคิวรับอาหาร เช่น 12"
                             className="w-20 sm:w-24 font-black text-[#12382e] bg-transparent outline-none text-center placeholder:text-[#9aae9f] placeholder:font-normal"
                          />
                          <button
                            type="button"
                            title="คิวถัดไป (+1)"
                            onClick={() => {
                              const num = parseInt(queueNumber, 10);
                              setQueueNumber(String(isNaN(num) ? 1 : num + 1));
                            }}
                            className="ml-1 rounded-lg bg-[#ddb259] px-2 py-0.5 text-xs font-black text-[#12382e] hover:bg-[#c99e46] active:scale-95"
                          >
                            +1
                          </button>
                          <button
                            type="button"
                            title="รีเซ็ตคิวเป็น 1"
                            onClick={() => setQueueNumber("1")}
                            className="ml-1 rounded-lg bg-[#edf3ef] px-1.5 py-0.5 text-[10px] font-bold text-[#557567] hover:bg-[#dce7df]"
                          >
                            รีเซ็ต
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="ชื่อลูกค้า / เบอร์โทร (ถ้ามี)"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="rounded-xl border border-[#d8e3dc] bg-[#f9fbf9] px-3 py-1.5 text-xs sm:text-sm text-[#162a21] placeholder:text-[#9aae9f] placeholder:font-normal outline-none focus:border-[#12382e] w-40 sm:w-48"
                        />
                      </div>
                    )}

                    {/* DELIVERY: Platform Selector + Order ID + Rider */}
                    {orderType === "DELIVERY" && (
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Platform Selector Chips */}
                         <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                           <span className="mr-1 whitespace-nowrap text-[11px] font-bold text-[#9aae9f]">แพลตฟอร์ม:</span>
                          {[
                            { id: "Grab", label: "Grab", color: "bg-[#00b14f] text-white" },
                            { id: "LINE MAN", label: "LINE MAN", color: "bg-[#06c755] text-white" },
                            { id: "ShopeeFood", label: "ShopeeFood", color: "bg-[#ee4d2d] text-white" },
                            { id: "Robinhood", label: "Robinhood", color: "bg-[#7c3aed] text-white" },
                            { id: "TikTok", label: "TikTok", color: "bg-[#1f2937] text-white" },
                            { id: "อื่นๆ", label: "อื่นๆ", color: "bg-[#4b5563] text-white" },
                          ].map((platform) => {
                            const isSelected = deliveryPlatform === platform.id;
                            return (
                              <button
                                key={platform.id}
                                type="button"
                                onClick={() => setDeliveryPlatform(platform.id)}
                                className={`rounded-xl px-2.5 py-1 text-xs font-black transition ${
                                  isSelected
                                    ? `${platform.color} shadow-sm ring-2 ring-offset-1 ring-[#12382e]`
                                    : "bg-[#edf3ef] text-[#517061] hover:bg-[#dbe7df]"
                                }`}
                              >
                                {platform.label}
                              </button>
                            );
                          })}
                        </div>
                        {/* Delivery Order ID */}
                        <input
                          type="text"
                          placeholder="เลขออเดอร์แพลตฟอร์ม เช่น GF-1092"
                          value={deliveryOrderId}
                          onChange={(e) => setDeliveryOrderId(e.target.value)}
                          className="rounded-xl border border-[#d8e3dc] bg-[#f9fbf9] px-3 py-1.5 text-xs sm:text-sm font-normal text-[#162a21] placeholder:text-[#9aae9f] outline-none focus:border-[#12382e] w-36 sm:w-44"
                        />
                        {/* Driver / Customer name note */}
                        <input
                          type="text"
                          placeholder="ชื่อไรเดอร์ / โน้ต เช่น Aom"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="rounded-xl border border-[#d8e3dc] bg-[#f9fbf9] px-3 py-1.5 text-xs sm:text-sm text-[#162a21] placeholder:text-[#9aae9f] placeholder:font-normal outline-none focus:border-[#12382e] w-32 sm:w-36"
                        />
                      </div>
                    )}
                  </div>

                  {/* 2-Tier Category Navigation & Search */}
                  <div className="mt-3 space-y-2.5">
                    {/* Top Row: Full-width Search Bar + Quick Add Menu */}
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#79998b]" />
                        <input
                          type="text"
                          placeholder="ค้นหาเมนู (ชื่ออาหาร, เครื่องดื่ม, รหัส SKU, หมวด)..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full rounded-2xl border border-[#d8e3dc] bg-white pl-10 pr-9 py-2 text-xs sm:text-sm font-bold text-[#162a21] outline-none focus:border-[#12382e] shadow-xs"
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => setSearchQuery("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 grid place-items-center rounded-full bg-neutral-200 text-neutral-600 hover:bg-neutral-300 text-xs font-black transition"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={openCreateProductModal}
                        className="flex items-center gap-1.5 rounded-2xl bg-[#12382e] px-4 py-2 text-xs sm:text-sm font-black text-white shadow-sm hover:bg-[#1b483c] whitespace-nowrap active:scale-95 transition"
                      >
                        <Plus className="h-4 w-4 text-[#ddb259]" />
                        <span>+ เพิ่มเมนู</span>
                      </button>
                    </div>

                    {/* Tier 1: Main Category Groups (Dedicated Row - Never Cut Off) */}
                    <div className="flex flex-wrap items-center gap-2 py-0.5">
                      {/* Tab 1: Top 20 Best Sellers */}
                      <button
                          type="button"
                          onClick={() => {
                            setMenuMainGroup("TOP20");
                            setSelectedSubCategory("ALL");
                          }}
                          className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-black whitespace-nowrap transition active:scale-95 ${
                            menuMainGroup === "TOP20"
                              ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md ring-2 ring-amber-400/50"
                              : "bg-white border border-amber-200 text-amber-800 hover:bg-amber-50"
                          }`}
                        >
                          <span>⭐ ขายดี 20 อันดับ</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                              menuMainGroup === "TOP20" ? "bg-black/20 text-white" : "bg-amber-100 text-amber-900"
                            }`}
                          >
                            20
                          </span>
                        </button>

                        {/* Tab 2: Food */}
                        <button
                          type="button"
                          onClick={() => {
                            setMenuMainGroup("FOOD");
                            setSelectedSubCategory("ALL");
                          }}
                          className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-black whitespace-nowrap transition active:scale-95 ${
                            menuMainGroup === "FOOD"
                              ? "bg-[#12382e] text-white shadow-md ring-2 ring-[#12382e]/25"
                              : "bg-white border border-[#d8e3dc] text-[#3d5a4c] hover:bg-[#edf3ef]"
                          }`}
                        >
                          <span>🥩 หมวดอาหาร</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                              menuMainGroup === "FOOD" ? "bg-white/20 text-white" : "bg-[#edf3ef] text-[#2c483b]"
                            }`}
                          >
                            {foodCount}
                          </span>
                        </button>

                        {/* Tab 3: Drinks (separated by subcategories: Tea, Coffee, Soda, etc.) */}
                        <button
                          type="button"
                          onClick={() => {
                            setMenuMainGroup("DRINK");
                            setSelectedSubCategory("ALL");
                          }}
                          className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-black whitespace-nowrap transition active:scale-95 ${
                            menuMainGroup === "DRINK"
                              ? "bg-[#0284c7] text-white shadow-md ring-2 ring-sky-400/30"
                              : "bg-white border border-sky-200 text-sky-800 hover:bg-sky-50"
                          }`}
                        >
                          <span>🥤 เมนูน้ำ / เครื่องดื่ม</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                              menuMainGroup === "DRINK" ? "bg-white/25 text-white" : "bg-sky-100 text-sky-900"
                            }`}
                          >
                            {drinkCount}
                          </span>
                        </button>

                        {/* Tab 4: All Items */}
                        <button
                          type="button"
                          onClick={() => {
                            setMenuMainGroup("ALL");
                            setSelectedSubCategory("ALL");
                          }}
                          className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-black whitespace-nowrap transition active:scale-95 ${
                            menuMainGroup === "ALL"
                              ? "bg-[#2d3748] text-white shadow-md"
                              : "bg-white border border-[#d8e3dc] text-[#527263] hover:bg-[#edf3ef]"
                          }`}
                        >
                          <span>📋 ทุกรายการ</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                              menuMainGroup === "ALL" ? "bg-white/20 text-white" : "bg-[#edf3ef] text-[#527263]"
                            }`}
                          >
                            {menu.length}
                          </span>
                        </button>
                      </div>

                    {/* Tier 2: Sub-category Pills (Coffee, Tea, Soda, Steak, Combo, etc.) */}
                    <div className="flex flex-wrap items-center gap-1.5 py-1">
                      {/* Top 20 Sub-filters */}
                      {menuMainGroup === "TOP20" && (
                        <>
                          <button
                            type="button"
                            onClick={() => setSelectedSubCategory("ALL")}
                            className={`rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap transition ${
                              selectedSubCategory === "ALL"
                                ? "bg-amber-600 text-white shadow-xs font-black"
                                : "bg-white border border-amber-200 text-amber-800 hover:bg-amber-50"
                            }`}
                          >
                            ⭐ รวมขายดี 20 อันดับ ({top20Items.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedSubCategory("FOOD")}
                            className={`rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap transition ${
                              selectedSubCategory === "FOOD"
                                ? "bg-amber-600 text-white shadow-xs font-black"
                                : "bg-white border border-amber-200 text-amber-800 hover:bg-amber-50"
                            }`}
                          >
                            🥩 เฉพาะอาหารขายดี
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedSubCategory("DRINK")}
                            className={`rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap transition ${
                              selectedSubCategory === "DRINK"
                                ? "bg-amber-600 text-white shadow-xs font-black"
                                : "bg-white border border-amber-200 text-amber-800 hover:bg-amber-50"
                            }`}
                          >
                            🥤 เฉพาะเครื่องดื่มขายดี
                          </button>
                        </>
                      )}

                      {/* Food Sub-categories */}
                      {menuMainGroup === "FOOD" && (
                        <>
                          <button
                            type="button"
                            onClick={() => setSelectedSubCategory("ALL")}
                            className={`rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap transition ${
                              selectedSubCategory === "ALL"
                                ? "bg-[#12382e] text-white shadow-xs font-black"
                                : "bg-white border border-[#d8e3dc] text-[#527263] hover:bg-[#edf3ef]"
                            }`}
                          >
                            🍽️ อาหารทั้งหมด ({foodCount})
                          </button>
                          {foodCategories.map((cat) => {
                            const count = menu.filter((m) => m.categoryId === cat).length;
                            const icon = getCategoryIcon(cat);
                            const isSelected = selectedSubCategory === cat;
                            return (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => setSelectedSubCategory(cat)}
                                className={`rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                                  isSelected
                                    ? "bg-[#12382e] text-white shadow-xs font-black"
                                    : "bg-white border border-[#d8e3dc] text-[#527263] hover:bg-[#edf3ef]"
                                }`}
                              >
                                <span>{icon}</span>
                                <span>{cat}</span>
                                <span className={`text-[10px] ${isSelected ? "text-[#a3c9b7]" : "text-[#8ea599]"}`}>
                                  ({count})
                                </span>
                              </button>
                            );
                          })}
                        </>
                      )}

                      {/* Drink Sub-categories: Tea, Coffee, Soda, Smoothies, Milk/Cocoa, Water/Coke */}
                      {menuMainGroup === "DRINK" && (
                        <>
                          <button
                            type="button"
                            onClick={() => setSelectedSubCategory("ALL")}
                            className={`rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap transition ${
                              selectedSubCategory === "ALL"
                                ? "bg-[#0284c7] text-white shadow-xs font-black"
                                : "bg-white border border-sky-200 text-sky-800 hover:bg-sky-50"
                            }`}
                          >
                            🥤 เครื่องดื่มทั้งหมด ({drinkCount})
                          </button>
                          {drinkCategories.map((cat) => {
                            const count = menu.filter((m) => m.categoryId === cat).length;
                            const icon = getCategoryIcon(cat);
                            const isSelected = selectedSubCategory === cat;
                            return (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => setSelectedSubCategory(cat)}
                                className={`rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                                  isSelected
                                    ? "bg-[#0284c7] text-white shadow-xs font-black"
                                    : "bg-white border border-sky-200 text-sky-800 hover:bg-sky-50"
                                }`}
                              >
                                <span>{icon}</span>
                                <span>{cat}</span>
                                <span className={`text-[10px] ${isSelected ? "text-sky-100" : "text-sky-600"}`}>
                                  ({count})
                                </span>
                              </button>
                            );
                          })}
                        </>
                      )}

                      {/* All Menu Sub-categories */}
                      {menuMainGroup === "ALL" && (
                        <>
                          <button
                            type="button"
                            onClick={() => setSelectedSubCategory("ALL")}
                            className={`rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap transition ${
                              selectedSubCategory === "ALL"
                                ? "bg-[#2d3748] text-white shadow-xs font-black"
                                : "bg-white border border-[#d8e3dc] text-[#527263] hover:bg-[#edf3ef]"
                            }`}
                          >
                            📋 แสดงทุกหมวด ({menu.length})
                          </button>
                          {[...foodCategories, ...drinkCategories].map((cat) => {
                            const count = menu.filter((m) => m.categoryId === cat).length;
                            const icon = getCategoryIcon(cat);
                            const isSelected = selectedSubCategory === cat;
                            return (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => setSelectedSubCategory(cat)}
                                className={`rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                                  isSelected
                                    ? "bg-[#2d3748] text-white shadow-xs font-black"
                                    : "bg-white border border-[#d8e3dc] text-[#527263] hover:bg-[#edf3ef]"
                                }`}
                              >
                                <span>{icon}</span>
                                <span>{cat}</span>
                                <span className={`text-[10px] ${isSelected ? "text-neutral-300" : "text-[#8ea599]"}`}>
                                  ({count})
                                </span>
                              </button>
                            );
                          })}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Product Cards Grid */}
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 pb-20 lg:pb-4">
                    {filteredMenu.map((item) => {
                      const hasOptions = item.options && item.options.length > 0;
                      const rankNumber = top20RankMap.get(item.id);
                      const isTop20Badge = menuMainGroup === "TOP20" && rankNumber !== undefined;
                      return (
                        <button
                          key={item.id}
                          disabled={!item.available}
                          onClick={() => openProductOptions(item)}
                          className={`relative flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all group ${
                            item.available
                              ? "bg-white border-[#d8e3dc] hover:border-[#12382e] hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]"
                              : "bg-[#f1f3f1] border-[#e2e7e3] opacity-60 cursor-not-allowed"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {isTop20Badge && (
                                  <span className="shrink-0 rounded-md bg-amber-100 border border-amber-300 px-1.5 py-0.5 text-[10px] font-black text-amber-800">
                                    #{rankNumber}
                                  </span>
                                )}
                                <span className="text-[11px] font-bold text-[#719183] truncate">{item.categoryId}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                {hasOptions && (
                                  <span className="rounded-md bg-[#edf5f0] px-1.5 py-0.5 text-[10px] font-bold text-[#2e6d4c]">
                                    มีตัวเลือก
                                  </span>
                                )}
                                <span
                                  role="button"
                                  title="แก้ไขเมนู / ตั้งค่าตัวเลือก"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditProductModal(item);
                                  }}
                                  className="rounded-md p-1 hover:bg-[#edf3ef] text-[#719183] hover:text-[#12382e]"
                                >
                                  <Settings className="h-3.5 w-3.5" />
                                </span>
                              </div>
                            </div>
                            <h3 className="mt-1.5 font-black text-sm sm:text-base text-[#162a21] line-clamp-2 leading-snug">
                              {item.name}
                            </h3>
                            {item.imageUrl && (
                              <div className="mt-2 h-24 sm:h-28 w-full overflow-hidden rounded-xl bg-neutral-100 border border-neutral-100">
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                                />
                              </div>
                            )}
                          </div>

                          <div className="mt-3 flex items-end justify-between pt-2 border-t border-[#f0f4f1]">
                            <span className="text-base sm:text-lg font-black text-[#1b5e3f]">
                              {formatMoney(item.priceSatang)}
                            </span>
                            <div className="grid h-7 w-7 place-items-center rounded-xl bg-[#ddb259] text-[#12382e] font-black group-hover:scale-110 transition">
                              <Plus className="h-4 w-4" />
                            </div>
                          </div>

                          {!item.available && (
                            <div className="absolute inset-0 grid place-items-center rounded-2xl bg-white/70 backdrop-blur-[1px]">
                              <span className="rounded-lg bg-red-800 px-2 py-1 text-xs font-black text-white">
                                ของหมด
                              </span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right Desktop Cart Panel (>= lg) */}
                <aside className="hidden lg:flex w-80 flex-col border-l border-[#d8e3dc] bg-white p-3 shadow-sm">
                  <div className="flex items-center justify-between pb-3 border-b border-[#e5ede7]">
                    <div>
                      <h2 className="font-black text-lg text-[#12382e]">รายการที่สั่ง</h2>
                      <p className="text-xs text-[#6e8a7d]">
                        {orderType === "DINE_IN" ? (selectedTable ? selectedTable.name : "ยังไม่ระบุโต๊ะ") : orderType === "TAKEAWAY" ? "สั่งกลับบ้าน" : "เดลิเวอรี"}
                      </p>
                    </div>
                    {cart.length > 0 && (
                      <button
                        onClick={() => setCart([])}
                        className="rounded-lg px-2 py-1 text-xs font-bold text-[#a64835] hover:bg-[#fff0ed]"
                      >
                        ล้างตะกร้า
                      </button>
                    )}
                  </div>

                  {/* Cart items list */}
                  <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
                    {cart.length === 0 ? (
                      <div className="h-full grid place-items-center text-center p-6 text-[#8ea599]">
                        <div>
                          <Utensils className="mx-auto h-10 w-10 stroke-1 opacity-50 mb-2" />
                          <p className="font-bold text-sm">ยังไม่มีรายการในตะกร้า</p>
                          <p className="text-xs mt-1">แตะเมนูอาหารเพื่อเลือกสั่ง</p>
                        </div>
                      </div>
                    ) : (
                      cart.map((line, idx) => (
                        <div key={idx} className="rounded-xl border border-[#e5ede7] bg-[#f9fbf9] p-3 text-xs sm:text-sm">
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-black text-[#162a21]">{line.name}</span>
                            <span className="font-black text-[#1b5e3f] whitespace-nowrap">
                              {formatMoney(line.unitPriceSatang * line.quantity)}
                            </span>
                          </div>
                          {line.modifiers.length > 0 && (
                            <p className="text-[11px] text-[#5a786a] mt-0.5">
                              {line.modifiers.map((m) => `${m.name}${m.priceSatang ? ` (+${formatMoney(m.priceSatang)})` : ""}`).join(", ")}
                            </p>
                          )}
                          {line.note && <p className="text-[11px] text-[#9c5921] italic mt-0.5">หมายเหตุ: {line.note}</p>}
                          <div className="mt-2 flex items-center justify-between pt-2 border-t border-[#edf2ee]">
                            <span className="text-[11px] text-[#719183]">{formatMoney(line.unitPriceSatang)} / จาน</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateCartQty(idx, -1)}
                                className="grid h-7 w-7 place-items-center rounded-lg bg-white border border-[#d2dfd6] text-sm font-black active:scale-95"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-5 text-center font-black">{line.quantity}</span>
                              <button
                                onClick={() => updateCartQty(idx, 1)}
                                className="grid h-7 w-7 place-items-center rounded-lg bg-[#ddb259] text-[#12382e] text-sm font-black active:scale-95"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Discount Section */}
                  <div className="border-t border-[#e5ede7] pt-2.5 pb-1">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setDiscountDrawerOpen(!discountDrawerOpen)}
                        className="flex items-center gap-1.5 text-xs font-black text-[#12382e] hover:text-[#23604e]"
                      >
                        <Tag className="h-3.5 w-3.5 text-[#ddb259]" />
                        <span>ส่วนลด (Discount)</span>
                        <span className="text-[10px] text-[#719183]">
                          {discountDrawerOpen ? "▲ ซ่อน" : "▼ ใส่ส่วนลด"}
                        </span>
                      </button>
                      {cartDiscountSatang > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="rounded-lg bg-[#e6f4ea] px-2 py-0.5 text-xs font-black text-[#1b5e3f]">
                            -{formatMoney(cartDiscountSatang)}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setDiscountValue(0);
                              setDiscountCustomInput("");
                            }}
                            className="text-[11px] text-red-500 hover:text-red-700 font-bold px-1"
                            title="ยกเลิกส่วนลด"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>

                    {discountDrawerOpen && (
                      <div className="mt-2 rounded-xl bg-[#f4f7f5] p-2.5 border border-[#d8e3dc] space-y-2 text-xs">
                        {/* Type toggle: Percent vs Baht */}
                        <div className="grid grid-cols-2 gap-1 p-0.5 bg-[#e2ebe5] rounded-lg">
                          <button
                            type="button"
                            onClick={() => {
                              setDiscountType("percent");
                              setDiscountValue(0);
                              setDiscountCustomInput("");
                            }}
                            className={`py-1 text-center font-black rounded-md transition ${
                              discountType === "percent" ? "bg-white text-[#12382e] shadow-sm" : "text-[#5b7a6c]"
                            }`}
                          >
                            % เปอร์เซ็นต์
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDiscountType("baht");
                              setDiscountValue(0);
                              setDiscountCustomInput("");
                            }}
                            className={`py-1 text-center font-black rounded-md transition ${
                              discountType === "baht" ? "bg-white text-[#12382e] shadow-sm" : "text-[#5b7a6c]"
                            }`}
                          >
                            ฿ บาท (จำนวนเงิน)
                          </button>
                        </div>

                        {/* Quick options */}
                        {discountType === "percent" ? (
                          <div className="space-y-1.5">
                            <div className="grid grid-cols-4 gap-1">
                              {[5, 10, 15, 20].map((pct) => (
                                <button
                                  key={pct}
                                  type="button"
                                  onClick={() => {
                                    setDiscountValue(pct);
                                    setDiscountCustomInput(String(pct));
                                  }}
                                  className={`rounded-lg py-1 font-black text-xs transition ${
                                    discountValue === pct
                                      ? "bg-[#12382e] text-[#ddb259]"
                                      : "bg-white border border-[#d2dfd6] text-[#12382e] hover:bg-[#ddb259]"
                                  }`}
                                >
                                  {pct}%
                                </button>
                              ))}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-[#6e8a7d] whitespace-nowrap">ระบุเอง:</span>
                              <div className="flex-1 flex items-center rounded-lg border border-[#d8e3dc] bg-white px-2 py-1">
                                <input
                                  type="number"
                                  placeholder="เช่น 25"
                                  value={discountCustomInput}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setDiscountCustomInput(val);
                                    const num = parseFloat(val);
                                    setDiscountValue(isNaN(num) ? 0 : num);
                                  }}
                                  className="w-full bg-transparent font-bold outline-none text-xs"
                                />
                                <span className="text-[11px] font-black text-[#6e8a7d]">%</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="grid grid-cols-4 gap-1">
                              {[20, 50, 100, 200].map((bht) => (
                                <button
                                  key={bht}
                                  type="button"
                                  onClick={() => {
                                    setDiscountValue(bht);
                                    setDiscountCustomInput(String(bht));
                                  }}
                                  className={`rounded-lg py-1 font-black text-xs transition ${
                                    discountValue === bht
                                      ? "bg-[#12382e] text-[#ddb259]"
                                      : "bg-white border border-[#d2dfd6] text-[#12382e] hover:bg-[#ddb259]"
                                  }`}
                                >
                                  {bht}฿
                                </button>
                              ))}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-[#6e8a7d] whitespace-nowrap">ระบุเอง:</span>
                              <div className="flex-1 flex items-center rounded-lg border border-[#d8e3dc] bg-white px-2 py-1">
                                <span className="text-[11px] font-black text-[#6e8a7d] mr-1">฿</span>
                                <input
                                  type="number"
                                  placeholder="เช่น 80"
                                  value={discountCustomInput}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setDiscountCustomInput(val);
                                    const num = parseFloat(val);
                                    setDiscountValue(isNaN(num) ? 0 : num);
                                  }}
                                  className="w-full bg-transparent font-bold outline-none text-xs"
                                />
                               </div>
                             </div>
                           </div>
                         )}
                         <button type="button" onClick={() => setDiscountDrawerOpen(false)} className="w-full rounded-lg bg-[#12382e] py-1.5 text-xs font-black text-white">
                           ✓ ใช้ส่วนลด
                         </button>
                       </div>
                    )}
                  </div>

                  {/* Cart Footer */}
                  <div className="border-t border-[#e5ede7] pt-3 space-y-2">
                    <div className="flex justify-between text-xs text-[#6e8a7d]">
                      <span>รวมรายการ ({cart.reduce((s, i) => s + i.quantity, 0)} ชิ้น)</span>
                      <span>{formatMoney(cartSubtotal)}</span>
                    </div>
                    {cartDiscountSatang > 0 && (
                      <div className="flex justify-between text-xs font-bold text-[#1b5e3f]">
                        <span>ส่วนลด ({discountType === "percent" ? `${discountValue}%` : `${discountValue}฿`})</span>
                        <span>-{formatMoney(cartDiscountSatang)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs text-[#6e8a7d]">
                      <button type="button" onClick={() => setVatEnabled((enabled) => !enabled)} className="font-bold hover:text-[#12382e]">
                        VAT 7% ({vatEnabled ? "เปิด" : "ปิด"})
                      </button>
                      <span>{formatMoney(cartVat)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-black text-[#12382e] pt-1 border-t border-dashed border-[#e5ede7]">
                      <span>ยอดสุทธิ</span>
                      <span className="text-xl text-[#1b5e3f]">{formatMoney(cartTotal)}</span>
                    </div>

                    {orderType === "DINE_IN" && selectedTable && cart.length > 0 && (
                      <button
                        type="button"
                        onClick={holdCurrentBill}
                        className="w-full rounded-xl border border-[#ddb259] bg-[#fff8e8] py-2.5 text-xs font-black text-[#7f5a18] hover:bg-[#fff0c9]"
                      >
                        พักบิลโต๊ะ {selectedTable.name} แล้วไปโต๊ะอื่น
                      </button>
                    )}

                    <button
                      disabled={cart.length === 0}
                      onClick={openPaymentModal}
                      className="mt-2 w-full rounded-2xl bg-[#ddb259] py-3.5 text-center font-black text-[#12382e] shadow-lg shadow-[#ddb259]/30 transition hover:bg-[#ebd08e] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      ชำระเงิน · {formatMoney(cartTotal)}
                    </button>
                  </div>
                </aside>
              </div>
            )}

            {/* TAB: Tables Floor Plan */}
            {tab === "tables" && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#d8e3dc] pb-4">
                  <div>
                    <h1 className="text-2xl font-black text-[#12382e]">ผังโต๊ะอาหาร</h1>
                    <p className="text-xs sm:text-sm text-[#678578]">ตรวจสถานะโต๊ะ บิลค้างชำระ และ QR สั่งอาหารประจำโต๊ะ</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={refreshAll}
                      className="rounded-xl border border-[#d8e3dc] bg-white px-3 py-2 text-xs font-bold text-[#12382e] hover:bg-[#edf3ef]"
                    >
                      รีเฟรช
                    </button>
                  </div>
                </div>

                {/* Table cards grid */}
                <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {tables.map((table) => {
                    const isOccupied = table.status === "OCCUPIED";
                    const hasHeldBill = Boolean(heldBills[table.id]);
                    return (
                      <div
                        key={table.id}
                        className={`rounded-2xl border p-4 flex flex-col justify-between transition-all ${
                          isOccupied
                            ? "bg-[#fffaf5] border-[#f4cbb0] shadow-md"
                            : "bg-white border-[#d8e3dc] hover:border-[#12382e]"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span
                              className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-black ${
                                hasHeldBill ? "bg-[#9b6b20] text-white" : isOccupied ? "bg-[#f59e0b] text-white" : "bg-[#2e6d4c] text-white"
                              }`}
                            >
                              {hasHeldBill ? "พักบิล" : isOccupied ? "มีลูกค้า" : "ว่าง"}
                            </span>
                            <h3 className="mt-2 text-lg sm:text-xl font-black text-[#12382e]">{table.name}</h3>
                          </div>
                          <button
                            onClick={() => openTableQr(table)}
                            title="เปิด QR ประจำโต๊ะ"
                            className="rounded-xl bg-[#edf3ef] p-2 text-[#12382e] hover:bg-[#ddb259]"
                          >
                            <QrCode className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="mt-4 pt-3 border-t border-[#f0f4f1]">
                          {isOccupied ? (
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between font-bold text-[#6a8779]">
                                <span>ออเดอร์ค้าง:</span>
                                <span>{table.openOrders} รายการ</span>
                              </div>
                              <div className="flex justify-between font-black text-[#1b5e3f] text-sm">
                                <span>ยอดรวม:</span>
                                <span>{formatMoney(table.openTotalSatang)}</span>
                              </div>
                              {table.readyOrders > 0 && (
                                <p className="text-[11px] font-bold text-[#2e6d4c] animate-pulse">
                                  ● มีอาหารพร้อมเสิร์ฟ ({table.readyOrders})
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-[#8ea599]">พร้อมรับลูกค้าใหม่</p>
                          )}

                          <button
                            onClick={() => selectTableForOrder(table)}
                            className={`mt-3 w-full rounded-xl py-2 text-xs font-black transition ${
                              isOccupied
                                ? "bg-[#12382e] text-white hover:bg-[#1b483c]"
                                : "bg-[#edf3ef] text-[#12382e] hover:bg-[#ddb259]"
                            }`}
                          >
                            {hasHeldBill ? "เรียกบิลที่พัก" : isOccupied ? "สั่งเพิ่ม / ดูบิล" : "เปิดโต๊ะสั่งอาหาร"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB: Kitchen Display System (KDS) */}
            {tab === "kitchen" && (
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden p-4 sm:p-6">
                <div className="flex items-center justify-between border-b border-[#d8e3dc] pb-4">
                  <div>
                    <h1 className="text-2xl font-black text-[#12382e]">ระบบจอส่งครัว (KDS)</h1>
                    <p className="text-xs sm:text-sm text-[#678578]">
                      จัดการสถานะอาหารตามลำดับการปรุง (ออเดอร์ใหม่ → กำลังทำ → พร้อมเสิร์ฟ)
                    </p>
                  </div>
                  <button
                    onClick={loadOrders}
                    className="rounded-xl border border-[#d8e3dc] bg-white px-3 py-1.5 text-xs font-bold text-[#12382e] hover:bg-[#edf3ef]"
                  >
                    รีเฟรชออเดอร์
                  </button>
                </div>

                {/* Kanban columns */}
                <div className="mt-4 flex-1 overflow-x-auto grid grid-cols-1 md:grid-cols-3 gap-4 pb-2">
                  {/* Column 1: NEW */}
                  <div className="flex flex-col rounded-2xl bg-[#edf3ef] p-3.5 border border-[#d2dfd6] min-w-[280px]">
                    <div className="flex items-center justify-between font-black text-sm text-[#1b483c] pb-2 border-b border-[#d8e3dc]">
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" />
                        1. ออเดอร์เข้าใหม่
                      </span>
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs text-[#12382e]">
                        {orders.filter((o) => o.kitchenStatus === "NEW" && o.status !== "CANCELLED").length}
                      </span>
                    </div>

                    <div className="mt-3 flex-1 overflow-y-auto space-y-3">
                      {orders
                        .filter((o) => o.kitchenStatus === "NEW" && o.status !== "CANCELLED")
                        .map((order) => (
                          <div key={order.id} className="rounded-xl bg-white p-3.5 border border-[#cadad0] shadow-sm text-xs">
                            <div className="flex items-start justify-between">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {order.orderType === "TAKEAWAY" ? (
                                  <span className="rounded-md bg-[#b45309] px-2 py-0.5 text-[11px] font-black text-white">
                                    {order.queueNumber ? `คิว #${order.queueNumber}` : (order.tableName || "กลับบ้าน")}
                                  </span>
                                ) : order.orderType === "DELIVERY" ? (
                                  <span className="rounded-md bg-[#1d4ed8] px-2 py-0.5 text-[11px] font-black text-white">
                                    {order.deliveryPlatform ? `[${order.deliveryPlatform}] ${order.deliveryOrderId || ""}` : (order.tableName || "เดลิเวอรี")}
                                  </span>
                                ) : (
                                  <span className="rounded-md bg-[#12382e] px-2 py-0.5 text-[11px] font-black text-white">
                                    {order.tableName || "ทานที่ร้าน"}
                                  </span>
                                )}
                                {order.customerName && (
                                  <span className="text-[11px] text-[#446755] font-bold">
                                    ({order.customerName})
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-[#719183]">
                                {new Date(order.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>

                            <ul className="mt-2.5 space-y-1.5 border-t border-[#f0f4f1] pt-2">
                              {order.lines.map((l, i) => (
                                <li key={i} className="flex justify-between font-bold text-[#162a21]">
                                  <span>
                                    {l.name}
                                    {l.modifiers?.length ? (
                                      <span className="block text-[10px] text-[#507362] font-normal">
                                        ({l.modifiers.map((m) => m.name).join(", ")})
                                      </span>
                                    ) : null}
                                    {l.note && <span className="block text-[10px] text-[#a04e22] font-normal italic">*{l.note}</span>}
                                  </span>
                                  <span className="text-[#1b5e3f] font-black">x{l.quantity}</span>
                                </li>
                              ))}
                            </ul>

                            <button
                              onClick={() => advanceKitchen(order.id, "COOKING")}
                              className="mt-3 w-full rounded-xl bg-[#ddb259] py-2 text-center text-xs font-black text-[#12382e] active:scale-95"
                            >
                              เริ่มปรุงอาหาร →
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Column 2: COOKING */}
                  <div className="flex flex-col rounded-2xl bg-[#fff8ef] p-3.5 border border-[#fae2c6] min-w-[280px]">
                    <div className="flex items-center justify-between font-black text-sm text-[#9c5921] pb-2 border-b border-[#f4d1ad]">
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                        2. กำลังปรุง
                      </span>
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs text-[#9c5921]">
                        {orders.filter((o) => o.kitchenStatus === "COOKING" && o.status !== "CANCELLED").length}
                      </span>
                    </div>

                    <div className="mt-3 flex-1 overflow-y-auto space-y-3">
                      {orders
                        .filter((o) => o.kitchenStatus === "COOKING" && o.status !== "CANCELLED")
                        .map((order) => (
                          <div key={order.id} className="rounded-xl bg-white p-3.5 border border-[#fae2c6] shadow-sm text-xs">
                            <div className="flex items-start justify-between">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {order.orderType === "TAKEAWAY" ? (
                                  <span className="rounded-md bg-[#b45309] px-2 py-0.5 text-[11px] font-black text-white">
                                    {order.queueNumber ? `คิว #${order.queueNumber}` : (order.tableName || "กลับบ้าน")}
                                  </span>
                                ) : order.orderType === "DELIVERY" ? (
                                  <span className="rounded-md bg-[#1d4ed8] px-2 py-0.5 text-[11px] font-black text-white">
                                    {order.deliveryPlatform ? `[${order.deliveryPlatform}] ${order.deliveryOrderId || ""}` : (order.tableName || "เดลิเวอรี")}
                                  </span>
                                ) : (
                                  <span className="rounded-md bg-[#9c5921] px-2 py-0.5 text-[11px] font-black text-white">
                                    {order.tableName || "ทานที่ร้าน"}
                                  </span>
                                )}
                                {order.customerName && (
                                  <span className="text-[11px] text-[#9c5921] font-bold">
                                    ({order.customerName})
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-[#9c5921] font-bold">กำลังทำ</span>
                            </div>

                            <ul className="mt-2.5 space-y-1.5 border-t border-[#f0f4f1] pt-2">
                              {order.lines.map((l, i) => (
                                <li key={i} className="flex justify-between font-bold text-[#162a21]">
                                  <span>
                                    {l.name}
                                    {l.modifiers?.length ? (
                                      <span className="block text-[10px] text-[#507362] font-normal">
                                        ({l.modifiers.map((m) => m.name).join(", ")})
                                      </span>
                                    ) : null}
                                  </span>
                                  <span className="text-[#1b5e3f] font-black">x{l.quantity}</span>
                                </li>
                              ))}
                            </ul>

                            <button
                              onClick={() => advanceKitchen(order.id, "READY")}
                              className="mt-3 w-full rounded-xl bg-[#2e6d4c] py-2 text-center text-xs font-black text-white active:scale-95"
                            >
                              ปรุงเสร็จแล้ว พร้อมเสิร์ฟ ✓
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Column 3: READY */}
                  <div className="flex flex-col rounded-2xl bg-[#edf9f0] p-3.5 border border-[#cbe8d2] min-w-[280px]">
                    <div className="flex items-center justify-between font-black text-sm text-[#1f663c] pb-2 border-b border-[#b7dfbf]">
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        3. พร้อมเสิร์ฟ
                      </span>
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs text-[#1f663c]">
                        {orders.filter((o) => o.kitchenStatus === "READY" && o.status !== "CANCELLED").length}
                      </span>
                    </div>

                    <div className="mt-3 flex-1 overflow-y-auto space-y-3">
                      {orders
                        .filter((o) => o.kitchenStatus === "READY" && o.status !== "CANCELLED")
                        .map((order) => (
                          <div key={order.id} className="rounded-xl bg-white p-3.5 border border-[#b7dfbf] shadow-sm text-xs">
                            <div className="flex items-start justify-between">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {order.orderType === "TAKEAWAY" ? (
                                   <span className="rounded-md bg-[#b45309] px-2 py-0.5 text-[11px] font-black text-white">
                                     {order.queueNumber ? `คิว #${order.queueNumber}` : (order.tableName || "กลับบ้าน")}
                                   </span>
                                ) : order.orderType === "DELIVERY" ? (
                                   <span className="rounded-md bg-[#1d4ed8] px-2 py-0.5 text-[11px] font-black text-white">
                                     {order.deliveryPlatform ? `[${order.deliveryPlatform}] ${order.deliveryOrderId || ""}` : (order.tableName || "เดลิเวอรี")}
                                   </span>
                                ) : (
                                   <span className="rounded-md bg-[#2e6d4c] px-2 py-0.5 text-[11px] font-black text-white">
                                     {order.tableName || "ทานที่ร้าน"}
                                   </span>
                                )}
                                {order.customerName && (
                                  <span className="text-[11px] text-[#2e6d4c] font-bold">
                                    ({order.customerName})
                                  </span>
                                )}
                              </div>
                              <span className="rounded-full bg-[#e8f6ec] px-2 py-0.5 text-[10px] font-bold text-[#1f663c]">
                                พร้อมส่งแล้ว
                              </span>
                            </div>

                            <ul className="mt-2.5 space-y-1 border-t border-[#f0f4f1] pt-2">
                              {order.lines.map((l, i) => (
                                <li key={i} className="flex justify-between font-bold text-[#162a21]">
                                  <span>{l.name}</span>
                                  <span>x{l.quantity}</span>
                                </li>
                              ))}
                            </ul>

                            <button
                              onClick={() => advanceKitchen(order.id, "SERVED")}
                              className="mt-3 w-full rounded-xl bg-[#edf3ef] hover:bg-[#d8e6dc] py-2 text-center text-xs font-black text-[#12382e]"
                            >
                              เสิร์ฟแล้วเรียบร้อย ✓
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Menu Management */}
            {tab === "menu" && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                {/* Header with Sub-tab Switcher */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#d8e3dc] pb-4">
                  <div>
                    <h1 className="text-2xl font-black text-[#12382e]">จัดการเมนู & ตัวเลือกอาหาร</h1>
                    <p className="text-xs sm:text-sm text-[#678578]">
                      จัดการรายการอาหาร และตั้งค่ากลุ่มตัวเลือก/ท็อปปิ้งล่วงหน้าเพื่อนำไปใช้ซ้ำได้ง่าย
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {menuSubTab === "products" ? (
                      <button
                        onClick={openCreateProductModal}
                        className="flex items-center gap-2 rounded-2xl bg-[#12382e] px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-[#1b483c] transition active:scale-95"
                      >
                        <Plus className="h-4 w-4 text-[#ddb259]" />
                        <span>+ เพิ่มเมนูใหม่</span>
                      </button>
                    ) : (
                      <button
                        onClick={openCreateLibraryGroupModal}
                        className="flex items-center gap-2 rounded-2xl bg-[#12382e] px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-[#1b483c] transition active:scale-95"
                      >
                        <Plus className="h-4 w-4 text-[#ddb259]" />
                        <span>+ สร้างกลุ่มตัวเลือกใหม่</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub-tab Pills */}
                <div className="mt-4 flex rounded-2xl bg-[#edf3ef] p-1 gap-1 max-w-md">
                  <button
                    type="button"
                    onClick={() => setMenuSubTab("products")}
                    className={`flex-1 rounded-xl py-2 px-3 text-xs sm:text-sm font-black transition ${
                      menuSubTab === "products"
                        ? "bg-[#12382e] text-white shadow-sm"
                        : "text-[#547365] hover:text-[#12382e]"
                    }`}
                  >
                    📋 รายการเมนู ({menu.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMenuSubTab("option_groups")}
                    className={`flex-1 rounded-xl py-2 px-3 text-xs sm:text-sm font-black transition ${
                      menuSubTab === "option_groups"
                        ? "bg-[#12382e] text-white shadow-sm"
                        : "text-[#547365] hover:text-[#12382e]"
                    }`}
                  >
                    ⚙️ คลังตัวเลือก & ท็อปปิ้ง ({optionGroups.length})
                  </button>
                </div>

                {/* VIEW 1: PRODUCTS TABLE */}
                {menuSubTab === "products" && (
                  <div className="mt-6 rounded-2xl border border-[#d8e3dc] bg-white overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs sm:text-sm">
                        <thead className="bg-[#edf3ef] text-[#4d6d5e] uppercase text-[11px] font-black">
                          <tr>
                            <th className="py-3 px-4">ชื่อเมนู</th>
                            <th className="py-3 px-4">หมวดหมู่</th>
                            <th className="py-3 px-4">ราคาขาย</th>
                            <th className="py-3 px-4">ตัวเลือก / ท็อปปิ้ง</th>
                            <th className="py-3 px-4 text-center">สถานะ</th>
                            <th className="py-3 px-4 text-center">จัดการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#edf2ee]">
                          {menu.map((product) => (
                            <tr key={product.id} className="hover:bg-[#f9fbf9]">
                              <td className="py-3 px-4 font-black text-[#162a21]">
                                <p>{product.name}</p>
                                <span className="text-[10px] text-[#719183] font-normal">{product.sku}</span>
                              </td>
                              <td className="py-3 px-4 text-[#527263]">{product.categoryId}</td>
                              <td className="py-3 px-4 font-black text-[#1b5e3f]">{formatMoney(product.priceSatang)}</td>
                              <td className="py-3 px-4 text-xs text-[#527263]">
                                {product.options?.length ? (
                                  <div className="flex flex-wrap gap-1">
                                    {product.options.map((o) => (
                                      <span key={o.id || o.name} className="rounded-md bg-[#edf5f0] px-2 py-0.5 text-[10px] font-bold text-[#2e6d4c]">
                                        {o.name}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-neutral-400">ไม่มีตัวเลือก</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <button
                                  onClick={() => toggleAvailable(product)}
                                  className={`rounded-xl px-3 py-1 text-xs font-black transition ${
                                    product.available
                                      ? "bg-[#e8f6ec] text-[#246b45] hover:bg-[#d5eedc]"
                                      : "bg-red-100 text-red-700 hover:bg-red-200"
                                  }`}
                                >
                                  {product.available ? "พร้อมขาย" : "ของหมด"}
                                </button>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <button
                                  onClick={() => openEditProductModal(product)}
                                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#12382e] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1b483c] transition shadow-sm active:scale-95"
                                >
                                  <Settings className="h-3.5 w-3.5 text-[#ddb259]" />
                                  <span>แก้ไข & ตัวเลือก</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* VIEW 2: OPTION GROUPS LIBRARY */}
                {menuSubTab === "option_groups" && (
                  <div className="mt-6 space-y-4">
                    <div className="rounded-2xl border border-emerald-100 bg-[#edf9f0] p-4 text-xs text-[#1e5836]">
                      <p className="font-bold text-sm">💡 วิธีใช้งานคลังตัวเลือก & ท็อปปิ้ง:</p>
                      <p className="mt-1">
                        สร้างกลุ่มตัวเลือกไว้ที่นี่ครั้งเดียว เช่น <em>ระดับความเผ็ด</em>, <em>ท็อปปิ้งไข่/ข้าว</em>, <em>ความหวาน</em>, <em>ขนาดแก้ว</em>, <em>ชนิดเส้น</em> เมื่อไปเพิ่มหรือแก้ไขอาหาร แค่แตะติ๊กเลือกว่าจะผูกกับตัวเลือกไหน ไม่ต้องพิมพ์ใหม่ทุกรอบ!
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {optionGroups.map((group) => {
                        const linkedCount = menu.filter((m) =>
                          m.options?.some((o) => o.id === group.id || o.name === group.name)
                        ).length;
                        return (
                          <div
                            key={group.id}
                            className="flex flex-col justify-between rounded-2xl border border-[#d8e3dc] bg-white p-4 shadow-sm hover:border-[#12382e] transition"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h3 className="font-black text-base text-[#12382e]">{group.name}</h3>
                                  <div className="mt-1 flex flex-wrap gap-1.5">
                                    <span
                                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                        group.required
                                          ? "bg-amber-100 text-amber-800"
                                          : "bg-neutral-100 text-neutral-600"
                                      }`}
                                    >
                                      {group.required ? "บังคับเลือก 1 อย่าง" : "ไม่บังคับ"}
                                    </span>
                                    <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                                      {group.multi ? "เลือกได้หลายช้อยส์" : "เลือกได้ช้อยส์เดียว"}
                                    </span>
                                  </div>
                                </div>
                                <span className="rounded-full bg-[#edf3ef] px-2.5 py-1 text-[11px] font-bold text-[#436454]">
                                  ผูกกับ {linkedCount} เมนู
                                </span>
                              </div>

                              <div className="mt-4 space-y-1.5">
                                <label className="text-[11px] font-bold text-[#719183]">รายการช้อยส์ในกลุ่ม:</label>
                                <div className="flex flex-wrap gap-1.5">
                                  {group.choices.map((c) => (
                                    <span
                                      key={c.name}
                                      className="rounded-xl border border-[#d8e3dc] bg-[#f9fbf9] px-2.5 py-1 text-xs font-bold text-[#162a21]"
                                    >
                                      {c.name}
                                      {c.priceSatang > 0 && (
                                        <strong className="ml-1 text-[#1b5e3f]">+{c.priceSatang / 100}฿</strong>
                                      )}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-[#f0f4f1]">
                              <button
                                type="button"
                                onClick={() => openEditLibraryGroupModal(group)}
                                className="flex items-center gap-1 rounded-xl bg-[#12382e] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1b483c] transition shadow-xs"
                              >
                                <Edit3 className="h-3 w-3 text-[#ddb259]" />
                                <span>แก้ไข</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteLibraryGroup(group.id, group.name)}
                                className="flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 transition"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>ลบ</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: Shifts Management */}
            {tab === "shifts" && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#d8e3dc] pb-4">
                  <div>
                    <h1 className="text-2xl font-black text-[#12382e]">จัดการกะ & ตรวจนับเงินสด</h1>
                    <p className="text-xs sm:text-sm text-[#678578]">ควบคุมเงินทอน ยอดขายเงินสด และกระทบยอดปิดกะ</p>
                  </div>
                  <div>
                    {currentShift ? (
                      <button
                        onClick={() => {
                          setCountedCashInput(satangToBaht(currentShift.expectedCashSatang));
                          setCloseShiftModal(true);
                        }}
                        className="rounded-2xl bg-red-700 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow hover:bg-red-800"
                      >
                        ปิดกะ & นับเงินสด
                      </button>
                    ) : (
                      <button
                        onClick={() => setOpenShiftModal(true)}
                        className="rounded-2xl bg-[#ddb259] px-4 py-2.5 text-xs sm:text-sm font-bold text-[#12382e] shadow hover:bg-[#e6c475]"
                      >
                        + เปิดกะใหม่
                      </button>
                    )}
                  </div>
                </div>

                {/* Current Active Shift Card */}
                {currentShift && (
                  <div className="mt-6 rounded-2xl border border-[#b4dfbf] bg-[#eaf6ed] p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="rounded-lg bg-[#2e6d4c] px-2.5 py-1 text-xs font-black text-white">
                        กะปัจจุบันกำลังเปิด
                      </span>
                      <span className="text-xs text-[#527263]">
                        เปิดเมื่อ: {new Date(currentShift.openedAt).toLocaleString("th-TH")}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="rounded-xl bg-white p-4 border border-[#cbe5d2]">
                        <p className="text-xs text-[#6e8a7d]">เงินทอนตั้งต้น (Opening Float)</p>
                        <p className="text-xl font-black text-[#12382e] mt-1">
                          {formatMoney(currentShift.openingFloatSatang)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white p-4 border border-[#cbe5d2]">
                        <p className="text-xs text-[#6e8a7d]">ยอดขายเงินสด (Cash Sales)</p>
                        <p className="text-xl font-black text-[#1b5e3f] mt-1">
                          {formatMoney(currentShift.cashSalesSatang)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white p-4 border border-[#cbe5d2]">
                        <p className="text-xs text-[#6e8a7d]">เงินสดที่ควรมีในลิ้นชัก (Expected)</p>
                        <p className="text-xl font-black text-[#12382e] mt-1">
                          {formatMoney(currentShift.expectedCashSatang)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Shift History Table */}
                <div className="mt-6">
                  <h3 className="text-lg font-black text-[#12382e] mb-3">ประวัติกะย้อนหลัง</h3>
                  <div className="rounded-2xl border border-[#d8e3dc] bg-white overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="bg-[#edf3ef] text-[#4d6d5e] uppercase text-[11px] font-black">
                        <tr>
                          <th className="py-3 px-4">เวลาเปิดกะ</th>
                          <th className="py-3 px-4">เวลาปิดกะ</th>
                          <th className="py-3 px-4">เงินทอน</th>
                          <th className="py-3 px-4">เงินสดที่ควรมี</th>
                          <th className="py-3 px-4">เงินที่นับได้</th>
                          <th className="py-3 px-4">ผลต่าง (Variance)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#edf2ee]">
                        {shifts.map((s) => (
                          <tr key={s.id} className="hover:bg-[#f9fbf9]">
                            <td className="py-3 px-4 font-bold">{new Date(s.openedAt).toLocaleString("th-TH")}</td>
                            <td className="py-3 px-4 text-[#6e8a7d]">
                              {s.closedAt ? new Date(s.closedAt).toLocaleString("th-TH") : "ยังไม่ปิด"}
                            </td>
                            <td className="py-3 px-4">{formatMoney(s.openingFloatSatang)}</td>
                            <td className="py-3 px-4 font-bold">{formatMoney(s.expectedCashSatang)}</td>
                            <td className="py-3 px-4 font-bold">
                              {s.countedCashSatang !== undefined ? formatMoney(s.countedCashSatang) : "—"}
                            </td>
                            <td className="py-3 px-4 font-black">
                              {s.varianceSatang !== undefined ? (
                                <span
                                  className={
                                    s.varianceSatang === 0
                                      ? "text-[#2e6d4c]"
                                      : s.varianceSatang > 0
                                      ? "text-blue-600"
                                      : "text-red-600"
                                  }
                                >
                                  {s.varianceSatang > 0 ? "+" : ""}
                                  {formatMoney(s.varianceSatang)}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Sales Dashboard & Reports */}
            {tab === "settings" && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                <div className="mx-auto max-w-3xl">
                  <h1 className="text-2xl font-black text-[#12382e]">ตั้งค่าอุปกรณ์</h1>
                  <p className="mt-1 text-sm text-[#6e8a7d]">กำหนดเครื่องพิมพ์แยกเคาน์เตอร์ ครัว และบาร์สำหรับเครื่องนี้</p>
                  <button type="button" onClick={() => (window as Window & { FillingNative?: { openPrinterPairing?: () => void } }).FillingNative?.openPrinterPairing?.()} className="mt-4 rounded-xl bg-[#12382e] px-4 py-2 text-sm font-black text-white">
                    🔗 จับคู่เครื่องพิมพ์ Bluetooth จากเครื่องนี้
                  </button>
                  <div className="mt-6 grid gap-4 rounded-3xl border border-[#d8e3dc] bg-white p-5 shadow-sm">
                    {([['counterMac', 'เครื่องพิมพ์เคาน์เตอร์', 'MAC address เครื่องพิมพ์ใบเสร็จ', 'counter'], ['kitchenMac', 'เครื่องพิมพ์ครัว', 'MAC address เครื่องพิมพ์ใบออเดอร์อาหาร', 'kitchen'], ['barMac', 'เครื่องพิมพ์บาร์น้ำ', 'MAC address เครื่องพิมพ์เครื่องดื่ม', 'bar']] as const).map(([key, label, hint, station]) => (
                      <div key={key} className="block">
                        <span className="text-sm font-black text-[#446354]">{label}</span>
                        <span className="mb-1 block text-xs text-[#9aae9f]">{hint}</span>
                        <div className="flex gap-2">
                          <input value={printerSettings[key]} onChange={(e) => setPrinterSettings((current) => ({ ...current, [key]: e.target.value }))} placeholder="เช่น AA:BB:CC:DD:EE:FF" className="min-w-0 flex-1 rounded-xl border border-[#d8e3dc] px-3 py-2 text-sm outline-none focus:border-[#12382e]" />
                          <button type="button" onClick={() => (window as Window & { FillingNative?: { openPrinterPairing?: (station?: string) => void } }).FillingNative?.openPrinterPairing?.(station)} className="shrink-0 rounded-xl bg-[#12382e] px-3 py-2 text-xs font-black text-white">จับคู่</button>
                        </div>
                      </div>
                    ))}
                    <div className="flex flex-wrap items-center gap-3 border-t border-[#e5ede7] pt-4">
                      <span className="text-sm font-black text-[#446354]">ขนาดกระดาษ</span>
                      {(["58", "80"] as const).map((width) => <button key={width} type="button" onClick={() => setPrinterSettings((current) => ({ ...current, paperWidth: width }))} className={`rounded-xl px-4 py-2 text-sm font-black ${printerSettings.paperWidth === width ? "bg-[#12382e] text-white" : "bg-[#edf3ef] text-[#507061]"}`}>{width} mm</button>)}
                      <button type="button" onClick={() => setPrinterSettings((current) => ({ ...current, drawerEnabled: !current.drawerEnabled }))} className={`rounded-xl px-4 py-2 text-sm font-black ${printerSettings.drawerEnabled ? "bg-[#ddb259] text-[#12382e]" : "bg-[#edf3ef] text-[#507061]"}`}>ลิ้นชักเงิน: {printerSettings.drawerEnabled ? "เปิด" : "ปิด"}</button>
                    </div>
                    <p className="text-xs text-[#719183]">ค่าจะจำไว้ในเครื่องนี้ การพิมพ์ Bluetooth จริงต้องใช้ native adapter ของ Android/Sunmi และจับคู่เครื่องพิมพ์ก่อน</p>
                  </div>
                </div>
              </div>
            )}

            {tab === "reports" && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#d8e3dc] pb-4">
                  <div>
                    <h1 className="text-2xl font-black text-[#12382e]">สรุปยอดขายประจำวัน</h1>
                    <p className="text-xs sm:text-sm text-[#678578]">ภาพรวมยอดขาย ช่องทางชำระเงิน และเมนูขายดี</p>
                  </div>
                  <button
                    onClick={loadReport}
                    className="rounded-xl border border-[#d8e3dc] bg-white px-3 py-1.5 text-xs font-bold text-[#12382e] hover:bg-[#edf3ef]"
                  >
                    รีเฟรชรายงาน
                  </button>
                </div>

                {report && (
                  <div className="mt-6 space-y-6">
                    {/* Top KPI Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="rounded-2xl border border-[#d8e3dc] bg-white p-4 shadow-sm">
                        <p className="text-xs font-bold text-[#719183]">ยอดขายรวม</p>
                        <p className="text-2xl font-black text-[#1b5e3f] mt-1.5">{formatMoney(report.grossSalesSatang)}</p>
                        <span className="text-[10px] text-[#719183]">VAT รวม {formatMoney(report.taxSatang)}</span>
                      </div>
                      <div className="rounded-2xl border border-[#d8e3dc] bg-white p-4 shadow-sm">
                        <p className="text-xs font-bold text-[#719183]">จำนวนบิลที่สำเร็จ</p>
                        <p className="text-2xl font-black text-[#12382e] mt-1.5">{report.completedOrders} บิล</p>
                        <span className="text-[10px] text-[#719183]">เฉลี่ย {formatMoney(report.averageBillSatang)} / บิล</span>
                      </div>
                      <div className="rounded-2xl border border-[#d8e3dc] bg-white p-4 shadow-sm">
                        <p className="text-xs font-bold text-[#719183]">บิลค้างชำระ</p>
                        <p className="text-2xl font-black text-[#b46522] mt-1.5">{report.openOrders} บิล</p>
                        <span className="text-[10px] text-[#719183]">มูลค่า {formatMoney(report.openTotalSatang)}</span>
                      </div>
                      <div className="rounded-2xl border border-[#d8e3dc] bg-white p-4 shadow-sm">
                        <p className="text-xs font-bold text-[#719183]">บิลยกเลิก (Void)</p>
                        <p className="text-2xl font-black text-[#a64835] mt-1.5">{report.cancelledOrders} บิล</p>
                        <span className="text-[10px] text-[#719183]">ไม่มีรายได้</span>
                      </div>
                    </div>

                    {/* Breakdown by Payment Method & Top items */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Payment Methods */}
                      <div className="rounded-2xl border border-[#d8e3dc] bg-white p-5 shadow-sm">
                        <h3 className="font-black text-base text-[#12382e] mb-3">ยอดขายแยกตามวิธีชำระเงิน</h3>
                        <div className="space-y-2.5">
                          {Object.entries(report.byMethod).map(([method, satang]) => (
                            <div key={method} className="flex justify-between items-center text-sm p-2 rounded-xl bg-[#f9fbf9]">
                              <span className="font-bold text-[#355447]">
                                {method === "cash" ? "เงินสด (Cash)" : method === "qr" ? "PromptPay QR" : method === "transfer" ? "โอนเงิน" : method}
                              </span>
                              <span className="font-black text-[#1b5e3f]">{formatMoney(satang)}</span>
                            </div>
                          ))}
                          {Object.keys(report.byMethod).length === 0 && (
                            <p className="text-xs text-[#8ea599]">ยังไม่มีรายการชำระเงิน</p>
                          )}
                        </div>
                      </div>

                      {/* Top items */}
                      <div className="rounded-2xl border border-[#d8e3dc] bg-white p-5 shadow-sm">
                        <h3 className="font-black text-base text-[#12382e] mb-3">10 อันดับเมนูขายดี</h3>
                        <div className="space-y-2">
                          {report.topItems.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs sm:text-sm">
                              <span className="font-bold text-[#162a21]">
                                {idx + 1}. {item.name}
                              </span>
                              <span className="text-[#6e8a7d]">
                                {item.quantity} จาน · <strong className="text-[#1b5e3f]">{formatMoney(item.totalSatang)}</strong>
                              </span>
                            </div>
                          ))}
                          {report.topItems.length === 0 && (
                            <p className="text-xs text-[#8ea599]">ยังไม่มีรายการขาย</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Bar for Mobile Navigation (< lg) */}
          <footer className="lg:hidden flex items-center justify-around bg-[#12382e] py-2 border-t border-[#234e42] text-white">
            {[
              { id: "pos", label: "หน้าร้าน", icon: Utensils },
              { id: "tables", label: "โต๊ะ", icon: LayoutGrid },
              { id: "kitchen", label: "ครัว", icon: ChefHat },
              { id: "menu", label: "เมนู", icon: BookOpen },
              { id: "reports", label: "รายงาน", icon: BarChart3 },
              { id: "settings", label: "ตั้งค่า", icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = tab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id as typeof tab)}
                  className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-xs ${
                    isActive ? "text-[#ddb259] font-black" : "text-[#a3c9b7] font-semibold"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </footer>
        </main>
      </div>

      {/* MODAL: Product Customization / Options */}
      {optionModalItem && (
        <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-5 sm:p-6 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5ede7]">
              <div>
                <h3 className="text-lg font-black text-[#12382e]">{optionModalItem.name}</h3>
                <p className="text-xs text-[#1b5e3f] font-bold">ราคาเริ่มต้น {formatMoney(optionModalItem.priceSatang)}</p>
              </div>
              <button
                onClick={() => setOptionModalItem(null)}
                className="grid h-8 w-8 place-items-center rounded-full bg-[#edf3ef] text-[#12382e]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {/* Option Groups */}
              {optionModalItem.options?.map((group) => (
                <div key={group.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-[#12382e]">{group.name}</label>
                    {group.required && <span className="text-[10px] text-red-600 font-bold">*จำเป็น</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {group.choices.map((choice) => {
                      const isSelected = modalModifiers.some((m) => m.name === choice.name);
                      return (
                        <button
                          key={choice.name}
                          type="button"
                          onClick={() => {
                            if (group.multi) {
                              setModalModifiers((prev) =>
                                isSelected ? prev.filter((m) => m.name !== choice.name) : [...prev, choice]
                              );
                            } else {
                              setModalModifiers((prev) => [
                                ...prev.filter((m) => !group.choices.some((c) => c.name === m.name)),
                                choice,
                              ]);
                            }
                          }}
                          className={`rounded-xl border p-2.5 text-left text-xs font-bold transition flex items-center justify-between ${
                            isSelected
                              ? "bg-[#12382e] border-[#12382e] text-white shadow-sm"
                              : "bg-[#f9fbf9] border-[#d8e3dc] text-[#345b49] hover:bg-[#edf3ef]"
                          }`}
                        >
                          <span>{choice.name}</span>
                          {choice.priceSatang > 0 && (
                            <span className={isSelected ? "text-[#ddb259]" : "text-[#1b5e3f]"}>
                              +{formatMoney(choice.priceSatang)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Special Note */}
              <div className="space-y-1">
                <label className="text-xs font-black text-[#12382e]">หมายเหตุเพิ่มเติม (เช่น ไม่ใส่ผัก)</label>
                <input
                  type="text"
                  placeholder="ระบุข้อความถึงครัว..."
                  value={modalNote}
                  onChange={(e) => setModalNote(e.target.value)}
                  className="w-full rounded-xl border border-[#d8e3dc] bg-[#f9fbf9] p-2.5 text-xs sm:text-sm"
                />
              </div>

              {/* Quantity */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-black text-[#12382e]">จำนวน</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setModalQuantity((q) => Math.max(1, q - 1))}
                    className="grid h-9 w-9 place-items-center rounded-xl bg-[#edf3ef] text-base font-black active:scale-95"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center text-base font-black">{modalQuantity}</span>
                  <button
                    onClick={() => setModalQuantity((q) => q + 1)}
                    className="grid h-9 w-9 place-items-center rounded-xl bg-[#ddb259] text-[#12382e] text-base font-black active:scale-95"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#e5ede7]">
              <button
                onClick={confirmAddOptionsToCart}
                className="w-full rounded-2xl bg-[#ddb259] py-3 text-center text-sm font-black text-[#12382e] shadow-md hover:bg-[#ebd08e]"
              >
                เพิ่มเข้าตะกร้า ·{" "}
                {formatMoney(
                  (optionModalItem.priceSatang + modalModifiers.reduce((s, m) => s + m.priceSatang, 0)) * modalQuantity
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Payment Checkout Modal */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm">
          <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-white p-5 sm:p-6 shadow-2xl flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5ede7]">
              <div>
                <h3 className="text-xl font-black text-[#12382e]">ชำระเงิน</h3>
                <p className="text-xs text-[#6e8a7d]">ยอดที่ต้องชำระ: <strong className="text-lg text-[#1b5e3f]">{formatMoney(cartTotal)}</strong></p>
              </div>
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full bg-[#edf3ef] text-[#12382e]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Payment Method Switcher */}
            <div className="mt-4 grid grid-cols-4 gap-2 p-1 bg-[#edf3ef] rounded-2xl">
              {(
                [
                  { id: "cash", label: "เงินสด", icon: DollarSign },
                  { id: "qr", label: "PromptPay QR", icon: QrCode },
                  { id: "transfer", label: "เงินโอน", icon: Wallet },
                  { id: "platform", label: "แพลตฟอร์ม", icon: Wallet },
                ] as const
              ).map((m) => {
                const Icon = m.icon;
                const isSel = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id)}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition ${
                      isSel ? "bg-[#12382e] text-white shadow-sm" : "text-[#507061] hover:text-[#12382e]"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              {paymentMethod === "cash" && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-[#6e8a7d]">ยอดเงินสดที่รับจากลูกค้า (บาท)</label>
                    <div className="mt-1 flex items-center rounded-2xl border border-[#d8e3dc] bg-[#f9fbf9] px-4 py-2 text-2xl font-black text-[#12382e]">
                      <span className="text-base mr-2 text-[#79998b]">฿</span>
                      <input
                        type="number"
                        value={satangToBaht(cashTenderedSatang)}
                        onChange={(e) => setCashTenderedSatang(Math.round(parseFloat(e.target.value || "0") * 100))}
                        className="w-full bg-transparent outline-none"
                      />
                    </div>
                  </div>

                  {/* Quick Cash Banknotes */}
                  <div>
                    <label className="text-xs font-bold text-[#6e8a7d]">ธนบัตรด่วน</label>
                    <div className="mt-1.5 grid grid-cols-4 gap-2">
                      {[cartTotal, 10000, 50000, 100000].map((amount) => (
                        <button
                          key={amount}
                          onClick={() => setCashTenderedSatang(amount)}
                          className={`rounded-xl border py-2 text-xs font-black transition ${
                            cashTenderedSatang === amount
                              ? "bg-[#12382e] text-white border-[#12382e]"
                              : "bg-[#edf3ef] text-[#12382e] border-[#d2dfd6] hover:bg-[#ddb259]"
                          }`}
                        >
                          {amount === cartTotal ? "พอดี" : formatMoney(amount)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Change calculation */}
                  <div className="rounded-2xl bg-[#edf3ef] p-4 flex items-center justify-between border border-[#d2dfd6]">
                    <span className="text-sm font-bold text-[#507061]">เงินทอน</span>
                    <span
                      className={`text-2xl font-black ${
                        cashTenderedSatang >= cartTotal ? "text-[#1b5e3f]" : "text-red-600"
                      }`}
                    >
                      {cashTenderedSatang >= cartTotal
                        ? formatMoney(cashTenderedSatang - cartTotal)
                        : "เงินไม่พอ"}
                    </span>
                  </div>
                </div>
              )}

              {paymentMethod === "qr" && (
                <div className="text-center py-2 space-y-3">
                  <div className="mx-auto inline-block p-3 rounded-2xl bg-white border border-[#d8e3dc] shadow-md">
                    {promptPayQrUrl ? (
                      <img src={promptPayQrUrl} alt="PromptPay QR" className="h-56 w-56 mx-auto rounded-xl" />
                    ) : (
                      <div className="h-56 w-56 grid place-items-center">กำลังสร้าง QR...</div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-[#719183]">สแกนจ่ายผ่านแอปธนาคารใดก็ได้ (PromptPay)</p>
                    <p className="text-lg font-black text-[#1b5e3f] mt-1">{formatMoney(cartTotal)}</p>
                  </div>
                </div>
              )}

              {paymentMethod === "transfer" && (
                <div className="p-4 rounded-2xl bg-[#f9fbf9] border border-[#d8e3dc] space-y-3 text-xs sm:text-sm">
                  <p className="font-bold text-[#12382e]">ธนาคารกสิกรไทย (KBANK)</p>
                  <p className="text-base font-black text-[#1b5e3f]">123-4-56789-0</p>
                  <p className="text-[#6e8a7d]">ชื่อบัญชี: บจก. ฟิลลิ่ง คาเฟ่ แอนด์ เรสเตอรองต์</p>
                  <div className="rounded-xl bg-[#edf3ef] p-3 text-[11px] text-[#507061]">
                    *เมื่อลูกค้าโอนเสร็จแล้ว กดปุ่มยืนยันรับเงินเพื่อตัดสต็อกและออกใบเสร็จ
                  </div>
                </div>
              )}

              {paymentMethod === "platform" && (
                <div className="p-4 rounded-2xl bg-[#f9fbf9] border border-[#d8e3dc] space-y-3 text-xs sm:text-sm">
                  <p className="font-bold text-[#12382e]">เลือกแพลตฟอร์มที่รับออเดอร์</p>
                  <div className="grid grid-cols-3 gap-2">
                    {([['grab', 'Grab'], ['shopeefood', 'ShopeeFood'], ['lineman', 'LINE MAN']] as const).map(([id, label]) => (
                      <button key={id} type="button" onClick={() => setPaymentPlatform(id)} className={`rounded-xl border px-2 py-2 font-black ${paymentPlatform === id ? "border-[#12382e] bg-[#12382e] text-white" : "border-[#d8e3dc] bg-white text-[#507061]"}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[#6e8a7d]">บันทึกแยกเป็นยอดแพลตฟอร์มเพื่อทำรายงานค่าคอมมิชชันภายหลัง</p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#e5ede7]">
              <button
                disabled={paymentMethod === "cash" && cashTenderedSatang < cartTotal}
                onClick={handleCheckoutSubmit}
                className="w-full rounded-2xl bg-[#ddb259] py-3.5 text-center text-sm font-black text-[#12382e] shadow-lg hover:bg-[#ebd08e] disabled:opacity-40"
              >
                ยืนยันรับชำระเงิน · {formatMoney(cartTotal)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Printable Receipt View */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center pb-2 border-b border-dashed border-[#d8e3dc]">
              <h4 className="font-black text-[#12382e]">ใบเสร็จรับเงิน</h4>
              <button onClick={() => setActiveReceipt(null)} className="text-[#719183] hover:text-black">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Thermal Receipt Container (Tagged for @media print) */}
            <div id="printable-receipt" className={`thermal-receipt thermal-${paperWidth === "58mm" ? "58" : "80"} flex-1 overflow-y-auto py-3 text-xs font-mono space-y-2 text-[#162a21]`}>
              <div className="text-center space-y-0.5">
                <p className="font-bold text-sm">FILLING CAFE</p>
                <p className="text-[10px] text-[#6e8a7d]">สาขาหลัก · TAX ID: 0105558000000</p>
                <p className="text-[10px] text-[#6e8a7d]">ใบเสร็จรับเงิน / ใบกำกับภาษีอย่างย่อ</p>
                <p className="text-[11px] font-bold mt-1">{activeReceipt.documentNumber}</p>
                <p className="text-[10px] text-[#6e8a7d]">{new Date(activeReceipt.issuedAt).toLocaleString("th-TH")}</p>
                {activeReceipt.orderType && (
                  <p className="text-[11px] font-black text-[#12382e] mt-1">
                    {activeReceipt.orderType}
                    {activeReceipt.queueNumber ? ` · คิว #${activeReceipt.queueNumber}` : ""}
                    {activeReceipt.deliveryPlatform ? ` · [${activeReceipt.deliveryPlatform}] ${activeReceipt.deliveryOrderId || ""}` : ""}
                  </p>
                )}
                {activeReceipt.tableName && !activeReceipt.queueNumber && !activeReceipt.deliveryPlatform && (
                  <p className="text-[10px] font-bold">โต๊ะ: {activeReceipt.tableName}</p>
                )}
              </div>

              <div className="border-t border-b border-dashed border-[#162a21] py-2 space-y-1">
                {activeReceipt.lines.map((l, i) => (
                  <div key={i} className="flex justify-between">
                    <div>
                      <span>{l.name} x{l.quantity}</span>
                      {l.modifiers?.length ? (
                        <span className="block text-[9px] text-gray-600">
                          +{l.modifiers.map((m) => m.name).join(", ")}
                        </span>
                      ) : null}
                    </div>
                    <span>{satangToBaht(l.unitPriceSatang * l.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-0.5 pt-1">
                <div className="flex justify-between">
                  <span>รวมรายการ</span>
                  <span>{satangToBaht(activeReceipt.subtotalSatang)}</span>
                </div>
                {activeReceipt.discountSatang !== undefined && activeReceipt.discountSatang > 0 && (
                  <div className="flex justify-between text-green-700 font-bold">
                    <span>ส่วนลด</span>
                    <span>-{satangToBaht(activeReceipt.discountSatang)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>รวมก่อน VAT</span>
                  <span>{satangToBaht(activeReceipt.totalSatang - activeReceipt.vatSatang)}</span>
                </div>
                <div className="flex justify-between">
                  <span>VAT 7% (รวมในราคา)</span>
                  <span>{satangToBaht(activeReceipt.vatSatang)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm pt-1 border-t border-dashed border-[#162a21]">
                  <span>ยอดสุทธิ (THB)</span>
                  <span>{satangToBaht(activeReceipt.totalSatang)}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span>รับชำระ ({activeReceipt.method})</span>
                  <span>{satangToBaht(activeReceipt.tenderedSatang || activeReceipt.totalSatang)}</span>
                </div>
                {activeReceipt.changeSatang !== undefined && activeReceipt.changeSatang > 0 && (
                  <div className="flex justify-between font-bold">
                    <span>เงินทอน</span>
                    <span>{satangToBaht(activeReceipt.changeSatang)}</span>
                  </div>
                )}
              </div>

              <div className="text-center pt-3 text-[10px] text-gray-500">
                <p>ขอบคุณที่ใช้บริการ</p>
                <p>VAT รวมในราคาแล้ว</p>
              </div>
            </div>

            <div className="pt-3 border-t border-[#e5ede7] space-y-2">
              <div className="flex items-center justify-between text-xs"><span className="font-bold text-[#12382e]">ขนาดกระดาษ</span><div className="flex gap-1"><button onClick={() => setPaperWidth("58mm")} className={`rounded-lg px-3 py-1.5 font-bold ${paperWidth === "58mm" ? "bg-[#ddb259] text-[#12382e]" : "border border-[#d8e3dc]"}`}>58 mm</button><button onClick={() => setPaperWidth("80mm")} className={`rounded-lg px-3 py-1.5 font-bold ${paperWidth === "80mm" ? "bg-[#ddb259] text-[#12382e]" : "border border-[#d8e3dc]"}`}>80 mm</button></div></div>
              <div className="flex gap-2">
              <button
                 onClick={() => {
                   const native = (window as Window & { FillingNative?: { printReceipt?: (payload: string, paperWidth: string) => void } }).FillingNative;
                   if (native?.printReceipt) native.printReceipt(JSON.stringify(activeReceipt), paperWidth);
                   else window.print();
                 }}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[#12382e] py-2.5 text-xs font-bold text-white hover:bg-[#1b483c]"
              >
                <Printer className="h-4 w-4 text-[#ddb259]" />
                <span>พิมพ์ใบเสร็จ</span>
              </button>
              <button
                onClick={() => setActiveReceipt(null)}
                className="rounded-xl border border-[#d8e3dc] px-4 py-2.5 text-xs font-bold text-[#12382e]"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
        </div>
      )}
      {/* MODAL: Table QR Code for Customers */}
      {tableQrModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#e5ede7]">
              <div>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                  QR สั่งอาหารด้วยมือถือ
                </span>
                <h4 className="font-black text-lg text-[#12382e] mt-1">{tableQrModal.table.name}</h4>
              </div>
              <button onClick={() => setTableQrModal(null)} className="text-[#719183] hover:text-black">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 bg-white rounded-3xl border-2 border-dashed border-[#12382e]/20 inline-block shadow-sm">
              <img src={tableQrModal.qrUrl} alt="Table QR" className="h-56 w-56 mx-auto rounded-xl" />
              <p className="mt-2 text-[11px] font-mono text-[#527263] break-all max-w-[240px] mx-auto select-all">
                {typeof window !== "undefined" ? window.location.origin : ""}/qr/{tableQrModal.table.qrToken}
              </p>
            </div>

            <div className="rounded-2xl bg-[#edf5f0] p-3 text-left space-y-1.5 text-xs text-[#24543a]">
              <p className="font-black text-[#12382e] flex items-center gap-1.5">
                <span>📱</span>
                <span>ขั้นตอนการสั่งอาหาร:</span>
              </p>
              <p>1. ลูกค้าใช้กล้องมือถือสแกน QR Code นี้</p>
              <p>2. เมนูอาหารและรูปภาพจะเปิดขึ้นบนมือถือลูกค้า</p>
              <p>3. ลูกค้าเลือกท็อปปิ้ง ความหวาน และกดส่งออเดอร์</p>
              <p>4. รายการอาหารจะเด้งเข้า POS และครัวอัตโนมัติ</p>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex gap-2">
                <a
                  href={tableQrModal.qrUrl}
                  download={`QR-${tableQrModal.table.name}.png`}
                  className="flex-1 rounded-xl border border-[#12382e] py-2.5 text-xs font-black text-[#12382e] hover:bg-[#edf3ef] transition flex items-center justify-center gap-1"
                >
                  <span>⬇️ บันทึกรูปภาพ</span>
                </a>
                <button
                  type="button"
                  onClick={() => window.open(`/qr/${tableQrModal.table.qrToken}`, "_blank")}
                  className="flex-1 rounded-xl bg-[#12382e] py-2.5 text-xs font-black text-white hover:bg-[#1b483c] transition shadow-sm flex items-center justify-center gap-1"
                >
                  <span>🌐 ทดลองเปิดสั่ง</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full rounded-xl bg-neutral-100 hover:bg-neutral-200 py-2 text-xs font-bold text-[#527263] transition"
              >
                🖨️ พิมพ์ QR ประจำโต๊ะ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Login required for protected cashier actions */}
      {authModalOpen && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-[#12382e]">เข้าสู่ระบบพนักงาน</h3>
            <p className="text-xs text-[#6e8a7d]">ต้องเข้าสู่ระบบก่อนเปิดกะและบันทึกธุรกรรม</p>
            <input value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="อีเมล" type="email" autoComplete="off" autoCapitalize="none" spellCheck={false} className="w-full rounded-xl border border-[#d8e3dc] px-3 py-2 outline-none" />
            <div className="flex gap-2">
              <input value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="รหัสผ่าน" type={showAuthPassword ? "text" : "password"} autoComplete="off" autoCapitalize="none" spellCheck={false} className="min-w-0 flex-1 rounded-xl border border-[#d8e3dc] px-3 py-2 outline-none" />
              <button type="button" onClick={() => setShowAuthPassword((value) => !value)} className="rounded-xl border border-[#d8e3dc] px-3 text-xs font-bold">{showAuthPassword ? "ซ่อน" : "แสดง"}</button>
            </div>
            {branchChoices.length > 0 && (
              <div className="space-y-2 rounded-xl border border-[#d8e3dc] bg-[#f8fbf8] p-3">
                <p className="text-xs font-black text-[#12382e]">เลือกสาขาที่จะใช้งาน</p>
                <div className="grid gap-2">
                  {branchChoices.map((branch) => (
                    <button
                      key={branch.branchId}
                      type="button"
                      onClick={() => setSelectedBranchId(branch.branchId)}
                      className={`rounded-xl border px-3 py-2 text-left text-xs font-bold transition ${selectedBranchId === branch.branchId ? "border-[#ddb259] bg-[#fff4d8] text-[#12382e]" : "border-[#d8e3dc] bg-white text-[#527263]"}`}
                    >
                      {branch.name} <span className="font-normal">({branch.code})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {authNotice && <p className="text-xs font-bold text-[#b14b37]">{authNotice}</p>}
            <div className="flex gap-2 pt-2">
              <button onClick={() => void handleLogin()} disabled={!authEmail || !authPassword || (branchChoices.length > 0 && !selectedBranchId)} className="flex-1 rounded-xl bg-[#ddb259] py-2.5 text-xs font-black text-[#12382e] disabled:opacity-50">เข้าสู่ระบบและเปิดกะ</button>
              <button onClick={() => setAuthModalOpen(false)} className="rounded-xl border border-[#d8e3dc] px-4 py-2.5 text-xs font-bold">ยกเลิก</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Open Shift */}
      {openShiftModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-[#12382e]">เปิดกะการขายใหม่</h3>
            <p className="text-xs text-[#6e8a7d]">ระบุจำนวนเงินทอนตั้งต้นที่ใส่ไว้ในลิ้นชัก</p>
            <div className="rounded-xl border border-[#d8e3dc] p-3 bg-[#f9fbf9] flex items-center text-lg font-black text-[#12382e]">
              <span className="mr-2 text-base text-[#79998b]">฿</span>
              <input
                type="number"
                value={openingFloatInput}
                onChange={(e) => setOpeningFloatInput(e.target.value)}
                className="w-full bg-transparent outline-none"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleOpenShift}
                className="flex-1 rounded-xl bg-[#ddb259] py-2.5 text-xs font-black text-[#12382e]"
              >
                ยืนยันเปิดกะ
              </button>
              <button
                onClick={() => setOpenShiftModal(false)}
                className="rounded-xl border border-[#d8e3dc] px-4 py-2.5 text-xs font-bold"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Close Shift */}
      {closeShiftModal && currentShift && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-[#12382e]">ปิดกะและกระทบยอดเงินสด</h3>
            <div className="space-y-1 text-xs text-[#527263]">
              <p>เงินทอนตั้งต้น: {formatMoney(currentShift.openingFloatSatang)}</p>
              <p>ยอดขายเงินสด: {formatMoney(currentShift.cashSalesSatang)}</p>
              <p className="font-bold text-sm text-[#12382e] pt-1">
                เงินสดที่ควรมีในลิ้นชัก: {formatMoney(currentShift.expectedCashSatang)}
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-[#6e8a7d]">เงินสดที่นับได้จริง (บาท)</label>
              <div className="mt-1 rounded-xl border border-[#d8e3dc] p-3 bg-[#f9fbf9] flex items-center text-lg font-black text-[#12382e]">
                <span className="mr-2 text-base text-[#79998b]">฿</span>
                <input
                  type="number"
                  value={countedCashInput}
                  onChange={(e) => setCountedCashInput(e.target.value)}
                  className="w-full bg-transparent outline-none"
                />
              </div>
            </div>

            {countedCashInput && (
              <div className="p-3 rounded-xl bg-[#edf3ef] text-xs flex justify-between font-black">
                <span>ผลต่าง:</span>
                <span>
                  {formatMoney(Math.round(parseFloat(countedCashInput) * 100) - currentShift.expectedCashSatang)}
                </span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleCloseShift}
                className="flex-1 rounded-xl bg-red-700 py-2.5 text-xs font-black text-white"
              >
                ยืนยันปิดกะ
              </button>
              <button
                onClick={() => setCloseShiftModal(false)}
                className="rounded-xl border border-[#d8e3dc] px-4 py-2.5 text-xs font-bold"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Product & Options Editor */}
      {productEditorOpen && (
        <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-white p-5 sm:p-6 shadow-2xl max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#e5ede7]">
              <div>
                <h3 className="text-lg font-black text-[#12382e]">
                  {editingProductId ? "แก้ไขเมนู & ตัวเลือกอาหาร" : "+ เพิ่มเมนูอาหารใหม่"}
                </h3>
                <p className="text-xs text-[#6e8a7d]">กำหนดชื่อ ราคา และชุดตัวเลือก/ท็อปปิ้ง</p>
              </div>
              <button
                type="button"
                onClick={() => setProductEditorOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full bg-[#edf3ef] text-[#12382e]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto py-4 space-y-5 text-xs">
              {/* Basic Fields */}
              <div className="space-y-3 bg-[#f9fbf9] p-3.5 rounded-2xl border border-[#d8e3dc]">
                <div>
                  <label className="font-bold text-[#446354]">ชื่ออาหาร *</label>
                  <input
                    type="text"
                    placeholder="เช่น ข้าวกะเพราหมูกรอบ, ชาเขียวนมสด"
                    value={formProductName}
                    onChange={(e) => setFormProductName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#d8e3dc] bg-white p-2.5 text-sm font-bold text-[#162a21] outline-none focus:border-[#12382e]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#446354]">หมวดหมู่อาหาร / เครื่องดื่ม</label>
                  <input
                    type="text"
                    placeholder="เช่น สเต็ก, กาแฟสด, ชา & มัทฉะ, อิตาเลียนโซดา"
                    value={formProductCategory}
                    onChange={(e) => setFormProductCategory(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#d8e3dc] bg-white p-2 text-xs font-bold text-[#162a21] outline-none focus:border-[#12382e]"
                  />
                  {/* Category Suggestion Chips */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[
                      "สเต็ก",
                      "สเต็กคอมโบ",
                      "เซ็ตครอบครัว",
                      "สปาเก็ตตี้",
                      "เบอร์เกอร์",
                      "ของทานเล่น & สลัด",
                      "กาแฟสด",
                      "ชา & มัทฉะ",
                      "นมสด & โกโก้",
                      "อิตาเลียนโซดา",
                      "สมูทตี้",
                      "น้ำดื่ม & โค้ก",
                    ].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setFormProductCategory(cat)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition flex items-center gap-1 ${
                          formProductCategory === cat
                            ? "bg-[#12382e] text-white shadow-xs"
                            : "bg-white border border-[#d8e3dc] text-[#527263] hover:bg-[#edf3ef]"
                        }`}
                      >
                        <span>{getCategoryIcon(cat)}</span>
                        <span>{cat}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-bold text-[#446354]">ราคาขาย (บาท) *</label>
                  <div className="mt-1 flex items-center rounded-xl border border-[#d8e3dc] bg-white px-3 py-2">
                    <span className="mr-2 text-base font-black text-[#1b5e3f]">฿</span>
                    <input
                      type="number"
                      placeholder="เช่น 80"
                      value={formProductPrice}
                      onChange={(e) => setFormProductPrice(e.target.value)}
                      className="w-full bg-transparent text-base font-black text-[#1b5e3f] outline-none"
                    />
                  </div>
                </div>

                {/* Product Image Section */}
                <div>
                  <label className="font-bold text-[#446354]">รูปภาพเมนูอาหาร / เครื่องดื่ม</label>
                  <p className="text-[11px] text-[#719183]">ใส่ลิงก์รูปภาพ หรือกดเลือกรูป/ถ่ายรูปจากโทรศัพท์ได้</p>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="text"
                      placeholder="เช่น https://... หรือ /images/steak.jpg"
                      value={formProductImageUrl}
                      onChange={(e) => setFormProductImageUrl(e.target.value)}
                      className="flex-1 rounded-xl border border-[#d8e3dc] bg-white p-2 text-xs font-bold text-[#162a21] outline-none focus:border-[#12382e]"
                    />
                    <label className="cursor-pointer shrink-0 rounded-xl bg-[#edf3ef] hover:bg-[#dbe7df] px-3 py-2 text-xs font-bold text-[#12382e] border border-[#d8e3dc] flex items-center gap-1.5 transition">
                      <span>📁 อัปโหลดรูป</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          showNotice("กำลังปรับขนาดรูปภาพให้เหมาะกับเมนู QR...", "info");
                          void resizeMenuImage(file)
                            .then((dataUrl) => {
                              setFormProductImageUrl(dataUrl);
                              showNotice("ปรับขนาดรูปภาพแล้ว กดบันทึกเมนูได้เลย", "success");
                            })
                            .catch((error) => showNotice(error instanceof Error ? error.message : "ปรับรูปภาพไม่สำเร็จ", "error"));
                        }}
                      />
                    </label>
                    {formProductImageUrl && (
                      <button
                        type="button"
                        onClick={() => setFormProductImageUrl("")}
                        className="rounded-xl px-2.5 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200"
                        title="ลบรูปภาพ"
                      >
                        ลบ
                      </button>
                    )}
                  </div>

                  {/* Image Preview */}
                  {formProductImageUrl && (
                    <div className="mt-2 flex items-center gap-3 rounded-xl border border-[#d8e3dc] bg-white p-2">
                      <img
                        src={formProductImageUrl}
                        alt="Preview"
                        className="h-16 w-16 rounded-lg object-cover border border-neutral-200"
                      />
                      <div className="text-[11px] text-[#527263]">
                        <p className="font-bold text-[#12382e]">ตัวอย่างรูปที่จะแสดงให้ลูกค้าเห็น</p>
                        <p className="text-emerald-700">✓ จะแสดงในหน้าสแกนสั่งที่โต๊ะ และหน้า POS</p>
                      </div>
                    </div>
                  )}

                  {/* Preset Sample Photos */}
                  <div className="mt-2">
                    <span className="text-[10px] font-bold text-[#719183]">หรือเลือกรูปตัวอย่างมาตรฐาน:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {[
                        { label: "🥩 สเต็กเนื้อ", url: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80" },
                        { label: "🍖 สเต็กหมู/ไก่", url: "https://images.unsplash.com/photo-1558030006-450675393462?w=600&auto=format&fit=crop&q=80" },
                        { label: "🍔 เบอร์เกอร์", url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80" },
                        { label: "🍝 สปาเก็ตตี้", url: "https://images.unsplash.com/photo-1621996346565-e3d5d6281292?w=600&auto=format&fit=crop&q=80" },
                        { label: "🍟 ของทานเล่น", url: "https://images.unsplash.com/photo-1576107232684-1279f3908594?w=600&auto=format&fit=crop&q=80" },
                        { label: "🥗 สลัด", url: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&auto=format&fit=crop&q=80" },
                        { label: "☕ กาแฟ", url: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80" },
                        { label: "🍵 ชาไทย/เขียว", url: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80" },
                        { label: "🍹 โซดา", url: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80" },
                        { label: "🍧 สมูทตี้", url: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=600&auto=format&fit=crop&q=80" },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setFormProductImageUrl(preset.url)}
                          className="rounded-lg bg-neutral-100 hover:bg-neutral-200 px-2 py-0.5 text-[10px] font-bold text-neutral-700 transition"
                        >
                          + {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>


              {/* Option Groups Library Selector */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="font-black text-sm text-[#12382e] flex items-center gap-1.5">
                    <Sliders className="h-4 w-4 text-[#ddb259]" />
                    <span>เลือกตัวเลือกจากคลังสำหรับเมนูนี้:</span>
                  </label>
                  <button
                    type="button"
                    onClick={openCreateLibraryGroupModal}
                    className="text-[11px] font-bold text-[#1b5e3f] underline hover:text-[#12382e]"
                  >
                    + สร้างกลุ่มใหม่ในคลัง
                  </button>
                </div>
                <p className="text-[11px] text-[#6e8a7d] mt-0.5">
                  แตะที่การ์ดเพื่อเปิด/ปิดตัวเลือกที่จะผูกกับเมนูนี้ (เลือกไว้แล้ว {formProductOptions.length} กลุ่ม)
                </p>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {optionGroups.map((group) => {
                    const isSelected = formProductOptions.some(
                      (g) => g.id === group.id || g.name === group.name
                    );
                    return (
                      <div
                        key={group.id}
                        onClick={() => toggleOptionGroupOnProduct(group)}
                        className={`cursor-pointer rounded-2xl border p-3 transition select-none ${
                          isSelected
                            ? "border-[#1b5e3f] bg-[#eef7f2] ring-2 ring-[#1b5e3f]/20 font-bold shadow-xs"
                            : "border-[#d8e3dc] bg-white text-[#527263] hover:bg-[#f9fbf9]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="h-4 w-4 rounded accent-[#1b5e3f] pointer-events-none"
                            />
                            <span className={`text-xs font-black ${isSelected ? "text-[#1b5e3f]" : "text-[#162a21]"}`}>
                              {group.name}
                            </span>
                          </div>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              isSelected ? "bg-[#1b5e3f] text-white" : "bg-[#edf3ef] text-[#719183]"
                            }`}
                          >
                            {isSelected ? "เปิดใช้ ✓" : "+ เลือก"}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {group.choices.map((c) => (
                            <span
                              key={c.name}
                              className="rounded-md bg-white border border-[#d8e3dc] px-1.5 py-0.5 text-[10px] text-[#547365]"
                            >
                              {c.name}
                              {c.priceSatang > 0 && (
                                <strong className="ml-0.5 text-[#1b5e3f]">+{c.priceSatang / 100}฿</strong>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {optionGroups.length === 0 && (
                    <div className="col-span-full rounded-2xl border border-dashed border-[#d8e3dc] p-4 text-center text-[#719183]">
                      ยังไม่มีกลุ่มตัวเลือกในคลัง กดปุ่ม &quot;+ สร้างกลุ่มใหม่ในคลัง&quot; ด้านบนเพื่อเพิ่มตัวเลือกแรก
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-[#e5ede7] flex gap-2">
              <button
                type="button"
                onClick={handleSaveProduct}
                className="flex-1 rounded-2xl bg-[#12382e] py-3 text-center text-sm font-black text-white shadow-md hover:bg-[#1b483c] active:scale-95 transition"
              >
                บันทึกเมนูอาหาร
              </button>
              <button
                type="button"
                onClick={() => setProductEditorOpen(false)}
                className="rounded-2xl border border-[#d8e3dc] px-5 py-3 text-xs font-bold text-[#527263]"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Option Group Library Editor */}
      {libraryGroupModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-5 sm:p-6 shadow-2xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5ede7]">
              <div>
                <h3 className="text-lg font-black text-[#12382e]">
                  {editingLibGroupId ? "แก้ไขกลุ่มตัวเลือกในคลัง" : "+ สร้างกลุ่มตัวเลือกใหม่ในคลัง"}
                </h3>
                <p className="text-xs text-[#6e8a7d]">ตั้งค่าครั้งเดียว นำไปเลือกใช้กับทุกเมนูอาหารได้ทันที</p>
              </div>
              <button
                type="button"
                onClick={() => setLibraryGroupModalOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full bg-[#edf3ef] text-[#12382e]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
              <div>
                <label className="font-bold text-[#446354]">ชื่อกลุ่มตัวเลือก *</label>
                <input
                  type="text"
                  placeholder="เช่น ระดับความเผ็ด, ชนิดเส้น, ท็อปปิ้งไข่, ความหวาน"
                  value={libGroupName}
                  onChange={(e) => setLibGroupName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#d8e3dc] p-2.5 text-sm font-bold text-[#162a21] outline-none focus:border-[#12382e]"
                />
              </div>

              <div className="rounded-2xl bg-[#f9fbf9] p-3 border border-[#d8e3dc] space-y-2">
                <label className="font-bold text-[#446354] block">รูปแบบการเลือกของลูกค้า</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-[#162a21]">
                    <input
                      type="checkbox"
                      checked={libGroupRequired}
                      onChange={(e) => setLibGroupRequired(e.target.checked)}
                      className="h-4 w-4 rounded accent-[#12382e]"
                    />
                    <span>จำเป็นต้องเลือก (Required)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-[#162a21]">
                    <input
                      type="checkbox"
                      checked={libGroupMulti}
                      onChange={(e) => setLibGroupMulti(e.target.checked)}
                      className="h-4 w-4 rounded accent-[#12382e]"
                    />
                    <span>เลือกได้หลายช้อยส์ (Multi-select)</span>
                  </label>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between pb-1">
                  <label className="font-bold text-[#446354]">รายการช้อยส์และราคาบวกเพิ่ม *</label>
                  <span className="text-[10px] text-[#719183]">ใส่ราคา 0 หากไม่คิดเงินเพิ่ม</span>
                </div>

                <div className="space-y-2">
                  {libChoices.map((choice, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="ชื่อช้อยส์ เช่น เผ็ดน้อย, ไข่ดาว, แก้วใหญ่"
                        value={choice.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLibChoices((prev) => {
                            const next = [...prev];
                            next[idx] = { ...next[idx], name: val };
                            return next;
                          });
                        }}
                        className="flex-1 rounded-xl border border-[#d8e3dc] p-2 text-xs font-bold text-[#162a21] outline-none focus:border-[#12382e]"
                      />
                      <div className="flex items-center rounded-xl border border-[#d8e3dc] px-2 py-1.5 w-28 bg-[#f9fbf9]">
                        <span className="text-[11px] text-[#719183] mr-1">+฿</span>
                        <input
                          type="number"
                          placeholder="0"
                          value={choice.priceBaht}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLibChoices((prev) => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], priceBaht: val };
                              return next;
                            });
                          }}
                          className="w-full bg-transparent text-xs font-bold text-[#1b5e3f] outline-none"
                        />
                      </div>
                      {libChoices.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setLibChoices((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-red-500 hover:text-red-700 p-1.5"
                          title="ลบช้อยส์นี้"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setLibChoices((prev) => [...prev, { name: "", priceBaht: "0" }])}
                  className="mt-2.5 rounded-xl border border-[#d8e3dc] bg-[#edf3ef] px-3 py-1.5 text-xs font-bold text-[#12382e] hover:bg-[#d8e6dc] transition"
                >
                  + เพิ่มช้อยส์
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-[#e5ede7] flex gap-2">
              <button
                type="button"
                onClick={handleSaveLibraryGroup}
                className="flex-1 rounded-2xl bg-[#12382e] py-3 text-center text-sm font-black text-white shadow-md hover:bg-[#1b483c] active:scale-95 transition"
              >
                บันทึกกลุ่มตัวเลือกในคลัง
              </button>
              <button
                type="button"
                onClick={() => setLibraryGroupModalOpen(false)}
                className="rounded-2xl border border-[#d8e3dc] px-5 py-3 text-xs font-bold text-[#527263]"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE / TABLET CART DRAWER */}
      {mobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end animate-in fade-in">
          <div className="w-full rounded-t-3xl bg-white p-5 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5ede7]">
              <div>
                <h3 className="font-black text-lg text-[#12382e]">ตะกร้าออเดอร์</h3>
                <p className="text-xs text-[#6e8a7d]">
                  {orderType === "DINE_IN" ? (selectedTable ? selectedTable.name : "ยังไม่เลือกโต๊ะ") : orderType === "TAKEAWAY" ? "สั่งกลับบ้าน" : "เดลิเวอรี"}
                </p>
              </div>
              <button
                onClick={() => setMobileCartOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full bg-[#edf3ef] text-[#12382e]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
              {cart.map((line, idx) => (
                <div key={idx} className="rounded-xl border border-[#e5ede7] bg-[#f9fbf9] p-3 text-xs">
                  <div className="flex justify-between font-black">
                    <span>{line.name}</span>
                    <span className="text-[#1b5e3f]">{formatMoney(line.unitPriceSatang * line.quantity)}</span>
                  </div>
                  {line.modifiers.length > 0 && (
                    <p className="text-[10px] text-[#5a786a] mt-0.5">
                      {line.modifiers.map((m) => m.name).join(", ")}
                    </p>
                  )}
                  <div className="mt-2 flex items-center justify-between pt-1 border-t border-[#edf2ee]">
                    <span className="text-[11px] text-[#719183]">{formatMoney(line.unitPriceSatang)} / จาน</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateCartQty(idx, -1)}
                        className="grid h-7 w-7 place-items-center rounded-lg bg-white border border-[#d2dfd6]"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-4 text-center font-black">{line.quantity}</span>
                      <button
                        onClick={() => updateCartQty(idx, 1)}
                        className="grid h-7 w-7 place-items-center rounded-lg bg-[#ddb259] text-[#12382e]"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Discount Section Mobile */}
            <div className="pt-2 pb-1 border-t border-[#e5ede7]">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setDiscountDrawerOpen(!discountDrawerOpen)}
                  className="flex items-center gap-1.5 text-xs font-black text-[#12382e]"
                >
                  <Tag className="h-3.5 w-3.5 text-[#ddb259]" />
                  <span>ส่วนลด (Discount)</span>
                  <span className="text-[10px] text-[#719183]">
                    {discountDrawerOpen ? "▲ ซ่อน" : "▼ ใส่ส่วนลด"}
                  </span>
                </button>
                {cartDiscountSatang > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-lg bg-[#e6f4ea] px-2 py-0.5 text-xs font-black text-[#1b5e3f]">
                      -{formatMoney(cartDiscountSatang)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setDiscountValue(0);
                        setDiscountCustomInput("");
                      }}
                      className="text-[11px] text-red-500 font-bold px-1"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {discountDrawerOpen && (
                <div className="mt-2 rounded-xl bg-[#f4f7f5] p-2.5 border border-[#d8e3dc] space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-1 p-0.5 bg-[#e2ebe5] rounded-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setDiscountType("percent");
                        setDiscountValue(0);
                        setDiscountCustomInput("");
                      }}
                      className={`py-1 text-center font-black rounded-md transition ${
                        discountType === "percent" ? "bg-white text-[#12382e] shadow-sm" : "text-[#5b7a6c]"
                      }`}
                    >
                      % เปอร์เซ็นต์
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDiscountType("baht");
                        setDiscountValue(0);
                        setDiscountCustomInput("");
                      }}
                      className={`py-1 text-center font-black rounded-md transition ${
                        discountType === "baht" ? "bg-white text-[#12382e] shadow-sm" : "text-[#5b7a6c]"
                      }`}
                    >
                      ฿ บาท (จำนวนเงิน)
                    </button>
                  </div>

                  {discountType === "percent" ? (
                    <div className="space-y-1.5">
                      <div className="grid grid-cols-4 gap-1">
                        {[5, 10, 15, 20].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => {
                              setDiscountValue(pct);
                              setDiscountCustomInput(String(pct));
                            }}
                            className={`rounded-lg py-1 font-black text-xs transition ${
                              discountValue === pct
                                ? "bg-[#12382e] text-[#ddb259]"
                                : "bg-white border border-[#d2dfd6] text-[#12382e]"
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-[#6e8a7d]">ระบุเอง:</span>
                        <div className="flex-1 flex items-center rounded-lg border border-[#d8e3dc] bg-white px-2 py-1">
                          <input
                            type="number"
                            placeholder="เช่น 25"
                            value={discountCustomInput}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDiscountCustomInput(val);
                              const num = parseFloat(val);
                              setDiscountValue(isNaN(num) ? 0 : num);
                            }}
                            className="w-full bg-transparent font-bold outline-none text-xs"
                          />
                          <span className="text-[11px] font-black text-[#6e8a7d]">%</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="grid grid-cols-4 gap-1">
                        {[20, 50, 100, 200].map((bht) => (
                          <button
                            key={bht}
                            type="button"
                            onClick={() => {
                              setDiscountValue(bht);
                              setDiscountCustomInput(String(bht));
                            }}
                            className={`rounded-lg py-1 font-black text-xs transition ${
                              discountValue === bht
                                ? "bg-[#12382e] text-[#ddb259]"
                                : "bg-white border border-[#d2dfd6] text-[#12382e]"
                            }`}
                          >
                            {bht}฿
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-[#6e8a7d]">ระบุเอง:</span>
                        <div className="flex-1 flex items-center rounded-lg border border-[#d8e3dc] bg-white px-2 py-1">
                          <span className="text-[11px] font-black text-[#6e8a7d] mr-1">฿</span>
                          <input
                            type="number"
                            placeholder="เช่น 80"
                            value={discountCustomInput}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDiscountCustomInput(val);
                              const num = parseFloat(val);
                              setDiscountValue(isNaN(num) ? 0 : num);
                            }}
                            className="w-full bg-transparent font-bold outline-none text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-[#e5ede7] space-y-1.5">
              <div className="flex justify-between text-xs text-[#6e8a7d]">
                <span>รวมรายการ</span>
                <span>{formatMoney(cartSubtotal)}</span>
              </div>
              {cartDiscountSatang > 0 && (
                <div className="flex justify-between text-xs font-bold text-[#1b5e3f]">
                  <span>ส่วนลด ({discountType === "percent" ? `${discountValue}%` : `${discountValue}฿`})</span>
                  <span>-{formatMoney(cartDiscountSatang)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-[#6e8a7d]">
                <button type="button" onClick={() => setVatEnabled((enabled) => !enabled)} className="font-bold hover:text-[#12382e]">
                  VAT 7% ({vatEnabled ? "เปิด" : "ปิด"})
                </button>
                <span>{formatMoney(cartVat)}</span>
              </div>
              <div className="flex justify-between font-black text-base pt-1 border-t border-dashed border-[#e5ede7]">
                <span>ยอดรวมสุทธิ</span>
                <span className="text-lg text-[#1b5e3f]">{formatMoney(cartTotal)}</span>
              </div>
              <button
                disabled={cart.length === 0}
                onClick={() => {
                  setMobileCartOpen(false);
                  openPaymentModal();
                }}
                className="w-full rounded-2xl bg-[#ddb259] py-3.5 text-center font-black text-[#12382e] shadow-lg disabled:opacity-40"
              >
                ชำระเงิน · {formatMoney(cartTotal)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
