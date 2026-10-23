"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type KeyboardEvent,
  type Ref,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

import { CloseIcon } from "@/components/icons";
import { TotwBadge } from "@/components/totw-badge";
import { routes } from "@/lib/routes";
import { type QuickListItem, TOTW_SIZE, type TotwSummary } from "@/lib/totw";

// ---------------------------------------------------------------------------
// Data (9.1): one small client store, so a list opened again shows at once
// while it is read again in the background.
// ---------------------------------------------------------------------------

type Entry = {
  /** Last list read; kept while a new read runs. */
  items?: QuickListItem[];
  /** True when the last read failed. */
  failed: boolean;
  request?: Promise<void>;
  requestedAt: number;
};

/** A read this recent is reused (a prefetch followed by the open). */
const REUSE_MS = 5_000;

const entries = new Map<number, Entry>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

function setEntry(number: number, entry: Entry) {
  entries.set(number, entry);
  for (const listener of listeners) listener();
}

/** Reads a TOTW's quick list, unless a read started less than 5 s ago. */
export function loadQuickList(number: number) {
  const previous = entries.get(number);
  if (previous?.request && Date.now() - previous.requestedAt < REUSE_MS) return;

  const request = fetch(routes.totwQuickList(number), { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const { items } = (await response.json()) as { items: QuickListItem[] };
      setEntry(number, { items, failed: false, request, requestedAt: Date.now() });
    })
    .catch(() => {
      setEntry(number, { items: entries.get(number)?.items, failed: true, requestedAt: 0 });
    });
  setEntry(number, { items: previous?.items, failed: false, request, requestedAt: Date.now() });
}

function useQuickList(number: number): Entry | undefined {
  const entry = useSyncExternalStore(
    subscribe,
    () => entries.get(number),
    () => undefined,
  );
  // Read on every open: a publish or a delete may have moved posts.
  useEffect(() => loadQuickList(number), [number]);
  return entry;
}

// ---------------------------------------------------------------------------
// Shared content: header + numbered rows (mockups 04-D / 04-M)
// ---------------------------------------------------------------------------

type BodyProps = {
  totw: TotwSummary;
  entry: Entry | undefined;
  titleId: string;
  /** Sheet rows are a little taller (04-M). */
  variant: "popover" | "sheet";
  /** Row lit by the finger during a slide (9.3). */
  activePosition?: number | null;
  onClose: () => void;
  onFollow: () => void;
};

