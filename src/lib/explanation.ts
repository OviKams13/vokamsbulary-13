import type { Explanation } from "@/db/schema";

/**
 * What a word's explanation shows (6.3, 8.2): an `explanations` row without
 * its ids, model and date. The offline copy (14.2) stores only this, and the
 * explanation components accept it, so they render a database row or a row
 * read from the device the same way.
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
>;
