"use client";

import { useRouter } from "next/navigation";
import { useId, useRef } from "react";

import { useConnection } from "@/components/offline/connection";
import { REEL_RETURN_KEY, type ReelScope, reelRoutes } from "@/lib/reels/data";

import { prepareScope, scopeKey, stopPreparing, useReadiness, useReelJob } from "./reel-store";

const TTS_FREE_CHARACTERS = 1_000_000;
const OFFLINE_MESSAGE = "Reels need a connection.";

/**
 * A ▶ button that opens the reel player (16.3): the post page's (this post,
 * from the word on screen) or the feed's (the whole TOTW, from its first word).
 *
 * While not every reel of its scope is ready it reads "x/N ready", and a tap
 * opens a sheet with "Play now" and "Prepare TOTW reels" (word by word, with
 * its progress and the TTS characters used this month). Offline it is dimmed
 * and a tap only shows "Reels need a connection." (14.3). Hidden when the
 * scope has no word.
 */
export function ReelButton({
  scope,
  variant,
  startWord,
}: {
  scope: ReelScope;
  /** `post`: compact pill in the post bars; `header`: the TOTW header; `fab`: the phone feed's round button. */
  variant: "post" | "header" | "fab";
  /** Post page: the word tab on screen (1-based). */
  startWord?: number;
}) {
  const router = useRouter();
  const { offline, copyMode, notify } = useConnection();
  const readiness = useReadiness(scope);
  const job = useReelJob();
  const sheet = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const unavailable = offline || copyMode;

  if (readiness?.total === 0) return null;
  const complete = readiness !== null && readiness.ready === readiness.total;
  const count = readiness ? `${readiness.ready}/${readiness.total} ready` : null;
  const isTotw = scope.kind === "totw";
  const jobHere = job?.key === scopeKey(scope) ? job : null;

  function play() {
    sheet.current?.close();
    // ✕ in the player comes back here.
    sessionStorage.setItem(REEL_RETURN_KEY, "1");
    router.push(reelRoutes.player(scope, startWord));
  }

  function onClick() {
    if (unavailable) {
      notify(copyMode ? "Reels: reload the page first (offline copy)." : OFFLINE_MESSAGE);
      return;
    }
    if (complete || readiness === null) play();
    else sheet.current?.showModal();
  }

  const label = complete || !count ? "Play the reels" : `Reels: ${count}. Open the reel options`;
  const dim = unavailable ? "cursor-not-allowed opacity-45" : "";

  return (
    <>
      {variant === "fab" ? (
        <div className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-5 z-20 flex items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={onClick}
            aria-label={label}
            aria-disabled={unavailable || undefined}
            data-reel-fab=""
            className={`grid size-15 place-items-center rounded-full bg-gold text-black shadow-[0_8px_24px_rgb(0_0_0/0.5)] transition hover:brightness-110 ${dim}`}
          >
            <PlayIcon size={24} />
          </button>
          {count && !complete ? (
            <span className="rounded-full border border-line-strong bg-surface-2/95 px-2.5 py-1 text-xs font-semibold text-fg-soft shadow-[0_6px_18px_rgb(0_0_0/0.45)]">
              {count}
            </span>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          aria-disabled={unavailable || undefined}
          data-reel-button={variant}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full font-semibold transition ${
            variant === "header"
              ? "h-10 border border-gold/60 px-4 text-[0.9375rem] text-gold hover:bg-gold/10"
              : "h-9 bg-gold px-3 text-sm text-black hover:brightness-110"
          } ${dim}`}
        >
          <PlayIcon size={variant === "header" ? 16 : 14} />
          {variant === "header" ? <span>Reels</span> : null}
          {count && !complete ? (
            <span className={variant === "header" ? "text-sm text-fg-soft" : "text-xs"}>
              {variant === "header" ? `· ${count}` : count}
            </span>
          ) : null}
        </button>
      )}

      <dialog
        ref={sheet}
        aria-labelledby={titleId}
        onClick={(event) => {
          // A tap on the backdrop closes it.
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        className="sheet m-0 mt-auto w-full max-w-none rounded-t-[1.5rem] border border-line-strong bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-fg backdrop:bg-black/65 lg:m-auto lg:w-[min(28rem,calc(100vw-2rem))] lg:rounded-paper lg:p-6"
      >
        <h2 id={titleId} className="text-lg font-extrabold tracking-tight">
          {isTotw ? `Reels of TOTW ${scope.totwNumber}` : "Reels of this post"}
        </h2>
        {readiness ? (
          <>
            <p className="mt-1.5 text-sm text-fg-soft">
              {readiness.ready} of {readiness.total} reels ready. A reel that isn&apos;t ready is
              prepared when you reach it (about a minute).
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-line-strong">
              <span
                className="block h-full rounded-full bg-gold transition-[width]"
                style={{ width: `${(100 * readiness.ready) / Math.max(readiness.total, 1)}%` }}
              />
            </div>
          </>
        ) : null}

        {jobHere ? (
          <p role="status" className="mt-3 text-sm text-fg-soft" data-reel-job="">
            {jobHere.running
              ? `Preparing ${jobHere.done + jobHere.failed + 1} of ${jobHere.total}${
                  jobHere.current ? `: ${jobHere.current}…` : "…"
                }`
              : `Done: ${jobHere.done} prepared${jobHere.failed ? `, ${jobHere.failed} failed` : ""}.`}
            {jobHere.error ? (
              <span className="mt-1 block text-xs text-red-400">{jobHere.error}</span>
            ) : null}
          </p>
        ) : job?.running ? (
          <p className="mt-3 text-sm text-muted">Another preparation is running.</p>
        ) : null}

        {readiness ? (
          <p className="mt-3 text-xs text-muted">
            Voice this month: {readiness.ttsCharacters.toLocaleString("en-US")} of{" "}
            {TTS_FREE_CHARACTERS.toLocaleString("en-US")} free characters.
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2.5">
          {jobHere?.running ? (
            <button
              type="button"
              onClick={stopPreparing}
              className="h-11 rounded-full border border-line-strong px-5 font-semibold text-fg transition hover:bg-surface-3"
            >
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void prepareScope(scope)}
              disabled={Boolean(job?.running) || offline}
              className="h-11 rounded-full border border-line-strong px-5 font-semibold text-fg transition hover:bg-surface-3 disabled:opacity-45"
            >
              {isTotw ? "Prepare TOTW reels" : "Prepare these reels"}
            </button>
          )}
          <button
            type="button"
            onClick={play}
            className="flex h-11 items-center gap-2 rounded-full bg-gold px-5 font-semibold text-black transition hover:brightness-110"
          >
            <PlayIcon size={14} />
            Play now
          </button>
        </div>
      </dialog>
    </>
  );
}

function PlayIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M7 4.5v15a1 1 0 0 0 1.52.85l12-7.5a1 1 0 0 0 0-1.7l-12-7.5A1 1 0 0 0 7 4.5Z" />
    </svg>
  );
}
