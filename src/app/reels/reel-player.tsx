"use client";

import { useRouter } from "next/navigation";
import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { useConnection } from "@/components/offline/connection";
import {
  REEL_RETURN_KEY,
  REEL_SPEEDS,
  type ReelScope,
  type ReelSpeed,
  type ReelWord,
} from "@/lib/reels/data";

import { ReelProgress } from "./reel-progress";
import { ReelStage } from "./reel-stage";
import { useReelClock } from "./use-reel-clock";
import { useReelWords, type WordState } from "./use-reel-words";

/** Held this long, a touch pauses (until it is lifted). */
const LONG_PRESS_MS = 280;
/** A vertical move this long changes reel. */
const SWIPE_PX = 60;
/** Below this, a touch is a tap (not a move). */
const TAP_PX = 12;

/**
 * The reel player (16.2): full screen on a phone, a 9:16 player centred on a
 * dark backdrop on a computer.
 *
 * - Tap right: next screen; tap left: previous screen; hold: pause.
 * - Swipe up: next reel; swipe down: previous reel (within the post, or the
 *   whole TOTW, depending on where it was opened; it stops at the last word).
 * - Keys: ←/→ screens, ↑/↓ reels, Space pause, Esc close; ▲ ▼ buttons too.
 * - Speed 1× … 2× (voice and animations together), remembered on the device.
 *
 * A reel that isn't ready is prepared first ("Preparing this reel…"). Reels
 * need a connection: offline, the player waits with a message.
 */
