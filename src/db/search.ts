import "server-only";

import { and, desc, eq, or, sql } from "drizzle-orm";

import { type ExplainedResult, type TextResult, textExcerpt } from "@/lib/search";

import { db } from "./index";
import { explanations, postRanks, posts, terms } from "./schema";

/** More than one screen of either list is never useful to a single user. */
const LIMIT = 50;

export type SearchResults = {
  explained: ExplainedResult[];
  texts: TextResult[];
};

/**
 * Search (10.1, F12, ERD §5.4), published posts only (`post_ranks` holds
 * nothing else), in one `db.batch`:
 *
 * - **Explained words:** `terms.headword` equal to the query first, then
 *   similar ones (pg_trgm `%`, GIN index `terms_headword_trgm_idx`), most
 *   similar first; newest post first on a tie.
 * - **Found in texts:** `posts.text ILIKE '%query%'` (GIN index
 *   `posts_text_trgm_idx`; finds partial words like "crav") **or** the
 *   English full-text match `to_tsvector('english', text) @@
 *   plainto_tsquery('english', query)` (finds other forms: "crave" →
 *   "craving", "craves", "craved"). The full-text part is computed on the fly,
 *   with no index: a few hundred posts at most. `ts_headline` marks the forms
 *   it matched, so the excerpt shows the word actually written. English text
 *   only, never `text_fr`; newest first.
 *   Matches that are one of the explained words found above are skipped: they
 *   are already shown as explained words (mockup 05). A text with no other
 *   match is left out.
 *
 * `query` must already be normalized (`normalizeQuery()`).
 */
export async function search(query: string): Promise<SearchResults> {
  const headword = query.toLowerCase();
  const similarity = sql<number>`similarity(${terms.headword}, ${headword})`;
  const tsQuery = sql`plainto_tsquery('english', ${query})`;
  const fullText = sql<boolean>`to_tsvector('english', ${posts.text}) @@ ${tsQuery}`;

  const [termRows, textRows] = await db.batch([
    db
      .select({
        termId: terms.id,
        postId: terms.postId,
        headword: terms.headword,
        surface: terms.surface,
        word: terms.position,
        totwNumber: postRanks.totwNumber,
        position: postRanks.totwPosition,
        definition: explanations.definition,
        quote: explanations.inYourTextQuote,
      })
      .from(terms)
      .innerJoin(postRanks, eq(postRanks.postId, terms.postId))
      .leftJoin(
        explanations,
        and(eq(explanations.termId, terms.id), eq(explanations.language, "en")),
      )
      .where(or(eq(terms.headword, headword), sql`${terms.headword} % ${headword}`))
      .orderBy(desc(eq(terms.headword, headword)), desc(similarity), desc(postRanks.rank))
      .limit(LIMIT),
    db
      .select({
        postId: posts.id,
        text: posts.text,
        totwNumber: postRanks.totwNumber,
        position: postRanks.totwPosition,
        // The text with every full-text match between ⟦ ⟧; null without one.
        marked: sql<string | null>`CASE WHEN ${fullText}
          THEN ts_headline('english', ${posts.text}, ${tsQuery}, ${HEADLINE_OPTIONS}) END`,
      })
      .from(postRanks)
      .innerJoin(posts, eq(posts.id, postRanks.postId))
      .where(or(sql`${posts.text} ILIKE ${likePattern(query)}`, fullText))
      .orderBy(desc(postRanks.rank))
      .limit(LIMIT),
  ]);

  const explainedSurfaces = Map.groupBy(termRows, (row) => row.postId);

  const texts: TextResult[] = [];
  for (const row of textRows) {
    const surfaces = (explainedSurfaces.get(row.postId) ?? []).map((term) =>
      term.surface.toLowerCase(),
    );
    const excerpt = textExcerpt(row.text ?? "", query, {
      forms: markedForms(row.marked),
      skip: (word) => surfaces.some((surface) => surface.includes(word)),
    });
    if (!excerpt) continue;
    texts.push({
      postId: row.postId,
      totwNumber: row.totwNumber,
      position: row.position,
      ...excerpt,
    });
  }

  return { explained: termRows, texts };
}

/** Mark every match (not only the best fragment) with characters a post text never holds. */
const HEADLINE_OPTIONS = "HighlightAll=true, StartSel=⟦, StopSel=⟧";

/** The words `ts_headline` marked, lowercased: the forms the full-text match found. */
function markedForms(marked: string | null): string[] {
  if (!marked) return [];
  return [...marked.matchAll(/⟦([^⟧]*)⟧/g)].map((found) => found[1]!.toLowerCase());
}

/**
 * `%query%` for ILIKE: `%`, `_` and `\` are matched literally; ' and ’ match
 * each other (a one-character wildcard), like the excerpt does.
 */
function likePattern(query: string): string {
  const escaped = query.replace(/[\\%_]/g, "\\$&").replace(/['’]/g, "_");
  return `%${escaped}%`;
}
