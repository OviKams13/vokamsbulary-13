import { highlightTerms } from "./highlight";

/**
 * Verify-screen rules (7.6), shared by the browser (errors under each row as
 * you type) and the server (checked again before anything is saved).
 */

/** Most words in one post: keeps the explanation call short and the tab row usable. */
export const MAX_TERMS = 10;
/** A screenshot passage, not an article. */
export const MAX_TEXT_LENGTH = 5000;
export const MAX_TERM_LENGTH = 80;

export type DraftTermInput = {
  surface: string;
  headword: string;
  /** True for a row added with "+ Add word" (Claude had missed it). */
  addedByUser: boolean;
};

export type DraftInput = { text: string; terms: DraftTermInput[] };

export type DraftErrors = {
  text?: string;
  /** Problems of the list as a whole (none, too many). */
  terms?: string;
  /** By row index of the submitted list. */
  rows: Record<number, string>;
};

/**
 * Trims the input, drops rows left completely empty, lowercases headwords and
 * checks every rule. `requireTerms` is set for "Explain & publish": a draft
 * may be saved without words, but there's nothing to explain without one.
 */
export function checkDraft(
  input: DraftInput,
  { requireTerms }: { requireTerms: boolean },
): { value: DraftInput; errors: DraftErrors | null } {
  const text = normalizeText(input.text);
  const errors: DraftErrors = { rows: {} };

  if (!text) errors.text = "The text can't be empty.";
  else if (text.length > MAX_TEXT_LENGTH) {
    errors.text = `The text is too long (max ${MAX_TEXT_LENGTH} characters).`;
  }

  const seen = new Set<string>();
  const terms: DraftTermInput[] = [];
  input.terms.forEach((row, index) => {
    const surface = row.surface.trim().replace(/\s+/g, " ");
    const headword = row.headword.trim().replace(/\s+/g, " ").toLowerCase();
    if (!surface && !headword) return;

    if (!surface) errors.rows[index] = "Type the word as it is in the text.";
    else if (!headword) errors.rows[index] = "Type its base form.";
    else if (surface.length > MAX_TERM_LENGTH || headword.length > MAX_TERM_LENGTH) {
      errors.rows[index] = "This is too long for one word or expression.";
    } else if (seen.has(surface.toLowerCase())) errors.rows[index] = "This word is already listed.";
    else if (text && !appearsIn(text, surface)) errors.rows[index] = "Not found in the text.";

    seen.add(surface.toLowerCase());
    terms.push({ surface, headword, addedByUser: row.addedByUser });
  });

  if (terms.length > MAX_TERMS) errors.terms = `Keep at most ${MAX_TERMS} words per post.`;
  else if (requireTerms && terms.length === 0) errors.terms = "Add at least one word to explain.";

  const failed = Boolean(errors.text || errors.terms || Object.keys(errors.rows).length > 0);
  return { value: { text, terms }, errors: failed ? errors : null };
}

/** True when the surface would be highlighted in the text (E-06 rules: whole words, any case). */
export function appearsIn(text: string, surface: string): boolean {
  return highlightTerms(text, [surface]).some((segment) => segment.marked);
}

/** Unix line ends, no trailing spaces on lines, at most one empty line between paragraphs. */
function normalizeText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Same text and the same words in the same order (the `addedByUser` flag doesn't count). */
export function sameDraft(a: DraftInput, b: DraftInput): boolean {
  return (
    a.text === b.text &&
    a.terms.length === b.terms.length &&
    a.terms.every(
      (term, index) =>
        term.surface === b.terms[index]?.surface && term.headword === b.terms[index]?.headword,
    )
  );
}
