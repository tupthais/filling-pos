import { addCatalogProduct, adjustInventory, availableForChannel, receiveInventory, recordStockCount, transferInventory, writeOffExpiredLot, type CatalogProduct, type InventoryLedgerEntry } from "./catalog-inventory";

const products: CatalogProduct[] = [];
const modifiers = new Map<string, { id: string; name: string; priceSatang: number; productIds: string[] }>();
let ledger: InventoryLedgerEntry[] = [];
export function createProduct(input: Omit<CatalogProduct, "id" | "available" | "createdAt">) { const product = addCatalogProduct(input); products.push(product); return product; }
export function listProducts() { return [...products]; }
export function createModifier(input: { name: string; priceSatang: number; productIds: string[] }) { const modifier = { id: `modifier_${crypto.randomUUID()}`, ...input }; modifiers.set(modifier.id, modifier); return modifier; }
export function listMenu(channel: "POS" | "QR" | "DELIVERY", at = new Date()) { return products.filter((product) => availableForChannel(product, channel, at)); }
export function receiveStock(input: { ingredientId: string; quantity: number; unit: string; reference: string }) { ledger = receiveInventory(ledger, input); return ledger.at(-1)!; }
export function adjustStock(input: { ingredientId: string; quantity: number; unit: string; reason: string; reference: string }) { ledger = adjustInventory(ledger, input); return ledger.at(-1)!; }
export function countStock(input: { ingredientId: string; countedQuantity: number; unit: string; reference: string; location?: string }) { const before = ledger.length; ledger = recordStockCount(ledger, input); return ledger.length === before ? undefined : ledger.at(-1); }
export function transferStock(input: { ingredientId: string; quantity: number; unit: string; fromLocation: string; toLocation: string; reference: string }) { ledger = transferInventory(ledger, input); return ledger.slice(-2); }
export function expireStock(input: { ingredientId: string; quantity: number; unit: string; lotId: string; expiryDate: string; reference: string }) { ledger = writeOffExpiredLot(ledger, input); return ledger.at(-1)!; }
export function listInventoryLedger() { return [...ledger]; }
