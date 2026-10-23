import "server-only";

import { asc, eq } from "drizzle-orm";

import type { QuickListItem } from "@/lib/totw";

import { db } from "./index";
import { postRanks, terms } from "./schema";

/**
 * Quick list of one TOTW (9.1, F11): its published posts by position (1–15),
 * each with its headwords. ERD §5.1: `post_ranks` joined with `terms`, one
 * query. Positions with no post yet (current TOTW) are simply absent.
 */
export async function getQuickList(totwNumber: number): Promise<QuickListItem[]> {
  const rows = await db
    .select({
      position: postRanks.totwPosition,
      postId: postRanks.postId,
      headword: terms.headword,
    })
    .from(postRanks)
    .innerJoin(terms, eq(terms.postId, postRanks.postId))
    .where(eq(postRanks.totwNumber, totwNumber))
    .orderBy(asc(postRanks.totwPosition), asc(terms.position));

  const items: QuickListItem[] = [];
  for (const row of rows) {
    let item = items.at(-1);
    if (item?.postId !== row.postId) {
      item = { position: row.position, postId: row.postId, headwords: [] };
      items.push(item);
    }
    if (!item.headwords.includes(row.headword)) item.headwords.push(row.headword);
  }
  return items;
}
