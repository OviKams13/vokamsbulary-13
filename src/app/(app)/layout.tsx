import { AppNav } from "@/components/shell/app-nav";
import { getTotwOverview } from "@/db/totw";

/**
 * App shell for every page behind the access code (Phase 4).
 * Desktop (≥ lg): fixed left sidebar (4.1, mockup 01-D) on every page.
 * The mobile top bar and "+" button belong to the feed pages only (`(feed)`
 * layout); the post detail page has its own mobile header (mockup 02-M).
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const overview = await getTotwOverview();

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-sidebar border-r border-line bg-bg lg:flex">
        <AppNav overview={overview} variant="sidebar" />
      </aside>

      <div className="lg:pl-sidebar">{children}</div>
    </>
  );
}
