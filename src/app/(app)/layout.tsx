import { ConnectionProvider } from "@/components/offline/connection";
import { ReelBackground } from "@/components/reels/reel-background";
import { AppShell } from "@/components/shell/app-shell";
import { getTotwOverview } from "@/db/totw";

/**
 * App shell for every page behind the access code (Phase 4).
 * Desktop (≥ lg): fixed left sidebar (4.1, mockup 01-D) on every page.
 * The mobile top bar and "+" button belong to the feed pages only (`(feed)`
 * layout); the post detail page has its own mobile header (mockup 02-M).
 *
 * `ConnectionProvider` (Phase 14): the "Offline" indicator, network actions
 * disabled offline, and the offline copy kept fresh. Only pages behind the
 * code render it, so only a device that entered the code gets a copy.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const overview = await getTotwOverview();

  return (
    <ConnectionProvider>
      <AppShell overview={overview}>{children}</AppShell>
      {/* 16.3: reels of new posts, prepared one by one while the app is open. */}
      <ReelBackground />
    </ConnectionProvider>
  );
}
