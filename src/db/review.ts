import "server-only";

import { and, eq, isNull, lt, or } from "drizzle-orm";

import {
  normalizeMarks,
  type ReviewChange,
  type ReviewResult,
  reviewKey,
  splitDefinition,
} from "@/lib/review";

import { db } from "./index";
import { explanations, posts, terms } from "./schema";

/**
 * Saves one change of the personal review tools (Phase 15) and returns what
 * the database holds afterwards.
 *
 * Last change wins: the change is written only if it is newer than the stored
 * one (`review_changed_at` / `definition_marks_changed_at`), so a change made
 * offline at 10:00 and sent at 12:00 doesn't replace one made at 11:00 on
 * another device. Its time can't be later than the server's clock: a device
 * whose clock runs ahead can't make its changes win forever.
 *
 * Only published posts: drafts have no detail page, no quick list row.
 */
export async function saveReviewChange(change: ReviewChange): Promise<ReviewResult> {
  const changedAt = new Date(Math.min(change.changedAt, Date.now()));
  return change.kind === "color" ? saveColor(change, changedAt) : saveMarks(change, changedAt);
}

async function saveColor(
  change: Extract<ReviewChange, { kind: "color" }>,
  changedAt: Date,
): Promise<ReviewResult> {
  const published = and(eq(posts.id, change.postId), eq(posts.status, "published"));

  const [, [row]] = await db.batch([
    db
      .update(posts)
      .set({ reviewColor: change.color, reviewChangedAt: changedAt, updatedAt: new Date() })
      .where(
        and(published, or(isNull(posts.reviewChangedAt), lt(posts.reviewChangedAt, changedAt))),
      ),
    db
      .select({ color: posts.reviewColor, changedAt: posts.reviewChangedAt })
      .from(posts)
      .where(published),
  ]);

  if (!row) return { kind: "missing", key: reviewKey(change) };
  return {
    kind: "color",
    postId: change.postId,
    color: row.color,
    changedAt: row.changedAt?.getTime() ?? null,
  };
}

async function saveMarks(
  change: Extract<ReviewChange, { kind: "marks" }>,
  changedAt: Date,
): Promise<ReviewResult> {
  const row = and(
    eq(explanations.termId, change.termId),
    eq(explanations.language, change.language),
  );

  // The definition, to check the units against it (a term of a published post only).
  const [found] = await db
    .select({ definition: explanations.definition })
    .from(explanations)
    .innerJoin(terms, eq(terms.id, explanations.termId))
    .innerJoin(posts, and(eq(posts.id, terms.postId), eq(posts.status, "published")))
    .where(row);
  if (!found) return { kind: "missing", key: reviewKey(change) };

  const marks = normalizeMarks(change.marks, splitDefinition(found.definition).wordCount);

  const [, [saved]] = await db.batch([
    db
      .update(explanations)
      .set({ definitionMarks: marks, definitionMarksChangedAt: changedAt })
      .where(
        and(
          row,
          or(
            isNull(explanations.definitionMarksChangedAt),
            lt(explanations.definitionMarksChangedAt, changedAt),
          ),
        ),
      ),
    db
      .select({
        marks: explanations.definitionMarks,
        changedAt: explanations.definitionMarksChangedAt,
      })
      .from(explanations)
      .where(row),
  ]);

  if (!saved) return { kind: "missing", key: reviewKey(change) };
  return {
    kind: "marks",
    termId: change.termId,
    language: change.language,
    marks: saved.marks,
    changedAt: saved.changedAt?.getTime() ?? null,
  };
}
