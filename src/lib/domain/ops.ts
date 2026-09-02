export type OpsJob = { id: string; branchId: string; type: string; status: "QUEUED" | "RUNNING" | "FAILED" | "COMPLETED"; attempts: number; maxAttempts: number; lastError?: string; nextAttemptAt?: string; idempotencyKey: string; createdAt: string; updatedAt: string };
export type Incident = { id: string; branchId: string; severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; status: "OPEN" | "RESOLVED"; title: string; description: string; createdAt: string; resolvedAt?: string };

const jobs = new Map<string, OpsJob>();
const incidents = new Map<string, Incident>();
export function enqueueJob(input: { branchId: string; type: string; idempotencyKey: string }) { const existing = [...jobs.values()].find((job) => job.idempotencyKey === input.idempotencyKey); if (existing) return existing; const now = new Date().toISOString(); const job: OpsJob = { ...input, id: `job_${crypto.randomUUID()}`, status: "QUEUED", attempts: 0, maxAttempts: 5, createdAt: now, updatedAt: now }; jobs.set(job.id, job); return job; }
export function listJobs() { return [...jobs.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); }
export function retryJob(id: string, error = "manual retry") { const job = jobs.get(id); if (!job) throw new Error("Job not found"); if (job.attempts >= job.maxAttempts) throw new Error("Maximum retry attempts reached"); job.status = "QUEUED"; job.attempts += 1; job.lastError = error; job.nextAttemptAt = new Date().toISOString(); job.updatedAt = new Date().toISOString(); return job; }
export function createIncident(input: Omit<Incident, "id" | "status" | "createdAt">) { const incident: Incident = { ...input, id: `incident_${crypto.randomUUID()}`, status: "OPEN", createdAt: new Date().toISOString() }; incidents.set(incident.id, incident); return incident; }
export function listIncidents() { return [...incidents.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
export function resolveIncident(id: string) { const incident = incidents.get(id); if (!incident) throw new Error("Incident not found"); incident.status = "RESOLVED"; incident.resolvedAt = new Date().toISOString(); return incident; }
