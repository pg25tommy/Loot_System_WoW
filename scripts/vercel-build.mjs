import { execSync } from "node:child_process";

// Vercel's Neon marketplace integration injects project-prefixed,
// "sensitive" connection strings (e.g. `wadaloot_DATABASE_URL_UNPOOLED`)
// that only resolve inside the actual build environment — they can't be
// read locally via `vercel env pull`. Migrations need a direct (non-pooled)
// connection, so find that one specifically for this step; the app's own
// runtime connection resolution (pooled) lives in src/lib/db.ts.
function resolveMigrationDatabaseUrl() {
  const directEntry = Object.entries(process.env).find(
    ([key, value]) =>
      value &&
      (key.endsWith("_DATABASE_URL_UNPOOLED") || key.endsWith("_POSTGRES_URL_NON_POOLING")),
  );

  return process.env.DATABASE_URL || directEntry?.[1];
}

const databaseUrl = resolveMigrationDatabaseUrl();

if (!databaseUrl) {
  console.error(
    "No database connection string found (checked DATABASE_URL and *_DATABASE_URL_UNPOOLED / " +
      "*_POSTGRES_URL_NON_POOLING). Skipping migrate/seed.",
  );
} else {
  const env = { ...process.env, DATABASE_URL: databaseUrl };
  console.log("Running database migrations...");
  execSync("npx prisma migrate deploy", { stdio: "inherit", env });
  // Deliberately NOT re-running the seed script here. seed.ts upserts
  // BracketConfig/RankTier/GatherableValueBracket by their hardcoded
  // defaults on every run — running it on every deploy was silently
  // reverting any config officers had customized through the UI back to
  // those defaults. Seeding is now a one-time/as-needed manual step
  // (`npm run db:seed`) instead of part of the regular deploy pipeline.
}

console.log("Building Next.js app...");
execSync("next build", { stdio: "inherit" });
