import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword, hashSessionToken } from "@/lib/domain/auth-crypto";

describe("authentication cryptography", () => {
  it("verifies a password without storing plaintext", () => {
    const stored = hashPassword("correct horse battery staple");
    expect(stored).not.toContain("correct horse");
    expect(verifyPassword("correct horse battery staple", stored)).toBe(true);
    expect(verifyPassword("wrong password", stored)).toBe(false);
  });

  it("hashes session tokens deterministically for lookup", () => {
    expect(hashSessionToken("token-1")).toBe(hashSessionToken("token-1"));
    expect(hashSessionToken("token-1")).not.toBe(hashSessionToken("token-2"));
  });
});
