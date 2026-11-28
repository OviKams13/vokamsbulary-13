/**
 * What the reel player (16.2) receives, shared by the server and the browser.
 */

import type { ExplanationContent } from "../explanation";
import type { ReviewColor } from "../review";
import type { ReelScreen, ReelSvgs } from "./script";

/** Which reels the player goes through: one post's words, or a whole TOTW. */
export type ReelScope = { kind: "post"; postId: string } | { kind: "totw"; totwNumber: number };

/** One word in the player's list, before its reel is loaded. */
export type ReelWord = {
  termId: string;
  postId: string;
  totwNumber: number;
  /** The post's place in its TOTW (#m). */
  position: number;
  /** k/N: the word's place among its post's words. */
  wordIndex: number;
  wordCount: number;
  headword: string;
  ready: boolean;
  /** The last preparation failed (the next one tries again). */
  failed: boolean;
};

/** One ready reel: its media and timings, and the stored texts it shows. */
export type ReelWordData = {
  termId: string;
  audioUrl: string;
  screens: ReelScreen[];
  svgs: ReelSvgs;
  gist: string;
  totalMs: number;
  headword: string;
  surface: string;
  /** The post card (first word of a post only). */
  post: { text: string; textFr: string; themeKey: string; surfaces: string[] } | null;
  en: ExplanationContent;
  fr: ExplanationContent;
  examples: string[];
  examplesFr: string[];
  reviewColor: ReviewColor | null;
  reviewChangedAt: number | null;
};

/** Speeds of the player (voice and animations together). */
export const REEL_SPEEDS = [1, 1.2, 1.25, 1.5, 1.75, 2] as const;
export type ReelSpeed = (typeof REEL_SPEEDS)[number];

/** Set by a ▶ button before it opens the player, so ✕ goes back to that page. */
export const REEL_RETURN_KEY = "vk13-reel-return";

export const reelRoutes = {
  /** The player: a post's reels from word `w`, or a TOTW's from its first word. */
  player: (scope: ReelScope, word?: number) =>
    scope.kind === "post"
      ? `/reels?post=${scope.postId}${word && word > 1 ? `&w=${word}` : ""}`
      : `/reels?totw=${scope.totwNumber}`,
  list: (scope: ReelScope) =>
    scope.kind === "post"
      ? `/api/reels?post=${scope.postId}`
      : `/api/reels?totw=${scope.totwNumber}`,
  word: (termId: string) => `/api/reels/${termId}`,
  prepare: "/api/reels/prepare",
  /** Words of new posts still waiting for their reel (16.3, background run). */
  pending: "/api/reels/pending",
} as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The scope of the player address (`?post=<id>` or `?totw=<n>`); null if invalid. */
export function readScope(params: { get(name: string): string | null }): ReelScope | null {
  const post = params.get("post");
  if (post !== null) return UUID.test(post) ? { kind: "post", postId: post } : null;
  const totw = params.get("totw");
  if (totw !== null && /^[1-9]\d{0,5}$/.test(totw)) {
    return { kind: "totw", totwNumber: Number(totw) };
  }
  return null;
}
