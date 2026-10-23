import "server-only";

import { z } from "zod";

import type { Explanation } from "@/db/schema";

import { callClaude, type ClaudeResult } from "./client";

/**
 * Claude call #3, translation (8.1, F9, feasibility §6.1): one English
 * explanation in, its French version out, through structured outputs.
 *
 * Only the prose is translated. The French equivalents are already French, the
 * emoji has no language, and the example question and the "In your text"
 * quote stay in English (E-03): the question gets a French translation next to
 * it instead. Those fields are copied from the English row, not asked for.
 *
 * The post text (8.3, D-18, E-07) is sent along only while the post has no
 * French text yet, so a post is translated once, in the same call as its
 * first translated word.
 */
export const TranslationSchema = z.object({
  definition: z.string(),
  analogyTitle: z.string(),
  analogyBody: z.string(),
  /** French translation of the English example question, still a question. */
  exampleQuestionFr: z.string(),
  inYourTextExplanation: z.string(),
});

/** Same, plus the whole post text in French (first Translate of the post). */
const TranslationWithTextSchema = TranslationSchema.extend({ postTextFr: z.string() });

export type Translation = z.infer<typeof TranslationSchema> & { postTextFr?: string };

/** Fixed instruction (no per-term data). */
const SYSTEM = `You translate vocabulary explanations from English into French for a personal English learning app. The reader is a French speaker learning English. The explanation is about one English word or expression (the term).

Rules:
- Natural, everyday French from France, not a word-for-word translation. Keep the meaning, the nuance and the tone.
- Speak to the reader with "tu", as a friendly teacher would.
- Never translate the term itself. Wherever the English text names it, keep it in English, exactly as written, with no quotation marks or other markup ("C'est ça, être thrilled."), so the reader links the French explanation to the English word.
- analogyTitle: "L'analogie de …" or "L'analogie du …" ("The surprise party analogy" → "L'analogie de la fête surprise").
- exampleQuestionFr: the French translation of the example question. It stays a question and ends with "?". Here the term is translated naturally (it's a translation, not an explanation).
- Same length as the English, no additions, no notes.
- postText (only when it is given): the passage the term comes from. Translate all of it into postTextFr, faithfully and naturally, sentence by sentence, keeping the paragraph breaks. Here every word is translated, the term included: it's the French version of the text, read under the English one.`;

export async function translateExplanation(options: {
  postId: string | null;
  headword: string;
  english: Pick<
    Explanation,
    | "definition"
    | "analogyTitle"
    | "analogyBody"
    | "exampleQuestion"
    | "inYourTextQuote"
    | "inYourTextExplanation"
  >;
  /** The post text, when the post has no French text yet (8.3); otherwise null. */
  postText: string | null;
}): Promise<ClaudeResult<Translation>> {
  const { english, postText } = options;
  return callClaude({
    kind: "translate",
    postId: options.postId,
    schema: postText ? TranslationWithTextSchema : TranslationSchema,
    system: SYSTEM,
    // About 300 output tokens, plus the post text the first time; the rest is room for thinking.
    maxTokens: 6000,
    // A faithful translation needs care, not long reasoning.
    effort: "low",
    messages: [
      {
        role: "user",
        content: JSON.stringify(
          {
            term: options.headword,
            definition: english.definition,
            analogyTitle: english.analogyTitle,
            analogyBody: english.analogyBody,
            exampleQuestion: english.exampleQuestion,
            // Context only: the quote stays in English.
            inYourTextQuote: english.inYourTextQuote,
            inYourTextExplanation: english.inYourTextExplanation,
            ...(postText ? { postText } : {}),
          },
          null,
          2,
        ),
      },
    ],
  });
}
