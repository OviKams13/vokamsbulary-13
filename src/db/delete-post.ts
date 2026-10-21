import "server-only";

import { del } from "@vercel/blob";
import { eq } from "drizzle-orm";

import { isSeedImage } from "@/lib/seed";

import { db } from "./index";
import { postRanks, posts } from "./schema";

export type DeletedPost = {
  /** TOTW the post was in (null for a draft). */
  totwNumber: number | null;
  /** True when a Blob file was deleted (false for seed posts). */
  blobDeleted: boolean;
};

/**
 * Deletes a post (6.4): its screenshot in Vercel Blob, then its row. Terms and
 * explanations go with it (ON DELETE CASCADE); `ai_calls` keep their cost
 * history (SET NULL). TOTW numbers and positions are a view over the remaining
 * published posts, so later posts move up by themselves (ERD §5.1, E-05).
 *
 * The file goes first: if Blob fails, nothing is deleted and the user can try
 * again; `del()` of a file that is already gone succeeds, so a retry after a
 * database failure is safe too. Seed posts have no Blob file and are skipped.
 *
 * Credentials come from the environment through `@vercel/blob`: OIDC with
 * BLOB_STORE_ID on Vercel Production, BLOB_READ_WRITE_TOKEN locally and on Preview.
 */
export async function deletePost(id: string): Promise<DeletedPost | null> {
  const [post] = await db
    .select({
      imageUrl: posts.imageUrl,
      imagePathname: posts.imagePathname,
      totwNumber: postRanks.totwNumber,
    })
    .from(posts)
    .leftJoin(postRanks, eq(postRanks.postId, posts.id))
    .where(eq(posts.id, id));
  if (!post) return null;

  const blobDeleted = !isSeedImage(post.imagePathname);
  if (blobDeleted) await del(post.imageUrl);

  await db.delete(posts).where(eq(posts.id, id));
  return { totwNumber: post.totwNumber, blobDeleted };
}
