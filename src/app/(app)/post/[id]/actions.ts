"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { type DeletedPost, deletePost } from "@/db/delete-post";
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
