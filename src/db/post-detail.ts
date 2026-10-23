import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "./index";
import { explanations, postRanks, posts, terms, type Explanation } from "./schema";

export type PostDetailTerm = {
  id: string;
  position: number;
  surface: string;
  headword: string;
  /** English explanation (6.3); null if it doesn't exist (yet). */
  explanation: Explanation | null;
  /** French version (8.1), once Translate was clicked for this term; null before. */
  french: Explanation | null;
};

export type PostDetail = {
  id: string;
  text: string;
  /** French post text (8.3), once a first Translate made it; null before. */
  textFr: string | null;
  themeKey: string;
  totwNumber: number;
  /** 1–15 inside its TOTW. */
  position: number;
  /** In `terms.position` order (the tab order, 6.2). */
  terms: PostDetailTerm[];
};

const fr = alias(explanations, "fr");

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPostId(value: string): boolean {
  return UUID.test(value);
}

/**
 * A published post with its TOTW place, its terms, their English
 * explanations (6.1–6.3) and the French ones already generated (8.2). One `db.batch`, so one round trip. Returns null for
 * an unknown id or a post that isn't published (drafts have no TOTW place).
 */
export async function getPostDetail(id: string): Promise<PostDetail | null> {
  if (!isPostId(id)) return null;

  const [[post], termRows] = await db.batch([
    db
      .select({
        id: posts.id,
        text: posts.text,
        textFr: posts.textFr,
        themeKey: posts.themeKey,
        totwNumber: postRanks.totwNumber,
        position: postRanks.totwPosition,
      })
      .from(postRanks)
      .innerJoin(posts, eq(posts.id, postRanks.postId))
      .where(eq(postRanks.postId, id)),
    db
      .select({
        id: terms.id,
        position: terms.position,
        surface: terms.surface,
        headword: terms.headword,
        explanation: explanations,
        french: fr,
      })
      .from(terms)
      .leftJoin(
        explanations,
        and(eq(explanations.termId, terms.id), eq(explanations.language, "en")),
      )
      .leftJoin(fr, and(eq(fr.termId, terms.id), eq(fr.language, "fr")))
      .where(eq(terms.postId, id))
      .orderBy(asc(terms.position)),
  ]);

  if (!post) return null;
  return {
    id: post.id,
    // Published posts always have text and theme (CHECK constraints).
    text: post.text ?? "",
    textFr: post.textFr,
    themeKey: post.themeKey ?? "",
    totwNumber: post.totwNumber,
    position: post.position,
    terms: termRows,
  };
}
