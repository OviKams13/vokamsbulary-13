"use client";

import Link from "next/link";
import { type KeyboardEvent, type ReactNode, useId, useRef, useState } from "react";

import { HighlightedText } from "@/components/highlighted-text";
import { CheckIcon, ListIcon } from "@/components/icons";
import { PostTag } from "@/components/post-tag";
import { routes } from "@/lib/routes";
import type { ExplainedResult, TextResult } from "@/lib/search";

type Tab = "all" | "words" | "texts";

type SearchResultsProps = {
  query: string;
  explained: ExplainedResult[];
  texts: TextResult[];
};

/**
 * Tabs All / Explained words / Found in texts with their counts, then the
 * result cards (10.2, mockups 05-D / 05-M). The tab is kept while the query
 * changes. An explained word opens its post on that word's tab; a text
 * result opens its post.
 */
export function SearchResults({ query, explained, texts }: SearchResultsProps) {
  const [tab, setTab] = useState<Tab>("all");
  const id = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const tabs: { key: Tab; label: string; short: string; count: number }[] = [
    { key: "all", label: "All", short: "All", count: explained.length + texts.length },
    { key: "words", label: "Explained words", short: "Explained", count: explained.length },
    { key: "texts", label: "Found in texts", short: "In texts", count: texts.length },
  ];

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = tabs.findIndex((item) => item.key === tab);
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % tabs.length
        : event.key === "ArrowLeft"
          ? (index + tabs.length - 1) % tabs.length
          : null;
    if (next === null) return;
    event.preventDefault();
    setTab(tabs[next]!.key);
    buttons.current[next]?.focus();
  }

  const showWords = tab !== "texts";
  const showTexts = tab !== "words";
  const nothing = explained.length + texts.length === 0;

  return (
    <div className="mt-1 lg:mt-7">
      <div role="tablist" aria-label="Results" onKeyDown={handleKeyDown} className="flex gap-2">
        {tabs.map((item, index) => {
          const active = item.key === tab;
          return (
            <button
              key={item.key}
              ref={(element) => {
                buttons.current[index] = element;
              }}
              type="button"
              role="tab"
              id={`${id}-${item.key}`}
              aria-selected={active}
              aria-controls={`${id}-panel`}
              tabIndex={active ? 0 : -1}
              onClick={() => setTab(item.key)}
              className={`flex h-9.5 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-bold transition lg:h-10 lg:px-4 lg:text-[0.9375rem] ${
                active
                  ? "border-fg bg-fg text-bg"
                  : "border-line-strong bg-surface-2 text-fg hover:bg-surface-3"
              }`}
            >
              <span className="lg:hidden">{item.short}</span>
              <span className="hidden lg:inline">{item.label}</span>
              <span className="font-display text-base leading-none font-extrabold">
                {item.count}
              </span>
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-${tab}`}
        className="mt-6 lg:mt-8"
      >
        {nothing ? (
          <Empty>
            No results for “{query}”. Try another spelling, or only the start of the word.
          </Empty>
        ) : null}

        {!nothing && showWords ? (
          <section aria-label="Explained words">
            {explained.length > 0 ? (
              <>
                <SectionTitle>Explained word{explained.length === 1 ? "" : "s"}</SectionTitle>
                <ul className="space-y-3">
                  {explained.map((result) => (
                    <li key={result.termId}>
                      <ExplainedCard result={result} />
                    </li>
                  ))}
                </ul>
              </>
            ) : tab === "words" ? (
              <Empty>No explained word matches “{query}”.</Empty>
            ) : null}
          </section>
        ) : null}

        {!nothing && showTexts ? (
          <section
            aria-label="Found in texts"
            className={showWords && explained.length ? "mt-8" : ""}
          >
            {texts.length > 0 ? (
              <>
                <SectionTitle>Found in texts</SectionTitle>
                <ul className="space-y-3">
                  {texts.map((result) => (
                    <li key={result.postId}>
                      <TextCard result={result} />
                    </li>
                  ))}
                </ul>
              </>
            ) : tab === "texts" ? (
              <Empty>No other text contains “{query}”.</Empty>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: string | string[] }) {
  return (
    <h2 className="mb-3 text-xs font-semibold tracking-[0.12em] text-muted uppercase lg:mb-3.5">
      {children}
    </h2>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-[0.9375rem] leading-relaxed text-fg-soft">{children}</p>;
}

/** Gold card (05): headword, "Explained", TOTW ribbon, definition, highlighted quote. */
function ExplainedCard({ result }: { result: ExplainedResult }) {
  return (
    <Link
      href={routes.post(result.postId, result.word)}
      aria-label={`${result.headword}: explained in TOTW ${result.totwNumber} · post ${result.position}`}
      className="block rounded-paper border border-gold/35 bg-[#17140c] px-4 pt-4 pb-4 transition hover:border-gold/70 lg:px-5.5 lg:pt-5 lg:pb-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 pt-0.5">
          <h3 className="text-2xl leading-none font-extrabold tracking-tight">{result.headword}</h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-1 text-xs font-bold text-[#1a1406]">
            <CheckIcon size={12} strokeWidth={3} className="hidden lg:block" />
            Explained
          </span>
        </div>
        <span className="shrink-0">
          <PostTag totwNumber={result.totwNumber} position={result.position} />
        </span>
      </div>

      {result.definition ? (
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-fg-soft">{result.definition}</p>
      ) : null}

      {result.quote ? (
        <p className="mt-3.5 rounded-[0.875rem] bg-paper-quote px-3.5 py-3 text-[0.9375rem] leading-relaxed text-ink lg:px-4">
          <HighlightedText text={result.quote} surfaces={[result.surface]} />
        </p>
      ) : null}
    </Link>
  );
}

/** Dark card (05): the word found, "In text", TOTW ribbon, excerpt with the word outlined. */
function TextCard({ result }: { result: TextResult }) {
  return (
    <Link
      href={routes.post(result.postId)}
      aria-label={`“${result.word}” in the text of TOTW ${result.totwNumber} · post ${result.position}`}
      className="block rounded-paper border border-line-strong bg-surface px-4 pt-4 pb-4 transition hover:border-muted/50 lg:px-5.5 lg:pt-5 lg:pb-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 pt-0.5">
          <h3 className="text-xl leading-none font-extrabold tracking-tight">{result.word}</h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#1d2a44] px-2.5 py-1 text-xs font-bold text-[#9cc0ff]">
            <ListIcon size={12} className="hidden lg:block" />
            In text
          </span>
        </div>
        <span className="shrink-0">
          <PostTag totwNumber={result.totwNumber} position={result.position} />
        </span>
      </div>

      <p className="mt-3 text-[0.9375rem] leading-relaxed text-fg-soft">
        {result.before}
        <mark className="rounded-md border border-[#5b8def] bg-[#1d2a44] [box-decoration-break:clone] px-1 font-semibold text-white">
          {result.match}
        </mark>
        {result.after}
      </p>
    </Link>
  );
}
