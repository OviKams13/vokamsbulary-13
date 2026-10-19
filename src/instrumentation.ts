/**
 * Runs once when the Next.js server starts. Importing the env module here makes
 * a missing or invalid variable fail at startup with a clear message, instead of
 * on the first request that happens to need it.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("@/lib/env");
  }
}
