"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { type ReelScope, type ReelWord, type ReelWordData, reelRoutes } from "@/lib/reels/data";

/** Where one word of the player is. */
export type WordState =
  | { kind: "loading" }
  | { kind: "preparing" }
  | { kind: "ready"; data: ReelWordData }
  | { kind: "failed"; error: string }
  | { kind: "missing" };

type PrepareAnswer = {
  status: "ready" | "pending" | "busy" | "failed" | "missing";
  error?: string;
};

/** Another run holds the reel: ask again after this long. */
const BUSY_WAIT_MS = 5_000;

/**
 * The words of the player and their reels (16.2): the word on screen is
 * loaded (or prepared first, then loaded), and the next one is loaded ahead,
 * or prepared ahead once the one on screen plays, one preparation at a time.
 */
export function useReelWords(
  scope: ReelScope,
  initialWords: ReelWord[],
  index: number,
  offline: boolean,
) {
  const [words, setWords] = useState(initialWords);
  const [states, setStates] = useState<Record<string, WordState>>({});
  const started = useRef(new Set<string>());
  /** Preparations run one after the other (one Claude call at a time). */
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const queued = useRef(0);
  /** Downloads started ahead (the voices), stopped when the player closes. */
  const downloads = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    downloads.current = controller;
    return () => controller.abort();
  }, []);

  const setState = useCallback((termId: string, state: WordState) => {
    setStates((current) => ({ ...current, [termId]: state }));
  }, []);

  const load = useCallback(
    async (termId: string): Promise<boolean> => {
      const response = await fetch(reelRoutes.word(termId), { cache: "no-store" });
      if (!response.ok) return false;
      const data = (await response.json()) as ReelWordData;
      setState(termId, { kind: "ready", data });
      setWords((list) =>
        list.map((word) =>
          word.termId === termId ? { ...word, ready: true, failed: false } : word,
        ),
      );
      // Warm the browser cache for the voice.
      void fetch(data.audioUrl, { signal: downloads.current?.signal }).catch(() => undefined);
      return true;
    },
    [setState],
  );

  const run = useCallback(
    async (termId: string): Promise<boolean> => {
      setState(termId, { kind: "preparing" });
      try {
        for (;;) {
          if (!navigator.onLine) {
            // Started again when the connection is back.
            started.current.delete(termId);
            setState(termId, { kind: "loading" });
            return false;
          }
          const response = await fetch(reelRoutes.prepare, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ termId }),
          });
          const answer = (await response.json().catch(() => null)) as PrepareAnswer | null;
          const status = answer?.status ?? "failed";
          if (status === "ready") return await load(termId);
          if (status === "missing") {
            setState(termId, { kind: "missing" });
            return false;
          }
          if (status === "failed") {
            setState(termId, {
              kind: "failed",
              error: answer?.error ?? `The server answered ${response.status}.`,
            });
            return false;
          }
          if (status === "busy") await new Promise((done) => setTimeout(done, BUSY_WAIT_MS));
          // "pending": the next step right away.
        }
      } catch {
        setState(termId, { kind: "failed", error: "The connection was lost." });
        return false;
      }
    },
    [load, setState],
  );

  /** A word ahead is prepared only when nothing else waits; the word on screen always queues. */
  const prepare = useCallback(
    (termId: string, ahead: boolean): Promise<boolean> => {
      if (ahead && queued.current > 0) return Promise.resolve(false);
      queued.current += 1;
      setState(termId, { kind: "preparing" });
      const result = queue.current
        .then(() => run(termId))
        .finally(() => {
          queued.current -= 1;
        });
      queue.current = result.catch(() => undefined);
      return result;
    },
    [run, setState],
  );

  const open = useCallback(
    async (word: ReelWord, ahead: boolean) => {
      if (started.current.has(word.termId)) return;
      started.current.add(word.termId);
      if (!ahead) setState(word.termId, { kind: "loading" });
      const loaded = word.ready && (await load(word.termId).catch(() => false));
      if (loaded) return;
      const done = await prepare(word.termId, ahead);
      // A word ahead that couldn't start now (another preparation) is tried again later.
      if (!done && ahead && !word.ready) {
        started.current.delete(word.termId);
        setStates((list) => {
          if (list[word.termId]?.kind !== "preparing") return list;
          const rest = { ...list };
          delete rest[word.termId];
          return rest;
        });
      }
    },
    [load, prepare, setState],
  );

  const current = words[index];
  const next = words[index + 1];
  const currentState = current ? states[current.termId] : undefined;

  // The word on screen.
  useEffect(() => {
    if (!current || offline) return;
    const state = states[current.termId];
    if (state && (state.kind !== "loading" || started.current.has(current.termId))) return;
    // Started from a timer: the state changes it makes are not part of this render.
    const timer = window.setTimeout(() => void open(current, false));
    return () => window.clearTimeout(timer);
  }, [current, offline, open, states]);

  // The next word, ahead: loaded at once if ready, prepared once the current one plays.
  useEffect(() => {
    if (!next || offline || states[next.termId]) return;
    if (!next.ready && currentState?.kind !== "ready") return;
    const timer = window.setTimeout(() => void open(next, true));
    return () => window.clearTimeout(timer);
  }, [next, offline, open, states, currentState?.kind]);

  // The list is read again from time to time: words prepared elsewhere become ready.
  useEffect(() => {
    if (offline) return;
    const timer = window.setInterval(async () => {
      const response = await fetch(reelRoutes.list(scope), { cache: "no-store" }).catch(() => null);
      if (!response?.ok) return;
      const { words: fresh } = (await response.json()) as { words: ReelWord[] };
      setWords((list) =>
        list.map((word) => {
          const update = fresh.find((item) => item.termId === word.termId);
          return update ? { ...word, ready: word.ready || update.ready } : word;
        }),
      );
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [scope, offline]);

  const stateOf = useCallback(
    (termId: string): WordState => states[termId] ?? { kind: "loading" },
    [states],
  );

  const retry = useCallback((termId: string) => {
    started.current.delete(termId);
    setStates((list) => {
      const rest = { ...list };
      delete rest[termId];
      return rest;
    });
  }, []);

  return { words, stateOf, retry };
}
