import type { Satang } from "./pos";

/** Shared menu DTO used by the POS UI, QR ordering page and catalog APIs. */
export type OptionChoice = { name: string; priceSatang: Satang };
export type OptionGroup = { id: string; name: string; required?: boolean; multi?: boolean; choices: OptionChoice[] };
export type MenuItem = { id: string; sku: string; name: string; categoryId: string; priceSatang: Satang; available: boolean; channels: { POS: boolean; QR: boolean; DELIVERY: boolean }; options: OptionGroup[]; imageUrl?: string };

// ============================================================================
// Official Option Groups strictly according to BOM (expense-tracker/steak-bom-updates.js & cafe-recipes.js)
// ============================================================================

/** ซอสสเต็กตาม BOM: ซอสเกรวี่ (PREP-GRV) หรือ ซอสพริกไทยดำ (PREP-PEP) เท่านั้น */
export const STEAK_SAUCE: OptionGroup = {
  id: "sauce",
  name: "ซอสสเต็ก (เลือก 1 อย่าง)",
  required: true,
  choices: [
    { name: "ซอสเกรวี่ (Gravy Sauce)", priceSatang: 0 },
    { name: "ซอสพริกไทยดำ (Black Pepper Sauce)", priceSatang: 0 },
  ],
};

/** เครื่องเคียงตาม BOM: มันบด 70g (PREP-MASH) หรือ เฟรนช์ฟรายส์ 120g (RAW-FROZEN-001) เท่านั้น (สลัดผักมีให้ในจานอยู่แล้ว) */
export const STEAK_SIDES: OptionGroup = {
  id: "steak_side",
  name: "เครื่องเคียง (เลือก 1 อย่าง)",
  required: true,
  choices: [
    { name: "มันบด (Mashed Potato)", priceSatang: 0 },
    { name: "เฟรนช์ฟรายส์ (French Fries)", priceSatang: 0 },
  ],
};

/** ระดับความสุกของเนื้อสเต็กตามมาตรฐานร้าน */
export const STEAK_DONENESS: OptionGroup = {
  id: "doneness",
  name: "ระดับความสุก (Steak Doneness)",
  required: true,
  choices: [
    { name: "Rare (แรร์)", priceSatang: 0 },
    { name: "Medium Rare (มีเดียมแรร์)", priceSatang: 0 },
    { name: "Medium (มีเดียม)", priceSatang: 0 },
    { name: "Medium Well (มีเดียมเวล)", priceSatang: 0 },
    { name: "Well Done (สุก)", priceSatang: 0 },
  ],
};

/** แอดออนซอสตาม BOM (MOD-SAUCE-02 / MOD-SAUCE-03 / MOD-ADDON-FISH-SAUCE) */
export const STEAK_MODIFIERS: OptionGroup = {
  id: "steak_addon",
  name: "เพิ่มซอสพิเศษ",
  multi: true,
  choices: [
    { name: "เพิ่มซอสเกรวี่ (37 g)", priceSatang: 1000 },
    { name: "เพิ่มซอสพริกไทยดำ (1 portion)", priceSatang: 1000 },
    { name: "เพิ่มซอสปลาทอด / ซอสสลัดร้าน (50 g)", priceSatang: 1000 },
  ],
};

/** แอดออนเบอร์เกอร์ตาม BOM (MOD-ADDON-CHEESE / MOD-ADDON-GRILLED-CHICKEN / MOD-ADDON-BEEF) */
export const BURGER_ADDONS: OptionGroup = {
  id: "burger_addon",
  name: "ท็อปปิ้งเบอร์เกอร์เพิ่มเติม",
  multi: true,
  choices: [
    { name: "เพิ่มชีส (1 แผ่น)", priceSatang: 1000 },
    { name: "เพิ่มไก่ย่าง (1 ชิ้น)", priceSatang: 5000 },
    { name: "เพิ่มแพตตี้เนื้อ (1 ชิ้น)", priceSatang: 6000 },
  ],
};

/** ตัวเลือกโค้กสำหรับเซ็ตครอบครัวตาม BOM (RAW-DRINK-001 / RAW-DRINK-002) */
export const SET_COKE_CHOICE: OptionGroup = {
  id: "set_coke",
  name: "เลือกเครื่องดื่มกระป๋องในเซ็ต",
  required: true,
  choices: [
    { name: "โค้ก Original (มีน้ำตาล)", priceSatang: 0 },
    { name: "โค้ก Zero (ไม่มีน้ำตาล)", priceSatang: 0 },
  ],
};

