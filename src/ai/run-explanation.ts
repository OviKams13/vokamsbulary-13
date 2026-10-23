import "server-only";

import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { db, explanations, posts, terms } from "@/db";
import { appearsIn } from "@/lib/verify";

import { explainTerms, type TermExplanation } from "./explain";

/**
 * Runs the explanation call (7.8) for one verified draft, in the background
 * after "Explain & publish" (`after()`). On success the English explanations
 * are written and the status moves to `explained`; on failure `last_error` is
 * set and the status stays `extracted`, ready for another try. The Claude call
 * itself is logged in `ai_calls` by `callClaude()`.
 *
 * If the draft is edited while Claude works, the edit wins: the terms were
 * replaced, so the new explanations no longer have terms to attach to (the
 * foreign key makes the whole batch fail) and no error is recorded either,
 * because `updated_at` moved.
 *
 * Never throws: it runs after the response, where nobody could catch it.
 */
export async function runExplanation(postId: string): Promise<void> {
  let startedAt: Date | null = null;
  try {
    const [[post], termRows] = await db.batch([
      db
        .select({ status: posts.status, text: posts.text, updatedAt: posts.updatedAt })
        .from(posts)
        .where(eq(posts.id, postId)),
      db
        .select({
          id: terms.id,
          position: terms.position,
          surface: terms.surface,
          headword: terms.headword,
        })
        .from(terms)
        .where(eq(terms.postId, postId))
        .orderBy(asc(terms.position)),
    ]);
    if (!post || post.status !== "extracted" || !post.text) return;
    startedAt = post.updatedAt;
    if (termRows.length === 0) throw new Error("There is no word to explain.");

    const { output, model } = await explainTerms({ postId, text: post.text, terms: termRows });
    const byPosition = new Map(output.map((item) => [item.position, item]));
    if (byPosition.size !== termRows.length || termRows.some((t) => !byPosition.has(t.position))) {
      throw new Error("Claude didn't return one explanation per word.");
    }

    const rows = termRows.map((term) =>
      toRow(term, post.text ?? "", byPosition.get(term.position)!, model),
    );
    await db.batch([
      db.delete(explanations).where(
        and(
          inArray(
            explanations.termId,
            termRows.map((term) => term.id),
          ),
          eq(explanations.language, "en"),
        ),
      ),
      db.insert(explanations).values(rows),
      db
        .update(posts)
        .set({ status: "explained", lastError: null, updatedAt: new Date() })
        .where(and(eq(posts.id, postId), eq(posts.status, "extracted"), unchangedSince(startedAt))),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Explanation failed for post ${postId}:`, message);
    if (!startedAt) return;
    await db
      .update(posts)
      .set({ lastError: message, updatedAt: new Date() })
      .where(and(eq(posts.id, postId), eq(posts.status, "extracted"), unchangedSince(startedAt)))
      .catch(() => {
        // The draft may have been deleted meanwhile; nothing left to mark.
      });
  }
}

function toRow(
  term: { id: string; surface: string },
  text: string,
  item: TermExplanation,
  model: string,
): typeof explanations.$inferInsert {
  const fr = item.fr.map((word) => word.trim()).filter(Boolean);
  return {
    termId: term.id,
    language: "en",
    frEquivalents: fr.slice(0, 3),
    definition: item.definition.trim(),
    analogyTitle: item.analogy.title.trim(),
    analogyBody: item.analogy.body.trim(),
    analogyEmoji: item.analogy.emoji.trim() || null,
    exampleQuestion: item.example.trim(),
    inYourTextQuote: quoteFor(text, term.surface, item.inYourText.quote),
    inYourTextExplanation: item.inYourText.explanation.trim(),
    model,
  };
}

/**
 * The "In your text" quote must show the term highlighted (6.3), so it has to
 * contain the surface. If Claude's quote doesn't, the sentence of the text
 * that contains it is used instead.
 */
function quoteFor(text: string, surface: string, quote: string): string {
  const cleaned = quote.trim().replace(/^["“”'‘’«»\s]+|["“”'‘’«»\s]+$/g, "");
  if (cleaned && appearsIn(cleaned, surface)) return cleaned;
  const sentences = text.split(/(?<=[.!?])\s+|\n+/);
  return sentences.find((sentence) => appearsIn(sentence, surface))?.trim() ?? text;
}

/**
 * The draft wasn't saved again since `updatedAt` was read. Compared at
 * millisecond precision: Postgres keeps microseconds, a JS Date doesn't.
 */
function unchangedSince(updatedAt: Date) {
  return sql`date_trunc('milliseconds', ${posts.updatedAt}) = ${updatedAt.toISOString()}::timestamptz`;
}
