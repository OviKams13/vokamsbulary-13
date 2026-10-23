import "server-only";

import { and, eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import { db, posts, terms } from "@/db";

import { type Extraction, extractScreenshot } from "./extract";

/**
 * Runs extraction for one uploaded draft (7.3), in the background after the
 * upload response (`after()`). On success: the raw text goes to
 * `extracted_text` (E-01), the terms are written in order, and the status moves
 * to `extracted`. On failure: `last_error` is set and the status stays
 * `uploaded`, so Retry (7.10) can run it again. The Claude call itself is
 * logged in `ai_calls` by `callClaude()`, success or failure.
 *
 * Never throws: it runs after the response, where nobody could catch it.
 */
export async function runExtraction(postId: string): Promise<void> {
  try {
    const [post] = await db
      .select({ status: posts.status, imageUrl: posts.imageUrl })
      .from(posts)
      .where(eq(posts.id, postId));
    // Deleted (cancelled) meanwhile, or already past this step.
    if (!post || post.status !== "uploaded") return;

    const result = await extractScreenshot({ postId, imageUrl: post.imageUrl });
    if (!result.text.trim()) {
      throw new Error("No readable English text was found in this screenshot.");
    }
    await saveExtraction(postId, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Extraction failed for post ${postId}:`, message);
    await db
      .update(posts)
      .set({ lastError: message, updatedAt: new Date() })
      .where(and(eq(posts.id, postId), eq(posts.status, "uploaded")))
      .catch(() => {
        // The draft may have been cancelled; nothing left to mark.
      });
  }
}

/** Writes the result in one transaction: old terms out, new terms in, status → extracted. */
async function saveExtraction(postId: string, result: Extraction) {
  const termRows = uniqueTerms(result.terms).map((term, index) => ({
    postId,
    position: index + 1,
    surface: term.surface,
    headword: term.headword,
  }));

  const writes: [BatchItem<"pg">, ...BatchItem<"pg">[]] = [
    db.delete(terms).where(eq(terms.postId, postId)),
  ];
  if (termRows.length > 0) writes.push(db.insert(terms).values(termRows));
  writes.push(
    db
      .update(posts)
      .set({
        status: "extracted",
        extractedText: result.text,
        lastError: null,
        updatedAt: new Date(),
      })
      .where(and(eq(posts.id, postId), eq(posts.status, "uploaded"))),
  );
  await db.batch(writes);
}

/** Trims both fields, lowercases the headword, drops empty and repeated surfaces. */
function uniqueTerms(list: Extraction["terms"]) {
  const seen = new Set<string>();
  const result: Extraction["terms"] = [];
  for (const term of list) {
    const surface = term.surface.trim();
    const headword = term.headword.trim().toLowerCase();
    if (!surface || !headword || seen.has(surface.toLowerCase())) continue;
    seen.add(surface.toLowerCase());
    result.push({ surface, headword });
  }
  return result;
}
