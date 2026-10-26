"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getOrCreateExamples, getOrCreateExamplesFrench } from "@/ai/examples-term";
import { getOrCreateFrench } from "@/ai/translate-term";
import { type DeletedPost, deletePost } from "@/db/delete-post";
import type { Explanation } from "@/db/schema";
import { isPostId } from "@/db/post-detail";
import { getTotwOverview } from "@/db/totw";
import { hasAccess } from "@/lib/access";
import { routes } from "@/lib/routes";

export type DeleteState = { error: string | null };

/**
 * Deletes a post (6.4), then opens the TOTW it was in. That TOTW always still
 * exists (only the last TOTW can disappear, and only when it becomes empty,
 * which deleting a post inside it can't cause).
 */
export async function deletePostAction(
  _previous: DeleteState,
  form: FormData,
): Promise<DeleteState> {
  // The proxy already checks the cookie; Server Functions check again (3.2).
  if (!(await hasAccess())) return { error: "Access code required." };

  const id = form.get("postId");
  if (typeof id !== "string" || !isPostId(id)) return { error: "This post doesn't exist." };

  let deleted: DeletedPost | null;
  try {
    deleted = await deletePost(id);
  } catch (error) {
    console.error("Delete post failed:", error instanceof Error ? error.message : error);
    return { error: "The post couldn't be deleted. Try again." };
  }

  // Point straight at `/` for the current TOTW: the `/totw/<current>` page
  // redirect isn't followed when a Server Action redirects to it.
  const { current } = await getTotwOverview();
  const totw = deleted?.totwNumber;
  // The sidebar's TOTW counts live in the shared layout, which a redirect alone
  // doesn't re-render: purge the client cache so they drop the deleted post.
  revalidatePath("/", "layout");
  redirect(totw && totw !== current.number ? routes.totw(totw) : routes.home);
}

export type TranslateState =
  { ok: true; explanation: Explanation; textFr: string | null } | { ok: false; error: string };

/**
 * Translate (8.2): the French explanation of one term. The first click
 * generates and stores it (Claude call #3, 8.1); afterwards it is read from
 * the database, so no call is made (D-09). The first Translate of the post
 * also returns the post text in French (8.3).
 */
export async function translateAction(termId: string): Promise<TranslateState> {
  if (!(await hasAccess())) return { ok: false, error: "Access code required." };
  if (!isPostId(termId)) return { ok: false, error: "This word doesn't exist." };

  try {
    const result = await getOrCreateFrench(termId);
    if (result.ok) return { ok: true, explanation: result.explanation, textFr: result.textFr };
    return {
      ok: false,
      error:
        result.reason === "missing"
          ? "This word doesn't exist anymore."
          : "This word has no explanation to translate.",
    };
  } catch (error) {
    console.error("Translate failed:", error instanceof Error ? error.message : error);
    return { ok: false, error: "The translation failed. Try again." };
  }
}

export type ExamplesState = { ok: true; sentences: string[] } | { ok: false; error: string };

/**
 * Usage examples (13.2) of one term, for a post published before them: the
 * first time the examples view of a word without examples is opened they are
 * generated and stored (Claude call); afterwards they are read from the
 * database (D-09).
 */
export async function examplesAction(termId: string): Promise<ExamplesState> {
  if (!(await hasAccess())) return { ok: false, error: "Access code required." };
  if (!isPostId(termId)) return { ok: false, error: "This word doesn't exist." };

  try {
    const result = await getOrCreateExamples(termId);
    if (result.ok) return result;
    return { ok: false, error: "This word doesn't exist anymore." };
  } catch (error) {
    console.error("Examples failed:", error instanceof Error ? error.message : error);
    return { ok: false, error: "The examples couldn't be written. Try again." };
  }
}

/**
 * Translate, in the examples view (13.2): the French version of the 5
 * examples. The first click generates and stores it (Claude call); afterwards
 * it is read from the database, so no call is made (D-09).
 */
export async function translateExamplesAction(termId: string): Promise<ExamplesState> {
  if (!(await hasAccess())) return { ok: false, error: "Access code required." };
  if (!isPostId(termId)) return { ok: false, error: "This word doesn't exist." };

  try {
    const result = await getOrCreateExamplesFrench(termId);
    if (result.ok) return result;
    return {
      ok: false,
      error:
        result.reason === "missing"
          ? "This word doesn't exist anymore."
          : "This word has no examples to translate.",
    };
  } catch (error) {
    console.error("Translate examples failed:", error instanceof Error ? error.message : error);
    return { ok: false, error: "The translation failed. Try again." };
  }
}
