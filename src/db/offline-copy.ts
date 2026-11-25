import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { toExplanationContent as content } from "@/lib/explanation";
import { COPY_FORMAT, type CopyPost, type OfflineCopy } from "@/lib/offline/copy";

import { db } from "./index";
import { explanations, postRanks, posts, termExamples, terms } from "./schema";

const fr = alias(explanations, "fr");
const examplesEn = alias(termExamples, "examples_en");
const examplesFr = alias(termExamples, "examples_fr");

/**
 * Every published post for the offline copy (14.2): text, French text, theme,
 * date, TOTW place, review colour (15.2), and each term with its explanations
 * (with the definition highlights, 15.1) and examples in both languages
 * (whatever exists). Same joins as `getPostDetail()`, for all posts
 * at once: two queries in one `db.batch`, one round trip.
 */
export async function getOfflineCopy(): Promise<OfflineCopy> {
  const [postRows, termRows] = await db.batch([
    db
      .select({
        id: posts.id,
        text: posts.text,
        textFr: posts.textFr,
        themeKey: posts.themeKey,
        publishedAt: posts.publishedAt,
        rank: postRanks.rank,
        totwNumber: postRanks.totwNumber,
        position: postRanks.totwPosition,
        reviewColor: posts.reviewColor,
        reviewChangedAt: posts.reviewChangedAt,
      })
      .from(postRanks)
      .innerJoin(posts, eq(posts.id, postRanks.postId))
      .orderBy(asc(postRanks.rank)),
    db
      .select({
        postId: terms.postId,
        id: terms.id,
        position: terms.position,
        surface: terms.surface,
        headword: terms.headword,
        explanation: explanations,
        french: fr,
        examples: examplesEn.sentences,
        examplesFr: examplesFr.sentences,
      })
      .from(terms)
      // Published posts only: `post_ranks` holds nothing else.
      .innerJoin(postRanks, eq(postRanks.postId, terms.postId))
      .leftJoin(
        explanations,
        and(eq(explanations.termId, terms.id), eq(explanations.language, "en")),
      )
      .leftJoin(fr, and(eq(fr.termId, terms.id), eq(fr.language, "fr")))
      .leftJoin(examplesEn, and(eq(examplesEn.termId, terms.id), eq(examplesEn.language, "en")))
      .leftJoin(examplesFr, and(eq(examplesFr.termId, terms.id), eq(examplesFr.language, "fr")))
      .orderBy(asc(terms.position)),
  ]);

  const termsByPost = Map.groupBy(termRows, (row) => row.postId);

  const copyPosts: CopyPost[] = postRows.map((post) => ({
    id: post.id,
    // Published posts always have text, theme and date (CHECK constraints).
    text: post.text ?? "",
    textFr: post.textFr,
    themeKey: post.themeKey ?? "",
    publishedAt: (post.publishedAt ?? new Date(0)).toISOString(),
    rank: post.rank,
    totwNumber: post.totwNumber,
    position: post.position,
    reviewColor: post.reviewColor,
    reviewChangedAt: post.reviewChangedAt?.getTime() ?? null,
    terms: (termsByPost.get(post.id) ?? []).map((term) => ({
      id: term.id,
      position: term.position,
      surface: term.surface,
      headword: term.headword,
      explanation: content(term.explanation),
      french: content(term.french),
      examples: term.examples,
      examplesFr: term.examplesFr,
    })),
  }));

  return { format: COPY_FORMAT, generatedAt: new Date().toISOString(), posts: copyPosts };
}
