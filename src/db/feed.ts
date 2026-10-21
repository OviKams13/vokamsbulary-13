import "server-only";

import { asc, desc, eq } from "drizzle-orm";

import { db } from "./index";
import { postRanks, posts, terms } from "./schema";

/** Everything a post card needs (5.2). */
export type FeedPost = {
  id: string;
  text: string;
  themeKey: string;
  publishedAt: Date;
  totwNumber: number;
  /** 1–15 inside its TOTW. */
  position: number;
  /** In term order (`terms.position`). */
  terms: { surface: string; headword: string }[];
};

/**
 * Published posts of one TOTW, newest first (5.3, mockup 01), with their
 * terms. Two queries in one `db.batch`, so one round trip to Neon.
 */
export async function getTotwFeed(totwNumber: number): Promise<FeedPost[]> {
  const [postRows, termRows] = await db.batch([
    db
      .select({
        id: posts.id,
        text: posts.text,
        themeKey: posts.themeKey,
        publishedAt: posts.publishedAt,
        position: postRanks.totwPosition,
      })
      .from(postRanks)
      .innerJoin(posts, eq(posts.id, postRanks.postId))
      .where(eq(postRanks.totwNumber, totwNumber))
      .orderBy(desc(postRanks.totwPosition)),
    db
      .select({ postId: terms.postId, surface: terms.surface, headword: terms.headword })
      .from(terms)
      .innerJoin(postRanks, eq(postRanks.postId, terms.postId))
      .where(eq(postRanks.totwNumber, totwNumber))
      .orderBy(asc(terms.position)),
  ]);

  const termsByPost = Map.groupBy(termRows, (row) => row.postId);

  return postRows.map((row) => ({
    id: row.id,
    // Published posts always have text, theme and date (CHECK constraints).
    text: row.text ?? "",
    themeKey: row.themeKey ?? "",
    publishedAt: row.publishedAt ?? new Date(0),
    totwNumber,
    position: row.position,
    terms: (termsByPost.get(row.id) ?? []).map(({ surface, headword }) => ({ surface, headword })),
  }));
}
