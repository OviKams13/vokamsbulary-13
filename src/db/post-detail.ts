import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "./index";
import { explanations, postRanks, posts, terms, type Explanation } from "./schema";

export type PostDetailTerm = {
  position: number;
  surface: string;
  headword: string;
  /** English explanation (6.3); null if it doesn't exist (yet). */
  explanation: Explanation | null;
};

export type PostDetail = {
  id: string;
  text: string;
  themeKey: string;
  totwNumber: number;
  /** 1–15 inside its TOTW. */
  position: number;
  /** In `terms.position` order (the tab order, 6.2). */
  terms: PostDetailTerm[];
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPostId(value: string): boolean {
  return UUID.test(value);
}

/**
 * A published post with its TOTW place, its terms and their English
 * explanations (6.1–6.3). One `db.batch`, so one round trip. Returns null for
 * an unknown id or a post that isn't published (drafts have no TOTW place).
 */
export async function getPostDetail(id: string): Promise<PostDetail | null> {
  if (!isPostId(id)) return null;

  const [[post], termRows] = await db.batch([
    db
      .select({
        id: posts.id,
        text: posts.text,
        themeKey: posts.themeKey,
        totwNumber: postRanks.totwNumber,
        position: postRanks.totwPosition,
      })
      .from(postRanks)
      .innerJoin(posts, eq(posts.id, postRanks.postId))
      .where(eq(postRanks.postId, id)),
    db
      .select({
        position: terms.position,
        surface: terms.surface,
        headword: terms.headword,
        explanation: explanations,
      })
      .from(terms)
      .leftJoin(
        explanations,
        and(eq(explanations.termId, terms.id), eq(explanations.language, "en")),
      )
      .where(eq(terms.postId, id))
      .orderBy(asc(terms.position)),
  ]);

  if (!post) return null;
  return {
    id: post.id,
    // Published posts always have text and theme (CHECK constraints).
    text: post.text ?? "",
    themeKey: post.themeKey ?? "",
    totwNumber: post.totwNumber,
    position: post.position,
    terms: termRows,
  };
}