export function ReelPlayer({
  scope,
  initialWords,
  startIndex,
  closeHref,
}: {
  scope: ReelScope;
  initialWords: ReelWord[];
  startIndex: number;
  /** Where ✕ goes when the player wasn't opened from a ▶ of the app (a direct link). */
  closeHref: string;
}) {
  const router = useRouter();
  const { offline } = useConnection();
  const [index, setIndex] = useState(startIndex);
  const [direction, setDirection] = useState<"up" | "down" | null>(null);
  const [speed, setSpeed] = useSpeed();
  // One audio element for the whole session: iOS keeps it unlocked after a tap.
  const audio = useRef<HTMLAudioElement>(null);
  const getAudio = useCallback(() => audio.current, []);

  // Leaving the player: the voice stops downloading too.
  useEffect(() => {
    const element = audio.current;
    return () => {
      if (!element) return;
      element.pause();
      element.removeAttribute("src");
      element.load();
    };
  }, []);

  const { words, stateOf, retry } = useReelWords(scope, initialWords, index, offline);
  const word = words[index]!;
  const isLastWord = index === words.length - 1;

  const go = useCallback(
    (step: 1 | -1) => {
      const next = index + step;
      if (next < 0 || next >= words.length) return;
      setDirection(step === 1 ? "up" : "down");
      setIndex(next);
    },
    [index, words.length],
  );

  const close = useCallback(() => {
    audio.current?.pause();
    // Opened from a ▶ of the app: back to that page; from a direct link: to the post or the TOTW.
    if (window.history.length > 1 && sessionStorage.getItem(REEL_RETURN_KEY)) {
      sessionStorage.removeItem(REEL_RETURN_KEY);
      router.back();
    } else {
      router.replace(closeHref);
    }
  }, [router, closeHref]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center gap-6 bg-[#050506] select-none">
      <audio ref={audio} preload="auto" />

      <div
        className="[container-type:size] relative h-dvh w-full overflow-hidden bg-[#0b0b0c] lg:aspect-9/16 lg:h-[calc(100dvh-3rem)] lg:w-auto lg:max-w-[calc(100vw-10rem)] lg:rounded-card lg:border lg:border-line-strong lg:shadow-[0_30px_80px_rgb(0_0_0/0.7)]"
        style={{ "--reel-speed": speed } as CSSProperties}
        data-reel-frame=""
      >
        <ReelSession
          key={word.termId}
          word={word}
          state={stateOf(word.termId)}
          isLastWord={isLastWord}
          direction={direction}
          offline={offline}
          speed={speed}
          onSpeed={() => setSpeed(nextSpeed(speed))}
          getAudio={getAudio}
          go={go}
          close={close}
          retry={() => retry(word.termId)}
        />
      </div>

      {/* Computer: previous / next reel. */}
      <div className="hidden flex-col gap-3 lg:flex">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={index === 0}
          aria-label="Previous word"
          className="grid size-12 place-items-center rounded-full border border-line-strong bg-surface-2 text-lg text-fg transition hover:bg-surface-3 disabled:opacity-30"
        >
          ▲
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={isLastWord}
          aria-label="Next word"
          className="grid size-12 place-items-center rounded-full border border-line-strong bg-surface-2 text-lg text-fg transition hover:bg-surface-3 disabled:opacity-30"
        >
          ▼
        </button>
      </div>
    </div>
  );
}

/** One reel on screen: its clock, its gestures and keys, its top bar. */
function ReelSession({
  word,
  state,
  isLastWord,
  direction,
  offline,
  speed,
  onSpeed,
  getAudio,
  go,
  close,
  retry,
}: {
  word: ReelWord;
  state: WordState;
  isLastWord: boolean;
  direction: "up" | "down" | null;
  offline: boolean;
  speed: ReelSpeed;
  onSpeed: () => void;
  getAudio: () => HTMLAudioElement | null;
  go: (step: 1 | -1) => void;
  close: () => void;
  retry: () => void;
}) {
  const [userPaused, setUserPaused] = useState(false);
  const [held, setHeld] = useState(false);
  const data = state.kind === "ready" ? state.data : null;
  const paused = userPaused || held || offline;
  const clock = useReelClock({
    screens: data?.screens ?? null,
    src: data?.audioUrl ?? null,
    getAudio,
    speed,
    paused,
  });
  const { next, previous, unlock } = clock;

  // Keyboard (computer).
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      // Keys inside the review choices, and Space on a focused button, stay theirs.
      if (target?.closest("[role='group']")) return;
      if (event.key === " " && target?.closest("button")) return;
      const actions: Record<string, () => void> = {
        ArrowRight: next,
        ArrowLeft: previous,
        ArrowDown: () => go(1),
        ArrowUp: () => go(-1),
        " ": () => setUserPaused((value) => !value),
        Escape: close,
      };
      const action = actions[event.key];
      if (!action) return;
      event.preventDefault();
      unlock();
      action();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, previous, unlock, go, close]);

  // Touch and mouse on the stage: tap, hold, swipe.
  const gesture = useRef<{
    x: number;
    y: number;
    id: number;
    timer: number;
    holding: boolean;
  } | null>(null);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("[data-reel-control]")) return;
    if (event.button !== 0) return;
    const timer = window.setTimeout(() => {
      if (gesture.current) gesture.current.holding = true;
      setHeld(true);
    }, LONG_PRESS_MS);
    gesture.current = {
      x: event.clientX,
      y: event.clientY,
      id: event.pointerId,
      timer,
      holding: false,
    };
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId || current.holding) return;
    if (Math.hypot(event.clientX - current.x, event.clientY - current.y) > TAP_PX) {
      window.clearTimeout(current.timer);
    }
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    gesture.current = null;
    if (!current || current.id !== event.pointerId) return;
    window.clearTimeout(current.timer);
    unlock();
    if (current.holding) {
      setHeld(false);
      return;
    }
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (Math.abs(dy) >= SWIPE_PX && Math.abs(dy) > Math.abs(dx) * 1.2) {
      go(dy < 0 ? 1 : -1);
      return;
    }
    if (Math.hypot(dx, dy) > TAP_PX) return;
    const box = event.currentTarget.getBoundingClientRect();
    if (event.clientX - box.left < box.width / 2) previous();
    else next();
  }

  function onPointerCancel() {
    if (gesture.current) window.clearTimeout(gesture.current.timer);
    gesture.current = null;
    setHeld(false);
  }

  const screen = data?.screens[clock.position.screen];
  const playing = Boolean(data && screen && clock.audioReady);

  return (
    <div className={`absolute inset-0 ${paused ? "reel-paused" : ""}`}>
      <div
        className={`absolute inset-0 touch-none ${
          direction === "up" ? "reel-enter-up" : direction === "down" ? "reel-enter-down" : ""
        }`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onContextMenu={(event) => event.preventDefault()}
        data-reel-stage=""
      >
        {data && screen && playing && !offline ? (
          <ReelStage
            data={data}
            word={word}
            screen={screen}
            screenIndex={clock.position.screen}
            line={clock.position.line}
            ended={clock.ended}
            isLastWord={isLastWord}
          />
        ) : (
          <Waiting
            state={data && !clock.audioReady ? { kind: "loading" } : state}
            offline={offline}
            onRetry={retry}
          />
        )}
      </div>

      {/* Top: progress per screen, the word, k/N, speed, close. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-bg via-bg/85 to-transparent px-3 pt-[max(0.6rem,env(safe-area-inset-top))] pb-4">
        <ReelProgress
          screens={data?.screens ?? null}
          position={clock.position}
          elapsed={clock.elapsed}
          ended={clock.ended}
        />
        <div className="mt-2 flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-fg-soft">
            <span className="font-display font-extrabold tracking-wide">
              TOTW {word.totwNumber} · #{word.position}
            </span>{" "}
            · <span className="text-fg">{word.headword}</span>
          </p>
          <p
            className="font-display text-sm font-extrabold text-muted tabular-nums"
            aria-label={`Word ${word.wordIndex} of ${word.wordCount} in this post`}
            data-reel-counter=""
          >
            {word.wordIndex}/{word.wordCount}
          </p>
          <button
            type="button"
            data-reel-control=""
            data-reel-speed=""
            onClick={(event) => {
              onSpeed();
              // A tap or a click leaves no focus on it: Space keeps pausing the reel.
              if (event.detail > 0) event.currentTarget.blur();
            }}
            className="pointer-events-auto h-8 min-w-12 rounded-full border border-line-strong bg-surface-2/90 px-2.5 text-xs font-bold text-fg tabular-nums"
            aria-label={`Speed ${speed}×, change`}
          >
            {speed}×
          </button>
          <button
            type="button"
            data-reel-control=""
            onClick={close}
            aria-label="Close the reels"
            className="pointer-events-auto grid size-9 place-items-center rounded-full text-xl leading-none text-fg hover:bg-surface-3"
          >
            ✕
          </button>
        </div>
      </div>

      {playing && !offline && (userPaused || held) ? (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
          <span
            data-reel-paused=""
            className="grid size-16 place-items-center rounded-full bg-black/55 text-2xl text-white"
          >
            ❚❚
          </span>
        </div>
      ) : null}

      {clock.needsTap && playing && !paused ? (
        <button
          type="button"
          data-reel-control=""
          onClick={unlock}
          className="absolute inset-x-0 bottom-[12cqh] z-20 mx-auto w-fit rounded-full bg-gold px-5 py-3 text-sm font-bold text-black"
        >
          ▶ Tap to hear the voice
        </button>
      ) : null}
    </div>
  );
}

function Waiting({
  state,
  offline,
  onRetry,
}: {
  state: WordState;
  offline: boolean;
  onRetry: () => void;
}) {
  const message = offline
    ? "Reels need a connection."
    : state.kind === "failed"
      ? "This reel couldn't be prepared."
      : state.kind === "missing"
        ? "This word doesn't exist anymore."
        : state.kind === "preparing"
          ? "Preparing this reel…"
          : "Loading…";
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
      {!offline && (state.kind === "preparing" || state.kind === "loading") ? (
        <span className="spinner size-9" aria-hidden="true" />
      ) : null}
      <p role="status" data-reel-status="" className="text-base font-semibold text-fg-soft">
        {message}
      </p>
      {state.kind === "preparing" && !offline ? (
        <p className="max-w-64 text-sm text-muted">
          The voice and the drawings are made once, in about a minute.
        </p>
      ) : null}
      {state.kind === "failed" && !offline ? (
        <>
          <p className="max-w-72 text-xs text-muted">{state.error}</p>
          <button
            type="button"
            data-reel-control=""
            onClick={onRetry}
            className="rounded-full bg-gold px-5 py-2.5 text-sm font-bold text-black"
          >
            Try again
          </button>
        </>
      ) : null}
    </div>
  );
}

function nextSpeed(speed: ReelSpeed): ReelSpeed {
  const at = REEL_SPEEDS.indexOf(speed);
  return REEL_SPEEDS[(at + 1) % REEL_SPEEDS.length]!;
}

// The speed, remembered on the device: a tiny store over localStorage.
const SPEED_KEY = "vk13-reel-speed";
const speedListeners = new Set<() => void>();

function readSpeed(): ReelSpeed {
  const stored = Number(localStorage.getItem(SPEED_KEY));
  return REEL_SPEEDS.find((value) => value === stored) ?? 1;
}

function subscribeSpeed(listener: () => void) {
  speedListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    speedListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function useSpeed(): [ReelSpeed, (speed: ReelSpeed) => void] {
  const speed = useSyncExternalStore(subscribeSpeed, readSpeed, () => 1 as ReelSpeed);
  const setSpeed = useCallback((value: ReelSpeed) => {
    localStorage.setItem(SPEED_KEY, String(value));
    for (const listener of speedListeners) listener();
  }, []);
  return [speed, setSpeed];
}
