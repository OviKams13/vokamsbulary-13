"use client";

import { type KeyboardEvent, type ReactNode, useId, useRef, useState } from "react";

import { usePostTranslation } from "./post-translation";

type WordTabsProps = {
  /** Tab labels, in `terms.position` order. */
  labels: string[];
  /** One explanation per tab, rendered on the server. */
  panels: ReactNode[];
  /** Selected tab (1-based), read from `?w=` on the server. */
  initial: number;
};

/**
 * Word tabs (6.2). Choosing a tab swaps the explanation in place (only one is
 * shown) and writes `?w=n` into the URL with `replaceState`, so the address can
 * be shared or reloaded but the Back button isn't filled with tab changes.
 * Arrow keys, Home and End move between tabs.
 *
 * Every panel stays mounted (the others are hidden), so a word keeps what it
 * shows, e.g. its French version (8.2), when you switch tabs and come back.
 * The tab on screen is shared with the post card, which shows the French text
 * while that word is in French (8.3).
 */
export function WordTabs({ labels, panels, initial }: WordTabsProps) {
  const [selected, setSelected] = useState(initial);
  const id = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const translation = usePostTranslation();

  function select(word: number) {
    setSelected(word);
    translation?.setSelected(word);
    const url = new URL(window.location.href);
    if (word === 1) url.searchParams.delete("w");
    else url.searchParams.set("w", String(word));
    window.history.replaceState(null, "", url);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const last = labels.length;
    const next =
      event.key === "ArrowRight"
        ? (selected % last) + 1
        : event.key === "ArrowLeft"
          ? ((selected + last - 2) % last) + 1
          : event.key === "Home"
            ? 1
            : event.key === "End"
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    select(next);
    tabs.current[next - 1]?.focus();
  }

  return (
    <>
      <div
        role="tablist"
        aria-label="Words"
        onKeyDown={handleKeyDown}
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
      >
        {labels.map((label, index) => {
          const word = index + 1;
          const active = word === selected;
          return (
            <button
              key={word}
              ref={(element) => {
                tabs.current[index] = element;
              }}
              type="button"
              role="tab"
              id={`${id}-tab-${word}`}
              aria-selected={active}
              aria-controls={`${id}-panel-${word}`}
              tabIndex={active ? 0 : -1}
              onClick={() => select(word)}
              className={`h-10 shrink-0 rounded-[0.875rem] border px-3.5 text-sm font-bold transition sm:h-11 sm:px-4 sm:text-[0.9375rem] ${
                active
                  ? "border-fg bg-fg text-bg"
                  : "border-line-strong bg-surface-2 text-fg hover:bg-surface-3"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {panels.map((panel, index) => (
        <div
          key={index}
          role="tabpanel"
          id={`${id}-panel-${index + 1}`}
          aria-labelledby={`${id}-tab-${index + 1}`}
          hidden={index + 1 !== selected}
          className="mt-4 rounded-[1.375rem] border border-line bg-surface px-4.5 py-6 sm:mt-5 sm:rounded-3xl sm:px-8 sm:py-8"
        >
          {panel}
        </div>
      ))}
    </>
  );
}
