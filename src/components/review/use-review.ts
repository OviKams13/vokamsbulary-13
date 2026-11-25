"use client";

import { useSyncExternalStore } from "react";

import {
  changeDefinitionMarks,
  changeReviewColor,
  getReviewVersion,
  marksKey,
  newestColor,
  newestMarks,
  subscribeReview,
} from "@/lib/offline/review-sync";
import type { ReviewColor, ReviewLanguage, StampedColor, StampedMarks } from "@/lib/review";

function useReviewVersion() {
  // Re-renders on every change; the server and the first render show the page values.
  return useSyncExternalStore(subscribeReview, getReviewVersion, () => 0);
}

/**
 * Review colour of a post (15.2): the newest of the page's value (server or
 * offline copy) and the one known on this device, with a setter that saves it
 * (sent at once, or later if offline).
 */
export function useReviewColor(
  postId: string,
  page: StampedColor,
): [StampedColor, (color: ReviewColor | null) => void] {
  useReviewVersion();
  const current = newestColor(postId, page);
  return [current, (color) => void changeReviewColor(postId, current, color)];
}

/** Highlights of one definition (15.1), same rules as `useReviewColor()`. */
export function useDefinitionMarks(
  termId: string,
  language: ReviewLanguage,
  page: StampedMarks,
): [StampedMarks, (marks: number[]) => void] {
  useReviewVersion();
  const current = newestMarks(marksKey(termId, language), page);
  return [current, (marks) => void changeDefinitionMarks(termId, language, current, marks)];
}
