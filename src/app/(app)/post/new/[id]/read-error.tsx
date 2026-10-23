"use client";

import Link from "next/link";
import { useActionState } from "react";

import { CheckIcon, RetryIcon } from "@/components/icons";
import { routes } from "@/lib/routes";

import { type RetryState, retryExtraction } from "../actions";

const initialState: RetryState = { error: null };

/**
 * Error screen (7.10, mockups 03d-D / 03d-M), shown when extraction failed.
 * The draft is kept: Retry runs extraction again; "Choose another screenshot"
 * goes back to the upload page, where this draft waits in Unfinished drafts
 * as Failed (Resume / Delete).
 */
export function ReadError({
  postId,
  lastError,
  savedLabel,
}: {
  postId: string;
  lastError: string;
  /** "2h ago", "yesterday"…: when the screenshot was uploaded. */
  savedLabel: string;
}) {
  const [state, retry, retrying] = useActionState(retryExtraction, initialState);

  return (
    <div className="flex min-h-[calc(100dvh-3.75rem)] flex-col px-4 pt-10 pb-[max(1rem,env(safe-area-inset-bottom))] lg:min-h-dvh lg:items-center lg:justify-center lg:px-8 lg:py-12">
      <div className="mx-auto flex w-full max-w-155 flex-1 flex-col items-center text-center lg:flex-none lg:rounded-[1.75rem] lg:border lg:border-line lg:bg-surface lg:px-12 lg:pt-11 lg:pb-11">
        <BlurredPage />

        <h1 className="mt-6 text-[1.625rem] leading-tight font-extrabold tracking-tight lg:text-[1.75rem]">
          We couldn&apos;t read this screenshot
        </h1>
        <p className="mt-3 max-w-130 text-[0.9375rem] leading-relaxed text-fg-soft lg:text-base">
          {reasonFor(lastError)} Nothing is lost: your draft is saved and you can try again anytime.
        </p>

        <p className="mt-5 inline-flex h-8 items-center gap-2 rounded-full bg-[#15291c] px-3.5 text-[0.8125rem] font-semibold text-[#8fdba8]">
          <CheckIcon size={14} strokeWidth={3} />
          Draft saved · {savedLabel}
        </p>

        <ul className="mt-6 text-[0.8125rem] leading-relaxed text-muted lg:w-full lg:space-y-1.5 lg:rounded-2xl lg:bg-surface-2 lg:px-5 lg:py-4 lg:text-left lg:text-sm lg:text-fg-soft">
          <li>
            <span className="lg:hidden">Tip: take</span>
            <span className="hidden lg:inline">Take</span> the screenshot at full size, without
            zooming in<span className="lg:hidden">,</span>
          </li>
          <li>
            <span className="lg:hidden">and keep the red lines under the letters.</span>
            <span className="hidden lg:inline">
              Make sure the red underlines don&apos;t cover the letters
            </span>
          </li>
        </ul>

        <details className="mt-4 text-[0.8125rem] text-muted">
          <summary className="cursor-pointer">Error details</summary>
          <p className="mt-2 max-w-130 break-words">{lastError}</p>
        </details>

        {state.error ? (
          <p role="alert" className="mt-4 text-sm font-medium text-red-400">
            {state.error}
          </p>
        ) : null}

        {/* Mobile: pinned to the bottom (03d-M). */}
        <div className="mt-auto flex w-full flex-col gap-3 pt-8 lg:mt-7 lg:w-auto lg:flex-row lg:pt-0">
          <form action={retry} className="contents">
            <input type="hidden" name="postId" value={postId} />
            <button
              type="submit"
              disabled={retrying}
              className="flex h-13 items-center justify-center gap-2.5 rounded-full bg-fg px-7 text-[1.0625rem] font-bold text-bg transition hover:bg-white disabled:opacity-70 lg:h-11 lg:text-base"
            >
              <RetryIcon size={18} />
              {retrying ? "Retrying…" : "Retry"}
            </button>
          </form>
          <Link
            href={routes.newPost}
            className="flex h-13 items-center justify-center rounded-full border border-line-strong px-6 text-[1.0625rem] font-bold transition hover:bg-surface-3 lg:h-11 lg:text-base"
          >
            Choose another screenshot
          </Link>
        </div>
      </div>
    </div>
  );
}

/** A friendly reason from `last_error` (the raw message stays under "Error details"). */
function reasonFor(lastError: string): string {
  if (/no readable english text/i.test(lastError)) {
    return "The image looks too blurry, or it has no English text, so nothing could be read.";
  }
  if (/declined/i.test(lastError)) return "Claude declined to read this screenshot.";
  if (/api error (429|5\d\d)|overloaded|timed? ?out|connection/i.test(lastError)) {
    return "Claude was busy or couldn't be reached. That is usually temporary.";
  }
  return "Something went wrong while reading it.";
}

/** The blurred page with a red "!" badge (03d). */
function BlurredPage() {
  return (
    <div aria-hidden="true" className="relative">
      <div className="h-27 w-36 rounded-xl bg-[#e9e9ec] p-3.5 blur-[2.5px] lg:w-42.5">
        {[88, 100, 76, 92, 60].map((width, index) => (
          <span
            key={index}
            className="mb-2 block h-1.5 rounded-full bg-[#b8b8be]"
            style={{ width: `${width}%` }}
          />
        ))}
      </div>
      <span className="absolute -right-3.5 -bottom-3.5 grid size-13 place-items-center rounded-full border-4 border-bg bg-[#e5484d] text-lg font-extrabold text-white lg:border-surface">
        !
      </span>
    </div>
  );
}
