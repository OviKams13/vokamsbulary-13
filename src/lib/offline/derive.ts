import type { FeedPost } from "@/db/feed";
import type { TotwOverview } from "@/db/totw";
import { buildTotwList, type QuickListItem } from "@/lib/totw";

import type { CopyPost, OfflineCopy } from "./copy";

/**
 * What each page needs, computed from the offline copy (14.2) the way the
 * server queries compute it from the database: same rules, same shapes, so
 * the pages render the same components.
 */

/** Sidebar data (= `getTotwOverview()`): TOTW list newest first, distinct headwords. */
export function overviewFromCopy(copy: OfflineCopy): TotwOverview {
  const counts = new Map<number, number>();
  const headwords = new Set<string>();
  for (const post of copy.posts) {
    counts.set(post.totwNumber, (counts.get(post.totwNumber) ?? 0) + 1);
    for (const term of post.terms) headwords.add(term.headword);
  }
  const totws = buildTotwList(counts);
  return { totws, current: totws[0]!, wordsLearned: headwords.size };
}

/** One TOTW's posts, newest first (= `getTotwFeed()`). */
export function feedFromCopy(copy: OfflineCopy, totwNumber: number): FeedPost[] {
  return copy.posts
    .filter((post) => post.totwNumber === totwNumber)
    .sort((a, b) => b.position - a.position)
    .map((post) => ({
      id: post.id,
      text: post.text,
      themeKey: post.themeKey,
      publishedAt: new Date(post.publishedAt),
      totwNumber: post.totwNumber,
      position: post.position,
      reviewColor: post.reviewColor ?? null,
      reviewChangedAt: post.reviewChangedAt ?? null,
      terms: post.terms.map(({ surface, headword }) => ({ surface, headword })),
    }));
}

/** Positions 1–15 of a TOTW with their headwords (= `getQuickList()`). */
export function quickListFromCopy(copy: OfflineCopy, totwNumber: number): QuickListItem[] {
  return copy.posts
    .filter((post) => post.totwNumber === totwNumber)
    .sort((a, b) => a.position - b.position)
    .map((post) => ({
      position: post.position,
      postId: post.id,
      headwords: [...new Set(post.terms.map((term) => term.headword))],
      reviewColor: post.reviewColor ?? null,
      reviewChangedAt: post.reviewChangedAt ?? null,
    }));
}

export function postFromCopy(copy: OfflineCopy, id: string): CopyPost | undefined {
  return copy.posts.find((post) => post.id === id);
}
