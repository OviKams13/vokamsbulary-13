/**
 * Database schema, written from the ERD (a.ERD_Vokamsbulary13_EN.md, v1.0).
 *
 * Migrations in `drizzle/` are generated from this file with
 * `npm run db:generate` and are never hand-edited once applied.
 * `pg_trgm` is enabled by the first (custom) migration, before any index uses it.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  pgView,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Enums (ERD §2)
// ---------------------------------------------------------------------------

/** Life cycle of a post (ERD §6). Every status except `published` is a draft. */
export const postStatus = pgEnum("post_status", [
  "uploaded",
  "extracted",
  "explained",
  "published",
]);

export const explanationLanguage = pgEnum("explanation_language", ["en", "fr"]);

export const aiCallKind = pgEnum("ai_call_kind", ["extract", "explain", "translate", "examples"]);

// ---------------------------------------------------------------------------
// Tables (ERD §3)
// ---------------------------------------------------------------------------

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

/** One uploaded screenshot, which becomes one post once published. */
export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    status: postStatus("status").notNull().default("uploaded"),
    /** Public Vercel Blob URL of the resized screenshot. */
    imageUrl: text("image_url").notNull(),
    /** Blob key, used to delete the file. */
    imagePathname: text("image_pathname").notNull(),
    imageWidth: integer("image_width").notNull(),
    imageHeight: integer("image_height").notNull(),
    /** Raw text from Claude call #1, kept unchanged (E-01). */
    extractedText: text("extracted_text"),
    /** Text confirmed at verification. This is the text the post displays. */
    text: text("text"),
    /**
     * French translation of `text` (E-07), made by call #3 with the first
     * Translate of the post. Only published posts have one; cleared if `text` changes.
     */
    textFr: text("text_fr"),
    /** Theme preset key from `src/themes`, set at publication (D-11). */
    themeKey: text("theme_key"),
    /** Set at publication. Defines the TOTW order (D-10). */
    publishedAt: timestamp("published_at", { withTimezone: true }),
    /** Last processing error (Claude or Blob), shown with a Retry button. */
    lastError: text("last_error"),
    createdAt: createdAt(),
    /** Set by the app on every update. */
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "posts_published_at_matches_status",
      sql`(${t.status} = 'published') = (${t.publishedAt} IS NOT NULL)`,
    ),
    check(
      "posts_published_has_text_and_theme",
      sql`${t.status} <> 'published' OR (${t.text} IS NOT NULL AND ${t.themeKey} IS NOT NULL)`,
    ),
    // Feed, TOTW rank, previous theme.
    index("posts_status_published_at_id_idx").on(t.status, t.publishedAt, t.id),
    // Search inside post text (F12).
    index("posts_text_trgm_idx").using("gin", t.text.op("gin_trgm_ops")),
  ],
);

/** One underlined word or expression in a post. */
export const terms = pgTable(
  "terms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    /** Order in the post (1, 2, 3…): the order of the term buttons. */
    position: smallint("position").notNull(),
    /** Exactly as it appears in `posts.text`. Used to highlight the term (E-06). */
    surface: text("surface").notNull(),
    /** Base form, lowercase. Used for search and the already-seen warning (E-02). */
    headword: text("headword").notNull(),
    /** True when the user added the term at verification. */
    addedByUser: boolean("added_by_user").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    unique("terms_post_id_position_key").on(t.postId, t.position),
    check("terms_position_positive", sql`${t.position} >= 1`),
    index("terms_post_id_idx").on(t.postId),
    // Exact match for the already-seen check (F14).
    index("terms_headword_idx").on(t.headword),
    // Fuzzy search (F12).
    index("terms_headword_trgm_idx").using("gin", t.headword.op("gin_trgm_ops")),
  ],
);

