"use client";

import { type RefObject, useCallback, useEffect, useRef, useState } from "react";

import type { ReelScreen } from "@/lib/reels/script";
import { VOICE_DELAY_MS } from "@/lib/reels/script";

/**
 * The reel clock (16.2). A reel is a list of steps (each screen's English
 * line, then its French line). Each step lasts `stepMs` at 1×; its voice
 * starts 0.5 s after the step appears and is a slice of the reel's single MP3
 * (`audioStartMs` … + `audioMs`), played by the player's one `<audio>` element.
 *
 * While the voice plays, the clock follows the audio itself (so a slow
 * network never cuts a line); otherwise it follows the frame time × speed.
 * Pausing pauses both; the speed applies to both. The hook lives in a
 * component keyed by the reel, so a new reel starts at its first step.
 */

export type ReelPosition = { screen: number; line: number };

export type ReelClock = {
  position: ReelPosition;
  /** The reel's MP3 can play (loaded enough). */
  audioReady: boolean;
  /** The last step has finished: the outro stays, with the review circle. */
  ended: boolean;
  /** The browser refused to start the voice without a tap. */
  needsTap: boolean;
  /** Time spent in the current step (ms at 1×), read by the progress bar every frame. */
  elapsed: RefObject<number>;
  next: () => void;
  previous: () => void;
  /** Called from a tap or a key: starts the voice where the browser had refused it. */
  unlock: () => void;
};

export function useReelClock({
  screens,
  src,
  getAudio,
  speed,
  paused,
}: {
  /** Null while the reel loads: the clock waits. */
  screens: ReelScreen[] | null;
  /** The reel's MP3. */
  src: string | null;
  /** The player's audio element (one for the whole session). */
  getAudio: () => HTMLAudioElement | null;
  speed: number;
  paused: boolean;
}): ReelClock {
  const [position, setPosition] = useState<ReelPosition>({ screen: 0, line: 0 });
  const [ended, setEnded] = useState(false);
  const [needsTap, setNeedsTapState] = useState(false);
  const [readySrc, setReadySrc] = useState<string | null>(null);
  const needsTapRef = useRef(false);
  const elapsed = useRef(0);
  /** The current step's voice was started (it is started once per step). */
  const voiceStarted = useRef(false);
  const positionRef = useRef(position);
  const endedRef = useRef(false);

  const setNeedsTap = useCallback((value: boolean) => {
    needsTapRef.current = value;
    setNeedsTapState(value);
  }, []);

  const move = useCallback(
    (next: ReelPosition, isEnd = false) => {
      positionRef.current = next;
      endedRef.current = isEnd;
      elapsed.current = 0;
      voiceStarted.current = false;
      getAudio()?.pause();
      setPosition(next);
      setEnded(isEnd);
    },
    [getAudio],
  );

  // The reel's MP3 in the player's element, and when it can play.
  useEffect(() => {
    const element = getAudio();
    if (!element || !src) return;
    const onReady = () => {
      if (element.readyState >= 3) setReadySrc(src);
    };
    element.addEventListener("canplaythrough", onReady);
    element.addEventListener("loadeddata", onReady);
    element.pause();
    if (element.getAttribute("src") !== src) {
      element.src = src;
      element.load();
    } else {
      onReady();
    }
    return () => {
      element.removeEventListener("canplaythrough", onReady);
      element.removeEventListener("loadeddata", onReady);
      element.pause();
    };
  }, [src, getAudio]);

  useEffect(() => {
    const element = getAudio();
    if (!element) return;
    element.playbackRate = speed;
    element.preservesPitch = true;
  }, [getAudio, speed]);

  const audioReady = src !== null && readySrc === src;
  const running = !paused && audioReady;

  // The frame loop: advances the clock and starts / stops the voice.
  useEffect(() => {
    const element = getAudio();
    if (!screens || screens.length === 0 || !element) return;
    if (!running) {
      element.pause();
      return;
    }
    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      frame = requestAnimationFrame(tick);
      const { screen, line } = positionRef.current;
      const step = screens[screen]?.lines[line];
      if (!step || endedRef.current) return;

      const voiceEnd = VOICE_DELAY_MS + step.audioMs;
      const inVoice = elapsed.current >= VOICE_DELAY_MS && elapsed.current < voiceEnd;

      if (inVoice && voiceStarted.current && element.ended) {
        // The last line ends with the file: done (a play() now would restart the file).
        elapsed.current = voiceEnd;
      } else if (inVoice && voiceStarted.current && !element.paused) {
        // Follow the voice: the clock never runs ahead of it.
        const played = element.currentTime * 1000 - step.audioStartMs;
        elapsed.current = Math.max(elapsed.current, VOICE_DELAY_MS + played);
        if (played >= step.audioMs) {
          element.pause();
          elapsed.current = voiceEnd;
        }
      } else if (inVoice && voiceStarted.current) {
        // Paused, then resumed: continue from the same point.
        if (!needsTapRef.current) void element.play().catch(() => setNeedsTap(true));
      } else if (inVoice) {
        voiceStarted.current = true;
        element.currentTime = (step.audioStartMs + (elapsed.current - VOICE_DELAY_MS)) / 1000;
        void element.play().then(
          () => setNeedsTap(false),
          (error: unknown) => {
            // Autoplay refused (no tap yet on this page): wait for one.
            if (error instanceof DOMException && error.name === "NotAllowedError") {
              setNeedsTap(true);
            }
          },
        );
      } else {
        elapsed.current += dt * speed;
      }

      if (elapsed.current >= step.stepMs) {
        if (line + 1 < screens[screen]!.lines.length) move({ screen, line: line + 1 });
        else if (screen + 1 < screens.length) move({ screen: screen + 1, line: 0 });
        else {
          elapsed.current = step.stepMs;
          endedRef.current = true;
          element.pause();
          setEnded(true);
        }
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [screens, getAudio, speed, running, move, setNeedsTap]);

  const goTo = useCallback(
    (screen: number) => {
      if (!screens) return;
      if (screen >= screens.length) {
        // Past the last screen: the end of the reel (outro with the review circle).
        const last = screens.length - 1;
        const lastLine = screens[last]!.lines.length - 1;
        move({ screen: last, line: lastLine }, true);
        elapsed.current = screens[last]!.lines[lastLine]!.stepMs;
        return;
      }
      move({ screen: Math.max(0, screen), line: 0 });
    },
    [screens, move],
  );

  const next = useCallback(() => {
    if (!endedRef.current) goTo(positionRef.current.screen + 1);
  }, [goTo]);

  const previous = useCallback(() => {
    // From the end, "previous" replays the outro.
    goTo(endedRef.current ? positionRef.current.screen : positionRef.current.screen - 1);
  }, [goTo]);

  const unlock = useCallback(() => {
    const element = getAudio();
    if (!element) return;
    if (needsTapRef.current) {
      setNeedsTap(false);
      if (voiceStarted.current && !endedRef.current) {
        void element.play().catch(() => setNeedsTap(true));
      }
      return;
    }
    if (element.paused && !voiceStarted.current) {
      // iOS: a play() inside a tap unlocks the element for the later lines (muted: no sound).
      element.muted = true;
      void element
        .play()
        .then(
          () => {
            if (!voiceStarted.current) element.pause();
          },
          () => undefined,
        )
        .finally(() => {
          element.muted = false;
        });
    }
  }, [getAudio, setNeedsTap]);

  return { position, audioReady, ended, needsTap, elapsed, next, previous, unlock };
}
