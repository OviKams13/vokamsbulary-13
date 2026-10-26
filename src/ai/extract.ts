import "server-only";

import { z } from "zod";

import { callClaude } from "./client";

/**
 * Claude call #1, extraction (7.2, F3, feasibility §6.3): the screenshot in,
 * the exact text and the red-underlined terms out, through structured outputs.
 */
export const ExtractionSchema = z.object({
  /** Only the sentences with an underline (13.1), transcribed exactly. Empty when the image has no readable English text. */
  text: z.string(),
  /** Every red-underlined word or expression, in reading order. */
  terms: z.array(
    z.object({
      /** Exactly as written in `text`. */
      surface: z.string(),
      /** Dictionary form, lowercase. */
      headword: z.string(),
    }),
  ),
});

export type Extraction = z.infer<typeof ExtractionSchema>;

/** Fixed instruction (no per-post data), so it can be cached later if it grows. */
const SYSTEM = `You read screenshots for a personal English vocabulary app. The user reads English text, underlines in red the words or expressions they don't know, takes a screenshot and sends it to you.

Return two things.

1. text: the sentences the user underlined words in, transcribed exactly.
- Same words, spelling, capitalisation, punctuation and quotation marks as the image. Don't fix mistakes, don't translate, don't summarise.
- Keep only the sentences that contain a red underline: each one complete, in reading order, nothing cut in the middle. Leave out every sentence without an underline, even inside the same paragraph, and everything else in the screenshot: app or browser interface, menus, buttons, headlines, bylines, image captions, ads, timestamps, like or view counts.
- Keep it short: ideally 2 or 3 lines of the screenshot, never more than 4 or 5. Never drop an underlined term to stay short: every term must still be in your text.
- Join lines that were only wrapped by the screen width, and sentences that follow each other, with a single space. Only sentences that come from different paragraphs are separated by one empty line.
- If the image contains no readable English text, return an empty string.

2. terms: every word or expression underlined in red, in reading order.
- surface: the underlined words copied character for character from your text: same letters, same case, same form ("haggling", "snowballed", "Thrilled").
- One underline that covers several words is one term ("hard to swallow", "bounce back"). Two separate underlines are two terms, even when they touch.
- headword: the dictionary form, in lowercase. Verbs in the infinitive without "to" (haggling → haggle, snowballed → snowball, bleaches → bleach). Nouns in the singular. Adjectives and adverbs as they are (thrilled → thrilled). For an expression that is a dictionary entry, its base form (bouncing back → bounce back, was hard to swallow → hard to swallow, lump sums → lump sum).
- When the underlined words are a free phrase rather than a dictionary entry (an adjective + noun group, a fragment of a sentence), keep them as written, only in lowercase: don't singularise or reshape them (yet proven steps → yet proven steps).
- Only red (or red-orange) marks count: underlines, circles or highlights. Ignore blue links and marks of any other color.
- If nothing is marked in red, return an empty list.`;

export async function extractScreenshot(options: {
  /** Null for a test run that belongs to no post (the call is still logged). */
  postId: string | null;
  imageUrl: string;
}): Promise<Extraction> {
  const { output } = await callClaude({
    kind: "extract",
    postId: options.postId,
    schema: ExtractionSchema,
    system: SYSTEM,
    // Text + a short list; the rest of the budget is room for thinking.
    maxTokens: 8000,
    // Reading text and spotting underlines needs care, not long reasoning.
    effort: "medium",
    messages: [
      {
        role: "user",
        content: [
          // Public Blob URL: Claude fetches the image itself (no base64 round trip).
          { type: "image", source: { type: "url", url: options.imageUrl } },
          { type: "text", text: "Extract the text and the red-underlined terms." },
        ],
      },
    ],
  });
  return output;
}
