import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function masterKey() {
  const configured = process.env.SECRET_BOX_KEY ?? process.env.BOOTSTRAP_SECRET;
  if (!configured || configured.length < 32) throw new Error("SECRET_BOX_KEY must be configured with at least 32 characters.");
  return createHash("sha256").update(configured, "utf8").digest();
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return { ciphertext: ciphertext.toString("base64url"), iv: iv.toString("base64url"), authTag: cipher.getAuthTag().toString("base64url") };
}

export function decryptSecret(input: { ciphertext: string; iv: string; authTag: string }) {
  const decipher = createDecipheriv("aes-256-gcm", masterKey(), Buffer.from(input.iv, "base64url"));
  decipher.setAuthTag(Buffer.from(input.authTag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(input.ciphertext, "base64url")), decipher.final()]).toString("utf8");
}
