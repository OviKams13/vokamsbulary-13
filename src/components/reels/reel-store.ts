"use client";

import { useEffect, useSyncExternalStore } from "react";

import { type ReelScope, type ReelWord, reelRoutes } from "@/lib/reels/data";

/**
 * Reels in the browser (16.3), outside the player:
 *
 * - Readiness: how many reels of a post or a TOTW are ready ("x/N ready" on
 *   the ▶ buttons), read from `GET /api/reels` and kept per scope.
 * - Preparation: one queue for the whole app, word by word. "Prepare TOTW
 *   reels" fills it with the scope's missing words; the background run (new
 *   posts, while the app is open) with the words left `pending` after a
 *   publish. Never two words at once (one Claude call at a time).
 *
 * Module state: a preparation keeps going while the user moves between pages.
 */

export type Readiness = {
  ready: number;
  total: number;
  /** Characters sent to Google TTS this month (free tier: 1M). */
  ttsCharacters: number;
  words: ReelWord[];
};

export type ReelJob = {
  /** Which scope "Prepare TOTW reels" works on; null for the background run. */
  key: string | null;
  total: number;
  done: number;
  failed: number;
  /** The word being prepared now. */
  current: string | null;
  running: boolean;
  /** The last error, shown under the progress. */
  error: string | null;
};

type PrepareAnswer = {
  status: "ready" | "pending" | "busy" | "failed" | "missing";
  error?: string;
};

const BUSY_WAIT_MS = 5_000;
/** Another run holds a word this many times in a row: skip it for now. */
const MAX_BUSY = 24;

export function scopeKey(scope: ReelScope): string {
  return scope.kind === "post" ? `post:${scope.postId}` : `totw:${scope.totwNumber}`;
}

// ---------------------------------------------------------------------------
// Readiness per scope
// ---------------------------------------------------------------------------

const readiness = new Map<string, Readiness>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export async function refreshReadiness(scope: ReelScope): Promise<Readiness | null> {
  if (!navigator.onLine) return null;
  const response = await fetch(reelRoutes.list(scope), { cache: "no-store" }).catch(() => null);
  if (!response?.ok) return null;
  const { words, ttsCharacters } = (await response.json()) as {
    words: ReelWord[];
    ttsCharacters: number;
  };
  const value = {
    words,
    ttsCharacters,
    total: words.length,
    ready: words.filter((word) => word.ready).length,
  };
  readiness.set(scopeKey(scope), value);
  emit();
  return value;
}

/** Re-read while not every reel is ready (a background run may finish one). */
const POLL_MS = 30_000;

export function useReadiness(scope: ReelScope | null): Readiness | null {
  const key = scope ? scopeKey(scope) : null;
  const value = useSyncExternalStore(
    subscribe,
    () => (key ? (readiness.get(key) ?? null) : null),
    () => null,
  );
  const complete = value !== null && value.ready === value.total;

  useEffect(() => {
    if (!scope) return;
    // Started from a timer: the store's update isn't part of this render.
    const first = window.setTimeout(() => void refreshReadiness(scope));
    if (complete) return () => window.clearTimeout(first);
    const timer = window.setInterval(() => void refreshReadiness(scope), POLL_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
    // `scope` is rebuilt on every render; its key says when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, complete]);

  return value;
}

// ---------------------------------------------------------------------------
// The preparation queue
// ---------------------------------------------------------------------------

let job: ReelJob | null = null;
let stopRequested = false;
const jobListeners = new Set<() => void>();
const setJob = (next: ReelJob | null) => {
  job = next;
  jobListeners.forEach((listener) => listener());
};
const subscribeJob = (listener: () => void) => {
  jobListeners.add(listener);
  return () => jobListeners.delete(listener);
};

export function useReelJob(): ReelJob | null {
  return useSyncExternalStore(
    subscribeJob,
    () => job,
    () => null,
  );
}

/** Prepares one word until it is ready, fails or is held elsewhere too long. */
async function prepareWord(termId: string): Promise<{ ok: boolean; error?: string }> {
  let busy = 0;
  for (;;) {
    if (stopRequested) return { ok: false };
    if (!navigator.onLine) return { ok: false, error: "No connection." };
    const response = await fetch(reelRoutes.prepare, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ termId }),
    }).catch(() => null);
    const answer = (await response?.json().catch(() => null)) as PrepareAnswer | null;
    const status = answer?.status ?? "failed";
    if (status === "ready") return { ok: true };
    if (status === "missing") return { ok: false };
    if (status === "failed") return { ok: false, error: answer?.error ?? "Preparation failed." };
    if (status === "busy") {
      if (++busy > MAX_BUSY) return { ok: false, error: "Held by another preparation." };
      await new Promise((done) => setTimeout(done, BUSY_WAIT_MS));
    }
  }
}

async function run(key: string | null, words: { termId: string; headword: string }[]) {
  stopRequested = false;
  let current: ReelJob = {
    key,
    total: words.length,
    done: 0,
    failed: 0,
    current: null,
    running: true,
    error: null,
  };
  setJob(current);
  for (const word of words) {
    if (stopRequested || !navigator.onLine) break;
    current = { ...current, current: word.headword };
    setJob(current);
    const result = await prepareWord(word.termId);
    current = {
      ...current,
      done: current.done + (result.ok ? 1 : 0),
      failed: current.failed + (result.ok ? 0 : 1),
      error: result.error ?? current.error,
    };
    setJob(current);
    // The ▶ buttons on screen count the new reel.
    await Promise.all(
      [...readiness.keys()].map((scope) => {
        const [kind, id] = scope.split(":") as ["post" | "totw", string];
        return refreshReadiness(
          kind === "post" ? { kind, postId: id } : { kind, totwNumber: Number(id) },
        );
      }),
    );
  }
  setJob({ ...current, current: null, running: false });
}

/** "Prepare TOTW reels" (16.3): every missing reel of the scope, word by word. */
export async function prepareScope(scope: ReelScope): Promise<void> {
  if (job?.running) return;
  const value = await refreshReadiness(scope);
  if (!value) return;
  const missing = value.words.filter((word) => !word.ready);
  await run(scopeKey(scope), missing);
}

export function stopPreparing(): void {
  stopRequested = true;
}

/**
 * The background run (16.3): words of new posts left `pending` after their
 * publish, one by one, while the app is open. Skipped while another run works.
 */
export async function prepareInBackground(): Promise<void> {
  if (job?.running || !navigator.onLine) return;
  const response = await fetch(reelRoutes.pending, { cache: "no-store" }).catch(() => null);
  if (!response?.ok) return;
  const { words } = (await response.json()) as { words: { termId: string; headword: string }[] };
  if (words.length === 0 || job?.running) return;
  await run(null, words);
}
