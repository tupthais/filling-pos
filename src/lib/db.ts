import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { posPrisma?: PrismaClient };
const connectionString = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:55433/filling_pos?schema=public";

export const prisma = globalForPrisma.posPrisma ?? new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
if (process.env.NODE_ENV !== "production") globalForPrisma.posPrisma = prisma;
