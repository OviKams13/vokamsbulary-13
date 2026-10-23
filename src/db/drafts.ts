import "server-only";

import { asc, count, desc, eq, ne } from "drizzle-orm";

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

export type DraftStatus = (typeof posts.$inferSelect)["status"];

export type Draft = {
  id: string;
  status: DraftStatus;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  extractedText: string | null;
  /** Text saved at Verify (null until the first save). */
  text: string | null;
  lastError: string | null;
  createdAt: Date;
  terms: { position: number; surface: string; headword: string; addedByUser: boolean }[];
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
        text: posts.text,
        lastError: posts.lastError,
        createdAt: posts.createdAt,
      })
      .from(posts)
      .where(eq(posts.id, id)),
    db
      .select({
        position: terms.position,
        surface: terms.surface,
        headword: terms.headword,
        addedByUser: terms.addedByUser,
      })
      .from(terms)
      .where(eq(terms.postId, id))
      .orderBy(asc(terms.position)),
  ]);
  return post ? { ...post, terms: termRows } : null;
}

/** What the processing and Verify screens poll (7.4, 7.8): small on purpose. */
export async function getDraftStatus(id: string) {
  const [row] = await db
    .select({ status: posts.status, lastError: posts.lastError })
    .from(posts)
    .where(eq(posts.id, id));
  return row ?? null;
}

export type UnfinishedDraft = {
  id: string;
  status: DraftStatus;
  imageUrl: string;
  lastError: string | null;
  updatedAt: Date;
  termCount: number;
};

/** "Unfinished drafts" on the upload page (7.10): every unpublished post, last saved first. */
export async function getUnfinishedDrafts(): Promise<UnfinishedDraft[]> {
  return db
    .select({
      id: posts.id,
      status: posts.status,
      imageUrl: posts.imageUrl,
      lastError: posts.lastError,
      updatedAt: posts.updatedAt,
      termCount: count(terms.id),
    })
    .from(posts)
    .leftJoin(terms, eq(terms.postId, posts.id))
    .where(ne(posts.status, "published"))
    .groupBy(posts.id)
    .orderBy(desc(posts.updatedAt))
    .limit(20);
}
