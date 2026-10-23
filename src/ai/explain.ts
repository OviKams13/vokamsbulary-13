import "server-only";

import { z } from "zod";

import { callClaude, type ClaudeResult } from "./client";

/**
 * Claude call #2, explanation (7.8, F5, feasibility §6.3): the confirmed text
 * and terms in (no image), one English explanation per term out, through
 * structured outputs.
 */

/** An English question: it ends with "?", possibly followed by a closing quote. */
const QUESTION = /\?["'”’]?\s*$/;

const TermExplanationSchema = z.object({
  /** The term's number in the request (1, 2, 3…), to match answers to terms. */
  position: z.number().int(),
  /** 2 or 3 French equivalents, most common first ("Ravi", "Enchanté", "Euphorique"). */
  fr: z.array(z.string()).min(1),
  definition: z.string(),
  analogy: z.object({
    /** "The surprise party analogy". */
    title: z.string(),
    body: z.string(),
    /** One emoji, or "" when none fits. */
    emoji: z.string(),
  }),
  /** One example sentence, always a question (feasibility §6.3). */
  example: z.string().regex(QUESTION, "The example must be a question ending with ?"),
  inYourText: z.object({
    /** Short excerpt copied exactly from the text, containing the term as written. */
    quote: z.string(),
    explanation: z.string(),
  }),
});

export const ExplanationSchema = z.object({ explanations: z.array(TermExplanationSchema) });

export type TermExplanation = z.infer<typeof TermExplanationSchema>;

/** Fixed instruction (no per-post data). */
const SYSTEM = `You write vocabulary explanations for a personal English learning app. The reader is a French speaker at an upper-intermediate level. They read an English text, marked the words or expressions they didn't know, and confirmed the list. For each term, write one explanation of the meaning it has in this text.

Fields, for each term:

- position: the term's number, as given.
- fr: 2 or 3 French equivalents of the meaning in this text, most common first, each starting with a capital letter ("Ravi", "Enchanté", "Euphorique"). Short words or expressions, not sentences.
- definition: one or two plain English sentences. Give the nuance that sets the term apart from a plainer word ("Extremely pleased and excited. Not just happy, but buzzing with a strong, sudden joy."). Don't start with the term itself.
- analogy.title: "The … analogy", named after a short everyday scene ("The surprise party analogy").
- analogy.body: that scene in two or three sentences the reader can picture, ending on how it shows the term ("That jump of joy in your chest is being thrilled.").
- analogy.emoji: one emoji that matches the scene.
- example: one natural sentence that uses the term, in a new situation (not the text's). It is ALWAYS a question, ends with "?", and speaks to the reader so they could answer it ("Were you thrilled when everyone jumped out and yelled surprise?"). Never a statement.
- inYourText.quote: the part of the text that contains the term, copied exactly (same words, case and punctuation), with the term written exactly as given. A clause or short sentence of about 5 to 15 words, not the whole paragraph. No quotation marks around it.
- inYourText.explanation: one or two sentences on what the term means in that exact spot, naming the people or things of the text.

Use simple, everyday English everywhere except in fr. Return exactly one explanation per term, in the order given.

Example, for the term "reluctant" in "The coach was adamant that nobody would skip training. A few players were reluctant at first, but he refused to budge.":
{"position": 1, "fr": ["Réticent", "Hésitant", "Peu enclin"], "definition": "Not willing to do something, so you do it slowly or without enthusiasm.", "analogy": {"title": "The cold pool analogy", "body": "You stand at the edge of a cold pool, one toe in the water. You will get in, but not happily.", "emoji": "🏊"}, "example": "Were you reluctant to speak English in front of the class?", "inYourText": {"quote": "A few players were reluctant at first", "explanation": "Some players did not want to train at the beginning."}}`;

export type TermToExplain = { position: number; surface: string; headword: string };

export async function explainTerms(options: {
  postId: string | null;
  text: string;
  terms: TermToExplain[];
}): Promise<ClaudeResult<TermExplanation[]>> {
  const termList = options.terms
    .map((term) => `${term.position}. "${term.surface}" (base form: ${term.headword})`)
    .join("\n");

  const { output, model } = await callClaude({
    kind: "explain",
    postId: options.postId,
    schema: ExplanationSchema,
    system: SYSTEM,
    // About 600 output tokens per term; the rest is room for thinking.
    maxTokens: 16000,
    // Clear, well-chosen wording matters; it doesn't need long reasoning.
    effort: "medium",
    messages: [
      {
        role: "user",
        content: `Text:\n${options.text}\n\nTerms:\n${termList}`,
      },
    ],
  });
  return { output: output.explanations, model };
}
