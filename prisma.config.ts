import "dotenv/config";
import { defineConfig } from "prisma/config";

// Vercel's Neon marketplace integration injects project-prefixed connection
// strings (e.g. `wadaloot_DATABASE_URL_UNPOOLED`) instead of a plain
// DATABASE_URL. `prisma generate` runs in `postinstall`, before any custom
// build step gets a chance to set DATABASE_URL explicitly, so resolve it
// here directly rather than via the strict `env()` helper (which throws if
// the literal key is absent — even for commands like `generate` that don't
// need a live connection at all).
function resolveDatabaseUrl(): string {
  const fallback = Object.entries(process.env).find(
    ([key, value]) =>
      value &&
      /_(DATABASE_URL_UNPOOLED|POSTGRES_URL_NON_POOLING|POSTGRES_PRISMA_URL|DATABASE_URL)$/.test(key),
  );
  return process.env.DATABASE_URL || fallback?.[1] || "";
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: resolveDatabaseUrl(),
  },
});
