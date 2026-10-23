"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import { CheckIcon } from "@/components/icons";
import { routes } from "@/lib/routes";

import { cancelDraft } from "../actions";

type ProcessingViewProps = {
  postId: string;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  /** Set when extraction already failed before this page opened. */
  initialError: string | null;
};

const STEPS = [
  "Screenshot uploaded",
  "Reading the text",
  "Finding the red underlines",
  "Getting base forms",
] as const;

const POLL_MS = 1500;
/** After this, say it's slow (the call itself times out at 120 s + 1 retry). */
const SLOW_MS = 60_000;

/**
 * Processing screen (7.4, mockup 03b): the screenshot with a scanning band,
 * the step list, and Cancel. It polls the draft's status and moves to Verify
 * by itself when the text has been read.
 *
 * Claude reads the text, the underlines and the base forms in one call, so
 * steps 2 → 4 advance on a timer while that call runs: they show progress,
 * they are not separate server states. The last one stays active until the
 * answer arrives.
 */
export function ProcessingView({
  postId,
  imageUrl,
  imageWidth,
  imageHeight,
  initialError,
}: ProcessingViewProps) {
  const router = useRouter();
  const [error, setError] = useState(initialError);
  const [elapsed, setElapsed] = useState(0);

  // Poll the status until the draft leaves `uploaded` or fails.
  useEffect(() => {
    if (error) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const response = await fetch(routes.draftStatus(postId), { cache: "no-store" });
        if (stopped) return;
        if (response.status === 404) {
          router.replace(routes.newPost);
          return;
        }
        if (response.ok) {
          const draft = (await response.json()) as { status: string; lastError: string | null };
          if (stopped) return;
          if (draft.status === "published") return router.replace(routes.post(postId));
          if (draft.status !== "uploaded") return router.replace(routes.draftVerify(postId));
          if (draft.lastError) return setError(draft.lastError);
        }
      } catch {
        // Network hiccup: try again on the next tick.
      }
      if (!stopped) timer = setTimeout(poll, POLL_MS);
    }

    timer = setTimeout(poll, POLL_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [error, postId, router]);

  // Clock for the step pacing and the "slow" message.
  useEffect(() => {
    if (error) return;
    const started = Date.now();
    const clock = setInterval(() => setElapsed(Date.now() - started), 500);
    return () => clearInterval(clock);
  }, [error]);

  const active = elapsed < 3_000 ? 1 : elapsed < 7_000 ? 2 : 3;
  const slow = elapsed > SLOW_MS;

  return (
    <div className="lg:grid lg:grid-cols-[20rem_1fr] lg:items-center lg:gap-7 lg:rounded-[1.75rem] lg:border lg:border-line lg:bg-surface lg:p-7">
      <div className="relative mx-auto w-full max-w-72.5 overflow-hidden rounded-[1.375rem] bg-white shadow-[0_12px_40px_rgb(0_0_0/0.45)] lg:max-w-none lg:rounded-[1.125rem]">
        <Image
          src={imageUrl}
          alt="Your screenshot"
          width={imageWidth}
          height={imageHeight}
          unoptimized
          priority
          className="max-h-90 w-full object-cover object-top lg:max-h-117.5"
        />
        {error ? null : <span aria-hidden="true" className="scan-band" />}
      </div>

      <div className="mt-7 lg:mt-0">
        {error ? (
          <Failed message={error} postId={postId} />
        ) : (
          <>
            <div className="flex items-center gap-4 lg:block">
              <span aria-hidden="true" className="spinner block size-10 shrink-0" />
              <div>
                <h2 className="text-[1.5rem] leading-tight font-extrabold tracking-tight lg:mt-5 lg:text-[1.75rem]">
                  Reading your text…
                </h2>
                <p className="mt-1 text-sm text-muted lg:mt-3 lg:text-[0.9375rem] lg:leading-relaxed">
                  {slow ? (
                    "This is taking longer than usual. You can leave: the draft keeps going."
                  ) : (
                    <>
                      <span className="lg:hidden">Usually a few seconds.</span>
                      <span className="hidden lg:inline">
                        Hang tight, this usually takes a few seconds. You can leave this page: the
                        draft keeps going.
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <ol
              aria-live="polite"
              className="mt-5 space-y-3 rounded-2xl border border-line bg-surface p-4 lg:mt-7 lg:space-y-3.5 lg:border-0 lg:bg-transparent lg:p-0"
            >
              {STEPS.map((step, index) => (
                <StepRow
                  key={step}
                  label={step}
                  state={index < active ? "done" : index === active ? "active" : "todo"}
                  // The last step is a detail: mobile shows the first three (03b-M).
                  className={index === 3 ? "hidden lg:flex" : undefined}
                />
              ))}
            </ol>

            <form action={cancelDraft} className="mt-6 lg:mt-7">
              <input type="hidden" name="postId" value={postId} />
              <CancelButton label="Cancel" />
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function StepRow({
  label,
  state,
  className,
}: {
  label: string;
  state: "done" | "active" | "todo";
  className?: string;
}) {
  return (
    <li
      className={`flex items-center gap-3 text-[0.9375rem] ${
        state === "todo" ? "text-muted" : "font-semibold text-fg"
      } ${className ?? ""}`}
    >
      {state === "done" ? (
        <span className="grid size-6 place-items-center rounded-full bg-[#3f8f5a] text-white">
          <CheckIcon size={13} strokeWidth={3} />
        </span>
      ) : state === "active" ? (
        <span className="grid size-6 place-items-center rounded-full border-2 border-gold">
          <span className="size-2 rounded-full bg-gold" />
        </span>
      ) : (
        <span className="size-6 rounded-full border-2 border-line-strong" />
      )}
      {label}
      {state === "active" ? <span className="sr-only"> (in progress)</span> : null}
    </li>
  );
}

/** Extraction failed. Retry and the full error screen come with 7.10. */
function Failed({ message, postId }: { message: string; postId: string }) {
  return (
    <div role="alert">
      <h2 className="text-[1.5rem] leading-tight font-extrabold tracking-tight lg:text-[1.75rem]">
        Couldn&apos;t read this screenshot
      </h2>
      <p className="mt-3 text-[0.9375rem] leading-relaxed text-fg-soft">
        Try another screenshot with the text sharp and the red underlines clearly visible.
      </p>
      <p className="mt-3 rounded-xl bg-surface-2 px-3.5 py-2.5 text-[0.8125rem] text-muted">
        {message}
      </p>
      <form action={cancelDraft} className="mt-6">
        <input type="hidden" name="postId" value={postId} />
        <CancelButton label="Choose another screenshot" primary />
      </form>
    </div>
  );
}

function CancelButton({ label, primary = false }: { label: string; primary?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`h-11 rounded-full px-5 font-semibold transition disabled:opacity-60 ${
        primary
          ? "bg-fg text-bg hover:bg-white"
          : "border border-line-strong text-fg hover:bg-surface-3"
      }`}
    >
      {pending ? "Cancelling…" : label}
    </button>
  );
}
