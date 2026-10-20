import { existsSync } from "node:fs";

import { defineConfig } from "drizzle-kit";

// drizzle-kit runs outside Next.js, so it loads `.env.local` itself (local only).
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

// Migrations need a direct connection: Neon's pooler (PgBouncer) does not keep
// session state between statements.
const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) {
  throw new Error(
    "DATABASE_URL_UNPOOLED is missing. Add the direct connection string of the Neon " +
      "`dev` branch to .env.local (see .env.example).",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
