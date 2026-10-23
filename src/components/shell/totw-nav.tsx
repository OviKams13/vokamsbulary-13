"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { ListIcon } from "@/components/icons";
import { TotwBadge } from "@/components/totw-badge";
import { routes } from "@/lib/routes";
import { TOTW_SIZE, type TotwSummary } from "@/lib/totw";

import {
  loadQuickList,
  QuickListPopover,
  QuickListSheet,
  type QuickListSheetHandle,
} from "./quick-list";

/** How long a finger must rest on a TOTW to open its quick list (9.3). */
const LONG_PRESS_MS = 450;
/** A finger moving more than this before the long-press is scrolling the drawer. */
const SCROLL_SLOP_PX = 10;

type TotwNavProps = {
  totws: TotwSummary[];
  /** Desktop sidebar (popover, 9.2) or mobile drawer (bottom sheet, 9.3). */
  variant: "sidebar" | "drawer";
};

type OpenList = { number: number; anchor: HTMLElement };

/**
 * TOTW list of the sidebar and drawer (4.3), newest first. The current TOTW
 * has the glowing badge and a gold count; the TOTW on screen gets the boxed row.
 *
 * Quick list (F11, D-12): in the sidebar, the list icon or a right-click on a
 * row opens a popover (9.2); in the drawer, a long-press on a row or the list
 * icon opens a bottom sheet (9.3).
 */
