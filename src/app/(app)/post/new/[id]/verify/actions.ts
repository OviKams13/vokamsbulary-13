"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";

import { runExplanation } from "@/ai/run-explanation";
import { findAlreadySeen, type SeenIn } from "@/db/already-seen";
import { isPostId } from "@/db/post-detail";
import { publishPost } from "@/db/publish-post";
import { saveDraft } from "@/db/save-draft";
import { hasAccess } from "@/lib/access";
import { routes } from "@/lib/routes";
import { checkDraft, type DraftErrors, type DraftInput } from "@/lib/verify";

export type VerifyResult =
  | { ok: true; status: "extracted" | "explained" }
  | { ok: false; message: string; errors?: DraftErrors };

/** "Save draft" (7.6): saves the text and replaces the terms. */
export async function saveDraftAction(postId: string, input: DraftInput): Promise<VerifyResult> {
  return save(postId, input, false);
}

/**
 * "Explain & publish" (7.6, 7.8): saves, then writes the explanations in the
 * background (`after()`); the page polls the status and publishes once the
 * draft is `explained`. A draft that is already explained and unchanged keeps
 * its explanations: no new Claude call.
 */
export async function explainAction(postId: string, input: DraftInput): Promise<VerifyResult> {
  const result = await save(postId, input, true);
  if (result.ok && result.status === "extracted") after(() => runExplanation(postId));
  return result;
}

/** Publish (7.9), then open the new post. */
export async function publishAction(postId: string): Promise<{ message: string }> {
  if (!(await hasAccess())) return { message: "Access code required." };
  if (!isPostId(postId)) return { message: "This draft doesn't exist." };

  const result = await publishPost(postId);
  if (!result.ok) {
    return {
      message:
        result.reason === "missing"
          ? "This draft doesn't exist anymore."
          : "The explanations aren't ready yet. Try Explain & publish again.",
    };
  }
  // The sidebar's TOTW counts live in the shared layout, which a redirect alone
  // doesn't re-render: purge the client cache so they show the new post.
  revalidatePath("/", "layout");
  redirect(routes.post(postId));
}

/** Already-seen warnings (7.7) for the headwords being typed. */
export async function checkAlreadySeenAction(headwords: string[]): Promise<Record<string, SeenIn>> {
  if (!(await hasAccess())) return {};
  return findAlreadySeen(headwords.slice(0, 20));
}

async function save(postId: string, input: DraftInput, explain: boolean): Promise<VerifyResult> {
  if (!(await hasAccess())) return { ok: false, message: "Access code required." };
  if (!isPostId(postId)) return { ok: false, message: "This draft doesn't exist." };

  const { value, errors } = checkDraft(input, { requireTerms: explain });
  if (errors) return { ok: false, message: "Fix the marked fields first.", errors };

  try {
    const result = await saveDraft(postId, value);
    if (result.ok) return { ok: true, status: result.status };
    return {
      ok: false,
      message:
        result.reason === "missing"
          ? "This draft doesn't exist anymore."
          : "This draft can't be edited at this step.",
    };
  } catch (error) {
    console.error("Saving the draft failed:", error instanceof Error ? error.message : error);
    return { ok: false, message: "The draft couldn't be saved. Try again." };
  }
}
