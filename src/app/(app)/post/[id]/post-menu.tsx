"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";

import { MoreIcon, TrashIcon } from "@/components/icons";

import { type DeleteState, deletePostAction } from "./actions";

const initialState: DeleteState = { error: null };

type PostMenuProps = {
  postId: string;
  /** "TOTW 1 · #4", for the confirmation text. */
  label: string;
  wordCount: number;
};

/**
 * "⋯" menu of the post detail page with "Delete post" and its confirmation
 * (6.4). No mockup (X-05): same dark surfaces, borders and pill buttons as the
 * rest of the app; the confirmation is a native modal <dialog>, like the drawer.
 */
export function PostMenu({ postId, label, wordCount }: PostMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const confirm = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState(deletePostAction, initialState);
  const titleId = useId();

  // Close the menu on a click outside it or on Escape.
  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (!menu.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  function openConfirm() {
    setMenuOpen(false);
    confirm.current?.showModal();
  }

  return (
    <div ref={menu} className="relative">
      <button
        type="button"
        aria-label="Post options"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
        className="grid size-10 place-items-center rounded-full text-fg-soft transition hover:bg-surface-3 hover:text-fg"
      >
        <MoreIcon size={22} />
      </button>

      {menuOpen ? (
        <div
          role="menu"
          aria-label="Post options"
          className="absolute top-full right-0 z-30 mt-2 w-48 rounded-2xl border border-line-strong bg-surface-2 p-1.5 shadow-[0_16px_40px_rgb(0_0_0/0.55)]"
        >
          <button
            type="button"
            role="menuitem"
            autoFocus
            onClick={openConfirm}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[0.9375rem] font-semibold text-red-400 transition hover:bg-surface-3 focus-visible:bg-surface-3"
          >
            <TrashIcon size={18} />
            Delete post
          </button>
        </div>
      ) : null}

      <dialog
        ref={confirm}
        aria-labelledby={titleId}
        className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-paper border border-line-strong bg-surface p-6 text-fg backdrop:bg-black/65"
      >
        <h2 id={titleId} className="text-xl font-extrabold tracking-tight">
          Delete this post?
        </h2>
        <p className="mt-2.5 leading-relaxed text-fg-soft">
          {label} and its {wordCount} word{wordCount === 1 ? "" : "s"} will be deleted, with the
          screenshot. The posts after it move up one spot. This can&apos;t be undone.
        </p>

        <form action={formAction} className="mt-6">
          <input type="hidden" name="postId" value={postId} />
          {state.error && !pending ? (
            <p role="alert" className="mb-4 text-sm font-medium text-red-400">
              {state.error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              autoFocus
              disabled={pending}
              onClick={() => confirm.current?.close()}
              className="h-11 rounded-full border border-line-strong px-5 font-semibold text-fg transition hover:bg-surface-3 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex h-11 items-center gap-2 rounded-full bg-red-500 px-5 font-semibold text-white transition hover:bg-red-400 disabled:opacity-70"
            >
              <TrashIcon size={17} />
              {pending ? "Deleting…" : "Delete"}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
