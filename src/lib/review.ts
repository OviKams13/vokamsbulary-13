/**
 * Personal review tools (Phase 15): the review colour of a post (15.2) and
 * the user's own highlights in a definition (15.1). Shared by the server, the
 * live pages and the offline app, so no import from the database here (the
 * schema imports this file through a relative path, for drizzle-kit).
 */

/** Green = understood every word, orange = understood some, red = too hard, skipped. */
export const REVIEW_COLORS = ["green", "orange", "red"] as const;

export type ReviewColor = (typeof REVIEW_COLORS)[number];

export type ReviewLanguage = "en" | "fr";

export function isReviewColor(value: unknown): value is ReviewColor {
  return typeof value === "string" && (REVIEW_COLORS as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Changes and "last change wins"
// ---------------------------------------------------------------------------

/**
 * One change made on a device, as sent to `POST /api/review` and kept in the
 * device's queue until the server has it. `changedAt` is the time it was made
 * (ms since 1970, the device's clock): the server keeps it only if it is newer
 * than the stored one, so the last change wins wherever and whenever it is sent.
 */
export type ReviewChange =
  | { kind: "color"; postId: string; color: ReviewColor | null; changedAt: number }
  | {
      kind: "marks";
      termId: string;
      language: ReviewLanguage;
      marks: number[];
      changedAt: number;
    };

/**
 * What the server holds after a change: the same shape, with its own time
 * (null: never changed). `missing`: the post or the explanation doesn't exist
 * anymore (deleted), so the change is dropped.
 */
export type ReviewResult =
  | { kind: "color"; postId: string; color: ReviewColor | null; changedAt: number | null }
  | {
      kind: "marks";
      termId: string;
      language: ReviewLanguage;
      marks: number[];
      changedAt: number | null;
    }
  | { kind: "missing"; key: string };

/** One key per thing that can change: the queue keeps only the last change of each. */
export function reviewKey(
  change:
    { kind: "color"; postId: string } | { kind: "marks"; termId: string; language: ReviewLanguage },
): string {
  return change.kind === "color"
    ? `color:${change.postId}`
    : `marks:${change.termId}:${change.language}`;
}

/** Colour of a post as the pages hold it. */
export type StampedColor = { color: ReviewColor | null; changedAt: number | null };

/** Highlights of one definition as the pages hold them. */
export type StampedMarks = { marks: number[]; changedAt: number | null };

/** True when `a` was changed after `b` (a value never changed is the oldest). */
export function isNewer(a: number | null | undefined, b: number | null | undefined): boolean {
  return (a ?? -1) > (b ?? -1);
}

// ---------------------------------------------------------------------------
// Definition units (15.1)
// ---------------------------------------------------------------------------

/**
 * One tappable piece of a definition. Words are the runs of characters
 * between spaces (punctuation stays with its word); a space is the run of
 * spaces between two words. Word i is unit 2i, the space after it 2i + 1.
 */
export type DefinitionUnit = { kind: "word" | "space"; unit: number; text: string };

export type DefinitionParts = {
  /** Spaces before the first word, if any (not tappable). */
  before: string;
  units: DefinitionUnit[];
  /** Spaces after the last word, if any (not tappable). */
  after: string;
  wordCount: number;
};

export function splitDefinition(text: string): DefinitionParts {
  const units: DefinitionUnit[] = [];
  const pattern = /\S+/g;
  let wordCount = 0;
  let last = 0;
  let before = "";

  for (const match of text.matchAll(pattern)) {
    const gap = text.slice(last, match.index);
    if (wordCount === 0) before = gap;
    else units.push({ kind: "space", unit: 2 * wordCount - 1, text: gap });
    units.push({ kind: "word", unit: 2 * wordCount, text: match[0] });
    wordCount += 1;
    last = match.index + match[0].length;
  }

  return { before, units, after: text.slice(last), wordCount };
}

/**
 * Valid, sorted highlights for a definition of `wordCount` words: whole
 * numbers inside the definition, no repeats, and a space only when both of
 * its words are highlighted. Used on the device and again on the server.
 */
export function normalizeMarks(marks: readonly number[], wordCount: number): number[] {
  const last = 2 * wordCount - 2;
  const set = new Set(marks.filter((unit) => Number.isInteger(unit) && unit >= 0 && unit <= last));
  for (const unit of set) {
    if (unit % 2 === 1 && (!set.has(unit - 1) || !set.has(unit + 1))) set.delete(unit);
  }
  return [...set].sort((a, b) => a - b);
}

/** A space can be highlighted only when both words beside it are. */
export function canMarkSpace(marks: ReadonlySet<number>, unit: number): boolean {
  return marks.has(unit - 1) && marks.has(unit + 1);
}

/**
 * One tap on a unit. A word switches on or off; switching it off also removes
 * the spaces beside it. A space switches only when both its words are on.
 * Words are never joined by themselves.
 */
export function toggleMark(marks: readonly number[], unit: number, wordCount: number): number[] {
  const set = new Set(marks);
  if (set.has(unit)) {
    set.delete(unit);
    if (unit % 2 === 0) {
      set.delete(unit - 1);
      set.delete(unit + 1);
    }
  } else if (unit % 2 === 0 || canMarkSpace(set, unit)) {
    set.add(unit);
  }
  return normalizeMarks([...set], wordCount);
}
