import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
      url: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:55433/filling_pos?schema=public",
  },
  migrations: {
    path: "prisma/migrations",
  },
});
