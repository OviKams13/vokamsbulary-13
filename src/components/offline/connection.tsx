"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { flushReviewChanges } from "@/lib/offline/review-sync";
import { registerServiceWorker } from "@/lib/offline/service-worker";
import { syncOfflineCopy } from "@/lib/offline/store";

/**
 * Connection state of the app (14.3), shared by every page behind the code.
 *
 * - `offline`: the browser reports no network (`navigator.onLine` and its
 *   `online` / `offline` events).
 * - `copyMode`: the page on screen is the offline app (served by the service
 *   worker from the copy on the device), not a page from the server.
 *
 * The provider also keeps the offline copy fresh (14.2): it registers the
 * service worker (which stores the offline app itself, once per deployment),
 * and downloads the copy of the posts again when the app opens online, when
 * the connection comes back, when the app comes back to the screen and on
 * navigations (at most every 30 s for those two). At each of those moments it
 * first sends the review colours and highlights changed offline (Phase 15).
 */

type Connection = {
  offline: boolean;
  copyMode: boolean;
  /** A short message at the bottom of the screen, for a few seconds. */
  notify: (message: string) => void;
};

const ConnectionContext = createContext<Connection>({
  offline: false,
  copyMode: false,
  notify: () => undefined,
});

export function useConnection(): Connection {
  return use(ConnectionContext);
}

/**
 * Whether an action that needs the server (New post, a first Translate, first
 * examples, Delete) can run now, and if not, the short message to show.
 * In the offline app with the network back, the page must be reloaded first:
 * it is a copy, its buttons don't reach the server.
 */
export function useNetworkAction(action: string): { available: boolean; reason: string | null } {
  const { offline, copyMode } = useConnection();
  if (offline) return { available: false, reason: `${action} needs a connection.` };
  if (copyMode) {
    return { available: false, reason: `${action}: reload the page first (offline copy).` };
  }
  return { available: true, reason: null };
}

function subscribeOnline(listener: () => void) {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}

/** Never offline on the server or during hydration: the real value follows at once. */
function useOffline(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    () => !navigator.onLine,
    () => false,
  );
}

const REFRESH_EVERY_MS = 30_000;
const NOTICE_MS = 3_500;

export function ConnectionProvider({
  copyMode = false,
  children,
}: {
  copyMode?: boolean;
  children: ReactNode;
}) {
  const offline = useOffline();
  const pathname = usePathname();
  const lastRefresh = useRef(0);
  const [notice, setNotice] = useState<{ id: number; text: string } | null>(null);

  const refresh = useCallback((force: boolean) => {
    if (!navigator.onLine) return;
    // Review changes made offline (Phase 15) are sent first, every time (a
    // request only when some are waiting): the copy downloaded next has them.
    const sent = flushReviewChanges();
    if (!force && Date.now() - lastRefresh.current < REFRESH_EVERY_MS) return;
    lastRefresh.current = Date.now();
    void sent.then(() => syncOfflineCopy());
  }, []);

  // Opening the app: register the worker, then refresh the copy.
  useEffect(() => {
    void registerServiceWorker().then(() => refresh(true));
  }, [refresh]);

  // The connection is back, or the app is on screen again.
  useEffect(() => {
    const onOnline = () => refresh(true);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh(false);
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  // After a publish, a Translate or a delete, the next page brings them into the copy.
  useEffect(() => refresh(false), [pathname, refresh]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const notify = useCallback((text: string) => setNotice({ id: Date.now(), text }), []);

  return (
    <ConnectionContext value={{ offline, copyMode, notify }}>
      {children}
      <ConnectionIndicator offline={offline} copyMode={copyMode} />
      {notice ? (
        <p
          key={notice.id}
          role="status"
          className="fixed inset-x-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-50 mx-auto w-fit max-w-sm rounded-full border border-line-strong bg-surface-2 px-4 py-2.5 text-center text-sm font-medium text-fg shadow-[0_8px_24px_rgb(0_0_0/0.5)] lg:bottom-6 lg:left-[calc(var(--spacing-sidebar)+1rem)]"
        >
          {notice.text}
        </p>
      ) : null}
    </ConnectionContext>
  );
}

/**
 * The discreet "Offline" pill (14.3): bottom-left on a phone (the "+" is
 * bottom-right), bottom-right on a computer. In the offline app with the
 * network back, it offers to reload the live page instead.
 */
function ConnectionIndicator({ offline, copyMode }: { offline: boolean; copyMode: boolean }) {
  if (!offline && !copyMode) return null;

  const className =
    "fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-4 z-40 flex h-8 items-center gap-2 rounded-full border border-line-strong bg-surface-2/95 px-3 text-xs font-semibold text-fg-soft shadow-[0_6px_18px_rgb(0_0_0/0.45)] backdrop-blur lg:right-6 lg:left-auto";

  if (offline) {
    return (
      <p role="status" className={className}>
        <span aria-hidden="true" className="size-2 rounded-full bg-muted" />
        Offline
      </p>
    );
  }

  return (
    <button type="button" onClick={() => window.location.reload()} className={className}>
      <span aria-hidden="true" className="size-2 rounded-full bg-gold" />
      Offline copy · Reload
    </button>
  );
}
