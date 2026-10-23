"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";

import { CloseIcon, SearchIcon } from "@/components/icons";
import { routes } from "@/lib/routes";
import { normalizeQuery } from "@/lib/search";

/** Pause in typing before the results follow (10.2). */
const DEBOUNCE_MS = 250;

type SearchFieldProps = {
  /** Sidebar (01-D, 05-D) or the mobile search page's header (05-M). */
  variant: "sidebar" | "page";
  autoFocus?: boolean;
};

/**
 * Live search field (10.2). Typing updates `/search?q=…` after a short pause:
 * the first change elsewhere opens the results page (so Back returns), later
 * changes replace the address. Enter searches at once; ✕ and Escape clear.
 * The field shows the query of the results page on screen, and empties when
 * you leave it.
 */
export function SearchField({ variant, autoFocus = false }: SearchFieldProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<number | undefined>(undefined);

  // A new query in the address (a chip link, Back, leaving the results) is
  // copied into the field, except while the field has the focus: then the
  // address only follows what is typed, and a slow navigation must not undo
  // the letters typed since it started.
  const fromUrl = pathname === routes.searchPath ? (params.get("q") ?? "") : "";
  const [value, setValue] = useState(fromUrl);
  const [lastUrl, setLastUrl] = useState(fromUrl);
  const [focused, setFocused] = useState(false);
  if (fromUrl !== lastUrl) {
    setLastUrl(fromUrl);
    if (!focused && normalizeQuery(value) !== fromUrl) setValue(fromUrl);
  }

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function go(raw: string) {
    window.clearTimeout(timer.current);
    const query = normalizeQuery(raw);
    if (window.location.pathname === routes.searchPath) {
      router.replace(routes.search(query), { scroll: false });
    } else if (query) {
      router.push(routes.search(query));
    }
  }

  function change(next: string) {
    setValue(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => go(next), DEBOUNCE_MS);
  }

  function clear() {
    setValue("");
    go("");
    input.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") go(value);
    if (event.key === "Escape" && value) {
      event.preventDefault();
      clear();
    }
  }

  const page = variant === "page";

  return (
    <div
      role="search"
      className={`flex shrink-0 items-center gap-2.5 rounded-full border bg-surface-2 transition focus-within:border-gold focus-within:shadow-[0_0_0_3px_rgb(232_184_75/0.14)] ${
        value ? "border-gold/70" : "border-line-strong"
      } ${page ? "h-12 min-w-0 flex-1 px-4" : "h-11 px-4"}`}
    >
      {page ? null : <SearchIcon size={17} className="shrink-0 text-muted" />}
      <input
        ref={input}
        type="search"
        value={value}
        onChange={(event) => change(event.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoFocus={autoFocus}
        enterKeyHint="search"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={100}
        placeholder="Search words & texts"
        aria-label="Search words and texts"
        className="w-full min-w-0 bg-transparent text-[0.9375rem] text-fg outline-none placeholder:text-muted focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={clear}
          className="-mr-1.5 grid size-8 shrink-0 place-items-center rounded-full text-fg-soft transition hover:bg-surface-3 hover:text-fg"
        >
          <CloseIcon size={16} />
        </button>
      ) : null}
    </div>
  );
}
