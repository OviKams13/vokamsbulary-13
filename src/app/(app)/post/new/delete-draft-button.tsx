"use client";

import { useFormStatus } from "react-dom";

import { TrashIcon } from "@/components/icons";

import { deleteDraft } from "./actions";

/**
 * Trash button of a draft row (7.10). Asks first: the draft and its
 * screenshot are deleted for good.
 */
export function DeleteDraftButton({ postId }: { postId: string }) {
  return (
    <form
      action={deleteDraft}
      onSubmit={(event) => {
        if (!window.confirm("Delete this draft and its screenshot?")) event.preventDefault();
      }}
    >
      <input type="hidden" name="postId" value={postId} />
      <Submit />
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="Delete draft"
      className="grid size-10 place-items-center rounded-xl text-muted transition hover:bg-surface-3 hover:text-fg disabled:opacity-50"
    >
      {pending ? (
        <span aria-hidden="true" className="spinner block size-4" />
      ) : (
        <TrashIcon size={18} />
      )}
    </button>
  );
}
