import "server-only";

import { count, countDistinct, eq } from "drizzle-orm";
import { connection } from "next/server";
import { cache } from "react";

import { buildTotwList, type TotwSummary } from "@/lib/totw";

import { db } from "./index";
import { postRanks, posts, terms } from "./schema";

export type TotwOverview = {
  /** Every TOTW, newest first. */
  totws: TotwSummary[];
  /** The newest TOTW (also `totws[0]`). */
  current: TotwSummary;
  /** Distinct headwords across published posts. */
  wordsLearned: number;
};

/**
 * Navigation data for the app shell (4.3): the TOTW list and the sidebar
 * footer numbers. Cached per request, so the layout and the page share one
 * database round trip.
 */
export const getTotwOverview = cache(async (): Promise<TotwOverview> => {
  // Live data: render at request time, never at build time (CI has no database).
  await connection();

  const [perTotw, [words]] = await db.batch([
    db
      .select({ number: postRanks.totwNumber, count: count() })
      .from(postRanks)
      .groupBy(postRanks.totwNumber),
    db
      .select({ n: countDistinct(terms.headword) })
      .from(terms)
      .innerJoin(posts, eq(terms.postId, posts.id))
      .where(eq(posts.status, "published")),
  ]);

  const totws = buildTotwList(new Map(perTotw.map((row) => [row.number, row.count])));
  return { totws, current: totws[0]!, wordsLearned: words?.n ?? 0 };
});
