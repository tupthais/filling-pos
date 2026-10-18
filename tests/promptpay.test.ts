import { describe, expect, it } from "vitest";
import { generatePromptPayPayload } from "@/lib/domain/promptpay";

describe("Thai QR PromptPay Generator", () => {
  it("generates dynamic PromptPay QR payload for mobile number with amount", () => {
    const payload = generatePromptPayPayload("0812345678", 12550); // 125.50 THB
    expect(payload).toContain("000201"); // version
    expect(payload).toContain("010212"); // dynamic
    expect(payload).toContain("A000000677010111"); // PromptPay AID
    expect(payload).toContain("0066812345678"); // formatted phone
    expect(payload).toContain("5303764"); // THB
    expect(payload).toContain("5406125.50"); // amount
    expect(payload).toContain("5802TH"); // country
    expect(payload).toMatch(/6304[A-F0-9]{4}$/); // CRC16-CCITT
  });

  it("generates static PromptPay QR payload for 13-digit Tax ID without amount", () => {
    const payload = generatePromptPayPayload("0105558000000");
    expect(payload).toContain("010211"); // static
    expect(payload).toContain("0105558000000");
    expect(payload).not.toContain("540");
    expect(payload).toMatch(/6304[A-F0-9]{4}$/);
  });
});
