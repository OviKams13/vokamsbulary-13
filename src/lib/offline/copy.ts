import type { ExplanationContent } from "@/lib/explanation";

/**
 * The offline copy (14.2): every published post with what its pages show,
 * as sent by `GET /api/offline` and saved on the device (IndexedDB). No
 * screenshot (Blob images aren't needed offline), no draft, no cost data.
 *
 * Bump `COPY_FORMAT` when the shape changes: a copy in an older format is
 * ignored and replaced by the next download.
 */
export const COPY_FORMAT = 1;

export type CopyTerm = {
  id: string;
  /** `terms.position`: the word's tab (`?w=`). */
  position: number;
  surface: string;
  headword: string;
  explanation: ExplanationContent | null;
  /** French explanation, if Translate was clicked once (online). */
  french: ExplanationContent | null;
  /** The 5 usage examples (13.2), if written. */
  examples: string[] | null;
  /** Their French version, if the examples' Translate was clicked once. */
  examplesFr: string[] | null;
};

export type CopyPost = {
  id: string;
  text: string;
  /** French post text (8.3), with its ⟦ ⟧ marks (8.4); null before the first Translate. */
  textFr: string | null;
  themeKey: string;
  /** ISO date. */
  publishedAt: string;
  /** From `post_ranks`: publication rank, TOTW number and position 1–15. */
  rank: number;
  totwNumber: number;
  position: number;
  /** In `terms.position` order. */
  terms: CopyTerm[];
};

export type OfflineCopy = {
  format: typeof COPY_FORMAT;
  /** ISO date of the download. */
  generatedAt: string;
  /** Oldest first (`post_ranks.rank`). */
  posts: CopyPost[];
};
