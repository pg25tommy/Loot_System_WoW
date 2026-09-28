import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Vercel's Neon marketplace integration injects a project-prefixed set of
// connection strings (e.g. `wadaloot_POSTGRES_PRISMA_URL`) instead of a
// plain DATABASE_URL, and marks them "sensitive" so they only resolve
// inside the actual build/runtime environment. Fall through the common
// names so this works whether DATABASE_URL is set directly (local dev,
// other hosts) or only the prefixed marketplace vars exist (this Vercel
// project).
function resolveDatabaseUrl(): string | undefined {
  const prefixed = Object.entries(process.env).find(
    ([key, value]) => key.endsWith("_POSTGRES_PRISMA_URL") && value,
  );

  return (
    process.env.DATABASE_URL ||
    prefixed?.[1] ||
    process.env.POSTGRES_PRISMA_URL
  );
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaPg({ connectionString: resolveDatabaseUrl() });

// Reuse the same client (and its connection pool) across warm invocations
// in every environment, not just dev — a fresh PrismaClient/pg.Pool per
// module evaluation means a fresh TCP+TLS handshake to Postgres, which is
// the single biggest avoidable cost on a serverless function.
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });
globalForPrisma.prisma = prisma;
