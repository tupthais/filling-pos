import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export async function listPersistedJobs() { return prisma.posJob.findMany({ orderBy: { updatedAt: "desc" }, take: 200 }); }
export async function retryPersistedJob(id: string, error = "manual retry") { const job = await prisma.posJob.findUnique({ where: { id } }); if (!job) throw new Error("Job not found"); if (job.attempts >= job.maxAttempts) throw new Error("Maximum retry attempts reached"); return prisma.posJob.update({ where: { id }, data: { status: "QUEUED", attempts: { increment: 1 }, lastError: error, nextAttemptAt: new Date() } }); }
export async function createPersistedIncident(input: { branchId: string; severity: string; title: string; description: string; metadata?: unknown }) { return prisma.posIncident.create({ data: { ...input, metadata: input.metadata as Prisma.InputJsonValue | undefined } }); }
export async function listPersistedIncidents() { return prisma.posIncident.findMany({ orderBy: { createdAt: "desc" }, take: 200 }); }
export async function resolvePersistedIncident(id: string) { return prisma.posIncident.update({ where: { id }, data: { status: "RESOLVED", resolvedAt: new Date() } }); }
