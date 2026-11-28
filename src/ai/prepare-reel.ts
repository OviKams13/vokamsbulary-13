import "server-only";

import { del, put } from "@vercel/blob";
import { and, asc, eq, isNull, lt, ne, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db, explanations, posts, reels, termExamples, terms, ttsCalls } from "@/db";
import { hasFrenchMarks, isWellMarked } from "@/lib/french-marks";
import {
  buildScript,
  type ReelScreen,
  type ReelSvgs,
  type ReelTexts,
  stepMs,
} from "@/lib/reels/script";

import { getOrCreateExamples, getOrCreateExamplesFrench } from "./examples-term";
import { drawReel } from "./reel-drawings";
import { getOrCreateFrench } from "./translate-term";
import { translatePostText } from "./translate";
import { VOICES, voiceReel } from "./tts";

/**
 * Prepares the reel of one word (16.1), in three steps, each saved as soon as
 * it is done, so a run that stops (time limit, error) loses only its current
 * step and the next run continues from there:
 *
 * 1. Texts: the French texts the reel reads, made with the existing calls if
 *    missing (the word's French explanation, its 5 examples and their French,
 *    and for a post's first word the marked French post text).
 * 2. Drawings: one Claude call (`drawReel()`), the SVGs and the gist stored.
 * 3. Voice: one Google TTS request per line, joined into one MP3, uploaded to
 *    Vercel Blob; the timings stored and the reel marked `ready`.
 *
 * A run holds the reel (`locked_until`) so two runs never build the same one.
 * Never throws: errors are stored in `reels.last_error` (status `failed`), and
 * the next preparation tries again.
 */

/** Vercel Hobby's function limit (the routes set `maxDuration = 300`). */
export const RUN_LIMIT_MS = 300_000;
/** The drawing call may take up to 240 s: start it only with this much time left. */
const DRAW_NEEDS_MS = 250_000;
/** The voice and the upload: start them only with this much time left. */
const VOICE_NEEDS_MS = 45_000;
/** How long a run holds a reel: a run cut by the time limit frees it by then. */
const LOCK_MS = RUN_LIMIT_MS + 10_000;

export type PrepareStatus =
  /** Ready to play. */
  | "ready"
  /** Not finished in this run (out of time): prepare again. */
  | "pending"
  /** Another run is preparing it. */
  | "busy"
  | "failed"
  /** Not a word of a published post (deleted, or a draft). */
  | "missing";

export type PrepareResult = { status: PrepareStatus; error?: string };