export function TotwNav({ totws, variant }: TotwNavProps) {
  const pathname = usePathname();
  const drawer = variant === "drawer";
  const list = useRef<HTMLUListElement>(null);
  const sheet = useRef<QuickListSheetHandle>(null);
  const [open, setOpen] = useState<OpenList | null>(null);
  const openTotw = open ? totws.find((totw) => totw.number === open.number) : undefined;

  const close = useCallback(() => setOpen(null), []);

  const openList = useCallback(
    (number: number, anchor: HTMLElement) => {
      setOpen({ number, anchor });
      // The sheet covers the feed, not the drawer (04-M).
      if (drawer) list.current?.closest("dialog")?.close();
    },
    [drawer],
  );

  // Long-press and slide (9.3). Native listeners: touchmove must be able to
  // stop the drawer from scrolling once the sheet is open (React's are passive).
  useEffect(() => {
    const element = list.current;
    if (!drawer || !element) return;

    type Press = {
      number: number;
      row: HTMLElement;
      x: number;
      y: number;
      timer: number;
      /** The sheet is open. */
      fired: boolean;
      /** The finger slid after the sheet opened: lifting it now opens a post. */
      sliding: boolean;
    };
    let press: Press | null = null;

    function fire(current: Press) {
      window.clearTimeout(current.timer);
      if (current.fired) return;
      current.fired = true;
      navigator.vibrate?.(8);
      openList(current.number, current.row);
    }

    function onTouchStart(event: TouchEvent) {
      if (press) window.clearTimeout(press.timer);
      press = null;
      const target = event.target as Element;
      const row = target.closest<HTMLElement>("[data-totw]");
      // The list icon is a plain tap; two fingers are a zoom.
      if (!row || target.closest("button") || event.touches.length !== 1) return;

      const touch = event.touches[0]!;
      const number = Number(row.dataset.totw);
      loadQuickList(number);
      const current: Press = {
        number,
        row,
        x: touch.clientX,
        y: touch.clientY,
        timer: 0,
        fired: false,
        sliding: false,
      };
      current.timer = window.setTimeout(() => fire(current), LONG_PRESS_MS);
      press = current;
    }

    function onTouchMove(event: TouchEvent) {
      if (!press) return;
      const touch = event.touches[0]!;
      const distance = Math.hypot(touch.clientX - press.x, touch.clientY - press.y);
      if (!press.fired) {
        if (distance > SCROLL_SLOP_PX) {
          window.clearTimeout(press.timer);
          press = null;
        }
        return;
      }
      if (event.cancelable) event.preventDefault();
      // A finger that only trembles must not light the row it happens to be on.
      if (!press.sliding && distance < SCROLL_SLOP_PX) return;
      press.sliding = true;
      sheet.current?.pointAt(touch.clientX, touch.clientY);
    }

    function onTouchEnd(event: TouchEvent) {
      if (!press) return;
      const current = press;
      press = null;
      window.clearTimeout(current.timer);
      if (!current.fired) return;
      // No click on the TOTW link under the finger.
      if (event.cancelable) event.preventDefault();
      const touch = event.changedTouches[0];
      // Lifted without sliding: the sheet stays open for a tap.
      if (current.sliding && touch && event.type === "touchend") {
        sheet.current?.release(touch.clientX, touch.clientY);
      }
    }

    function onContextMenu(event: MouseEvent) {
      const row = (event.target as Element).closest<HTMLElement>("[data-totw]");
      if (!row) return;
      // Android fires it on a long-press: no link menu. A mouse right-click or
      // the keyboard's menu key opens the sheet too.
      event.preventDefault();
      if (press) fire(press);
      else openList(Number(row.dataset.totw), row);
    }

    element.addEventListener("touchstart", onTouchStart, { passive: true });
    element.addEventListener("touchmove", onTouchMove, { passive: false });
    element.addEventListener("touchend", onTouchEnd, { passive: false });
    element.addEventListener("touchcancel", onTouchEnd);
    element.addEventListener("contextmenu", onContextMenu);
    return () => {
      if (press) window.clearTimeout(press.timer);
      element.removeEventListener("touchstart", onTouchStart);
      element.removeEventListener("touchmove", onTouchMove);
      element.removeEventListener("touchend", onTouchEnd);
      element.removeEventListener("touchcancel", onTouchEnd);
      element.removeEventListener("contextmenu", onContextMenu);
    };
  }, [drawer, openList]);

  return (
    <>
      <ul ref={list} className="space-y-1">
        {totws.map((totw) => {
          const href = totw.current ? routes.home : routes.totw(totw.number);
          const selected =
            pathname === routes.totw(totw.number) || (totw.current && pathname === routes.home);
          const listOpen = open?.number === totw.number;
          const percent = (Math.min(totw.count, TOTW_SIZE) / TOTW_SIZE) * 100;

          return (
            <li
              key={totw.number}
              data-totw={totw.number}
              onContextMenu={
                drawer
                  ? undefined
                  : (event) => {
                      event.preventDefault();
                      openList(totw.number, event.currentTarget);
                    }
              }
              onPointerEnter={drawer ? undefined : () => loadQuickList(totw.number)}
              className={`flex items-center rounded-2xl border pr-2.5 transition ${
                drawer ? "select-none [-webkit-touch-callout:none]" : ""
              } ${
                selected
                  ? "border-line-strong bg-surface-3"
                  : listOpen
                    ? "border-transparent bg-surface-2"
                    : "border-transparent hover:bg-surface-2"
              }`}
            >
              <Link
                href={href}
                aria-current={selected ? "page" : undefined}
                draggable={false}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl py-1 pl-2"
              >
                <TotwBadge
                  number={totw.number}
                  size="sm"
                  glow={totw.current}
                  className="shrink-0"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-[0.9375rem] font-bold">TOTW {totw.number}</span>
                    <span
                      className={`font-display text-lg leading-none font-extrabold ${
                        totw.current ? "text-gold" : "text-fg-soft"
                      }`}
                    >
                      {totw.count}/{TOTW_SIZE}
                    </span>
                  </span>
                  <span className="mt-2 block h-[3px] overflow-hidden rounded-full bg-line-strong">
                    <span
                      className={`block h-full rounded-full ${totw.current ? "bg-gold" : "bg-fg-soft"}`}
                      style={{ width: `${percent}%` }}
                    />
                  </span>
                </span>
              </Link>

              <button
                type="button"
                aria-label={`Quick list of TOTW ${totw.number}`}
                aria-haspopup="dialog"
                aria-expanded={listOpen}
                data-quick-trigger={totw.number}
                onClick={(event) => {
                  if (listOpen) close();
                  else openList(totw.number, event.currentTarget.closest("li")!);
                }}
                className={`ml-3 grid size-8 shrink-0 place-items-center rounded-lg transition hover:text-fg-soft ${
                  listOpen ? "bg-surface-3 text-fg" : "text-muted"
                }`}
              >
                <ListIcon size={17} />
              </button>
            </li>
          );
        })}
      </ul>

      {open && openTotw ? (
        drawer ? (
          <QuickListSheet
            key={open.number}
            ref={sheet}
            totw={openTotw}
            onClose={close}
            onFollow={close}
          />
        ) : (
          <QuickListPopover
            key={open.number}
            totw={openTotw}
            anchor={open.anchor}
            trigger={open.anchor.querySelector("[data-quick-trigger]")}
            onClose={close}
          />
        )
      ) : null}
    </>
  );
}