function QuickListBody({
  totw,
  entry,
  titleId,
  variant,
  activePosition = null,
  onClose,
  onFollow,
}: BodyProps) {
  const sheet = variant === "sheet";
  const byPosition = new Map(entry?.items?.map((item) => [item.position, item]));
  const subtitle = totw.count >= TOTW_SIZE ? "complete" : "in progress";

  return (
    <>
      <div
        className={`flex items-center gap-3 border-b border-line-strong ${
          sheet ? "px-5 pt-4 pb-3.5" : "px-4 pt-3 pb-3"
        }`}
      >
        <TotwBadge number={totw.number} size="sm" className="-mt-1 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="font-display text-2xl leading-none font-extrabold">
            TOTW {totw.number}
          </h2>
          <p className="mt-1.5 text-[0.8125rem] text-muted">
            {totw.count}/{TOTW_SIZE} · {subtitle}
          </p>
        </div>
        <button
          type="button"
          aria-label="Close quick list"
          onClick={onClose}
          className="grid size-9 shrink-0 place-items-center rounded-lg text-fg-soft transition hover:bg-surface-3 hover:text-fg"
        >
          <CloseIcon size={18} />
        </button>
      </div>

      {entry?.failed && !entry.items ? (
        <div className="px-5 py-8 text-center">
          <p className="text-[0.9375rem] text-fg-soft">Couldn&apos;t load this list.</p>
          <button
            type="button"
            onClick={() => loadQuickList(totw.number)}
            className="mt-4 h-10 rounded-full border border-line-strong px-5 text-sm font-semibold transition hover:bg-surface-3"
          >
            Try again
          </button>
        </div>
      ) : (
        <ol
          aria-busy={!entry?.items}
          className={`min-h-0 flex-1 overflow-y-auto ${sheet ? "px-2.5 pt-2 pb-6" : "p-2.5"}`}
        >
          {Array.from({ length: TOTW_SIZE }, (_, index) => {
            const position = index + 1;
            const item = byPosition.get(position);
            const rowClass = `flex items-center gap-2.5 rounded-xl border px-3 ${
              sheet ? "h-[2.3125rem]" : "h-[2.1875rem]"
            }`;
            const number = (tone: string) => (
              <span
                className={`w-6 shrink-0 text-right font-display text-lg leading-none font-extrabold ${tone}`}
              >
                {position}
              </span>
            );

            if (!item) {
              return (
                <li key={position} className={`${rowClass} border-transparent opacity-45`}>
                  {number("text-muted")}
                  {entry?.items ? (
                    <span className="text-[0.9375rem] text-muted">
                      —<span className="sr-only">empty</span>
                    </span>
                  ) : (
                    <span className="h-2.5 w-28 animate-pulse rounded-full bg-line-strong" />
                  )}
                </li>
              );
            }

            const active = activePosition === position;
            return (
              <li key={position}>
                <Link
                  href={routes.post(item.postId)}
                  data-quick-position={position}
                  draggable={false}
                  onClick={onFollow}
                  className={`group ${rowClass} transition-colors ${
                    active
                      ? "border-white/15 bg-surface-3"
                      : "border-transparent hover:border-white/15 hover:bg-surface-3 focus-visible:border-white/15 focus-visible:bg-surface-3"
                  }`}
                >
                  {number(
                    active
                      ? "text-gold"
                      : "text-muted group-hover:text-gold group-focus-visible:text-gold",
                  )}
                  <span className="min-w-0 truncate text-[0.9375rem] font-semibold">
                    {item.headwords.join(", ")}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}

/** Arrow keys, Home and End move between the rows (9.2); Enter follows the focused one. */
function handleListKeys(event: KeyboardEvent<HTMLElement>) {
  const rows = [...event.currentTarget.querySelectorAll<HTMLElement>("a[data-quick-position]")];
  if (rows.length === 0) return;
  const index = rows.indexOf(document.activeElement as HTMLElement);

  let next: number;
  switch (event.key) {
    case "ArrowDown":
      next = index < 0 ? 0 : (index + 1) % rows.length;
      break;
    case "ArrowUp":
      next = index < 0 ? rows.length - 1 : (index - 1 + rows.length) % rows.length;
      break;
    case "Home":
      next = 0;
      break;
    case "End":
      next = rows.length - 1;
      break;
    default:
      return;
  }
  event.preventDefault();
  rows[next]?.focus();
}

// ---------------------------------------------------------------------------
// Desktop popover (9.2, mockup 04-D)
// ---------------------------------------------------------------------------

type PopoverProps = {
  totw: TotwSummary;
  /** The TOTW row it opens next to. */
  anchor: HTMLElement;
  /** The list icon of that row: gets the focus back on Escape. */
  trigger: HTMLElement | null;
  onClose: () => void;
};

const EDGE = 16;

/**
 * Popover beside the sidebar, opened from a TOTW's list icon or a right-click
 * on its row. Closes on Escape, on a click outside, when the focus leaves it
 * and when a row is followed.
 */
export function QuickListPopover({ totw, anchor, trigger, onClose }: PopoverProps) {
  const entry = useQuickList(totw.number);
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const focused = useRef(false);
  const hasItems = Boolean(entry?.items?.length);

  // Next to the row, about 100 px higher (04-D), kept inside the window.
  useLayoutEffect(() => {
    function place() {
      const row = anchor.getBoundingClientRect();
      const height = panel.current?.offsetHeight ?? 0;
      const top = Math.max(EDGE, Math.min(row.top - 100, window.innerHeight - height - EDGE));
      setPosition({ top, left: row.right + 8 });
    }
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [anchor, hasItems]);

  // Focus the first row once there is one, so the arrow keys work at once.
  // Not before the panel is placed: a hidden element can't take the focus.
  const placed = position !== null;
  useEffect(() => {
    if (focused.current || !placed) return;
    const first = panel.current?.querySelector<HTMLElement>("a[data-quick-position]");
    (first ?? panel.current)?.focus();
    if (first) focused.current = true;
  }, [hasItems, placed]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!panel.current?.contains(target) && !trigger?.contains(target)) onClose();
    }
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      onClose();
      trigger?.focus();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, trigger]);

  return createPortal(
    <div
      ref={panel}
      role="dialog"
      aria-labelledby={titleId}
      tabIndex={-1}
      onKeyDown={handleListKeys}
      onBlur={(event) => {
        const next = event.relatedTarget as Node | null;
        if (next && !panel.current?.contains(next) && !trigger?.contains(next)) onClose();
      }}
      style={position ?? { top: 0, left: 0, visibility: "hidden" }}
      className="fixed z-50 flex max-h-[calc(100dvh-2rem)] w-95 flex-col rounded-paper border border-line-strong bg-surface-2 shadow-[0_24px_60px_rgb(0_0_0/0.6)] outline-none"
    >
      <QuickListBody
        totw={totw}
        entry={entry}
        titleId={titleId}
        variant="popover"
        onClose={() => {
          onClose();
          trigger?.focus();
        }}
        onFollow={onClose}
      />
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------------------
// Mobile bottom sheet (9.3, mockup 04-M)
// ---------------------------------------------------------------------------

/** Lets the drawer's long-press drive the sheet while the finger is still down. */
export type QuickListSheetHandle = {
  /** Lights the row under the finger, if any. */
  pointAt: (x: number, y: number) => void;
  /** Finger lifted: opens the lit row's post. */
  release: (x: number, y: number) => void;
};

type SheetProps = {
  totw: TotwSummary;
  ref: Ref<QuickListSheetHandle>;
  /** The sheet was closed (✕, backdrop, Escape). */
  onClose: () => void;
  /** A post is being opened: close the sheet and the drawer. */
  onFollow: () => void;
};

/**
 * Bottom sheet over the feed, opened by a long-press on a TOTW in the drawer.
 * A native modal <dialog>, like the drawer. While the finger is still down,
 * sliding it over the rows lights them, and lifting it opens the lit post.
 */
export function QuickListSheet({ totw, ref, onClose, onFollow }: SheetProps) {
  const entry = useQuickList(totw.number);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const router = useRouter();
  const [activePosition, setActivePosition] = useState<number | null>(null);

  // Unmounting removes the dialog, which closes it: no cleanup needed.
  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
  }, []);

  function rowAt(x: number, y: number) {
    const hit = document.elementFromPoint(x, y);
    const row = hit?.closest<HTMLAnchorElement>("a[data-quick-position]");
    return row && dialog.current?.contains(row) ? row : null;
  }

  useImperativeHandle(ref, () => ({
    pointAt(x, y) {
      const row = rowAt(x, y);
      setActivePosition(row ? Number(row.dataset.quickPosition) : null);
    },
    release(x, y) {
      const row = rowAt(x, y);
      setActivePosition(null);
      if (!row) return;
      onFollow();
      router.push(row.getAttribute("href")!);
    },
  }));

  return createPortal(
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        // The dialog box itself is only hit outside its content: the backdrop.
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
      onKeyDown={handleListKeys}
      className="sheet fixed inset-x-0 top-auto bottom-0 m-0 flex max-h-[80dvh] w-full max-w-none flex-col rounded-t-card border-t border-line-strong bg-surface p-0 text-fg backdrop:bg-black/65 [&:not([open])]:hidden"
    >
      <div
        aria-hidden="true"
        className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-muted/60"
      />
      <QuickListBody
        totw={totw}
        entry={entry}
        titleId={titleId}
        variant="sheet"
        activePosition={activePosition}
        onClose={() => dialog.current?.close()}
        onFollow={onFollow}
      />
    </dialog>,
    document.body,
  );
}
