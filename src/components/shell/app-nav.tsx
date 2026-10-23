import Link from "next/link";
import { type ReactNode, Suspense } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { PlusIcon, SearchIcon } from "@/components/icons";
import type { TotwOverview } from "@/db/totw";
import { routes } from "@/lib/routes";

import { SearchField } from "./search-field";
import { TotwNav } from "./totw-nav";

type AppNavProps = {
  overview: TotwOverview;
  /** Desktop sidebar or mobile drawer (mockups 01-D, 01-drawer). */
  variant: "sidebar" | "drawer";
  /** Shown at the right of the logo row (the drawer's close button). */
  action?: ReactNode;
};

/**
 * Navigation content shared by the desktop sidebar and the mobile drawer:
 * logo, search field (live in the sidebar, a link in the drawer, Phase 10), New post, TOTW list (with its quick list,
 * Phase 9), footer stats. The drawer adds the long-press hint (01-drawer).
 */
export function AppNav({ overview, variant, action }: AppNavProps) {
  const drawer = variant === "drawer";

  return (
    <div className={`flex h-full w-full flex-col px-4 pb-6 lg:px-5 ${drawer ? "pt-5" : "pt-7"}`}>
      <div className="flex items-center justify-between gap-3">
        <Link href={routes.home} className="rounded-lg">
          <BrandLogo
            withName
            size={drawer ? 28 : 36}
            nameClassName={drawer ? "text-lg" : undefined}
            priority={!drawer}
          />
        </Link>
        {action}
      </div>

      {drawer ? (
        <SearchLink className="mt-3" />
      ) : (
        <div className="mt-2">
          {/* useSearchParams needs a Suspense boundary; the fallback looks the same. */}
          <Suspense fallback={<SearchLink />}>
            <SearchField variant="sidebar" />
          </Suspense>
        </div>
      )}

      <Link
        href={routes.newPost}
        className="mt-[1.125rem] flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-fg font-semibold text-bg transition hover:bg-white"
      >
        <PlusIcon size={18} />
        New post
      </Link>

      <h2 className="mt-7 text-xs font-semibold tracking-[0.12em] text-muted uppercase">
        Team of the week
      </h2>
      <div className="-mx-1 mt-3 min-h-0 flex-1 overflow-y-auto px-1 pt-1">
        <TotwNav totws={overview.totws} variant={variant} />
        {drawer ? (
          <p className="mt-5 text-[0.8125rem] leading-snug text-muted">
            Long-press a team to see its quick list.
          </p>
        ) : null}
      </div>

      <p className="pt-6 text-[0.8125rem] text-muted">{footerText(overview)}</p>
    </div>
  );
}

/** "37 words learned · 3 teams", or "No words yet" before the first post (4.4). */
function footerText({ wordsLearned, totws }: TotwOverview): string {
  if (wordsLearned === 0) return "No words yet";
  const words = `${wordsLearned} word${wordsLearned === 1 ? "" : "s"} learned`;
  const teams = `${totws.length} team${totws.length === 1 ? "" : "s"}`;
  return `${words} · ${teams}`;
}

/**
 * Search field look-alike that opens the search page (10.2): in the drawer,
 * where typing would close the drawer under the finger, and as the sidebar
 * field's loading fallback.
 */
function SearchLink({ className = "" }: { className?: string }) {
  return (
    <Link
      href={routes.search()}
      className={`flex h-11 shrink-0 items-center gap-2.5 rounded-full border border-line-strong bg-surface-2 px-4 text-[0.9375rem] text-muted transition hover:border-muted/50 ${className}`}
    >
      <SearchIcon size={17} />
      Search words &amp; texts
    </Link>
  );
}
