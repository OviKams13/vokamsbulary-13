import "server-only";

import { and, count, eq, gt, isNull, sql } from "drizzle-orm";

import { db } from "./index";
import { aiCalls, posts } from "./schema";

/** At most this many extraction calls (call #1) per minute (7.11, feasibility §9.3). */
export const EXTRACT_LIMIT_PER_MINUTE = 5;

/**
 * Upload rate limit (7.11), read from the database, so it holds across every
 * serverless instance. It counts the extraction calls of the last minute in
 * `ai_calls` (E-04), plus the extractions still running: their `ai_calls` row
 * is only written when the call ends, and a burst of uploads would otherwise
 * all pass before the first one is logged. A running extraction is an
 * `uploaded` draft without `last_error`, created or retried in the last minute.
 */
export async function isExtractLimitReached(): Promise<boolean> {
  const since = sql`now() - interval '1 minute'`;
  const [[logged], [running]] = await db.batch([
    db
      .select({ n: count() })
      .from(aiCalls)
      .where(and(eq(aiCalls.kind, "extract"), gt(aiCalls.createdAt, since))),
    db
      .select({ n: count() })
      .from(posts)
      .where(
        and(eq(posts.status, "uploaded"), isNull(posts.lastError), gt(posts.updatedAt, since)),
      ),
  ]);
  return (logged?.n ?? 0) + (running?.n ?? 0) >= EXTRACT_LIMIT_PER_MINUTE;
}

export const RATE_LIMIT_MESSAGE = `That's ${EXTRACT_LIMIT_PER_MINUTE} screenshots in a minute, the limit. Wait a moment, then try again.`;
