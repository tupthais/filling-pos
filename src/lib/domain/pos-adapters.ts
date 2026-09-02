export type AdapterResult = { ok: true; reference: string } | { ok: false; code: string; message: string; retryable: boolean };
export type AdapterContext = { tenantId: string; branchId: string; idempotencyKey: string };

export interface LoyaltyAdapter { addPoints(input: AdapterContext & { customerId: string; points: number }): Promise<AdapterResult>; reversePoints(input: AdapterContext & { customerId: string; points: number }): Promise<AdapterResult>; }
export interface DeliveryConnector { submitOrder(input: AdapterContext & { externalOrderNumber: string; payload: unknown }): Promise<AdapterResult>; }
export interface SupplierConnector { sendPurchaseDraft(input: AdapterContext & { supplierId: string; draft: unknown }): Promise<AdapterResult>; }
export interface LineMessagingAdapter { sendReport(input: AdapterContext & { recipient: string; message: string }): Promise<AdapterResult>; }
export interface TaxDocumentAdapter { createDocument(input: AdapterContext & { document: unknown }): Promise<AdapterResult>; }
export interface PrinterAdapter { print(input: AdapterContext & { job: unknown }): Promise<AdapterResult>; }
export interface CashDrawerAdapter { open(input: AdapterContext & { reason: string }): Promise<AdapterResult>; }
export interface McpToolGateway { execute(input: AdapterContext & { tool: string; mode: "read" | "draft" | "approval"; payload: unknown }): Promise<AdapterResult>; }
export interface IoTDeviceGateway { publish(input: AdapterContext & { deviceId: string; topic: string; payload: unknown }): Promise<AdapterResult>; }

export class MockAdapter implements LoyaltyAdapter, DeliveryConnector, SupplierConnector, LineMessagingAdapter, TaxDocumentAdapter, PrinterAdapter, CashDrawerAdapter, McpToolGateway, IoTDeviceGateway {
  private seen = new Set<string>();
  async addPoints(input: AdapterContext & { customerId: string; points: number }) { return this.accept(input.idempotencyKey); }
  async reversePoints(input: AdapterContext & { customerId: string; points: number }) { return this.accept(input.idempotencyKey); }
  async submitOrder(input: AdapterContext & { externalOrderNumber: string; payload: unknown }) { return this.accept(input.idempotencyKey); }
  async sendPurchaseDraft(input: AdapterContext & { supplierId: string; draft: unknown }) { return this.accept(input.idempotencyKey); }
  async sendReport(input: AdapterContext & { recipient: string; message: string }) { return this.accept(input.idempotencyKey); }
  async createDocument(input: AdapterContext & { document: unknown }) { return this.accept(input.idempotencyKey); }
  async print(input: AdapterContext & { job: unknown }) { return this.accept(input.idempotencyKey); }
  async open(input: AdapterContext & { reason: string }) { return this.accept(input.idempotencyKey); }
  async execute(input: AdapterContext & { tool: string; mode: "read" | "draft" | "approval"; payload: unknown }) { return this.accept(input.idempotencyKey); }
  async publish(input: AdapterContext & { deviceId: string; topic: string; payload: unknown }) { return this.accept(input.idempotencyKey); }
  private accept(key: string): AdapterResult { if (this.seen.has(key)) return { ok: true, reference: `mock-replayed:${key}` }; this.seen.add(key); return { ok: true, reference: `mock:${key}` }; }
}
