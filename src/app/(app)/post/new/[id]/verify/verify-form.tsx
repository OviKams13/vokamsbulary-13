"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, startTransition, useEffect, useMemo, useRef, useState } from "react";

import { AlertIcon, CheckIcon, PlusIcon, TrashIcon } from "@/components/icons";
import type { SeenIn } from "@/db/already-seen";
import type { DraftStatus } from "@/db/drafts";
import { routes } from "@/lib/routes";
import { checkDraft, type DraftErrors, type DraftInput, MAX_TERMS, sameDraft } from "@/lib/verify";

import {
  checkAlreadySeenAction,
  explainAction,
  publishAction,
  saveDraftAction,
  type VerifyResult,
} from "./actions";

type Row = { key: number; surface: string; headword: string; addedByUser: boolean };

type VerifyFormProps = {
  postId: string;
  initialStatus: DraftStatus;
  initialError: string | null;
  initialText: string;
  initialTerms: { surface: string; headword: string; addedByUser: boolean }[];
  initialSeen: Record<string, SeenIn>;
  /** "TOTW n · #m": where the post lands when published. */
  slotLabel: string;
};

/** editing → (Explain & publish) explaining → (status `explained`) publishing → the new post. */
type Phase = "editing" | "saving" | "explaining" | "publishing";

const POLL_MS = 1500;

/**
 * The Verify form (7.6–7.9, mockups 03c-D / 03c-M).
 *
 * - The text and every row are editable; "+ Add word" adds a row that is
 *   saved with `added_by_user`. Rows are checked as you type (same rules as
 *   the server: the word must appear in the text, no duplicates…).
 * - Each base form is checked against published posts (7.7) and shows
 *   "Already seen in TOTW n · #m" with a link.
 * - "Save draft" saves. "Explain & publish" saves, starts the explanation in
 *   the background, polls the status, and publishes when it's `explained`
 *   (7.8, 7.9). Leaving meanwhile is fine: the draft waits as "Ready" in
 *   Unfinished drafts, and this page then offers "Publish".
 */
