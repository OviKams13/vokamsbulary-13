/**
 * Reels (Phase 16): the script of one reel, shared by the server (16.1, the
 * voice and the timings) and the player (16.2, what each screen shows). No
 * import from the database here: the schema imports this file through a
 * relative path, for drizzle-kit.
 *
 * One reel = one word (term) of a published post. It is a list of screens;
 * most screens have an English line, then the same picture with the French
 * line. Every line is read aloud and its text is the stored text, exactly
 * (only the ⟦ ⟧ marks are removed for the voice).
 */

import { stripFrenchMarks } from "../french-marks";

export type ReelLanguage = "en" | "fr";

/** The screens of a reel, in order. `post` exists only for a post's first word. */
export const REEL_SCREEN_KINDS = [
  "post",
  "meaning",
  "definition",
  "analogy",
  "question",
  "in-text",
  "intro",
  "example-1",
  "example-2",
  "example-3",
  "example-4",
  "example-5",
  "outro",
] as const;

export type ReelScreenKind = (typeof REEL_SCREEN_KINDS)[number];

/** Screens that get a drawing from Claude (the post card and the intro are text only). */
export const ILLUSTRATED_KINDS = [
  "meaning",
  "definition",
  "analogy",
  "question",
  "in-text",
  "example-1",
  "example-2",
  "example-3",
  "example-4",
  "example-5",
  "outro",
] as const satisfies readonly ReelScreenKind[];

export type IllustratedKind = (typeof ILLUSTRATED_KINDS)[number];

/** One drawing per illustrated screen; null when Claude's SVG was rejected. */
export type ReelSvgs = Record<IllustratedKind, string | null>;

/** One spoken line, as stored once the reel is ready. Times are at 1× speed. */
export type ReelLine = {
  language: ReelLanguage;
  /** What the voice says: the stored text, without ⟦ ⟧. */
  spoken: string;
  /** Where the line starts in the reel's single MP3 (ms). */
  audioStartMs: number;
  /** Length of the voice (ms). */
  audioMs: number;
  /** How long the screen stays in this step: max(animation, 0.5 s + voice + 0.7 s). */
  stepMs: number;
};

export type ReelScreen = { kind: ReelScreenKind; lines: ReelLine[] };

/** The voice starts this long after the step appears. */
export const VOICE_DELAY_MS = 500;
/** Silence kept after the voice before the next step. */
export const VOICE_TAIL_MS = 700;

/** Animation time of a step (the player's appear / marker sweep / counter), at 1×. */
export function animationMs(kind: ReelScreenKind): number {
  if (kind === "post" || kind === "definition") return 1600;
  if (kind.startsWith("example-")) return 1400;
  return 1200;
}

/** Each step lasts max(its animation, 0.5 s + voice + 0.7 s). */
export function stepMs(kind: ReelScreenKind, audioMs: number): number {
  return Math.max(animationMs(kind), VOICE_DELAY_MS + audioMs + VOICE_TAIL_MS);
}

export const EXAMPLE_NUMBERS = ["One", "Two", "Three", "Four", "Five"] as const;

export const INTRO_LINE = "Let's go: five ways to use it.";

/** "What does measure mean?" (16.1, screen 2, the headword). */
export function meaningLine(headword: string): string {
  return `What does ${headword} mean?`;
}

/** "Et en français ? mesure, retenue" (16.1, screen 2 in French). */
export function meaningLineFr(frEquivalents: readonly string[]): string {
  return `Et en français ? ${frEquivalents.join(", ")}`;
}

/** Two stored texts read one after the other, with a full stop between them when needed. */
export function joinSpoken(first: string, second: string): string {
  const head = first.trim();
  const tail = second.trim();
  if (!head) return tail;
  if (!tail) return head;
  return /[.!?…:;»"”’)]$/u.test(head) ? `${head} ${tail}` : `${head}. ${tail}`;
}

/** The stored texts a reel is made of. French texts must all be there. */
export type ReelTexts = {
  headword: string;
  /** Only for the first word of a post: its English text and marked French text. */
  post: { text: string; textFr: string } | null;
  frEquivalents: string[];
  en: {
    definition: string;
    analogyTitle: string;
    analogyBody: string;
    exampleQuestion: string;
    inYourTextQuote: string;
    inYourTextExplanation: string;
  };
  fr: {
    definition: string;
    analogyTitle: string;
    analogyBody: string;
    exampleQuestionFr: string;
    inYourTextExplanation: string;
  };
  /** The 5 English and the 5 French examples, with their ⟦ ⟧ marks. */
  examples: string[];
  examplesFr: string[];
  /** The outro's short line, written with the drawings. */
  gist: string;
};

/** A line to synthesize, before its audio exists. */
export type ScriptLine = { language: ReelLanguage; spoken: string };
export type ScriptScreen = { kind: ReelScreenKind; lines: ScriptLine[] };

const en = (spoken: string): ScriptLine => ({ language: "en", spoken: clean(spoken) });
const fr = (spoken: string): ScriptLine => ({ language: "fr", spoken: clean(spoken) });

/** The voice reads plain text: no marks, one space between words. */
function clean(text: string): string {
  return stripFrenchMarks(text).replace(/\s+/g, " ").trim();
}

/** The screens and lines of one reel, in order (16.1, screens 1–9). */
export function buildScript(texts: ReelTexts): ScriptScreen[] {
  const screens: ScriptScreen[] = [];
  if (texts.post) {
    screens.push({ kind: "post", lines: [en(texts.post.text), fr(texts.post.textFr)] });
  }
  screens.push(
    {
      kind: "meaning",
      lines: [en(meaningLine(texts.headword)), fr(meaningLineFr(texts.frEquivalents))],
    },
    { kind: "definition", lines: [en(texts.en.definition), fr(texts.fr.definition)] },
    {
      kind: "analogy",
      lines: [
        en(joinSpoken(texts.en.analogyTitle, texts.en.analogyBody)),
        fr(joinSpoken(texts.fr.analogyTitle, texts.fr.analogyBody)),
      ],
    },
    { kind: "question", lines: [en(texts.en.exampleQuestion), fr(texts.fr.exampleQuestionFr)] },
    {
      kind: "in-text",
      lines: [
        en(joinSpoken(texts.en.inYourTextQuote, texts.en.inYourTextExplanation)),
        fr(texts.fr.inYourTextExplanation),
      ],
    },
    { kind: "intro", lines: [en(INTRO_LINE)] },
  );
  texts.examples.forEach((sentence, index) => {
    screens.push({
      kind: `example-${index + 1}` as ReelScreenKind,
      lines: [
        en(joinSpoken(`${EXAMPLE_NUMBERS[index]}.`, sentence)),
        fr(texts.examplesFr[index] ?? ""),
      ],
    });
  });
  screens.push({ kind: "outro", lines: [en(joinSpoken(texts.headword, texts.gist))] });

  // A line with nothing to say (an empty stored text) is not read.
  return screens.map((screen) => ({
    ...screen,
    lines: screen.lines.filter((line) => line.spoken !== ""),
  }));
}

/** Characters sent to the voice for a script (what Google bills). */
export function scriptCharacters(screens: readonly ScriptScreen[]): number {
  return screens.reduce(
    (total, screen) =>
      total + screen.lines.reduce((sum, line) => sum + Array.from(line.spoken).length, 0),
    0,
  );
}
