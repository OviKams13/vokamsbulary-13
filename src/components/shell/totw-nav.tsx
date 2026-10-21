"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ListIcon } from "@/components/icons";
import { TotwBadge } from "@/components/totw-badge";
import { routes } from "@/lib/routes";
import { TOTW_SIZE, type TotwSummary } from "@/lib/totw";

/**
 * TOTW list of the sidebar and drawer (4.3), newest first. The current TOTW
 * has the glowing badge and a gold count; the TOTW on screen gets the boxed row.
 */
export function TotwNav({ totws }: { totws: TotwSummary[] }) {
  const pathname = usePathname();

  return (
    <ul className="space-y-1">
      {totws.map((totw) => {
        const href = totw.current ? routes.home : routes.totw(totw.number);
        const selected =
          pathname === routes.totw(totw.number) || (totw.current && pathname === routes.home);
        const percent = (Math.min(totw.count, TOTW_SIZE) / TOTW_SIZE) * 100;

        return (
          <li
            key={totw.number}
            className={`flex items-center rounded-2xl border pr-2.5 transition ${
              selected ? "border-line-strong bg-surface-3" : "border-transparent hover:bg-surface-2"
            }`}
          >
            <Link
              href={href}
              aria-current={selected ? "page" : undefined}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl py-1 pl-2"
            >
              <TotwBadge number={totw.number} size="sm" glow={totw.current} className="shrink-0" />
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

            {/* Opens the TOTW quick list in Phase 9 (F11). */}
            <button
              type="button"
              aria-disabled="true"
              aria-label={`Quick list of TOTW ${totw.number} (not available yet)`}
              title="Quick list arrives in Phase 9"
              className="ml-3 grid size-8 shrink-0 place-items-center rounded-lg text-muted transition hover:text-fg-soft"
            >
              <ListIcon size={17} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
