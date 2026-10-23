/**
 * Search helpers shared by the server queries (10.1) and the search field
 * (10.2). No database code here, so client components can use them.
 */

/** Shorter queries would match almost every text. */
export const SEARCH_MIN_LENGTH = 2;
export const SEARCH_MAX_LENGTH = 100;

/** Trimmed, inner spaces collapsed, cut to the maximum length. */
export function normalizeQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, SEARCH_MAX_LENGTH).trim();
}

/** An explained word that matches the query (one term of one published post). */
export type ExplainedResult = {
  termId: string;
  postId: string;
  headword: string;
  /** As written in the post: highlighted in the quote. */
  surface: string;
  /** The term's tab on the post page (`?w=`), 1-based. */
  word: number;
  totwNumber: number;
  position: number;
  /** From the English explanation. */
  definition: string | null;
  quote: string | null;
};

/** A published post whose text contains the query. */
export type TextResult = {
  postId: string;
  totwNumber: number;
  position: number;
} & TextExcerpt;

export type TextExcerpt = {
  /** The whole word (or words) of the text holding the match, lowercased. */
  word: string;
  before: string;
  /** That word as written in the text, highlighted in the excerpt. */
  match: string;
  after: string;
};

const WORD_CHAR = /[\p{L}\p{N}'’-]/u;
/** Context kept around the match when its sentence is longer. */
const BEFORE_MAX = 80;
const AFTER_MAX = 100;

/** A match in a text: where the whole word (or words) holding it starts and ends. */
type Span = { start: number; end: number };

type ExcerptOptions = {
  /**
   * Word forms the full-text match found in this text ("craving" for
   * "crave"), as Postgres marked them (`ts_headline`), lowercased.
   */
  forms?: readonly string[];
  /** A match to skip: the word is one of the post's explained words. */
  skip?: (word: string) => boolean;
};

/**
 * The excerpt shown for a text result (10.2, mockup 05): the sentence holding
 * the first match, cut with "…" when it is long, and the whole word around
 * the match, in the form actually written ("crav" → "craving"; "crave" →
 * "craving" through `forms`).
 *
 * Matches are the query as a substring (like ILIKE: any case, ' and ’ alike,
 * any run of spaces) and the full-text `forms` as whole words. The first one
 * in the text that `skip` doesn't reject wins. Null when there is none.
 */
export function textExcerpt(
  text: string,
  query: string,
  { forms = [], skip }: ExcerptOptions = {},
): TextExcerpt | null {
  const spans = [...substringSpans(text, query), ...formSpans(text, forms)].sort(
    (a, b) => a.start - b.start,
  );
  const span = spans.find(({ start, end }) => !skip?.(text.slice(start, end).toLowerCase()));
  return span ? excerptAt(text, span) : null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/['’]/g, "['’]");
}

/** Every occurrence of the query inside the text, widened to whole words. */
function substringSpans(text: string, query: string): Span[] {
  const pattern = query.trim().split(/\s+/).filter(Boolean).map(escapeRegExp).join("\\s+");
  if (!pattern) return [];

  return [...text.matchAll(new RegExp(pattern, "giu"))].map((found) => {
    const matchEnd = found.index + found[0].length;
    let start = found.index;
    let end = matchEnd;
    while (start > 0 && WORD_CHAR.test(text[start - 1]!)) start--;
    while (end < text.length && WORD_CHAR.test(text[end]!)) end++;
    // Quotes and dashes around a word aren't part of it.
    while (start < found.index && /['’-]/.test(text[start]!)) start++;
    while (end > matchEnd && /['’-]/.test(text[end - 1]!)) end--;
    return { start, end };
  });
}

/** Every whole-word occurrence of the full-text forms. */
function formSpans(text: string, forms: readonly string[]): Span[] {
  const words = [...new Set(forms.map((form) => form.trim()).filter(Boolean))];
  if (words.length === 0) return [];
  const pattern = `(?<![\\p{L}\\p{N}])(?:${words.map(escapeRegExp).join("|")})(?![\\p{L}\\p{N}])`;
  return [...text.matchAll(new RegExp(pattern, "giu"))].map((found) => ({
    start: found.index,
    end: found.index + found[0].length,
  }));
}

function excerptAt(text: string, { start, end }: Span): TextExcerpt {
  const sentenceStart = Math.max(
    0,
    ...[". ", "! ", "? ", "\n"].map((mark) => {
      const at = text.lastIndexOf(mark, start - 1);
      return at < 0 ? 0 : at + mark.length;
    }),
  );
  let from = sentenceStart;
  let cutBefore = false;
  if (start - from > BEFORE_MAX) {
    from = text.indexOf(" ", start - BEFORE_MAX) + 1;
    cutBefore = true;
  }

  const ends = [". ", "! ", "? ", "\n"]
    .map((mark) => text.indexOf(mark, end))
    .filter((at) => at >= 0)
    .map((at) => at + 1);
  let to = ends.length > 0 ? Math.min(...ends) : text.length;
  let cutAfter = false;
  if (to - end > AFTER_MAX) {
    to = Math.max(end, text.lastIndexOf(" ", end + AFTER_MAX));
    cutAfter = true;
  }

  const match = text.slice(start, end);
  return {
    word: match.toLowerCase(),
    before: (cutBefore ? "…" : "") + text.slice(from, start),
    match,
    after: text.slice(end, to).trimEnd() + (cutAfter ? "…" : ""),
  };
}