export function VerifyForm({
  postId,
  initialStatus,
  initialError,
  initialText,
  initialTerms,
  initialSeen,
  slotLabel,
}: VerifyFormProps) {
  const router = useRouter();
  const nextKey = useRef(initialTerms.length);
  const [text, setText] = useState(initialText);
  const [rows, setRows] = useState<Row[]>(() =>
    initialTerms.map((term, index) => ({ key: index, ...term })),
  );
  const [baseline, setBaseline] = useState<DraftInput>(() => ({
    text: initialText,
    terms: initialTerms,
  }));
  const [status, setStatus] = useState(initialStatus);
  const [phase, setPhase] = useState<Phase>("editing");
  const [explainError, setExplainError] = useState(initialError);
  const [message, setMessage] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<DraftErrors | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [seen, setSeen] = useState(initialSeen);

  const input: DraftInput = { text, terms: rows };
  const live = checkDraft(input, { requireTerms: false });
  const errors = serverErrors ?? live.errors;
  const dirty = !sameDraft(live.value, checkDraft(baseline, { requireTerms: false }).value);
  const busy = phase !== "editing";
  const ready = status === "explained" && !dirty;

  // Already-seen check (7.7) whenever the set of base forms changes.
  const headwordKey = useMemo(
    () =>
      [...new Set(rows.map((row) => row.headword.trim().toLowerCase()).filter(Boolean))]
        .sort()
        .join("\n"),
    [rows],
  );
  useEffect(() => {
    if (!headwordKey) return;
    const timer = setTimeout(() => {
      checkAlreadySeenAction(headwordKey.split("\n"))
        .then(setSeen)
        .catch(() => {});
    }, 400);
    return () => clearTimeout(timer);
  }, [headwordKey]);

  // While Claude writes the explanations: poll, then publish (7.8 → 7.9).
  useEffect(() => {
    if (phase !== "explaining") return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const response = await fetch(routes.draftStatus(postId), { cache: "no-store" });
        if (stopped) return;
        if (response.status === 404) return router.replace(routes.newPost);
        if (response.ok) {
          const draft = (await response.json()) as { status: string; lastError: string | null };
          if (stopped) return;
          if (draft.status === "published") return router.replace(routes.post(postId));
          if (draft.status === "explained") {
            setStatus("explained");
            return publish();
          }
          if (draft.lastError) {
            setExplainError(draft.lastError);
            return setPhase("editing");
          }
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
    // `publish` only reads stable values (postId, setters).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, postId, router]);

  function publish() {
    setPhase("publishing");
    startTransition(async () => {
      // Redirects to the new post on success.
      const result = await publishAction(postId);
      setMessage(result.message);
      setPhase("editing");
    });
  }

  function submit(kind: "save" | "explain") {
    setMessage(null);
    setServerErrors(null);
    if (kind === "explain" && ready) return publish();

    const strict = checkDraft(input, { requireTerms: kind === "explain" });
    if (strict.errors) {
      setServerErrors(strict.errors);
      setMessage("Fix the marked fields first.");
      return;
    }

    setPhase(kind === "save" ? "saving" : "explaining");
    startTransition(async () => {
      let result: VerifyResult;
      try {
        result =
          kind === "save"
            ? await saveDraftAction(postId, input)
            : await explainAction(postId, input);
      } catch {
        result = { ok: false, message: "The draft couldn't be saved. Check your connection." };
      }
      if (!result.ok) {
        setServerErrors(result.errors ?? null);
        setMessage(result.message);
        setPhase("editing");
        return;
      }
      setBaseline(strict.value);
      setStatus(result.status);
      if (kind === "save") {
        setSavedAt(Date.now());
        setPhase("editing");
      } else {
        // Explaining: the poll above takes over.
        setExplainError(null);
      }
    });
  }

  function updateRow(key: number, field: "surface" | "headword", value: string) {
    setServerErrors(null);
    setSavedAt(null);
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, [field]: value } : row)),
    );
  }

  function addRow() {
    setSavedAt(null);
    const key = nextKey.current++;
    setRows((current) => [...current, { key, surface: "", headword: "", addedByUser: true }]);
    // Focus the new row's first field once it's rendered.
    requestAnimationFrame(() => document.getElementById(`surface-${key}`)?.focus());
  }

  function removeRow(key: number) {
    setServerErrors(null);
    setSavedAt(null);
    setRows((current) => current.filter((row) => row.key !== key));
  }

  const primaryLabel =
    phase === "explaining"
      ? "Writing explanations…"
      : phase === "publishing"
        ? "Publishing…"
        : ready
          ? "Publish"
          : "Explain & publish";

  return (
    <div className="mt-7 lg:mt-0">
      <fieldset disabled={busy} className="min-w-0">
        <label htmlFor="verify-text" className={`${LABEL} mb-2.5 block`}>
          Extracted text
        </label>
        <textarea
          id="verify-text"
          value={text}
          onChange={(event) => {
            setServerErrors(null);
            setSavedAt(null);
            setText(event.target.value);
          }}
          rows={6}
          aria-invalid={errors?.text ? true : undefined}
          aria-describedby={errors?.text ? "verify-text-error" : undefined}
          className={`block min-h-40 w-full resize-y rounded-2xl border bg-surface px-4 py-3.5 text-base leading-relaxed text-fg transition outline-none focus:border-line-strong focus:bg-surface-2 lg:px-4.5 lg:py-4 ${
            errors?.text ? "border-red-500/70" : "border-line-strong/70"
          }`}
        />
        {errors?.text ? (
          <p id="verify-text-error" className="mt-2 text-[0.8125rem] font-medium text-red-400">
            {errors.text}
          </p>
        ) : null}

        <div className="mt-7 flex items-baseline justify-between gap-4">
          <h2 className={LABEL}>Detected words · {rows.length}</h2>
          <p className="hidden text-[0.8125rem] text-muted lg:block">
            Edit the base form if it looks wrong
          </p>
        </div>
        <div className="mt-3 grid grid-cols-[1fr_1.5rem_1fr_2.5rem] text-xs text-muted lg:grid-cols-[1fr_2.5rem_1fr_3.25rem]">
          <span>In the text</span>
          <span />
          <span>Base form</span>
        </div>

        <ul className="mt-2 space-y-3">
          {rows.map((row, index) => {
            const seenIn = seen[row.headword.trim().toLowerCase()];
            const error = errors?.rows[index];
            return (
              <li
                key={row.key}
                className={
                  seenIn
                    ? "-mx-2.5 rounded-2xl border border-[#5a4718] bg-[#1a1609] px-2.5 py-2.5"
                    : undefined
                }
              >
                <div className="grid grid-cols-[1fr_1.5rem_1fr_2.5rem] items-center lg:grid-cols-[1fr_2.5rem_1fr_3.25rem]">
                  <input
                    id={`surface-${row.key}`}
                    value={row.surface}
                    onChange={(event) => updateRow(row.key, "surface", event.target.value)}
                    aria-label={`Word ${index + 1}, as in the text`}
                    aria-invalid={error ? true : undefined}
                    placeholder="as in the text"
                    className={`${FIELD} ${error ? "border-red-500/70" : "border-line-strong/70"}`}
                  />
                  <span aria-hidden="true" className="text-center text-muted">
                    →
                  </span>
                  <input
                    value={row.headword}
                    onChange={(event) => updateRow(row.key, "headword", event.target.value)}
                    aria-label={`Word ${index + 1}, base form`}
                    placeholder="base form"
                    autoCapitalize="none"
                    className={`${FIELD} border-line-strong/70`}
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(row.key)}
                    aria-label={`Remove word ${index + 1}`}
                    className="ml-auto grid size-10 place-items-center rounded-xl text-muted transition hover:bg-surface-3 hover:text-fg"
                  >
                    <TrashIcon size={18} />
                  </button>
                </div>
                {error ? (
                  <p className="mt-1.5 text-[0.8125rem] font-medium text-red-400">{error}</p>
                ) : null}
                {seenIn ? <SeenNote seenIn={seenIn} /> : null}
              </li>
            );
          })}
        </ul>

        {rows.length < MAX_TERMS ? (
          <button
            type="button"
            onClick={addRow}
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong font-semibold text-fg transition hover:bg-surface-2 lg:justify-start lg:px-5"
          >
            <PlusIcon size={18} />
            Add word
          </button>
        ) : null}
        {errors?.terms ? (
          <p className="mt-2 text-[0.8125rem] font-medium text-red-400">{errors.terms}</p>
        ) : null}
      </fieldset>

      <div aria-live="polite" className="mt-5 space-y-3 empty:hidden">
        {phase === "explaining" ? (
          <Notice tone="busy">
            Writing the explanations… This takes 10–40 seconds, then the post is published. You can
            leave: the draft keeps going.
          </Notice>
        ) : null}
        {phase === "editing" && explainError ? (
          <Notice tone="error">
            The explanations couldn&apos;t be written. Try again. <Detail>{explainError}</Detail>
          </Notice>
        ) : null}
        {phase === "editing" && ready ? (
          <Notice tone="ready">Explanations are ready. Publish to add it to {slotLabel}.</Notice>
        ) : null}
        {message ? <Notice tone="error">{message}</Notice> : null}
      </div>

      <div className="mt-6 border-t border-line pt-6 lg:mt-7 lg:flex lg:items-center lg:gap-3 lg:pt-7">
        {/* Mobile: pinned to the bottom of the screen (03c-M). */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          <button
            type="button"
            disabled={busy}
            onClick={() => submit("explain")}
            className="flex h-13 w-full items-center justify-center gap-2.5 rounded-full bg-fg px-7 text-[1.0625rem] font-bold text-bg transition hover:bg-white disabled:opacity-75 lg:h-12 lg:w-auto"
          >
            {busy && phase !== "saving" ? (
              <span aria-hidden="true" className="spinner block size-4.5" />
            ) : null}
            {primaryLabel}
          </button>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => submit("save")}
          className="flex h-13 w-full items-center justify-center rounded-full border border-line-strong px-6 text-[1.0625rem] font-bold text-fg transition hover:bg-surface-3 disabled:opacity-60 lg:h-12 lg:w-auto"
        >
          {phase === "saving" ? "Saving…" : "Save draft"}
        </button>
        <p className="mt-3 text-center text-[0.8125rem] text-muted lg:mt-0 lg:ml-auto lg:text-right">
          {savedAt && !dirty ? (
            <span className="inline-flex items-center gap-1.5 font-semibold text-[#6fcf8f]">
              <CheckIcon size={14} strokeWidth={3} /> Draft saved
            </span>
          ) : (
            <span className="hidden lg:inline">Publishes as {slotLabel}</span>
          )}
        </p>
      </div>
    </div>
  );
}

