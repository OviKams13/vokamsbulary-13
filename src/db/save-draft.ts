import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import { type DraftInput, sameDraft } from "@/lib/verify";

import { db } from "./index";
import { posts, terms } from "./schema";

export type SaveResult =
  | { ok: true; status: "extracted" | "explained"; changed: boolean }
  | { ok: false; reason: "missing" | "wrong-step" };

/**
 * Saves the Verify form (7.6): the confirmed `text` and the term list, which
 * replaces the old one (positions 1, 2, 3… in form order; `added_by_user` kept
 * from the form, true for rows added with "+ Add word").
 *
 * Nothing changed → nothing is rewritten, so an explained draft keeps its
 * explanations. Something changed → the terms are replaced, which deletes
 * their explanations (ON DELETE CASCADE), and an explained draft goes back to
 * `extracted` (ERD §6, 7.9): explanations never go out of sync with the terms.
 *
 * The input must already have passed `checkDraft()`.
 */
export async function saveDraft(id: string, input: DraftInput): Promise<SaveResult> {
  const [[post], current] = await db.batch([
    db.select({ status: posts.status, text: posts.text }).from(posts).where(eq(posts.id, id)),
    db
      .select({ surface: terms.surface, headword: terms.headword, addedByUser: terms.addedByUser })
      .from(terms)
      .where(eq(terms.postId, id))
      .orderBy(asc(terms.position)),
  ]);
  if (!post) return { ok: false, reason: "missing" };
  if (post.status !== "extracted" && post.status !== "explained") {
    return { ok: false, reason: "wrong-step" };
  }

  const editable = inArray(posts.status, ["extracted", "explained"]);
  if (post.text !== null && sameDraft(input, { text: post.text, terms: current })) {
    await db
      .update(posts)
      // A new attempt follows a save: an old explanation error no longer applies.
      .set({ lastError: null, updatedAt: new Date() })
      .where(and(eq(posts.id, id), editable));
    return { ok: true, status: post.status, changed: false };
  }

  const writes: [BatchItem<"pg">, ...BatchItem<"pg">[]] = [
    db.delete(terms).where(eq(terms.postId, id)),
  ];
  if (input.terms.length > 0) {
    writes.push(
      db.insert(terms).values(
        input.terms.map((term, index) => ({
          postId: id,
          position: index + 1,
          surface: term.surface,
          headword: term.headword,
          addedByUser: term.addedByUser,
        })),
      ),
    );
  }
  writes.push(
    db
      .update(posts)
      .set({ text: input.text, status: "extracted", lastError: null, updatedAt: new Date() })
      .where(and(eq(posts.id, id), editable)),
  );
  await db.batch(writes);
  return { ok: true, status: "extracted", changed: true };
}
