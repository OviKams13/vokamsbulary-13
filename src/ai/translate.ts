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
 * first translated word. Its French words that translate the post's terms
 * come back marked with ⟦ ⟧ (8.4, E-08); a text stored without marks is
 * regenerated alone by `translatePostText()`.
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

/** The post's terms, as written in its text: what the French marks (8.4) stand for. */
export type PostTerm = { surface: string; headword: string };

/** Fixed instruction (no per-term data). */
const WORD_SYSTEM = `You translate vocabulary explanations from English into French for a personal English learning app. The reader is a French speaker learning English. The explanation is about one English word or expression (the term).

Rules:
- Natural, everyday French from France, not a word-for-word translation. Keep the meaning, the nuance and the tone.
- Speak to the reader with "tu", as a friendly teacher would.
- Never translate the term itself. Wherever the English text names it, keep it in English, exactly as written, with no quotation marks or other markup ("C'est ça, être thrilled."), so the reader links the French explanation to the English word.
- analogyTitle: "L'analogie de …" or "L'analogie du …" ("The surprise party analogy" → "L'analogie de la fête surprise").
- exampleQuestionFr: the French translation of the example question. It stays a question and ends with "?". Here the term is translated naturally (it's a translation, not an explanation).
- Same length as the English, no additions, no notes.`;

/**
 * The post text rules (8.3), with the French marks (8.4, E-08). The marks are
 * the two characters ⟦ and ⟧: the app turns them into a yellow highlight, so
 * the reader sees which French words match the words learned.
 */
const TEXT_RULES = `- postText: the passage the terms come from, and terms: the English words learned in it, as written in the passage. Translate all of postText into postTextFr, faithfully and naturally, sentence by sentence, keeping the paragraph breaks. Here every word is translated, the terms included: it's the French version of the text, read under the English one.
- In postTextFr, mark the French words that translate each term: put ⟦ before them and ⟧ after them ("Fati était ⟦ravie⟧ de la conversation.").
  - Mark the shortest natural span, the words that carry the term's meaning, without the words around ("⟦ravie⟧", not "était ⟦ravie⟧ de"). A term that is a multi-word expression gets one mark around its French counterpart.
  - Mark every occurrence of a term in the passage.
  - The marks never nest or overlap, and ⟦ ⟧ appear nowhere else. No quotation marks or other markup around a mark.
  - Mark the French counterpart of each term; skip a term only if the French text truly has no words for it. Mark nothing else.`;

const TEXT_ONLY_SYSTEM = `You translate a short English passage into French for a personal English learning app. The reader is a French speaker learning English. The passage comes with the English words (terms) the reader is learning from it.

Rules:
- Natural, everyday French from France, not a word-for-word translation. Keep the meaning, the nuance and the tone.
${TEXT_RULES}`;

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
  /** The post text and its terms, when the post's French text must be made (8.3, 8.4); otherwise null. */
  text: { postText: string; terms: PostTerm[] } | null;
}): Promise<ClaudeResult<Translation>> {
  const { english, text } = options;
  return callClaude({
    kind: "translate",
    postId: options.postId,
    schema: text ? TranslationWithTextSchema : TranslationSchema,
    system: text ? `${WORD_SYSTEM}\n${TEXT_RULES}` : WORD_SYSTEM,
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
            ...(text ? { postText: text.postText, terms: text.terms } : {}),
          },
          null,
          2,
        ),
      },
    ],
  });
}

const PostTextSchema = z.object({ postTextFr: z.string() });

/**
 * The French post text alone (8.4): for a post whose words were translated
 * before the marks existed, so its stored `text_fr` has none. The words'
 * explanations are not touched.
 */
export async function translatePostText(options: {
  postId: string | null;
  postText: string;
  terms: PostTerm[];
}): Promise<ClaudeResult<{ postTextFr: string }>> {
  return callClaude({
    kind: "translate",
    postId: options.postId,
    schema: PostTextSchema,
    system: TEXT_ONLY_SYSTEM,
    maxTokens: 4000,
    effort: "low",
    messages: [
      {
        role: "user",
        content: JSON.stringify({ postText: options.postText, terms: options.terms }, null, 2),
      },
    ],
  });
}
