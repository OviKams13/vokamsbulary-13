"use client";

import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";

import type { ReviewColor } from "@/lib/review";

import { useReviewColor } from "./use-review";

type Choice = { color: ReviewColor | null; label: string };

const CHOICES: Choice[] = [
  { color: "green", label: "Understood every word" },
  { color: "orange", label: "Understood some" },
  { color: "red", label: "Too hard, skipped" },
  { color: null, label: "No colour" },
];

const FILL: Record<ReviewColor, string> = {
  green: "border-review-green bg-review-green",
  orange: "border-review-orange bg-review-orange",
  red: "border-review-red bg-review-red",
};

function describe(color: ReviewColor | null): string {
  return CHOICES.find((choice) => choice.color === color)!.label;
}

/** The dot itself: filled with the colour, or an empty grey outline. */
function Dot({ color, size }: { color: ReviewColor | null; size: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className={`block shrink-0 rounded-full border-2 ${
        color ? FILL[color] : "border-muted/70 bg-transparent"
      }`}
    />
  );
}

type ReviewCircleProps = {
  postId: string;
  /** The colour the page has (server or offline copy) and when it was set. */
  color: ReviewColor | null;
  changedAt: number | null;
  /** Which side the choices open towards: from the circle's left edge, or its right edge. */
  align?: "start" | "end";
  /** Size of the tap area around the dot. */
  size?: "sm" | "md";
  /** For the button's label: "TOTW 1 · #4". */
  label: string;
  /** Its position: `relative` by default (the choices are placed from it). */
  className?: string;
};

/**
 * Review colour of a post (15.2): a small circle, empty by default. A tap
 * opens the 4 choices beside it (green, orange, red, none); a choice is saved
 * at once (offline too, sent later) and closes them. Escape or a tap
 * elsewhere closes them without a change.
 *
 * It is never inside the post's link (a button in a link is invalid HTML and
 * would open the post): the quick list places it over its row.
 */
export function ReviewCircle({
  postId,
  color,
  changedAt,
  align = "start",
  size = "md",
  label,
  className = "relative",
}: ReviewCircleProps) {
  const [current, setColor] = useReviewColor(postId, { color, changedAt });
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const groupId = useId();

  useEffect(() => {
    if (!open) return;
    // The current choice gets the focus, so the keyboard can move from it.
    root.current?.querySelector<HTMLElement>("[aria-pressed='true']")?.focus();

    function onPointerDown(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function close() {
    setOpen(false);
    button.current?.focus();
  }

  function choose(next: ReviewColor | null) {
    if (next !== current.color) setColor(next);
    close();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      // Only the choices close: the quick list or the sheet around stays open.
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    // Left / right move between the choices; up / down stay with the quick list.
    event.preventDefault();
    event.stopPropagation();
    const options = [...event.currentTarget.querySelectorAll<HTMLElement>("button")];
    const index = options.indexOf(document.activeElement as HTMLElement);
    const step = event.key === "ArrowRight" ? 1 : -1;
    options[(index + step + options.length) % options.length]?.focus();
  }

  const tap = size === "sm" ? "size-8" : "size-10";

  return (
    <div ref={root} className={`shrink-0 ${className}`}>
      <button
        ref={button}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={open ? groupId : undefined}
        aria-label={`Review colour of ${label}: ${describe(current.color)}`}
        title={describe(current.color)}
        data-review-color={current.color ?? "none"}
        className={`grid ${tap} place-items-center rounded-full transition hover:bg-surface-3`}
      >
        <Dot color={current.color} size={size === "sm" ? 16 : 18} />
      </button>

      {open ? (
        <div
          id={groupId}
          role="group"
          aria-label={`Review colour of ${label}`}
          onKeyDown={onKeyDown}
          className={`absolute top-1/2 z-20 flex -translate-y-1/2 items-center gap-0.5 rounded-full border border-line-strong bg-surface-2 p-0.5 shadow-[0_8px_24px_rgb(0_0_0/0.55)] ${
            align === "start" ? "left-0" : "right-0"
          }`}
        >
          {CHOICES.map((choice) => {
            const selected = choice.color === current.color;
            return (
              <button
                key={choice.color ?? "none"}
                type="button"
                onClick={() => choose(choice.color)}
                aria-pressed={selected}
                aria-label={choice.label}
                title={choice.label}
                data-review-choice={choice.color ?? "none"}
                className={`grid size-9 place-items-center rounded-full transition hover:bg-surface-3 ${
                  selected ? "bg-surface-3 ring-2 ring-fg/70 ring-inset" : ""
                }`}
              >
                <Dot color={choice.color} size={20} />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
