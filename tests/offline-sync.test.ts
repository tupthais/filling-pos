import { describe, expect, it } from "vitest";
import { acknowledgeSync, enqueueOfflineOrder, getSyncRecord } from "@/lib/domain/offline-sync";

describe("offline sync", () => {
  it("acknowledges the same local order repeatedly without duplication", () => {
    const record = enqueueOfflineOrder({ localOrderId: "local-1", deviceId: "pos-1", payload: { totalSatang: 1000 } });
    expect(acknowledgeSync(record.localOrderId, { serverOrderId: "ord-1" })).toEqual(acknowledgeSync(record.localOrderId, { serverOrderId: "ord-1" }));
    expect(getSyncRecord(record.localOrderId)?.status).toBe("ACKED");
  });

  it("surfaces a conflict instead of overwriting the local record", () => {
    const record = enqueueOfflineOrder({ localOrderId: "local-2", deviceId: "pos-1", payload: { totalSatang: 1000 } });
    const conflict = acknowledgeSync(record.localOrderId, { conflict: "server version differs" });
    expect(conflict.status).toBe("CONFLICT");
    expect(conflict.conflictReason).toBe("server version differs");
  });
});
