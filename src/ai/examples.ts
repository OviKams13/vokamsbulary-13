import "server-only";

import { z } from "zod";

import { isWellMarked, stripFrenchMarks } from "@/lib/french-marks";

import { callClaude, type ClaudeResult } from "./client";

/**
 * Usage examples (13.2, E-09): 5 sentences per term that teach the reader to
 * use the word actively. They are written by call #2 for a new post (together
 * with the explanation) and by `generateExamples()` for a post published
 * before; the French version is made by `translateExamples()` on Translate.
 *
 * Only the sentences are kept. The studied word sits between ⟦ and ⟧, the
 * marks of the French post text (E-08), and the app shows it highlighted.
 */

export const EXAMPLE_COUNT = 5;

/**
 * The developer's examples prompt, in English: its rules are unchanged (the
 * five sentence types, the contexts, the forms, the senses, the natural
 * English). What the app does differently from the original is listed apart
 * at the end: only the sentences are kept (no grammar label, no explanation,
 * no passive voice), the bold becomes ⟦ ⟧, and the French translation is made
 * later, on Translate.
 */
export const EXAMPLES_RULES = `Five usage examples. Their goal is to teach the reader to use the word actively in different situations, rather than simply to understand its definition.

For verbs and phrasal verbs, write five natural sentences:
1. Present Simple: a sentence describing a habit, a general fact or a common situation.
2. Present Continuous: a sentence showing an action in progress or a situation that is changing.
3. Past Simple: a sentence describing a past event.
4. Future / Conditional: a sentence expressing an intention, a possibility, a consequence or a hypothesis.
5. Question / Negative: a natural question or a negative sentence, possibly with a more advanced grammatical structure.

For nouns, adjectives and adverbs: adapt the five examples to how the word really works. Vary the constructions, the common word combinations (collocations), the contexts and the communication intentions. Never force a conjugation that is impossible.

Important rules:
- Use five really different contexts, for example daily life, work, technology, human relationships and personal development.
- Vary the form of the word when it is natural: base form, -ing, past tense, past participle or other relevant constructions.
- If the word has several common meanings or grammatical functions, show these variations.
- Avoid artificial, repetitive or overly school-like examples. Prefer natural English, like the English used in real conversations or professional situations.
- The examples must be varied, useful for conversation, grammatically correct and natural enough for the reader to reuse them in their own English.

How the app uses them:
- Write the five sentences in this order, and nothing else: no grammar label, no explanation of the structure, no translation. None of the sentences is in the passive voice.
- Each sentence is short: one line on a computer screen, at most two on a phone. At most 12 words.
- The studied word is the term, in the form you use in the sentence ("ramp up", "ramping up", "ramped up"). Put it between ⟦ and ⟧, in every sentence ("Companies often ⟦ramp up⟧ production before the holidays."). If other words come between the parts of a phrasal verb, mark each part. ⟦ ⟧ appear nowhere else.`;

/** Fixed instruction for the standalone call (posts published before 13.2). */
const GENERATE_SYSTEM = `You write usage examples for a personal English learning app. The reader is a French speaker at an upper-intermediate level. You get one English term, with the text it comes from and its definition: use the meaning it has in that text as the main sense.

${EXAMPLES_RULES}`;

const ExamplesSchema = z.object({ examples: z.array(z.string()) });

/**
 * The 5 sentences, trimmed, if there are exactly five and each has its
 * studied word marked; otherwise null (the caller stores no examples and they
 * are made later, on demand).
 */
export function validExamples(items: readonly string[] | undefined): string[] | null {
  if (!items || items.length !== EXAMPLE_COUNT) return null;
  const sentences = items.map((item) => item.trim());
  return sentences.every((sentence) => sentence !== "" && isWellMarked(sentence))
    ? sentences
    : null;
}

export async function generateExamples(options: {
  postId: string | null;
  headword: string;
  surface: string;
  text: string;
  definition: string | null;
}): Promise<ClaudeResult<string[]>> {
  const { output, model } = await callClaude({
    kind: "examples",
    postId: options.postId,
    schema: ExamplesSchema,
    system: GENERATE_SYSTEM,
    // Five short sentences; the rest is room for thinking.
    maxTokens: 4000,
    effort: "medium",
    messages: [
      {
        role: "user",
        content: JSON.stringify(
          {
            term: options.headword,
            asWrittenInText: options.surface,
            definition: options.definition,
            text: options.text,
          },
          null,
          2,
        ),
      },
    ],
  });
  const sentences = validExamples(output.examples);
  if (!sentences) throw new Error("Claude didn't return five usable examples.");
  return { output: sentences, model };
}

const TranslationSchema = z.object({ translations: z.array(z.string()) });

const TRANSLATE_SYSTEM = `You translate short English example sentences into French for a personal English learning app. The reader is a French speaker learning English. The sentences are usage examples of one English word or expression (the term); in each, the term is between ⟦ and ⟧.

Rules:
- Natural, short, everyday French from France, not a word-for-word translation. Keep the meaning and the tone.
- Return exactly one translation per sentence, in the same order.
- In each translation, put ⟦ before the French words that translate the term and ⟧ after them ("Les entreprises ⟦augmentent⟧ souvent leur production avant les fêtes."). Mark the shortest natural span, the words that carry the term's meaning, without the words around. ⟦ ⟧ appear nowhere else, never nest, and have no quotation marks or other markup around them.
- The translations only: no notes, no additions.`;

/** The French sentences, marked like the English ones (E-08). */
export async function translateExamples(options: {
  postId: string | null;
  headword: string;
  sentences: readonly string[];
}): Promise<ClaudeResult<string[]>> {
  const { output, model } = await callClaude({
    kind: "translate",
    postId: options.postId,
    schema: TranslationSchema,
    system: TRANSLATE_SYSTEM,
    maxTokens: 3000,
    effort: "low",
    messages: [
      {
        role: "user",
        content: JSON.stringify({ term: options.headword, sentences: options.sentences }, null, 2),
      },
    ],
  });
  if (output.translations.length !== options.sentences.length) {
    throw new Error("Claude didn't return one translation per example.");
  }
  // A sentence whose marks are broken is kept without them rather than shown with stray brackets.
  const sentences = output.translations.map((translation) => {
    const trimmed = translation.trim();
    return isWellMarked(trimmed) ? trimmed : stripFrenchMarks(trimmed);
  });
  if (sentences.some((sentence) => sentence === "")) {
    throw new Error("Claude returned an empty translation.");
  }
  return { output: sentences, model };
}
