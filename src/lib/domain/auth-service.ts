import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { hashPassword, hashSessionToken, verifyPassword } from "./auth-crypto";

export class TenantSelectionRequiredError extends Error {
  constructor(public readonly shops: Array<{ tenantId: string; name: string; branches: Array<{ branchId: string; name: string; code: string }> }>) {
    super("This account belongs to multiple shops; select a shop to continue");
    this.name = "TenantSelectionRequiredError";
  }
}

export class BranchSelectionRequiredError extends Error {
  constructor(public readonly branches: Array<{ branchId: string; name: string; code: string }>) {
    super("This account has access to multiple branches; select a branch to continue");
    this.name = "BranchSelectionRequiredError";
  }
}

export async function bootstrapOwner(input: { tenantId: string; branchId: string; email: string; name: string; password: string }) {
  const user = await prisma.user.upsert({ where: { tenantId_email: { tenantId: input.tenantId, email: input.email } }, update: { name: input.name, passwordHash: hashPassword(input.password) }, create: { tenantId: input.tenantId, email: input.email, name: input.name, passwordHash: hashPassword(input.password) } });
  await prisma.posAccess.upsert({ where: { userId_branchId_role: { userId: user.id, branchId: input.branchId, role: "Owner" } }, update: {}, create: { userId: user.id, branchId: input.branchId, role: "Owner" } });
  return { id: user.id, email: user.email, name: user.name, role: "Owner", branchId: input.branchId };
}

export async function login(input: { tenantId?: string; branchId?: string; email: string; password: string; deviceId?: string; rememberMe?: boolean }) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const candidates = input.tenantId
    ? await prisma.user.findMany({ where: { tenantId: input.tenantId, email: normalizedEmail }, take: 1 })
    : await prisma.user.findMany({ where: { email: normalizedEmail }, take: 10 });
  const matchingUsers = candidates.filter((candidate) => candidate.passwordHash && verifyPassword(input.password, candidate.passwordHash));
  if (matchingUsers.length === 0) throw new Error("Invalid credentials");
  if (matchingUsers.length > 1) {
    const tenantIds = matchingUsers.map((candidate) => candidate.tenantId);
    const [tenants, accesses] = await Promise.all([
      prisma.tenant.findMany({ where: { id: { in: tenantIds } }, select: { id: true, name: true } }),
      prisma.posAccess.findMany({ where: { userId: { in: matchingUsers.map((candidate) => candidate.id) } }, include: { branch: true }, orderBy: { createdAt: "asc" } }),
    ]);
    const shops = tenants.map((tenant) => ({
      tenantId: tenant.id,
      name: tenant.name,
      branches: accesses.filter((access) => access.branch.tenantId === tenant.id).map((access) => ({ branchId: access.branch.id, name: access.branch.name, code: access.branch.code })),
    })).filter((shop) => shop.branches.length > 0);
    throw new TenantSelectionRequiredError(shops);
  }
  const user = matchingUsers[0];
  const accesses = await prisma.posAccess.findMany({
    where: { userId: user.id, ...(input.branchId ? { branchId: input.branchId } : {}), ...(input.deviceId ? { OR: [{ deviceId: null }, { deviceId: input.deviceId }] } : {}) },
    include: { branch: true },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });
  const branchChoices = accesses
    .filter((candidate) => candidate.branch.tenantId === user.tenantId)
    .map((candidate) => ({ branchId: candidate.branch.id, name: candidate.branch.name, code: candidate.branch.code }));
  const uniqueBranches = [...new Map(branchChoices.map((branch) => [branch.branchId, branch])).values()];
  if (!input.branchId && uniqueBranches.length > 1) throw new BranchSelectionRequiredError(uniqueBranches);
  const access = accesses.find((candidate) => candidate.branch.tenantId === user.tenantId && (!input.branchId || candidate.branchId === input.branchId));
  if (!access) throw new Error("Branch access denied");
  const token = randomBytes(32).toString("base64url");
  const selectedBranchId = access.branch.id;
  const session = await prisma.posSession.create({ data: { userId: user.id, branchId: selectedBranchId, deviceId: input.deviceId, tokenHash: hashSessionToken(token), expiresAt: input.rememberMe === false ? new Date(Date.now() + 12 * 60 * 60 * 1000) : null } });
  return { token, expiresAt: session.expiresAt?.toISOString() ?? null, user: { id: user.id, email: user.email, name: user.name, role: access.role, branchId: selectedBranchId, deviceId: access.deviceId } };
}

export async function getSession(token: string) { const session = await prisma.posSession.findUnique({ where: { tokenHash: hashSessionToken(token) }, include: { user: true, branch: true, device: true } }); if (!session || session.revokedAt || (session.expiresAt && session.expiresAt <= new Date())) return undefined; const access = await prisma.posAccess.findFirst({ where: { userId: session.userId, branchId: session.branchId, ...(session.deviceId ? { OR: [{ deviceId: null }, { deviceId: session.deviceId }] } : {}) }, orderBy: { role: "asc" } }); if (!access) return undefined; return { session, user: session.user, branch: session.branch, device: session.device, role: access.role }; }
export async function revokeSession(token: string) { return prisma.posSession.updateMany({ where: { tokenHash: hashSessionToken(token), revokedAt: null }, data: { revokedAt: new Date() } }); }