/** The explanation of one term in one language. */
export const explanations = pgTable(
  "explanations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    termId: uuid("term_id")
      .notNull()
      .references(() => terms.id, { onDelete: "cascade" }),
    language: explanationLanguage("language").notNull(),
    frEquivalents: text("fr_equivalents").array().notNull(),
    definition: text("definition").notNull(),
    analogyTitle: text("analogy_title").notNull(),
    analogyBody: text("analogy_body").notNull(),
    analogyEmoji: text("analogy_emoji"),
    /** Always an English question, even in the `fr` row (E-03). */
    exampleQuestion: text("example_question").notNull(),
    /** French translation of the question. Filled only in the `fr` row. */
    exampleQuestionFr: text("example_question_fr"),
    /** Excerpt from the post text. Always in English. */
    inYourTextQuote: text("in_your_text_quote").notNull(),
    inYourTextExplanation: text("in_your_text_explanation").notNull(),
    /** Model id that produced it. */
    model: text("model").notNull(),
    createdAt: createdAt(),
  },
  (t) => [unique("explanations_term_id_language_key").on(t.termId, t.language)],
);

/**
 * The 5 usage examples of one term in one language (13.2, E-09). Only the
 * sentences, in order 1–5: no label, no explanation. The studied word (in
 * French too) sits between ⟦ and ⟧, like the French post text (E-08), so it can
 * be highlighted. The `en` row comes with the explanation (new posts) or the
 * first time the examples are opened (older posts); the `fr` row with the
 * first Translate of the examples.
 */
export const termExamples = pgTable(
  "term_examples",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    termId: uuid("term_id")
      .notNull()
      .references(() => terms.id, { onDelete: "cascade" }),
    language: explanationLanguage("language").notNull(),
    sentences: text("sentences").array().notNull(),
    /** Model id that produced it. */
    model: text("model").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("term_examples_term_id_language_key").on(t.termId, t.language),
    check("term_examples_five_sentences", sql`cardinality(${t.sentences}) = 5`),
  ],
);

/** A log of every Claude call (E-04): real costs and the upload rate limit. */
export const aiCalls = pgTable(
  "ai_calls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** SET NULL keeps the cost history after a post is deleted. */
    postId: uuid("post_id").references(() => posts.id, { onDelete: "set null" }),
    kind: aiCallKind("kind").notNull(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    durationMs: integer("duration_ms"),
    success: boolean("success").notNull(),
    error: text("error"),
    createdAt: createdAt(),
  },
  (t) => [
    // Rate limit ("extract calls in the last minute") and monthly cost totals.
    index("ai_calls_created_at_idx").on(t.createdAt),
  ],
);

// ---------------------------------------------------------------------------
// Derived data (ERD §5.1): TOTW number and position of every published post
// ---------------------------------------------------------------------------

// Relative path: drizzle-kit loads this file without the `@/` alias.
export { TOTW_SIZE } from "../lib/totw";

/**
 * `post_ranks`: rank, TOTW number and position (1–15) of each published post,
 * in publication order. Drafts are excluded (D-10).
 */
export const postRanks = pgView("post_ranks", {
  postId: uuid("post_id").notNull(),
  rank: bigint("rank", { mode: "number" }).notNull(),
  totwNumber: bigint("totw_number", { mode: "number" }).notNull(),
  totwPosition: bigint("totw_position", { mode: "number" }).notNull(),
}).as(sql`
  SELECT
    id AS post_id,
    ROW_NUMBER() OVER (ORDER BY published_at, id) AS rank,
    ((ROW_NUMBER() OVER (ORDER BY published_at, id) - 1) / 15) + 1 AS totw_number,
    ((ROW_NUMBER() OVER (ORDER BY published_at, id) - 1) % 15) + 1 AS totw_position
  FROM posts
  WHERE status = 'published'
`);

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type Term = typeof terms.$inferSelect;
export type NewTerm = typeof terms.$inferInsert;
export type Explanation = typeof explanations.$inferSelect;
export type NewExplanation = typeof explanations.$inferInsert;
export type TermExamples = typeof termExamples.$inferSelect;
export type AiCall = typeof aiCalls.$inferSelect;
export type NewAiCall = typeof aiCalls.$inferInsert;