/** ระดับความหวานตาม SOP/BOM (Filling Cafe) */
export const SWEETNESS: OptionGroup = {
  id: "sweet",
  name: "ระดับความหวาน",
  required: true,
  choices: [
    { name: "ไม่หวาน (0%)", priceSatang: 0 },
    { name: "หวาน 25%", priceSatang: 0 },
    { name: "หวาน 50%", priceSatang: 0 },
    { name: "หวานปกติ (100%)", priceSatang: 0 },
    { name: "เพิ่มหวาน", priceSatang: 0 },
  ],
};

/** เลือกอุณหภูมิสำหรับกาแฟและช็อกโกแลตที่ขายได้ทั้งร้อนและเย็น */
export const DRINK_TEMPERATURE: OptionGroup = {
  id: "temperature",
  name: "อุณหภูมิ",
  required: true,
  choices: [
    { name: "ร้อน", priceSatang: 0 },
    { name: "เย็น", priceSatang: 0 },
  ],
};

/** เมล็ดกาแฟตามสูตร SOP (Filling Cafe) */
export const COFFEE_BEANS: OptionGroup = {
  id: "coffee_bean",
  name: "เมล็ดกาแฟ",
  required: true,
  choices: [
    { name: "คั่วกลาง (FC-ING-004)", priceSatang: 0 },
    { name: "คั่วเข้ม (FC-ING-003)", priceSatang: 0 },
  ],
};

// Legacy exports kept for backwards-compatibility
export const SPICE_LEVEL: OptionGroup = { id: "spice", name: "ระดับความเผ็ด", required: true, choices: [{ name: "ไม่เผ็ด", priceSatang: 0 }, { name: "เผ็ดน้อย", priceSatang: 0 }, { name: "เผ็ดมาก", priceSatang: 0 }] };
export const RICE_ADDONS: OptionGroup = { id: "addon", name: "เพิ่มเติม", multi: true, choices: [{ name: "ไข่ดาว", priceSatang: 1000 }] };
export const DRINK_SIZE: OptionGroup = { id: "size", name: "ขนาดแก้ว", required: true, choices: [{ name: "16 oz", priceSatang: 0 }] };
export const DRINK_TOPPINGS: OptionGroup = { id: "drink_topping", name: "ท็อปปิ้งเครื่องดื่ม", multi: true, choices: [{ name: "วิปครีม", priceSatang: 2000 }] };

const all = { POS: true, QR: true, DELIVERY: true };
const posOnly = { POS: true, QR: true, DELIVERY: false };

