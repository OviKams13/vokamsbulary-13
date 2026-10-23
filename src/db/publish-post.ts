import "server-only";

import { randomInt } from "node:crypto";

import { and, count, desc, eq, isNotNull } from "drizzle-orm";

import { THEMES } from "@/themes";

import { db } from "./index";
import { explanations, posts, terms } from "./schema";

export type PublishResult =
  { ok: true; themeKey: string } | { ok: false; reason: "missing" | "not-ready" };

/**
 * Publishes an explained draft (7.9, ERD §6 step 5): a random theme that is
 * never the previous post's (ERD §5.2), `published_at` = now, status
 * `published`. From then on `post_ranks` gives it its TOTW place.
 *
 * Only an `explained` draft whose every term has its English explanation can
 * be published; the update is conditional, so a double click publishes once.
 */
export async function publishPost(id: string): Promise<PublishResult> {
  const [[post], [termCount], [explainedCount], [previous]] = await db.batch([
    db.select({ status: posts.status, text: posts.text }).from(posts).where(eq(posts.id, id)),
    db.select({ n: count() }).from(terms).where(eq(terms.postId, id)),
    db
      .select({ n: count() })
      .from(explanations)
      .innerJoin(terms, eq(terms.id, explanations.termId))
      .where(and(eq(terms.postId, id), eq(explanations.language, "en"))),
    db
      .select({ themeKey: posts.themeKey })
      .from(posts)
      .where(and(eq(posts.status, "published"), isNotNull(posts.publishedAt)))
      .orderBy(desc(posts.publishedAt), desc(posts.id))
      .limit(1),
  ]);
  if (!post) return { ok: false, reason: "missing" };
  const termTotal = termCount?.n ?? 0;
  if (
    post.status !== "explained" ||
    !post.text ||
    termTotal === 0 ||
    explainedCount?.n !== termTotal
  ) {
    return { ok: false, reason: "not-ready" };
  }

  const choices = THEMES.filter((theme) => theme.key !== previous?.themeKey);
  const themeKey = choices[randomInt(choices.length)]!.key;
  const now = new Date();

  const updated = await db
    .update(posts)
    .set({ status: "published", themeKey, publishedAt: now, lastError: null, updatedAt: now })
    .where(and(eq(posts.id, id), eq(posts.status, "explained")))
    .returning({ id: posts.id });
  return updated.length > 0 ? { ok: true, themeKey } : { ok: false, reason: "not-ready" };
}
