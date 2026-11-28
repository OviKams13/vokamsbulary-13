import "server-only";

import { and, asc, eq, gte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { toExplanationContent } from "@/lib/explanation";
import type { ReelScope, ReelWord, ReelWordData } from "@/lib/reels/data";

import { db } from "./index";
import { explanations, postRanks, posts, reels, termExamples, terms, ttsCalls } from "./schema";

/**
 * Reel queries (16.2, 16.3). The words of a scope, in reel order: the post's
 * words by position (a post), or every word of the TOTW's 15 posts, post #1
 * first (a TOTW). Published posts only.
 */
export async function listReelWords(scope: ReelScope): Promise<ReelWord[]> {
  const rows = await db
    .select({
      termId: terms.id,
      postId: terms.postId,
      totwNumber: postRanks.totwNumber,
      position: postRanks.totwPosition,
      termPosition: terms.position,
      headword: terms.headword,
      status: reels.status,
    })
    .from(terms)
    .innerJoin(postRanks, eq(postRanks.postId, terms.postId))
    .leftJoin(reels, eq(reels.termId, terms.id))
    .where(
      scope.kind === "post"
        ? eq(terms.postId, scope.postId)
        : eq(postRanks.totwNumber, scope.totwNumber),
    )
    .orderBy(asc(postRanks.totwPosition), asc(terms.position));

  // k/N: the word's place among its own post's words.
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.postId, (counts.get(row.postId) ?? 0) + 1);
  const seen = new Map<string, number>();
  return rows.map((row) => {
    const index = (seen.get(row.postId) ?? 0) + 1;
    seen.set(row.postId, index);
    return {
      termId: row.termId,
      postId: row.postId,
      totwNumber: row.totwNumber,
      position: row.position,
      wordIndex: index,
      wordCount: counts.get(row.postId) ?? index,
      headword: row.headword,
      ready: row.status === "ready",
      failed: row.status === "failed",
    };
  });
}

const fr = alias(explanations, "fr");
const examplesEn = alias(termExamples, "examples_en");
const examplesFr = alias(termExamples, "examples_fr");

/**
 * Everything the player shows for one ready reel: its screens and timings,
 * its drawings, and the stored texts read live (with the user's definition
 * highlights and the post's review colour). Null if the reel isn't ready.
 */
export async function getReelWordData(termId: string): Promise<ReelWordData | null> {
  const [row] = await db
    .select({
      reel: reels,
      termPosition: terms.position,
      firstPosition: sql<number>`(SELECT min(t2.position) FROM ${terms} t2 WHERE t2.post_id = ${terms.postId})`,
      headword: terms.headword,
      surface: terms.surface,
      surfaces: sql<
        string[]
      >`(SELECT array_agg(t3.surface ORDER BY t3.position) FROM ${terms} t3 WHERE t3.post_id = ${terms.postId})`,
      text: posts.text,
      textFr: posts.textFr,
      themeKey: posts.themeKey,
      reviewColor: posts.reviewColor,
      reviewChangedAt: posts.reviewChangedAt,
      en: explanations,
      fr,
      examples: examplesEn.sentences,
      examplesFr: examplesFr.sentences,
    })
    .from(reels)
    .innerJoin(terms, eq(terms.id, reels.termId))
    .innerJoin(posts, and(eq(posts.id, terms.postId), eq(posts.status, "published")))
    .innerJoin(
      explanations,
      and(eq(explanations.termId, terms.id), eq(explanations.language, "en")),
    )
    .innerJoin(fr, and(eq(fr.termId, terms.id), eq(fr.language, "fr")))
    .innerJoin(examplesEn, and(eq(examplesEn.termId, terms.id), eq(examplesEn.language, "en")))
    .innerJoin(examplesFr, and(eq(examplesFr.termId, terms.id), eq(examplesFr.language, "fr")))
    .where(and(eq(reels.termId, termId), eq(reels.status, "ready")));
  const { reel } = row ?? {};
  if (!row || !reel?.screens || !reel.svgs || !reel.audioUrl || !reel.gist) return null;

  const isFirst = row.termPosition === Number(row.firstPosition);
  return {
    termId,
    audioUrl: reel.audioUrl,
    screens: reel.screens,
    svgs: reel.svgs,
    gist: reel.gist,
    totalMs: reel.totalMs ?? 0,
    headword: row.headword,
    surface: row.surface,
    post:
      isFirst && row.text && row.textFr && row.themeKey
        ? { text: row.text, textFr: row.textFr, themeKey: row.themeKey, surfaces: row.surfaces }
        : null,
    en: toExplanationContent(row.en)!,
    fr: toExplanationContent(row.fr)!,
    examples: row.examples,
    examplesFr: row.examplesFr,
    reviewColor: row.reviewColor,
    reviewChangedAt: row.reviewChangedAt?.getTime() ?? null,
  };
}

/**
 * Words whose reel is waiting (16.3): queued at publish and not built yet by
 * the publish run. Oldest first. A failed reel is not retried here (only by
 * the player or "Prepare TOTW reels").
 */
export async function listPendingReels(
  limit = 30,
): Promise<{ termId: string; headword: string }[]> {
  return db
    .select({ termId: reels.termId, headword: terms.headword })
    .from(reels)
    .innerJoin(terms, eq(terms.id, reels.termId))
    .innerJoin(posts, and(eq(posts.id, reels.postId), eq(posts.status, "published")))
    .where(eq(reels.status, "pending"))
    .orderBy(asc(posts.publishedAt), asc(terms.position))
    .limit(limit);
}

/**
 * Characters sent to Google Text-to-Speech this calendar month (16.3, the free
 * tier is 1M a month). The month is counted in UTC; Google counts in Pacific
 * time, so the first hours of a month may differ a little.
 */
export async function ttsCharactersThisMonth(): Promise<number> {
  const [row] = await db
    .select({ total: sql<string | null>`sum(${ttsCalls.characters})` })
    .from(ttsCalls)
    .where(
      gte(
        ttsCalls.createdAt,
        sql`date_trunc('month', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'`,
      ),
    );
  return Number(row?.total ?? 0);
}