/** Real business menu strictly matching BOM from steak-catalog.js & cafe-recipes.js */
export const DEMO_MENU: Omit<MenuItem, "id" | "available">[] = [
  // --------------------------------------------------------------------------
  // 1. สเต็ก (STEAK - ร้านสเต็กในสวน ที่โคตรลำ)
  // --------------------------------------------------------------------------
  { sku: "STK-001", name: "สเต็กหมู", categoryId: "สเต็ก", priceSatang: 9900, channels: all, options: [STEAK_SAUCE, STEAK_SIDES, STEAK_MODIFIERS], imageUrl: "https://images.unsplash.com/photo-1558030006-450675393462?w=600&auto=format&fit=crop&q=80" },
  { sku: "STK-002", name: "สเต็กไก่", categoryId: "สเต็ก", priceSatang: 9900, channels: all, options: [STEAK_SAUCE, STEAK_SIDES, STEAK_MODIFIERS], imageUrl: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=600&auto=format&fit=crop&q=80" },
  { sku: "STK-003", name: "สเต็กปลาทอด", categoryId: "สเต็ก", priceSatang: 12900, channels: all, options: [STEAK_SIDES, STEAK_MODIFIERS], imageUrl: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&auto=format&fit=crop&q=80" },
  { sku: "STK-004", name: "สเต็กไส้กรอกรวม", categoryId: "สเต็ก", priceSatang: 25900, channels: all, options: [STEAK_SAUCE, STEAK_SIDES, STEAK_MODIFIERS], imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80" },
  { sku: "STK-005", name: "สเต็ก Ribeye / สันแหลม", categoryId: "สเต็ก", priceSatang: 25900, channels: all, options: [STEAK_DONENESS, STEAK_SAUCE, STEAK_SIDES, STEAK_MODIFIERS], imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80" },
  { sku: "STK-006", name: "สเต็ก Striploin / สันนอก", categoryId: "สเต็ก", priceSatang: 21900, channels: all, options: [STEAK_DONENESS, STEAK_SAUCE, STEAK_SIDES, STEAK_MODIFIERS], imageUrl: "https://images.unsplash.com/photo-1546964124-0cce460f38ef?w=600&auto=format&fit=crop&q=80" },
  { sku: "STK-007", name: "สเต็ก Picanha", categoryId: "สเต็ก", priceSatang: 23900, channels: all, options: [STEAK_DONENESS, STEAK_SAUCE, STEAK_SIDES, STEAK_MODIFIERS], imageUrl: "https://images.unsplash.com/photo-1546964124-0cce460f38ef?w=600&auto=format&fit=crop&q=80" },
  { sku: "STK-008", name: "Pork Chop", categoryId: "สเต็ก", priceSatang: 24900, channels: all, options: [STEAK_SAUCE, STEAK_SIDES, STEAK_MODIFIERS], imageUrl: "https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=600&auto=format&fit=crop&q=80" },
  { sku: "STK-FISH-CHIPS", name: "Fish & Chips / ฟิชแอนด์ชิฟส์", categoryId: "สเต็ก", priceSatang: 14900, channels: all, options: [STEAK_MODIFIERS], imageUrl: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&auto=format&fit=crop&q=80" },

  // --------------------------------------------------------------------------
  // 2. สเต็กคอมโบ (COMBO STEAK)
  // --------------------------------------------------------------------------
  { sku: "CMB-001", name: "สเต็กหมู + หมู", categoryId: "สเต็กคอมโบ", priceSatang: 17900, channels: all, options: [STEAK_SAUCE, STEAK_SIDES, STEAK_MODIFIERS] },
  { sku: "CMB-002", name: "สเต็กไก่ + ไก่", categoryId: "สเต็กคอมโบ", priceSatang: 16900, channels: all, options: [STEAK_SAUCE, STEAK_SIDES, STEAK_MODIFIERS] },
  { sku: "CMB-003", name: "สเต็กหมู + ไก่", categoryId: "สเต็กคอมโบ", priceSatang: 17900, channels: all, options: [STEAK_SAUCE, STEAK_SIDES, STEAK_MODIFIERS] },
  { sku: "CMB-004", name: "สเต็กหมู + ปลาทอด", categoryId: "สเต็กคอมโบ", priceSatang: 18900, channels: all, options: [STEAK_SAUCE, STEAK_SIDES, STEAK_MODIFIERS] },
  { sku: "CMB-005", name: "สเต็กหมู + ไส้กรอกรวม", categoryId: "สเต็กคอมโบ", priceSatang: 31900, channels: all, options: [STEAK_SAUCE, STEAK_SIDES, STEAK_MODIFIERS] },
  { sku: "CMB-006", name: "สเต็กไก่ + ปลาทอด", categoryId: "สเต็กคอมโบ", priceSatang: 19900, channels: all, options: [STEAK_SAUCE, STEAK_SIDES, STEAK_MODIFIERS] },
  { sku: "CMB-007", name: "สเต็กไก่ + ไส้กรอกรวม", categoryId: "สเต็กคอมโบ", priceSatang: 31900, channels: all, options: [STEAK_SAUCE, STEAK_SIDES, STEAK_MODIFIERS] },

  // --------------------------------------------------------------------------
  // 3. เซ็ตครอบครัว (SET MENU)
  // --------------------------------------------------------------------------
  { sku: "SET-M", name: "Set M (หมู + ไก่ + ไส้กรอก + มันบด + เฟรนช์ฟรายส์ + สลัด + โค้ก 2)", categoryId: "เซ็ตครอบครัว", priceSatang: 39900, channels: all, options: [STEAK_SAUCE, SET_COKE_CHOICE], imageUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80" },
  { sku: "SET-L", name: "Set L (หมู + ไก่ + ไส้กรอก + ปลาทอด + มันบด + เฟรนช์ฟรายส์ + สลัด + โค้ก 3)", categoryId: "เซ็ตครอบครัว", priceSatang: 59900, channels: all, options: [STEAK_SAUCE, SET_COKE_CHOICE], imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80" },
  { sku: "SET-XL", name: "Set XL (หมู + ไก่ + ไส้กรอก + ปลาทอด + Striploin + คาโบนาร่า + มันบด + เฟรนช์ฟรายส์ + สลัด + โค้ก 4)", categoryId: "เซ็ตครอบครัว", priceSatang: 79900, channels: all, options: [STEAK_SAUCE, SET_COKE_CHOICE], imageUrl: "https://images.unsplash.com/photo-1546964124-0cce460f38ef?w=600&auto=format&fit=crop&q=80" },

  // --------------------------------------------------------------------------
  // 4. สปาเก็ตตี้ (SPAGHETTI)
  // --------------------------------------------------------------------------
  { sku: "PST-001", name: "สปาเก็ตตี้คาโบนาร่า", categoryId: "สปาเก็ตตี้", priceSatang: 14900, channels: all, options: [], imageUrl: "https://images.unsplash.com/photo-1621996346565-e3d5d6281292?w=600&auto=format&fit=crop&q=80" },
  { sku: "PST-002", name: "สปาเก็ตตี้ครีมกุ้ง", categoryId: "สปาเก็ตตี้", priceSatang: 15900, channels: all, options: [], imageUrl: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&auto=format&fit=crop&q=80" },
  { sku: "PST-003", name: "สปาเก็ตตี้ผัดขี้เมา", categoryId: "สปาเก็ตตี้", priceSatang: 18900, channels: all, options: [], imageUrl: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&auto=format&fit=crop&q=80" },
  { sku: "PST-004", name: "สปาเก็ตตี้เพสโต้กุ้ง", categoryId: "สปาเก็ตตี้", priceSatang: 21900, channels: all, options: [], imageUrl: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&auto=format&fit=crop&q=80" },
  { sku: "PST-005", name: "สปาเก็ตตี้เพสโต้เนื้อ", categoryId: "สปาเก็ตตี้", priceSatang: 21900, channels: all, options: [], imageUrl: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&auto=format&fit=crop&q=80" },
  { sku: "PST-006", name: "สปาเก็ตตี้ซอสมะเขือเทศหมูสับ", categoryId: "สปาเก็ตตี้", priceSatang: 14900, channels: all, options: [], imageUrl: "https://images.unsplash.com/photo-1621996346565-e3d5d6281292?w=600&auto=format&fit=crop&q=80" },
  { sku: "PST-007", name: "สปาเก็ตตี้พริกแห้งเบคอน", categoryId: "สปาเก็ตตี้", priceSatang: 14900, channels: all, options: [], imageUrl: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&auto=format&fit=crop&q=80" },

  // --------------------------------------------------------------------------
  // 5. เบอร์เกอร์ (BURGER)
  // --------------------------------------------------------------------------
  { sku: "BGR-001", name: "Everyday Burger เนื้อ", categoryId: "เบอร์เกอร์", priceSatang: 16900, channels: all, options: [BURGER_ADDONS], imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80" },
  { sku: "BGR-002", name: "Everyday Burger หมู", categoryId: "เบอร์เกอร์", priceSatang: 16900, channels: all, options: [BURGER_ADDONS], imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80" },
  { sku: "BGR-003", name: "Everyday Burger ไก่ย่าง", categoryId: "เบอร์เกอร์", priceSatang: 16900, channels: all, options: [BURGER_ADDONS], imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80" },
  { sku: "BGR-004", name: "Everyday Burger ไก่ทอด", categoryId: "เบอร์เกอร์", priceSatang: 16900, channels: all, options: [BURGER_ADDONS], imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80" },
  { sku: "BGR-005", name: "Big Bike Burger เนื้อ (แถมเฟรนช์ฟรายส์ + โค้ก)", categoryId: "เบอร์เกอร์", priceSatang: 24900, channels: all, options: [BURGER_ADDONS], imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80" },
  { sku: "BGR-006", name: "Big Bike Burger หมู (แถมเฟรนช์ฟรายส์ + โค้ก)", categoryId: "เบอร์เกอร์", priceSatang: 24900, channels: all, options: [BURGER_ADDONS], imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80" },
  { sku: "BGR-007", name: "Big Bike Burger ไก่ย่าง (แถมเฟรนช์ฟรายส์ + โค้ก)", categoryId: "เบอร์เกอร์", priceSatang: 24900, channels: all, options: [BURGER_ADDONS], imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80" },
  { sku: "BGR-008", name: "Big Bike Burger ไก่ทอด (แถมเฟรนช์ฟรายส์ + โค้ก)", categoryId: "เบอร์เกอร์", priceSatang: 24900, channels: all, options: [BURGER_ADDONS], imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80" },
  { sku: "BGR-009", name: "Melt More Burger เนื้อ", categoryId: "เบอร์เกอร์", priceSatang: 24900, channels: all, options: [BURGER_ADDONS], imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80" },
  { sku: "BGR-010", name: "Melt More Burger หมู", categoryId: "เบอร์เกอร์", priceSatang: 24900, channels: all, options: [BURGER_ADDONS], imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80" },
  { sku: "BGR-011", name: "Melt More Burger ไก่ย่าง", categoryId: "เบอร์เกอร์", priceSatang: 24900, channels: all, options: [BURGER_ADDONS], imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80" },
  { sku: "BGR-012", name: "Melt More Burger ไก่ทอด", categoryId: "เบอร์เกอร์", priceSatang: 24900, channels: all, options: [BURGER_ADDONS], imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80" },

  // --------------------------------------------------------------------------
  // 6. ของทานเล่น & สลัด (FRIED & SNACK & SALAD)
  // --------------------------------------------------------------------------
  { sku: "SNK-001", name: "ทอดรวม (ปีกบน + นักเก็ต + ไก่ป๊อบ + เฟรนช์ฟรายส์)", categoryId: "ของทานเล่น & สลัด", priceSatang: 11900, channels: all, options: [], imageUrl: "https://images.unsplash.com/photo-1562967914-608f82629710?w=600&auto=format&fit=crop&q=80" },
  { sku: "SNK-002", name: "เอ็นไก่ทอด", categoryId: "ของทานเล่น & สลัด", priceSatang: 9900, channels: all, options: [], imageUrl: "https://images.unsplash.com/photo-1562967914-608f82629710?w=600&auto=format&fit=crop&q=80" },
  { sku: "SNK-003", name: "หมูแดดเดียว", categoryId: "ของทานเล่น & สลัด", priceSatang: 9900, channels: all, options: [], imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80" },
  { sku: "SNK-004", name: "หมูคำหวาน", categoryId: "ของทานเล่น & สลัด", priceSatang: 9900, channels: posOnly, options: [], imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80" },
  { sku: "SNK-005", name: "เฟรนช์ฟรายส์ขายแยก (250 g)", categoryId: "ของทานเล่น & สลัด", priceSatang: 8900, channels: all, options: [], imageUrl: "https://images.unsplash.com/photo-1576107232684-1279f3908594?w=600&auto=format&fit=crop&q=80" },
  { sku: "SNK-006", name: "มันบดขายแยก (2 scoop)", categoryId: "ของทานเล่น & สลัด", priceSatang: 8900, channels: all, options: [], imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80" },
  { sku: "SND-001", name: "Club Sandwich / คลับแซนด์วิช", categoryId: "ของทานเล่น & สลัด", priceSatang: 12900, channels: all, options: [], imageUrl: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&auto=format&fit=crop&q=80" },
  { sku: "SLD-001", name: "สลัดน้ำมันงาญี่ปุ่น", categoryId: "ของทานเล่น & สลัด", priceSatang: 8900, channels: all, options: [], imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&auto=format&fit=crop&q=80" },
  { sku: "SLD-002", name: "สลัดปูอัดไข่กุ้ง", categoryId: "ของทานเล่น & สลัด", priceSatang: 11900, channels: all, options: [], imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&auto=format&fit=crop&q=80" },
  { sku: "SLD-003", name: "Caesar Salad / ซีซาร์สลัด", categoryId: "ของทานเล่น & สลัด", priceSatang: 9900, channels: all, options: [], imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&auto=format&fit=crop&q=80" },

  // --------------------------------------------------------------------------
  // 7. กาแฟสด (Filling Cafe Coffee)
  // --------------------------------------------------------------------------
  { sku: "CAFE-COFFEE-AMER-MID", name: "Americano (คั่วกลาง)", categoryId: "กาแฟสด", priceSatang: 7500, channels: all, options: [SWEETNESS], imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80" },
  { sku: "CAFE-COFFEE-AMER-DARK", name: "Americano (คั่วเข้ม)", categoryId: "กาแฟสด", priceSatang: 7500, channels: all, options: [SWEETNESS], imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80" },
  { sku: "CAFE-COFFEE-LATTE", name: "Latte", categoryId: "กาแฟสด", priceSatang: 8500, channels: all, options: [SWEETNESS], imageUrl: "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=600&auto=format&fit=crop&q=80" },
  { sku: "CAFE-COFFEE-CAPPUCCINO", name: "Cappuccino", categoryId: "กาแฟสด", priceSatang: 8500, channels: all, options: [SWEETNESS], imageUrl: "https://images.unsplash.com/photo-1534778101976-62847782c213?w=600&auto=format&fit=crop&q=80" },
  { sku: "CAFE-COFFEE-ESPRESSO", name: "Espresso เย็น (Es-Yen)", categoryId: "กาแฟสด", priceSatang: 6500, channels: all, options: [SWEETNESS], imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80" },
  { sku: "CAFE-COFFEE-CARAMEL", name: "Caramel Macchiato", categoryId: "กาแฟสด", priceSatang: 9500, channels: all, options: [SWEETNESS], imageUrl: "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=600&auto=format&fit=crop&q=80" },
  { sku: "CAFE-COFFEE-MOCHA", name: "Mocha", categoryId: "กาแฟสด", priceSatang: 9500, channels: all, options: [SWEETNESS], imageUrl: "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=600&auto=format&fit=crop&q=80" },
  { sku: "CAFE-COFFEE-COCONUT", name: "Coconut Black (กาแฟน้ำช่อดอกมะพร้าว)", categoryId: "กาแฟสด", priceSatang: 9500, channels: all, options: [], imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80" },
  { sku: "CAFE-COFFEE-ORANGE", name: "Orange Coffee (กาแฟน้ำส้มสด)", categoryId: "กาแฟสด", priceSatang: 9500, channels: all, options: [SWEETNESS], imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80" },
  { sku: "CAFE-COFFEE-HONEY-LEMON", name: "Black Honey Lemon", categoryId: "กาแฟสด", priceSatang: 9000, channels: all, options: [SWEETNESS], imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80" },
  { sku: "CAFE-COFFEE-LEMON", name: "Black Lemon", categoryId: "กาแฟสด", priceSatang: 9000, channels: all, options: [SWEETNESS], imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80" },

  // --------------------------------------------------------------------------
  // 8. ชา & มัทฉะ (Tea & Matcha)
  // --------------------------------------------------------------------------
  { sku: "CAFE-TEA-THAI", name: "Thai Tea (ชาไทยเย็น)", categoryId: "ชา & มัทฉะ", priceSatang: 8500, channels: all, options: [SWEETNESS], imageUrl: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80" },
  { sku: "CAFE-TEA-GREEN", name: "Green Tea (ชาเขียวนมเย็น)", categoryId: "ชา & มัทฉะ", priceSatang: 8500, channels: all, options: [SWEETNESS], imageUrl: "https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?w=600&auto=format&fit=crop&q=80" },
  { sku: "CAFE-TEA-THAI-FRAPPE", name: "Thai Tea Frappe (ชาไทยปั่น)", categoryId: "ชา & มัทฉะ", priceSatang: 9500, channels: all, options: [], imageUrl: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80" },
  { sku: "CAFE-TEA-GREEN-FRAPPE", name: "Green Tea Frappe (ชาเขียวปั่น)", categoryId: "ชา & มัทฉะ", priceSatang: 9500, channels: all, options: [], imageUrl: "https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?w=600&auto=format&fit=crop&q=80" },
  { sku: "CAFE-MATCHA-LATTE", name: "Matcha Latte", categoryId: "ชา & มัทฉะ", priceSatang: 14000, channels: all, options: [SWEETNESS], imageUrl: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80" },
  { sku: "CAFE-MATCHA-COCONUT", name: "Matcha Coconut (มัทฉะน้ำช่อดอกมะพร้าว)", categoryId: "ชา & มัทฉะ", priceSatang: 15000, channels: all, options: [], imageUrl: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80" },
  { sku: "CAFE-MATCHA-PURE", name: "Pure Matcha", categoryId: "ชา & มัทฉะ", priceSatang: 10000, channels: all, options: [SWEETNESS], imageUrl: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80" },
  { sku: "CAFE-TEA-LEMON", name: "Lemon Tea (ชามะนาว)", categoryId: "ชา & มัทฉะ", priceSatang: 8500, channels: all, options: [SWEETNESS], imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80" },
  { sku: "CAFE-TEA-HONEY-LEMON", name: "Honey Lemon Tea (ชาน้ำผึ้งมะนาว)", categoryId: "ชา & มัทฉะ", priceSatang: 9500, channels: all, options: [SWEETNESS], imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80" },
  { sku: "CAFE-TEA-PEACH", name: "Peach Tea (ชาพีช)", categoryId: "ชา & มัทฉะ", priceSatang: 8500, channels: all, options: [SWEETNESS], imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80" },

  // --------------------------------------------------------------------------
  // 9. นมสด & โกโก้ (Milk & Cocoa)
  // --------------------------------------------------------------------------
  { sku: "CAFE-COCOA", name: "Cocoa / โกโก้เย็น", categoryId: "นมสด & โกโก้", priceSatang: 8500, channels: all, options: [SWEETNESS], imageUrl: "https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=600&auto=format&fit=crop&q=80" },
  { sku: "CAFE-CHOCOLATE", name: "Chocolate Premium", categoryId: "นมสด & โกโก้", priceSatang: 9500, channels: all, options: [SWEETNESS], imageUrl: "https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=600&auto=format&fit=crop&q=80" },
  { sku: "CAFE-MILK-FRESH", name: "Fresh Milk (นมสด)", categoryId: "นมสด & โกโก้", priceSatang: 6500, channels: all, options: [SWEETNESS], imageUrl: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80" },
  { sku: "CAFE-MILK-PINK", name: "Pink Milk (นมชมพู)", categoryId: "นมสด & โกโก้", priceSatang: 8500, channels: all, options: [SWEETNESS], imageUrl: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80" },
  { sku: "CAFE-MILK-CARAMEL", name: "Caramel Milk (นมสดคาราเมล)", categoryId: "นมสด & โกโก้", priceSatang: 8500, channels: all, options: [SWEETNESS], imageUrl: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80" },
  { sku: "CAFE-MILK-HONEY", name: "Honey Milk (นมสดน้ำผึ้ง)", categoryId: "นมสด & โกโก้", priceSatang: 8500, channels: all, options: [SWEETNESS], imageUrl: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80" },

  // --------------------------------------------------------------------------
  // 10. อิตาเลียนโซดา (Italian Soda)
  // --------------------------------------------------------------------------
  { sku: "CAFE-SODA-PEACH", name: "Peach Soda", categoryId: "อิตาเลียนโซดา", priceSatang: 8500, channels: all, options: [], imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80" },
  { sku: "CAFE-SODA-LYCHEE", name: "Lychee Soda", categoryId: "อิตาเลียนโซดา", priceSatang: 8500, channels: all, options: [], imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80" },
  { sku: "CAFE-SODA-STRAWBERRY", name: "Strawberry Soda", categoryId: "อิตาเลียนโซดา", priceSatang: 8500, channels: all, options: [], imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80" },
  { sku: "CAFE-SODA-APPLE", name: "Apple Soda", categoryId: "อิตาเลียนโซดา", priceSatang: 8500, channels: all, options: [], imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80" },
  { sku: "CAFE-SODA-MANGO", name: "Mango Soda", categoryId: "อิตาเลียนโซดา", priceSatang: 8500, channels: all, options: [], imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80" },
  { sku: "CAFE-SODA-LEMON", name: "Lemon Soda", categoryId: "อิตาเลียนโซดา", priceSatang: 8500, channels: all, options: [], imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80" },
  { sku: "CAFE-SODA-HONEY-LEMON", name: "Honey Lemon Soda", categoryId: "อิตาเลียนโซดา", priceSatang: 8500, channels: all, options: [], imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80" },

  // --------------------------------------------------------------------------
  // 11. สมูทตี้ (Smoothies)
  // --------------------------------------------------------------------------
  { sku: "CAFE-SMOOTHIE-STRAWBERRY", name: "Strawberry Smoothie", categoryId: "สมูทตี้", priceSatang: 9500, channels: all, options: [], imageUrl: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=600&auto=format&fit=crop&q=80" },
  { sku: "CAFE-SMOOTHIE-BLUEBERRY", name: "Blueberry Smoothie", categoryId: "สมูทตี้", priceSatang: 9500, channels: all, options: [], imageUrl: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=600&auto=format&fit=crop&q=80" },
  { sku: "CAFE-SMOOTHIE-APPLE", name: "Apple Smoothie", categoryId: "สมูทตี้", priceSatang: 9500, channels: all, options: [], imageUrl: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=600&auto=format&fit=crop&q=80" },

  // --------------------------------------------------------------------------
  // 12. น้ำดื่ม & น้ำอัดลม (Ready to drink)
  // --------------------------------------------------------------------------
  { sku: "DRK-001", name: "น้ำเปล่าสิงห์", categoryId: "น้ำดื่ม & โค้ก", priceSatang: 1500, channels: all, options: [], imageUrl: "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=600&auto=format&fit=crop&q=80" },
  { sku: "DRK-002", name: "โค้ก Original", categoryId: "น้ำดื่ม & โค้ก", priceSatang: 2500, channels: all, options: [], imageUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80" },
  { sku: "DRK-003", name: "โค้ก Zero", categoryId: "น้ำดื่ม & โค้ก", priceSatang: 2500, channels: all, options: [], imageUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80" },
  { sku: "DRK-004", name: "โซดาสิงห์", categoryId: "น้ำดื่ม & โค้ก", priceSatang: 2500, channels: all, options: [], imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80" },
  { sku: "DRK-005", name: "น้ำแร่ Charles House", categoryId: "น้ำดื่ม & โค้ก", priceSatang: 2500, channels: all, options: [], imageUrl: "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=600&auto=format&fit=crop&q=80" },
];

export function parseOptions(raw: unknown): OptionGroup[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((group) => {
    if (!group || typeof group !== "object") return [];
    const g = group as Partial<OptionGroup>;
    if (typeof g.name !== "string" || !Array.isArray(g.choices)) return [];
    const choices = g.choices.filter((c): c is OptionChoice => !!c && typeof c.name === "string" && typeof c.priceSatang === "number" && c.priceSatang >= 0);
    return choices.length ? [{ id: String(g.id ?? g.name), name: g.name, required: !!g.required, multi: !!g.multi, choices }] : [];
  });
}

export function parseChannels(raw: unknown): MenuItem["channels"] {
  const c = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return { POS: c.POS !== false, QR: c.QR !== false, DELIVERY: c.DELIVERY === true };
}

/** Maps a persisted PosProduct row onto the shared menu DTO. */
export function toMenuItem(row: { id: string; sku: string; name: string; categoryId: string | null; priceSatang: number; available: boolean; channels: unknown; options?: unknown; imageUrl?: string }): MenuItem {
  const temperatureSkus = new Set(["CAFE-COFFEE-AMER-MID", "CAFE-COFFEE-AMER-DARK", "CAFE-COFFEE-LATTE", "CAFE-COFFEE-CAPPUCCINO", "CAFE-COFFEE-ESPRESSO", "CAFE-COFFEE-MOCHA", "CAFE-COCOA", "CAFE-CHOCOLATE"]);
  const options = parseOptions(row.options);
  const withTemperature = temperatureSkus.has(row.sku) && !options.some((option) => option.id === DRINK_TEMPERATURE.id) ? [DRINK_TEMPERATURE, ...options] : options;
  return { id: row.id, sku: row.sku, name: row.name, categoryId: row.categoryId ?? "เมนู", priceSatang: row.priceSatang, available: row.available, channels: parseChannels(row.channels), options: withTemperature, imageUrl: row.imageUrl };
}
