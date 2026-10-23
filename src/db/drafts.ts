import "server-only";

import { asc, count, eq } from "drizzle-orm";

import { TOTW_SIZE } from "@/lib/totw";

import { db } from "./index";
import { posts, terms } from "./schema";

/** Where the next published post will land: "Next up · TOTW n · #m" (7.1). */
export type NextSlot = { totwNumber: number; position: number };

export async function getNextSlot(): Promise<NextSlot> {
  const [row] = await db.select({ n: count() }).from(posts).where(eq(posts.status, "published"));
  const published = row?.n ?? 0;
  return {
    totwNumber: Math.floor(published / TOTW_SIZE) + 1,
    position: (published % TOTW_SIZE) + 1,
  };
}

export type Draft = {
  id: string;
  status: (typeof posts.$inferSelect)["status"];
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  extractedText: string | null;
  lastError: string | null;
  terms: { position: number; surface: string; headword: string }[];
};

/** One post with its terms, any status. Null for an unknown id. */
export async function getDraft(id: string): Promise<Draft | null> {
  const [[post], termRows] = await db.batch([
    db
      .select({
        id: posts.id,
        status: posts.status,
        imageUrl: posts.imageUrl,
        imageWidth: posts.imageWidth,
        imageHeight: posts.imageHeight,
        extractedText: posts.extractedText,
        lastError: posts.lastError,
      })
      .from(posts)
      .where(eq(posts.id, id)),
    db
      .select({ position: terms.position, surface: terms.surface, headword: terms.headword })
      .from(terms)
      .where(eq(terms.postId, id))
      .orderBy(asc(terms.position)),
  ]);
  return post ? { ...post, terms: termRows } : null;
}

/** What the processing screen polls (7.4): small on purpose. */
export async function getDraftStatus(id: string) {
  const [row] = await db
    .select({ status: posts.status, lastError: posts.lastError })
    .from(posts)
    .where(eq(posts.id, id));
  return row ?? null;
}
