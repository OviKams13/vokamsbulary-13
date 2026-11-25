import type { Explanation } from "@/db/schema";

/**
 * What a word's explanation shows (6.3, 8.2): an `explanations` row without
 * its ids, model and date, plus the user's own highlights in the definition
 * (15.1). The offline copy (14.2) stores only this, and the explanation
 * components accept it, so they render a database row or a row read from the
 * device the same way.
 *
 * The highlight fields are optional: a copy saved before Phase 15 doesn't
 * have them (no highlights).
 */
export type ExplanationContent = Pick<
  Explanation,
  | "language"
  | "frEquivalents"
  | "definition"
  | "analogyTitle"
  | "analogyBody"
  | "analogyEmoji"
  | "exampleQuestion"
  | "exampleQuestionFr"
  | "inYourTextQuote"
  | "inYourTextExplanation"
> & {
  /** Highlighted units of the definition (15.1, see `splitDefinition()`). */
  definitionMarks?: number[];
  /** When they were last changed, in ms since 1970; null = never. */
  definitionMarksChangedAt?: number | null;
};

/** Only what the explanation shows: no ids, model or date reach the page or the device. */
export function toExplanationContent(row: Explanation | null): ExplanationContent | null {
  if (!row) return null;
  return {
    language: row.language,
    frEquivalents: row.frEquivalents,
    definition: row.definition,
    analogyTitle: row.analogyTitle,
    analogyBody: row.analogyBody,
    analogyEmoji: row.analogyEmoji,
    exampleQuestion: row.exampleQuestion,
    exampleQuestionFr: row.exampleQuestionFr,
    inYourTextQuote: row.inYourTextQuote,
    inYourTextExplanation: row.inYourTextExplanation,
    definitionMarks: row.definitionMarks,
    definitionMarksChangedAt: row.definitionMarksChangedAt?.getTime() ?? null,
  };
}
