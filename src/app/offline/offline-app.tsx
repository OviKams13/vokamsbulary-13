"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { PostDetailView, selectedWord } from "@/app/(app)/post/[id]/post-detail-view";
import { SearchView } from "@/app/(app)/search/search-view";
import { BrandLogo } from "@/components/brand-logo";
import { ConnectionProvider } from "@/components/offline/connection";
import { type AppRouter, OfflineRouterContext } from "@/components/offline/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { FeedChrome } from "@/components/shell/feed-chrome";
import { readQuickListsFromCopy } from "@/components/shell/quick-list";
import { TotwFeed } from "@/components/totw-feed";
import type { TotwOverview } from "@/db/totw";
import type { OfflineCopy } from "@/lib/offline/copy";
import { feedFromCopy, overviewFromCopy, postFromCopy } from "@/lib/offline/derive";
import { searchCopy } from "@/lib/offline/search";
import { type CopyState, getCopyState, subscribeCopy } from "@/lib/offline/store";
import { routes } from "@/lib/routes";
import { normalizeQuery, SEARCH_MIN_LENGTH } from "@/lib/search";
import { parseTotwNumber } from "@/lib/totw";

const LOADING: CopyState = { status: "loading" };

/**
 * The offline app (14.2). The service worker serves this page, at the address
 * that was asked for, whenever a page can't come from the server. It draws
 * that page on the device from the offline copy, with the same components as
 * the server pages: feed, TOTWs, quick lists, post detail (tabs, explanations,
 * French versions and examples already in the copy) and search.
 *
 * Moving between pages stays on the device while offline: links and the
 * router change the address with `history.pushState`, which Next.js follows
 * (`usePathname` / `useSearchParams` update) without asking the server. With
 * the connection back, a link opens the live page instead.
 */
export function OfflineApp() {
  const state = useSyncExternalStore(subscribeCopy, getCopyState, () => LOADING);
  const router = useOfflineRouter();

  useEffect(() => readQuickListsFromCopy(), []);

  return (
    <OfflineRouterContext value={router}>
      <ConnectionProvider copyMode>
        {state.status === "ready" ? (
          <CopyPages copy={state.copy} />
        ) : state.status === "empty" ? (
          <NoCopy />
        ) : null}
      </ConnectionProvider>
    </OfflineRouterContext>
  );
}

/**
 * Router of the offline app. Offline: the address changes on the device and
 * the page is drawn from the copy. Online: a normal page load (live page).
 * Every same-site link click goes through it too.
 */
function useOfflineRouter(): AppRouter {
  const router = useMemo<AppRouter>(() => {
    function go(href: string, replace: boolean, scroll = true) {
      if (navigator.onLine) {
        if (replace) window.location.replace(href);
        else window.location.assign(href);
        return;
      }
      if (replace) window.history.replaceState(null, "", href);
      else window.history.pushState(null, "", href);
      if (scroll) window.scrollTo(0, 0);
    }
    return {
      push: (href, options) => go(href, false, options?.scroll),
      replace: (href, options) => go(href, true, options?.scroll),
      back: () => window.history.back(),
    };
  }, []);

  useEffect(() => {
    // Capture phase on window: runs before React's handlers. `preventDefault`
    // stops the browser and Next's <Link> (it skips prevented clicks); the
    // other handlers still run (the drawer and quick list close on a click).
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if ((anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href);
      if (url.origin !== window.location.origin) return;
      event.preventDefault();
      router.push(`${url.pathname}${url.search}${url.hash}`);
    }
    window.addEventListener("click", onClick, true);
    return () => window.removeEventListener("click", onClick, true);
  }, [router]);

  return router;
}

