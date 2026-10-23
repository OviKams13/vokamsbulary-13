import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "./index";
import { postRanks, posts, terms } from "./schema";

/** A published post that already has the headword: "Already seen in TOTW n · #m" (F14). */
export type SeenIn = { postId: string; totwNumber: number; position: number; count: number };

/**
 * Already-seen check (7.7, ERD §5.3): for each headword, the published posts
 * that already have it, by exact headword match (the `terms_headword_idx`
 * index). Drafts never count. When a word was seen several times, the most
 * recent post is the one linked, and `count` says how many there are.
 */
export async function findAlreadySeen(headwords: string[]): Promise<Record<string, SeenIn>> {
  const wanted = [...new Set(headwords.map((word) => word.trim().toLowerCase()).filter(Boolean))];
  if (wanted.length === 0) return {};

  const rows = await db
    .select({
      headword: terms.headword,
      postId: posts.id,
      totwNumber: postRanks.totwNumber,
      position: postRanks.totwPosition,
    })
    .from(terms)
    .innerJoin(posts, and(eq(posts.id, terms.postId), eq(posts.status, "published")))
    .innerJoin(postRanks, eq(postRanks.postId, posts.id))
    .where(inArray(terms.headword, wanted))
    .orderBy(desc(postRanks.rank));

  const seen: Record<string, SeenIn> = {};
  for (const row of rows) {
    const known = seen[row.headword];
    if (known) known.count += 1;
    else seen[row.headword] = { ...row, count: 1 };
  }
  return seen;
}
