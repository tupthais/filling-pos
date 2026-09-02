import { describe, expect, it, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "../proxy";

describe("database mode API boundary", () => {
  const previous = process.env.POS_PERSISTENCE_MODE;
  afterEach(() => { process.env.POS_PERSISTENCE_MODE = previous; });

  it("rejects private API requests without a session cookie", () => {
    process.env.POS_PERSISTENCE_MODE = "database";
    const response = proxy(new NextRequest("http://localhost/api/orders"));
    expect(response.status).toBe(401);
  });

  it("keeps health and QR discovery endpoints public", () => {
    process.env.POS_PERSISTENCE_MODE = "database";
    expect(proxy(new NextRequest("http://localhost/api/health")).status).toBe(200);
    expect(proxy(new NextRequest("http://localhost/api/qr/tables/demo")).status).toBe(200);
  });
});