/** `startedAt`: when the function run began (`performance.now()`), for the time limit. */
export async function prepareReel(termId: string, startedAt: number): Promise<PrepareResult> {
  const left = () => RUN_LIMIT_MS - (performance.now() - startedAt);

  const [word] = await db
    .select({
      postId: terms.postId,
      position: terms.position,
      firstPosition: sql<number>`(SELECT min(t2.position) FROM ${terms} t2 WHERE t2.post_id = ${terms.postId})`,
    })
    .from(terms)
    .innerJoin(posts, and(eq(posts.id, terms.postId), eq(posts.status, "published")))
    .where(eq(terms.id, termId));
  if (!word) return { status: "missing" };

  await db
    .insert(reels)
    .values({ termId, postId: word.postId })
    .onConflictDoNothing({ target: reels.termId });

  // Take the reel, unless it is ready or another run holds it.
  const [reel] = await db
    .update(reels)
    .set({ lockedUntil: new Date(Date.now() + LOCK_MS), updatedAt: new Date() })
    .where(
      and(
        eq(reels.termId, termId),
        ne(reels.status, "ready"),
        or(isNull(reels.lockedUntil), lt(reels.lockedUntil, new Date())),
      ),
    )
    .returning({ id: reels.id, svgs: reels.svgs, gist: reels.gist });
  if (!reel) {
    const [current] = await db
      .select({ status: reels.status })
      .from(reels)
      .where(eq(reels.termId, termId));
    if (!current) return { status: "missing" };
    return { status: current.status === "ready" ? "ready" : "busy" };
  }

  const release = (values: Partial<typeof reels.$inferInsert>) =>
    db
      .update(reels)
      .set({ ...values, lockedUntil: null, updatedAt: new Date() })
      .where(eq(reels.id, reel.id));

  try {
    // Steps 1 and 2 go together: no text call in a run that couldn't draw next.
    if (!reel.svgs && left() < DRAW_NEEDS_MS) {
      await release({});
      return { status: "pending" };
    }

    // Step 1: the French texts.
    const isFirst = word.position === Number(word.firstPosition);
    await ensureTexts(termId, word.postId, isFirst);
    const texts = await loadTexts(termId, isFirst);

    // Step 2: the drawings.
    let svgs = reel.svgs;
    let gist = reel.gist;
    if (!svgs || !gist) {
      if (left() < DRAW_NEEDS_MS) {
        await release({});
        return { status: "pending" };
      }
      const { output, model } = await drawReel({
        postId: word.postId,
        headword: texts.headword,
        frEquivalents: texts.frEquivalents,
        definition: texts.en.definition,
        analogyTitle: texts.en.analogyTitle,
        analogyBody: texts.en.analogyBody,
        exampleQuestion: texts.en.exampleQuestion,
        inYourTextQuote: texts.en.inYourTextQuote,
        inYourTextExplanation: texts.en.inYourTextExplanation,
        examples: texts.examples,
      });
      svgs = output.svgs;
      gist = output.gist;
      if (output.rejected.length > 0) {
        console.warn(`Reel ${termId}: drawings rejected by the SVG check:`, output.rejected);
      }
      await db
        .update(reels)
        .set({ svgs, gist, model, updatedAt: new Date() })
        .where(eq(reels.id, reel.id));
    }

    // Step 3: the voice.
    if (left() < VOICE_NEEDS_MS) {
      await release({});
      return { status: "pending" };
    }
    const ready = await voiceAndStore({
      reelId: reel.id,
      termId,
      postId: word.postId,
      texts: { ...texts, gist },
      svgs,
    });
    return ready ? { status: "ready" } : { status: "missing" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Reel preparation failed for term ${termId}:`, message);
    await release({ status: "failed", lastError: message }).catch(() => {
      // The post may have been deleted meanwhile: nothing left to mark.
    });
    return { status: "failed", error: message };
  }
}

/**
 * After a publish (16.3): every word of the post gets a `pending` reel (the
 * queue the browser continues while the app is open), then the reels are
 * prepared in order while time is left: at least the first word.
 */
export async function prepareReelsOfPost(postId: string, startedAt: number): Promise<void> {
  try {
    const words = await db
      .select({ id: terms.id })
      .from(terms)
      .where(eq(terms.postId, postId))
      .orderBy(asc(terms.position));
    if (words.length === 0) return;
    await db
      .insert(reels)
      .values(words.map((word) => ({ termId: word.id, postId })))
      .onConflictDoNothing({ target: reels.termId });
    for (const word of words) {
      const result = await prepareReel(word.id, startedAt);
      if (result.status === "pending" || result.status === "missing") return;
    }
  } catch (error) {
    console.error(`Reels of post ${postId}:`, error instanceof Error ? error.message : error);
  }
}

// ---------------------------------------------------------------------------
// Step 1: texts
// ---------------------------------------------------------------------------

async function ensureTexts(termId: string, postId: string, isFirst: boolean): Promise<void> {
  const french = await getOrCreateFrench(termId);
  if (!french.ok) throw new Error(`No French explanation (${french.reason}).`);
  const examples = await getOrCreateExamples(termId);
  if (!examples.ok) throw new Error(`No usage examples (${examples.reason}).`);
  const examplesFr = await getOrCreateExamplesFrench(termId);
  if (!examplesFr.ok) throw new Error(`No French examples (${examplesFr.reason}).`);

  // The post screen (first word) reads the marked French post text. A word
  // translated before 8.3 / 8.4 may have left it empty or without marks.
  if (isFirst && (!french.textFr || !hasFrenchMarks(french.textFr))) {
    const [post] = await db
      .select({ text: posts.text, textFr: posts.textFr })
      .from(posts)
      .where(eq(posts.id, postId));
    if (!post?.text) throw new Error("The post has no text.");
    const postTerms = await db
      .select({ surface: terms.surface, headword: terms.headword })
      .from(terms)
      .where(eq(terms.postId, postId))
      .orderBy(asc(terms.position));
    const { output } = await translatePostText({ postId, postText: post.text, terms: postTerms });
    const marked = output.postTextFr.trim();
    if (!isWellMarked(marked)) throw new Error("The French post text came back without marks.");
    await db
      .update(posts)
      .set({ textFr: marked })
      .where(
        and(
          eq(posts.id, postId),
          eq(posts.text, post.text),
          post.textFr === null ? isNull(posts.textFr) : eq(posts.textFr, post.textFr),
        ),
      );
  }
}

const fr = alias(explanations, "fr");
const examplesEn = alias(termExamples, "examples_en");
const examplesFr = alias(termExamples, "examples_fr");

/** Every stored text of the reel, after step 1. The gist comes from step 2. */
async function loadTexts(termId: string, isFirst: boolean): Promise<Omit<ReelTexts, "gist">> {
  const [row] = await db
    .select({
      headword: terms.headword,
      text: posts.text,
      textFr: posts.textFr,
      en: explanations,
      fr,
      examples: examplesEn.sentences,
      examplesFr: examplesFr.sentences,
    })
    .from(terms)
    .innerJoin(posts, eq(posts.id, terms.postId))
    .innerJoin(
      explanations,
      and(eq(explanations.termId, terms.id), eq(explanations.language, "en")),
    )
    .innerJoin(fr, and(eq(fr.termId, terms.id), eq(fr.language, "fr")))
    .innerJoin(examplesEn, and(eq(examplesEn.termId, terms.id), eq(examplesEn.language, "en")))
    .innerJoin(examplesFr, and(eq(examplesFr.termId, terms.id), eq(examplesFr.language, "fr")))
    .where(eq(terms.id, termId));
  if (!row) throw new Error("The reel's texts are incomplete.");
  if (isFirst && (!row.text || !row.textFr)) throw new Error("The post text is missing.");

  return {
    headword: row.headword,
    post: isFirst ? { text: row.text!, textFr: row.textFr! } : null,
    frEquivalents: row.en.frEquivalents,
    en: {
      definition: row.en.definition,
      analogyTitle: row.en.analogyTitle,
      analogyBody: row.en.analogyBody,
      exampleQuestion: row.en.exampleQuestion,
      inYourTextQuote: row.en.inYourTextQuote,
      inYourTextExplanation: row.en.inYourTextExplanation,
    },
    fr: {
      definition: row.fr.definition,
      analogyTitle: row.fr.analogyTitle,
      analogyBody: row.fr.analogyBody,
      exampleQuestionFr: row.fr.exampleQuestionFr ?? "",
      inYourTextExplanation: row.fr.inYourTextExplanation,
    },
    examples: row.examples,
    examplesFr: row.examplesFr,
  };
}

// ---------------------------------------------------------------------------
// Step 3: voice, upload, timings
// ---------------------------------------------------------------------------

async function voiceAndStore(options: {
  reelId: string;
  termId: string;
  postId: string;
  texts: ReelTexts;
  svgs: ReelSvgs;
}): Promise<boolean> {
  const script = buildScript(options.texts);
  const lines = script.flatMap((screen) => screen.lines);
  const started = performance.now();
  let characters = 0;

  const log = (values: {
    voiceEn: string;
    voiceFr: string;
    success: boolean;
    error: string | null;
  }) =>
    db
      .insert(ttsCalls)
      .values({
        postId: options.postId,
        termId: options.termId,
        characters,
        lines: lines.length,
        durationMs: Math.round(performance.now() - started),
        ...values,
      })
      .catch((error: unknown) => {
        // The post may have been deleted during the call: keep the count without the links.
        return db
          .insert(ttsCalls)
          .values({
            characters,
            lines: lines.length,
            durationMs: Math.round(performance.now() - started),
            ...values,
          })
          .catch(() => console.error("Could not log the TTS characters:", error));
      });

  let voice;
  try {
    voice = await voiceReel(lines, (count) => {
      characters += count;
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Both families were tried; the last one was Neural2.
    await log({
      voiceEn: VOICES.neural2.en,
      voiceFr: VOICES.neural2.fr,
      success: false,
      error: message,
    });
    throw error;
  }
  await log({ voiceEn: voice.voices.en, voiceFr: voice.voices.fr, success: true, error: null });

  // The screens with their timed lines, in script order.
  let index = 0;
  const screens: ReelScreen[] = script.map((screen) => ({
    kind: screen.kind,
    lines: screen.lines.map((line) => {
      const voiced = voice.lines[index++]!;
      return {
        language: line.language,
        spoken: line.spoken,
        audioStartMs: voiced.audioStartMs,
        audioMs: voiced.audioMs,
        stepMs: stepMs(screen.kind, voiced.audioMs),
      };
    }),
  }));
  const totalMs = screens.reduce(
    (total, screen) => total + screen.lines.reduce((sum, line) => sum + line.stepMs, 0),
    0,
  );

  const blob = await put(`reels/${options.postId}/${options.termId}.mp3`, Buffer.from(voice.file), {
    access: "public",
    contentType: "audio/mpeg",
    addRandomSuffix: true,
  });

  const stored = await db
    .update(reels)
    .set({
      status: "ready",
      screens,
      audioUrl: blob.url,
      audioPathname: blob.pathname,
      voiceEn: voice.voices.en,
      voiceFr: voice.voices.fr,
      ttsChars: characters,
      totalMs,
      lockedUntil: null,
      lastError: null,
      updatedAt: new Date(),
    })
    .where(and(eq(reels.id, options.reelId), ne(reels.status, "ready")))
    .returning({ id: reels.id });
  if (stored.length === 0) {
    // The post was deleted (or the reel finished elsewhere) meanwhile: no orphan file.
    await del(blob.url).catch(() => {});
    return false;
  }
  return true;
}
