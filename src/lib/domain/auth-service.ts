import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { hashPassword, hashSessionToken, verifyPassword } from "./auth-crypto";

export async function bootstrapOwner(input: { tenantId: string; branchId: string; email: string; name: string; password: string }) {
  const user = await prisma.user.upsert({ where: { tenantId_email: { tenantId: input.tenantId, email: input.email } }, update: { name: input.name, passwordHash: hashPassword(input.password) }, create: { tenantId: input.tenantId, email: input.email, name: input.name, passwordHash: hashPassword(input.password) } });
  await prisma.posAccess.upsert({ where: { userId_branchId_role: { userId: user.id, branchId: input.branchId, role: "Owner" } }, update: {}, create: { userId: user.id, branchId: input.branchId, role: "Owner" } });
  return { id: user.id, email: user.email, name: user.name, role: "Owner", branchId: input.branchId };
}

export async function login(input: { tenantId: string; branchId: string; email: string; password: string; deviceId?: string }) {
  const user = await prisma.user.findUnique({ where: { tenantId_email: { tenantId: input.tenantId, email: input.email } } });
  if (!user?.passwordHash || !verifyPassword(input.password, user.passwordHash)) throw new Error("Invalid credentials");
  const access = await prisma.posAccess.findFirst({ where: { userId: user.id, branchId: input.branchId, ...(input.deviceId ? { OR: [{ deviceId: null }, { deviceId: input.deviceId }] } : {}) }, orderBy: { role: "asc" } });
  if (!access) throw new Error("Branch access denied");
  const token = randomBytes(32).toString("base64url");
  const session = await prisma.posSession.create({ data: { userId: user.id, branchId: input.branchId, deviceId: input.deviceId, tokenHash: hashSessionToken(token), expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000) } });
  return { token, expiresAt: session.expiresAt.toISOString(), user: { id: user.id, email: user.email, name: user.name, role: access.role, branchId: access.branchId, deviceId: access.deviceId } };
}

export async function getSession(token: string) { const session = await prisma.posSession.findUnique({ where: { tokenHash: hashSessionToken(token) }, include: { user: true, branch: true, device: true } }); if (!session || session.revokedAt || session.expiresAt <= new Date()) return undefined; const access = await prisma.posAccess.findFirst({ where: { userId: session.userId, branchId: session.branchId, ...(session.deviceId ? { OR: [{ deviceId: null }, { deviceId: session.deviceId }] } : {}) }, orderBy: { role: "asc" } }); if (!access) return undefined; return { session, user: session.user, branch: session.branch, device: session.device, role: access.role }; }
export async function revokeSession(token: string) { return prisma.posSession.updateMany({ where: { tokenHash: hashSessionToken(token), revokedAt: null }, data: { revokedAt: new Date() } }); }
