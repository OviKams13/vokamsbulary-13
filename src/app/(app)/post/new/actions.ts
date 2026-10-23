"use server";

import { randomUUID } from "node:crypto";

import { del, put } from "@vercel/blob";
import { and, eq, isNotNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { after } from "next/server";

import { runExtraction } from "@/ai/run-extraction";
import { db, posts } from "@/db";
import { deletePost } from "@/db/delete-post";
import { isPostId } from "@/db/post-detail";
import { isExtractLimitReached, RATE_LIMIT_MESSAGE } from "@/db/rate-limit";
import { hasAccess } from "@/lib/access";
import { routes } from "@/lib/routes";
import { EXTENSION_BY_TYPE, isAcceptedImageType, MAX_UPLOAD_BYTES } from "@/lib/upload";

export type UploadState = { error: string | null };

/**
 * Upload (7.1): stores the resized screenshot in Vercel Blob with a
 * server-side `put()` (Phase 2 decision), creates the post with
 * `status = uploaded`, starts extraction in the background (7.3) and opens
 * the processing screen (7.4).
 */
export async function uploadScreenshot(
  _previous: UploadState,
  form: FormData,
): Promise<UploadState> {
  if (!(await hasAccess())) return { error: "Access code required." };

  const file = form.get("screenshot");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a screenshot first." };
  if (!isAcceptedImageType(file.type)) return { error: "Use a PNG, JPG or WebP image." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "This image is too large (max 4 MB)." };

  // 7.11: checked before anything is stored or any Claude call starts.
  if (await isExtractLimitReached()) return { error: RATE_LIMIT_MESSAGE };

  const width = Number(form.get("width"));
  const height = Number(form.get("height"));
  if (!isSide(width) || !isSide(height)) return { error: "The image size couldn't be read." };

  const id = randomUUID();
  let blob: { url: string; pathname: string };
  try {
    blob = await put(`posts/${id}.${EXTENSION_BY_TYPE[file.type]}`, file, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: false,
    });
  } catch (error) {
    console.error("Upload to Blob failed:", error instanceof Error ? error.message : error);
    return { error: "The upload failed. Check your connection and try again." };
  }

  try {
    await db.insert(posts).values({
      id,
      status: "uploaded",
      imageUrl: blob.url,
      imagePathname: blob.pathname,
      imageWidth: width,
      imageHeight: height,
    });
  } catch (error) {
    console.error("Creating the draft failed:", error instanceof Error ? error.message : error);
    // No row points to the file: remove it so it doesn't linger in the store.
    await del(blob.url).catch(() => {});
    return { error: "The draft couldn't be saved. Try again." };
  }

  // Runs after the response: the user can leave the page, the draft keeps going.
  after(() => runExtraction(id));
  redirect(routes.draft(id));
}

/**
 * Cancel on the processing screen (7.4) and Delete in "Unfinished drafts"
 * (7.10): deletes the draft, its terms and its Blob file, then goes back to
 * the upload page. Published posts are deleted from their own page (6.4).
 */
export async function deleteDraft(form: FormData): Promise<void> {
  if (!(await hasAccess())) redirect(routes.newPost);

  const id = form.get("postId");
  if (typeof id === "string" && isPostId(id)) {
    const [post] = await db.select({ status: posts.status }).from(posts).where(eq(posts.id, id));
    if (post && post.status !== "published") await deletePost(id);
  }
  redirect(routes.newPost);
}

export type RetryState = { error: string | null };

/**
 * Retry on the error screen (7.10): clears `last_error` and runs extraction
 * again in the background, then reopens the processing screen. Same rate
 * limit as an upload (7.11): a retry is another extraction call.
 */
export async function retryExtraction(_previous: RetryState, form: FormData): Promise<RetryState> {
  if (!(await hasAccess())) return { error: "Access code required." };
  const id = form.get("postId");
  if (typeof id !== "string" || !isPostId(id)) return { error: "This draft doesn't exist." };
  if (await isExtractLimitReached()) return { error: RATE_LIMIT_MESSAGE };

  const reset = await db
    .update(posts)
    .set({ lastError: null, updatedAt: new Date() })
    .where(and(eq(posts.id, id), eq(posts.status, "uploaded"), isNotNull(posts.lastError)))
    .returning({ id: posts.id });
  // Not failed (anymore): the draft's own page sends it to the right step.
  if (reset.length > 0) after(() => runExtraction(id));
  redirect(routes.draft(id));
}

/** A plausible image side in px (the browser resizes to ≤ 1600). */
function isSide(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 4000;
}
