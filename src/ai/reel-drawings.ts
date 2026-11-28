import "server-only";

import { z } from "zod";

import { stripFrenchMarks } from "@/lib/french-marks";
import type { IllustratedKind, ReelSvgs } from "@/lib/reels/script";
import { checkSvg } from "@/lib/reels/svg-check";

import { callClaude, type ClaudeResult } from "./client";

/**
 * Reel drawings (16.1): one Claude call per word, logged in `ai_calls` with
 * kind `reel`. It returns one simple SVG per illustrated screen of the reel
 * and the outro's short line (the gist). Every SVG is checked and rebuilt by
 * `checkSvg()`; one that fails the check is stored as null and its screen
 * shows the empty box.
 */

/** Fixed instruction: the look of the mockups (a.photo/reels). */
const SYSTEM = `You draw the illustrations of a short vocabulary video for a personal English learning app. The video teaches one English word. Each screen of the video shows one drawing above its text. You get the texts of every screen; return one drawing per screen, plus a short line for the last screen.

The drawings
- Each one is a complete SVG document: <svg viewBox='0 0 400 300'> … </svg>, no width or height. Use single quotes for every attribute.
- The app draws the dark box behind it: no background rectangle, no frame.
- Flat, simple, friendly, like a whiteboard sketch on a dark screen. One clear scene that shows the meaning of the screen's text. Few shapes: each drawing stays under 1,500 characters.
- People are stick figures: a circle head (r about 16, no face), a line body, two arms and two legs as lines, stroke-width about 5, stroke-linecap round, no fill. A woman has long hair (two curved lines falling from the head) and a small triangle skirt at the hips. Pose the arms and legs to show the action (pointing, waving, carrying, sitting, running).
- Add props when they help: a chef hat, a scale, a podium, a desk, a laptop, a ball, a cup, a speech or thought bubble, a checklist, a chart, a car, a house, a tree, a phone, a camera.
- A ground line near the bottom (y about 270) when a scene stands on the ground.
- Colours, nothing else: figures #f2eee6; accents #8fb4ff (blue) and #e8b84a (gold); good / yes #3ecf6e; bad / no #ef5b5b; props #3a3940 and #2a2930 (fills) and #9b968c (lines); ground #2e2d35.
- No text, except at most one or two very short labels (one word or a number, in capitals, like PLAN, NO, 1st, 90%), font-family sans-serif, font-weight bold, fill #e8b84a. Never write the studied word or a sentence.
- Allowed elements only: svg, g, path, circle, ellipse, rect, line, polyline, polygon, text. Allowed attributes only: viewBox, x, y, x1, y1, x2, y2, cx, cy, r, rx, ry, width, height, d, points, fill, stroke, stroke-width, stroke-linecap, stroke-linejoin, stroke-dasharray, opacity, fill-opacity, stroke-opacity, transform (translate, rotate, scale), font-size, font-weight, font-family, text-anchor, letter-spacing. No style, class, id, defs, gradients, filters, images, links, animation, script or comments; no entities (no &).
- Make the drawings different from each other: each example sentence has its own scene.

The gist
- One short English line (at most 10 words) that sums up the word's meaning for the last screen, like "Careful thought before you act." It must not contain the word itself.`;

const Svg = z.string();

const DrawingsSchema = z.object({
  meaning: Svg,
  definition: Svg,
  analogy: Svg,
  question: Svg,
  inText: Svg,
  example1: Svg,
  example2: Svg,
  example3: Svg,
  example4: Svg,
  example5: Svg,
  outro: Svg,
  gist: z.string(),
});

const KEYS: Record<IllustratedKind, keyof z.infer<typeof DrawingsSchema>> = {
  meaning: "meaning",
  definition: "definition",
  analogy: "analogy",
  question: "question",
  "in-text": "inText",
  "example-1": "example1",
  "example-2": "example2",
  "example-3": "example3",
  "example-4": "example4",
  "example-5": "example5",
  outro: "outro",
};

export type ReelDrawings = { svgs: ReelSvgs; gist: string; rejected: IllustratedKind[] };

export async function drawReel(options: {
  postId: string;
  headword: string;
  frEquivalents: string[];
  definition: string;
  analogyTitle: string;
  analogyBody: string;
  exampleQuestion: string;
  inYourTextQuote: string;
  inYourTextExplanation: string;
  examples: string[];
}): Promise<ClaudeResult<ReelDrawings>> {
  const { output, model } = await callClaude({
    kind: "reel",
    postId: options.postId,
    schema: DrawingsSchema,
    system: SYSTEM,
    // 11 drawings of about 400 tokens each, the gist, and room for light thinking.
    maxTokens: 16_000,
    effort: "low",
    // A long answer: up to about 2 minutes at the start of the tier. One try, so a
    // run always ends inside the route's 300 s (the next preparation tries again).
    request: { timeoutMs: 240_000, maxRetries: 0 },
    messages: [
      {
        role: "user",
        content: JSON.stringify(
          {
            word: options.headword,
            frenchEquivalents: options.frEquivalents,
            screens: {
              meaning: `What does ${options.headword} mean?`,
              definition: options.definition,
              analogy: `${options.analogyTitle}: ${options.analogyBody}`,
              question: options.exampleQuestion,
              inText: `"${options.inYourTextQuote}" ${options.inYourTextExplanation}`,
              example1: stripFrenchMarks(options.examples[0] ?? ""),
              example2: stripFrenchMarks(options.examples[1] ?? ""),
              example3: stripFrenchMarks(options.examples[2] ?? ""),
              example4: stripFrenchMarks(options.examples[3] ?? ""),
              example5: stripFrenchMarks(options.examples[4] ?? ""),
              outro: "The last screen: the word and the gist line.",
            },
          },
          null,
          2,
        ),
      },
    ],
  });

  const rejected: IllustratedKind[] = [];
  const svgs = Object.fromEntries(
    (Object.keys(KEYS) as IllustratedKind[]).map((kind) => {
      const svg = checkSvg(output[KEYS[kind]]);
      if (!svg) rejected.push(kind);
      return [kind, svg];
    }),
  ) as ReelSvgs;
  const gist = output.gist.replace(/\s+/g, " ").trim();
  if (!gist) throw new Error("Claude returned no gist line.");
  if (rejected.length > 3) {
    throw new Error(`Claude's drawings failed the SVG check (${rejected.join(", ")}).`);
  }
  return { output: { svgs, gist, rejected }, model };
}
