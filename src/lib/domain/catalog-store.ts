import { addCatalogProduct, adjustInventory, availableForChannel, receiveInventory, recordStockCount, transferInventory, writeOffExpiredLot, type CatalogProduct, type InventoryLedgerEntry } from "./catalog-inventory";
import { DEMO_MENU, STEAK_DONENESS, STEAK_SAUCE, STEAK_SIDES, STEAK_MODIFIERS, BURGER_ADDONS, SET_COKE_CHOICE, COFFEE_BEANS, SWEETNESS, type MenuItem, type OptionGroup } from "./menu";

type CatalogState = {
  products: CatalogProduct[];
  options: Map<string, OptionGroup[]>;
  optionGroups: OptionGroup[];
  modifiers: Map<string, { id: string; name: string; priceSatang: number; productIds: string[] }>;
  ledger: InventoryLedgerEntry[];
};

/** Memory-mode catalog. Seeded with the demo menu so a fresh install can sell immediately. */
const globalCatalog = globalThis as typeof globalThis & { __fillingCatalog?: CatalogState };
const state: CatalogState = (globalCatalog.__fillingCatalog = (() => {
  const seeded: CatalogState = {
    products: [],
    options: new Map(),
    optionGroups: [
      { ...STEAK_SAUCE },
      { ...STEAK_SIDES },
      { ...STEAK_DONENESS },
      { ...STEAK_MODIFIERS },
      { ...BURGER_ADDONS },
      { ...SET_COKE_CHOICE },
      { ...COFFEE_BEANS },
      { ...SWEETNESS },
    ],
    modifiers: new Map(),
    ledger: [],
  };
  for (const item of DEMO_MENU) {
    const product = addCatalogProduct({ name: item.name, categoryId: item.categoryId, sku: item.sku, priceSatang: item.priceSatang, channels: item.channels, imageUrl: item.imageUrl });
    seeded.products.push(product);
    seeded.options.set(product.id, item.options);
  }
  return seeded;
})());

function toItem(product: CatalogProduct): MenuItem {
  return { id: product.id, sku: product.sku, name: product.name, categoryId: product.categoryId, priceSatang: product.priceSatang, available: product.available, channels: product.channels, options: state.options.get(product.id) ?? [], imageUrl: product.imageUrl };
}

export function createProduct(input: Omit<CatalogProduct, "id" | "available" | "createdAt"> & { options?: OptionGroup[] }) {
  const { options, ...rest } = input;
  const product = addCatalogProduct(rest);
  state.products.push(product);
  state.options.set(product.id, options ?? []);
  return toItem(product);
}

export function updateProduct(id: string, patch: Partial<Pick<MenuItem, "name" | "categoryId" | "priceSatang" | "available" | "channels" | "options" | "imageUrl">>) {
  const product = state.products.find((p) => p.id === id);
  if (!product) return undefined;
  const { options, ...rest } = patch;
  Object.assign(product, rest);
  if (options) state.options.set(id, options);
  return toItem(product);
}

/** All products (including unavailable ones) for menu management. */
export function listProducts() { return state.products.map(toItem); }
export function createModifier(input: { name: string; priceSatang: number; productIds: string[] }) { const modifier = { id: `modifier_${crypto.randomUUID()}`, ...input }; state.modifiers.set(modifier.id, modifier); return modifier; }
export function listMenu(channel: "POS" | "QR" | "DELIVERY", at = new Date()) { return state.products.filter((product) => availableForChannel(product, channel, at)).map(toItem); }
export function receiveStock(input: { ingredientId: string; quantity: number; unit: string; reference: string }) { state.ledger = receiveInventory(state.ledger, input); return state.ledger.at(-1)!; }
export function adjustStock(input: { ingredientId: string; quantity: number; unit: string; reason: string; reference: string }) { state.ledger = adjustInventory(state.ledger, input); return state.ledger.at(-1)!; }
export function countStock(input: { ingredientId: string; countedQuantity: number; unit: string; reference: string; location?: string }) { const before = state.ledger.length; state.ledger = recordStockCount(state.ledger, input); return state.ledger.length === before ? undefined : state.ledger.at(-1); }
export function transferStock(input: { ingredientId: string; quantity: number; unit: string; fromLocation: string; toLocation: string; reference: string }) { state.ledger = transferInventory(state.ledger, input); return state.ledger.slice(-2); }
export function expireStock(input: { ingredientId: string; quantity: number; unit: string; lotId: string; expiryDate: string; reference: string }) { state.ledger = writeOffExpiredLot(state.ledger, input); return state.ledger.at(-1)!; }
export function listInventoryLedger() { return [...state.ledger]; }

export function listOptionGroups(): OptionGroup[] {
  return state.optionGroups ? [...state.optionGroups] : [];
}

export function saveOptionGroup(group: OptionGroup): OptionGroup {
  state.optionGroups ??= [];
  const idx = state.optionGroups.findIndex((g) => g.id === group.id);
  if (idx >= 0) {
    state.optionGroups[idx] = group;
  } else {
    state.optionGroups.push(group);
  }
  return group;
}

export function deleteOptionGroup(id: string): boolean {
  state.optionGroups ??= [];
  const before = state.optionGroups.length;
  state.optionGroups = state.optionGroups.filter((g) => g.id !== id);
  return state.optionGroups.length < before;
}
