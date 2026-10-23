import "server-only";

import { z } from "zod";

import { callClaude } from "./client";

/**
 * Claude call #1, extraction (7.2, F3, feasibility §6.3): the screenshot in,
 * the exact text and the red-underlined terms out, through structured outputs.
 */
export const ExtractionSchema = z.object({
  /** The passage, transcribed exactly. Empty when the image has no readable English text. */
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

1. text: the passage the user was reading, transcribed exactly.
- Same words, spelling, capitalisation, punctuation and quotation marks as the image. Don't fix mistakes, don't translate, don't summarise.
- Keep only the running prose that contains the red underlines (the paragraph or paragraphs around them). Leave out everything else in the screenshot: app or browser interface, menus, buttons, headlines, bylines, image captions, ads, timestamps, like or view counts.
- Join lines that were only wrapped by the screen width with a single space. Keep a real paragraph break as one empty line.
- If the image contains no readable English text, return an empty string.

2. terms: every word or expression underlined in red, in reading order.
- surface: the underlined words copied character for character from your text: same letters, same case, same form ("haggling", "snowballed", "Thrilled").
- One underline that covers several words is one term ("hard to swallow", "bounce back"). Two separate underlines are two terms, even when they touch.
- headword: the dictionary form, in lowercase. Verbs in the infinitive without "to" (haggling → haggle, snowballed → snowball, bleaches → bleach). Nouns in the singular. Adjectives and adverbs as they are (thrilled → thrilled). For an expression, its base form (bouncing back → bounce back, was hard to swallow → hard to swallow).
- Only red (or red-orange) marks count: underlines, circles or highlights. Ignore blue links and marks of any other color.
- If nothing is marked in red, return an empty list.`;

export async function extractScreenshot(options: {
  postId: string;
  imageUrl: string;
}): Promise<Extraction> {
  return callClaude({
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
}
