/**
 * Dev seed (2.11, X-10): 20 fake published posts with terms, EN explanations
 * and themes, so the UI can be built before the real pipeline exists.
 *
 *   npm run db:seed              → seeds an empty database
 *   npm run db:seed -- --reset   → deletes the previous seed posts first
 *
 * Runs against `.env.local` only, i.e. the Neon `dev` branch. Safety rails:
 * - refuses to run on Vercel or with NODE_ENV=production;
 * - refuses when the database holds any real (non-seed) post, so it can never
 *   mix fake posts into real data;
 * - seed posts are recognisable by their `image_pathname` prefix `seed/`, and
 *   `--reset` deletes only those.
 */
import { randomUUID } from "node:crypto";

import { count, like, not, sql } from "drizzle-orm";

import {
  db,
  explanations,
  postRanks,
  posts,
  terms,
  type NewExplanation,
  type NewPost,
  type NewTerm,
} from "@/db";
import { SEED_IMAGE_PREFIX } from "@/lib/seed";
import { THEMES } from "@/themes";

import { SEED_POSTS } from "./seed-data";

const SEED_PREFIX = SEED_IMAGE_PREFIX;
const SEED_MODEL = "seed";
const HOUR = 60 * 60 * 1000;

async function main() {
  if (process.env.VERCEL_ENV || process.env.NODE_ENV === "production") {
    throw new Error("The dev seed never runs on Vercel or in production.");
  }
  const reset = process.argv.includes("--reset");

  const [real] = await db
    .select({ n: count() })
    .from(posts)
    .where(not(like(posts.imagePathname, `${SEED_PREFIX}%`)));
  if (real && real.n > 0) {
    throw new Error(
      `This database has ${real.n} real post(s). The seed only runs on a database ` +
        "without real posts (the Neon dev branch).",
    );
  }

  const [existing] = await db
    .select({ n: count() })
    .from(posts)
    .where(like(posts.imagePathname, `${SEED_PREFIX}%`));
  if (existing && existing.n > 0 && !reset) {
    throw new Error(
      `${existing.n} seed post(s) already exist. Run \`npm run db:seed -- --reset\` to replace them.`,
    );
  }

  const { postRows, termRows, explanationRows } = buildRows();

  // One batch = one transaction: either everything is written or nothing.
  await db.batch([
    db.delete(posts).where(like(posts.imagePathname, `${SEED_PREFIX}%`)),
    db.insert(posts).values(postRows),
    db.insert(terms).values(termRows),
    db.insert(explanations).values(explanationRows),
  ]);

  const totws = await db
    .select({ totw: postRanks.totwNumber, posts: sql<number>`count(*)::int` })
    .from(postRanks)
    .groupBy(postRanks.totwNumber)
    .orderBy(postRanks.totwNumber);

  console.log(
    `Seeded ${postRows.length} posts, ${termRows.length} terms, ${explanationRows.length} EN explanations` +
      (reset ? " (previous seed replaced)." : "."),
  );
  for (const row of totws) console.log(`  TOTW ${row.totw}: ${row.posts}/15`);
}

function buildRows() {
  const random = seededRandom(13);
  const now = Date.now();
  const postRows: NewPost[] = [];
  const termRows: NewTerm[] = [];
  const explanationRows: NewExplanation[] = [];
  let previousTheme: string | null = null;

  SEED_POSTS.forEach((seed, index) => {
    const postId = randomUUID();
    // About one post a day, the newest two hours ago.
    const ageHours = (SEED_POSTS.length - 1 - index) * 26 + 2;
    const publishedAt = new Date(now - ageHours * HOUR);

    // Random theme, never the same as the previous post (D-11).
    const choices = THEMES.filter((theme) => theme.key !== previousTheme);
    const themeKey = choices[Math.floor(random() * choices.length)].key;
    previousTheme = themeKey;

    const number = String(index + 1).padStart(2, "0");
    postRows.push({
      id: postId,
      status: "published",
      // No screenshot for fake posts: a static app icon stands in for it.
      imageUrl: "/icons/icon-512.png",
      imagePathname: `${SEED_PREFIX}post-${number}.png`,
      imageWidth: 512,
      imageHeight: 512,
      extractedText: seed.text,
      text: seed.text,
      themeKey,
      publishedAt,
      createdAt: publishedAt,
      updatedAt: publishedAt,
    });

    seed.terms.forEach((term, termIndex) => {
      if (!seed.text.toLowerCase().includes(term.surface.toLowerCase())) {
        throw new Error(`Post ${number}: "${term.surface}" does not appear in the text.`);
      }
      const termId = randomUUID();
      termRows.push({
        id: termId,
        postId,
        position: termIndex + 1,
        surface: term.surface,
        headword: term.headword,
        createdAt: publishedAt,
      });
      explanationRows.push({
        termId,
        language: "en",
        frEquivalents: term.fr,
        definition: term.definition,
        analogyTitle: term.analogyTitle,
        analogyBody: term.analogyBody,
        analogyEmoji: term.emoji,
        exampleQuestion: term.question,
        inYourTextQuote: sentenceWith(seed.text, term.surface),
        inYourTextExplanation: term.inContext,
        model: SEED_MODEL,
        createdAt: publishedAt,
      });
    });
  });

  return { postRows, termRows, explanationRows };
}

/** The sentence of `text` that contains `surface`, used as the "In your text" quote. */
function sentenceWith(text: string, surface: string): string {
  const sentences = text.split(/(?<=[.!?:])\s+/);
  const needle = surface.toLowerCase();
  return sentences.find((sentence) => sentence.toLowerCase().includes(needle)) ?? text;
}

/** Small deterministic PRNG (mulberry32), so every seed run picks the same themes. */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

main().catch((error: unknown) => {
  console.error("Seed failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
