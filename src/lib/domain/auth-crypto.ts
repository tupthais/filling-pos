import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

export function hashPassword(password: string) { const salt = randomBytes(16); const key = scryptSync(password, salt, 32, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P }); return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("base64url")}$${key.toString("base64url")}`; }
export function verifyPassword(password: string, stored: string) { try { const [algorithm, n, r, p, encodedSalt, encodedKey] = stored.split("$"); if (algorithm !== "scrypt" || !encodedSalt || !encodedKey) return false; const salt = Buffer.from(encodedSalt, "base64url"); const expected = Buffer.from(encodedKey, "base64url"); const actual = scryptSync(password, salt, expected.length, { N: Number(n), r: Number(r), p: Number(p) }); return expected.length === actual.length && timingSafeEqual(expected, actual); } catch { return false; } }
export function hashSessionToken(token: string) { return createHash("sha256").update(token).digest("hex"); }
