import { type ExplainedResult, type TextResult, textExcerpt } from "@/lib/search";

import type { OfflineCopy } from "./copy";

/**
 * Search in the offline copy (14.2): the rules of `search()` (10.1), in the
 * browser.
 *
 * - **Explained words:** headword equal to the query first, then similar
 *   headwords with pg_trgm's own measure (trigrams of each word, padded with
 *   two spaces before and one after; similarity ≥ 0.3, its default
 *   threshold); most similar first, newest post on a tie.
 * - **Found in texts:** the query as a substring (any case, ' and ’ alike,
 *   = ILIKE) or the same word in another form. Postgres's English stemmer
 *   isn't available offline: a short suffix rule stands in for it ("crave",
 *   "craves", "craving", "craved" share "crav"). Common English words are
 *   ignored, as Postgres does. Then the same excerpt and the same "already
 *   shown as an explained word" rule as online.
 *
 * `query` must already be normalized (`normalizeQuery()`).
 */

const LIMIT = 50;
const SIMILARITY_THRESHOLD = 0.3;

export function searchCopy(
  copy: OfflineCopy,
  query: string,
): { explained: ExplainedResult[]; texts: TextResult[] } {
  const headword = query.toLowerCase();
  const queryTrigrams = trigrams(headword);

  const explained = copy.posts
    .flatMap((post) =>
      post.terms.map((term) => ({
        exact: term.headword === headword,
        similarity: similarity(trigrams(term.headword), queryTrigrams),
        rank: post.rank,
        result: {
          termId: term.id,
          postId: post.id,
          headword: term.headword,
          surface: term.surface,
          word: term.position,
          totwNumber: post.totwNumber,
          position: post.position,
          definition: term.explanation?.definition ?? null,
          quote: term.explanation?.inYourTextQuote ?? null,
        } satisfies ExplainedResult,
      })),
    )
    .filter((row) => row.exact || row.similarity >= SIMILARITY_THRESHOLD)
    .sort(
      (a, b) => Number(b.exact) - Number(a.exact) || b.similarity - a.similarity || b.rank - a.rank,
    )
    .slice(0, LIMIT)
    .map((row) => row.result);

  const explainedSurfaces = groupBy(explained, (result) => result.postId);
  const queryStems = contentWords(query).map(stem);

  const texts: TextResult[] = [];
  for (const post of [...copy.posts].sort((a, b) => b.rank - a.rank)) {
    if (texts.length >= LIMIT) break;
    const forms = formsOf(post.text, queryStems);
    const surfaces = (explainedSurfaces.get(post.id) ?? []).map((term) =>
      term.surface.toLowerCase(),
    );
    const excerpt = textExcerpt(post.text, query, {
      forms,
      skip: (word) => surfaces.some((surface) => surface.includes(word)),
    });
    if (!excerpt) continue;
    texts.push({
      postId: post.id,
      totwNumber: post.totwNumber,
      position: post.position,
      ...excerpt,
    });
  }

  return { explained, texts };
}

// ---------------------------------------------------------------------------
// Trigrams, as pg_trgm computes them.
// ---------------------------------------------------------------------------

function trigrams(value: string): Set<string> {
  const set = new Set<string>();
  for (const word of value.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (!word) continue;
    const padded = `  ${word} `;
    for (let index = 0; index + 3 <= padded.length; index++)
      set.add(padded.slice(index, index + 3));
  }
  return set;
}

function similarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const trigram of a) if (b.has(trigram)) shared++;
  return shared / (a.size + b.size - shared);
}

// ---------------------------------------------------------------------------
// Word forms: a light stand-in for Postgres's English full-text search.
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set(
  (
    "a an and are as at be been but by for from had has have he her his i if in into is it its " +
    "me my no not of on or our she so that the their them then there these they this to too " +
    "was we were what when which who will with you your"
  ).split(" "),
);

function contentWords(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)?/gu) ?? []).filter(
    (word) => !STOP_WORDS.has(word),
  );
}

/** "craving" → "crav", "craves" → "crav", "studies" → "studi" (same for every form). */
function stem(word: string): string {
  let base = word.toLowerCase().replace(/['’]s$/, "");
  if (base.length > 4 && base.endsWith("ies")) base = `${base.slice(0, -3)}i`;
  else if (base.length > 5 && base.endsWith("ing")) base = base.slice(0, -3);
  else if (base.length > 4 && base.endsWith("ed")) base = base.slice(0, -2);
  else if (base.length > 4 && base.endsWith("es")) base = base.slice(0, -2);
  else if (base.length > 3 && base.endsWith("s") && !base.endsWith("ss")) base = base.slice(0, -1);
  if (base.length > 3 && base.endsWith("e")) base = base.slice(0, -1);
  if (base.length > 3 && base.endsWith("y")) base = `${base.slice(0, -1)}i`;
  // "planned" → "plann" → "plan"
  if (base.length > 3 && base.at(-1) === base.at(-2) && !/[aeiouls]/.test(base.at(-1)!)) {
    base = base.slice(0, -1);
  }
  return base;
}

/**
 * The words of `text` that are a form of the query's words, lowercased.
 * Like `plainto_tsquery`, every query word must be in the text; otherwise
 * there is none.
 */
function formsOf(text: string, queryStems: string[]): string[] {
  if (queryStems.length === 0) return [];
  const byStem = groupBy(contentWords(text), stem);
  if (!queryStems.every((queryStem) => byStem.has(queryStem))) return [];
  return queryStems.flatMap((queryStem) => byStem.get(queryStem) ?? []);
}

/** `Map.groupBy` needs Safari 17.4; this runs on older iPhones too. */
function groupBy<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const group = groups.get(key(item));
    if (group) group.push(item);
    else groups.set(key(item), [item]);
  }
  return groups;
}
