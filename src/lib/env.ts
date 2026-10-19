import "server-only";

import { z } from "zod";

/**
 * Server environment, validated once with zod.
 *
 * Every variable here is required: the app refuses to start when one is missing
 * (see `src/instrumentation.ts`). A variable is added to the schema by the
 * sub-point that creates its service, so each deployment only requires what
 * actually exists at that point of the plan:
 *
 * - DATABASE_URL           → 2.7 (Neon, via `vercel env pull`)
 * - BLOB_READ_WRITE_TOKEN  → 2.9 (Vercel Blob)
 * - ANTHROPIC_API_KEY      → 2.10 (Claude client)
 * - ACCESS_CODE, ACCESS_COOKIE_SECRET → Phase 3 (access code)
 *
 * `.env.example` already lists all of them with empty values.
 * Never prefix a secret with NEXT_PUBLIC_.
 */
const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type ServerEnv = z.infer<typeof serverSchema>;

function parseEnv(): ServerEnv {
  const result = serverSchema.safeParse(process.env);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment variables:\n${problems}\n` +
        "Check .env.local (local) or the Vercel project settings (deployed). " +
        "See .env.example for the full list.",
    );
  }
  return result.data;
}

export const env: ServerEnv = parseEnv();
