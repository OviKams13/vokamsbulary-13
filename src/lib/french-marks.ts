import type { TextSegment } from "./highlight";

/**
 * Inline marks in `posts.text_fr` (8.4, E-08): the French words that translate
 * a term sit between ⟦ and ⟧. These two characters (mathematical white square
 * brackets) never occur in an English or French post text, so a mark can't be
 * confused with the text. Marks never nest.
 */
export const FRENCH_MARK_OPEN = "⟦";
export const FRENCH_MARK_CLOSE = "⟧";

const MARK = /⟦([^⟦⟧]+)⟧/gu;
const MARK_CHARACTERS = /[⟦⟧]/gu;

/** True if the text holds at least one mark. A `text_fr` without any is regenerated (E-08). */
export function hasFrenchMarks(text: string): boolean {
  return new RegExp(MARK.source, "u").test(text);
}

/** True if every ⟦ has its ⟧ (no stray or nested mark) and there is at least one mark. */
export function isWellMarked(text: string): boolean {
  return hasFrenchMarks(text) && !/[⟦⟧]/u.test(text.replace(MARK, "$1"));
}

/** The text without its marks: for every place where `text_fr` is shown as plain text. */
export function stripFrenchMarks(text: string): string {
  return text.replace(MARK_CHARACTERS, "");
}

/**
 * Splits a French post text into plain and marked pieces, like `highlightTerms()`
 * does for the English text. A stray ⟦ or ⟧ is dropped, never shown.
 */
export function splitFrenchMarks(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let last = 0;

  for (const match of text.matchAll(MARK)) {
    if (match.index > last) {
      segments.push({ text: stripFrenchMarks(text.slice(last, match.index)), marked: false });
    }
    segments.push({ text: match[1], marked: true });
    last = match.index + match[0].length;
  }
  if (last < text.length)
    segments.push({ text: stripFrenchMarks(text.slice(last)), marked: false });
  return segments;
}