/** "⚠ Already seen in TOTW n · #m" + Open link (7.7, F14). */
function SeenNote({ seenIn }: { seenIn: SeenIn }) {
  const where = `TOTW ${seenIn.totwNumber} · #${seenIn.position}`;
  const more = seenIn.count > 1 ? ` (+${seenIn.count - 1} more)` : "";
  return (
    <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <span className="inline-flex h-7.5 items-center gap-2 rounded-full bg-[#3a2e10] px-3 text-[0.8125rem] font-semibold text-gold">
        <AlertIcon size={14} />
        Already seen in {where}
        {more}
      </span>
      {/* New tab: the unsaved edits on this page stay where they are. */}
      <a
        href={routes.post(seenIn.postId)}
        target="_blank"
        rel="noopener"
        className="text-[0.875rem] font-semibold text-gold underline underline-offset-3 hover:text-gold-light"
      >
        <span className="lg:hidden">Open</span>
        <span className="hidden lg:inline">Open that post</span>
      </a>
    </p>
  );
}

function Notice({ tone, children }: { tone: "busy" | "error" | "ready"; children: ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : undefined}
      className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm leading-relaxed ${
        tone === "error"
          ? "bg-red-500/10 text-red-300"
          : tone === "ready"
            ? "bg-[#3f8f5a]/15 text-[#8fdba8]"
            : "bg-surface-2 text-fg-soft"
      }`}
    >
      {tone === "busy" ? (
        <span aria-hidden="true" className="spinner mt-0.5 block size-4.5 shrink-0" />
      ) : null}
      <span>{children}</span>
    </p>
  );
}

function Detail({ children }: { children: ReactNode }) {
  return <span className="mt-1 block text-[0.8125rem] text-red-300/70">{children}</span>;
}

const LABEL = "text-xs font-semibold tracking-[0.12em] text-muted uppercase";
const FIELD =
  "h-11 w-full min-w-0 rounded-xl border bg-surface px-3 text-[0.9375rem] text-fg transition outline-none placeholder:text-muted/60 focus:border-line-strong focus:bg-surface-2 lg:px-3.5";
