"use server";

import { randomUUID } from "node:crypto";

import { del, put } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { after } from "next/server";

import { runExtraction } from "@/ai/run-extraction";
import { db, posts } from "@/db";
import { deletePost } from "@/db/delete-post";
import { isPostId } from "@/db/post-detail";
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
 * Cancel on the processing screen (7.4): deletes the draft and its file, then
 * goes back to the upload page. Published posts can't be cancelled here.
 */
export async function cancelDraft(form: FormData): Promise<void> {
  if (!(await hasAccess())) redirect(routes.newPost);

  const id = form.get("postId");
  if (typeof id === "string" && isPostId(id)) {
    const [post] = await db.select({ status: posts.status }).from(posts).where(eq(posts.id, id));
    if (post && post.status !== "published") await deletePost(id);
  }
  redirect(routes.newPost);
}

/** A plausible image side in px (the browser resizes to ≤ 1600). */
function isSide(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 4000;
}