/** The page for the current address, from the copy. */
function CopyPages({ copy }: { copy: OfflineCopy }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const overview = useMemo(() => overviewFromCopy(copy), [copy]);
  // One "now" for the dates of a visit, like one server render.
  const [now] = useState(() => new Date());

  const route = matchRoute(pathname, overview);

  useEffect(() => {
    // The current TOTW has one address, `/` (as on the server).
    if (
      route.kind === "feed" &&
      pathname !== routes.home &&
      route.number === overview.current.number
    ) {
      window.history.replaceState(null, "", routes.home + window.location.search);
    }
  }, [route, pathname, overview]);

  let page: ReactNode;
  let title = "Vokamsbulary 13";

  if (route.kind === "feed") {
    const totw = overview.totws.find((item) => item.number === route.number)!;
    if (!totw.current) title = `TOTW ${totw.number} · Vokamsbulary 13`;
    page = (
      <FeedChrome overview={overview}>
        <TotwFeed totw={totw} feed={feedFromCopy(copy, totw.number)} now={now} />
      </FeedChrome>
    );
  } else if (route.kind === "post") {
    const post = postFromCopy(copy, route.id);
    if (post) {
      title = `TOTW ${post.totwNumber} · #${post.position} · Vokamsbulary 13`;
      page = (
        <PostDetailView
          key={post.id}
          post={post}
          currentTotw={overview.current.number}
          selected={selectedWord(params.get("w"), post.terms.length)}
        />
      );
    } else {
      page = <Message overview={overview} title="This post isn't in the offline copy." />;
    }
  } else if (route.kind === "search") {
    const query = normalizeQuery(params.get("q") ?? "");
    title = "Search · Vokamsbulary 13";
    page = (
      <SearchView
        query={query}
        results={query.length >= SEARCH_MIN_LENGTH ? searchCopy(copy, query) : null}
      />
    );
  } else if (route.kind === "network") {
    page = (
      <Message
        overview={overview}
        title="New post needs a connection."
        body="Your posts and their explanations are all here. Come back to New post once you're online."
      />
    );
  } else {
    page = <Message overview={overview} title="This page isn't in the offline copy." />;
  }

  useEffect(() => {
    document.title = title;
  }, [title]);

  return <AppShell overview={overview}>{page}</AppShell>;
}

type Route =
  | { kind: "feed"; number: number }
  | { kind: "post"; id: string }
  | { kind: "search" }
  | { kind: "network" }
  | { kind: "missing" };

function matchRoute(pathname: string, overview: TotwOverview): Route {
  // `/offline` itself, and `/access` (this device already has the code), show the home page.
  if (pathname === routes.home || pathname === "/offline" || pathname === "/access") {
    return { kind: "feed", number: overview.current.number };
  }
  if (pathname === routes.searchPath) return { kind: "search" };
  if (pathname === routes.newPost || pathname.startsWith(`${routes.newPost}/`)) {
    return { kind: "network" };
  }

  const totw = /^\/totw\/([^/]+)$/.exec(pathname);
  if (totw) {
    const number = parseTotwNumber(totw[1]!);
    return number && overview.totws.some((item) => item.number === number)
      ? { kind: "feed", number }
      : { kind: "missing" };
  }

  const post = /^\/post\/([^/]+)$/.exec(pathname);
  if (post) return { kind: "post", id: decodeURIComponent(post[1]!) };

  return { kind: "missing" };
}

/** A short message in place of a page, with the way home. */
function Message({
  overview,
  title,
  body,
}: {
  overview: TotwOverview;
  title: string;
  body?: string;
}) {
  return (
    <FeedChrome overview={overview}>
      <main className="mx-auto flex w-full max-w-120 flex-col items-center px-6 pt-20 pb-28 text-center lg:min-h-dvh lg:justify-center lg:py-12">
        <h1 className="text-2xl leading-tight font-extrabold tracking-tight">{title}</h1>
        {body ? <p className="mt-3 leading-relaxed text-fg-soft">{body}</p> : null}
        <Link
          href={routes.home}
          className="mt-7 flex h-11 items-center rounded-full border border-line-strong px-6 font-semibold transition hover:bg-surface-3"
        >
          Back to the feed
        </Link>
      </main>
    </FeedChrome>
  );
}

/** No copy on this device yet (the app was never opened online since 14.2). */
function NoCopy() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-120 flex-col items-center justify-center px-6 text-center">
      <BrandLogo size={56} priority />
      <h1 className="mt-7 text-2xl leading-tight font-extrabold tracking-tight">
        No offline copy yet
      </h1>
      <p className="mt-3 leading-relaxed text-fg-soft">
        Open the app once with a connection: your posts are then saved on this device and you can
        read them offline.
      </p>
    </main>
  );
}
