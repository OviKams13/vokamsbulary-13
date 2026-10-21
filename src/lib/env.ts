import "server-only";

import { z } from "zod";

/**
 * Server environment, validated once with zod.
 *
 * Every variable here is required: the app refuses to start when one is missing
 * (see `src/instrumentation.ts`). A variable is added to the schema by the
 * sub-point whose code first needs it, so each deployment only requires what
 * actually exists at that point of the plan:
 *
 * - DATABASE_URL           → 2.8 (Neon, pooled; used by `src/db`)
 * - ANTHROPIC_API_KEY      → 2.10 (Claude client)
 * - ACCESS_CODE, ACCESS_COOKIE_SECRET → 3.1 (access code)
 * - BLOB_STORE_ID (Vercel Production, OIDC) or BLOB_READ_WRITE_TOKEN (local,
 *   Preview): at least one → 6.4 (deleting a post's screenshot, the first Blob
 *   call). `@vercel/blob` reads them itself; this only checks one is there.
 *
 * DATABASE_URL_UNPOOLED is only read by drizzle-kit (`drizzle.config.ts`), never
 * by the running app, so it is not part of this schema.
 *
 * `.env.example` lists every variable with an empty value.
 * Never prefix a secret with NEXT_PUBLIC_.
 */
const serverSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    ANTHROPIC_API_KEY: z.string().min(1),
    /** The code typed once per device (F1). Any length (X-06). */
    ACCESS_CODE: z.string().min(1),
    /** HMAC key that signs the access cookie. 32+ characters of random data. */
    ACCESS_COOKIE_SECRET: z.string().min(32),
    /** Prod Blob store, used through OIDC (set by Vercel on Production). */
    BLOB_STORE_ID: z.string().min(1).optional(),
    /** Dev Blob store token (local and Preview). */
    BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
  })
  .refine((vars) => Boolean(vars.BLOB_STORE_ID || vars.BLOB_READ_WRITE_TOKEN), {
    path: ["BLOB_STORE_ID | BLOB_READ_WRITE_TOKEN"],
    message: "one of them is required (Vercel Blob)",
  });

export type ServerEnv = z.infer<typeof serverSchema>;

function parseEnv(): ServerEnv {
  const result = serverSchema.safeParse(process.env);
  if (!result.success) {
    // Only the variable name and the rule are printed, never the value.
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
