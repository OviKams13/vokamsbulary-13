"use client";

import { type RefObject, useEffect, useRef } from "react";

import type { ReelScreen } from "@/lib/reels/script";

import type { ReelPosition } from "./use-reel-clock";

/**
 * One segment per screen (16.2). Screens before the current one are full, the
 * current one fills with its time (English then French steps), later ones are
 * empty. Redrawn every frame from the clock, without re-rendering the player.
 */
export function ReelProgress({
  screens,
  position,
  elapsed,
  ended,
}: {
  screens: ReelScreen[] | null;
  position: ReelPosition;
  elapsed: RefObject<number>;
  ended: boolean;
}) {
  const fill = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!screens) return;
    let frame = 0;
    const draw = () => {
      frame = requestAnimationFrame(draw);
      const screen = screens[position.screen];
      const bar = fill.current;
      if (!screen || !bar) return;
      const total = screen.lines.reduce((sum, line) => sum + line.stepMs, 0);
      const before = screen.lines
        .slice(0, position.line)
        .reduce((sum, line) => sum + line.stepMs, 0);
      const ratio = ended ? 1 : Math.min(1, (before + elapsed.current) / Math.max(total, 1));
      bar.style.transform = `scaleX(${ratio})`;
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [screens, position, elapsed, ended]);

  const count = screens?.length ?? 1;
  return (
    <div className="flex gap-1" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <span key={index} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/22">
          {index < position.screen || (ended && index === position.screen) ? (
            <span key="done" className="block h-full w-full bg-white" />
          ) : index === position.screen && screens ? (
            <span
              key="current"
              ref={fill}
              className="block h-full w-full origin-left scale-x-0 bg-white"
            />
          ) : null}
        </span>
      ))}
    </div>
  );
}
